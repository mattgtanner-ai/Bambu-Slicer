import React, { useEffect, useRef } from 'react';
import {
  ArrowDownToLine,
  Copy,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  FlipHorizontal,
  FlipVertical,
  Grid,
  Layers,
  Lock,
  RefreshCcw,
  RotateCw,
  Shield,
  Trash2,
  Unlock,
  Wrench,
  X,
} from 'lucide-react';
import type {
  AmsSlot,
  BuildPlate,
  PlateObject,
  SlicerProcessSettings,
} from '../types/slicer';
import { getScaledDimensions } from '../utils/slicerEngine';

interface PlateObjectContextMenuProps {
  object: PlateObject;
  clientX: number;
  clientY: number;
  amsSlots: AmsSlot[];
  plates: BuildPlate[];
  activePlateId: number;
  settings: SlicerProcessSettings;
  onClose: () => void;
  onCopyObject: (objId: string) => void;
  onCloneMulti: (objId: string, count: number) => void;
  onFillPlateWithCopies: (objId: string) => void;
  onMirrorObject: (objId: string, axis: 'x' | 'y' | 'z') => void;
  onCenterObject: (objId: string) => void;
  onLayFlatObject: (objId: string) => void;
  onResetTransform: (objId: string) => void;
  onRotateZDelta: (objId: string, deltaDeg: number) => void;
  onScalePreset: (objId: string, scaleFactor: number) => void;
  onAssignAmsSlot: (objId: string, slotId: number) => void;
  onUpdateObjectPatch: (objId: string, patch: Partial<PlateObject>) => void;
  onMoveToPlate: (objId: string, targetPlateId: number) => void;
  onMoveToNewPlate?: (objId: string) => void;
  onOpenMeshRepair: (objId: string) => void;
  onExportObjectStl: (objId: string) => void;
  onDeleteObject: (objId: string) => void;
}

