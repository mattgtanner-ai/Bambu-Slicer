import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import type {
  AmsSlot,
  AlertEvent,
  AlertRule,
  BambuAccountProfile,
  BambuBoundPrinter,
  BambuCloudRegion,
  BambuPrinterModelId,
  BambuPrinterModelSpec,
  BuildPlate,
  CustomMeshGeometry,
  FilamentProfile,
  LineTypeBreakdown,
  MultiPlateSliceResult,
  PlateObject,
  PlateSliceSummary,
  PrintQueueItem,
  PrinterTelemetry,
  SliceResult,
  SlicerProcessSettings,
  TimelapseRecordMetadata,
} from '../types/slicer';

export const BAMBU_X1C_PLATE_SIZE = {
  x: 256,
  y: 256,
  z: 256,
};

export const BAMBU_PRINTER_MODELS_CATALOG: BambuPrinterModelSpec[] = [
  {
    id: 'Bambu Lab X1 Carbon',
    shortCode: 'BBL X1C',
    series: 'X1 Series',
    kinematics: 'CoreXY Enclosed',
    buildVolume: { x: 256, y: 256, z: 256 },
    maxNozzleTempC: 300,
    maxBedTempC: 120,
    maxSpeedMmS: 500,
    maxAccelerationMmS2: 20000,
    hasMicroLidar: true,
    hasChamberHeater: false,
    amsSupportLabel: 'AMS / AMS 2 Pro (up to 4 units · 16 colors)',
    defaultNozzleMaterial: 'Hardened Steel',
    cameraSpec: '1080p Chamber Cam + AI Spaghetti Guard',
  },
  {
    id: 'Bambu Lab X1E',
    shortCode: 'BBL X1E',
    series: 'X1 Series',
    kinematics: 'CoreXY Enclosed',
    buildVolume: { x: 256, y: 256, z: 256 },
    maxNozzleTempC: 320,
    maxBedTempC: 120,
    maxSpeedMmS: 500,
    maxAccelerationMmS2: 20000,
    hasMicroLidar: true,
    hasChamberHeater: true,
    amsSupportLabel: 'AMS / AMS HT (up to 4 units · 16 colors)',
    defaultNozzleMaterial: 'Hardened Steel',
    cameraSpec: '1080p Chamber Cam + 60°C Active Heated Chamber',
  },
  {
    id: 'Bambu Lab X1',
    shortCode: 'BBL X1',
    series: 'X1 Series',
    kinematics: 'CoreXY Enclosed',
    buildVolume: { x: 256, y: 256, z: 256 },
    maxNozzleTempC: 300,
    maxBedTempC: 120,
    maxSpeedMmS: 500,
    maxAccelerationMmS2: 20000,
    hasMicroLidar: true,
    hasChamberHeater: false,
    amsSupportLabel: 'AMS (up to 4 units · 16 colors)',
    defaultNozzleMaterial: 'Stainless Steel',
    cameraSpec: '1080p Chamber Cam + Micro-LiDAR',
  },
  {
    id: 'Bambu Lab P1S',
    shortCode: 'BBL P1S',
    series: 'P1 Series',
    kinematics: 'CoreXY Enclosed',
    buildVolume: { x: 256, y: 256, z: 256 },
    maxNozzleTempC: 300,
    maxBedTempC: 100,
    maxSpeedMmS: 500,
    maxAccelerationMmS2: 20000,
    hasMicroLidar: false,
    hasChamberHeater: false,
    amsSupportLabel: 'AMS (up to 4 units · 16 colors)',
    defaultNozzleMaterial: 'Stainless Steel',
    cameraSpec: '720p Chamber Cam + Aux Part Cooling',
  },
  {
    id: 'Bambu Lab P1P',
    shortCode: 'BBL P1P',
    series: 'P1 Series',
    kinematics: 'CoreXY Open-Frame',
    buildVolume: { x: 256, y: 256, z: 256 },
    maxNozzleTempC: 300,
    maxBedTempC: 100,
    maxSpeedMmS: 500,
    maxAccelerationMmS2: 20000,
    hasMicroLidar: false,
    hasChamberHeater: false,
    amsSupportLabel: 'AMS (up to 4 units · 16 colors)',
    defaultNozzleMaterial: 'Stainless Steel',
    cameraSpec: '720p Chamber Cam (Open Frame)',
  },
  {
    id: 'Bambu Lab A1',
    shortCode: 'BBL A1',
    series: 'A1 Series',
    kinematics: 'Cartesian Bed-Slinger',
    buildVolume: { x: 256, y: 256, z: 256 },
    maxNozzleTempC: 300,
    maxBedTempC: 100,
    maxSpeedMmS: 500,
    maxAccelerationMmS2: 10000,
    hasMicroLidar: false,
    hasChamberHeater: false,
    amsSupportLabel: 'AMS lite (4-color Active Flow Rate)',
    defaultNozzleMaterial: 'Stainless Steel',
    cameraSpec: '1080p Nozzle-View Cam + Eddy Current Flow Sensor',
  },
  {
    id: 'Bambu Lab A1 mini',
    shortCode: 'BBL A1M',
    series: 'A1 Series',
    kinematics: 'Cartesian Bed-Slinger',
    buildVolume: { x: 180, y: 180, z: 180 },
    maxNozzleTempC: 300,
    maxBedTempC: 80,
    maxSpeedMmS: 500,
    maxAccelerationMmS2: 10000,
    hasMicroLidar: false,
    hasChamberHeater: false,
    amsSupportLabel: 'AMS lite (4-color Active Flow Rate)',
    defaultNozzleMaterial: 'Stainless Steel',
    cameraSpec: '1080p Bed-View Cam + Eddy Current Flow Sensor',
  },
  {
    id: 'Bambu Lab H2D',
    shortCode: 'BBL H2D',
    series: 'H2 Series',
    kinematics: 'Dual-Nozzle CoreXY Enclosed',
    buildVolume: { x: 350, y: 320, z: 325 },
    maxNozzleTempC: 350,
    maxBedTempC: 120,
    maxSpeedMmS: 600,
    maxAccelerationMmS2: 20000,
    hasMicroLidar: true,
    hasChamberHeater: true,
    amsSupportLabel: 'AMS 2 Pro / AMS HT (Dual Hotend · up to 24 colors)',
    defaultNozzleMaterial: 'Hardened Steel',
    cameraSpec: 'Dual 1080p AI Vision + 65°C Active Chamber',
  },
];

export function getBambuPrinterModelSpec(
  model?: BambuPrinterModelId | string
): BambuPrinterModelSpec {
  return (
    BAMBU_PRINTER_MODELS_CATALOG.find((m) => m.id === model) ||
    BAMBU_PRINTER_MODELS_CATALOG[0]
  );
}

export const MIN_PLATES_COUNT = 1;
export const MAX_PLATES_COUNT = 9;

export function clampPlateCount(count: number): number {
  if (isNaN(count)) return 1;
  return Math.max(MIN_PLATES_COUNT, Math.min(MAX_PLATES_COUNT, Math.floor(count)));
}

export const DEFAULT_BUILD_PLATES: BuildPlate[] = [
  { id: 1, name: 'Plate 1', plateType: 'Textured PEI Plate' },
];

