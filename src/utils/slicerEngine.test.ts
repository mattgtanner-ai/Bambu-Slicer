import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyProfileToSlotAndSettings,
  autoArrangeObjectsOnPlate,
  buildTimelapseMetadataOnCompletion,
  calculateSliceResult,
  DEFAULT_FILAMENT_PROFILES,
  evaluatePrinterAlerts,
  parse3MFXmlMesh,
  parseAsciiSTLPositions,
  validateFilamentProfileInput,
  validatePlateBounds,
} from './slicerEngine';
import type {
  AmsSlot,
  AlertRule,
  PlateObject,
  PrinterTelemetry,
  SlicerProcessSettings,
} from '../types/slicer';

const MOCK_AMS: AmsSlot[] = [
  {
    id: 1,
    material: 'PLA-CF',
    colorName: 'Carbon Black',
    colorHex: '#27272a',
    nozzleTempMin: 215,
    nozzleTempMax: 235,
    bedTemp: 55,
    remainingPct: 82,
    densityGcm3: 1.22,
    costPerKg: 31.99,
    kFactor: 0.021,
  },
  {
    id: 2,
    material: 'PLA Basic',
    colorName: 'Bambu Green',
    colorHex: '#10b981',
    nozzleTempMin: 190,
    nozzleTempMax: 230,
    bedTemp: 55,
    remainingPct: 3,
    densityGcm3: 1.24,
    costPerKg: 24.99,
    kFactor: 0.018,
  },
];

