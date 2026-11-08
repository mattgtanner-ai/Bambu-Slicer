export type WorkspaceTab = 'prepare' | 'preview' | 'filaments' | 'device' | 'alerts';

export type TransformMode = 'translate' | 'rotate' | 'scale';

export type CameraPreset = 'iso' | 'top' | 'front' | 'right';

export type SupportType = 'none' | 'normal_auto' | 'tree_auto' | 'tree_organic';

export type InfillPattern = 'gyroid' | 'grid' | 'cubic' | 'adaptive_cubic' | 'honeycomb' | 'lightning';

export type SpeedProfile = 'silent' | 'standard' | 'sport' | 'ludicrous';

export type FilamentMaterialFamily =
  | 'PLA Basic'
  | 'PLA-CF'
  | 'PETG-CF'
  | 'ABS'
  | 'ASA'
  | 'PAHT-CF'
  | 'TPU 95A'
  | 'PVA Support';

export interface FilamentProfile {
  id: string;
  name: string;
  vendor: string;
  material: FilamentMaterialFamily;
  colorName: string;
  colorHex: string;
  nozzleTemp: number; // Target printing nozzle temp (°C), e.g. 220
  nozzleTempMin: number;
  nozzleTempMax: number;
  bedTemp: number; // Target Textured PEI bed temp (°C), e.g. 55
  printSpeedMmS: number; // Default print speed (mm/s), e.g. 200
  retractionDistanceMm: number; // Direct-drive retraction length (mm), e.g. 0.8
  retractionSpeedMmS: number; // Retraction speed (mm/s), e.g. 30
  maxVolumetricSpeed: number; // mm^3/s, e.g. 21
  densityGcm3: number;
  costPerKg: number;
  kFactor: number; // Bambu LiDAR K-factor
  partFanPct: number;
  isCustom?: boolean;
}

export interface AmsSlot {
  id: number; // 1 to 4
  profileId?: string;
  material: FilamentMaterialFamily;
  colorName: string;
  colorHex: string;
  nozzleTemp?: number;
  nozzleTempMin: number;
  nozzleTempMax: number;
  bedTemp: number;
  printSpeedMmS?: number;
  retractionDistanceMm?: number;
  remainingPct: number; // 0 - 100
  densityGcm3: number;
  costPerKg: number;
  kFactor: number; // Bambu Flow Dynamics LiDAR K-factor (e.g. 0.020)
}

export interface CustomMeshGeometry {
  positions: Float32Array;
  normals?: Float32Array;
  vertexCount: number;
  triangleCount: number;
}

export interface MeshDiagnosticsReport {
  totalTriangles: number;
  uniqueVertices: number;
  nonManifoldEdges: number;
  openBoundaryEdges: number;
  estimatedHoles: number;
  invertedNormals: number;
  degenerateTriangles: number;
  duplicateTriangles: number;
  isWatertight: boolean;
  healthScore: number; // 0 to 100
  status: 'manifold' | 'repaired' | 'needs_repair';
  repairHistory: string[];
  lastAnalyzedAtIso: string;
}

export interface ManualRepairOptions {
  closeHoles: boolean;
  fixNormals: boolean;
  removeDegenerate: boolean;
  removeDuplicates: boolean;
  weldVertices: boolean;
  weldToleranceMm: number; // e.g. 0.001 to 0.5 mm
}

export type PresetShapeType =
  | 'bambu_scraper'
  | 'benchy_hull'
  | 'planetary_gear'
  | 'voronoi_vase'
  | 'ams_ desiccant_pod'
  | 'calibration_cube'
  | 'custom_mesh';

export interface BuildPlate {
  id: number; // 1 to 9
  name: string; // e.g. "Plate 1", "Plate 2 - Cabin"
  plateType: 'Textured PEI Plate' | 'Cool Plate' | 'Engineering Plate' | 'High Temp Plate';
}

export type BambuCloudRegion = 'global' | 'us' | 'eu' | 'cn';

export type BambuPrinterModelId =
  | 'Bambu Lab X1 Carbon'
  | 'Bambu Lab X1E'
  | 'Bambu Lab X1'
  | 'Bambu Lab P1S'
  | 'Bambu Lab P1P'
  | 'Bambu Lab A1'
  | 'Bambu Lab A1 mini'
  | 'Bambu Lab H2D';