export const DEFAULT_BAMBU_ACCOUNT: BambuAccountProfile = {
  isLoggedIn: true,
  accountEmail: 'bambu.maker@carbon-studio.io',
  nickname: 'StudioMaker_X1',
  bambuUserId: 'BBL-USR-94821',
  region: 'us',
  authToken: 'bbl_tk_98a72b0c41f84e82aa83d',
  cloudPrintEnabled: true,
  boundPrinters: [
    {
      devId: '00M09A351800421',
      name: 'Bambu Lab X1-Carbon (Studio Bay 01)',
      model: 'Bambu Lab X1 Carbon',
      online: true,
      ip: '192.168.1.142',
      accessCode: '38492017',
      firmwareVersion: '01.07.03.00 (Latest OTA)',
      amsCount: 1,
      cloudMqttHost: 'us.mqtt.bambulab.com',
      nozzleDiameter: 0.4,
    },
    {
      devId: '01P00A412900192',
      name: 'Bambu Lab P1S (Prototyping Rack)',
      model: 'Bambu Lab P1S',
      online: true,
      ip: '192.168.1.148',
      accessCode: '72910482',
      firmwareVersion: '01.05.02.00',
      amsCount: 1,
      cloudMqttHost: 'us.mqtt.bambulab.com',
      nozzleDiameter: 0.4,
    },
    {
      devId: '03A00C892100553',
      name: 'Bambu Lab A1 mini (Desk Portable)',
      model: 'Bambu Lab A1 mini',
      online: false,
      ip: '192.168.1.155',
      accessCode: '58291038',
      firmwareVersion: '01.03.01.00',
      amsCount: 0,
      cloudMqttHost: 'us.mqtt.bambulab.com',
      nozzleDiameter: 0.4,
    },
  ],
  selectedPrinterDevId: '00M09A351800421',
  cloudSyncStatus: 'synced',
  lastSyncedIso: new Date().toISOString(),
};

export const DEFAULT_FILAMENT_PROFILES: FilamentProfile[] = [
  {
    id: 'prof-bambu-pla-cf',
    name: 'Bambu PLA-CF @BBL X1C 0.4 Nozzle',
    vendor: 'Bambu Lab',
    material: 'PLA-CF',
    colorName: 'Carbon Black',
    colorHex: '#334155',
    nozzleTemp: 225,
    nozzleTempMin: 215,
    nozzleTempMax: 235,
    bedTemp: 55,
    printSpeedMmS: 200,
    retractionDistanceMm: 0.8,
    retractionSpeedMmS: 30,
    maxVolumetricSpeed: 18,
    densityGcm3: 1.22,
    costPerKg: 31.99,
    kFactor: 0.021,
    partFanPct: 100,
    isCustom: false,
  },
  {
    id: 'prof-bambu-pla-basic',
    name: 'Bambu PLA Basic High-Flow @BBL X1C',
    vendor: 'Bambu Lab',
    material: 'PLA Basic',
    colorName: 'Bambu Green',
    colorHex: '#10b981',
    nozzleTemp: 220,
    nozzleTempMin: 190,
    nozzleTempMax: 230,
    bedTemp: 55,
    printSpeedMmS: 250,
    retractionDistanceMm: 0.8,
    retractionSpeedMmS: 30,
    maxVolumetricSpeed: 21,
    densityGcm3: 1.24,
    costPerKg: 24.99,
    kFactor: 0.018,
    partFanPct: 100,
    isCustom: false,
  },
  {
    id: 'prof-bambu-petg-cf',
    name: 'Bambu PETG-CF Structural @BBL X1C',
    vendor: 'Bambu Lab',
    material: 'PETG-CF',
    colorName: 'Titanium Gray',
    colorHex: '#64748b',
    nozzleTemp: 255,
    nozzleTempMin: 235,
    nozzleTempMax: 265,
    bedTemp: 70,
    printSpeedMmS: 160,
    retractionDistanceMm: 1.2,
    retractionSpeedMmS: 35,
    maxVolumetricSpeed: 14,
    densityGcm3: 1.27,
    costPerKg: 34.99,
    kFactor: 0.026,
    partFanPct: 50,
    isCustom: false,
  },
  {
    id: 'prof-bambu-asa',
    name: 'Bambu ASA Weatherproof @BBL X1C',
    vendor: 'Bambu Lab',
    material: 'ASA',
    colorName: 'Signal Orange',
    colorHex: '#f97316',
    nozzleTemp: 260,
    nozzleTempMin: 245,
    nozzleTempMax: 270,
    bedTemp: 90,
    printSpeedMmS: 180,
    retractionDistanceMm: 0.6,
    retractionSpeedMmS: 30,
    maxVolumetricSpeed: 16,
    densityGcm3: 1.07,
    costPerKg: 29.99,
    kFactor: 0.022,
    partFanPct: 30,
    isCustom: false,
  },
  {
    id: 'prof-bambu-paht-cf',
    name: 'Bambu PAHT-CF High-Temp Nylon @BBL X1C',
    vendor: 'Bambu Lab',
    material: 'PAHT-CF',
    colorName: 'Matte Obsidian',
    colorHex: '#1e293b',
    nozzleTemp: 290,
    nozzleTempMin: 275,
    nozzleTempMax: 300,
    bedTemp: 100,
    printSpeedMmS: 120,
    retractionDistanceMm: 1.0,
    retractionSpeedMmS: 30,
    maxVolumetricSpeed: 11,
    densityGcm3: 1.25,
    costPerKg: 74.99,
    kFactor: 0.029,
    partFanPct: 20,
    isCustom: false,
  },
  {
    id: 'prof-bambu-tpu-95a',
    name: 'Bambu TPU 95A Direct-Drive Flex @BBL X1C',
    vendor: 'Bambu Lab',
    material: 'TPU 95A',
    colorName: 'Cyber Yellow',
    colorHex: '#eab308',
    nozzleTemp: 230,
    nozzleTempMin: 210,
    nozzleTempMax: 240,
    bedTemp: 40,
    printSpeedMmS: 75,
    retractionDistanceMm: 0.4,
    retractionSpeedMmS: 20,
    maxVolumetricSpeed: 4.5,
    densityGcm3: 1.21,
    costPerKg: 38.99,
    kFactor: 0.045,
    partFanPct: 80,
    isCustom: false,
  },
];