export const PlateObjectContextMenu: React.FC<PlateObjectContextMenuProps> = ({
  object,
  clientX,
  clientY,
  amsSlots,
  plates,
  activePlateId,
  settings,
  onClose,
  onCopyObject,
  onCloneMulti,
  onFillPlateWithCopies,
  onMirrorObject,
  onCenterObject,
  onLayFlatObject,
  onResetTransform,
  onRotateZDelta,
  onScalePreset,
  onAssignAmsSlot,
  onUpdateObjectPatch,
  onMoveToPlate,
  onMoveToNewPlate,
  onOpenMeshRepair,
  onExportObjectStl,
  onDeleteObject,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const handlePointerDownOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handlePointerDownOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handlePointerDownOutside);
    };
  }, [onClose]);

  const dims = getScaledDimensions(object);
  const mirror = object.mirror || { x: false, y: false, z: false };
  const activeSlot = amsSlots.find((s) => s.id === object.amsSlotId) || amsSlots[0];
  const currentScalePct = Math.round(Math.abs(object.scale.x) * 100);

  // Clamp position so menu stays cleanly inside viewport
  const menuWidth = 324;
  const menuMaxHeight = 520;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
  const clampedLeft = Math.max(12, Math.min(clientX, vw - menuWidth - 16));
  const clampedTop = Math.max(12, Math.min(clientY, vh - menuMaxHeight - 16));

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Model Context Menu for ${object.name}`}
      data-testid="plate-object-context-menu"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        left: `${clampedLeft}px`,
        top: `${clampedTop}px`,
        width: `${menuWidth}px`,
        maxHeight: `${menuMaxHeight}px`,
      }}
      className="fixed z-50 bg-[#0f172a]/98 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl text-slate-100 flex flex-col overflow-hidden"
    >
      {/* Header: Model Identity & Dimensions */}
      <div className="px-3.5 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-start justify-between gap-2 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-xs shrink-0 border border-white/25"
              style={{ backgroundColor: activeSlot?.colorHex || '#10b981' }}
            />
            <span className="text-xs font-bold text-slate-100 truncate">
              {object.name}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums flex flex-wrap items-center gap-1.5">
            <span>
              {dims.x}×{dims.y}×{dims.z} mm
            </span>
            <span>·</span>
            <span>{object.triangles.toLocaleString()} tris</span>
            {(mirror.x || mirror.y || mirror.z) && (
              <span className="text-emerald-400 font-semibold">
                · Mirrored {[mirror.x && 'X', mirror.y && 'Y', mirror.z && 'Z'].filter(Boolean).join('/')}
              </span>
            )}
            {object.locked && (
              <span className="text-amber-400 font-semibold">· Locked</span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close context menu"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-100 rounded transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable Menu Body */}
      <div className="overflow-y-auto divide-y divide-slate-800/90 p-2 space-y-2 text-xs">
        {/* Section 1: Core Actions (Copy, Center, Lay Flat, Reset, Delete) */}
        <div className="grid grid-cols-2 gap-1.5 pb-2">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCopyObject(object.id);
              onClose();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-100 font-medium flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              Copy / Clone
            </span>
            <span className="text-[10px] font-mono text-slate-400">Ctrl+D</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDeleteObject(object.id);
              onClose();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-200 font-medium flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              Delete Object
            </span>
            <span className="text-[10px] font-mono text-rose-300/80">Del</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCenterObject(object.id);
              onClose();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            Center on Plate
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onLayFlatObject(object.id);
              onClose();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
            Lay Flat (Z=0)
          </button>
        </div>

        {/* Section 2: Mirror Object (X, Y, Z Axes) */}
        <div className="pt-2 pb-2 space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <FlipHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              Mirror Object Along Axis
            </span>
            {(mirror.x || mirror.y || mirror.z) && (
              <button
                type="button"
                onClick={() =>
                  onUpdateObjectPatch(object.id, {
                    mirror: { x: false, y: false, z: false },
                  })
                }
                className="text-[10px] font-mono text-slate-400 hover:text-emerald-400"
              >
                Clear Mirror
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { axis: 'x', label: 'Mirror X', desc: 'Left ↔ Right' },
                { axis: 'y', label: 'Mirror Y', desc: 'Front ↔ Back' },
                { axis: 'z', label: 'Mirror Z', desc: 'Top ↔ Bottom' },
              ] as const
            ).map((item) => {
              const isMirrored = mirror[item.axis];
              return (
                <button
                  key={item.axis}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isMirrored}
                  onClick={() => onMirrorObject(object.id, item.axis)}
                  className={`px-2 py-1.5 rounded-lg border text-center transition-colors ${
                    isMirrored
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="text-xs flex items-center justify-center gap-1">
                    {item.axis === 'z' ? (
                      <FlipVertical className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <FlipHorizontal className="w-3 h-3 text-emerald-400" />
                    )}
                    <span>{item.label}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {isMirrored ? 'Active ✓' : item.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Multi-Clone & Build Plate Array */}
        <div className="pt-2 pb-2 space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-300 px-1 flex items-center gap-1.5">
            <Grid className="w-3.5 h-3.5 text-emerald-400" />
            Multiply & Array on Build Plate
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onCloneMulti(object.id, 2);
                onClose();
              }}
              className="py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px] transition-colors"
            >
              Clone +2 Copies
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onCloneMulti(object.id, 4);
                onClose();
              }}
              className="py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px] transition-colors"
            >
              Clone +4 Copies
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onFillPlateWithCopies(object.id);
                onClose();
              }}
              className="py-1.5 px-2 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-600/50 text-emerald-300 font-semibold text-[11px] transition-colors"
            >
              Fill Build Plate
            </button>
          </div>
        </div>

        {/* Section 4: Quick Rotate Z & Uniform Scale Presets */}
        <div className="pt-2 pb-2 space-y-2">
          <div>
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                Quick Rotate Z-Axis
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                {object.rotation.z}°
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[-90, 45, 90, 180].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  role="menuitem"
                  onClick={() => onRotateZDelta(object.id, deg)}
                  className="py-1 rounded bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px] transition-colors"
                >
                  {deg > 0 ? `+${deg}°` : `${deg}°`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-300">
                Uniform Scale Preset
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                {currentScalePct}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[50, 100, 150, 200].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  role="menuitem"
                  onClick={() => onScalePreset(object.id, pct / 100)}
                  className={`py-1 rounded border font-mono text-[11px] transition-colors ${
                    currentScalePct === pct
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                      : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 5: AMS Filament Slot Assignment (A1 - A4) */}
        <div className="pt-2 pb-2 space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-300 px-1">
            Assign AMS Filament Slot
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {amsSlots.map((slot) => {
              const isSelected = object.amsSlotId === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  onClick={() => onAssignAmsSlot(object.id, slot.id)}
                  className={`p-1.5 rounded-lg border flex flex-col items-center gap-0.5 transition-colors ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 text-slate-100 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="w-2.5 h-2.5 rounded-xs border border-white/20"
                      style={{ backgroundColor: slot.colorHex }}
                    />
                    <span className="text-[11px] font-mono">A{slot.id}</span>
                  </div>
                  <span className="text-[10px] truncate max-w-full">
                    {slot.material}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 6: Per-Object Slicer Overrides (Infill, Support, Brim) */}
        <div className="pt-2 pb-2 space-y-2">
          <div className="text-[11px] font-semibold text-slate-300 px-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Per-Object Slicer Overrides
          </div>

          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] text-slate-400">Object Infill %:</span>
            <div className="flex items-center gap-1">
              {[undefined, 0, 15, 25, 50, 100].map((val, idx) => {
                const isSelected = object.infillDensityOverride === val;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      onUpdateObjectPatch(object.id, {
                        infillDensityOverride: val,
                      })
                    }
                    className={`px-1.5 py-0.5 rounded border text-[10px] font-mono transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {val === undefined ? `Def(${settings.infillDensity}%)` : `${val}%`}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={Boolean(object.supportPainting ?? settings.supportEnabled)}
              onClick={() =>
                onUpdateObjectPatch(object.id, {
                  supportPainting: !(object.supportPainting ?? settings.supportEnabled),
                })
              }
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center justify-between transition-colors ${
                (object.supportPainting ?? settings.supportEnabled)
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <span>Object Supports</span>
              <span className="font-mono">
                {(object.supportPainting ?? settings.supportEnabled) ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={Boolean(object.locked)}
              onClick={() =>
                onUpdateObjectPatch(object.id, {
                  locked: !object.locked,
                })
              }
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center justify-between transition-colors ${
                object.locked
                  ? 'bg-amber-500/15 border-amber-500/60 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-1">
                {object.locked ? (
                  <Lock className="w-3 h-3 text-amber-400" />
                ) : (
                  <Unlock className="w-3 h-3" />
                )}
                Lock Position
              </span>
              <span className="font-mono">{object.locked ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Section 7: Build Plate Assignment, Mesh Repair & STL Export */}
        <div className="pt-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-emerald-400" />
              Build Plate:
            </span>
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Move Object to Build Plate"
                value={object.plateId ?? activePlateId}
                onChange={(e) => {
                  onMoveToPlate(object.id, Number(e.target.value));
                  onClose();
                }}
                className="px-2 py-1 text-[11px] bg-slate-950 border border-slate-800 rounded text-slate-200"
              >
                {plates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {plates.length < 9 && onMoveToNewPlate && (
                <button
                  type="button"
                  onClick={() => {
                    onMoveToNewPlate(object.id);
                    onClose();
                  }}
                  className="px-2 py-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/80 border border-emerald-700/50 rounded transition-colors whitespace-nowrap"
                >
                  + New Plate
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onResetTransform(object.id);
                onClose();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCcw className="w-3.5 h-3.5 text-slate-400" />
              Reset Transform
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onUpdateObjectPatch(object.id, { visible: !object.visible });
                onClose();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              {object.visible ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  Hide Printable
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  Show Printable
                </>
              )}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onOpenMeshRepair(object.id);
                onClose();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-emerald-300 flex items-center gap-1.5 transition-colors"
            >
              <Wrench className="w-3.5 h-3.5 text-emerald-400" />
              Mesh Repair
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onExportObjectStl(object.id);
                onClose();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Export .STL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
