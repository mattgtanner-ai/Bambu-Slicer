import type {
  CustomMeshGeometry,
  ManualRepairOptions,
  MeshDiagnosticsReport,
} from '../types/slicer';
import { normalizeAndMeasurePositions } from './slicerEngine';

export const DEFAULT_MANUAL_REPAIR_OPTIONS: ManualRepairOptions = {
  closeHoles: true,
  fixNormals: true,
  removeDegenerate: true,
  removeDuplicates: true,
  weldVertices: true,
  weldToleranceMm: 0.01,
};

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function distSq(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function lengthVec(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Clusters vertices within toleranceMm so micro-gaps or floating-point
 * variations are mapped to canonical vertex indices.
 */
function indexVerticesWithTolerance(
  positions: Float32Array,
  toleranceMm: number
): {
  vertices: Vec3[];
  triIndices: [number, number, number][];
  weldedCount: number;
} {
  const tol = Math.max(1e-5, toleranceMm);
  const invTol = 1 / tol;
  const gridMap = new Map<string, number>();
  const exactMap = new Map<string, number>();
  const vertices: Vec3[] = [];
  const triIndices: [number, number, number][] = [];
  let weldedCount = 0;

  const numTris = Math.floor(positions.length / 9);

  for (let t = 0; t < numTris; t++) {
    const base = t * 9;
    const idx: [number, number, number] = [0, 0, 0];

    for (let k = 0; k < 3; k++) {
      const vx = positions[base + k * 3];
      const vy = positions[base + k * 3 + 1];
      const vz = positions[base + k * 3 + 2];

      const exactKey = `${vx.toFixed(5)}_${vy.toFixed(5)}_${vz.toFixed(5)}`;
      const gx = Math.round(vx * invTol);
      const gy = Math.round(vy * invTol);
      const gz = Math.round(vz * invTol);
      const cellKey = `${gx}_${gy}_${gz}`;

      // Check 3x3x3 neighborhood cells for welding within tolerance
      let foundId = gridMap.get(cellKey);
      if (foundId === undefined && tol >= 0.002) {
        outer: for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
              const neighborId = gridMap.get(`${gx + dx}_${gy + dy}_${gz + dz}`);
              if (neighborId !== undefined) {
                const candidate = vertices[neighborId];
                if (distSq(candidate, { x: vx, y: vy, z: vz }) <= tol * tol) {
                  foundId = neighborId;
                  break outer;
                }
              }
            }
          }
        }
      }

      if (foundId !== undefined) {
        if (!exactMap.has(exactKey)) {
          weldedCount++;
          exactMap.set(exactKey, foundId);
        }
        idx[k] = foundId;
      } else {
        const newId = vertices.length;
        vertices.push({ x: vx, y: vy, z: vz });
        gridMap.set(cellKey, newId);
        exactMap.set(exactKey, newId);
        idx[k] = newId;
      }
    }

    triIndices.push(idx);
  }

  return { vertices, triIndices, weldedCount };
}

/**
 * Analyzes a triangle mesh (Float32Array of x,y,z triplets) for common 3D printing errors:
 * - Degenerate / zero-area triangles
 * - Duplicate / overlapping triangles
 * - Open boundary edges & holes (edges shared by only 1 face)
 * - Non-manifold edges (edges shared by >2 faces)
 * - Inverted / inconsistent face normals
 */
