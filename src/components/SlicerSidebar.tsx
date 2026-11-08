import React, { useRef, useState } from 'react';
import {
  Box,
  Copy,
  Eye,
  EyeOff,
  FileUp,
  Layers,
  Plus,
  Shield,
  Sliders,
  Trash2,
  Wrench,
  Zap,
} from 'lucide-react';
import type {
  AmsSlot,
  BambuPrinterModelId,
  BuildPlate,
  FilamentProfile,
  InfillPattern,
  PlateObject,
  PresetShapeType,
  SlicerProcessSettings,
  SupportType,
} from '../types/slicer';
import { PRESET_MODELS_CATALOG } from '../utils/proceduralModels';
import {
  BAMBU_PRINTER_MODELS_CATALOG,
  getBambuPrinterModelSpec,
  getScaledDimensions,
  validatePlateBounds,
} from '../utils/slicerEngine';

interface SlicerSidebarProps {
  plates: BuildPlate[];
  activePlateId: number;
  onSelectPlate: (id: number) => void;
  onAddPlate: () => void;
  onDeletePlate: (id: number) => void;
  onDuplicatePlate: (id: number) => void;
  onRenamePlate: (id: number, newName: string) => void;
  onMoveObjectToPlate: (objId: string, targetPlateId: number) => void;
  onLoadMultiPlateSample: () => void;
  onSliceAllPlates?: () => void;
  amsSlots: AmsSlot[];
  onUpdateAmsSlot: (slotId: number, patch: Partial<AmsSlot>) => void;
  profiles: FilamentProfile[];
  onApplyProfileToSlot: (profile: FilamentProfile, slotId: number) => void;
  onOpenProfilesTab: () => void;
  settings: SlicerProcessSettings;
  onUpdateSettings: (patch: Partial<SlicerProcessSettings>) => void;
  onSelectPrinterModel?: (model: BambuPrinterModelId) => void;
  objects: PlateObject[];
  selectedObjectId: string | null;
  onSelectObject: (id: string) => void;
  onAssignObjectAmsSlot: (objId: string, slotId: number) => void;
  onToggleObjectVisible: (objId: string) => void;
  onCloneObject: (objId: string) => void;
  onDeleteObject: (objId: string) => void;
  onAddPresetModel: (presetType: PresetShapeType) => void;
  onUploadFiles: (files: FileList) => void;
  uploadError: string | null;
  autoRepairOnImport: boolean;
  onToggleAutoRepairOnImport: (enabled: boolean) => void;
  onOpenMeshRepairModal: (objId?: string) => void;
  onLoadDamagedSampleStl: (skipAutoRepair?: boolean) => void;
}

