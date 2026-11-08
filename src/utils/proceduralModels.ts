import * as THREE from 'three';
import type { PlateObject, PresetShapeType } from '../types/slicer';

export interface PresetCatalogItem {
  presetType: PresetShapeType;
  name: string;
  sourceFormat: '3MF' | 'STL';
  description: string;
  baseDims: { x: number; y: number; z: number };
  triangles: number;
  recommendedAmsSlot: number;
}

export const PRESET_MODELS_CATALOG: PresetCatalogItem[] = [
  {
    presetType: 'benchy_hull',
    name: '3DBenchy_Speedboat_X1C.3mf',
    sourceFormat: '3MF',
    description: 'Bambu 17-min SpeedBoat benchmark with hull, cabin arch, smokestack & wheelhouse trim',
    baseDims: { x: 60, y: 31, z: 48 },
    triangles: 22560,
    recommendedAmsSlot: 2,
  },
  {
    presetType: 'planetary_gear',
    name: 'CoreXY_Planetary_Gearbox.3mf',
    sourceFormat: '3MF',
    description: 'Print-in-place 5:1 sun-and-planet helical gear assembly with chamfered ring housing',
    baseDims: { x: 68, y: 68, z: 24 },
    triangles: 34820,
    recommendedAmsSlot: 1,
  },
  {
    presetType: 'bambu_scraper',
    name: 'Bambu_Grip_Bed_Scraper.3mf',
    sourceFormat: '3MF',
    description: 'Ergonomic hex-core bed scraper handle with blade tensioner & hanging loop',
    baseDims: { x: 46, y: 112, z: 16 },
    triangles: 14200,
    recommendedAmsSlot: 3,
  },
  {
    presetType: 'voronoi_vase',
    name: 'Twisted_Turbine_Impeller.stl',
    sourceFormat: 'STL',
    description: 'High-flow aerodynamic stator & lathe-contoured diffuser hub for overhang calibration',
    baseDims: { x: 58, y: 58, z: 62 },
    triangles: 28900,
    recommendedAmsSlot: 4,
  },
  {
    presetType: 'calibration_cube',
    name: 'X1C_Dimensional_Tower_XYZ.stl',
    sourceFormat: 'STL',
    description: 'Multi-stepped flow & dimensional tolerance block with bridging arches & boss pins',
    baseDims: { x: 40, y: 40, z: 36 },
    triangles: 8640,
    recommendedAmsSlot: 2,
  },
];

/**
 * Creates a procedural Bambu Lab X1 Carbon 256x256mm Textured PEI Build Plate texture
 * with authentic grid lines, front purge zone, plate type label, and QR calibration marker.
 */
export function createBambuPeiPlateTextures(maxAnisotropy: number): {
  colorMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base dark golden-slate textured PEI tone
  ctx.fillStyle = '#191d24';
  ctx.fillRect(0, 0, size, size);

  // Subtle PEI metallic sparkle noise
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const alpha = 0.02 + Math.random() * 0.05;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 1.5})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Border margin
  const margin = 24;
  const gridArea = size - margin * 2;
  const step16 = gridArea / 16; // 16x16 blocks of 16mm = 256mm

  // Sub-grid (8mm intervals)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 32; i++) {
    const pos = margin + (gridArea / 32) * i;
    ctx.moveTo(pos, margin);
    ctx.lineTo(pos, size - margin);
    ctx.moveTo(margin, pos);
    ctx.lineTo(size - margin, pos);
  }
  ctx.stroke();

  // Major grid (16mm intervals)
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.24)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const pos = margin + step16 * i;
    ctx.moveTo(pos, margin);
    ctx.lineTo(pos, size - margin);
    ctx.moveTo(margin, pos);
    ctx.lineTo(size - margin, pos);
  }
  ctx.stroke();

  // Center X / Y origin crosshairs (Bambu green & subtle orange axis cues)
  const center = size / 2;
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(center, margin);
  ctx.lineTo(center, size - margin);
  ctx.moveTo(margin, center);
  ctx.lineTo(size - margin, center);
  ctx.stroke();

  // Outer perimeter frame
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.65)';
  ctx.lineWidth = 3;
  ctx.strokeRect(margin, margin, gridArea, gridArea);

  // Front edge Bambu Lab X1C PEI branding & LiDAR calibration strip
  ctx.fillStyle = 'rgba(241, 245, 249, 0.78)';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BAMBU TEXTURED PEI PLATE  ·  256 × 256 × 256 MM', center, size - 36);

  // LiDAR Micro-Calibration L-lines at front left & right
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.strokeRect(margin + 14, size - margin - 22, 140, 10);

  // ArUco plate ID matrix on right edge
  const qrX = size - margin - 42;
  const qrY = size - margin - 42;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(qrX, qrY, 28, 28);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(qrX + 4, qrY + 4, 8, 8);
  ctx.fillRect(qrX + 16, qrY + 4, 8, 8);
  ctx.fillRect(qrX + 8, qrY + 14, 12, 10);

  const colorMap = new THREE.CanvasTexture(canvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.anisotropy = maxAnisotropy;

  // Generate tileable micro-relief bump map for textured PEI coating
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4500; i++) {
    const v = 90 + Math.floor(Math.random() * 75);
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(8, 8);

  return { colorMap, bumpMap };
}