export function analyzeMeshTopology(
  positions: Float32Array,
  toleranceMm = 0.0005,
  repairHistory: string[] = []
): MeshDiagnosticsReport {
  const numTris = Math.floor(positions.length / 9);
  if (numTris === 0) {
    return {
      totalTriangles: 0,
      uniqueVertices: 0,
      nonManifoldEdges: 0,
      openBoundaryEdges: 0,
      estimatedHoles: 0,
      invertedNormals: 0,
      degenerateTriangles: 0,
      duplicateTriangles: 0,
      isWatertight: false,
      healthScore: 0,
      status: 'needs_repair',
      repairHistory,
      lastAnalyzedAtIso: new Date().toISOString(),
    };
  }

  const { vertices, triIndices } = indexVerticesWithTolerance(positions, toleranceMm);

  let degenerateTriangles = 0;
  let duplicateTriangles = 0;
  const seenTriKeys = new Set<string>();
  const validTriIndices: [number, number, number][] = [];

  for (let i = 0; i < triIndices.length; i++) {
    const [a, b, c] = triIndices[i];
    if (a === b || b === c || c === a) {
      degenerateTriangles++;
      continue;
    }

    const va = vertices[a];
    const vb = vertices[b];
    const vc = vertices[c];
    const area2 = lengthVec(cross(sub(vb, va), sub(vc, va)));
    if (area2 < 1e-5) {
      degenerateTriangles++;
      continue;
    }

    const sorted = [a, b, c].sort((x, y) => x - y);
    const triKey = `${sorted[0]}_${sorted[1]}_${sorted[2]}`;
    if (seenTriKeys.has(triKey)) {
      duplicateTriangles++;
      continue;
    }
    seenTriKeys.add(triKey);
    validTriIndices.push([a, b, c]);
  }

  // Analyze undirected edges and half-edge winding directions
  const undirectedEdgeCounts = new Map<string, number>();
  const directedEdgeCounts = new Map<string, number>();

  for (const [a, b, c] of validTriIndices) {
    const halfEdges: [number, number][] = [
      [a, b],
      [b, c],
      [c, a],
    ];
    for (const [u, v] of halfEdges) {
      const uKey = u < v ? `${u}_${v}` : `${v}_${u}`;
      undirectedEdgeCounts.set(uKey, (undirectedEdgeCounts.get(uKey) || 0) + 1);

      const dKey = `${u}_${v}`;
      directedEdgeCounts.set(dKey, (directedEdgeCounts.get(dKey) || 0) + 1);
    }
  }

  let openBoundaryEdges = 0;
  let nonManifoldEdges = 0;
  let windingConflictEdges = 0;

  for (const [uKey, count] of undirectedEdgeCounts.entries()) {
    if (count === 1) {
      openBoundaryEdges++;
    } else if (count > 2) {
      nonManifoldEdges++;
    } else if (count === 2) {
      const [uStr, vStr] = uKey.split('_');
      const fwd = directedEdgeCounts.get(`${uStr}_${vStr}`) || 0;
      const rev = directedEdgeCounts.get(`${vStr}_${uStr}`) || 0;
      // In a properly oriented manifold mesh, shared edge is traversed once u->v and once v->u
      if (fwd >= 2 || rev >= 2) {
        windingConflictEdges++;
      }
    }
  }

  // Also check face normals relative to mesh centroid to catch inward-flipped facets
  let centroidX = 0,
    centroidY = 0,
    centroidZ = 0;
  for (const v of vertices) {
    centroidX += v.x;
    centroidY += v.y;
    centroidZ += v.z;
  }
  if (vertices.length > 0) {
    centroidX /= vertices.length;
    centroidY /= vertices.length;
    centroidZ /= vertices.length;
  }
  const centroid: Vec3 = { x: centroidX, y: centroidY, z: centroidZ };

  let inwardFacingCount = 0;
  for (const [a, b, c] of validTriIndices) {
    const va = vertices[a];
    const vb = vertices[b];
    const vc = vertices[c];
    const normal = cross(sub(vb, va), sub(vc, va));
    const faceCenter: Vec3 = {
      x: (va.x + vb.x + vc.x) / 3,
      y: (va.y + vb.y + vc.y) / 3,
      z: (va.z + vb.z + vc.z) / 3,
    };
    const outwardVec = sub(faceCenter, centroid);
    if (dot(normal, outwardVec) < -1e-4) {
      inwardFacingCount++;
    }
  }

  const invertedNormals = Math.max(
    Math.ceil(windingConflictEdges / 2),
    inwardFacingCount
  );

  // Estimate number of distinct open holes from open boundary edges (min 3 edges per hole loop)
  const estimatedHoles =
    openBoundaryEdges > 0 ? Math.max(1, Math.round(openBoundaryEdges / 3.5)) : 0;

  const totalDefects =
    nonManifoldEdges +
    openBoundaryEdges +
    invertedNormals +
    degenerateTriangles +
    duplicateTriangles;

  const isWatertight =
    openBoundaryEdges === 0 &&
    nonManifoldEdges === 0 &&
    degenerateTriangles === 0 &&
    duplicateTriangles === 0 &&
    invertedNormals === 0;

  const penalty =
    nonManifoldEdges * 8 +
    openBoundaryEdges * 5 +
    invertedNormals * 6 +
    degenerateTriangles * 4 +
    duplicateTriangles * 4;
  const healthScore = isWatertight ? 100 : Math.max(15, Math.min(98, 100 - penalty));

  let status: MeshDiagnosticsReport['status'] = 'manifold';
  if (!isWatertight || totalDefects > 0) {
    status = 'needs_repair';
  } else if (repairHistory.length > 0) {
    status = 'repaired';
  }

  return {
    totalTriangles: numTris,
    uniqueVertices: vertices.length,
    nonManifoldEdges,
    openBoundaryEdges,
    estimatedHoles,
    invertedNormals,
    degenerateTriangles,
    duplicateTriangles,
    isWatertight,
    healthScore,
    status,
    repairHistory,
    lastAnalyzedAtIso: new Date().toISOString(),
  };
}