export const SlicerSidebar: React.FC<SlicerSidebarProps> = ({
  plates,
  activePlateId,
  onSelectPlate,
  onAddPlate,
  onDeletePlate,
  onDuplicatePlate,
  onRenamePlate,
  onMoveObjectToPlate,
  onLoadMultiPlateSample,
  onSliceAllPlates,
  amsSlots,
  onUpdateAmsSlot,
  profiles,
  onApplyProfileToSlot,
  onOpenProfilesTab,
  settings,
  onUpdateSettings,
  onSelectPrinterModel,
  objects,
  selectedObjectId,
  onSelectObject,
  onAssignObjectAmsSlot,
  onToggleObjectVisible,
  onCloneObject,
  onDeleteObject,
  onAddPresetModel,
  onUploadFiles,
  uploadError,
  autoRepairOnImport,
  onToggleAutoRepairOnImport,
  onOpenMeshRepairModal,
  onLoadDamagedSampleStl,
}) => {
  const [processSubTab, setProcessSubTab] = useState<
    'quality' | 'strength' | 'speed' | 'support' | 'objects'
  >('quality');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedObj = objects.find((o) => o.id === selectedObjectId) || null;
  const printerSpec = getBambuPrinterModelSpec(settings.printerModel);

  return (
    <aside
      aria-label="Slicer Preparation Sidebar"
      className="w-[340px] shrink-0 h-full bg-[#0f172a] border-r border-slate-800 flex flex-col overflow-hidden"
    >
      {/* Hidden File Input for real .stl and .3mf files */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.3mf"
        multiple
        aria-label="Import 3MF or STL file"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Scrollable Inner Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
        {/* Section 0: Multi-Plate Management (1 to 9 plates, default 1) */}
        <div className="p-4 space-y-2.5 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                Build Plates ({plates.length}/9)
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                Active: Plate {activePlateId}
              </span>
            </div>
            {plates.length < 9 && (
              <button
                type="button"
                onClick={onAddPlate}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                title="Add new build plate (up to 9)"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Plate
              </button>
            )}
          </div>

          {/* Plate Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {plates.map((plate) => {
              const isActive = plate.id === activePlateId;
              const count = objects.filter((o) => (o.plateId ?? 1) === plate.id).length;
              return (
                <button
                  key={plate.id}
                  type="button"
                  onClick={() => onSelectPlate(plate.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-300 hover:bg-slate-900 border border-slate-800'
                  }`}
                  title={`${plate.name} (${count} objects)`}
                >
                  <span>P{plate.id}</span>
                  <span
                    className={`text-[10px] px-1 rounded ${
                      isActive ? 'bg-emerald-600/70 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Plate Config & Action Bar */}
          {(() => {
            const currentPlate = plates.find((p) => p.id === activePlateId) || plates[0];
            return (
              <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs gap-2">
                <input
                  type="text"
                  value={currentPlate?.name || `Plate ${activePlateId}`}
                  onChange={(e) => onRenamePlate(activePlateId, e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-200 border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5 flex-1 min-w-0"
                  title="Rename active plate"
                />
                <div className="flex items-center gap-1 shrink-0">
                  {plates.length < 9 && (
                    <button
                      type="button"
                      onClick={() => onDuplicatePlate(activePlateId)}
                      title="Duplicate active plate"
                      className="p-1 text-slate-400 hover:text-slate-100 rounded"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {plates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeletePlate(activePlateId)}
                      title="Delete active plate"
                      className="p-1 text-slate-400 hover:text-rose-400 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Slice All Plates CTA when more than 1 plate exists */}
          {plates.length > 1 && onSliceAllPlates && (
            <button
              type="button"
              onClick={onSliceAllPlates}
              className="w-full py-2 px-3 text-xs font-semibold text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-600/60 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Slice All Plates ({plates.length} Plates)
            </button>
          )}
        </div>

        {/* Section 1: Printer & Build Plate Preset */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              Printer & Plate Configuration
            </span>
            <span
              data-testid="sidebar-build-volume-badge"
              className="text-[11px] font-mono text-emerald-400"
            >
              {printerSpec.buildVolume.x}×{printerSpec.buildVolume.y}×{printerSpec.buildVolume.z} mm
            </span>
          </div>

          <div>
            <label
              htmlFor="printer-model-select"
              className="block text-[11px] text-slate-400 mb-1"
            >
              Bambu Lab Printer Model
            </label>
            <select
              id="printer-model-select"
              aria-label="Bambu Lab Printer Model"
              value={printerSpec.id}
              onChange={(e) => {
                const chosen = e.target.value as BambuPrinterModelId;
                if (onSelectPrinterModel) {
                  onSelectPrinterModel(chosen);
                } else {
                  onUpdateSettings({ printerModel: chosen });
                }
              }}
              className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              {BAMBU_PRINTER_MODELS_CATALOG.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} ({m.buildVolume.x}×{m.buildVolume.y}×{m.buildVolume.z}mm · {m.series})
                </option>
              ))}
            </select>
            <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800/80 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-1">
              <span className="text-slate-300">{printerSpec.kinematics}</span>
              <span>
                Max {printerSpec.maxNozzleTempC}°C / Bed {printerSpec.maxBedTempC}°C
              </span>
              <span className="text-emerald-400">
                {printerSpec.hasMicroLidar ? 'Micro-LiDAR' : printerSpec.amsSupportLabel.split(' ')[0]}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="nozzle-select"
                className="block text-[11px] text-slate-400 mb-1"
              >
                {printerSpec.id.replace('Bambu Lab ', '')} Nozzle
              </label>
              <select
                id="nozzle-select"
                value={settings.nozzleDiameter}
                onChange={(e) =>
                  onUpdateSettings({
                    nozzleDiameter: Number(e.target.value) as 0.2 | 0.4 | 0.6 | 0.8,
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value={0.2}>0.2mm Stainless</option>
                <option value={0.4}>0.4mm {printerSpec.defaultNozzleMaterial.split(' ')[0]}</option>
                <option value={0.6}>0.6mm Hardened</option>
                <option value={0.8}>0.8mm Hardened</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="plate-select"
                className="block text-[11px] text-slate-400 mb-1"
              >
                Build Plate Surface
              </label>
              <select
                id="plate-select"
                value={settings.plateType}
                onChange={(e) =>
                  onUpdateSettings({
                    plateType: e.target.value as SlicerProcessSettings['plateType'],
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="Textured PEI Plate">Textured PEI Plate</option>
                <option value="Cool Plate">Bambu Cool Plate</option>
                <option value="Engineering Plate">Engineering Plate</option>
                <option value="High Temp Plate">High Temp Smooth PEI</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: AMS 4-Slot Filament System & Material Profile Selector */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              AMS Filaments & Profiles
            </span>
            <button
              type="button"
              onClick={onOpenProfilesTab}
              className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Manage Profiles →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {amsSlots.map((slot) => {
              const isAssignedToSelected = selectedObj?.amsSlotId === slot.id;
              return (
                <div
                  key={slot.id}
                  className={`p-2.5 rounded-lg border transition-colors ${
                    isAssignedToSelected
                      ? 'bg-emerald-950/30 border-emerald-500/80'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedObj) {
                          onAssignObjectAmsSlot(selectedObj.id, slot.id);
                        }
                      }}
                      className="flex items-center gap-2 text-left flex-1 min-w-0"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-white/20 shrink-0"
                        style={{ backgroundColor: slot.colorHex }}
                      />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-100 truncate">
                          A{slot.id} · {slot.material}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {slot.nozzleTemp ?? Math.round((slot.nozzleTempMin + slot.nozzleTempMax) / 2)}°C · Bed {slot.bedTemp}°C
                        </div>
                      </div>
                    </button>

                    <input
                      type="color"
                      aria-label={`Change AMS Slot A${slot.id} filament color`}
                      value={slot.colorHex}
                      onChange={(e) =>
                        onUpdateAmsSlot(slot.id, { colorHex: e.target.value })
                      }
                      className="w-5 h-5 rounded bg-transparent border-0 cursor-pointer shrink-0"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Material Profile Selector for Active AMS Slot */}
          {selectedObj && (
            <div className="pt-1">
              <label
                htmlFor="quick-profile-select"
                className="block text-[11px] text-slate-400 mb-1"
              >
                Material Profile for Slot A{selectedObj.amsSlotId}
              </label>
              <select
                id="quick-profile-select"
                value={
                  amsSlots.find((s) => s.id === selectedObj.amsSlotId)?.profileId ||
                  profiles[0]?.id
                }
                onChange={(e) => {
                  const chosen = profiles.find((p) => p.id === e.target.value);
                  if (chosen) {
                    onApplyProfileToSlot(chosen, selectedObj.amsSlotId);
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {profiles.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name} ({prof.nozzleTemp}°C / {prof.bedTemp}°C / {prof.retractionDistanceMm}mm)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Section 3: Import 3MF / STL Models, Auto-Repair & Preset Library */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              3MF / STL Plate Geometry
            </span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {objects.length} {objects.length === 1 ? 'Model' : 'Models'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 text-xs font-medium text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <FileUp className="w-3.5 h-3.5 text-emerald-400" />
              Import 3MF / STL
            </button>

            <button
              type="button"
              onClick={() => setShowPresetMenu((prev) => !prev)}
              className="px-3 py-2 text-xs font-medium text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              Add Preset Part
            </button>
          </div>

          {/* Mesh Error Detection & Repair Controls */}
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRepairOnImport}
                  onChange={(e) => onToggleAutoRepairOnImport(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span className="font-medium">Auto-Repair Mesh on Upload</span>
              </label>

              <button
                type="button"
                onClick={() => onOpenMeshRepairModal(selectedObj?.id)}
                className="px-2 py-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-700/50 rounded transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                <Wrench className="w-3 h-3" />
                Mesh Repair Studio
              </button>
            </div>

            {selectedObj?.meshReport && (
              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                <span className="text-slate-400 truncate">
                  {selectedObj.name}:
                </span>
                {selectedObj.meshReport.status === 'needs_repair' ? (
                  <button
                    type="button"
                    onClick={() => onOpenMeshRepairModal(selectedObj.id)}
                    className="text-amber-400 hover:text-amber-300 font-semibold whitespace-nowrap"
                  >
                    Needs Repair (
                    {selectedObj.meshReport.nonManifoldEdges +
                      selectedObj.meshReport.openBoundaryEdges +
                      selectedObj.meshReport.invertedNormals +
                      selectedObj.meshReport.degenerateTriangles +
                      selectedObj.meshReport.duplicateTriangles}{' '}
                    issues) →
                  </button>
                ) : selectedObj.meshReport.status === 'repaired' ? (
                  <span className="text-emerald-400 font-semibold whitespace-nowrap">
                    ✓ Repaired Manifold ({selectedObj.meshReport.healthScore}%)
                  </span>
                ) : (
                  <span className="text-slate-300 whitespace-nowrap">
                    ✓ Watertight Manifold (100%)
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[11px] text-slate-400">
                Test STL mesh repair:
              </span>
              <button
                type="button"
                onClick={() => onLoadDamagedSampleStl(false)}
                className="text-[11px] font-medium text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                Import Damaged STL Sample
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400">
                Test Multi-Plate project:
              </span>
              <button
                type="button"
                onClick={onLoadMultiPlateSample}
                className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
              >
                Load 3-Plate Sample 3MF
              </button>
            </div>
          </div>

          {uploadError && (
            <div
              role="alert"
              className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-200"
            >
              {uploadError}
            </div>
          )}

          {showPresetMenu && (
            <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
              <div className="text-[11px] font-medium text-slate-400 px-2 py-1">
                Bambu Studio Calibration & Functional Library:
              </div>
              {PRESET_MODELS_CATALOG.map((item) => (
                <button
                  key={item.presetType}
                  type="button"
                  onClick={() => {
                    onAddPresetModel(item.presetType);
                    setShowPresetMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-900 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <div className="text-xs font-medium text-slate-200 truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {item.baseDims.x}×{item.baseDims.y}×{item.baseDims.z}mm · {item.sourceFormat}
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium shrink-0">
                    + Add
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Process Parameters & Objects Tabs */}
        <div className="p-4 space-y-4">
          {/* Interactive Segmented Tab Bar */}
          <div className="grid grid-cols-5 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            {(
              [
                { id: 'quality', label: 'Quality' },
                { id: 'strength', label: 'Strength' },
                { id: 'speed', label: 'Speed' },
                { id: 'support', label: 'Support' },
                { id: 'objects', label: 'Objects' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setProcessSubTab(tab.id)}
                className={`py-1.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                  processSubTab === tab.id
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-Tab 1: Quality */}
          {processSubTab === 'quality' && (
            <div className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label htmlFor="layer-height-select" className="text-slate-300 font-medium">
                    Layer Height Profile
                  </label>
                  <span className="font-mono text-emerald-400 tabular-nums">
                    {settings.layerHeight.toFixed(2)} mm
                  </span>
                </div>
                <select
                  id="layer-height-select"
                  value={settings.layerHeight}
                  onChange={(e) =>
                    onUpdateSettings({ layerHeight: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value={0.08}>0.08mm Extra Fine @BBL X1C</option>
                  <option value={0.12}>0.12mm Fine @BBL X1C</option>
                  <option value={0.16}>0.16mm Optimal @BBL X1C</option>
                  <option value={0.2}>0.20mm Standard @BBL X1C</option>
                  <option value={0.24}>0.24mm Draft @BBL X1C</option>
                  <option value={0.28}>0.28mm Extra Draft @BBL X1C</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="init-layer-input" className="text-slate-300">
                    Initial Layer Height
                  </label>
                  <span className="font-mono text-slate-300 tabular-nums">
                    {settings.initialLayerHeight.toFixed(2)} mm
                  </span>
                </div>
                <input
                  id="init-layer-input"
                  type="range"
                  min={0.12}
                  max={0.32}
                  step={0.04}
                  value={settings.initialLayerHeight}
                  onChange={(e) =>
                    onUpdateSettings({
                      initialLayerHeight: Number(e.target.value),
                    })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-xs font-medium text-slate-200">
                    AMS Multi-Color Prime Tower
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Purge nozzle pressure when switching AMS slots
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      primeTowerEnabled: !settings.primeTowerEnabled,
                    })
                  }
                  className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
                    settings.primeTowerEnabled
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {settings.primeTowerEnabled ? 'Enabled' : 'Off'}
                </button>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Strength */}
          {processSubTab === 'strength' && (
            <div className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="wall-loops-range" className="text-slate-300 font-medium">
                    Wall Loops (Perimeters)
                  </label>
                  <span className="font-mono text-emerald-400 tabular-nums">
                    {settings.wallLoops} loops
                  </span>
                </div>
                <input
                  id="wall-loops-range"
                  type="range"
                  min={1}
                  max={8}
                  step={1}
                  value={settings.wallLoops}
                  onChange={(e) =>
                    onUpdateSettings({ wallLoops: Number(e.target.value) })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="infill-density-range" className="text-slate-300 font-medium">
                    Sparse Infill Density
                  </label>
                  <span className="font-mono text-emerald-400 tabular-nums">
                    {settings.infillDensity}%
                  </span>
                </div>
                <input
                  id="infill-density-range"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={settings.infillDensity}
                  onChange={(e) =>
                    onUpdateSettings({ infillDensity: Number(e.target.value) })
                  }
                  className="w-full accent-emerald-500"
                />
                <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                  {[10, 15, 25, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => onUpdateSettings({ infillDensity: pct })}
                      className={`py-1 text-[11px] font-mono rounded border transition-colors ${
                        settings.infillDensity === pct
                          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="infill-pattern-select"
                  className="block text-xs text-slate-300 font-medium mb-1.5"
                >
                  Sparse Infill Pattern
                </label>
                <select
                  id="infill-pattern-select"
                  value={settings.infillPattern}
                  onChange={(e) =>
                    onUpdateSettings({
                      infillPattern: e.target.value as InfillPattern,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="gyroid">Gyroid (Isotropic High Strength)</option>
                  <option value="grid">Grid (Fast CoreXY)</option>
                  <option value="cubic">Cubic</option>
                  <option value="adaptive_cubic">Adaptive Cubic</option>
                  <option value="honeycomb">3D Honeycomb</option>
                  <option value="lightning">Lightning (Top Support Only)</option>
                </select>
              </div>
            </div>
          )}

          {/* Sub-Tab 3: Speed */}
          {processSubTab === 'speed' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="outer-wall-speed" className="text-slate-300">
                    Outer Wall Speed
                  </label>
                  <span className="font-mono text-emerald-400 tabular-nums">
                    {settings.outerWallSpeed} mm/s
                  </span>
                </div>
                <input
                  id="outer-wall-speed"
                  type="range"
                  min={60}
                  max={350}
                  step={10}
                  value={settings.outerWallSpeed}
                  onChange={(e) =>
                    onUpdateSettings({ outerWallSpeed: Number(e.target.value) })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="inner-wall-speed" className="text-slate-300">
                    Inner Wall Speed
                  </label>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {settings.innerWallSpeed} mm/s
                  </span>
                </div>
                <input
                  id="inner-wall-speed"
                  type="range"
                  min={100}
                  max={450}
                  step={10}
                  value={settings.innerWallSpeed}
                  onChange={(e) =>
                    onUpdateSettings({ innerWallSpeed: Number(e.target.value) })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="infill-speed" className="text-slate-300">
                    Sparse Infill Speed
                  </label>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {settings.sparseInfillSpeed} mm/s
                  </span>
                </div>
                <input
                  id="infill-speed"
                  type="range"
                  min={100}
                  max={500}
                  step={10}
                  value={settings.sparseInfillSpeed}
                  onChange={(e) =>
                    onUpdateSettings({
                      sparseInfillSpeed: Number(e.target.value),
                    })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="retraction-distance-sidebar" className="text-slate-300">
                    Retraction Distance
                  </label>
                  <span className="font-mono text-emerald-400 tabular-nums">
                    {(settings.retractionDistanceMm ?? 0.8).toFixed(1)} mm
                  </span>
                </div>
                <input
                  id="retraction-distance-sidebar"
                  type="range"
                  min={0}
                  max={3.0}
                  step={0.1}
                  value={settings.retractionDistanceMm ?? 0.8}
                  onChange={(e) =>
                    onUpdateSettings({
                      retractionDistanceMm: Number(e.target.value),
                    })
                  }
                  className="w-full accent-emerald-500"
                />
              </div>

              <div className="text-[11px] font-mono text-slate-400 pt-1">
                Travel: {settings.travelSpeed} mm/s · Accel: {settings.maxAcceleration} mm/s²
              </div>
            </div>
          )}

          {/* Sub-Tab 4: Support & Brim */}
          {processSubTab === 'support' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-200">
                    Enable Overhang Support
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Generate breakaway structures for steep overhangs
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      supportEnabled: !settings.supportEnabled,
                    })
                  }
                  className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
                    settings.supportEnabled
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {settings.supportEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {settings.supportEnabled && (
                <div>
                  <label
                    htmlFor="support-type-select"
                    className="block text-xs text-slate-300 mb-1"
                  >
                    Support Structure Style
                  </label>
                  <select
                    id="support-type-select"
                    value={settings.supportType}
                    onChange={(e) =>
                      onUpdateSettings({
                        supportType: e.target.value as SupportType,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    <option value="tree_auto">Tree (Auto Organic)</option>
                    <option value="normal_auto">Normal Grid (Auto)</option>
                    <option value="tree_organic">Tree Slim (Low Filament)</option>
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="brim-type-select"
                  className="block text-xs text-slate-300 mb-1"
                >
                  Bed Adhesion Brim Type
                </label>
                <select
                  id="brim-type-select"
                  value={settings.brimType}
                  onChange={(e) =>
                    onUpdateSettings({
                      brimType: e.target.value as SlicerProcessSettings['brimType'],
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="auto">Auto Brim (Bambu Smart Analysis)</option>
                  <option value="outer_only">Outer Brim Only (5mm)</option>
                  <option value="inner_and_outer">Inner & Outer Brim</option>
                  <option value="none">No Brim</option>
                </select>
              </div>
            </div>
          )}

          {/* Sub-Tab 5: Objects List */}
          {processSubTab === 'objects' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 text-[11px] text-slate-400">
                <span>Total Objects: {objects.length}</span>
                <span className="font-mono text-emerald-400">
                  On Plate {activePlateId}: {objects.filter((o) => (o.plateId ?? 1) === activePlateId).length}
                </span>
              </div>

              {objects.map((obj) => {
                const isSel = obj.id === selectedObjectId;
                const slot = amsSlots.find((s) => s.id === obj.amsSlotId) || amsSlots[0];
                const dims = getScaledDimensions(obj);
                const bounds = validatePlateBounds(obj, printerSpec.buildVolume);
                const objPlateId = obj.plateId ?? 1;

                return (
                  <div
                    key={obj.id}
                    className={`p-2.5 rounded-lg border transition-colors ${
                      isSel
                        ? 'bg-slate-900 border-emerald-500/80'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectObject(obj.id)}
                        className="flex items-center gap-2 text-left flex-1 min-w-0"
                      >
                        <span
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: slot?.colorHex || '#10b981' }}
                        />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-100 truncate">
                            {obj.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                            {dims.x}×{dims.y}×{dims.z}mm · A{obj.amsSlotId}
                            {!bounds.valid && (
                              <span className="text-rose-400 ml-1">· Out of Bounds</span>
                            )}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label={`Inspect or repair mesh for ${obj.name}`}
                          onClick={() => onOpenMeshRepairModal(obj.id)}
                          className="p-1 text-slate-400 hover:text-emerald-400 rounded"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Clone ${obj.name}`}
                          onClick={() => onCloneObject(obj.id)}
                          className="p-1 text-slate-400 hover:text-slate-100 rounded"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Toggle visibility for ${obj.name}`}
                          onClick={() => onToggleObjectVisible(obj.id)}
                          className="p-1 text-slate-400 hover:text-slate-100 rounded"
                        >
                          {obj.visible ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${obj.name}`}
                          onClick={() => onDeleteObject(obj.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Plate Assignment & Move to Plate Dropdown */}
                    <div className="flex items-center justify-between text-[11px] pt-2 mt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span>Plate:</span>
                        <select
                          aria-label={`Target build plate for ${obj.name}`}
                          value={objPlateId}
                          onChange={(e) => onMoveObjectToPlate(obj.id, Number(e.target.value))}
                          className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-200 text-[11px]"
                        >
                          {plates.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="text-slate-500 font-mono text-[10px]">
                        {objPlateId === activePlateId ? '(On Active Plate)' : `(Plate ${objPlateId})`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