const MOCK_SETTINGS: SlicerProcessSettings = {
  nozzleDiameter: 0.4,
  plateType: 'Textured PEI Plate',
  layerHeight: 0.2,
  initialLayerHeight: 0.2,
  wallLoops: 3,
  topShellLayers: 4,
  bottomShellLayers: 3,
  infillDensity: 15,
  infillPattern: 'gyroid',
  supportEnabled: true,
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

test('validatePlateBounds verifies models fit within 256x256x256mm Bambu X1C plate', () => {
  const validObj: PlateObject = {
    id: 'obj-1',
    name: 'CoreXY Bracket.3mf',
    sourceFormat: '3MF',
    presetType: 'bambu_scraper',
    amsSlotId: 1,
    baseDims: { x: 60, y: 40, z: 30 },
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    triangles: 1420,
    visible: true,
  };
  const check1 = validatePlateBounds(validObj);
  assert.equal(check1.valid, true);
  assert.equal(check1.outOfBoundsAxes.length, 0);

  const oversizedObj: PlateObject = {
    ...validObj,
    position: { x: 115, y: 0, z: 0 },
  };
  const check2 = validatePlateBounds(oversizedObj);
  assert.equal(check2.valid, false);
  assert.ok(check2.outOfBoundsAxes.includes('x'));
});

test('autoArrangeObjectsOnPlate separates overlapping models cleanly on build plate', () => {
  const objs: PlateObject[] = [
    {
      id: '1',
      name: 'Part A',
      sourceFormat: 'STL',
      presetType: 'calibration_cube',
      amsSlotId: 1,
      baseDims: { x: 40, y: 40, z: 40 },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      triangles: 120,
      visible: true,
    },
    {
      id: '2',
      name: 'Part B',
      sourceFormat: 'STL',
      presetType: 'planetary_gear',
      amsSlotId: 2,
      baseDims: { x: 50, y: 50, z: 20 },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      triangles: 480,
      visible: true,
    },
  ];

  const arranged = autoArrangeObjectsOnPlate(objs);
  assert.notEqual(arranged[0].position.x, arranged[1].position.x);
  assert.equal(validatePlateBounds(arranged[0]).valid, true);
  assert.equal(validatePlateBounds(arranged[1]).valid, true);
});

test('calculateSliceResult computes accurate layer count, filament weight, and toolpath breakdown', () => {
  const obj: PlateObject = {
    id: 'benchy',
    name: '3DBenchy_Speedboat.3mf',
    sourceFormat: '3MF',
    presetType: 'benchy_hull',
    amsSlotId: 1,
    baseDims: { x: 60, y: 31, z: 48 },
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    triangles: 22560,
    visible: true,
  };

  const result = calculateSliceResult([obj], MOCK_SETTINGS, MOCK_AMS);
  assert.equal(result.totalLayers, 240);
  assert.ok(result.totalFilamentGrams > 5 && result.totalFilamentGrams < 60);
  assert.ok(result.totalFilamentMeters > 1);
  assert.ok(result.totalTimeSeconds > 400);
  assert.ok(result.lineBreakdown.some((b) => b.type === 'Outer Wall'));
  assert.ok(result.lineBreakdown.some((b) => b.type === 'Sparse Infill'));
});

test('parseAsciiSTLPositions and parse3MFXmlMesh extract triangle vertices accurately', () => {
  const asciiStl = `
    solid test_triangle
      facet normal 0 0 1
        outer loop
          vertex 0.0 0.0 0.0
          vertex 10.0 0.0 0.0
          vertex 0.0 10.0 5.0
        endloop
      endfacet
    endsolid test_triangle
  `;
  const stlPositions = parseAsciiSTLPositions(asciiStl);
  assert.equal(stlPositions.length, 9);
  assert.equal(stlPositions[3], 10);
  assert.equal(stlPositions[8], 5);

  const sample3mfXml = `
    <model unit="millimeter">
      <resources>
        <object id="1" type="model">
          <mesh>
            <vertices>
              <vertex x="-15" y="-15" z="0" />
              <vertex x="15" y="-15" z="0" />
              <vertex x="0" y="15" z="25" />
            </vertices>
            <triangles>
              <triangle v1="0" v2="1" v3="2" />
            </triangles>
          </mesh>
        </object>
      </resources>
    </model>
  `;
  const mfPositions = parse3MFXmlMesh(sample3mfXml);
  assert.equal(mfPositions.length, 9);
  assert.equal(mfPositions[0], -15);
  assert.equal(mfPositions[8], 25);
});

test('evaluatePrinterAlerts triggers spaghetti and filament runout alerts when thresholds crossed', () => {
  const rules: AlertRule[] = [
    {
      id: 'r1',
      category: 'lidar_spaghetti',
      name: 'AI & LiDAR Spaghetti Detection',
      description: 'Detect detached extrusion strands',
      enabled: true,
      autoPausePrinter: true,
      soundAlert: true,
      thresholdLabel: '>= 65% confidence',
    },
    {
      id: 'r2',
      category: 'filament_runout',
      name: 'AMS Low Spool & Runout Protection',
      description: 'Alert when active AMS spool <= 5%',
      enabled: true,
      autoPausePrinter: true,
      soundAlert: true,
      thresholdLabel: '<= 5% remaining',
    },
  ];

  const telemetry: PrinterTelemetry = {
    state: 'PRINTING',
    activeJobName: 'Carbon_Gearbox_Housing.3mf',
    substage: 'Printing Sparse Infill',
    progressPct: 44,
    currentLayer: 105,
    totalLayers: 240,
    remainingSeconds: 1850,
    elapsedSeconds: 1420,
    nozzleTempActual: 225,
    nozzleTempTarget: 225,
    bedTempActual: 55,
    bedTempTarget: 55,
    chamberTempActual: 39,
    partFanPct: 100,
    auxFanPct: 70,
    chamberFanPct: 40,
    speedProfile: 'standard',
    speedMultiplierPct: 100,
    zHeightMm: 21.0,
    activeAmsSlot: 2, // Slot 2 has 3% remaining
    amsHumidityIndex: 2,
    amsTempC: 26,
    chamberLightOn: true,
    lidarOverlayOn: true,
    lidarFirstLayerScore: 0.96,
    spaghettiConfidencePct: 78,
    toolheadPos: { x: 12, y: -8, z: 21 },
    timelapseEnabled: true,
    timelapseMode: 'smooth_park',
    timelapseFps: 30,
    timelapseFramesCaptured: 105,
  };

  const alerts = evaluatePrinterAlerts(telemetry, MOCK_AMS, rules);
  assert.equal(alerts.length, 2);
  assert.ok(alerts.some((a) => a.category === 'lidar_spaghetti'));
  assert.ok(alerts.some((a) => a.category === 'filament_runout'));
});

test('validateFilamentProfileInput validates nozzle temp, bed temp, speed, and retraction distance', () => {
  const valid = validateFilamentProfileInput({
    name: 'Custom eSUN PLA+ High Speed',
    nozzleTemp: 225,
    bedTemp: 60,
    printSpeedMmS: 260,
    retractionDistanceMm: 0.7,
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.errors.length, 0);

  const invalid = validateFilamentProfileInput({
    name: '',
    nozzleTemp: 350,
    bedTemp: 150,
    printSpeedMmS: 600,
    retractionDistanceMm: 8.5,
  });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.errors.length, 5);
});

test('applyProfileToSlotAndSettings updates AMS slot and slicer settings and reflects in G-code', () => {
  const petgProfile = DEFAULT_FILAMENT_PROFILES.find(
    (p) => p.material === 'PETG-CF'
  )!;
  const { updatedSlot, updatedSettings } = applyProfileToSlotAndSettings(
    petgProfile,
    MOCK_AMS[0],
    MOCK_SETTINGS
  );

  assert.equal(updatedSlot.nozzleTemp, 255);
  assert.equal(updatedSlot.bedTemp, 70);
  assert.equal(updatedSlot.retractionDistanceMm, 1.2);
  assert.equal(updatedSettings.outerWallSpeed, 160);
  assert.equal(updatedSettings.retractionDistanceMm, 1.2);

  const obj: PlateObject = {
    id: 'test-part',
    name: 'Bracket.3mf',
    sourceFormat: '3MF',
    presetType: 'bambu_scraper',
    amsSlotId: 1,
    baseDims: { x: 45, y: 45, z: 20 },
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    triangles: 1200,
    visible: true,
  };

  const sliceRes = calculateSliceResult([obj], updatedSettings, [updatedSlot]);
  assert.ok(sliceRes.gcodePreviewLines.some((l) => l.includes('M109 S255')));
  assert.ok(sliceRes.gcodePreviewLines.some((l) => l.includes('M140 S70')));
  assert.ok(sliceRes.gcodePreviewLines.some((l) => l.includes('M207 S1.20')));
});

test('analyzeMeshTopology detects open holes, inverted normals, degenerate slivers, and duplicate faces in damaged STL', async () => {
  const {
    analyzeMeshTopology,
    DEFAULT_MANUAL_REPAIR_OPTIONS,
    generateDamagedSampleSTL,
    repairMeshGeometry,
  } = await import('./meshRepairEngine');
  const { parseSTLBuffer } = await import('./slicerEngine');

  const sample = generateDamagedSampleSTL();
  const parsed = parseSTLBuffer(sample.buffer);
  const initialReport = analyzeMeshTopology(parsed.geometry.positions, 0.0005);

  assert.equal(initialReport.isWatertight, false);
  assert.equal(initialReport.status, 'needs_repair');
  assert.ok(initialReport.openBoundaryEdges >= 4);
  assert.ok(initialReport.invertedNormals >= 2);
  assert.equal(initialReport.degenerateTriangles, 2);
  assert.equal(initialReport.duplicateTriangles, 1);

  // Test selective manual repair (only remove degenerate & duplicates, leave holes open)
  const partialRepair = repairMeshGeometry(parsed.geometry.positions, {
    ...DEFAULT_MANUAL_REPAIR_OPTIONS,
    closeHoles: false,
    fixNormals: false,
  });
  assert.equal(partialRepair.report.degenerateTriangles, 0);
  assert.equal(partialRepair.report.duplicateTriangles, 0);
  assert.ok(partialRepair.report.openBoundaryEdges >= 4);
  assert.equal(partialRepair.report.isWatertight, false);

  // Test full repair (weld vertices, remove degenerate/duplicates, unify normals, cap open holes)
  const fullRepair = repairMeshGeometry(
    parsed.geometry.positions,
    DEFAULT_MANUAL_REPAIR_OPTIONS
  );
  assert.equal(fullRepair.report.degenerateTriangles, 0);
  assert.equal(fullRepair.report.duplicateTriangles, 0);
  assert.equal(fullRepair.report.openBoundaryEdges, 0);
  assert.equal(fullRepair.report.nonManifoldEdges, 0);
  assert.equal(fullRepair.report.invertedNormals, 0);
  assert.equal(fullRepair.report.isWatertight, true);
  assert.equal(fullRepair.report.status, 'repaired');
  assert.equal(fullRepair.report.healthScore, 100);
  assert.equal(fullRepair.report.totalTriangles, 12);
});

test('buildTimelapseMetadataOnCompletion generates 1080p .webm video metadata when timelapseEnabled is true and null when disabled', () => {
  const baseTelemetry: PrinterTelemetry = {
    state: 'COMPLETED',
    activeJobName: '3DBenchy_Speedboat_X1C.3mf',
    substage: 'Finished',
    progressPct: 100,
    currentLayer: 240,
    totalLayers: 240,
    remainingSeconds: 0,
    elapsedSeconds: 1800,
    nozzleTempActual: 45,
    nozzleTempTarget: 0,
    bedTempActual: 38,
    bedTempTarget: 0,
    chamberTempActual: 32,
    partFanPct: 0,
    auxFanPct: 0,
    chamberFanPct: 80,
    speedProfile: 'standard',
    speedMultiplierPct: 100,
    zHeightMm: 48.0,
    activeAmsSlot: 2,
    amsHumidityIndex: 2,
    amsTempC: 25,
    chamberLightOn: true,
    lidarOverlayOn: true,
    lidarFirstLayerScore: 0.98,
    spaghettiConfidencePct: 0,
    toolheadPos: { x: 0, y: 0, z: 48 },
    timelapseEnabled: true,
    timelapseMode: 'smooth_park',
    timelapseFps: 30,
    timelapseFramesCaptured: 240,
  };

  const videoMeta = buildTimelapseMetadataOnCompletion(baseTelemetry);
  assert.ok(videoMeta);
  assert.equal(
    videoMeta.fileName,
    'Timelapse_3DBenchy_Speedboat_X1C_1080p_30fps.webm'
  );
  assert.equal(videoMeta.totalFrames, 240);
  assert.equal(videoMeta.durationSeconds, 8);
  assert.equal(videoMeta.fps, 30);

  const disabledMeta = buildTimelapseMetadataOnCompletion({
    ...baseTelemetry,
    timelapseEnabled: false,
  });
  assert.equal(disabledMeta, null);
});

test('clampPlateCount enforces plate count bounds strictly between 1 and 9', async () => {
  const { clampPlateCount, MIN_PLATES_COUNT, MAX_PLATES_COUNT } = await import('./slicerEngine');
  assert.equal(MIN_PLATES_COUNT, 1);
  assert.equal(MAX_PLATES_COUNT, 9);
  assert.equal(clampPlateCount(0), 1);
  assert.equal(clampPlateCount(-5), 1);
  assert.equal(clampPlateCount(1), 1);
  assert.equal(clampPlateCount(5), 5);
  assert.equal(clampPlateCount(9), 9);
  assert.equal(clampPlateCount(14), 9);
});

test('generateMultiPlateSample3MF produces valid 3MF archive with 3 distinct build plates detected', async () => {
  const { generateMultiPlateSample3MF, detectPlatesFrom3MFBuffer } = await import('./slicerEngine');
  const sample = generateMultiPlateSample3MF();
  assert.equal(sample.platesCount, 3);
  assert.ok(sample.buffer.byteLength > 100);

  const detected = detectPlatesFrom3MFBuffer(sample.buffer);
  assert.equal(detected.detectedPlatesCount, 3);
  assert.ok(detected.plateNames[1].includes('Plate 1'));
  assert.ok(detected.plateNames[2].includes('Plate 2'));
  assert.ok(detected.plateNames[3].includes('Plate 3'));
});

test('simulateBambuCloudDispatch simulates Bambu MQTT OTA wireless dispatch to bound printer', async () => {
  const { DEFAULT_BAMBU_ACCOUNT, simulateBambuCloudDispatch } = await import('./slicerEngine');
  assert.equal(DEFAULT_BAMBU_ACCOUNT.isLoggedIn, true);
  assert.ok(DEFAULT_BAMBU_ACCOUNT.boundPrinters.length >= 2);

  const targetDev = DEFAULT_BAMBU_ACCOUNT.boundPrinters[0].devId;
  const dispatchRes = await simulateBambuCloudDispatch(
    'Benchy_Plate1.3mf',
    DEFAULT_BAMBU_ACCOUNT,
    targetDev,
    'Plate 1 - Hull'
  );

  assert.equal(dispatchRes.success, true);
  assert.ok(dispatchRes.jobId.startsWith('bbl_job_'));
  assert.equal(dispatchRes.mqttTopic, `device/${targetDev}/request`);
  assert.ok(dispatchRes.message.includes('Plate 1 - Hull'));
  assert.ok(dispatchRes.message.includes(DEFAULT_BAMBU_ACCOUNT.accountEmail));
});

test('calculateAllPlatesSliceResult and buildPrintQueueFromPlates slice multiple plates and create an ordered print queue', async () => {
  const {
    calculateAllPlatesSliceResult,
    buildPrintQueueFromPlates,
  } = await import('./slicerEngine');

  const plates = [
    { id: 1, name: 'Plate 1 - Hull', plateType: 'Textured PEI Plate' as const },
    { id: 2, name: 'Plate 2 - Cabin', plateType: 'Textured PEI Plate' as const },
    { id: 3, name: 'Plate 3 - Mast', plateType: 'Textured PEI Plate' as const },
  ];

  const multiObjs: PlateObject[] = [
    {
      id: 'p1-obj',
      name: 'Hull.3mf',
      sourceFormat: '3MF',
      presetType: 'benchy_hull',
      amsSlotId: 1,
      plateId: 1,
      baseDims: { x: 60, y: 31, z: 48 },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      triangles: 22560,
      visible: true,
    },
    {
      id: 'p2-obj',
      name: 'Cabin.3mf',
      sourceFormat: '3MF',
      presetType: 'planetary_gear',
      amsSlotId: 2,
      plateId: 2,
      baseDims: { x: 50, y: 50, z: 24 },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      triangles: 14800,
      visible: true,
    },
    {
      id: 'p3-obj',
      name: 'Mast.3mf',
      sourceFormat: '3MF',
      presetType: 'calibration_cube',
      amsSlotId: 1,
      plateId: 3,
      baseDims: { x: 30, y: 30, z: 36 },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      triangles: 8640,
      visible: true,
    },
  ];

  const multiSlice = calculateAllPlatesSliceResult(
    plates,
    multiObjs,
    MOCK_SETTINGS,
    MOCK_AMS
  );
  assert.equal(multiSlice.isMultiPlate, true);
  assert.equal(multiSlice.plates.length, 3);
  assert.ok(multiSlice.totalTimeSeconds > 800);
  assert.ok(multiSlice.totalFilamentGrams > 15);
  assert.ok(multiSlice.totalLayersAcrossPlates > 400);

  const queue = buildPrintQueueFromPlates(
    multiSlice,
    'bambu_cloud',
    'Bambu Lab X1C — Studio Bay 01'
  );
  assert.equal(queue.length, 3);
  assert.equal(queue[0].status, 'printing');
  assert.equal(queue[0].plateId, 1);
  assert.equal(queue[1].status, 'queued');
  assert.equal(queue[1].plateId, 2);
  assert.equal(queue[2].status, 'queued');
  assert.equal(queue[2].plateId, 3);
});

test('BAMBU_PRINTER_MODELS_CATALOG includes all 8 known Bambu Lab printer models and adapts plate bounds', async () => {
  const {
    BAMBU_PRINTER_MODELS_CATALOG,
    getBambuPrinterModelSpec,
  } = await import('./slicerEngine');

  const expectedModels = [
    'Bambu Lab X1 Carbon',
    'Bambu Lab X1E',
    'Bambu Lab X1',
    'Bambu Lab P1S',
    'Bambu Lab P1P',
    'Bambu Lab A1',
    'Bambu Lab A1 mini',
    'Bambu Lab H2D',
  ];

  assert.equal(BAMBU_PRINTER_MODELS_CATALOG.length, 8);
  for (const modelName of expectedModels) {
    const found = BAMBU_PRINTER_MODELS_CATALOG.find((m) => m.id === modelName);
    assert.ok(found, `Missing printer model ${modelName}`);
  }

  const a1MiniSpec = getBambuPrinterModelSpec('Bambu Lab A1 mini');
  assert.deepEqual(a1MiniSpec.buildVolume, { x: 180, y: 180, z: 180 });
  assert.equal(a1MiniSpec.maxBedTempC, 80);

  const h2dSpec = getBambuPrinterModelSpec('Bambu Lab H2D');
  assert.deepEqual(h2dSpec.buildVolume, { x: 350, y: 320, z: 325 });
  assert.equal(h2dSpec.maxNozzleTempC, 350);

  // A 220mm wide part fits on X1C (256mm) and H2D (350mm), but exceeds A1 mini (180mm)
  const widePart: PlateObject = {
    id: 'wide-1',
    name: 'Wide_Gantry_Plate.3mf',
    sourceFormat: '3MF',
    presetType: 'bambu_scraper',
    amsSlotId: 1,
    baseDims: { x: 220, y: 120, z: 25 },
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    triangles: 2400,
    visible: true,
  };

  assert.equal(validatePlateBounds(widePart, a1MiniSpec.buildVolume).valid, false);
  assert.equal(
    validatePlateBounds(widePart, getBambuPrinterModelSpec('Bambu Lab X1 Carbon').buildVolume).valid,
    true
  );
  assert.equal(validatePlateBounds(widePart, h2dSpec.buildVolume).valid, true);
});

test('mirrorPlateObject, clonePlateObjectMulti, fillPlateWithObjectCopies, and per-object overrides work accurately', async () => {
  const {
    centerPlateObject,
    clonePlateObjectMulti,
    fillPlateWithObjectCopies,
    mirrorPlateObject,
    resetPlateObjectTransform,
  } = await import('./slicerEngine');

  const baseObj: PlateObject = {
    id: 'obj-ctx-1',
    name: 'Bench_Part.3mf',
    sourceFormat: '3MF',
    presetType: 'benchy_hull',
    amsSlotId: 1,
    plateId: 1,
    baseDims: { x: 60, y: 31, z: 48 },
    position: { x: -35, y: 20, z: 0 },
    rotation: { x: 0, y: 0, z: 45 },
    scale: { x: 1.5, y: 1.5, z: 1.5 },
    triangles: 22560,
    visible: true,
  };

  // Mirror X and Z toggles
  const mirroredX = mirrorPlateObject(baseObj, 'x');
  assert.deepEqual(mirroredX.mirror, { x: true, y: false, z: false });
  const mirroredXZ = mirrorPlateObject(mirroredX, 'z');
  assert.deepEqual(mirroredXZ.mirror, { x: true, y: false, z: true });
  const unmirroredX = mirrorPlateObject(mirroredXZ, 'x');
  assert.deepEqual(unmirroredX.mirror, { x: false, y: false, z: true });

  // Center & Reset transform
  const centered = centerPlateObject(mirroredXZ);
  assert.deepEqual(centered.position, { x: 0, y: 0, z: 0 });
  const reset = resetPlateObjectTransform(mirroredXZ);
  assert.deepEqual(reset.scale, { x: 1, y: 1, z: 1 });
  assert.deepEqual(reset.rotation, { x: 0, y: 0, z: 0 });
  assert.deepEqual(reset.mirror, { x: false, y: false, z: false });

  // Multi-clone (+2 copies -> total 3 objects)
  const multiCloneRes = clonePlateObjectMulti(reset, [reset], 2);
  assert.equal(multiCloneRes.objects.length, 3);
  assert.ok(multiCloneRes.lastCreatedId.includes('obj-ctx-1-copy-'));

  // Fill plate with copies (adds up to 9 arranged objects)
  const fillRes = fillPlateWithObjectCopies(reset, [reset]);
  assert.ok(fillRes.objects.length > 2 && fillRes.objects.length <= 9);
  assert.ok(fillRes.copiesAdded >= 2);

  // Per-object infill override affects slice filament weight
  const defaultSlice = calculateSliceResult([reset], MOCK_SETTINGS, MOCK_AMS);
  const solidOverrideSlice = calculateSliceResult(
    [{ ...reset, infillDensityOverride: 100 }],
    MOCK_SETTINGS,
    MOCK_AMS
  );
  assert.ok(solidOverrideSlice.totalFilamentGrams > defaultSlice.totalFilamentGrams);
});