/**
 * Repairs common mesh errors in an STL/3MF triangle buffer according to ManualRepairOptions:
 * 1. Welds close vertices within weldToleranceMm
 * 2. Removes degenerate / zero-area triangles
 * 3. Removes duplicate & non-manifold excess overlapping faces
 * 4. Unifies & flips inverted normals outward
 * 5. Caps open boundary loops / holes with fan triangulation
 */
export function repairMeshGeometry(
  positions: Float32Array,
  options: ManualRepairOptions = DEFAULT_MANUAL_REPAIR_OPTIONS,
  existingHistory: string[] = []
): {
  geometry: CustomMeshGeometry;
  dims: { x: number; y: number; z: number };
  report: MeshDiagnosticsReport;
  actionsSummary: string[];
} {
  const beforeReport = analyzeMeshTopology(positions, 0.0005, existingHistory);
  const actionsSummary: string[] = [];

  const weldTol = options.weldVertices
    ? Math.max(0.001, options.weldToleranceMm)
    : 0.0001;

  const { vertices, triIndices } = indexVerticesWithTolerance(positions, weldTol);

  if (options.weldVertices && beforeReport.uniqueVertices > vertices.length) {
    const mergedCount = beforeReport.uniqueVertices - vertices.length;
    actionsSummary.push(
      `Welded ${mergedCount} micro-gap ${mergedCount === 1 ? 'vertex' : 'vertices'} (tolerance ${weldTol.toFixed(3)} mm)`
    );
  }

  // Step 2 & 3: Remove degenerate & duplicate triangles
  let workingTris: [number, number, number][] = [];
  let removedDegenerate = 0;
  let removedDuplicates = 0;
  const seenKeys = new Set<string>();

  for (const [a, b, c] of triIndices) {
    if (options.removeDegenerate) {
      if (a === b || b === c || c === a) {
        removedDegenerate++;
        continue;
      }
      const va = vertices[a];
      const vb = vertices[b];
      const vc = vertices[c];
      const area2 = lengthVec(cross(sub(vb, va), sub(vc, va)));
      if (area2 < 1e-5) {
        removedDegenerate++;
        continue;
      }
    }

    if (options.removeDuplicates) {
      const sorted = [a, b, c].sort((x, y) => x - y);
      const key = `${sorted[0]}_${sorted[1]}_${sorted[2]}`;
      if (seenKeys.has(key)) {
        removedDuplicates++;
        continue;
      }
      seenKeys.add(key);
    }

    workingTris.push([a, b, c]);
  }

  // Also prune non-manifold extra faces sharing an edge already used by 2 faces
  if (options.removeDuplicates && workingTris.length > 0) {
    const edgeUsage = new Map<string, number>();
    const manifoldFiltered: [number, number, number][] = [];
    let nonManifoldPruned = 0;

    for (const [a, b, c] of workingTris) {
      const e1 = a < b ? `${a}_${b}` : `${b}_${a}`;
      const e2 = b < c ? `${b}_${c}` : `${c}_${b}`;
      const e3 = c < a ? `${c}_${a}` : `${a}_${c}`;
      const u1 = edgeUsage.get(e1) || 0;
      const u2 = edgeUsage.get(e2) || 0;
      const u3 = edgeUsage.get(e3) || 0;

      if (u1 >= 2 && u2 >= 2 && u3 >= 2) {
        nonManifoldPruned++;
        continue;
      }
      edgeUsage.set(e1, u1 + 1);
      edgeUsage.set(e2, u2 + 1);
      edgeUsage.set(e3, u3 + 1);
      manifoldFiltered.push([a, b, c]);
    }
    if (nonManifoldPruned > 0) {
      removedDuplicates += nonManifoldPruned;
    }
    workingTris = manifoldFiltered;
  }

  if (removedDegenerate > 0) {
    actionsSummary.push(
      `Removed ${removedDegenerate} degenerate zero-area ${removedDegenerate === 1 ? 'triangle' : 'triangles'}`
    );
  }
  if (removedDuplicates > 0) {
    actionsSummary.push(
      `Removed ${removedDuplicates} duplicate/overlapping ${removedDuplicates === 1 ? 'face' : 'faces'}`
    );
  }

  // Step 4: Fix inverted face normals (align outward from mesh centroid)
  let flippedNormalsCount = 0;
  if (options.fixNormals && workingTris.length > 0) {
    let cx = 0,
      cy = 0,
      cz = 0;
    for (const v of vertices) {
      cx += v.x;
      cy += v.y;
      cz += v.z;
    }
    cx /= Math.max(1, vertices.length);
    cy /= Math.max(1, vertices.length);
    cz /= Math.max(1, vertices.length);
    const centroid: Vec3 = { x: cx, y: cy, z: cz };

    workingTris = workingTris.map(([a, b, c]) => {
      const va = vertices[a];
      const vb = vertices[b];
      const vc = vertices[c];
      const normal = cross(sub(vb, va), sub(vc, va));
      const fc: Vec3 = {
        x: (va.x + vb.x + vc.x) / 3,
        y: (va.y + vb.y + vc.y) / 3,
        z: (va.z + vb.z + vc.z) / 3,
      };
      if (dot(normal, sub(fc, centroid)) < -1e-4) {
        flippedNormalsCount++;
        return [a, c, b];
      }
      return [a, b, c];
    });

    if (flippedNormalsCount > 0) {
      actionsSummary.push(
        `Unified & flipped ${flippedNormalsCount} inverted face ${flippedNormalsCount === 1 ? 'normal' : 'normals'} outward`
      );
    }
  }

  // Step 5: Close open boundary holes
  let holesClosedCount = 0;
  let capTrianglesAdded = 0;

  if (options.closeHoles && workingTris.length > 0) {
    // Find undirected edges with only 1 incident triangle
    const edgeToDirected = new Map<string, { u: number; v: number; count: number }>();

    for (const [a, b, c] of workingTris) {
      const pairs: [number, number][] = [
        [a, b],
        [b, c],
        [c, a],
      ];
      for (const [u, v] of pairs) {
        const key = u < v ? `${u}_${v}` : `${v}_${u}`;
        const existing = edgeToDirected.get(key);
        if (!existing) {
          edgeToDirected.set(key, { u, v, count: 1 });
        } else {
          existing.count++;
        }
      }
    }

    // Build boundary adjacency map. To seal an open half-edge (u -> v), the cap face must traverse (v -> u).
    const boundaryNext = new Map<number, number[]>();
    const boundaryEdges: [number, number][] = [];

    for (const item of edgeToDirected.values()) {
      if (item.count === 1) {
        const start = item.v;
        const end = item.u;
        boundaryEdges.push([start, end]);
        const list = boundaryNext.get(start) || [];
        list.push(end);
        boundaryNext.set(start, list);
      }
    }

    if (boundaryEdges.length > 0) {
      const usedBoundaryEdges = new Set<string>();

      for (const [startU, startV] of boundaryEdges) {
        const initialKey = `${startU}_${startV}`;
        if (usedBoundaryEdges.has(initialKey)) continue;

        const loop: number[] = [startU, startV];
        usedBoundaryEdges.add(initialKey);

        let curr = startV;
        let closed = false;
        let safety = 0;

        while (safety++ < 500) {
          const candidates = boundaryNext.get(curr) || [];
          const nextVertex = candidates.find(
            (cand) => !usedBoundaryEdges.has(`${curr}_${cand}`)
          );
          if (nextVertex === undefined) break;

          usedBoundaryEdges.add(`${curr}_${nextVertex}`);
          if (nextVertex === startU) {
            closed = true;
            break;
          }
          if (loop.includes(nextVertex)) {
            break;
          }
          loop.push(nextVertex);
          curr = nextVertex;
        }

        if (closed && loop.length >= 3) {
          holesClosedCount++;
          // Fan triangulation from loop[0]
          const root = loop[0];
          for (let i = 1; i < loop.length - 1; i++) {
            const v1 = loop[i];
            const v2 = loop[i + 1];
            if (root !== v1 && v1 !== v2 && v2 !== root) {
              workingTris.push([root, v1, v2]);
              capTrianglesAdded++;
            }
          }
        }
      }

      // Re-orient any newly added cap triangles so their normals point outward
      if (capTrianglesAdded > 0 && options.fixNormals) {
        let cx = 0,
          cy = 0,
          cz = 0;
        for (const v of vertices) {
          cx += v.x;
          cy += v.y;
          cz += v.z;
        }
        cx /= Math.max(1, vertices.length);
        cy /= Math.max(1, vertices.length);
        cz /= Math.max(1, vertices.length);
        const centroid: Vec3 = { x: cx, y: cy, z: cz };

        workingTris = workingTris.map(([a, b, c]) => {
          const va = vertices[a];
          const vb = vertices[b];
          const vc = vertices[c];
          const normal = cross(sub(vb, va), sub(vc, va));
          const fc: Vec3 = {
            x: (va.x + vb.x + vc.x) / 3,
            y: (va.y + vb.y + vc.y) / 3,
            z: (va.z + vb.z + vc.z) / 3,
          };
          if (dot(normal, sub(fc, centroid)) < -1e-4) {
            return [a, c, b];
          }
          return [a, b, c];
        });
      }

      if (holesClosedCount > 0) {
        actionsSummary.push(
          `Closed ${holesClosedCount} open boundary ${holesClosedCount === 1 ? 'hole' : 'holes'} (+${capTrianglesAdded} manifold cap ${capTrianglesAdded === 1 ? 'face' : 'faces'})`
        );
      }
    }
  }

  // Convert workingTris back to Float32Array
  const rawOut = new Float32Array(workingTris.length * 9);
  for (let i = 0; i < workingTris.length; i++) {
    const [a, b, c] = workingTris[i];
    const va = vertices[a];
    const vb = vertices[b];
    const vc = vertices[c];
    const base = i * 9;
    rawOut[base] = va.x;
    rawOut[base + 1] = va.y;
    rawOut[base + 2] = va.z;
    rawOut[base + 3] = vb.x;
    rawOut[base + 4] = vb.y;
    rawOut[base + 5] = vb.z;
    rawOut[base + 6] = vc.x;
    rawOut[base + 7] = vc.y;
    rawOut[base + 8] = vc.z;
  }

  const normalizedResult = normalizeAndMeasurePositions(rawOut);
  const updatedHistory = [
    ...existingHistory,
    ...(actionsSummary.length > 0
      ? actionsSummary
      : ['Verified mesh topology (no new defects found)']),
  ];

  const afterReport = analyzeMeshTopology(
    normalizedResult.geometry.positions,
    weldTol,
    updatedHistory
  );

  return {
    geometry: normalizedResult.geometry,
    dims: normalizedResult.dims,
    report: afterReport,
    actionsSummary,
  };
}