export interface BambuPrinterModelSpec {
  id: BambuPrinterModelId;
  shortCode: string;
  series: 'X1 Series' | 'P1 Series' | 'A1 Series' | 'H2 Series';
  kinematics:
    | 'CoreXY Enclosed'
    | 'CoreXY Open-Frame'
    | 'Cartesian Bed-Slinger'
    | 'Dual-Nozzle CoreXY Enclosed';
  buildVolume: { x: number; y: number; z: number };
  maxNozzleTempC: number;
  maxBedTempC: number;
  maxSpeedMmS: number;
  maxAccelerationMmS2: number;
  hasMicroLidar: boolean;
  hasChamberHeater: boolean;
  amsSupportLabel: string;
  defaultNozzleMaterial: 'Hardened Steel' | 'Stainless Steel';
  cameraSpec: string;
}

export interface BambuBoundPrinter {
  devId: string; // Serial number (e.g. 00M09A351800421)
  name: string;
  model: BambuPrinterModelId;
  online: boolean;
  ip: string;
  accessCode: string;
  firmwareVersion: string;
  amsCount: number;
  cloudMqttHost: string;
  nozzleDiameter: number;
}

export interface BambuAccountProfile {
  isLoggedIn: boolean;
  accountEmail: string;
  nickname: string;
  avatarUrl?: string;
  bambuUserId: string;
  region: BambuCloudRegion;
  authToken: string;
  cloudPrintEnabled: boolean;
  boundPrinters: BambuBoundPrinter[];
  selectedPrinterDevId: string;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline';
  lastSyncedIso: string;
}

export interface PlateObject {
  id: string;
  name: string;
  sourceFormat: '3MF' | 'STL';
  presetType: PresetShapeType;
  amsSlotId: number; // 1 to 4
  plateId?: number; // 1 to 9 (which build plate this object belongs to, default 1)
  // Dimensions in mm before scale
  baseDims: { x: number; y: number; z: number };
  // Position on build plate in mm (center is 0,0)
  position: { x: number; y: number; z: number };
  // Euler rotation in degrees
  rotation: { x: number; y: number; z: number };
  // Uniform or axis scale factor (1.0 = 100%)
  scale: { x: number; y: number; z: number };
  // Mirror state per axis
  mirror?: { x: boolean; y: boolean; z: boolean };
  // Lock position on build plate against accidental dragging
  locked?: boolean;
  // Per-object slicer overrides
  brimOverride?: 'default' | 'enable' | 'disable';
  infillDensityOverride?: number;
  wallLoopsOverride?: number;
  triangles: number;
  visible: boolean;
  supportPainting?: boolean;
  customGeometry?: CustomMeshGeometry;
  originalPositions?: Float32Array;
  meshReport?: MeshDiagnosticsReport;
}

export interface SlicerProcessSettings {
  printerModel?: BambuPrinterModelId;
  nozzleDiameter: 0.2 | 0.4 | 0.6 | 0.8;
  plateType: 'Textured PEI Plate' | 'Cool Plate' | 'Engineering Plate' | 'High Temp Plate';
  layerHeight: number; // e.g., 0.08, 0.12, 0.16, 0.20, 0.24, 0.28
  initialLayerHeight: number;
  wallLoops: number; // 2 to 6
  topShellLayers: number;
  bottomShellLayers: number;
  infillDensity: number; // 0 to 100%
  infillPattern: InfillPattern;
  supportEnabled: boolean;
  supportType: SupportType;
  supportThresholdAngle: number;
  brimType: 'none' | 'auto' | 'outer_only' | 'inner_and_outer';
  brimWidthMm: number;
  primeTowerEnabled: boolean;
  outerWallSpeed: number; // mm/s
  innerWallSpeed: number; // mm/s
  sparseInfillSpeed: number; // mm/s
  travelSpeed: number; // mm/s
  maxAcceleration: number; // mm/s^2 (Bambu default 10000 - 20000)
  retractionDistanceMm?: number; // Direct-drive extruder retraction distance (mm), e.g. 0.8
  retractionSpeedMmS?: number; // Direct-drive retraction speed (mm/s), e.g. 30
}

export interface LineTypeBreakdown {
  type: 'Outer Wall' | 'Inner Wall' | 'Sparse Infill' | 'Internal Solid Infill' | 'Top Surface' | 'Bottom Surface' | 'Support' | 'Prime Tower';
  colorHex: string;
  timeSeconds: number;
  percentage: number;
  filamentGrams: number;
  lengthMeters: number;
}

export interface SliceResult {
  totalLayers: number;
  totalTimeSeconds: number;
  formattedTime: string;
  totalFilamentGrams: number;
  totalFilamentMeters: number;
  estimatedCostUsd: number;
  lineBreakdown: LineTypeBreakdown[];
  filamentBySlot: {
    slotId: number;
    material: string;
    colorHex: string;
    grams: number;
    meters: number;
  }[];
  gcodePreviewLines: string[];
  slicedAtIso: string;
}

