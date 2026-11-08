import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type {
  AmsSlot,
  CameraPreset,
  PlateObject,
  SlicerProcessSettings,
  WorkspaceTab,
} from '../types/slicer';
import {
  buildPlateObjectGroup,
  createBambuPeiPlateTextures,
} from '../utils/proceduralModels';
import {
  getBambuPrinterModelSpec,
  getScaledDimensions,
  validatePlateBounds,
} from '../utils/slicerEngine';

interface BuildPlateViewportProps {
  objects: PlateObject[];
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onMoveObject?: (id: string, position: { x: number; y: number; z: number }) => void;
  onContextMenuObject?: (id: string, clientX: number, clientY: number) => void;
  amsSlots: AmsSlot[];
  settings: SlicerProcessSettings;
  activeTab: WorkspaceTab;
  previewLayer: number;
  totalLayers: number;
  cameraPreset: CameraPreset;
  onCameraPresetHandled: () => void;
  wireframeMode: boolean;
  showToolheadInPreview: boolean;
}

const CAMERA_PRESET_TARGETS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  iso: { pos: [215, 195, 235], target: [0, 28, 0] },
  top: { pos: [0, 340, 0.1], target: [0, 0, 0] },
  front: { pos: [0, 65, 310], target: [0, 32, 0] },
  right: { pos: [310, 65, 0], target: [0, 32, 0] },
};

interface ObjectSceneNodes {
  objGroup: THREE.Group;
  contactDisc: THREE.Mesh;
  boxLines?: THREE.LineSegments;
  ringMesh?: THREE.Mesh;
  crossGroup?: THREE.Group;
  dimsZ: number;
}

