import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Flame,
  Gauge,
  Layers,
  Plus,
  RotateCcw,
  Save,
  Sliders,
  Thermometer,
  Trash2,
} from 'lucide-react';
import type {
  AmsSlot,
  FilamentMaterialFamily,
  FilamentProfile,
} from '../types/slicer';
import { validateFilamentProfileInput } from '../utils/slicerEngine';

interface MaterialProfilesViewProps {
  profiles: FilamentProfile[];
  selectedProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onSaveProfile: (profile: FilamentProfile) => void;
  onDeleteProfile: (profileId: string) => void;
  amsSlots: AmsSlot[];
  onApplyProfileToSlot: (profile: FilamentProfile, slotId: number) => void;
}

const MATERIAL_FAMILIES: FilamentMaterialFamily[] = [
  'PLA Basic',
  'PLA-CF',
  'PETG-CF',
  'ABS',
  'ASA',
  'PAHT-CF',
  'TPU 95A',
  'PVA Support',
];

export const MaterialProfilesView: React.FC<MaterialProfilesViewProps> = ({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onSaveProfile,
  onDeleteProfile,
  amsSlots,
  onApplyProfileToSlot,
}) => {
  const activeProfile =
    profiles.find((p) => p.id === selectedProfileId) || profiles[0];

  const [filterFamily, setFilterFamily] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editable form state synced with activeProfile
  const [draft, setDraft] = useState<FilamentProfile>(activeProfile);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  useEffect(() => {
    if (activeProfile) {
      setDraft({ ...activeProfile });
      setValidationErrors([]);
    }
  }, [activeProfile]);

  const filteredProfiles = profiles.filter((p) => {
    const matchesFamily =
      filterFamily === 'ALL' || p.material === filterFamily;
    const matchesQuery =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.material.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.vendor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFamily && matchesQuery;
  });

  const handleStartNewProfile = () => {
    const newId = `prof-custom-${Date.now()}`;
    const newProfile: FilamentProfile = {
      ...draft,
      id: newId,
      name: `${draft.material} Custom Profile @X1C`,
      vendor: 'Custom User Preset',
      isCustom: true,
    };
    setDraft(newProfile);
    setValidationErrors([]);
    setSaveBanner(null);
  };

  const handleSubmitSave = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateFilamentProfileInput({
      name: draft.name,
      nozzleTemp: draft.nozzleTemp,
      bedTemp: draft.bedTemp,
      printSpeedMmS: draft.printSpeedMmS,
      retractionDistanceMm: draft.retractionDistanceMm,
    });

    if (!check.valid) {
      setValidationErrors(check.errors);
      setSaveBanner(null);
      return;
    }

    setValidationErrors([]);
    const savedProfile: FilamentProfile = {
      ...draft,
      name: draft.name.trim(),
      nozzleTempMin: Math.max(170, draft.nozzleTemp - 15),
      nozzleTempMax: Math.min(310, draft.nozzleTemp + 15),
    };
    onSaveProfile(savedProfile);
    setSaveBanner(`Saved profile "${savedProfile.name}" to library.`);
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#0b0f17] px-6 py-4">
      <div className="max-w-[1400px] mx-auto space-y-4">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">
              Filament Material Profile Studio
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Create, calibrate, and assign custom Bambu Lab X1 Carbon filament profiles with dedicated nozzle thermal, PEI bed, print speed, and direct-drive retraction parameters.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleStartNewProfile}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              New Custom Profile
            </button>
          </div>
        </div>

        {/* Desktop 12-Column Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 4 Columns: Profile Library & Filter List */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">
                Material Profile Library
              </h2>
              <span className="text-xs font-mono text-emerald-400 tabular-nums">
                {profiles.length} Profiles
              </span>
            </div>

            {/* Search Input */}
            <div>
              <input
                type="search"
                aria-label="Search filament profiles"
                placeholder="Search PLA-CF, PETG, Nylon, Custom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Material Family Filter Buttons */}
            <div className="flex flex-wrap gap-1">
              {(['ALL', 'PLA Basic', 'PLA-CF', 'PETG-CF', 'ASA', 'PAHT-CF', 'TPU 95A'] as const).map(
                (fam) => (
                  <button
                    key={fam}
                    type="button"
                    onClick={() => setFilterFamily(fam)}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                      filterFamily === fam
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {fam === 'ALL' ? 'All Types' : fam}
                  </button>
                )
              )}
            </div>

            {/* Profile List */}
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {filteredProfiles.map((prof) => {
                const isSelected = prof.id === draft.id;
                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => {
                      onSelectProfile(prof.id);
                      setSaveBanner(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-slate-950 border-emerald-500/80'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-sm border border-white/20 shrink-0"
                          style={{ backgroundColor: prof.colorHex }}
                        />
                        <span className="text-xs font-semibold text-slate-100 truncate">
                          {prof.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        {prof.isCustom ? 'Custom' : 'System'}
                      </span>
                    </div>

                    {/* Clean Unboxed Metadata Row */}
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-slate-400 tabular-nums">
                      <span className="text-slate-300">{prof.material}</span>
                      <span>·</span>
                      <span>{prof.nozzleTemp}°C</span>
                      <span>·</span>
                      <span>Bed {prof.bedTemp}°C</span>
                      <span>·</span>
                      <span>{prof.printSpeedMmS}mm/s</span>
                      <span>·</span>
                      <span>{prof.retractionDistanceMm.toFixed(1)}mm</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right 8 Columns: Parameter Editor & AMS Slot Assignment */}
          <div className="lg:col-span-8 space-y-4">
            <form
              onSubmit={handleSubmitSave}
              noValidate
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3.5"
            >
              {/* Form Header & Save Action */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded border border-white/20 shrink-0"
                    style={{ backgroundColor: draft.colorHex }}
                  />
                  <div>
                    <h2 className="text-sm font-bold text-slate-100">
                      {draft.name || 'Untitled Filament Profile'}
                    </h2>
                    <div className="text-xs font-mono text-slate-400">
                      {draft.vendor} · {draft.material} · Direct-Drive CoreXY Preset
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {draft.isCustom &&
                    profiles.some((p) => p.id === draft.id) && (
                      <button
                        type="button"
                        onClick={() => onDeleteProfile(draft.id)}
                        className="px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Profile
                      </button>
                    )}

                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Profile
                  </button>
                </div>
              </div>

              {/* Validation Error / Save Confirmation Alerts */}
              {validationErrors.length > 0 && (
                <div
                  role="alert"
                  className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-200 space-y-1"
                >
                  {validationErrors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              )}

              {saveBanner && (
                <div
                  role="status"
                  className="p-2.5 bg-emerald-950/50 border border-emerald-800 rounded-lg text-xs text-emerald-200 flex items-center justify-between"
                >
                  <span>{saveBanner}</span>
                  <button
                    type="button"
                    onClick={() => setSaveBanner(null)}
                    className="text-emerald-400 hover:text-emerald-200 font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Identity Fields Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label
                    htmlFor="profile-name-input"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Profile Name
                  </label>
                  <input
                    id="profile-name-input"
                    type="text"
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-material-select"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Filament Material Type
                  </label>
                  <select
                    id="profile-material-select"
                    value={draft.material}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        material: e.target.value as FilamentMaterialFamily,
                      }))
                    }
                    className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    {MATERIAL_FAMILIES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="profile-color-name"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Color Label & Swatch
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="profile-color-name"
                      type="text"
                      value={draft.colorName}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          colorName: e.target.value,
                        }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                    />
                    <input
                      type="color"
                      aria-label="Profile Filament Color Hex"
                      value={draft.colorHex}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          colorHex: e.target.value,
                        }))
                      }
                      className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer shrink-0"
                    />
                  </div>
                </div>
              </div>

              {/* Core 4 Customizable Extrusion & Thermal Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Nozzle Temperature (°C) */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="profile-nozzle-temp"
                      className="text-xs font-semibold text-slate-200 flex items-center gap-1.5"
                    >
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      Nozzle Temperature (°C)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        id="profile-nozzle-temp"
                        type="number"
                        min={170}
                        max={310}
                        value={draft.nozzleTemp}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            nozzleTemp: Number(e.target.value),
                          }))
                        }
                        className="w-18 px-2 py-1 text-xs font-mono font-bold text-right bg-slate-900 border border-slate-700 rounded text-emerald-400 tabular-nums"
                      />
                      <span className="text-xs font-mono text-slate-400">°C</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    aria-label="Nozzle Temperature Slider"
                    min={170}
                    max={300}
                    step={5}
                    value={draft.nozzleTemp}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        nozzleTemp: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                    <span>Range: 170°C – 300°C</span>
                    <span>Hardened Steel Hotend</span>
                  </div>
                </div>

                {/* 2. Bed Temperature (°C) */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="profile-bed-temp"
                      className="text-xs font-semibold text-slate-200 flex items-center gap-1.5"
                    >
                      <Thermometer className="w-3.5 h-3.5 text-sky-400" />
                      Bed Temperature (°C)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        id="profile-bed-temp"
                        type="number"
                        min={0}
                        max={120}
                        value={draft.bedTemp}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            bedTemp: Number(e.target.value),
                          }))
                        }
                        className="w-18 px-2 py-1 text-xs font-mono font-bold text-right bg-slate-900 border border-slate-700 rounded text-emerald-400 tabular-nums"
                      />
                      <span className="text-xs font-mono text-slate-400">°C</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    aria-label="Bed Temperature Slider"
                    min={0}
                    max={120}
                    step={5}
                    value={draft.bedTemp}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        bedTemp: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                    <span>Range: 0°C – 120°C</span>
                    <span>Textured PEI Plate Target</span>
                  </div>
                </div>

                {/* 3. Print Speed (mm/s) */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="profile-print-speed"
                      className="text-xs font-semibold text-slate-200 flex items-center gap-1.5"
                    >
                      <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                      Print Speed (mm/s)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        id="profile-print-speed"
                        type="number"
                        min={20}
                        max={500}
                        value={draft.printSpeedMmS}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            printSpeedMmS: Number(e.target.value),
                          }))
                        }
                        className="w-18 px-2 py-1 text-xs font-mono font-bold text-right bg-slate-900 border border-slate-700 rounded text-emerald-400 tabular-nums"
                      />
                      <span className="text-xs font-mono text-slate-400">
                        mm/s
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    aria-label="Print Speed Slider"
                    min={30}
                    max={400}
                    step={10}
                    value={draft.printSpeedMmS}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        printSpeedMmS: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                    <span>
                      Inner Wall: {Math.min(450, Math.round(draft.printSpeedMmS * 1.35))} mm/s
                    </span>
                    <span>
                      Infill: {Math.min(500, Math.round(draft.printSpeedMmS * 1.3))} mm/s
                    </span>
                  </div>
                </div>

                {/* 4. Retraction Distance (mm) & Retraction Speed */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="profile-retraction-distance"
                      className="text-xs font-semibold text-slate-200 flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      Retraction Distance (mm)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        id="profile-retraction-distance"
                        type="number"
                        step={0.1}
                        min={0}
                        max={5}
                        value={draft.retractionDistanceMm}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            retractionDistanceMm: Number(e.target.value),
                          }))
                        }
                        className="w-18 px-2 py-1 text-xs font-mono font-bold text-right bg-slate-900 border border-slate-700 rounded text-emerald-400 tabular-nums"
                      />
                      <span className="text-xs font-mono text-slate-400">mm</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    aria-label="Retraction Distance Slider"
                    min={0}
                    max={3.0}
                    step={0.1}
                    value={draft.retractionDistanceMm}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        retractionDistanceMm: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400 tabular-nums">
                    <span>Recommended: 0.4–1.4 mm</span>
                    <span>Speed: {draft.retractionSpeedMmS} mm/s</span>
                  </div>
                </div>
              </div>

              {/* Secondary Advanced Extrusion Parameters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label
                    htmlFor="profile-retract-speed"
                    className="block text-[11px] text-slate-400 mb-1"
                  >
                    Retraction Speed (mm/s)
                  </label>
                  <input
                    id="profile-retract-speed"
                    type="number"
                    min={10}
                    max={80}
                    value={draft.retractionSpeedMmS}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        retractionSpeedMmS: Number(e.target.value),
                      }))
                    }
                    className="w-full px-2 py-1 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-slate-100 tabular-nums"
                  />
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label
                    htmlFor="profile-volumetric"
                    className="block text-[11px] text-slate-400 mb-1"
                  >
                    Max Volumetric (mm³/s)
                  </label>
                  <input
                    id="profile-volumetric"
                    type="number"
                    step={0.5}
                    min={2}
                    max={35}
                    value={draft.maxVolumetricSpeed}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        maxVolumetricSpeed: Number(e.target.value),
                      }))
                    }
                    className="w-full px-2 py-1 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-slate-100 tabular-nums"
                  />
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label
                    htmlFor="profile-kfactor"
                    className="block text-[11px] text-slate-400 mb-1"
                  >
                    LiDAR K-Factor
                  </label>
                  <input
                    id="profile-kfactor"
                    type="number"
                    step={0.001}
                    min={0}
                    max={0.2}
                    value={draft.kFactor}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        kFactor: Number(e.target.value),
                      }))
                    }
                    className="w-full px-2 py-1 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-slate-100 tabular-nums"
                  />
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label
                    htmlFor="profile-cost"
                    className="block text-[11px] text-slate-400 mb-1"
                  >
                    Spool Cost ($/kg)
                  </label>
                  <input
                    id="profile-cost"
                    type="number"
                    step="0.01"
                    min={5}
                    max={200}
                    value={draft.costPerKg}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        costPerKg: Number(e.target.value),
                      }))
                    }
                    className="w-full px-2 py-1 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-slate-100 tabular-nums"
                  />
                </div>
              </div>
            </form>

            {/* Assign Profile to Bambu 4-Slot AMS & Active Slicer Process */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Assign Profile to Bambu AMS Slot & Slicer Engine
                  </h3>
                  <p className="text-xs text-slate-400">
                    Selecting an AMS slot loads this profile’s nozzle temperature, bed temperature, print speed, and retraction distance into the active slicer configuration.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {amsSlots.map((slot) => {
                  const isLoaded = slot.profileId === draft.id;
                  return (
                    <div
                      key={slot.id}
                      className={`p-3 rounded-lg border flex flex-col justify-between gap-2.5 ${
                        isLoaded
                          ? 'bg-emerald-950/25 border-emerald-500/70'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-slate-100">
                            AMS Slot A{slot.id}
                          </span>
                          <span
                            className="w-3.5 h-3.5 rounded-sm border border-white/20"
                            style={{ backgroundColor: slot.colorHex }}
                          />
                        </div>
                        <div className="text-xs font-medium text-slate-200 mt-1 truncate">
                          {slot.material} · {slot.colorName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums">
                          {slot.nozzleTemp ?? Math.round((slot.nozzleTempMin + slot.nozzleTempMax) / 2)}°C · Bed {slot.bedTemp}°C · {slot.retractionDistanceMm ?? 0.8}mm
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onApplyProfileToSlot(draft, slot.id);
                          setSaveBanner(
                            `Applied "${draft.name}" (${draft.nozzleTemp}°C / ${draft.bedTemp}°C / ${draft.printSpeedMmS}mm/s / ${draft.retractionDistanceMm}mm retract) to AMS Slot A${slot.id}.`
                          );
                        }}
                        className={`w-full py-1.5 px-2.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                          isLoaded
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                        }`}
                      >
                        {isLoaded ? `Active in A${slot.id}` : `Apply to Slot A${slot.id}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
