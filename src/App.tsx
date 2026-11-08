import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  Camera,
  ChevronDown,
  ChevronUp,
  Cloud,
  Copy,
  Download,
  Grid,
  Layers,
  Maximize2,
  Move,
  Play,
  Printer,
  RotateCw,
  Send,
  Sliders,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AlertEvent,
  AlertRule,
  AmsSlot,
  BambuAccountProfile,
  BambuPrinterModelId,
  BuildPlate,
  CameraPreset,
  FilamentProfile,
  ManualRepairOptions,
  PlateObject,
  PrintJobDispatchOptions,
  PrintQueueItem,
  PrinterConnectionConfig,
  PrinterTelemetry,
  PresetShapeType,
  SlicerProcessSettings,
  WorkspaceTab,
} from './types/slicer';
import {
  applyProfileToSlotAndSettings,
  autoArrangeObjectsOnPlate,
  buildPrintQueueFromPlates,
  buildTimelapseMetadataOnCompletion,
  calculateAllPlatesSliceResult,
  calculateSliceResult,
  centerPlateObject,
  clampPlateCount,
  clonePlateObjectMulti,
  DEFAULT_BAMBU_ACCOUNT,
  DEFAULT_BUILD_PLATES,
  DEFAULT_FILAMENT_PROFILES,
  detectPlatesFrom3MFBuffer,
  evaluatePrinterAlerts,
  fillPlateWithObjectCopies,
  formatDuration,
  generateMultiPlateSample3MF,
  getBambuPrinterModelSpec,
  getScaledDimensions,
  MAX_PLATES_COUNT,
  mirrorPlateObject,
  normalizeAndMeasurePositions,
  parse3MFBuffer,
  parseSTLBuffer,
  resetPlateObjectTransform,
  simulateBambuCloudDispatch,
  validatePlateBounds,
} from './utils/slicerEngine';
import {
  analyzeMeshTopology,
  DEFAULT_MANUAL_REPAIR_OPTIONS,
  generateDamagedSampleSTL,
  repairMeshGeometry,
} from './utils/meshRepairEngine';
import { generateTimelapseVideoBlobUrl } from './utils/timelapseGenerator';
import { PRESET_MODELS_CATALOG } from './utils/proceduralModels';
import { BuildPlateViewport } from './components/BuildPlateViewport';
import { SlicerSidebar } from './components/SlicerSidebar';
import { DeviceMonitorView } from './components/DeviceMonitorView';
import { AlertsCenterView } from './components/AlertsCenterView';
import { SendToPrinterModal } from './components/SendToPrinterModal';
import { ChamberCameraCanvas } from './components/ChamberCameraCanvas';
import { MaterialProfilesView } from './components/MaterialProfilesView';
import { MeshRepairModal } from './components/MeshRepairModal';
import { BambuAccountModal } from './components/BambuAccountModal';
import { PlateObjectContextMenu } from './components/PlateObjectContextMenu';

const INITIAL_AMS_SLOTS: AmsSlot[] = [
  {
    id: 1,
    profileId: 'prof-bambu-pla-cf',
    material: 'PLA-CF',
    colorName: 'Carbon Black',
    colorHex: '#334155',
    nozzleTemp: 225,
    nozzleTempMin: 215,
    nozzleTempMax: 235,
    bedTemp: 55,
    printSpeedMmS: 200,
    retractionDistanceMm: 0.8,
    remainingPct: 84,
    densityGcm3: 1.22,
    costPerKg: 31.99,
    kFactor: 0.021,
  },
  {
    id: 2,
    profileId: 'prof-bambu-pla-basic',
    material: 'PLA Basic',
    colorName: 'Bambu Green',
    colorHex: '#10b981',
    nozzleTemp: 220,
    nozzleTempMin: 190,
    nozzleTempMax: 230,
    bedTemp: 55,
    printSpeedMmS: 250,
    retractionDistanceMm: 0.8,
    remainingPct: 68,
    densityGcm3: 1.24,
    costPerKg: 24.99,
    kFactor: 0.018,
  },
  {
    id: 3,
    profileId: 'prof-bambu-petg-cf',
    material: 'PETG-CF',
    colorName: 'Titanium Gray',
    colorHex: '#64748b',
    nozzleTemp: 255,
    nozzleTempMin: 235,
    nozzleTempMax: 260,
    bedTemp: 70,
    printSpeedMmS: 160,
    retractionDistanceMm: 1.2,
    remainingPct: 45,
    densityGcm3: 1.27,
    costPerKg: 34.99,
    kFactor: 0.026,
  },
  {
    id: 4,
    profileId: 'prof-bambu-asa',
    material: 'ASA',
    colorName: 'Signal Orange',
    colorHex: '#f97316',
    nozzleTemp: 260,
    nozzleTempMin: 245,
    nozzleTempMax: 270,
    bedTemp: 90,
    printSpeedMmS: 180,
    retractionDistanceMm: 0.6,
    remainingPct: 92,
    densityGcm3: 1.07,
    costPerKg: 29.99,
    kFactor: 0.022,
  },
];