export const BuildPlateViewport: React.FC<BuildPlateViewportProps> = ({
  objects,
  selectedObjectId,
  onSelectObject,
  onMoveObject,
  onContextMenuObject,
  amsSlots,
  settings,
  activeTab,
  previewLayer,
  totalLayers,
  cameraPreset,
  wireframeMode,
  showToolheadInPreview,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const onSelectObjectRef = useRef(onSelectObject);
  onSelectObjectRef.current = onSelectObject;

  const onMoveObjectRef = useRef(onMoveObject);
  onMoveObjectRef.current = onMoveObject;

  const onContextMenuObjectRef = useRef(onContextMenuObject);
  onContextMenuObjectRef.current = onContextMenuObject;

  const selectedObjectIdRef = useRef<string | null>(selectedObjectId);
  selectedObjectIdRef.current = selectedObjectId;

  const objectsRef = useRef<PlateObject[]>(objects);
  objectsRef.current = objects;

  const activeTabRef = useRef<WorkspaceTab>(activeTab);
  activeTabRef.current = activeTab;

  const printerSpec = getBambuPrinterModelSpec(settings.printerModel);
  const buildVolumeRef = useRef(printerSpec.buildVolume);
  buildVolumeRef.current = printerSpec.buildVolume;

  const isDraggingRef = useRef<boolean>(false);
  const nodeMapRef = useRef<Map<string, ObjectSceneNodes>>(new Map());

  const [draggingHud, setDraggingHud] = useState<{
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const [cursorMode, setCursorMode] = useState<'grab' | 'pointer' | 'move' | 'grabbing'>('grab');

  const sceneStateRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    subBedMesh: THREE.Mesh;
    peiMesh: THREE.Mesh;
    frontTab: THREE.Mesh;
    volumeLines: THREE.LineSegments;
    axisGroup: THREE.Group;
    objectsRoot: THREE.Group;
    selectionBoxGroup: THREE.Group;
    layerSlicePlaneMesh: THREE.Group;
    toolheadGroup: THREE.Group;
    clippingPlane: THREE.Plane;
    requestRender: () => void;
    triggerCameraTransition: (preset: CameraPreset) => void;
    clickableMeshes: THREE.Object3D[];
  } | null>(null);

  // Initialize Three.js WebGLRenderer & Bambu X1C Build Plate once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 680;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f17);
    scene.fog = new THREE.FogExp2(0x0b0f17, 0.0012);

    const camera = new THREE.PerspectiveCamera(42, width / height, 1, 2000);
    camera.position.set(215, 195, 235);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.localClippingEnabled = true;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3-Point Warm/Cool Studio Rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.85);
    hemiLight.position.set(0, 300, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.9);
    keyLight.position.set(160, 280, 180);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 20;
    keyLight.shadow.camera.far = 700;
    const d = 160;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rimLight.position.set(-190, 140, -180);
    scene.add(rimLight);

    // Bambu Lab X1 Carbon 256x256mm Textured PEI Build Plate assembly
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const { colorMap, bumpMap } = createBambuPeiPlateTextures(maxAnisotropy);

    const plateGroup = new THREE.Group();

    // Magnetic Heated Aluminum Sub-Bed
    const subBedGeom = new THREE.BoxGeometry(262, 4, 266);
    const subBedMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.75,
    });
    const subBedMesh = new THREE.Mesh(subBedGeom, subBedMat);
    subBedMesh.position.y = -3.2;
    plateGroup.add(subBedMesh);

    // Flexible Spring Steel Textured PEI Sheet (256 x 256 mm)
    const peiGeom = new THREE.BoxGeometry(256, 1.6, 256);
    const peiSideMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.6,
    });
    const peiTopMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: colorMap,
      bumpMap: bumpMap,
      bumpScale: 0.15,
      roughness: 0.55,
      metalness: 0.22,
    });
    const peiMesh = new THREE.Mesh(peiGeom, [
      peiSideMat,
      peiSideMat,
      peiTopMat,
      peiSideMat,
      peiSideMat,
      peiSideMat,
    ]);
    peiMesh.position.y = -0.8;
    peiMesh.receiveShadow = true;
    plateGroup.add(peiMesh);

    // Front alignment tongue & rear nozzle wiper tab (authentic Bambu X1C silhouette)
    const frontTabGeom = new THREE.BoxGeometry(68, 1.5, 10);
    const frontTab = new THREE.Mesh(frontTabGeom, peiSideMat);
    frontTab.position.set(0, -0.8, 132);
    plateGroup.add(frontTab);

    // 256x256x256mm Build Volume Wireframe Enclosure Box
    const volumeBoxGeom = new THREE.BoxGeometry(256, 256, 256);
    const volumeEdges = new THREE.EdgesGeometry(volumeBoxGeom);
    const volumeLines = new THREE.LineSegments(
      volumeEdges,
      new THREE.LineBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.38,
      })
    );
    volumeLines.position.y = 128;
    plateGroup.add(volumeLines);

    // Origin Axis Indicator at front-left corner (-128, 0, 128)
    const axisGroup = new THREE.Group();
    axisGroup.position.set(-128, 0.2, 128);
    const xAxisGeom = new THREE.CylinderGeometry(0.9, 0.9, 28, 8);
    xAxisGeom.rotateZ(-Math.PI / 2);
    const xAxis = new THREE.Mesh(
      xAxisGeom,
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    xAxis.position.x = 14;
    axisGroup.add(xAxis);

    const yAxisGeom = new THREE.CylinderGeometry(0.9, 0.9, 28, 8);
    yAxisGeom.rotateX(-Math.PI / 2);
    const yAxis = new THREE.Mesh(
      yAxisGeom,
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    yAxis.position.z = -14;
    axisGroup.add(yAxis);

    const zAxisGeom = new THREE.CylinderGeometry(0.9, 0.9, 28, 8);
    const zAxis = new THREE.Mesh(
      zAxisGeom,
      new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
    );
    zAxis.position.y = 14;
    axisGroup.add(zAxis);
    plateGroup.add(axisGroup);

    scene.add(plateGroup);

    // Dynamic groups for plate objects, selection bounding box, active layer slice plane, and X1C toolhead
    const objectsRoot = new THREE.Group();
    scene.add(objectsRoot);

    const selectionBoxGroup = new THREE.Group();
    scene.add(selectionBoxGroup);

    const layerSlicePlaneMesh = new THREE.Group();
    scene.add(layerSlicePlaneMesh);

    // Composite 4-part Bambu X1C Carbon-Fiber CoreXY Extruder Toolhead (shown in Preview mode)
    const toolheadGroup = new THREE.Group();
    const shroudGeom = new THREE.BoxGeometry(24, 34, 24);
    const shroudMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.45,
    });
    const shroudMesh = new THREE.Mesh(shroudGeom, shroudMat);
    shroudMesh.position.y = 22;
    toolheadGroup.add(shroudMesh);

    // Bambu Emerald LiDAR & Status Bar accent on toolhead
    const lidarBandGeom = new THREE.BoxGeometry(24.6, 3.5, 24.6);
    const lidarBandMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.5,
      roughness: 0.2,
    });
    const lidarBand = new THREE.Mesh(lidarBandGeom, lidarBandMat);
    lidarBand.position.y = 14;
    toolheadGroup.add(lidarBand);

    // Hardened Steel Hotend Nozzle Tip
    const nozzleConeGeom = new THREE.ConeGeometry(3.2, 6, 16);
    nozzleConeGeom.rotateX(Math.PI);
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.85,
    });
    const nozzleMesh = new THREE.Mesh(nozzleConeGeom, nozzleMat);
    nozzleMesh.position.y = 3;
    toolheadGroup.add(nozzleMesh);

    // Carbon-fiber X-axis gantry rods
    const rodGeom = new THREE.CylinderGeometry(2.2, 2.2, 256, 12);
    rodGeom.rotateZ(Math.PI / 2);
    const rodMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.7,
    });
    const rodFront = new THREE.Mesh(rodGeom, rodMat);
    rodFront.position.set(0, 26, 14);
    toolheadGroup.add(rodFront);

    toolheadGroup.visible = false;
    scene.add(toolheadGroup);

    const clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 300);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 28, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 60;
    controls.maxDistance = 620;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.update();

    // Camera transition state
    let activeTransition: {
      targetPos: THREE.Vector3;
      targetLook: THREE.Vector3;
    } | null = null;

    let lastFrameTimeMs = performance.now();
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (gl.flush) gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const poll = () => {
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        const nowMs = performance.now();
        const dt = Math.min(0.1, Math.max(0.001, (nowMs - lastFrameTimeMs) / 1000));
        lastFrameTimeMs = nowMs;

        if (activeTransition) {
          const factor = isSoftwareGl ? 1 : 1 - Math.exp(-10 * dt);
          camera.position.lerp(activeTransition.targetPos, factor);
          controls.target.lerp(activeTransition.targetLook, factor);
          if (
            camera.position.distanceToSquared(activeTransition.targetPos) < 1.5 &&
            controls.target.distanceToSquared(activeTransition.targetLook) < 1.5
          ) {
            camera.position.copy(activeTransition.targetPos);
            controls.target.copy(activeTransition.targetLook);
            activeTransition = null;
          } else {
            renderDirty = true;
          }
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    controls.addEventListener('start', () => {
      activeTransition = null;
    });
    controls.addEventListener('change', () => {
      requestRender();
    });

    function triggerCameraTransition(preset: CameraPreset) {
      const cfg = CAMERA_PRESET_TARGETS[preset];
      if (!cfg) return;
      activeTransition = {
        targetPos: new THREE.Vector3(...cfg.pos),
        targetLook: new THREE.Vector3(...cfg.target),
      };
      requestRender();
    }

    // Raycasting for clicking & dragging already-selected 3D objects on the build plate
    const raycaster = new THREE.Raycaster();
    const pointerDownPos = new THREE.Vector2();
    const mouseNdc = new THREE.Vector2();
    const clickableMeshes: THREE.Object3D[] = [];
    const buildPlatePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const planeHitPoint = new THREE.Vector3();

    let activeDrag: {
      pointerId: number;
      objectId: string;
      objectName: string;
      offsetX: number;
      offsetZ: number;
      initialZ: number;
      moved: boolean;
    } | null = null;

    const getHitPlateObjectId = (clientX: number, clientY: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseNdc, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, true);
      if (hits.length > 0) {
        let curr: THREE.Object3D | null = hits[0].object;
        while (curr && !curr.userData?.plateObjectId) {
          curr = curr.parent;
        }
        if (curr?.userData?.plateObjectId) {
          return String(curr.userData.plateObjectId);
        }
      }
      return null;
    };

    const rightDownPos = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2) {
        rightDownPos.set(e.clientX, e.clientY);
        return;
      }
      if (e.button !== 0) return;
      pointerDownPos.set(e.clientX, e.clientY);

      const hitObjectId = getHitPlateObjectId(e.clientX, e.clientY);
      // Only initiate plate dragging if the model was ALREADY clicked/selected and not locked!
      if (
        hitObjectId &&
        hitObjectId === selectedObjectIdRef.current &&
        activeTabRef.current === 'prepare'
      ) {
        const targetObj = objectsRef.current.find((o) => o.id === hitObjectId);
        if (
          targetObj &&
          !targetObj.locked &&
          raycaster.ray.intersectPlane(buildPlatePlane, planeHitPoint)
        ) {
          const currentWorldX = targetObj.position.x;
          const currentWorldZ = -targetObj.position.y;
          activeDrag = {
            pointerId: e.pointerId,
            objectId: hitObjectId,
            objectName: targetObj.name,
            offsetX: currentWorldX - planeHitPoint.x,
            offsetZ: currentWorldZ - planeHitPoint.z,
            initialZ: targetObj.position.z,
            moved: false,
          };
          isDraggingRef.current = true;
          controls.enabled = false;
          setCursorMode('grabbing');
          setDraggingHud({
            name: targetObj.name,
            x: targetObj.position.x,
            y: targetObj.position.y,
          });
          try {
            renderer.domElement.setPointerCapture(e.pointerId);
          } catch {
            // Ignore in synthetic events
          }
        }
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const rightDist =
        rightDownPos.x === 0 && rightDownPos.y === 0
          ? 0
          : Math.hypot(e.clientX - rightDownPos.x, e.clientY - rightDownPos.y);
      if (rightDist > 8) return; // User right-dragged to pan camera

      const hitObjectId = getHitPlateObjectId(e.clientX, e.clientY);
      const targetId = hitObjectId || selectedObjectIdRef.current;
      if (targetId) {
        onSelectObjectRef.current(targetId);
        onContextMenuObjectRef.current?.(targetId, e.clientX, e.clientY);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activeDrag) {
        const rect = renderer.domElement.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouseNdc, camera);

        if (raycaster.ray.intersectPlane(buildPlatePlane, planeHitPoint)) {
          const halfX = Math.max(40, buildVolumeRef.current.x / 2 - 3);
          const halfY = Math.max(40, buildVolumeRef.current.y / 2 - 3);
          const clampedWorldX = THREE.MathUtils.clamp(
            planeHitPoint.x + activeDrag.offsetX,
            -halfX,
            halfX
          );
          const clampedWorldZ = THREE.MathUtils.clamp(
            planeHitPoint.z + activeDrag.offsetZ,
            -halfY,
            halfY
          );
          const slicerX = Number(clampedWorldX.toFixed(1));
          const slicerY = Number((-clampedWorldZ).toFixed(1));
          activeDrag.moved = true;

          // Update Three.js scene nodes in-place for zero-latency 60fps feedback
          const nodes = nodeMapRef.current.get(activeDrag.objectId);
          if (nodes) {
            nodes.objGroup.position.set(slicerX, activeDrag.initialZ, -slicerY);
            nodes.contactDisc.position.set(slicerX, 0.03, -slicerY);
            if (nodes.boxLines) {
              nodes.boxLines.position.set(
                slicerX,
                activeDrag.initialZ + nodes.dimsZ / 2,
                -slicerY
              );
            }
            if (nodes.ringMesh) {
              nodes.ringMesh.position.set(slicerX, 0.08, -slicerY);
            }
            if (nodes.crossGroup) {
              nodes.crossGroup.position.x = slicerX;
              nodes.crossGroup.position.z = -slicerY;
            }
            requestRender();
          }

          setDraggingHud({
            name: activeDrag.objectName,
            x: slicerX,
            y: slicerY,
          });

          onMoveObjectRef.current?.(activeDrag.objectId, {
            x: slicerX,
            y: slicerY,
            z: activeDrag.initialZ,
          });
        }
        return;
      }

      // Hover cursor affordance when not dragging
      const hoverId = getHitPlateObjectId(e.clientX, e.clientY);
      if (hoverId) {
        if (
          hoverId === selectedObjectIdRef.current &&
          activeTabRef.current === 'prepare'
        ) {
          setCursorMode('move');
        } else {
          setCursorMode('pointer');
        }
      } else {
        setCursorMode('grab');
      }
    };

    const endDragOrClick = (e: PointerEvent) => {
      if (activeDrag) {
        try {
          if (renderer.domElement.hasPointerCapture?.(activeDrag.pointerId)) {
            renderer.domElement.releasePointerCapture(activeDrag.pointerId);
          }
        } catch {
          // Ignore
        }
        activeDrag = null;
        isDraggingRef.current = false;
        controls.enabled = true;
        setDraggingHud(null);
        setCursorMode('move');
        requestRender();
        return;
      }

      const dist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );
      if (dist > 6) return; // Dragged camera, not a click

      const hitObjectId = getHitPlateObjectId(e.clientX, e.clientY);
      if (hitObjectId) {
        onSelectObjectRef.current(hitObjectId);
        if (activeTabRef.current === 'prepare') {
          setCursorMode('move');
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', endDragOrClick);
    renderer.domElement.addEventListener('pointercancel', endDragOrClick);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(100, entry.contentRect.width);
        const h = Math.max(100, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        requestRender();
      }
    });
    resizeObserver.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    sceneStateRef.current = {
      scene,
      camera,
      renderer,
      controls,
      subBedMesh,
      peiMesh,
      frontTab,
      volumeLines,
      axisGroup,
      objectsRoot,
      selectionBoxGroup,
      layerSlicePlaneMesh,
      toolheadGroup,
      clippingPlane,
      requestRender,
      triggerCameraTransition,
      clickableMeshes,
    };

    requestRender();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', endDragOrClick);
      renderer.domElement.removeEventListener('pointercancel', endDragOrClick);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      controls.dispose();
      renderer.dispose();
      sceneStateRef.current = null;
    };
  }, []);

  // Dynamically resize 3D build plate & wireframe enclosure volume when printer model changes
  useEffect(() => {
    const st = sceneStateRef.current;
    if (!st) return;
    const { x, y, z } = printerSpec.buildVolume;
    const scaleX = x / 256;
    const scaleY = y / 256;
    const scaleZ = z / 256;

    st.peiMesh.scale.set(scaleX, 1, scaleY);
    st.subBedMesh.scale.set((x + 6) / 262, 1, (y + 10) / 266);
    st.frontTab.position.set(0, -0.8, y / 2 + 4);
    st.volumeLines.scale.set(scaleX, scaleZ, scaleY);
    st.volumeLines.position.y = z / 2;
    st.axisGroup.position.set(-x / 2, 0.2, y / 2);
    st.requestRender();
  }, [printerSpec.buildVolume]);

  // Trigger camera preset changes smoothly
  useEffect(() => {
    if (!sceneStateRef.current) return;
    sceneStateRef.current.triggerCameraTransition(cameraPreset);
  }, [cameraPreset]);

  // Synchronize 3D Plate Objects, Layer Slicing Plane, and Selection Outlines
  useEffect(() => {
    const st = sceneStateRef.current;
    if (!st) return;

    const {
      objectsRoot,
      selectionBoxGroup,
      layerSlicePlaneMesh,
      toolheadGroup,
      clippingPlane,
      clickableMeshes,
      requestRender,
    } = st;

    // If user is actively dragging a selected model, update existing node positions & outline colors in-place
    if (isDraggingRef.current && nodeMapRef.current.size > 0) {
      for (const obj of objects) {
        const nodes = nodeMapRef.current.get(obj.id);
        if (!nodes) continue;
        nodes.objGroup.position.set(obj.position.x, obj.position.z, -obj.position.y);
        nodes.contactDisc.position.set(obj.position.x, 0.03, -obj.position.y);
        const boundsCheck = validatePlateBounds(obj, printerSpec.buildVolume);
        const boxColor = !boundsCheck.valid ? 0xef4444 : 0x10b981;
        if (nodes.boxLines) {
          nodes.boxLines.position.set(
            obj.position.x,
            obj.position.z + nodes.dimsZ / 2,
            -obj.position.y
          );
          (nodes.boxLines.material as THREE.LineBasicMaterial).color.setHex(boxColor);
        }
        if (nodes.ringMesh) {
          nodes.ringMesh.position.set(obj.position.x, 0.08, -obj.position.y);
          (nodes.ringMesh.material as THREE.MeshBasicMaterial).color.setHex(boxColor);
        }
      }
      requestRender();
      return;
    }

    // Clear previous meshes
    while (objectsRoot.children.length > 0) {
      objectsRoot.remove(objectsRoot.children[0]);
    }
    while (selectionBoxGroup.children.length > 0) {
      selectionBoxGroup.remove(selectionBoxGroup.children[0]);
    }
    while (layerSlicePlaneMesh.children.length > 0) {
      layerSlicePlaneMesh.remove(layerSlicePlaneMesh.children[0]);
    }
    clickableMeshes.length = 0;
    nodeMapRef.current.clear();

    // Determine active Z clipping height in mm
    const isPreview = activeTab === 'preview';
    const maxZHeight =
      objects.length > 0
        ? Math.max(...objects.map((o) => getScaledDimensions(o).z))
        : 48;
    const layerFraction =
      totalLayers > 0 ? Math.max(1, previewLayer) / totalLayers : 1;
    const activeCutHeightMm = isPreview
      ? Math.max(settings.initialLayerHeight, layerFraction * maxZHeight)
      : 300;

    clippingPlane.constant = activeCutHeightMm;

    // Build each visible object on the plate
    for (const obj of objects) {
      if (!obj.visible) continue;

      const slot = amsSlots.find((s) => s.id === obj.amsSlotId) || amsSlots[0];
      const filamentHex = slot ? slot.colorHex : '#10b981';

      const objGroup = buildPlateObjectGroup(
        obj,
        filamentHex,
        clippingPlane,
        wireframeMode
      );
      objGroup.userData.plateObjectId = obj.id;

      // Soft radial contact shadow disc under each object (offset y = 0.03 to prevent Z-fighting)
      const dims = getScaledDimensions(obj);
      const mirrorXSign = obj.mirror?.x ? -1 : 1;
      const mirrorYSign = obj.mirror?.y ? -1 : 1;
      const mirrorZSign = obj.mirror?.z ? -1 : 1;
      const zMirrorOffset = obj.mirror?.z ? dims.z : 0;

      // Apply transforms (Slicer X, Y on plate -> Three.js X, -Z; Slicer Z -> Three.js Y)
      objGroup.position.set(
        obj.position.x,
        obj.position.z + zMirrorOffset,
        -obj.position.y
      );
      objGroup.scale.set(
        Math.abs(obj.scale.x) * mirrorXSign,
        Math.abs(obj.scale.z) * mirrorZSign,
        Math.abs(obj.scale.y) * mirrorYSign
      );
      objGroup.rotation.set(
        THREE.MathUtils.degToRad(obj.rotation.x),
        THREE.MathUtils.degToRad(obj.rotation.z),
        THREE.MathUtils.degToRad(obj.rotation.y)
      );

      const shadowRadius = Math.max(dims.x, dims.y) * 0.62;
      const contactGeom = new THREE.CircleGeometry(shadowRadius, 32);
      contactGeom.rotateX(-Math.PI / 2);
      const contactMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      });
      const contactDisc = new THREE.Mesh(contactGeom, contactMat);
      contactDisc.position.set(obj.position.x, 0.03, -obj.position.y);
      objectsRoot.add(contactDisc);

      objectsRoot.add(objGroup);
      clickableMeshes.push(objGroup);

      const sceneNodes: ObjectSceneNodes = {
        objGroup,
        contactDisc,
        dimsZ: dims.z,
      };

      // Selection or Out-of-bounds bounding box indicator
      const boundsCheck = validatePlateBounds(obj, printerSpec.buildVolume);
      const isSelected = obj.id === selectedObjectId;

      if (isSelected || !boundsCheck.valid) {
        const boxGeom = new THREE.BoxGeometry(dims.x + 2, dims.z + 1, dims.y + 2);
        const boxEdges = new THREE.EdgesGeometry(boxGeom);
        const boxColor = !boundsCheck.valid ? 0xef4444 : 0x10b981;
        const boxLines = new THREE.LineSegments(
          boxEdges,
          new THREE.LineBasicMaterial({ color: boxColor })
        );
        boxLines.position.set(
          obj.position.x,
          obj.position.z + dims.z / 2,
          -obj.position.y
        );
        selectionBoxGroup.add(boxLines);
        sceneNodes.boxLines = boxLines;

        // Corner base bracket ring on build plate
        const ringGeom = new THREE.RingGeometry(
          Math.max(dims.x, dims.y) * 0.55,
          Math.max(dims.x, dims.y) * 0.58,
          36
        );
        ringGeom.rotateX(-Math.PI / 2);
        const ringMesh = new THREE.Mesh(
          ringGeom,
          new THREE.MeshBasicMaterial({
            color: boxColor,
            side: THREE.DoubleSide,
          })
        );
        ringMesh.position.set(obj.position.x, 0.08, -obj.position.y);
        selectionBoxGroup.add(ringMesh);
        sceneNodes.ringMesh = ringMesh;
      }

      // If in Preview Mode and slice plane intersects this object, draw active layer toolpath & infill cross-section
      if (isPreview && activeCutHeightMm <= dims.z + 0.5) {
        const crossGroup = new THREE.Group();
        crossGroup.position.set(obj.position.x, activeCutHeightMm, -obj.position.y);

        // Outer wall orange toolpath perimeter
        const outerPerimGeom = new THREE.RingGeometry(
          Math.min(dims.x, dims.y) * 0.34,
          Math.min(dims.x, dims.y) * 0.39,
          32
        );
        outerPerimGeom.rotateX(-Math.PI / 2);
        const outerPerimMesh = new THREE.Mesh(
          outerPerimGeom,
          new THREE.MeshBasicMaterial({
            color: 0xf97316,
            side: THREE.DoubleSide,
          })
        );
        crossGroup.add(outerPerimMesh);

        // Inner wall green toolpath perimeter
        const innerPerimGeom = new THREE.RingGeometry(
          Math.min(dims.x, dims.y) * 0.28,
          Math.min(dims.x, dims.y) * 0.33,
          32
        );
        innerPerimGeom.rotateX(-Math.PI / 2);
        const innerPerimMesh = new THREE.Mesh(
          innerPerimGeom,
          new THREE.MeshBasicMaterial({
            color: 0x22c55e,
            side: THREE.DoubleSide,
          })
        );
        crossGroup.add(innerPerimMesh);

        // Sparse Infill red cross-hatch lines inside active layer
        const infillRadius = Math.min(dims.x, dims.y) * 0.26;
        const infillPoints: THREE.Vector3[] = [];
        const step = Math.max(2.5, (100 - settings.infillDensity) * 0.08);
        for (let offset = -infillRadius; offset <= infillRadius; offset += step) {
          const halfChord = Math.sqrt(
            Math.max(0, infillRadius * infillRadius - offset * offset)
          );
          infillPoints.push(
            new THREE.Vector3(-halfChord, 0.05, offset),
            new THREE.Vector3(halfChord, 0.05, offset),
            new THREE.Vector3(offset, 0.05, -halfChord),
            new THREE.Vector3(offset, 0.05, halfChord)
          );
        }
        const infillGeom = new THREE.BufferGeometry().setFromPoints(infillPoints);
        const infillLines = new THREE.LineSegments(
          infillGeom,
          new THREE.LineBasicMaterial({ color: 0xef4444 })
        );
        crossGroup.add(infillLines);

        layerSlicePlaneMesh.add(crossGroup);
        sceneNodes.crossGroup = crossGroup;
      }

      nodeMapRef.current.set(obj.id, sceneNodes);
    }

    // Position the Bambu X1C Toolhead at the active layer cut plane in Preview Mode
    if (isPreview && showToolheadInPreview && objects.length > 0) {
      const targetObj =
        objects.find((o) => o.id === selectedObjectId) || objects[0];
      const dims = getScaledDimensions(targetObj);
      const clampedZ = Math.min(activeCutHeightMm, dims.z);
      const angle = (previewLayer * 0.45) % (Math.PI * 2);
      const r = Math.min(dims.x, dims.y) * 0.25;
      toolheadGroup.position.set(
        targetObj.position.x + Math.cos(angle) * r,
        clampedZ,
        -targetObj.position.y + Math.sin(angle) * r
      );
      toolheadGroup.visible = true;
    } else {
      toolheadGroup.visible = false;
    }

    requestRender();
  }, [
    objects,
    selectedObjectId,
    amsSlots,
    settings,
    activeTab,
    previewLayer,
    totalLayers,
    wireframeMode,
    showToolheadInPreview,
  ]);

  const cursorClass =
    cursorMode === 'grabbing'
      ? 'cursor-grabbing'
      : cursorMode === 'move'
      ? 'cursor-move'
      : cursorMode === 'pointer'
      ? 'cursor-pointer'
      : 'cursor-grab active:cursor-grabbing';

  return (
    <div className="relative w-full h-full bg-[#0b0f17] overflow-hidden">
      {/* Dedicated empty ref container for Three.js WebGL canvas */}
      <div
        ref={canvasMountRef}
        data-testid="bambu-3d-viewport"
        className={`w-full h-full ${cursorClass}`}
      />

      {/* Live Plate Dragging Coordinate HUD */}
      {draggingHud && (
        <div
          data-testid="plate-drag-hud"
          className="absolute top-14 left-4 pointer-events-none flex items-center gap-2.5 text-xs font-mono bg-emerald-950/95 border border-emerald-500/80 text-emerald-200 px-3 py-1.5 rounded-lg shadow-lg"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white">Dragging {draggingHud.name}</span>
          <span>·</span>
          <span>X: {draggingHud.x.toFixed(1)} mm</span>
          <span>·</span>
          <span>Y: {draggingHud.y.toFixed(1)} mm</span>
        </div>
      )}
    </div>
  );
};