/**
 * Generates a realistic damaged ASCII STL ArrayBuffer (a 44x36x28mm CoreXY Sensor Bracket)
 * containing intentional mesh defects:
 * - 1 open hole on the top face (missing 2 triangles = 4 open boundary edges)
 * - 2 inverted face normals (wound clockwise instead of counter-clockwise)
 * - 2 degenerate zero-area sliver triangles
 * - 1 duplicate overlapping triangle
 * - Micro-gap unmerged vertices (off by 0.004mm)
 */
export function generateDamagedSampleSTL(): {
  fileName: string;
  buffer: ArrayBuffer;
  description: string;
} {
  // Base closed box 44 x 36 x 28 mm:
  // v0: (0,0,0), v1: (44,0,0), v2: (44,36,0), v3: (0,36,0)
  // v4: (0,0,28), v5: (44,0,28), v6: (44,36,28), v7: (0,36,28)
  const facets: string[] = [];

  const addTri = (
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number]
  ) => {
    facets.push(`  facet normal 0 0 1
    outer loop
      vertex ${p1[0]} ${p1[1]} ${p1[2]}
      vertex ${p2[0]} ${p2[1]} ${p2[2]}
      vertex ${p3[0]} ${p3[1]} ${p3[2]}
    endloop
  endfacet`);
  };

  // Bottom face (Z=0, outward normal -Z): (0,0,0)-(0,36,0)-(44,36,0) and (0,0,0)-(44,36,0)-(44,0,0)
  addTri([0, 0, 0], [0, 36, 0], [44, 36, 0]);
  addTri([0, 0, 0], [44, 36, 0], [44, 0, 0]);

  // Front face (Y=0, outward normal -Y): (0,0,0)-(44,0,0)-(44,0,28) and (0,0,0)-(44,0,28)-(0,0,28)
  // Intentionally invert normal on first front triangle! (wound backwards)
  addTri([0, 0, 0], [44, 0, 28], [44, 0, 0]); // INVERTED NORMAL #1
  addTri([0, 0, 0], [44, 0, 28], [0, 0, 28]);

  // Right face (X=44, outward normal +X): (44,0,0)-(44,36,0)-(44,36,28) and (44,0,0)-(44,36,28)-(44,0,28)
  // Introduce a 0.004mm vertex micro-gap on (44.004, 36, 28)
  addTri([44, 0, 0], [44, 36, 0], [44.004, 36, 28]);
  // Intentionally invert normal on second right triangle!
  addTri([44, 0, 0], [44, 0, 28], [44, 36, 28]); // INVERTED NORMAL #2

  // Back face (Y=36, outward normal +Y): (44,36,0)-(0,36,0)-(0,36,28) and (44,36,0)-(0,36,28)-(44,36,28)
  addTri([44, 36, 0], [0, 36, 0], [0, 36, 28]);
  addTri([44, 36, 0], [0, 36, 28], [44, 36, 28]);

  // Left face (X=0, outward normal -X): (0,36,0)-(0,0,0)-(0,0,28) and (0,36,0)-(0,0,28)-(0,36,28)
  addTri([0, 36, 0], [0, 0, 0], [0, 0, 28]);
  addTri([0, 36, 0], [0, 0, 28], [0, 36, 28]);

  // Top face (Z=28, outward normal +Z):
  // INTENTIONALLY OMIT the two top triangles [(0,0,28)-(44,0,28)-(44,36,28) and (0,0,28)-(44,36,28)-(0,36,28)]
  // so there is a 4-edge open rectangular hole on top!

  // Add 1 duplicate triangle (identical to bottom face tri 1)
  addTri([0, 0, 0], [0, 36, 0], [44, 36, 0]);

  // Add 2 degenerate zero-area sliver triangles
  addTri([10, 10, 0], [10, 10, 0], [25, 10, 0]);
  addTri([0, 0, 0], [22, 0, 0], [44, 0, 0]); // collinear zero-area triangle

  const asciiStl = `solid Bambu_X1C_Sensor_Mount_Damaged\n${facets.join('\n')}\nendsolid Bambu_X1C_Sensor_Mount_Damaged\n`;
  const encoded = new TextEncoder().encode(asciiStl);

  return {
    fileName: 'X1C_Toolhead_Duct_Unrepaired.stl',
    buffer: encoded.buffer,
    description:
      'Contains 1 open top hole (4 open boundary edges), 2 inverted face normals, 2 degenerate zero-area triangles, 1 duplicate face, and 1 micro-gap vertex.',
  };
}
