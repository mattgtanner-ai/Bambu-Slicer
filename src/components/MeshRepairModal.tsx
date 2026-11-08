import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import type {
  ManualRepairOptions,
  MeshDiagnosticsReport,
  PlateObject,
} from '../types/slicer';
import { DEFAULT_MANUAL_REPAIR_OPTIONS } from '../utils/meshRepairEngine';

interface MeshRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedObject: PlateObject | null;
  objects: PlateObject[];
  onSelectObject: (id: string) => void;
  autoRepairOnImport: boolean;
  onToggleAutoRepairOnImport: (enabled: boolean) => void;
  onRunManualRepair: (objId: string, options: ManualRepairOptions) => void;
  onRestoreOriginalMesh: (objId: string) => void;
  onLoadDamagedSampleStl: (skipAutoRepair?: boolean) => void;
}

export const MeshRepairModal: React.FC<MeshRepairModalProps> = ({
  isOpen,
  onClose,
  selectedObject,
  objects,
  onSelectObject,
  autoRepairOnImport,
  onToggleAutoRepairOnImport,
  onRunManualRepair,
  onRestoreOriginalMesh,
  onLoadDamagedSampleStl,
}) => {
  const [options, setOptions] = useState<ManualRepairOptions>(
    DEFAULT_MANUAL_REPAIR_OPTIONS
  );

  if (!isOpen) return null;

  const activeObj = selectedObject || objects[0] || null;
  const report: MeshDiagnosticsReport | undefined = activeObj?.meshReport;

  const totalIssues = report
    ? report.nonManifoldEdges +
      report.openBoundaryEdges +
      report.invertedNormals +
      report.degenerateTriangles +
      report.duplicateTriangles
    : 0;

  const canRevert = Boolean(
    activeObj?.originalPositions && activeObj.originalPositions.length > 0
  );

  const anyManualOptionSelected =
    options.closeHoles ||
    options.fixNormals ||
    options.removeDegenerate ||
    options.removeDuplicates ||
    options.weldVertices;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mesh-repair-dialog-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-6"
    >
      <div className="w-full max-w-4xl bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="mesh-repair-dialog-title"
                className="text-base font-bold text-slate-100 truncate"
              >
                STL / 3MF Mesh Diagnostics &amp; Repair Studio
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Automatic manifold verification, hole patching, normal unification &amp; vertex welding for Bambu X1 Carbon
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Global Auto-Repair on Upload Toggle */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer text-xs text-slate-200 whitespace-nowrap shrink-0">
              <input
                type="checkbox"
                checked={autoRepairOnImport}
                onChange={(e) => onToggleAutoRepairOnImport(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
              <span>Auto-Repair on File Upload</span>
            </label>

            <button
              type="button"
              aria-label="Close Mesh Repair Studio"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Top Bar: Model Selector + Damaged STL Test Loader */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-3 flex-1 min-w-[260px]">
              <label
                htmlFor="repair-model-select"
                className="text-xs font-semibold text-slate-300 whitespace-nowrap"
              >
                Target Plate Model:
              </label>
              <select
                id="repair-model-select"
                value={activeObj?.id || ''}
                onChange={(e) => onSelectObject(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-[#0f172a] border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {objects.map((obj) => {
                  const objIssues = obj.meshReport
                    ? obj.meshReport.nonManifoldEdges +
                      obj.meshReport.openBoundaryEdges +
                      obj.meshReport.invertedNormals +
                      obj.meshReport.degenerateTriangles +
                      obj.meshReport.duplicateTriangles
                    : 0;
                  return (
                    <option key={obj.id} value={obj.id}>
                      {obj.name} ({obj.sourceFormat} · {obj.triangles.toLocaleString()} tris
                      {objIssues > 0
                        ? ` · ${objIssues} errors`
                        : obj.meshReport?.status === 'repaired'
                        ? ' · Repaired'
                        : ' · Manifold'}
                      )
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onLoadDamagedSampleStl(true)}
                className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/50 hover:bg-amber-950/80 border border-amber-700/60 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <FileWarning className="w-3.5 h-3.5 text-amber-400" />
                Load Damaged Test STL (Unrepaired)
              </button>
            </div>
          </div>

          {activeObj && report ? (
            <div className="grid grid-cols-12 gap-4">
              {/* Left 7 Columns: Mesh Topology Diagnostics & Repair History */}
              <div className="col-span-7 space-y-3.5">
                {/* Overall Manifold Health Banner */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 ${
                    totalIssues > 0
                      ? 'bg-amber-950/30 border-amber-700/70'
                      : report.status === 'repaired'
                      ? 'bg-emerald-950/30 border-emerald-700/70'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {totalIssues > 0 ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-sm font-bold text-slate-100">
                        {totalIssues > 0
                          ? `Mesh Defects Detected (${totalIssues} Total Issues)`
                          : report.status === 'repaired'
                          ? 'Mesh Repaired & Verified Watertight Manifold'
                          : 'Watertight 2-Manifold Geometry Verified'}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {totalIssues > 0
                          ? 'Open boundary loops, inverted normals, or degenerate faces can cause slicing gaps or spaghetti on X1C.'
                          : 'All half-edges are paired cleanly with outward normals. Ready for high-speed CoreXY toolpath generation.'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="text-[11px] text-slate-400">Integrity Score</div>
                    <div
                      className={`text-lg font-bold ${
                        totalIssues > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {report.healthScore}%
                    </div>
                  </div>
                </div>

                {/* 6-Cell Topological Error Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2.5 font-mono tabular-nums">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="text-[11px] font-sans text-slate-400">
                      Open Boundary Edges
                    </div>
                    <div
                      data-testid="metric-open-edges"
                      className={`text-base font-bold mt-0.5 ${
                        report.openBoundaryEdges > 0
                          ? 'text-amber-400'
                          : 'text-slate-100'
                      }`}
                    >
                      {report.openBoundaryEdges}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        ({report.estimatedHoles} {report.estimatedHoles === 1 ? 'hole' : 'holes'})
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="text-[11px] font-sans text-slate-400">
                      Inverted Face Normals
                    </div>
                    <div
                      data-testid="metric-inverted-normals"
                      className={`text-base font-bold mt-0.5 ${
                        report.invertedNormals > 0
                          ? 'text-amber-400'
                          : 'text-slate-100'
                      }`}
                    >
                      {report.invertedNormals}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="text-[11px] font-sans text-slate-400">
                      Degenerate Faces
                    </div>
                    <div
                      data-testid="metric-degenerate-faces"
                      className={`text-base font-bold mt-0.5 ${
                        report.degenerateTriangles > 0
                          ? 'text-amber-400'
                          : 'text-slate-100'
                      }`}
                    >
                      {report.degenerateTriangles}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="text-[11px] font-sans text-slate-400">
                      Duplicate Faces
                    </div>
                    <div
                      data-testid="metric-duplicate-faces"
                      className={`text-base font-bold mt-0.5 ${
                        report.duplicateTriangles > 0
                          ? 'text-amber-400'
                          : 'text-slate-100'
                      }`}
                    >
                      {report.duplicateTriangles}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="text-[11px] font-sans text-slate-400">
                      Non-Manifold Edges
                    </div>
                    <div
                      data-testid="metric-non-manifold"
                      className={`text-base font-bold mt-0.5 ${
                        report.nonManifoldEdges > 0
                          ? 'text-rose-400'
                          : 'text-slate-100'
                      }`}
                    >
                      {report.nonManifoldEdges}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="text-[11px] font-sans text-slate-400">
                      Active Mesh Topology
                    </div>
                    <div className="text-sm font-bold text-slate-100 mt-0.5">
                      {report.totalTriangles.toLocaleString()} tris ·{' '}
                      {report.uniqueVertices.toLocaleString()} verts
                    </div>
                  </div>
                </div>

                {/* Repair History & Operations Log */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Mesh Repair Execution Log
                    </span>
                    {canRevert && (
                      <button
                        type="button"
                        onClick={() => onRestoreOriginalMesh(activeObj.id)}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                        Restore Original Unrepaired Mesh
                      </button>
                    )}
                  </div>

                  {report.repairHistory.length > 0 ? (
                    <ul className="space-y-1 text-xs font-mono text-slate-300 max-h-36 overflow-y-auto">
                      {report.repairHistory.map((entry, idx) => (
                        <li
                          key={`${entry}-${idx}`}
                          className="flex items-center gap-2 py-1 px-2.5 bg-[#0f172a] border border-slate-800/80 rounded"
                        >
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span>{entry}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No repair passes executed yet on this mesh. Select manual repair operations on the right to process geometry.
                    </p>
                  )}
                </div>
              </div>

              {/* Right 5 Columns: Manual Repair Operations Panel */}
              <div className="col-span-5 p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between space-y-2.5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider whitespace-nowrap">
                        Manual Repair Operations
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                      5 Passes
                    </span>
                  </div>

                  {/* Pass 1: Close Open Holes */}
                  <label className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0f172a] border border-slate-800/90 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={options.closeHoles}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          closeHoles: e.target.checked,
                        }))
                      }
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-100">
                        Close Open Boundary Holes
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">
                        Traces open half-edge loops and caps missing facets
                      </div>
                    </div>
                  </label>

                  {/* Pass 2: Fix Inverted Normals */}
                  <label className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0f172a] border border-slate-800/90 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={options.fixNormals}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          fixNormals: e.target.checked,
                        }))
                      }
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-100">
                        Unify &amp; Flip Inverted Face Normals
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">
                        Re-orients inward facets so all surface normals face outward
                      </div>
                    </div>
                  </label>

                  {/* Pass 3: Remove Degenerate Faces */}
                  <label className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0f172a] border border-slate-800/90 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={options.removeDegenerate}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          removeDegenerate: e.target.checked,
                        }))
                      }
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-100">
                        Remove Degenerate Zero-Area Slivers
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">
                        Prunes collinear and collapsed zero-area triangles
                      </div>
                    </div>
                  </label>

                  {/* Pass 4: Remove Duplicate & Non-Manifold Faces */}
                  <label className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0f172a] border border-slate-800/90 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={options.removeDuplicates}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          removeDuplicates: e.target.checked,
                        }))
                      }
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-100">
                        Deduplicate &amp; Resolve Non-Manifold Faces
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">
                        Removes overlapping double-facets and excess shared edges
                      </div>
                    </div>
                  </label>

                  {/* Pass 5: Weld Close Vertices + Tolerance */}
                  <div className="p-2 rounded-lg bg-[#0f172a] border border-slate-800/90 space-y-1.5">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.weldVertices}
                        onChange={(e) =>
                          setOptions((prev) => ({
                            ...prev,
                            weldVertices: e.target.checked,
                          }))
                        }
                        className="mt-0.5 accent-emerald-500"
                      />
                      <div className="text-xs flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-100">
                            Weld Micro-Gap Vertices
                          </span>
                          <span className="font-mono text-emerald-400 tabular-nums">
                            {options.weldToleranceMm.toFixed(3)} mm
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 leading-snug">
                          Stitches disconnected STL facet vertices within tolerance
                        </div>
                      </div>
                    </label>

                    {options.weldVertices && (
                      <div>
                        <label
                          htmlFor="weld-tolerance-range"
                          className="sr-only"
                        >
                          Vertex Weld Tolerance in millimeters
                        </label>
                        <input
                          id="weld-tolerance-range"
                          type="range"
                          min={0.001}
                          max={0.1}
                          step={0.001}
                          value={options.weldToleranceMm}
                          onChange={(e) =>
                            setOptions((prev) => ({
                              ...prev,
                              weldToleranceMm: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-emerald-500"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>0.001 mm</span>
                          <span>0.010 mm (Std)</span>
                          <span>0.100 mm</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Execute Manual Repair CTA */}
                <div className="pt-1">
                  <button
                    type="button"
                    disabled={!anyManualOptionSelected}
                    onClick={() => onRunManualRepair(activeObj.id, options)}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Run Selected Manual Repairs
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No 3D models on the build plate. Import an STL or 3MF file to run mesh diagnostics.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>
            Slicer Engine: Half-Edge Manifold Topology Verifier · Bambu Lab X1C
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