export function validateFilamentProfileInput(input: {
  name: string;
  nozzleTemp: number;
  bedTemp: number;
  printSpeedMmS: number;
  retractionDistanceMm: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.name || input.name.trim().length < 2) {
    errors.push('Profile name must be at least 2 characters.');
  }
  if (Number.isNaN(input.nozzleTemp) || input.nozzleTemp < 170 || input.nozzleTemp > 310) {
    errors.push('Nozzle temperature must be between 170°C and 310°C.');
  }
  if (Number.isNaN(input.bedTemp) || input.bedTemp < 0 || input.bedTemp > 120) {
    errors.push('Bed temperature must be between 0°C and 120°C.');
  }
  if (Number.isNaN(input.printSpeedMmS) || input.printSpeedMmS < 20 || input.printSpeedMmS > 500) {
    errors.push('Print speed must be between 20 mm/s and 500 mm/s.');
  }
  if (
    Number.isNaN(input.retractionDistanceMm) ||
    input.retractionDistanceMm < 0 ||
    input.retractionDistanceMm > 5
  ) {
    errors.push('Retraction distance must be between 0.0 mm and 5.0 mm.');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function applyProfileToSlotAndSettings(
  profile: FilamentProfile,
  slot: AmsSlot,
  currentSettings: SlicerProcessSettings
): { updatedSlot: AmsSlot; updatedSettings: SlicerProcessSettings } {
  const updatedSlot: AmsSlot = {
    ...slot,
    profileId: profile.id,
    material: profile.material,
    colorName: profile.colorName,
    colorHex: profile.colorHex,
    nozzleTemp: profile.nozzleTemp,
    nozzleTempMin: profile.nozzleTempMin,
    nozzleTempMax: profile.nozzleTempMax,
    bedTemp: profile.bedTemp,
    printSpeedMmS: profile.printSpeedMmS,
    retractionDistanceMm: profile.retractionDistanceMm,
    densityGcm3: profile.densityGcm3,
    costPerKg: profile.costPerKg,
    kFactor: profile.kFactor,
  };

  const updatedSettings: SlicerProcessSettings = {
    ...currentSettings,
    outerWallSpeed: profile.printSpeedMmS,
    innerWallSpeed: Math.min(450, Math.round(profile.printSpeedMmS * 1.35)),
    sparseInfillSpeed: Math.min(500, Math.round(profile.printSpeedMmS * 1.3)),
    retractionDistanceMm: profile.retractionDistanceMm,
    retractionSpeedMmS: profile.retractionSpeedMmS,
  };

  return { updatedSlot, updatedSettings };
}

export function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function getScaledDimensions(obj: PlateObject): { x: number; y: number; z: number } {
  return {
    x: Number((obj.baseDims.x * Math.abs(obj.scale.x)).toFixed(2)),
    y: Number((obj.baseDims.y * Math.abs(obj.scale.y)).toFixed(2)),
    z: Number((obj.baseDims.z * Math.abs(obj.scale.z)).toFixed(2)),
  };
}

export function mirrorPlateObject(
  obj: PlateObject,
  axis: 'x' | 'y' | 'z'
): PlateObject {
  const current = obj.mirror || { x: false, y: false, z: false };
  return {
    ...obj,
    mirror: {
      ...current,
      [axis]: !current[axis],
    },
  };
}

export function centerPlateObject(obj: PlateObject): PlateObject {
  return {
    ...obj,
    position: {
      x: 0,
      y: 0,
      z: 0,
    },
  };
}

export function resetPlateObjectTransform(obj: PlateObject): PlateObject {
  return {
    ...obj,
    position: {
      ...obj.position,
      z: 0,
    },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    mirror: { x: false, y: false, z: false },
  };
}

export function clonePlateObjectMulti(
  source: PlateObject,
  allObjects: PlateObject[],
  copiesCount: number,
  plateSize = BAMBU_X1C_PLATE_SIZE
): { objects: PlateObject[]; lastCreatedId: string } {
  const clampedCount = Math.max(1, Math.min(8, Math.round(copiesCount)));
  const targetPlateId = source.plateId ?? 1;
  const now = Date.now();
  const newClones: PlateObject[] = [];

  for (let i = 0; i < clampedCount; i++) {
    const copyId = `${source.id}-copy-${now}-${i + 1}`;
    newClones.push({
      ...source,
      id: copyId,
      name: source.name.replace(
        /\.(3mf|stl)$/i,
        clampedCount > 1 ? `_Copy${i + 1}.$1` : '_Copy.$1'
      ),
      locked: false,
      position: {
        x: source.position.x + 20 * (i + 1),
        y: source.position.y + 20 * (i + 1),
        z: 0,
      },
    });
  }

  const plateObjs = allObjects.filter((o) => (o.plateId ?? 1) === targetPlateId);
  const otherObjs = allObjects.filter((o) => (o.plateId ?? 1) !== targetPlateId);
  const arranged = autoArrangeObjectsOnPlate(
    [...plateObjs, ...newClones],
    plateSize
  );

  return {
    objects: [...otherObjs, ...arranged],
    lastCreatedId: newClones[newClones.length - 1].id,
  };
}

export function fillPlateWithObjectCopies(
  source: PlateObject,
  allObjects: PlateObject[],
  plateSize = BAMBU_X1C_PLATE_SIZE,
  spacingMm = 14
): { objects: PlateObject[]; copiesAdded: number } {
  const targetPlateId = source.plateId ?? 1;
  const plateObjs = allObjects.filter((o) => (o.plateId ?? 1) === targetPlateId);
  const otherObjs = allObjects.filter((o) => (o.plateId ?? 1) !== targetPlateId);

  const dims = getScaledDimensions(source);
  const usableX = Math.max(40, plateSize.x - 24);
  const usableY = Math.max(40, plateSize.y - 24);
  const maxCols = Math.max(1, Math.floor((usableX + spacingMm) / (dims.x + spacingMm)));
  const maxRows = Math.max(1, Math.floor((usableY + spacingMm) / (dims.y + spacingMm)));
  const maxCapacity = Math.min(9, maxCols * maxRows);

  const copiesNeeded = Math.max(1, maxCapacity - plateObjs.length);
  const now = Date.now();
  const added: PlateObject[] = [];

  for (let i = 0; i < copiesNeeded; i++) {
    added.push({
      ...source,
      id: `${source.id}-fill-${now}-${i + 1}`,
      name: source.name.replace(/\.(3mf|stl)$/i, `_Fill${i + 1}.$1`),
      locked: false,
      position: { x: 0, y: 0, z: 0 },
    });
  }

  const arranged = autoArrangeObjectsOnPlate([...plateObjs, ...added], plateSize, spacingMm);
  return {
    objects: [...otherObjs, ...arranged],
    copiesAdded: added.length,
  };
}

export function validatePlateBounds(
  obj: PlateObject,
  plateSize = BAMBU_X1C_PLATE_SIZE
): { valid: boolean; outOfBoundsAxes: ('x' | 'y' | 'z')[] } {
  const dims = getScaledDimensions(obj);
  const halfPlateX = plateSize.x / 2;
  const halfPlateY = plateSize.y / 2;

  const minX = obj.position.x - dims.x / 2;
  const maxX = obj.position.x + dims.x / 2;
  const minY = obj.position.y - dims.y / 2;
  const maxY = obj.position.y + dims.y / 2;

  const outOfBoundsAxes: ('x' | 'y' | 'z')[] = [];
  if (minX < -halfPlateX || maxX > halfPlateX) {
    outOfBoundsAxes.push('x');
  }
  if (minY < -halfPlateY || maxY > halfPlateY) {
    outOfBoundsAxes.push('y');
  }
  if (dims.z > plateSize.z || obj.position.z < 0) {
    outOfBoundsAxes.push('z');
  }

  return {
    valid: outOfBoundsAxes.length === 0,
    outOfBoundsAxes,
  };
}

export function autoArrangeObjectsOnPlate(
  objects: PlateObject[],
  plateSize = BAMBU_X1C_PLATE_SIZE,
  spacingMm = 14
): PlateObject[] {
  const visibleObjects = objects.filter((o) => o.visible);
  if (visibleObjects.length === 0) return objects;

  if (visibleObjects.length === 1) {
    return objects.map((obj) =>
      obj.visible ? { ...obj, position: { x: 0, y: 0, z: 0 } } : obj
    );
  }

  const cols = Math.ceil(Math.sqrt(visibleObjects.length));
  const rows = Math.ceil(visibleObjects.length / cols);

  const cellWidths: number[] = new Array(cols).fill(0);
  const cellHeights: number[] = new Array(rows).fill(0);

  visibleObjects.forEach((obj, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const dims = getScaledDimensions(obj);
    cellWidths[col] = Math.max(cellWidths[col], dims.x);
    cellHeights[row] = Math.max(cellHeights[row], dims.y);
  });

  const totalWidth =
    cellWidths.reduce((a, b) => a + b, 0) + Math.max(0, cols - 1) * spacingMm;
  const totalHeight =
    cellHeights.reduce((a, b) => a + b, 0) + Math.max(0, rows - 1) * spacingMm;

  const startX = -totalWidth / 2;
  const startY = -totalHeight / 2;

  const colCenters: number[] = [];
  let accumX = startX;
  for (let c = 0; c < cols; c++) {
    colCenters.push(accumX + cellWidths[c] / 2);
    accumX += cellWidths[c] + spacingMm;
  }

  const rowCenters: number[] = [];
  let accumY = startY;
  for (let r = 0; r < rows; r++) {
    rowCenters.push(accumY + cellHeights[r] / 2);
    accumY += cellHeights[r] + spacingMm;
  }

  const limitX = plateSize.x / 2 - 8;
  const limitY = plateSize.y / 2 - 8;

  let visIndex = 0;
  return objects.map((obj) => {
    if (!obj.visible) return obj;
    const col = visIndex % cols;
    const row = Math.floor(visIndex / cols);
    visIndex++;

    const clampedX = Math.max(-limitX, Math.min(limitX, Math.round(colCenters[col] * 10) / 10));
    const clampedY = Math.max(-limitY, Math.min(limitY, Math.round(rowCenters[row] * 10) / 10));

    return {
      ...obj,
      position: { x: clampedX, y: clampedY, z: 0 },
    };
  });
}

export function calculateSliceResult(
  objects: PlateObject[],
  settings: SlicerProcessSettings,
  amsSlots: AmsSlot[]
): SliceResult {
  const activeObjects = objects.filter((o) => o.visible);
  if (activeObjects.length === 0) {
    return {
      totalLayers: 0,
      totalTimeSeconds: 0,
      formattedTime: '0s',
      totalFilamentGrams: 0,
      totalFilamentMeters: 0,
      estimatedCostUsd: 0,
      lineBreakdown: [],
      filamentBySlot: [],
      gcodePreviewLines: ['; Empty build plate'],
      slicedAtIso: new Date().toISOString(),
    };
  }

  const maxZ = Math.max(...activeObjects.map((o) => getScaledDimensions(o).z));
  const effectiveLayerHeight = Math.max(0.06, settings.layerHeight);
  const totalLayers = Math.max(
    1,
    Math.ceil((maxZ - settings.initialLayerHeight) / effectiveLayerHeight) + 1
  );

  // Estimate geometric volume and surface area across all objects
  let totalShellVolumeMm3 = 0;
  let totalInfillVolumeMm3 = 0;
  let totalTopBottomVolumeMm3 = 0;
  let totalSupportVolumeMm3 = 0;

  const slotGramsMap = new Map<number, number>();
  const uniqueSlotsUsed = new Set<number>();

  for (const obj of activeObjects) {
    uniqueSlotsUsed.add(obj.amsSlotId);
    const dims = getScaledDimensions(obj);
    // Approximate form factor ~0.46 of bounding box for typical functional 3D prints
    const rawBoxVolume = dims.x * dims.y * dims.z;
    const solidModelVolume = rawBoxVolume * 0.46;
    const surfaceArea = 2 * (dims.x * dims.y + dims.x * dims.z + dims.y * dims.z) * 0.72;

    const effectiveWallLoops = obj.wallLoopsOverride ?? settings.wallLoops;
    const effectiveInfillDensity =
      obj.infillDensityOverride !== undefined
        ? obj.infillDensityOverride
        : settings.infillDensity;
    const effectiveSupportEnabled =
      obj.supportPainting !== undefined
        ? obj.supportPainting
        : settings.supportEnabled;

    const wallThickness = effectiveWallLoops * settings.nozzleDiameter;
    const shellVol = Math.min(solidModelVolume * 0.65, surfaceArea * wallThickness * 0.68);
    const topBottomThickness =
      (settings.topShellLayers + settings.bottomShellLayers) * effectiveLayerHeight;
    const topBottomVol = Math.min(
      solidModelVolume * 0.25,
      dims.x * dims.y * topBottomThickness * 0.55
    );
    const remainingCoreVol = Math.max(0, solidModelVolume - shellVol - topBottomVol);
    const infillVol = remainingCoreVol * (effectiveInfillDensity / 100);

    const supportVol = effectiveSupportEnabled
      ? solidModelVolume * (settings.supportType.startsWith('tree') ? 0.09 : 0.14)
      : 0;

    totalShellVolumeMm3 += shellVol;
    totalInfillVolumeMm3 += infillVol;
    totalTopBottomVolumeMm3 += topBottomVol;
    totalSupportVolumeMm3 += supportVol;

    const slot = amsSlots.find((s) => s.id === obj.amsSlotId) || amsSlots[0];
    const density = slot ? slot.densityGcm3 : 1.24;
    const objTotalVolCm3 = (shellVol + topBottomVol + infillVol + supportVol) / 1000;
    const objGrams = objTotalVolCm3 * density;
    slotGramsMap.set(obj.amsSlotId, (slotGramsMap.get(obj.amsSlotId) || 0) + objGrams);
  }

  const isMultiColor = uniqueSlotsUsed.size > 1 && settings.primeTowerEnabled;
  const primeTowerVolumeMm3 = isMultiColor ? totalLayers * 42 : 0;

  const outerWallVol = totalShellVolumeMm3 * 0.42;
  const innerWallVol = totalShellVolumeMm3 * 0.58;
  const topSurfaceVol = totalTopBottomVolumeMm3 * 0.52;
  const bottomSurfaceVol = totalTopBottomVolumeMm3 * 0.48;

  // Filament cross-section area for 1.75mm diameter filament: pi * (0.875)^2 = 2.405 mm^2
  const filamentAreaMm2 = 2.40528;
  const avgDensity = 1.24; // g/cm^3

  // Volumetric flow rates & speeds on Bambu X1 Carbon CoreXY
  const speedScale = settings.outerWallSpeed / 200;
  const calcTimeForVol = (volMm3: number, baseFlowMm3s: number) =>
    volMm3 / Math.max(2, baseFlowMm3s * Math.max(0.4, speedScale));

  const rawCategories: {
    type: LineTypeBreakdown['type'];
    colorHex: string;
    volMm3: number;
    flowRate: number;
  }[] = [
    { type: 'Outer Wall', colorHex: '#f97316', volMm3: outerWallVol, flowRate: 12.5 },
    { type: 'Inner Wall', colorHex: '#22c55e', volMm3: innerWallVol, flowRate: 18.0 },
    { type: 'Sparse Infill', colorHex: '#ef4444', volMm3: totalInfillVolumeMm3, flowRate: 22.5 },
    { type: 'Top Surface', colorHex: '#38bdf8', volMm3: topSurfaceVol, flowRate: 11.0 },
    { type: 'Bottom Surface', colorHex: '#a855f7', volMm3: bottomSurfaceVol, flowRate: 13.5 },
    { type: 'Support', colorHex: '#10b981', volMm3: totalSupportVolumeMm3, flowRate: 15.0 },
    { type: 'Prime Tower', colorHex: '#eab308', volMm3: primeTowerVolumeMm3, flowRate: 16.0 },
  ];

  // Bambu X1C pre-print calibration (homing, bed mesh, nozzle wipe, LiDAR flow calibration) ~ 360 sec
  const prepTimeSeconds = 360;
  const rawPrintSeconds = rawCategories.reduce(
    (sum, cat) => sum + calcTimeForVol(cat.volMm3, cat.flowRate),
    0
  );
  const totalTimeSeconds = Math.max(60, Math.round(rawPrintSeconds + prepTimeSeconds));

  const lineBreakdown: LineTypeBreakdown[] = rawCategories
    .filter((cat) => cat.volMm3 > 0.1)
    .map((cat) => {
      const tSec = Math.round(calcTimeForVol(cat.volMm3, cat.flowRate));
      const grams = Number(((cat.volMm3 / 1000) * avgDensity).toFixed(2));
      const meters = Number((cat.volMm3 / filamentAreaMm2 / 1000).toFixed(2));
      const percentage =
        rawPrintSeconds > 0 ? Number(((tSec / rawPrintSeconds) * 100).toFixed(1)) : 0;
      return {
        type: cat.type,
        colorHex: cat.colorHex,
        timeSeconds: tSec,
        percentage,
        filamentGrams: grams,
        lengthMeters: meters,
      };
    });

  const totalFilamentGrams = Number(
    lineBreakdown.reduce((sum, item) => sum + item.filamentGrams, 0).toFixed(2)
  );
  const totalFilamentMeters = Number(
    lineBreakdown.reduce((sum, item) => sum + item.lengthMeters, 0).toFixed(2)
  );

  const filamentBySlot = Array.from(slotGramsMap.entries()).map(([slotId, baseGrams]) => {
    const slot = amsSlots.find((s) => s.id === slotId) || amsSlots[0];
    const grams = Number(baseGrams.toFixed(2));
    const meters = Number(((grams / (slot?.densityGcm3 || 1.24)) * 1000 / filamentAreaMm2 / 1000).toFixed(2));
    return {
      slotId,
      material: slot ? slot.material : 'PLA Basic',
      colorHex: slot ? slot.colorHex : '#10b981',
      grams,
      meters,
    };
  });

  const estimatedCostUsd = Number(
    filamentBySlot
      .reduce((sum, item) => {
        const slot = amsSlots.find((s) => s.id === item.slotId);
        const ratePerGram = (slot ? slot.costPerKg : 24.99) / 1000;
        return sum + item.grams * ratePerGram;
      }, 0)
      .toFixed(2)
  );

  const primarySlot =
    amsSlots.find((s) => s.id === activeObjects[0].amsSlotId) || amsSlots[0];
  const nozzleTemp =
    primarySlot?.nozzleTemp ??
    (primarySlot
      ? Math.round((primarySlot.nozzleTempMin + primarySlot.nozzleTempMax) / 2)
      : 220);
  const bedTemp = primarySlot ? primarySlot.bedTemp : 55;
  const retractionDist =
    settings.retractionDistanceMm ?? primarySlot?.retractionDistanceMm ?? 0.8;
  const retractionSpeed = settings.retractionSpeedMmS ?? 30;

  const printerSpec = getBambuPrinterModelSpec(settings.printerModel);
  const gcodePreviewLines = [
    `; CarbonSlice X1 — ${printerSpec.id} (${settings.nozzleDiameter}mm Nozzle | ${printerSpec.buildVolume.x}x${printerSpec.buildVolume.y}x${printerSpec.buildVolume.z}mm)`,
    `; Plate: ${settings.plateType} | Layer: ${settings.layerHeight}mm (${totalLayers} Layers)`,
    `; Filament: ${primarySlot?.material || 'PLA'} (${totalFilamentGrams}g / ${totalFilamentMeters}m) | Est: ${formatDuration(totalTimeSeconds)}`,
    `; Profile Params: Nozzle ${nozzleTemp}°C | Bed ${bedTemp}°C | Speed ${settings.outerWallSpeed}mm/s | Retract ${retractionDist.toFixed(2)}mm`,
    `M1002 gcode_claim_action : 2 ; ${printerSpec.shortCode} LCD stage: Heating`,
    `M140 S${bedTemp} ; Set ${settings.plateType} target temperature`,
    `M104 S140 ; Standby nozzle preheat prior to auto-bed leveling`,
    `G28 ; Home X/Y/Z axes (${printerSpec.kinematics})`,
    printerSpec.hasMicroLidar
      ? `G29.2 S1 ; Enable Bambu Micro-LiDAR & Eddy Current bed mesh compensation`
      : `G29 ; Auto-Bed Leveling & Eddy Current Flow Dynamics compensation`,
    `M109 S${nozzleTemp} ; Heat nozzle to profile temperature (${nozzleTemp}°C)`,
    `M207 S${retractionDist.toFixed(2)} F${Math.round(retractionSpeed * 60)} ; Direct-drive retraction length & speed`,
    `M900 K${primarySlot?.kFactor.toFixed(3) || '0.020'} ; Apply Flow Dynamics K-factor`,
    `G1 Z${settings.initialLayerHeight.toFixed(2)} F1200 ; Move to Initial Layer 1`,
    `G1 X45.00 Y18.00 E4.20 F1500 ; Front purge line extrusion`,
    `; --- LAYER 1 / ${totalLayers} (Z = ${settings.initialLayerHeight.toFixed(2)}mm) ---`,
    `G1 X${activeObjects[0].position.x.toFixed(2)} Y${activeObjects[0].position.y.toFixed(2)} F${settings.travelSpeed * 60}`,
    `G1 F${settings.outerWallSpeed * 60} ; Outer wall extrusion pass`,
  ];

  return {
    totalLayers,
    totalTimeSeconds,
    formattedTime: formatDuration(totalTimeSeconds),
    totalFilamentGrams,
    totalFilamentMeters,
    estimatedCostUsd,
    lineBreakdown,
    filamentBySlot,
    gcodePreviewLines,
    slicedAtIso: new Date().toISOString(),
  };
}

/**
 * Parses an ASCII or Binary STL ArrayBuffer into a CustomMeshGeometry
 * and computes its millimeter bounding box.
 */
export function parseSTLBuffer(buffer: ArrayBuffer): {
  geometry: CustomMeshGeometry;
  dims: { x: number; y: number; z: number };
} {
  const bytes = new Uint8Array(buffer);
  const headerPreview = new TextDecoder().decode(bytes.slice(0, Math.min(256, bytes.length)));
  const isAscii =
    headerPreview.trimStart().toLowerCase().startsWith('solid') &&
    headerPreview.includes('facet');

  let positions: Float32Array;
  if (isAscii) {
    const fullText = new TextDecoder().decode(bytes);
    positions = parseAsciiSTLPositions(fullText);
  } else {
    positions = parseBinarySTLPositions(buffer);
  }

  return normalizeAndMeasurePositions(positions);
}

export function parseAsciiSTLPositions(stlText: string): Float32Array {
  const coords: number[] = [];
  const vertexRegex = /vertex\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)/gi;
  let match: RegExpExecArray | null;
  while ((match = vertexRegex.exec(stlText)) !== null) {
    coords.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
  }
  return new Float32Array(coords);
}

export function parseBinarySTLPositions(buffer: ArrayBuffer): Float32Array {
  if (buffer.byteLength < 84) {
    return new Float32Array(0);
  }
  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  const maxPossibleTriangles = Math.floor((buffer.byteLength - 84) / 50);
  const actualTriangles = Math.min(triangleCount, maxPossibleTriangles);
  const positions = new Float32Array(actualTriangles * 9);

  let offset = 84;
  for (let i = 0; i < actualTriangles; i++) {
    // Skip normal (12 bytes) -> read 3 vertices (36 bytes)
    const vOffset = offset + 12;
    for (let j = 0; j < 9; j++) {
      positions[i * 9 + j] = view.getFloat32(vOffset + j * 4, true);
    }
    offset += 50;
  }
  return positions;
}

/**
 * Parses a 3MF archive buffer (ZIP containing 3D/3dmodel.model XML)
 * or raw 3D model XML string into normalized mesh geometry.
 */
export function parse3MFBuffer(buffer: ArrayBuffer): {
  geometry: CustomMeshGeometry;
  dims: { x: number; y: number; z: number };
} {
  const bytes = new Uint8Array(buffer);
  let xmlContent = '';

  // Check if ZIP magic header (PK\x03\x04)
  if (bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const unzipped = unzipSync(bytes);
    const modelEntryKey = Object.keys(unzipped).find(
      (k) => k.toLowerCase().endsWith('.model')
    );
    if (!modelEntryKey) {
      throw new Error('No .model mesh entry found inside 3MF archive.');
    }
    xmlContent = strFromU8(unzipped[modelEntryKey]);
  } else {
    xmlContent = new TextDecoder().decode(bytes);
  }

  const positions = parse3MFXmlMesh(xmlContent);
  return normalizeAndMeasurePositions(positions);
}

export function parse3MFXmlMesh(xmlText: string): Float32Array {
  const vertices: [number, number, number][] = [];
  const vertexRegex = /<vertex\s+[^>]*x=["']([^"']+)["'][^>]*y=["']([^"']+)["'][^>]*z=["']([^"']+)["'][^>]*\/?>/gi;
  let vMatch: RegExpExecArray | null;
  while ((vMatch = vertexRegex.exec(xmlText)) !== null) {
    vertices.push([
      parseFloat(vMatch[1]) || 0,
      parseFloat(vMatch[2]) || 0,
      parseFloat(vMatch[3]) || 0,
    ]);
  }

  const triangleCoords: number[] = [];
  const triRegex = /<triangle\s+[^>]*v1=["'](\d+)["'][^>]*v2=["'](\d+)["'][^>]*v3=["'](\d+)["'][^>]*\/?>/gi;
  let tMatch: RegExpExecArray | null;
  while ((tMatch = triRegex.exec(xmlText)) !== null) {
    const i1 = parseInt(tMatch[1], 10);
    const i2 = parseInt(tMatch[2], 10);
    const i3 = parseInt(tMatch[3], 10);
    if (vertices[i1] && vertices[i2] && vertices[i3]) {
      triangleCoords.push(...vertices[i1], ...vertices[i2], ...vertices[i3]);
    }
  }

  return new Float32Array(triangleCoords);
}

export function normalizeAndMeasurePositions(positions: Float32Array): {
  geometry: CustomMeshGeometry;
  dims: { x: number; y: number; z: number };
} {
  if (positions.length < 9) {
    return {
      geometry: { positions: new Float32Array(0), vertexCount: 0, triangleCount: 0 },
      dims: { x: 20, y: 20, z: 20 },
    };
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  const sizeX = Math.max(1, maxX - minX);
  const sizeY = Math.max(1, maxY - minY);
  const sizeZ = Math.max(1, maxZ - minZ);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Center X and Y around 0, and ground Z at 0 (slicer convention)
  const normalized = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    normalized[i] = positions[i] - centerX;
    normalized[i + 1] = positions[i + 1] - centerY;
    normalized[i + 2] = positions[i + 2] - minZ;
  }

  return {
    geometry: {
      positions: normalized,
      vertexCount: normalized.length / 3,
      triangleCount: normalized.length / 9,
    },
    dims: {
      x: Number(sizeX.toFixed(1)),
      y: Number(sizeY.toFixed(1)),
      z: Number(sizeZ.toFixed(1)),
    },
  };
}

/**
 * Evaluates current printer telemetry and AMS state against active alert rules.
 */
export function evaluatePrinterAlerts(
  telemetry: PrinterTelemetry,
  amsSlots: AmsSlot[],
  rules: AlertRule[]
): AlertEvent[] {
  const triggered: AlertEvent[] = [];
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  for (const rule of rules) {
    if (!rule.enabled) continue;

    if (rule.category === 'print_complete' && telemetry.state === 'COMPLETED') {
      const timelapseNote = telemetry.timelapseEnabled
        ? ` · 1080p Chamber Timelapse compiled (${telemetry.totalLayers} frames @ ${telemetry.timelapseFps}fps).`
        : '';
      triggered.push({
        id: `alert-complete-${now.getTime()}`,
        category: 'print_complete',
        severity: 'info',
        title: 'Print Job Completed on X1 Carbon',
        message: `${telemetry.activeJobName} finished all ${telemetry.totalLayers} layers. Textured PEI bed cooling down (${Math.round(telemetry.bedTempActual)}°C)${timelapseNote}`,
        timestampIso: now.toISOString(),
        formattedTime: timeStr,
        acknowledged: false,
        actionTaken: telemetry.timelapseEnabled
          ? 'Encoded 1080p Chamber Timelapse (.webm) & set exhaust fan to 80%'
          : 'Chamber exhaust fan set to 80% for part cooldown',
      });
    }

    if (rule.category === 'lidar_spaghetti' && telemetry.spaghettiConfidencePct >= 65) {
      triggered.push({
        id: `alert-spaghetti-${now.getTime()}`,
        category: 'lidar_spaghetti',
        severity: 'critical',
        title: 'Spaghetti Extrusion Anomaly Detected',
        message: `Chamber camera vision & Micro-LiDAR detected detached filament strands (${telemetry.spaghettiConfidencePct}% confidence) at Layer ${telemetry.currentLayer}.`,
        timestampIso: now.toISOString(),
        formattedTime: timeStr,
        acknowledged: false,
        actionTaken: rule.autoPausePrinter ? 'Auto-paused print & parked CoreXY toolhead' : 'Notification dispatched',
      });
    }

    if (rule.category === 'first_layer_inspection' && telemetry.lidarFirstLayerScore < 0.6) {
      triggered.push({
        id: `alert-lidar-${now.getTime()}`,
        category: 'first_layer_inspection',
        severity: 'warning',
        title: 'Micro-LiDAR First Layer Adhesion Warning',
        message: `First-layer height scan measured uneven bead profile (score ${(telemetry.lidarFirstLayerScore * 100).toFixed(0)}/100) on ${telemetry.activeJobName}.`,
        timestampIso: now.toISOString(),
        formattedTime: timeStr,
        acknowledged: false,
        actionTaken: rule.autoPausePrinter ? 'Paused after first-layer LiDAR scan' : 'Logged telemetry warning',
      });
    }

    if (rule.category === 'filament_runout') {
      const activeSlot = amsSlots.find((s) => s.id === telemetry.activeAmsSlot);
      if (activeSlot && activeSlot.remainingPct <= 5) {
        triggered.push({
          id: `alert-filament-${now.getTime()}`,
          category: 'filament_runout',
          severity: activeSlot.remainingPct === 0 ? 'critical' : 'warning',
          title: `AMS Slot A${activeSlot.id} Filament Depleted (${activeSlot.remainingPct}%)`,
          message: `Spool A${activeSlot.id} (${activeSlot.material} · ${activeSlot.colorName}) reached ${activeSlot.remainingPct}% remaining capacity.`,
          timestampIso: now.toISOString(),
          formattedTime: timeStr,
          acknowledged: false,
          actionTaken: rule.autoPausePrinter ? 'Paused waiting for AMS spool reload or backup failover' : 'Low spool alert active',
        });
      }
    }

    if (rule.category === 'ams_humidity' && telemetry.amsHumidityIndex >= 4) {
      triggered.push({
        id: `alert-humidity-${now.getTime()}`,
        category: 'ams_humidity',
        severity: 'warning',
        title: `AMS Desiccant Moisture Warning (Index ${telemetry.amsHumidityIndex}/5)`,
        message: `Internal AMS relative humidity exceeded threshold for hygroscopic filaments (PAHT-CF / PETG-CF).`,
        timestampIso: now.toISOString(),
        formattedTime: timeStr,
        acknowledged: false,
        actionTaken: 'Recommend regenerating AMS desiccant pods',
      });
    }
  }

  return triggered;
}

/**
 * Generates deterministic timelapse video record metadata when a print job completes
 * with automated chamber camera timelapse recording enabled.
 */
export function buildTimelapseMetadataOnCompletion(
  telemetry: PrinterTelemetry
): TimelapseRecordMetadata | null {
  if (!telemetry.timelapseEnabled) {
    return null;
  }

  const totalFrames = Math.max(30, telemetry.totalLayers || 240);
  const fps = telemetry.timelapseFps || 30;
  const durationSeconds = Number(Math.max(1.5, totalFrames / fps).toFixed(1));
  const sanitizedJob = (telemetry.activeJobName || 'Bambu_X1C_Print')
    .replace(/\.(3mf|stl|gcode)$/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const fileName = `Timelapse_${sanitizedJob}_1080p_${fps}fps.webm`;
  // ~18.5 KB per 1080p keyframe in VP9/H.264 timelapse stream
  const fileSizeBytes = totalFrames * 18940;
  const sizeMb = (fileSizeBytes / (1024 * 1024)).toFixed(2);

  return {
    id: `tl-${Date.now()}`,
    jobName: telemetry.activeJobName,
    fileName,
    captureMode: telemetry.timelapseMode || 'smooth_park',
    fps,
    resolution: '1080p',
    totalFrames,
    durationSeconds,
    fileSizeBytes,
    formattedFileSize: `${sizeMb} MB`,
    createdAtIso: new Date().toISOString(),
  };
}

/**
 * Detects whether a 3MF archive or file load contains multi-plate definitions
 * (e.g. Metadata/plate_*.json, plate_*.gcode, or <item plate_id="N">).
 * Returns the detected plate count (clamped 1-9) and individual object plate IDs if specified.
 */
export function detectPlatesFrom3MFBuffer(buffer: ArrayBuffer): {
  detectedPlatesCount: number;
  plateNames: Record<number, string>;
  plateAssignments: number[];
} {
  const bytes = new Uint8Array(buffer);
  let detectedCount = 1;
  const plateNames: Record<number, string> = { 1: 'Plate 1' };
  const plateAssignments: number[] = [];

  // Check if valid ZIP archive
  if (bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    try {
      const unzipped = unzipSync(bytes);
      const keys = Object.keys(unzipped);

      // Check Bambu Studio Metadata/plate_*.json or plate_*.gcode files
      const plateFileMatches = keys.filter((k) =>
        /metadata\/plate_(\d+)\.(json|gcode|info)/i.test(k)
      );

      if (plateFileMatches.length > 0) {
        for (const k of plateFileMatches) {
          const match = /metadata\/plate_(\d+)\.(json|gcode|info)/i.exec(k);
          if (match) {
            const pId = parseInt(match[1], 10);
            if (pId >= 1 && pId <= 9) {
              detectedCount = Math.max(detectedCount, pId);
              try {
                if (k.toLowerCase().endsWith('.json')) {
                  const content = JSON.parse(strFromU8(unzipped[k]));
                  if (content && typeof content.name === 'string') {
                    plateNames[pId] = content.name;
                  }
                }
              } catch {
                // Ignore JSON parse error
              }
            }
          }
        }
      }

      // Also inspect 3dmodel.model XML for <item ... plate_id="N"> or <plate_id>N</plate_id>
      const modelEntry = keys.find((k) => k.toLowerCase().endsWith('.model'));
      if (modelEntry) {
        const xml = strFromU8(unzipped[modelEntry]);
        const plateAttrRegex = /plate_id=["'](\d+)["']/gi;
        let match: RegExpExecArray | null;
        while ((match = plateAttrRegex.exec(xml)) !== null) {
          const pId = parseInt(match[1], 10);
          if (pId >= 1 && pId <= 9) {
            detectedCount = Math.max(detectedCount, pId);
            plateAssignments.push(pId);
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  const finalCount = clampPlateCount(detectedCount);
  for (let i = 1; i <= finalCount; i++) {
    if (!plateNames[i]) {
      plateNames[i] = `Plate ${i}`;
    }
  }

  return {
    detectedPlatesCount: finalCount,
    plateNames,
    plateAssignments,
  };
}

/**
 * Generates an in-memory 3MF archive with 3 distinct build plates:
 * Plate 1: Hull & Keel
 * Plate 2: Cabin & Deck
 * Plate 3: Mast & Radar
 */
export function generateMultiPlateSample3MF(): {
  buffer: ArrayBuffer;
  platesCount: number;
  plateNames: Record<number, string>;
} {
  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
          <vertex x="0.0" y="0.0" z="0.0" />
          <vertex x="40.0" y="0.0" z="0.0" />
          <vertex x="40.0" y="24.0" z="0.0" />
          <vertex x="0.0" y="24.0" z="0.0" />
          <vertex x="0.0" y="0.0" z="20.0" />
          <vertex x="40.0" y="0.0" z="20.0" />
          <vertex x="40.0" y="24.0" z="20.0" />
          <vertex x="0.0" y="24.0" z="20.0" />
        </vertices>
        <triangles>
          <triangle v1="0" v2="2" v3="1" />
          <triangle v1="0" v2="3" v3="2" />
          <triangle v1="4" v2="5" v3="6" />
          <triangle v1="4" v2="6" v3="7" />
          <triangle v1="0" v2="1" v3="5" />
          <triangle v1="0" v2="5" v3="4" />
          <triangle v1="2" v2="3" v3="7" />
          <triangle v1="2" v2="7" v3="6" />
          <triangle v1="3" v2="0" v3="4" />
          <triangle v1="3" v2="4" v3="7" />
          <triangle v1="1" v2="2" v3="6" />
          <triangle v1="1" v2="6" v3="5" />
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" plate_id="1" />
    <item objectid="1" plate_id="2" />
    <item objectid="1" plate_id="3" />
  </build>
</model>`;

  const plate1Json = JSON.stringify({ name: 'Plate 1 - Hull & Keel', plate_id: 1, plate_type: 'Textured PEI Plate' });
  const plate2Json = JSON.stringify({ name: 'Plate 2 - Cabin & Deck', plate_id: 2, plate_type: 'Textured PEI Plate' });
  const plate3Json = JSON.stringify({ name: 'Plate 3 - Mast & Radar', plate_id: 3, plate_type: 'Textured PEI Plate' });

  const archiveData = zipSync({
    '3D/3dmodel.model': strToU8(modelXml),
    'Metadata/plate_1.json': strToU8(plate1Json),
    'Metadata/plate_2.json': strToU8(plate2Json),
    'Metadata/plate_3.json': strToU8(plate3Json),
  });

  return {
    buffer: archiveData.buffer.slice(archiveData.byteOffset, archiveData.byteOffset + archiveData.byteLength),
    platesCount: 3,
    plateNames: {
      1: 'Plate 1 - Hull & Keel',
      2: 'Plate 2 - Cabin & Deck',
      3: 'Plate 3 - Mast & Radar',
    },
  };
}

/**
 * Simulates a realistic Bambu Lab Cloud OTA wireless print dispatch,
 * communicating via Bambu Cloud MQTT broker (e.g. us.mqtt.bambulab.com:8883).
 */
export async function simulateBambuCloudDispatch(
  jobName: string,
  account: BambuAccountProfile,
  targetPrinterDevId: string,
  plateName?: string
): Promise<{
  success: boolean;
  jobId: string;
  mqttTopic: string;
  dispatchTimeIso: string;
  message: string;
}> {
  const printer = account.boundPrinters.find((p) => p.devId === targetPrinterDevId);
  const targetName = printer ? printer.name : 'Bambu Lab X1-Carbon';
  const jobId = `bbl_job_${Date.now()}`;
  const mqttTopic = `device/${targetPrinterDevId}/request`;

  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    success: true,
    jobId,
    mqttTopic,
    dispatchTimeIso: new Date().toISOString(),
    message: `Dispatched wireless print "${jobName}" (${plateName || 'Active Plate'}) to ${targetName} via Bambu Cloud (${account.region.toUpperCase()} · ${account.accountEmail}).`,
  };
}

/**
 * Slices all build plates and aggregates total print time, filament weight, length,
 * and per-plate slice breakdowns.
 */
export function calculateAllPlatesSliceResult(
  plates: BuildPlate[],
  objects: PlateObject[],
  settings: SlicerProcessSettings,
  amsSlots: AmsSlot[]
): MultiPlateSliceResult {
  const plateSummaries: PlateSliceSummary[] = plates.map((plate) => {
    const plateObjs = objects.filter(
      (o) => (o.plateId ?? 1) === plate.id && o.visible
    );
    const sliceRes = calculateSliceResult(plateObjs, settings, amsSlots);
    return {
      plateId: plate.id,
      plateName: plate.name,
      objectCount: plateObjs.length,
      objectNames: plateObjs.map((o) => o.name),
      sliceResult: sliceRes,
    };
  });

  const nonEmptySummaries = plateSummaries.filter((p) => p.objectCount > 0);
  const totalTimeSeconds = nonEmptySummaries.reduce(
    (sum, p) => sum + p.sliceResult.totalTimeSeconds,
    0
  );
  const totalFilamentGrams = Number(
    nonEmptySummaries
      .reduce((sum, p) => sum + p.sliceResult.totalFilamentGrams, 0)
      .toFixed(1)
  );
  const totalFilamentMeters = Number(
    nonEmptySummaries
      .reduce((sum, p) => sum + p.sliceResult.totalFilamentMeters, 0)
      .toFixed(2)
  );
  const totalEstimatedCostUsd = Number(
    nonEmptySummaries
      .reduce((sum, p) => sum + p.sliceResult.estimatedCostUsd, 0)
      .toFixed(2)
  );
  const totalLayersAcrossPlates = nonEmptySummaries.reduce(
    (sum, p) => sum + p.sliceResult.totalLayers,
    0
  );

  return {
    isMultiPlate: plates.length > 1,
    plates: plateSummaries,
    totalTimeSeconds,
    formattedTotalTime: formatDuration(totalTimeSeconds),
    totalFilamentGrams,
    totalFilamentMeters,
    totalEstimatedCostUsd,
    totalLayersAcrossPlates,
  };
}

/**
 * Builds an ordered multi-plate PrintQueueItem array for wireless dispatch.
 * The first non-empty plate is set to 'printing', and subsequent plates are 'queued'.
 */
export function buildPrintQueueFromPlates(
  multiSlice: MultiPlateSliceResult,
  dispatchMode: 'bambu_cloud' | 'lan_mqtt',
  targetPrinterName: string
): PrintQueueItem[] {
  const printablePlates = multiSlice.plates.filter((p) => p.objectCount > 0);
  const sourceList =
    printablePlates.length > 0 ? printablePlates : multiSlice.plates;

  const nowIso = new Date().toISOString();
  return sourceList.map((item, idx) => {
    const primaryModelName =
      item.objectNames[0]?.replace(/\.(3mf|stl)$/i, '') || `Plate_${item.plateId}`;
    const jobName =
      item.objectNames.length > 1
        ? `${item.plateName} (${item.objectNames.length} Models).3mf`
        : `${item.plateName} — ${primaryModelName}.3mf`;

    return {
      id: `queue-plate-${item.plateId}-${Date.now()}-${idx}`,
      queueIndex: idx + 1,
      plateId: item.plateId,
      plateName: item.plateName,
      jobName,
      objectNames: item.objectNames,
      totalLayers: item.sliceResult.totalLayers || 120,
      estimatedTimeSeconds: item.sliceResult.totalTimeSeconds || 900,
      formattedTime: item.sliceResult.formattedTime || '15m 0s',
      filamentGrams: item.sliceResult.totalFilamentGrams || 12.4,
      status: idx === 0 ? 'printing' : 'queued',
      dispatchMode,
      targetPrinterName,
      queuedAtIso: nowIso,
    };
  });
}