const INITIAL_OBJECTS: PlateObject[] = [
  {
    id: 'obj-benchy-1',
    name: '3DBenchy_Speedboat_X1C.3mf',
    sourceFormat: '3MF',
    presetType: 'benchy_hull',
    amsSlotId: 2,
    plateId: 1,
    baseDims: { x: 60, y: 31, z: 48 },
    position: { x: -38, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    triangles: 22560,
    visible: true,
    meshReport: {
      totalTriangles: 22560,
      uniqueVertices: 11282,
      nonManifoldEdges: 0,
      openBoundaryEdges: 0,
      estimatedHoles: 0,
      invertedNormals: 0,
      degenerateTriangles: 0,
      duplicateTriangles: 0,
      isWatertight: true,
      healthScore: 100,
      status: 'manifold',
      repairHistory: ['Verified watertight 3MF manifold mesh on load'],
      lastAnalyzedAtIso: new Date().toISOString(),
    },
  },
  {
    id: 'obj-gearbox-2',
    name: 'CoreXY_Planetary_Gearbox.3mf',
    sourceFormat: '3MF',
    presetType: 'planetary_gear',
    amsSlotId: 4,
    plateId: 1,
    baseDims: { x: 68, y: 68, z: 24 },
    position: { x: 42, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    triangles: 34820,
    visible: true,
    meshReport: {
      totalTriangles: 34820,
      uniqueVertices: 17412,
      nonManifoldEdges: 0,
      openBoundaryEdges: 0,
      estimatedHoles: 0,
      invertedNormals: 0,
      degenerateTriangles: 0,
      duplicateTriangles: 0,
      isWatertight: true,
      healthScore: 100,
      status: 'manifold',
      repairHistory: ['Verified watertight 3MF manifold mesh on load'],
      lastAnalyzedAtIso: new Date().toISOString(),
    },
  },
];

const INITIAL_SETTINGS: SlicerProcessSettings = {
  printerModel: 'Bambu Lab X1 Carbon',
  nozzleDiameter: 0.4,
  plateType: 'Textured PEI Plate',
  layerHeight: 0.2,
  initialLayerHeight: 0.2,
  wallLoops: 3,
  topShellLayers: 4,
  bottomShellLayers: 3,
  infillDensity: 15,
  infillPattern: 'gyroid',
  supportEnabled: false,
  supportType: 'tree_auto',
  supportThresholdAngle: 30,
  brimType: 'auto',
  brimWidthMm: 5,
  primeTowerEnabled: true,
  outerWallSpeed: 200,
  innerWallSpeed: 300,
  sparseInfillSpeed: 270,
  travelSpeed: 500,
  maxAcceleration: 10000,
};

const INITIAL_ALERT_RULES: AlertRule[] = [
  {
    id: 'rule-spaghetti',
    category: 'lidar_spaghetti',
    name: 'AI Chamber Camera & LiDAR Spaghetti Detection',
    description:
      'Monitors live chamber video feed and Micro-LiDAR depth scans for detached filament strands.',
    enabled: true,
    autoPausePrinter: true,
    soundAlert: true,
    thresholdLabel: '>= 65% visual confidence',
  },
  {
    id: 'rule-runout',
    category: 'filament_runout',
    name: 'AMS Filament Runout & Tangle Guard',
    description:
      'Monitors AMS odometer buffer spring and remaining spool percentage to prevent dry air-printing.',
    enabled: true,
    autoPausePrinter: true,
    soundAlert: true,
    thresholdLabel: '<= 5% spool capacity',
  },
  {
    id: 'rule-lidar-layer1',
    category: 'first_layer_inspection',
    name: 'Micro-LiDAR First-Layer Adhesion Scan',
    description:
      'Scans nozzle height and extrusion width across Layer 1 before accelerating to CoreXY full speed.',
    enabled: true,
    autoPausePrinter: true,
    soundAlert: false,
    thresholdLabel: 'Score < 60/100',
  },
  {
    id: 'rule-complete',
    category: 'print_complete',
    name: 'Print Completion & Bed Cooldown Alert',
    description:
      'Dispatches notification when all G-code layers finish and Textured PEI plate drops below 40°C.',
    enabled: true,
    autoPausePrinter: false,
    soundAlert: true,
    thresholdLabel: 'Progress = 100%',
  },
  {
    id: 'rule-humidity',
    category: 'ams_humidity',
    name: 'AMS Hygrometer Desiccant Warning',
    description:
      'Alerts when internal AMS moisture index rises into wet zone for hygroscopic PAHT-CF and PETG.',
    enabled: true,
    autoPausePrinter: false,
    soundAlert: false,
    thresholdLabel: 'Humidity Index >= 4/5',
  },
];

const STORAGE_KEY_PROFILES = 'carbonslice_x1_filament_profiles_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('prepare');
  const [amsSlots, setAmsSlots] = useState<AmsSlot[]>(INITIAL_AMS_SLOTS);
  const [filamentProfiles, setFilamentProfiles] = useState<FilamentProfile[]>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_PROFILES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to default profiles
    }
    return DEFAULT_FILAMENT_PROFILES;
  });
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    DEFAULT_FILAMENT_PROFILES[0].id
  );
  const [objects, setObjects] = useState<PlateObject[]>(INITIAL_OBJECTS);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(
    INITIAL_OBJECTS[0].id
  );
  const [settings, setSettings] = useState<SlicerProcessSettings>({
    ...INITIAL_SETTINGS,
    retractionDistanceMm: 0.8,
    retractionSpeedMmS: 30,
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [autoRepairOnImport, setAutoRepairOnImport] = useState<boolean>(true);
  const [meshRepairModalOpen, setMeshRepairModalOpen] = useState<boolean>(false);
  const [contextMenuState, setContextMenuState] = useState<{
    objectId: string;
    clientX: number;
    clientY: number;
  } | null>(null);

  const handleSaveFilamentProfile = (profile: FilamentProfile) => {
    setFilamentProfiles((prev) => {
      const exists = prev.some((p) => p.id === profile.id);
      const next = exists
        ? prev.map((p) => (p.id === profile.id ? profile : p))
        : [profile, ...prev];
      try {
        window.localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
    setSelectedProfileId(profile.id);
  };

  const handleDeleteFilamentProfile = (profileId: string) => {
    setFilamentProfiles((prev) => {
      const next = prev.filter((p) => p.id !== profileId);
      try {
        window.localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      if (selectedProfileId === profileId && next.length > 0) {
        setSelectedProfileId(next[0].id);
      }
      return next;
    });
  };

  const handleApplyProfileToSlot = (profile: FilamentProfile, slotId: number) => {
    const targetSlot = amsSlots.find((s) => s.id === slotId) || amsSlots[0];
    const { updatedSlot, updatedSettings } = applyProfileToSlotAndSettings(
      profile,
      targetSlot,
      settings
    );
    setAmsSlots((prev) =>
      prev.map((s) => (s.id === slotId ? updatedSlot : s))
    );
    setSettings(updatedSettings);
    setSelectedProfileId(profile.id);
  };

  // Viewport & Dock Controls
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('iso');
  const [wireframeMode, setWireframeMode] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [pipCameraOpen, setPipCameraOpen] = useState(true);
  const [showToolheadInPreview, setShowToolheadInPreview] = useState(true);

  // Build Plates Management (1 to 9 plates, default 1)
  const [plates, setPlates] = useState<BuildPlate[]>(() => {
    try {
      const saved = window.localStorage.getItem('carbonslice_x1_plates_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 1 && parsed.length <= 9) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_BUILD_PLATES;
  });
  const [activePlateId, setActivePlateId] = useState<number>(1);

  // Bambu Lab Cloud Account State
  const [bambuAccount, setBambuAccount] = useState<BambuAccountProfile>(() => {
    try {
      const saved = window.localStorage.getItem('carbonslice_x1_bambu_account_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.accountEmail === 'string') {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_BAMBU_ACCOUNT;
  });
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem('carbonslice_x1_plates_v1', JSON.stringify(plates));
    } catch {}
  }, [plates]);

  useEffect(() => {
    try {
      window.localStorage.setItem('carbonslice_x1_bambu_account_v1', JSON.stringify(bambuAccount));
    } catch {}
  }, [bambuAccount]);

  // Active Plate Objects & Slicing
  const activePlateObjects = useMemo(
    () => objects.filter((o) => (o.plateId ?? 1) === activePlateId),
    [objects, activePlateId]
  );

  // Slicing & Layer Scrubber (Calculated for Active Build Plate & All Build Plates)
  const sliceResult = useMemo(
    () => calculateSliceResult(activePlateObjects, settings, amsSlots),
    [activePlateObjects, settings, amsSlots]
  );
  const multiPlateSliceResult = useMemo(
    () => calculateAllPlatesSliceResult(plates, objects, settings, amsSlots),
    [plates, objects, settings, amsSlots]
  );
  const [sliceAllMode, setSliceAllMode] = useState<boolean>(false);
  const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>([]);
  const [previewLayer, setPreviewLayer] = useState<number>(sliceResult.totalLayers);

  // Keep previewLayer synced to max layers when sliceResult changes
  useEffect(() => {
    setPreviewLayer(sliceResult.totalLayers || 1);
  }, [sliceResult.totalLayers]);

  // Wireless Send-to-Printer Modal
  const [sendModalOpen, setSendModalOpen] = useState(false);

  // Bambu Printer Connection & Live Telemetry
  const [printerConfig, setPrinterConfig] = useState<PrinterConnectionConfig>({
    printerName: 'Bambu Lab X1C — Studio Bay 01',
    model: 'Bambu Lab X1 Carbon',
    serialNumber: '00M09A351800421',
    lanIp: '192.168.1.142',
    accessCode: '38492017',
    connectionMode: 'bambu_lan_mqtt',
    connected: true,
  });

  const activePrinterSpec = useMemo(
    () => getBambuPrinterModelSpec(settings.printerModel || printerConfig.model),
    [settings.printerModel, printerConfig.model]
  );

  const handleSelectPrinterModel = (model: BambuPrinterModelId) => {
    const spec = getBambuPrinterModelSpec(model);
    setSettings((prev) => ({
      ...prev,
      printerModel: model,
      maxAcceleration: spec.maxAccelerationMmS2,
    }));
    setPrinterConfig((prev) => ({
      ...prev,
      model,
      printerName: `${spec.id} — Studio Bay 01`,
    }));
  };

  const [telemetry, setTelemetry] = useState<PrinterTelemetry>({
    state: 'PRINTING',
    activeJobName: '3DBenchy_Speedboat_X1C.3mf',
    substage: 'Printing Outer Wall & Gyroid Infill',
    progressPct: 38,
    currentLayer: 91,
    totalLayers: 240,
    remainingSeconds: 1140,
    elapsedSeconds: 710,
    nozzleTempActual: 220,
    nozzleTempTarget: 220,
    bedTempActual: 55,
    bedTempTarget: 55,
    chamberTempActual: 37,
    partFanPct: 100,
    auxFanPct: 70,
    chamberFanPct: 50,
    speedProfile: 'standard',
    speedMultiplierPct: 100,
    zHeightMm: 18.2,
    activeAmsSlot: 2,
    amsHumidityIndex: 2,
    amsTempC: 25,
    chamberLightOn: true,
    lidarOverlayOn: true,
    lidarFirstLayerScore: 0.97,
    spaghettiConfidencePct: 8,
    toolheadPos: { x: 14, y: -6, z: 18.2 },
    timelapseEnabled: true,
    timelapseMode: 'smooth_park',
    timelapseFps: 30,
    timelapseFramesCaptured: 91,
    latestTimelapseVideo: null,
  });

  // Alert Rules & Triggered Event History
  const [alertRules, setAlertRules] = useState<AlertRule[]>(INITIAL_ALERT_RULES);
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>([
    {
      id: 'init-lidar-ok',
      category: 'first_layer_inspection',
      severity: 'info',
      title: 'Micro-LiDAR First-Layer Inspection Passed (97/100)',
      message:
        'Eddy-current bed leveling and 7μm optical LiDAR verified uniform first-layer extrusion on Textured PEI Plate.',
      timestampIso: new Date(Date.now() - 600000).toISOString(),
      formattedTime: '10m ago',
      acknowledged: true,
      actionTaken: 'Proceeded to Standard CoreXY speed (100%)',
    },
  ]);

  // Keyboard shortcut 'H' to toggle bottom control dock in 3D viewport
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'h') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Gentle telemetry tick when printing
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTelemetry((prev) => {
        if (prev.state !== 'PRINTING') return prev;
        const nextRemaining = Math.max(0, prev.remainingSeconds - 2);
        const nextElapsed = prev.elapsedSeconds + 2;
        const total = Math.max(1, nextElapsed + nextRemaining);
        const nextPct = Math.min(99, Math.round((nextElapsed / total) * 100));
        const nextLayer = Math.min(
          prev.totalLayers,
          Math.max(1, Math.round((nextPct / 100) * prev.totalLayers))
        );
        return {
          ...prev,
          remainingSeconds: nextRemaining,
          elapsedSeconds: nextElapsed,
          progressPct: nextPct,
          currentLayer: nextLayer,
          timelapseFramesCaptured: prev.timelapseEnabled
            ? nextLayer
            : prev.timelapseFramesCaptured,
          zHeightMm: Number((nextLayer * settings.layerHeight).toFixed(2)),
        };
      });
    }, 2500);
    return () => window.clearInterval(timer);
  }, [settings.layerHeight]);

  const selectedObject = useMemo(
    () => objects.find((o) => o.id === selectedObjectId) || null,
    [objects, selectedObjectId]
  );

  const handleUpdateSelectedObject = (patch: Partial<PlateObject>) => {
    if (!selectedObjectId) return;
    setObjects((prev) =>
      prev.map((obj) => (obj.id === selectedObjectId ? { ...obj, ...patch } : obj))
    );
  };

  const handleMoveObjectOnPlate = (
    id: string,
    position: { x: number; y: number; z: number }
  ) => {
    setObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, position } : obj))
    );
  };

  const handleAddPlate = () => {
    if (plates.length >= MAX_PLATES_COUNT) return;
    const nextId = Math.max(...plates.map((p) => p.id), 0) + 1;
    const newPlate: BuildPlate = {
      id: nextId,
      name: `Plate ${nextId}`,
      plateType: settings.plateType,
    };
    setPlates((prev) => [...prev, newPlate]);
    setActivePlateId(nextId);
  };

  const handleDeletePlate = (plateId: number) => {
    if (plates.length <= 1) return;
    const remaining = plates.filter((p) => p.id !== plateId);
    setPlates(remaining);
    const fallbackId = remaining[0].id;
    setObjects((prev) =>
      prev.map((o) => (o.plateId === plateId ? { ...o, plateId: fallbackId } : o))
    );
    if (activePlateId === plateId) {
      setActivePlateId(fallbackId);
    }
  };

  const handleDuplicatePlate = (plateId: number) => {
    if (plates.length >= MAX_PLATES_COUNT) return;
    const nextId = Math.max(...plates.map((p) => p.id), 0) + 1;
    const sourcePlate = plates.find((p) => p.id === plateId) || plates[0];
    const newPlate: BuildPlate = {
      id: nextId,
      name: `${sourcePlate.name} (Copy)`,
      plateType: sourcePlate.plateType,
    };
    const plateObjects = objects.filter((o) => (o.plateId ?? 1) === plateId);
    const cloned = plateObjects.map((o, idx) => ({
      ...o,
      id: `${o.id}-p${nextId}-${Date.now()}-${idx}`,
      plateId: nextId,
      name: `${o.name} (P${nextId})`,
    }));
    setPlates((prev) => [...prev, newPlate]);
    setObjects((prev) => [...prev, ...cloned]);
    setActivePlateId(nextId);
  };

  const handleRenamePlate = (plateId: number, name: string) => {
    setPlates((prev) =>
      prev.map((p) => (p.id === plateId ? { ...p, name } : p))
    );
  };

  const handleMoveObjectToPlate = (objId: string, targetPlateId: number) => {
    setObjects((prev) =>
      prev.map((o) => (o.id === objId ? { ...o, plateId: targetPlateId } : o))
    );
  };

  const handleLoadMultiPlateSample = () => {
    setUploadError(null);
    const sample = generateMultiPlateSample3MF();
    const newPlates: BuildPlate[] = [
      { id: 1, name: sample.plateNames[1] || 'Plate 1 - Hull & Keel', plateType: 'Textured PEI Plate' },
      { id: 2, name: sample.plateNames[2] || 'Plate 2 - Cabin & Deck', plateType: 'Textured PEI Plate' },
      { id: 3, name: sample.plateNames[3] || 'Plate 3 - Mast & Radar', plateType: 'Textured PEI Plate' },
    ];
    setPlates(newPlates);

    const obj1 = buildPlateObjectFromMeshBuffer('Benchy_Hull_Structure.3mf', sample.buffer, true, true, 1, 1);
    obj1.position = { x: -20, y: 0, z: 0 };
    obj1.amsSlotId = 2; // Green

    const obj2 = buildPlateObjectFromMeshBuffer('Benchy_Cabin_Deck.3mf', sample.buffer, true, true, 2, 2);
    obj2.position = { x: 0, y: 0, z: 0 };
    obj2.amsSlotId = 1; // Black

    const obj3 = buildPlateObjectFromMeshBuffer('Benchy_Accessories_Mast.3mf', sample.buffer, true, true, 3, 3);
    obj3.position = { x: 20, y: 0, z: 0 };
    obj3.amsSlotId = 4; // Orange

    setObjects([obj1, obj2, obj3]);
    setActivePlateId(1);
    setSelectedObjectId(obj1.id);
  };

  const handleAddPresetModel = (presetType: PresetShapeType) => {
    const catalogItem =
      PRESET_MODELS_CATALOG.find((c) => c.presetType === presetType) ||
      PRESET_MODELS_CATALOG[0];
    const newId = `obj-${presetType}-${Date.now()}`;
    const newObj: PlateObject = {
      id: newId,
      name: catalogItem.name,
      sourceFormat: catalogItem.sourceFormat,
      presetType: catalogItem.presetType,
      amsSlotId: catalogItem.recommendedAmsSlot,
      plateId: activePlateId,
      baseDims: { ...catalogItem.baseDims },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      triangles: catalogItem.triangles,
      visible: true,
      meshReport: {
        totalTriangles: catalogItem.triangles,
        uniqueVertices: Math.round(catalogItem.triangles / 2) + 2,
        nonManifoldEdges: 0,
        openBoundaryEdges: 0,
        estimatedHoles: 0,
        invertedNormals: 0,
        degenerateTriangles: 0,
        duplicateTriangles: 0,
        isWatertight: true,
        healthScore: 100,
        status: 'manifold',
        repairHistory: [`Verified ${catalogItem.sourceFormat} preset geometry`],
        lastAnalyzedAtIso: new Date().toISOString(),
      },
    };
    const currentPlateObjs = objects.filter((o) => (o.plateId ?? 1) === activePlateId);
    const otherPlateObjs = objects.filter((o) => (o.plateId ?? 1) !== activePlateId);
    const arranged = autoArrangeObjectsOnPlate(
      [...currentPlateObjs, newObj],
      activePrinterSpec.buildVolume
    );
    setObjects([...otherPlateObjs, ...arranged]);
    setSelectedObjectId(newId);
  };

  const buildPlateObjectFromMeshBuffer = (
    fileName: string,
    buffer: ArrayBuffer,
    is3mf: boolean,
    skipAutoRepair = false,
    indexSuffix = 0,
    targetPlateId?: number
  ): PlateObject => {
    const parsed = is3mf ? parse3MFBuffer(buffer) : parseSTLBuffer(buffer);
    if (parsed.geometry.triangleCount === 0) {
      throw new Error(
        `Could not extract valid mesh triangles from "${fileName}". Verified binary/ASCII STL and 3MF XML structures are supported.`
      );
    }

    const originalPositions = new Float32Array(parsed.geometry.positions);
    const initialReport = analyzeMeshTopology(originalPositions, 0.0005, [
      `Analyzed ${is3mf ? '3MF' : 'STL'} topology on import (${parsed.geometry.triangleCount} raw faces)`,
    ]);

    let finalGeometry = parsed.geometry;
    let finalDims = parsed.dims;
    let finalReport = initialReport;

    const hasErrors =
      !initialReport.isWatertight ||
      initialReport.nonManifoldEdges > 0 ||
      initialReport.openBoundaryEdges > 0 ||
      initialReport.invertedNormals > 0 ||
      initialReport.degenerateTriangles > 0 ||
      initialReport.duplicateTriangles > 0;

    if (!skipAutoRepair && autoRepairOnImport && hasErrors) {
      const repaired = repairMeshGeometry(
        originalPositions,
        DEFAULT_MANUAL_REPAIR_OPTIONS,
        [
          `Auto-detected ${
            initialReport.openBoundaryEdges +
            initialReport.invertedNormals +
            initialReport.degenerateTriangles +
            initialReport.duplicateTriangles +
            initialReport.nonManifoldEdges
          } mesh issues on upload — triggered Auto-Repair`,
        ]
      );
      finalGeometry = repaired.geometry;
      finalDims = repaired.dims;
      finalReport = repaired.report;
    }

    return {
      id: `custom-${Date.now()}-${indexSuffix}`,
      name: fileName,
      sourceFormat: is3mf ? '3MF' : 'STL',
      presetType: 'custom_mesh',
      amsSlotId: 2,
      plateId: targetPlateId ?? activePlateId,
      baseDims: finalDims,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      triangles: finalGeometry.triangleCount,
      visible: true,
      customGeometry: finalGeometry,
      originalPositions,
      meshReport: finalReport,
    };
  };

  const handleUploadFiles = async (fileList: FileList) => {
    setUploadError(null);
    const added: PlateObject[] = [];
    let requiredPlatesCount = plates.length;
    const detectedNames: Record<number, string> = {};

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const lower = file.name.toLowerCase();
      if (!lower.endsWith('.stl') && !lower.endsWith('.3mf')) {
        setUploadError(
          `Unsupported file "${file.name}". Please select a .3mf or .stl mesh file.`
        );
        continue;
      }

      try {
        const buffer = await file.arrayBuffer();
        const is3mf = lower.endsWith('.3mf');
        let itemPlateId = activePlateId;

        if (is3mf) {
          const info = detectPlatesFrom3MFBuffer(buffer);
          if (info.detectedPlatesCount > 1) {
            requiredPlatesCount = Math.max(requiredPlatesCount, info.detectedPlatesCount);
            Object.assign(detectedNames, info.plateNames);
            if (info.plateAssignments.length > i && info.plateAssignments[i]) {
              itemPlateId = info.plateAssignments[i];
            }
          }
        } else {
          const match = /(?:plate|p)[_-]?([1-9])/i.exec(file.name);
          if (match) {
            const p = parseInt(match[1], 10);
            if (p >= 1 && p <= 9) {
              itemPlateId = p;
              requiredPlatesCount = Math.max(requiredPlatesCount, p);
            }
          }
        }

        const newObj = buildPlateObjectFromMeshBuffer(
          file.name,
          buffer,
          is3mf,
          false,
          i,
          itemPlateId
        );
        added.push(newObj);
      } catch (err) {
        setUploadError(
          err instanceof Error
            ? err.message
            : `Failed to parse "${file.name}".`
        );
      }
    }

    if (requiredPlatesCount > plates.length) {
      const updated = [...plates];
      for (let p = plates.length + 1; p <= clampPlateCount(requiredPlatesCount); p++) {
        updated.push({
          id: p,
          name: detectedNames[p] || `Plate ${p}`,
          plateType: settings.plateType,
        });
      }
      setPlates(updated);
    }

    if (added.length > 0) {
      setObjects((prev) => [...prev, ...added]);
      setSelectedObjectId(added[added.length - 1].id);
      if (added[0].plateId !== undefined && added[0].plateId !== activePlateId) {
        setActivePlateId(added[0].plateId);
      }
    }
  };

  const handleLoadDamagedSampleStl = (skipAutoRepair = false) => {
    setUploadError(null);
    const sample = generateDamagedSampleSTL();
    const newObj = buildPlateObjectFromMeshBuffer(
      sample.fileName,
      sample.buffer,
      false,
      skipAutoRepair,
      99
    );
    const arranged = autoArrangeObjectsOnPlate(
      [...objects, newObj],
      activePrinterSpec.buildVolume
    );
    setObjects(arranged);
    setSelectedObjectId(newObj.id);
    setMeshRepairModalOpen(true);
  };

  const handleRunManualRepair = (
    objId: string,
    options: ManualRepairOptions
  ) => {
    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id !== objId) return obj;
        if (obj.customGeometry && obj.customGeometry.positions.length > 0) {
          const repaired = repairMeshGeometry(
            obj.customGeometry.positions,
            options,
            obj.meshReport?.repairHistory || []
          );
          return {
            ...obj,
            baseDims: repaired.dims,
            triangles: repaired.geometry.triangleCount,
            customGeometry: repaired.geometry,
            meshReport: repaired.report,
          };
        }
        // Preset procedural model fallback
        const history = [
          ...(obj.meshReport?.repairHistory || []),
          `Manual repair pass verified (weld tol ${options.weldToleranceMm.toFixed(3)}mm) — 0 defects`,
        ];
        return {
          ...obj,
          meshReport: {
            ...(obj.meshReport || {
              totalTriangles: obj.triangles,
              uniqueVertices: Math.round(obj.triangles / 2) + 2,
              nonManifoldEdges: 0,
              openBoundaryEdges: 0,
              estimatedHoles: 0,
              invertedNormals: 0,
              degenerateTriangles: 0,
              duplicateTriangles: 0,
              isWatertight: true,
              healthScore: 100,
              status: 'repaired',
              repairHistory: [],
              lastAnalyzedAtIso: new Date().toISOString(),
            }),
            status: 'repaired',
            isWatertight: true,
            healthScore: 100,
            repairHistory: history,
            lastAnalyzedAtIso: new Date().toISOString(),
          },
        };
      })
    );
  };

  const handleRestoreOriginalMesh = (objId: string) => {
    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id !== objId || !obj.originalPositions) return obj;
        const rawNorm = normalizeAndMeasurePositions(obj.originalPositions);
        const rawReport = analyzeMeshTopology(obj.originalPositions, 0.0005, [
          'Restored original unrepaired STL/3MF mesh buffer',
        ]);
        return {
          ...obj,
          baseDims: rawNorm.dims,
          triangles: rawNorm.geometry.triangleCount,
          customGeometry: rawNorm.geometry,
          meshReport: rawReport,
        };
      })
    );
  };

  const handleCloneObject = (objId: string) => {
    const source = objects.find((o) => o.id === objId);
    if (!source) return;
    const { objects: updated, lastCreatedId } = clonePlateObjectMulti(
      source,
      objects,
      1,
      activePrinterSpec.buildVolume
    );
    setObjects(updated);
    setSelectedObjectId(lastCreatedId);
  };

  const handleCloneMulti = (objId: string, count: number) => {
    const source = objects.find((o) => o.id === objId);
    if (!source) return;
    const { objects: updated, lastCreatedId } = clonePlateObjectMulti(
      source,
      objects,
      count,
      activePrinterSpec.buildVolume
    );
    setObjects(updated);
    setSelectedObjectId(lastCreatedId);
  };

  const handleFillPlateWithCopies = (objId: string) => {
    const source = objects.find((o) => o.id === objId);
    if (!source) return;
    const { objects: updated } = fillPlateWithObjectCopies(
      source,
      objects,
      activePrinterSpec.buildVolume
    );
    setObjects(updated);
  };

  const handleMirrorObject = (objId: string, axis: 'x' | 'y' | 'z') => {
    setObjects((prev) =>
      prev.map((obj) => (obj.id === objId ? mirrorPlateObject(obj, axis) : obj))
    );
  };

  const handleCenterObject = (objId: string) => {
    setObjects((prev) =>
      prev.map((obj) => (obj.id === objId ? centerPlateObject(obj) : obj))
    );
  };

  const handleLayFlatObject = (objId: string) => {
    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === objId
          ? {
              ...obj,
              rotation: { x: 0, y: 0, z: obj.rotation.z },
              position: { ...obj.position, z: 0 },
            }
          : obj
      )
    );
  };

  const handleResetTransform = (objId: string) => {
    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === objId ? resetPlateObjectTransform(obj) : obj
      )
    );
  };

  const handleRotateZDelta = (objId: string, deltaDeg: number) => {
    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id !== objId) return obj;
        const nextZ = ((obj.rotation.z + deltaDeg) % 360 + 360) % 360;
        return {
          ...obj,
          rotation: {
            ...obj.rotation,
            z: nextZ > 180 ? nextZ - 360 : nextZ,
          },
        };
      })
    );
  };

  const handleScalePreset = (objId: string, scaleFactor: number) => {
    const clamped = Math.max(0.1, Math.min(3.5, scaleFactor));
    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === objId
          ? {
              ...obj,
              scale: { x: clamped, y: clamped, z: clamped },
            }
          : obj
      )
    );
  };

  const handleUpdateObjectById = (objId: string, patch: Partial<PlateObject>) => {
    setObjects((prev) =>
      prev.map((obj) => (obj.id === objId ? { ...obj, ...patch } : obj))
    );
  };

  const handleMoveObjectToNewPlate = (objId: string) => {
    if (plates.length >= MAX_PLATES_COUNT) return;
    const nextId = Math.max(...plates.map((p) => p.id), 0) + 1;
    const newPlate: BuildPlate = {
      id: nextId,
      name: `Plate ${nextId}`,
      plateType: settings.plateType,
    };
    setPlates((prev) => [...prev, newPlate]);
    setObjects((prev) =>
      prev.map((o) =>
        o.id === objId
          ? { ...o, plateId: nextId, position: { x: 0, y: 0, z: 0 } }
          : o
      )
    );
    setActivePlateId(nextId);
  };

  const handleExportObjectStl = (objId: string) => {
    const target = objects.find((o) => o.id === objId);
    if (!target) return;
    const dims = getScaledDimensions(target);
    const asciiStl = [
      `solid ${target.name.replace(/\s+/g, '_')}`,
      `  facet normal 0 0 1`,
      `    outer loop`,
      `      vertex ${(-dims.x / 2).toFixed(2)} ${(-dims.y / 2).toFixed(2)} 0.00`,
      `      vertex ${(dims.x / 2).toFixed(2)} ${(-dims.y / 2).toFixed(2)} 0.00`,
      `      vertex 0.00 ${(dims.y / 2).toFixed(2)} ${dims.z.toFixed(2)}`,
      `    endloop`,
      `  endfacet`,
      `endsolid ${target.name.replace(/\s+/g, '_')}`,
    ].join('\n');
    const blob = new Blob([asciiStl], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${target.name.replace(/\.(3mf|stl)$/i, '')}_Exported.stl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteObject = (objId: string) => {
    setObjects((prev) => {
      const remaining = prev.filter((o) => o.id !== objId);
      if (selectedObjectId === objId) {
        setSelectedObjectId(remaining[0]?.id || null);
      }
      return remaining;
    });
  };

  const handleTriggerSlice = () => {
    setSliceAllMode(false);
    setPreviewLayer(sliceResult.totalLayers || 1);
    setActiveTab('preview');
  };

  const handleTriggerSliceAll = () => {
    setSliceAllMode(true);
    setPreviewLayer(sliceResult.totalLayers || 1);
    setActiveTab('preview');
  };

  const handleExportGcodeFile = () => {
    const content = sliceResult.gcodePreviewLines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bambu_X1C_${objects[0]?.name.replace(/\.(3mf|stl)$/i, '') || 'Plate'}.gcode`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStartNextQueueItem = () => {
    setPrintQueue((prev) => {
      const nextQueuedIndex = prev.findIndex((q) => q.status === 'queued');
      if (nextQueuedIndex === -1) return prev;
      const nextItem = prev[nextQueuedIndex];

      setTelemetry((curr) => ({
        ...curr,
        state: 'PRINTING',
        activeJobName: `${nextItem.plateName}: ${nextItem.jobName}`,
        substage: 'Printing Queued Plate · Outer Wall & Gyroid Infill',
        progressPct: 3,
        currentLayer: 1,
        totalLayers: nextItem.totalLayers,
        remainingSeconds: nextItem.estimatedTimeSeconds,
        elapsedSeconds: 12,
        spaghettiConfidencePct: 5,
        zHeightMm: settings.initialLayerHeight,
      }));

      return prev.map((item, idx) => {
        if (item.status === 'printing') {
          return { ...item, status: 'completed' as const };
        }
        if (idx === nextQueuedIndex) {
          return { ...item, status: 'printing' as const };
        }
        return item;
      });
    });
  };

  const handleRemoveQueueItem = (id: string) => {
    setPrintQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMoveQueueItem = (id: string, dir: 'up' | 'down') => {
    setPrintQueue((prev) => {
      const index = prev.findIndex((q) => q.id === id);
      if (index === -1 || prev[index].status !== 'queued') return prev;
      const targetIndex = dir === 'up' ? index - 1 : index + 1;
      if (
        targetIndex < 0 ||
        targetIndex >= prev.length ||
        prev[targetIndex].status !== 'queued'
      ) {
        return prev;
      }
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
  };

  const handleClearCompletedQueue = () => {
    setPrintQueue((prev) => prev.filter((item) => item.status !== 'completed'));
  };

  const handleConfirmSendPrint = async (options: PrintJobDispatchOptions) => {
    setSendModalOpen(false);
    const isQueueAll =
      (options.queueAllPlates || options.targetPlateId === 'all') &&
      plates.length > 1;

    if (isQueueAll) {
      const generatedQueue = buildPrintQueueFromPlates(
        multiPlateSliceResult,
        options.dispatchMode || 'lan_mqtt',
        printerConfig.printerName
      );
      setPrintQueue(generatedQueue);

      const firstItem = generatedQueue[0];
      const firstPlateObjs = objects.filter(
        (o) => (o.plateId ?? 1) === (firstItem?.plateId ?? 1)
      );
      const leadObj =
        firstPlateObjs.find((o) => o.visible) || firstPlateObjs[0] || objects[0];
      const activeSlot = leadObj ? leadObj.amsSlotId : 2;
      const slotInfo = amsSlots.find((s) => s.id === activeSlot) || amsSlots[0];
      const targetNozzle = slotInfo
        ? Math.round((slotInfo.nozzleTempMin + slotInfo.nozzleTempMax) / 2)
        : 220;

      if (options.dispatchMode === 'bambu_cloud') {
        const devId =
          options.targetPrinterDevId ||
          bambuAccount.selectedPrinterDevId ||
          printerConfig.serialNumber;
        const res = await simulateBambuCloudDispatch(
          firstItem?.jobName || 'MultiPlate_Project.3mf',
          bambuAccount,
          devId,
          `All ${generatedQueue.length} Plates (Print Queue)`
        );
        setAlertEvents((prev) => [
          {
            id: `cloud-queue-dispatch-${Date.now()}`,
            category: 'print_complete',
            severity: 'info',
            title: `Multi-Plate Print Queue Created (${generatedQueue.length} Plates)`,
            message: `${res.message} Plate 1 started printing; ${
              generatedQueue.length - 1
            } subsequent plate(s) queued (${multiPlateSliceResult.formattedTotalTime} total).`,
            timestampIso: res.dispatchTimeIso,
            formattedTime: 'Just now',
            acknowledged: false,
            actionTaken: `Queued ${generatedQueue.length} plates via Bambu Cloud`,
          },
          ...prev,
        ]);
      } else {
        setAlertEvents((prev) => [
          {
            id: `lan-queue-dispatch-${Date.now()}`,
            category: 'print_complete',
            severity: 'info',
            title: `Multi-Plate Print Queue Created (${generatedQueue.length} Plates)`,
            message: `Dispatched ${generatedQueue.length}-plate print queue to ${printerConfig.lanIp}:8883 (${multiPlateSliceResult.formattedTotalTime} total, ${multiPlateSliceResult.totalFilamentGrams}g).`,
            timestampIso: new Date().toISOString(),
            formattedTime: 'Just now',
            acknowledged: false,
            actionTaken: `Started ${firstItem?.plateName || 'Plate 1'} · ${
              generatedQueue.length - 1
            } plate(s) queued`,
          },
          ...prev,
        ]);
      }

      if (firstItem) {
        setTelemetry((prev) => ({
          ...prev,
          state: 'PRINTING',
          activeJobName: `${firstItem.plateName}: ${firstItem.jobName}`,
          substage: `Print Queue #1/${generatedQueue.length} · ${
            options.flowDynamicsLidar
              ? 'Micro-LiDAR Flow Calibration'
              : 'Printing Outer Wall & Infill'
          }`,
          progressPct: 4,
          currentLayer: 1,
          totalLayers: firstItem.totalLayers,
          remainingSeconds: firstItem.estimatedTimeSeconds,
          elapsedSeconds: 15,
          nozzleTempActual: targetNozzle,
          nozzleTempTarget: targetNozzle,
          bedTempActual: slotInfo?.bedTemp || 55,
          bedTempTarget: slotInfo?.bedTemp || 55,
          activeAmsSlot: activeSlot,
          spaghettiConfidencePct: 4,
          zHeightMm: settings.initialLayerHeight,
          timelapseEnabled: options.timelapseRecording,
          timelapseMode:
            options.timelapseMode || prev.timelapseMode || 'smooth_park',
          timelapseFps: options.timelapseFps || prev.timelapseFps || 30,
          timelapseFramesCaptured: options.timelapseRecording ? 1 : 0,
          latestTimelapseVideo: null,
        }));
      }

      setActiveTab('device');
      return;
    }

    const targetPlateId =
      typeof options.targetPlateId === 'number'
        ? options.targetPlateId
        : activePlateId;
    const targetPlateObj = plates.find((p) => p.id === targetPlateId);
    const plateObjects = objects.filter((o) => (o.plateId ?? 1) === targetPlateId);
    const leadObj = plateObjects.find((o) => o.visible) || plateObjects[0] || objects[0];
    const activeSlot = leadObj ? leadObj.amsSlotId : 2;
    const slotInfo = amsSlots.find((s) => s.id === activeSlot) || amsSlots[0];
    const targetNozzle = slotInfo
      ? Math.round((slotInfo.nozzleTempMin + slotInfo.nozzleTempMax) / 2)
      : 220;

    const jobName = leadObj ? leadObj.name : `${targetPlateObj?.name || 'Plate'}.3mf`;
    const plateLabel = targetPlateObj ? targetPlateObj.name : `Plate ${targetPlateId}`;

    if (options.dispatchMode === 'bambu_cloud') {
      const devId = options.targetPrinterDevId || bambuAccount.selectedPrinterDevId || printerConfig.serialNumber;
      const res = await simulateBambuCloudDispatch(
        jobName,
        bambuAccount,
        devId,
        plateLabel
      );
      setAlertEvents((prev) => [
        {
          id: `cloud-dispatch-${Date.now()}`,
          category: 'print_complete',
          severity: 'info',
          title: `Wireless Cloud Print Dispatched · ${plateLabel}`,
          message: res.message,
          timestampIso: res.dispatchTimeIso,
          formattedTime: 'Just now',
          acknowledged: false,
          actionTaken: `Bambu MQTT broker (${bambuAccount.region.toUpperCase()}) published payload`,
        },
        ...prev,
      ]);
    } else {
      setAlertEvents((prev) => [
        {
          id: `lan-dispatch-${Date.now()}`,
          category: 'print_complete',
          severity: 'info',
          title: `Wireless LAN Print Dispatched · ${plateLabel}`,
          message: `Dispatched "${jobName}" directly to ${printerConfig.lanIp}:8883 over local Wi-Fi.`,
          timestampIso: new Date().toISOString(),
          formattedTime: 'Just now',
          acknowledged: false,
          actionTaken: 'Direct LAN MQTT 8883 payload delivered',
        },
        ...prev,
      ]);
    }

    setTelemetry((prev) => ({
      ...prev,
      state: 'PRINTING',
      activeJobName: `${plateLabel}: ${jobName}`,
      substage: options.flowDynamicsLidar
        ? 'Micro-LiDAR Bed & Flow Calibration · Initial Layer 1'
        : 'Printing Outer Wall & Infill',
      progressPct: 4,
      currentLayer: 1,
      totalLayers: sliceResult.totalLayers,
      remainingSeconds: sliceResult.totalTimeSeconds,
      elapsedSeconds: 18,
      nozzleTempActual: targetNozzle,
      nozzleTempTarget: targetNozzle,
      bedTempActual: slotInfo?.bedTemp || 55,
      bedTempTarget: slotInfo?.bedTemp || 55,
      activeAmsSlot: activeSlot,
      spaghettiConfidencePct: 4,
      zHeightMm: settings.initialLayerHeight,
      timelapseEnabled: options.timelapseRecording,
      timelapseMode: options.timelapseMode || prev.timelapseMode || 'smooth_park',
      timelapseFps: options.timelapseFps || prev.timelapseFps || 30,
      timelapseFramesCaptured: options.timelapseRecording ? 1 : 0,
      latestTimelapseVideo: null,
    }));

    setActiveTab('device');
  };

  const handleTriggerSimulatedAlert = (
    type: 'spaghetti' | 'filament_runout' | 'complete'
  ) => {
    if (type === 'spaghetti') {
      const updatedTelemetry: PrinterTelemetry = {
        ...telemetry,
        state: 'ALERT_PAUSED',
        substage: 'AI Spaghetti Guard Triggered · Toolhead Parked',
        spaghettiConfidencePct: 86,
      };
      setTelemetry(updatedTelemetry);
      const newAlerts = evaluatePrinterAlerts(
        updatedTelemetry,
        amsSlots,
        alertRules
      );
      if (newAlerts.length > 0) {
        setAlertEvents((prev) => [...newAlerts, ...prev]);
      }
    } else if (type === 'filament_runout') {
      const activeSlotId = telemetry.activeAmsSlot;
      const updatedSlots = amsSlots.map((s) =>
        s.id === activeSlotId ? { ...s, remainingPct: 2 } : s
      );
      setAmsSlots(updatedSlots);
      const updatedTelemetry: PrinterTelemetry = {
        ...telemetry,
        state: 'ALERT_PAUSED',
        substage: `AMS Slot A${activeSlotId} Low Filament Guard`,
      };
      setTelemetry(updatedTelemetry);
      const newAlerts = evaluatePrinterAlerts(
        updatedTelemetry,
        updatedSlots,
        alertRules
      );
      if (newAlerts.length > 0) {
        setAlertEvents((prev) => [...newAlerts, ...prev]);
      }
    } else if (type === 'complete') {
      const baseCompleted: PrinterTelemetry = {
        ...telemetry,
        state: 'COMPLETED',
        substage: telemetry.timelapseEnabled
          ? 'Finished · 1080p Chamber Timelapse Compiled (.webm)'
          : 'Finished · Textured PEI Plate Cooling',
        progressPct: 100,
        currentLayer: telemetry.totalLayers,
        timelapseFramesCaptured: telemetry.timelapseEnabled
          ? telemetry.totalLayers
          : telemetry.timelapseFramesCaptured,
        remainingSeconds: 0,
        bedTempActual: 38,
        bedTempTarget: 0,
        nozzleTempActual: 45,
        nozzleTempTarget: 0,
        spaghettiConfidencePct: 0,
        zHeightMm: Number((telemetry.totalLayers * settings.layerHeight).toFixed(2)),
      };
      const compiledMeta = buildTimelapseMetadataOnCompletion(baseCompleted);
      const updatedTelemetry: PrinterTelemetry = {
        ...baseCompleted,
        latestTimelapseVideo: compiledMeta,
      };
      setTelemetry(updatedTelemetry);
      setPrintQueue((prev) =>
        prev.map((item) =>
          item.status === 'printing'
            ? { ...item, status: 'completed' as const }
            : item
        )
      );

      if (compiledMeta) {
        void generateTimelapseVideoBlobUrl(updatedTelemetry, amsSlots).then(
          (videoUrl) => {
            setTelemetry((curr) =>
              curr.latestTimelapseVideo
                ? {
                    ...curr,
                    latestTimelapseVideo: {
                      ...curr.latestTimelapseVideo,
                      videoUrl,
                    },
                  }
                : curr
            );
          }
        );
      }

      const newAlerts = evaluatePrinterAlerts(
        updatedTelemetry,
        amsSlots,
        alertRules
      );
      if (newAlerts.length > 0) {
        setAlertEvents((prev) => [...newAlerts, ...prev]);
      }
    }
  };

  const unacknowledgedAlerts = alertEvents.filter((e) => !e.acknowledged);
  const topActiveAlert = unacknowledgedAlerts[0] || null;

  return (
    <div className="w-screen h-screen bg-[#0b0f17] text-slate-100 flex flex-col overflow-hidden">
      {/* Strictly Compliant 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-[#0f172a] border-b border-slate-800 shrink-0">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#prepare"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('prepare');
          }}
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          CarbonSlice X1
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="flex items-center gap-6 text-sm font-medium text-slate-400"
        >
          <a
            href="#prepare"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('prepare');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'prepare'
                ? 'text-emerald-400 border-emerald-400 font-semibold'
                : 'border-transparent hover:text-slate-100'
            }`}
          >
            Prepare
          </a>
          <a
            href="#preview"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('preview');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'preview'
                ? 'text-emerald-400 border-emerald-400 font-semibold'
                : 'border-transparent hover:text-slate-100'
            }`}
          >
            Preview
          </a>
          <a
            href="#filaments"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('filaments');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'filaments'
                ? 'text-emerald-400 border-emerald-400 font-semibold'
                : 'border-transparent hover:text-slate-100'
            }`}
          >
            Filaments
          </a>
          <a
            href="#device"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('device');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'device'
                ? 'text-emerald-400 border-emerald-400 font-semibold'
                : 'border-transparent hover:text-slate-100'
            }`}
          >
            Device
          </a>
          <a
            href="#alerts"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('alerts');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'alerts'
                ? 'text-emerald-400 border-emerald-400 font-semibold'
                : 'border-transparent hover:text-slate-100'
            }`}
          >
            Alerts{unacknowledgedAlerts.length > 0 ? ` (${unacknowledgedAlerts.length})` : ''}
          </a>
        </nav>

        {/* Zone 3: Bambu Account & Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setAccountModalOpen(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              bambuAccount.isLoggedIn
                ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-emerald-950/40 hover:bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
            }`}
            title="Bambu Studio Cloud Account & Wireless Settings"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {bambuAccount.isLoggedIn ? bambuAccount.nickname : 'Bambu Login'}
            </span>
            {bambuAccount.isLoggedIn && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          {activeTab === 'prepare' ? (
            <div className="flex items-center gap-2 shrink-0">
              {plates.length > 1 && (
                <button
                  type="button"
                  onClick={handleTriggerSliceAll}
                  className="px-3.5 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/70 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Slice All Plates ({plates.length})
                </button>
              )}
              <button
                type="button"
                onClick={handleTriggerSlice}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Slice Plate {activePlateId}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSendModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {sliceAllMode && plates.length > 1
                ? `Print Queue (${plates.length} Plates)`
                : `Print Plate ${activePlateId}`}
            </button>
          )}
        </div>
      </header>

      {/* Automated Alert Notification Banner (if an unacknowledged alert is active) */}
      {topActiveAlert && (
        <div
          role="region"
          aria-label="Active Printer Alert Notification"
          className={`px-6 py-2.5 border-b flex items-center justify-between gap-4 shrink-0 ${
            topActiveAlert.severity === 'critical'
              ? 'bg-rose-950/90 border-rose-800 text-rose-100'
              : topActiveAlert.severity === 'warning'
              ? 'bg-amber-950/90 border-amber-800 text-amber-100'
              : 'bg-emerald-950/90 border-emerald-800 text-emerald-100'
          }`}
        >
          <div className="flex items-center gap-3 text-xs min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <div className="truncate">
              <span className="font-bold">{topActiveAlert.title}:</span>{' '}
              <span>{topActiveAlert.message}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className="px-2.5 py-1 text-xs font-medium bg-black/30 hover:bg-black/50 rounded transition-colors whitespace-nowrap"
            >
              Inspect Alert
            </button>
            <button
              type="button"
              onClick={() =>
                setAlertEvents((prev) =>
                  prev.map((ev) =>
                    ev.id === topActiveAlert.id
                      ? { ...ev, acknowledged: true }
                      : ev
                  )
                )
              }
              className="px-2.5 py-1 text-xs font-semibold bg-white/15 hover:bg-white/25 rounded transition-colors whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      <main className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* PREPARE OR PREVIEW WORKSPACE */}
        {(activeTab === 'prepare' || activeTab === 'preview') && (
          <>
            {activeTab === 'prepare' ? (
              <SlicerSidebar
                plates={plates}
                activePlateId={activePlateId}
                onSelectPlate={setActivePlateId}
                onAddPlate={handleAddPlate}
                onDeletePlate={handleDeletePlate}
                onDuplicatePlate={handleDuplicatePlate}
                onRenamePlate={handleRenamePlate}
                onMoveObjectToPlate={handleMoveObjectToPlate}
                onLoadMultiPlateSample={handleLoadMultiPlateSample}
                onSliceAllPlates={handleTriggerSliceAll}
                amsSlots={amsSlots}
                onUpdateAmsSlot={(slotId, patch) =>
                  setAmsSlots((prev) =>
                    prev.map((s) => (s.id === slotId ? { ...s, ...patch } : s))
                  )
                }
                profiles={filamentProfiles}
                onApplyProfileToSlot={handleApplyProfileToSlot}
                onOpenProfilesTab={() => setActiveTab('filaments')}
                settings={settings}
                onUpdateSettings={(patch) =>
                  setSettings((prev) => ({ ...prev, ...patch }))
                }
                onSelectPrinterModel={handleSelectPrinterModel}
                objects={objects}
                selectedObjectId={selectedObjectId}
                onSelectObject={(id) => setSelectedObjectId(id)}
                onAssignObjectAmsSlot={(objId, slotId) =>
                  setObjects((prev) =>
                    prev.map((o) =>
                      o.id === objId ? { ...o, amsSlotId: slotId } : o
                    )
                  )
                }
                onToggleObjectVisible={(objId) =>
                  setObjects((prev) =>
                    prev.map((o) =>
                      o.id === objId ? { ...o, visible: !o.visible } : o
                    )
                  )
                }
                onCloneObject={handleCloneObject}
                onDeleteObject={handleDeleteObject}
                onAddPresetModel={handleAddPresetModel}
                onUploadFiles={handleUploadFiles}
                uploadError={uploadError}
                autoRepairOnImport={autoRepairOnImport}
                onToggleAutoRepairOnImport={setAutoRepairOnImport}
                onOpenMeshRepairModal={(objId) => {
                  if (objId) setSelectedObjectId(objId);
                  setMeshRepairModalOpen(true);
                }}
                onLoadDamagedSampleStl={handleLoadDamagedSampleStl}
              />
            ) : (
              /* PREVIEW SIDEBAR: G-Code Line Type Breakdown & Slice Estimate */
              <aside
                aria-label="Sliced G-Code Preview Summary"
                className="w-[340px] shrink-0 h-full bg-[#0f172a] border-r border-slate-800 flex flex-col overflow-y-auto divide-y divide-slate-800"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-100">
                      {sliceAllMode && plates.length > 1
                        ? `All Plates Sliced (${plates.length} Plates)`
                        : 'Sliced Toolpath Summary'}
                    </h2>
                    <span className="text-xs font-mono text-emerald-400 tabular-nums">
                      {sliceAllMode && plates.length > 1
                        ? `${multiPlateSliceResult.totalLayersAcrossPlates} Total Layers`
                        : `${sliceResult.totalLayers} Layers`}
                    </span>
                  </div>

                  {/* Multi-Plate Slice Mode Switcher when more than 1 plate exists */}
                  {plates.length > 1 && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setSliceAllMode(false)}
                          className={`py-1.5 text-[11px] font-medium rounded transition-colors ${
                            !sliceAllMode
                              ? 'bg-slate-800 text-emerald-400 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Single (Plate {activePlateId})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSliceAllMode(true)}
                          className={`py-1.5 text-[11px] font-medium rounded transition-colors ${
                            sliceAllMode
                              ? 'bg-slate-800 text-emerald-400 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          All Plates ({plates.length})
                        </button>
                      </div>

                      {sliceAllMode && (
                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                          <div className="text-[11px] font-semibold text-emerald-400">
                            Sliced Plates Breakdown (Click to inspect 3D plate):
                          </div>
                          {multiPlateSliceResult.plates.map((ps, idx) => (
                            <button
                              key={ps.plateId}
                              type="button"
                              onClick={() => setActivePlateId(ps.plateId)}
                              className={`w-full text-left px-2 py-1.5 rounded border text-xs flex items-center justify-between transition-colors ${
                                activePlateId === ps.plateId
                                  ? 'bg-emerald-950/35 border-emerald-500/70 text-slate-100'
                                  : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <span className="truncate font-medium">
                                #{idx + 1} {ps.plateName}
                              </span>
                              <span className="font-mono text-[11px] text-emerald-400 shrink-0 tabular-nums">
                                {ps.sliceResult.formattedTime} · {ps.sliceResult.totalFilamentGrams}g
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Primary Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2.5 font-mono tabular-nums">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="text-[11px] text-slate-400">
                        {sliceAllMode && plates.length > 1
                          ? 'Total Queue Time'
                          : 'Est. Print Time'}
                      </div>
                      <div className="text-base font-bold text-emerald-400 mt-0.5">
                        {sliceAllMode && plates.length > 1
                          ? multiPlateSliceResult.formattedTotalTime
                          : sliceResult.formattedTime}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="text-[11px] text-slate-400">Total Filament</div>
                      <div className="text-base font-bold text-slate-100 mt-0.5">
                        {sliceAllMode && plates.length > 1
                          ? multiPlateSliceResult.totalFilamentGrams
                          : sliceResult.totalFilamentGrams}{' '}
                        g
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="text-[11px] text-slate-400">Filament Length</div>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">
                        {sliceAllMode && plates.length > 1
                          ? multiPlateSliceResult.totalFilamentMeters
                          : sliceResult.totalFilamentMeters}{' '}
                        m
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="text-[11px] text-slate-400">Material Cost</div>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">
                        $
                        {(sliceAllMode && plates.length > 1
                          ? multiPlateSliceResult.totalEstimatedCostUsd
                          : sliceResult.estimatedCostUsd
                        ).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line Type Color Scheme Breakdown */}
                <div className="p-4 space-y-3">
                  <div className="text-xs font-semibold text-slate-200">
                    Line Type Toolpath Breakdown (Plate {activePlateId})
                  </div>

                  <div className="space-y-2">
                    {sliceResult.lineBreakdown.map((item) => (
                      <div key={item.type} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-xs shrink-0"
                              style={{ backgroundColor: item.colorHex }}
                            />
                            <span className="text-slate-200">{item.type}</span>
                          </div>
                          <span className="font-mono text-slate-400 tabular-nums">
                            {formatDuration(item.timeSeconds)} · {item.percentage}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${Math.max(4, item.percentage)}%`,
                              backgroundColor: item.colorHex,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* G-Code Machine Preview Snippet */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">
                      Bambu X1C G-Code Header
                    </span>
                    <button
                      type="button"
                      onClick={handleExportGcodeFile}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export .gcode
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                    {sliceResult.gcodePreviewLines.join('\n')}
                  </pre>
                </div>

                {/* Primary Dispatch CTA */}
                <div className="p-4 mt-auto">
                  <button
                    type="button"
                    onClick={() => setSendModalOpen(true)}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sliceAllMode && plates.length > 1
                      ? `Send All ${plates.length} Plates to Print Queue`
                      : 'Send Print Job to Bambu X1C'}
                  </button>
                </div>
              </aside>
            )}

            {/* Central 100% Unobstructed 3D Build Plate Viewport */}
            <div className="flex-1 relative h-full min-w-0">
              <BuildPlateViewport
                objects={activePlateObjects}
                selectedObjectId={selectedObjectId}
                onSelectObject={(id) => setSelectedObjectId(id)}
                onMoveObject={handleMoveObjectOnPlate}
                onContextMenuObject={(id, clientX, clientY) => {
                  setSelectedObjectId(id);
                  setContextMenuState({ objectId: id, clientX, clientY });
                }}
                amsSlots={amsSlots}
                settings={settings}
                activeTab={activeTab}
                previewLayer={previewLayer}
                totalLayers={sliceResult.totalLayers}
                cameraPreset={cameraPreset}
                onCameraPresetHandled={() => {}}
                wireframeMode={wireframeMode}
                showToolheadInPreview={showToolheadInPreview}
              />

              {/* Minimal Top-Left Spec Readout */}
              <div
                data-testid="viewport-printer-spec-badge"
                className="absolute top-4 left-4 pointer-events-none flex items-center gap-2 text-xs font-mono text-slate-300 bg-[#0f172a] border border-slate-800 px-3 py-1.5 rounded-lg"
              >
                <span className="text-emerald-400 font-semibold">{activePrinterSpec.id}</span>
                <span>({activePrinterSpec.buildVolume.x}×{activePrinterSpec.buildVolume.y}×{activePrinterSpec.buildVolume.z}mm)</span>
                <span>·</span>
                <span>
                  Plate {activePlateId} of {plates.length}: {plates.find((p) => p.id === activePlateId)?.name || `Plate ${activePlateId}`}
                </span>
                <span>·</span>
                <span>{settings.plateType}</span>
                <span>·</span>
                <span>{settings.layerHeight.toFixed(2)}mm Layer</span>
              </div>

              {/* Optional Picture-in-Picture Live Chamber Camera Feed (Top-Right when enabled) */}
              {pipCameraOpen && (
                <div className="absolute top-4 right-4 w-72 bg-[#0f172a] border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                  <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      X1C Live Chamber Feed
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Open Full Device Monitor"
                        onClick={() => setActiveTab('device')}
                        className="p-1 text-slate-400 hover:text-slate-100"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        aria-label="Hide Picture-in-Picture Camera"
                        onClick={() => setPipCameraOpen(false)}
                        className="p-1 text-slate-400 hover:text-slate-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="aspect-video w-full bg-slate-950">
                    <ChamberCameraCanvas
                      telemetry={telemetry}
                      activeObjects={activePlateObjects}
                      amsSlots={amsSlots}
                      compact
                    />
                  </div>
                  <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-300 tabular-nums">
                    <span>
                      Nozzle {telemetry.nozzleTempActual}°C · Bed {telemetry.bedTempActual}°C
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      {telemetry.progressPct}%
                    </span>
                  </div>
                </div>
              )}

              {/* Unified Collapsible Bottom Control Dock (Zero Side-Flank Clutter) */}
              <div
                style={{
                  bottom: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  maxWidth: 'min(940px, 94vw)',
                }}
                className="absolute z-20 w-full flex flex-col items-center pointer-events-none"
              >
                {/* Collapse / Expand Drawer Toggle Button */}
                <button
                  type="button"
                  onClick={() => setDockCollapsed((prev) => !prev)}
                  className="pointer-events-auto px-3.5 py-1 text-xs font-medium text-slate-200 bg-[#0f172a] hover:bg-slate-800 border border-b-0 border-slate-700 rounded-t-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  {dockCollapsed ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                      ▴ Show Controls (H)
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                      ▾ Hide Controls (H)
                    </>
                  )}
                </button>

                {/* Dock Body */}
                {!dockCollapsed && (
                  <div className="pointer-events-auto w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 shadow-2xl space-y-2.5">
                    {activeTab === 'preview' ? (
                      /* PREVIEW MODE DOCK: Layer Scrubber Slider & Toolhead Toggle */
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                          <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
                            Layer Inspector:
                          </span>
                          <input
                            type="range"
                            aria-label="Inspect Sliced Layer Number"
                            min={1}
                            max={Math.max(1, sliceResult.totalLayers)}
                            value={previewLayer}
                            onChange={(e) => setPreviewLayer(Number(e.target.value))}
                            className="flex-1 accent-emerald-500"
                          />
                          <span className="text-xs font-mono text-emerald-400 font-semibold tabular-nums whitespace-nowrap">
                            Layer {previewLayer} / {sliceResult.totalLayers} (
                            {(previewLayer * settings.layerHeight).toFixed(2)} mm)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setShowToolheadInPreview((prev) => !prev)
                            }
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                              showToolheadInPreview
                                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                                : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}
                          >
                            X1C Toolhead: {showToolheadInPreview ? 'Visible' : 'Hidden'}
                          </button>

                          {(['iso', 'top', 'front', 'right'] as const).map(
                            (preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setCameraPreset(preset)}
                                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border uppercase transition-colors whitespace-nowrap shrink-0 ${
                                  cameraPreset === preset
                                    ? 'bg-slate-800 border-slate-600 text-slate-100'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {preset}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ) : (
                      /* PREPARE MODE DOCK: Object Transform Controls + Plate Actions + Camera Presets */
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Selected Object Transform Inputs */}
                        {selectedObject ? (
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            <div className="font-semibold text-emerald-400 truncate max-w-[150px]">
                              {selectedObject.name}
                            </div>

                            <label className="flex items-center gap-1 text-slate-400 font-mono">
                              <span>X:</span>
                              <input
                                type="number"
                                aria-label="Object X Position mm"
                                value={selectedObject.position.x}
                                onChange={(e) =>
                                  handleUpdateSelectedObject({
                                    position: {
                                      ...selectedObject.position,
                                      x: Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-14 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-slate-100 text-xs"
                              />
                            </label>

                            <label className="flex items-center gap-1 text-slate-400 font-mono">
                              <span>Y:</span>
                              <input
                                type="number"
                                aria-label="Object Y Position mm"
                                value={selectedObject.position.y}
                                onChange={(e) =>
                                  handleUpdateSelectedObject({
                                    position: {
                                      ...selectedObject.position,
                                      y: Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-14 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-slate-100 text-xs"
                              />
                            </label>

                            <label className="flex items-center gap-1 text-slate-400 font-mono">
                              <span>Rot Z°:</span>
                              <input
                                type="number"
                                aria-label="Object Z Rotation degrees"
                                step={15}
                                value={selectedObject.rotation.z}
                                onChange={(e) =>
                                  handleUpdateSelectedObject({
                                    rotation: {
                                      ...selectedObject.rotation,
                                      z: Number(e.target.value),
                                    },
                                  })
                                }
                                className="w-14 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-slate-100 text-xs"
                              />
                            </label>

                            <label className="flex items-center gap-1 text-slate-400 font-mono">
                              <span>Scale %:</span>
                              <input
                                type="number"
                                aria-label="Object Uniform Scale Percentage"
                                min={10}
                                max={300}
                                step={10}
                                value={Math.round(selectedObject.scale.x * 100)}
                                onChange={(e) => {
                                  const factor = Math.max(
                                    0.1,
                                    Number(e.target.value) / 100
                                  );
                                  handleUpdateSelectedObject({
                                    scale: { x: factor, y: factor, z: factor },
                                  });
                                }}
                                className="w-16 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-slate-100 text-xs"
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">
                            Select a 3MF/STL model on the plate to transform
                          </div>
                        )}

                        {/* Plate Arrangement & Camera Controls */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setObjects((prev) =>
                                autoArrangeObjectsOnPlate(
                                  prev,
                                  activePrinterSpec.buildVolume
                                )
                              )
                            }
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                          >
                            Auto-Arrange
                          </button>

                          {selectedObject && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSelectedObject({
                                    rotation: { x: 0, y: 0, z: 0 },
                                    position: {
                                      ...selectedObject.position,
                                      z: 0,
                                    },
                                  })
                                }
                                className="px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                              >
                                Lay Flat
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setContextMenuState({
                                    objectId: selectedObject.id,
                                    clientX: rect.left,
                                    clientY: Math.max(20, rect.top - 480),
                                  });
                                }}
                                className="px-2.5 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-600/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                                title="Right-Click Object Actions (Copy, Mirror, Scale, Overrides)"
                              >
                                Object Menu ▾
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setWireframeMode((prev) => !prev)}
                            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                              wireframeMode
                                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Wireframe
                          </button>

                          {!pipCameraOpen && (
                            <button
                              type="button"
                              onClick={() => setPipCameraOpen(true)}
                              className="px-2.5 py-1.5 text-xs font-medium text-emerald-300 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                            >
                              Show Cam
                            </button>
                          )}

                          {(['iso', 'top', 'front', 'right'] as const).map(
                            (preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setCameraPreset(preset)}
                                className={`px-2 py-1.5 text-xs font-medium rounded-lg border uppercase transition-colors whitespace-nowrap shrink-0 ${
                                  cameraPreset === preset
                                    ? 'bg-slate-800 border-slate-600 text-slate-100'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {preset}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* FILAMENT MATERIAL PROFILES STUDIO TAB */}
        {activeTab === 'filaments' && (
          <MaterialProfilesView
            profiles={filamentProfiles}
            selectedProfileId={selectedProfileId}
            onSelectProfile={setSelectedProfileId}
            onSaveProfile={handleSaveFilamentProfile}
            onDeleteProfile={handleDeleteFilamentProfile}
            amsSlots={amsSlots}
            onApplyProfileToSlot={handleApplyProfileToSlot}
          />
        )}

        {/* DEVICE & LIVE CHAMBER CAMERA MONITOR TAB */}
        {activeTab === 'device' && (
          <DeviceMonitorView
            printerConfig={printerConfig}
            onUpdatePrinterConfig={(cfg) => {
              setPrinterConfig(cfg);
              if (cfg.model !== settings.printerModel) {
                setSettings((prev) => ({
                  ...prev,
                  printerModel: cfg.model,
                }));
              }
            }}
            telemetry={telemetry}
            onUpdateTelemetry={setTelemetry}
            amsSlots={amsSlots}
            onUpdateAmsSlot={(slotId, patch) =>
              setAmsSlots((prev) =>
                prev.map((s) => (s.id === slotId ? { ...s, ...patch } : s))
              )
            }
            activeObjects={activePlateObjects}
            onTriggerSimulatedAlert={handleTriggerSimulatedAlert}
            account={bambuAccount}
            onOpenAccountModal={() => setAccountModalOpen(true)}
            printQueue={printQueue}
            onStartNextQueueItem={handleStartNextQueueItem}
            onRemoveQueueItem={handleRemoveQueueItem}
            onMoveQueueItem={handleMoveQueueItem}
            onClearCompletedQueue={handleClearCompletedQueue}
          />
        )}

        {/* AUTOMATED ALERTS & GUARDRAILS TAB */}
        {activeTab === 'alerts' && (
          <AlertsCenterView
            rules={alertRules}
            onToggleRule={(ruleId, field) =>
              setAlertRules((prev) =>
                prev.map((r) =>
                  r.id === ruleId ? { ...r, [field]: !r[field] } : r
                )
              )
            }
            events={alertEvents}
            onAcknowledgeEvent={(eventId) =>
              setAlertEvents((prev) =>
                prev.map((ev) =>
                  ev.id === eventId ? { ...ev, acknowledged: true } : ev
                )
              )
            }
            onAcknowledgeAll={() =>
              setAlertEvents((prev) =>
                prev.map((ev) => ({ ...ev, acknowledged: true }))
              )
            }
            onClearAcknowledged={() =>
              setAlertEvents((prev) => prev.filter((ev) => !ev.acknowledged))
            }
            onTriggerSimulatedAlert={handleTriggerSimulatedAlert}
          />
        )}
      </main>

      {/* Wireless Send-to-Printer Modal */}
      <SendToPrinterModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        sliceResult={sliceResult}
        multiPlateSliceResult={multiPlateSliceResult}
        sliceAllMode={sliceAllMode}
        printerConfig={printerConfig}
        amsSlots={amsSlots}
        account={bambuAccount}
        onOpenAccountModal={() => setAccountModalOpen(true)}
        plates={plates}
        activePlateId={activePlateId}
        initialTimelapseEnabled={telemetry.timelapseEnabled}
        initialTimelapseMode={telemetry.timelapseMode}
        initialTimelapseFps={telemetry.timelapseFps}
        onToggleTimelapseImmediate={(enabled, mode, fps) =>
          setTelemetry((prev) => ({
            ...prev,
            timelapseEnabled: enabled,
            timelapseMode: mode,
            timelapseFps: fps,
          }))
        }
        onConfirmSendPrint={handleConfirmSendPrint}
      />

      {/* STL / 3MF Mesh Diagnostics & Manual Repair Studio Modal */}
      <MeshRepairModal
        isOpen={meshRepairModalOpen}
        onClose={() => setMeshRepairModalOpen(false)}
        selectedObject={selectedObject}
        objects={objects}
        onSelectObject={(id) => setSelectedObjectId(id)}
        autoRepairOnImport={autoRepairOnImport}
        onToggleAutoRepairOnImport={setAutoRepairOnImport}
        onRunManualRepair={handleRunManualRepair}
        onRestoreOriginalMesh={handleRestoreOriginalMesh}
        onLoadDamagedSampleStl={handleLoadDamagedSampleStl}
      />

      {/* Bambu Studio Cloud Account & Printer Binding Modal */}
      <BambuAccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        account={bambuAccount}
        onUpdateAccount={setBambuAccount}
        onSelectActivePrinter={(p) => {
          handleSelectPrinterModel(p.model);
          setPrinterConfig((prev) => ({
            ...prev,
            printerName: p.name,
            model: p.model,
            serialNumber: p.devId,
            lanIp: p.ip,
            accessCode: p.accessCode,
          }));
        }}
      />

      {/* Right-Click Plate Object Context Menu */}
      {contextMenuState &&
        (() => {
          const menuObj = objects.find(
            (o) => o.id === contextMenuState.objectId
          );
          if (!menuObj) return null;
          return (
            <PlateObjectContextMenu
              object={menuObj}
              clientX={contextMenuState.clientX}
              clientY={contextMenuState.clientY}
              amsSlots={amsSlots}
              plates={plates}
              activePlateId={activePlateId}
              settings={settings}
              onClose={() => setContextMenuState(null)}
              onCopyObject={handleCloneObject}
              onCloneMulti={handleCloneMulti}
              onFillPlateWithCopies={handleFillPlateWithCopies}
              onMirrorObject={handleMirrorObject}
              onCenterObject={handleCenterObject}
              onLayFlatObject={handleLayFlatObject}
              onResetTransform={handleResetTransform}
              onRotateZDelta={handleRotateZDelta}
              onScalePreset={handleScalePreset}
              onAssignAmsSlot={(objId, slotId) =>
                handleUpdateObjectById(objId, { amsSlotId: slotId })
              }
              onUpdateObjectPatch={handleUpdateObjectById}
              onMoveToPlate={handleMoveObjectToPlate}
              onMoveToNewPlate={handleMoveObjectToNewPlate}
              onOpenMeshRepair={(objId) => {
                setSelectedObjectId(objId);
                setMeshRepairModalOpen(true);
              }}
              onExportObjectStl={handleExportObjectStl}
              onDeleteObject={handleDeleteObject}
            />
          );
        })()}
    </div>
  );
}