export interface PrinterConnectionConfig {
  printerName: string;
  model: BambuPrinterModelId;
  serialNumber: string;
  lanIp: string;
  accessCode: string;
  connectionMode: 'bambu_lan_mqtt' | 'cloud_sync';
  connected: boolean;
}

export type TimelapseCaptureMode = 'smooth_park' | 'continuous_layer';

export interface TimelapseRecordMetadata {
  id: string;
  jobName: string;
  fileName: string;
  captureMode: TimelapseCaptureMode;
  fps: 30 | 60;
  resolution: '1080p';
  totalFrames: number;
  durationSeconds: number;
  fileSizeBytes: number;
  formattedFileSize: string;
  createdAtIso: string;
  videoUrl?: string;
}

export interface PrinterTelemetry {
  state: 'IDLE' | 'PREPARING' | 'CALIBRATING_LIDAR' | 'PRINTING' | 'PAUSED' | 'COMPLETED' | 'ALERT_PAUSED';
  activeJobName: string;
  substage: string;
  progressPct: number;
  currentLayer: number;
  totalLayers: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  nozzleTempActual: number;
  nozzleTempTarget: number;
  bedTempActual: number;
  bedTempTarget: number;
  chamberTempActual: number;
  partFanPct: number;
  auxFanPct: number;
  chamberFanPct: number;
  speedProfile: SpeedProfile;
  speedMultiplierPct: number;
  zHeightMm: number;
  activeAmsSlot: number;
  amsHumidityIndex: number; // 1 (dry) to 5 (wet)
  amsTempC: number;
  chamberLightOn: boolean;
  lidarOverlayOn: boolean;
  lidarFirstLayerScore: number; // 0.0 to 1.0 (1.0 = pristine, < 0.55 = spaghetti/adhesion anomaly)
  spaghettiConfidencePct: number; // 0 to 100%
  toolheadPos: { x: number; y: number; z: number };
  timelapseEnabled: boolean;
  timelapseMode: TimelapseCaptureMode;
  timelapseFps: 30 | 60;
  timelapseFramesCaptured: number;
  latestTimelapseVideo?: TimelapseRecordMetadata | null;
}

export type AlertCategory =
  | 'print_complete'
  | 'lidar_spaghetti'
  | 'filament_runout'
  | 'first_layer_inspection'
  | 'thermal_deviation'
  | 'ams_humidity';

export interface AlertRule {
  id: string;
  category: AlertCategory;
  name: string;
  description: string;
  enabled: boolean;
  autoPausePrinter: boolean;
  soundAlert: boolean;
  thresholdLabel: string;
}

export interface AlertEvent {
  id: string;
  category: AlertCategory;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestampIso: string;
  formattedTime: string;
  acknowledged: boolean;
  actionTaken?: string;
}

export interface PlateSliceSummary {
  plateId: number;
  plateName: string;
  objectCount: number;
  objectNames: string[];
  sliceResult: SliceResult;
}

export interface MultiPlateSliceResult {
  isMultiPlate: boolean;
  plates: PlateSliceSummary[];
  totalTimeSeconds: number;
  formattedTotalTime: string;
  totalFilamentGrams: number;
  totalFilamentMeters: number;
  totalEstimatedCostUsd: number;
  totalLayersAcrossPlates: number;
}

export interface PrintQueueItem {
  id: string;
  queueIndex: number;
  plateId: number;
  plateName: string;
  jobName: string;
  objectNames: string[];
  totalLayers: number;
  estimatedTimeSeconds: number;
  formattedTime: string;
  filamentGrams: number;
  status: 'printing' | 'queued' | 'paused' | 'completed';
  dispatchMode: 'bambu_cloud' | 'lan_mqtt';
  targetPrinterName: string;
  queuedAtIso: string;
}

export interface PrintJobDispatchOptions {
  dispatchMode?: 'bambu_cloud' | 'lan_mqtt';
  targetPrinterDevId?: string;
  targetPlateId?: number | 'all';
  targetPlateName?: string;
  queueAllPlates?: boolean;
  bedLeveling: boolean;
  flowDynamicsLidar: boolean;
  firstLayerInspection: boolean;
  timelapseRecording: boolean;
  timelapseMode?: TimelapseCaptureMode;
  timelapseFps?: 30 | 60;
  amsMapping: Record<number, number>;
}