/**
 * Builds a composite 4 to 8 part THREE.Group representing a PlateObject,
 * pivoted at bottom-center (y = 0 in Three.js world space) with varied PBR roughness/metalness
 * and clippingPlane support for live layer-by-layer slicing inspection.
 */
export function buildPlateObjectGroup(
  obj: PlateObject,
  filamentHex: string,
  clippingPlane: THREE.Plane,
  wireframeMode: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.name = obj.id;

  const baseColor = new THREE.Color(filamentHex);
  const accentColor = baseColor.clone().offsetHSL(0, 0.05, 0.12);
  const darkTrimColor = baseColor.clone().multiplyScalar(0.68);

  // 3 distinct PBR materials with >= 0.25 roughness variation for realistic part read
  const primaryMat = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.62,
    metalness: 0.12,
    clippingPlanes: [clippingPlane],
    clipShadows: true,
    wireframe: wireframeMode,
  });

  const secondaryGlossMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.24,
    metalness: 0.28,
    clippingPlanes: [clippingPlane],
    clipShadows: true,
    wireframe: wireframeMode,
  });

  const accentMetallicMat = new THREE.MeshStandardMaterial({
    color: darkTrimColor,
    roughness: 0.35,
    metalness: 0.55,
    clippingPlanes: [clippingPlane],
    clipShadows: true,
    wireframe: wireframeMode,
  });

  if (obj.presetType === 'custom_mesh' && obj.customGeometry && obj.customGeometry.positions.length >= 9) {
    // Uploaded STL or 3MF file geometry (Z-up slicer coords converted to Y-up Three.js coords)
    const rawPos = obj.customGeometry.positions;
    const converted = new Float32Array(rawPos.length);
    for (let i = 0; i < rawPos.length; i += 3) {
      converted[i] = rawPos[i]; // X
      converted[i + 1] = rawPos[i + 2]; // Slicer Z -> Three.js Y (height above plate)
      converted[i + 2] = -rawPos[i + 1]; // Slicer Y -> Three.js -Z
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(converted, 3));
    geom.computeVertexNormals();

    const mainMesh = new THREE.Mesh(geom, primaryMat);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    group.add(mainMesh);

    // Add a subtle Adhesion Brim ring at the base (secondary read)
    const brimRadius = Math.max(obj.baseDims.x, obj.baseDims.y) * 0.54;
    const brimGeom = new THREE.RingGeometry(brimRadius * 0.88, brimRadius, 48);
    brimGeom.rotateX(-Math.PI / 2);
    const brimMesh = new THREE.Mesh(brimGeom, secondaryGlossMat);
    brimMesh.position.y = 0.15;
    group.add(brimMesh);

    return group;
  }

  switch (obj.presetType) {
    case 'benchy_hull': {
      // Composite 6-part Speedboat Benchmark (60 x 31 x 48 mm)
      // 1. Base pedestal keel
      const keelShape = new THREE.Shape();
      keelShape.moveTo(-22, -11);
      keelShape.lineTo(16, -11);
      keelShape.quadraticCurveTo(26, 0, 16, 11);
      keelShape.lineTo(-22, 11);
      keelShape.lineTo(-22, -11);

      const keelGeom = new THREE.ExtrudeGeometry(keelShape, {
        depth: 5,
        bevelEnabled: true,
        bevelThickness: 1.2,
        bevelSize: 1.0,
        bevelSegments: 2,
      });
      keelGeom.rotateX(-Math.PI / 2);
      const keelMesh = new THREE.Mesh(keelGeom, accentMetallicMat);
      keelMesh.position.y = 1.0;
      keelMesh.castShadow = true;
      keelMesh.receiveShadow = true;
      group.add(keelMesh);

      // 2. Main flared hull body
      const hullShape = new THREE.Shape();
      hullShape.moveTo(-26, -14);
      hullShape.lineTo(18, -14);
      hullShape.quadraticCurveTo(31, 0, 18, 14);
      hullShape.lineTo(-26, 14);
      hullShape.lineTo(-26, -14);

      const hullGeom = new THREE.ExtrudeGeometry(hullShape, {
        depth: 12,
        bevelEnabled: true,
        bevelThickness: 2.0,
        bevelSize: 1.8,
        bevelSegments: 3,
      });
      hullGeom.rotateX(-Math.PI / 2);
      const hullMesh = new THREE.Mesh(hullGeom, primaryMat);
      hullMesh.position.y = 6;
      hullMesh.castShadow = true;
      hullMesh.receiveShadow = true;
      group.add(hullMesh);

      // 3. Deck gunwale trim
      const deckGeom = new THREE.BoxGeometry(44, 3, 24);
      const deckMesh = new THREE.Mesh(deckGeom, secondaryGlossMat);
      deckMesh.position.set(-2, 19.5, 0);
      deckMesh.castShadow = true;
      group.add(deckMesh);

      // 4. Wheelhouse cabin pillars & arches
      const cabinGeom = new THREE.BoxGeometry(20, 18, 20);
      const cabinMesh = new THREE.Mesh(cabinGeom, primaryMat);
      cabinMesh.position.set(1, 29, 0);
      cabinMesh.castShadow = true;
      cabinMesh.receiveShadow = true;
      group.add(cabinMesh);

      // 5. Cabin roof overhang
      const roofGeom = new THREE.BoxGeometry(24, 3.2, 23);
      const roofMesh = new THREE.Mesh(roofGeom, secondaryGlossMat);
      roofMesh.position.set(1.5, 39, 0);
      roofMesh.castShadow = true;
      group.add(roofMesh);

      // 6. Angled smokestack chimney (accent detail)
      const stackGeom = new THREE.CylinderGeometry(3.6, 2.8, 11, 20);
      const stackMesh = new THREE.Mesh(stackGeom, accentMetallicMat);
      stackMesh.position.set(9, 43.5, 0);
      stackMesh.rotation.z = -0.32;
      stackMesh.castShadow = true;
      group.add(stackMesh);

      // 7. Front hawsehole porthole rings
      const portGeom = new THREE.TorusGeometry(2.4, 0.7, 10, 20);
      const portLeft = new THREE.Mesh(portGeom, accentMetallicMat);
      portLeft.position.set(18, 14, 13.5);
      group.add(portLeft);
      const portRight = portLeft.clone();
      portRight.position.z = -13.5;
      group.add(portRight);

      break;
    }

    case 'planetary_gear': {
      // Composite 7-part Print-In-Place Planetary Gearbox (68 x 68 x 24 mm)
      // 1. Outer Ring Housing
      const ringShape = new THREE.Shape();
      ringShape.absarc(0, 0, 34, 0, Math.PI * 2, false);
      const holePath = new THREE.Path();
      holePath.absarc(0, 0, 26, 0, Math.PI * 2, true);
      ringShape.holes.push(holePath);

      const ringGeom = new THREE.ExtrudeGeometry(ringShape, {
        depth: 20,
        bevelEnabled: true,
        bevelThickness: 2,
        bevelSize: 1.5,
        bevelSegments: 2,
      });
      ringGeom.rotateX(-Math.PI / 2);
      const ringMesh = new THREE.Mesh(ringGeom, primaryMat);
      ringMesh.position.y = 2;
      ringMesh.castShadow = true;
      ringMesh.receiveShadow = true;
      group.add(ringMesh);

      // 2. Central Sun Gear with hex drive bore
      const sunGeom = new THREE.CylinderGeometry(10.5, 10.5, 23.5, 24);
      const sunMesh = new THREE.Mesh(sunGeom, secondaryGlossMat);
      sunMesh.position.y = 12;
      sunMesh.castShadow = true;
      group.add(sunMesh);

      // 3-6. Four Planet Gears arranged radially
      const planetGeom = new THREE.CylinderGeometry(7.2, 7.2, 22, 18);
      const pinGeom = new THREE.CylinderGeometry(2.8, 2.8, 24, 12);
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        const r = 18.2;
        const px = Math.cos(angle) * r;
        const pz = Math.sin(angle) * r;

        const planetMesh = new THREE.Mesh(planetGeom, primaryMat);
        planetMesh.position.set(px, 11.5, pz);
        planetMesh.castShadow = true;
        group.add(planetMesh);

        const pinMesh = new THREE.Mesh(pinGeom, accentMetallicMat);
        pinMesh.position.set(px, 12, pz);
        group.add(pinMesh);
      }

      // 7. Outer mounting flange lugs
      const lugGeom = new THREE.BoxGeometry(74, 8, 12);
      const lug1 = new THREE.Mesh(lugGeom, accentMetallicMat);
      lug1.position.y = 4;
      group.add(lug1);
      break;
    }

    case 'bambu_scraper': {
      // Composite 5-part Bed Scraper Handle (46 x 112 x 16 mm)
      const bodyShape = new THREE.Shape();
      bodyShape.moveTo(-22, -54);
      bodyShape.lineTo(22, -54);
      bodyShape.lineTo(17, 52);
      bodyShape.quadraticCurveTo(0, 58, -17, 52);
      bodyShape.lineTo(-22, -54);

      const slotHole = new THREE.Path();
      slotHole.absarc(0, 38, 6.5, 0, Math.PI * 2, true);
      bodyShape.holes.push(slotHole);

      const handleGeom = new THREE.ExtrudeGeometry(bodyShape, {
        depth: 11,
        bevelEnabled: true,
        bevelThickness: 2,
        bevelSize: 1.5,
        bevelSegments: 2,
      });
      handleGeom.rotateX(-Math.PI / 2);
      const handleMesh = new THREE.Mesh(handleGeom, primaryMat);
      handleMesh.position.y = 2;
      handleMesh.castShadow = true;
      handleMesh.receiveShadow = true;
      group.add(handleMesh);

      // Chamfered scraper blade lip at front
      const bladeGeom = new THREE.BoxGeometry(44, 3.2, 16);
      const bladeMesh = new THREE.Mesh(bladeGeom, secondaryGlossMat);
      bladeMesh.position.set(0, 2.2, 54);
      bladeMesh.rotation.x = 0.25;
      bladeMesh.castShadow = true;
      group.add(bladeMesh);

      // Grip ribs along top surface
      const ribGeom = new THREE.BoxGeometry(28, 3, 4);
      for (let i = -3; i <= 1; i++) {
        const rib = new THREE.Mesh(ribGeom, accentMetallicMat);
        rib.position.set(0, 14.5, i * 14);
        rib.castShadow = true;
        group.add(rib);
      }
      break;
    }

    case 'voronoi_vase': {
      // Composite 5-part Twisted Aerodynamic Stator / Impeller (58 x 58 x 62 mm)
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(27, 0),
        new THREE.Vector2(25, 10),
        new THREE.Vector2(18, 28),
        new THREE.Vector2(22, 48),
        new THREE.Vector2(15, 62),
        new THREE.Vector2(9, 62),
        new THREE.Vector2(9, 4),
        new THREE.Vector2(0, 4),
      ];
      const latheGeom = new THREE.LatheGeometry(points, 32);
      const vaseMesh = new THREE.Mesh(latheGeom, primaryMat);
      vaseMesh.castShadow = true;
      vaseMesh.receiveShadow = true;
      group.add(vaseMesh);

      // Aerodynamic stator fins around perimeter
      const finGeom = new THREE.BoxGeometry(5, 48, 28);
      for (let i = 0; i < 6; i++) {
        const fin = new THREE.Mesh(finGeom, secondaryGlossMat);
        const angle = (i * Math.PI) / 3;
        fin.position.set(Math.cos(angle) * 14, 26, Math.sin(angle) * 14);
        fin.rotation.y = -angle + 0.35;
        fin.castShadow = true;
        group.add(fin);
      }

      // Top lock ring
      const topRingGeom = new THREE.TorusGeometry(13, 2.2, 12, 32);
      topRingGeom.rotateX(Math.PI / 2);
      const topRing = new THREE.Mesh(topRingGeom, accentMetallicMat);
      topRing.position.y = 61;
      group.add(topRing);
      break;
    }

    case 'calibration_cube':
    default: {
      // Composite 5-part XYZ Dimensional Calibration Tower (40 x 40 x 36 mm)
      const baseGeom = new THREE.BoxGeometry(40, 12, 40);
      const baseMesh = new THREE.Mesh(baseGeom, primaryMat);
      baseMesh.position.y = 6;
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      group.add(baseMesh);

      const midGeom = new THREE.BoxGeometry(28, 14, 28);
      const midMesh = new THREE.Mesh(midGeom, secondaryGlossMat);
      midMesh.position.y = 19;
      midMesh.castShadow = true;
      midMesh.receiveShadow = true;
      group.add(midMesh);

      const topBossGeom = new THREE.CylinderGeometry(9, 9, 10, 24);
      const topBoss = new THREE.Mesh(topBossGeom, accentMetallicMat);
      topBoss.position.y = 31;
      topBoss.castShadow = true;
      group.add(topBoss);

      const cornerPinGeom = new THREE.CylinderGeometry(2.5, 2.5, 16, 16);
      const pinPositions = [
        [-14, -14],
        [14, -14],
        [-14, 14],
        [14, 14],
      ];
      for (const [px, pz] of pinPositions) {
        const pin = new THREE.Mesh(cornerPinGeom, accentMetallicMat);
        pin.position.set(px, 14, pz);
        pin.castShadow = true;
        group.add(pin);
      }
      break;
    }
  }

  return group;
}
