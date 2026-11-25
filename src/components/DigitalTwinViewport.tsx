import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CameraPresetId,
  CentralGatewayHub,
  InspectableBuilding,
  SelectedInspectable,
  SimulationControls,
  SimulationState,
} from '../simulation/types';
import { CAMERA_PRESETS, GATEWAY_COORDS } from '../simulation/worldLayout';
import { createProceduralTextures } from '../scene/textures';
import { buildNeighborhoodTerrain, getTerrainHeight } from '../scene/terrain';
import { buildNeighborhoodArchitecture } from '../scene/buildings';
import { buildCentralGatewayHub } from '../scene/sensors';
import { buildEnvironmentalSimulations } from '../scene/simulations';

interface DigitalTwinViewportProps {
  controls: SimulationControls;
  simState: SimulationState;
  activeCameraPreset: CameraPresetId;
  selectedInspectable: SelectedInspectable;
  onSelectInspectable: (item: SelectedInspectable) => void;
  onStepSimulation: (dt: number) => void;
}

const STATUS_DOT_COLOR: Record<CentralGatewayHub['status'], string> = {
  Nominal: '#10b981',
  Watch: '#f59e0b',
  Warning: '#f97316',
  Emergency: '#ef4444',
};

export const DigitalTwinViewport: React.FC<DigitalTwinViewportProps> = ({
  controls,
  simState,
  activeCameraPreset,
  selectedInspectable,
  onSelectInspectable,
  onStepSimulation,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const gatewayBadgeRef = useRef<HTMLButtonElement | null>(null);

  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  const simStateRef = useRef(simState);
  simStateRef.current = simState;

  const selectedRef = useRef(selectedInspectable);
  selectedRef.current = selectedInspectable;

  const onSelectRef = useRef(onSelectInspectable);
  onSelectRef.current = onSelectInspectable;

  const onStepRef = useRef(onStepSimulation);
  onStepRef.current = onStepSimulation;

  const cameraTransitionRef = useRef<{
    active: boolean;
    targetPos: THREE.Vector3;
    targetLookAt: THREE.Vector3;
  }>({
    active: false,
    targetPos: new THREE.Vector3(...CAMERA_PRESETS[0].position),
    targetLookAt: new THREE.Vector3(...CAMERA_PRESETS[0].target),
  });

  useEffect(() => {
    const preset = CAMERA_PRESETS.find((p) => p.id === activeCameraPreset);
    if (preset) {
      cameraTransitionRef.current = {
        active: true,
        targetPos: new THREE.Vector3(...preset.position),
        targetLookAt: new THREE.Vector3(...preset.target),
      };
    }
  }, [activeCameraPreset]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let cancelled = false;
    let frameId = 0;

    let cleanupFn: (() => void) | null = null;

    function initScene(mountEl: HTMLDivElement, w: number, h: number) {
      const probeCanvas = document.createElement('canvas');
      const probeGl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      const dbgInfo = probeGl?.getExtension('WEBGL_debug_renderer_info');
      const rendererStr = dbgInfo
        ? String(probeGl?.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL) || '')
        : '';
      const isSoftwareGl = /swiftshader|llvmpipe|software|mesa/i.test(rendererStr);

      const renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = isSoftwareGl
        ? THREE.BasicShadowMap
        : THREE.PCFSoftShadowMap;

      mountEl.innerHTML = '';
      mountEl.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x9fc2dc);
      scene.fog = new THREE.FogExp2(0x9fc2dc, 0.0021);

      // Photorealistic IBL environment map for glass curtain walls & titanium metals
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      roomEnv.dispose();
      pmremGenerator.dispose();

      // Camera & OrbitControls
      const camera = new THREE.PerspectiveCamera(44, w / h, 0.5, 900);
      camera.position.set(...CAMERA_PRESETS[0].position);

      const orbit = new OrbitControls(camera, renderer.domElement);
      orbit.target.set(...CAMERA_PRESETS[0].target);
      orbit.enableDamping = true;
      orbit.dampingFactor = 0.06;
      orbit.maxPolarAngle = Math.PI / 2 - 0.03;
      orbit.minDistance = 12;
      orbit.maxDistance = 340;
      orbit.update();

      const stopTransition = () => {
        cameraTransitionRef.current.active = false;
      };
      orbit.addEventListener('start', stopTransition);

      // Lighting System (ArchViz Sun + Sky Hemisphere + Fill Light)
      const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x3b4d38, 0.85);
      hemiLight.position.set(0, 120, 0);
      scene.add(hemiLight);

      const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.35);
      sunLight.position.set(85, 115, 65);
      sunLight.castShadow = true;
      const shadowRes = isSoftwareGl ? 1024 : 2048;
      sunLight.shadow.mapSize.width = shadowRes;
      sunLight.shadow.mapSize.height = shadowRes;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 360;
      const d = 140;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0005;
      scene.add(sunLight);

      const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.55);
      fillLight.position.set(-90, 60, -70);
      scene.add(fillLight);

      // Build Procedural PBR Textures & Scene Layers
      const textures = createProceduralTextures();
      const terrainGroup = buildNeighborhoodTerrain(textures);
      scene.add(terrainGroup);

      const { root: buildingsGroup, buildingMeshes } =
        buildNeighborhoodArchitecture(textures);
      scene.add(buildingsGroup);

      const gatewayScene = buildCentralGatewayHub(textures);
      scene.add(gatewayScene.root);

      const envSims = buildEnvironmentalSimulations(textures);
      scene.add(envSims.root);

      // Raycasting for 3D Gateway & Building Click Inspection
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let pointerDownPos = { x: 0, y: 0 };

      const onPointerDown = (e: PointerEvent) => {
        pointerDownPos = { x: e.clientX, y: e.clientY };
      };

      const onPointerUp = (e: PointerEvent) => {
        const moveDist = Math.hypot(
          e.clientX - pointerDownPos.x,
          e.clientY - pointerDownPos.y
        );
        if (moveDist > 6) return;

        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);

        // 1. Check Central Gateway Hub first
        const gatewayHits = raycaster.intersectObject(gatewayScene.gatewayGroup, true);
        if (gatewayHits.length > 0) {
          onSelectRef.current({ type: 'gateway' });
          const [gx, gz] = GATEWAY_COORDS;
          const gy = getTerrainHeight(gx, gz);
          cameraTransitionRef.current = {
            active: true,
            targetPos: new THREE.Vector3(gx + 22, gy + 20, gz + 24),
            targetLookAt: new THREE.Vector3(gx, gy + 11, gz),
          };
          return;
        }

        // 2. Check inspectable buildings
        const bTargets = Array.from(buildingMeshes.values());
        const bHits = raycaster.intersectObjects(bTargets, true);
        if (bHits.length > 0) {
          let obj: THREE.Object3D | null = bHits[0].object;
          while (obj && !obj.userData.inspectableBuilding) {
            obj = obj.parent;
          }
          if (obj && obj.userData.inspectableBuilding) {
            const building = obj.userData.inspectableBuilding as InspectableBuilding;
            onSelectRef.current({ type: 'building', building });
            const [bx, by, bz] = building.position;
            cameraTransitionRef.current = {
              active: true,
              targetPos: new THREE.Vector3(bx + 26, by + 22, bz + 28),
              targetLookAt: new THREE.Vector3(bx, by + 6, bz),
            };
          }
        }
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointerup', onPointerUp);

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
          }
        }
      });
      ro.observe(mountEl);

      // Paced Render Loop
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const afterDraw = (cb: FrameRequestCallback) => {
        if (!isSoftwareGl || typeof gl.fenceSync !== 'function') {
          frameId = requestAnimationFrame(cb);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (cancelled) return;
          const status = gl.clientWaitSync(sync!, 0, 0);
          if (
            status === gl.ALREADY_SIGNALED ||
            status === gl.CONDITION_SATISFIED ||
            status === gl.WAIT_FAILED
          ) {
            gl.deleteSync(sync);
            frameId = requestAnimationFrame(cb);
          } else {
            setTimeout(poll, 4);
          }
        };
        setTimeout(poll, 4);
      };

      let lastTime = performance.now();
      let simAccumulator = 0;
      let elapsedSec = 0;
      const projVec = new THREE.Vector3();

      const [gx, gz] = GATEWAY_COORDS;
      const gy = getTerrainHeight(gx, gz);

      const skyClearColor = new THREE.Color(0x9fc2dc);
      const skyStormColor = new THREE.Color(0x3a4a5e);
      const skySmokeColor = new THREE.Color(0x6e6862);
      const currentSkyColor = new THREE.Color(0x9fc2dc);

      const tick = (now: number) => {
        if (cancelled) return;
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        elapsedSec += dt;

        // Step simulation state at 5 Hz
        simAccumulator += dt;
        if (simAccumulator >= 0.2) {
          onStepRef.current(simAccumulator);
          simAccumulator = 0;
        }

        const simControls = controlsRef.current;
        const currentSimState = simStateRef.current;
        const selected = selectedRef.current;

        // Smooth camera transition
        if (cameraTransitionRef.current.active) {
          camera.position.lerp(cameraTransitionRef.current.targetPos, 0.065);
          orbit.target.lerp(cameraTransitionRef.current.targetLookAt, 0.075);
          if (
            camera.position.distanceTo(cameraTransitionRef.current.targetPos) < 0.45 &&
            orbit.target.distanceTo(cameraTransitionRef.current.targetLookAt) < 0.45
          ) {
            cameraTransitionRef.current.active = false;
          }
        }

        orbit.update();

        // Atmospheric sky & lighting adaptation for Rain + Fire/Smoke
        const rainFactor = Math.min(1, simControls.rainfallIntensity / 110);
        const smokeFactor = simControls.fireAndSmokeActive
          ? (simControls.smokeIntensity / 100) * 0.45
          : 0;

        currentSkyColor
          .copy(skyClearColor)
          .lerp(skyStormColor, rainFactor * 0.78)
          .lerp(skySmokeColor, smokeFactor);

        scene.background = currentSkyColor;
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.copy(currentSkyColor);
          scene.fog.density = 0.0019 + rainFactor * 0.0016 + smokeFactor * 0.0018;
        }

        const timeNorm = (simControls.timeOfDay - 6) / 13;
        const sunAngle = THREE.MathUtils.clamp(timeNorm, 0.05, 0.95) * Math.PI;
        sunLight.position.set(
          Math.cos(sunAngle) * 115,
          Math.max(26, Math.sin(sunAngle) * 125),
          65
        );
        sunLight.intensity =
          (1.2 + Math.sin(sunAngle) * 1.3) * (1 - rainFactor * 0.48);

        // Update 3D Central Gateway Hub & Environmental Simulations
        gatewayScene.updateGatewayVisuals(
          currentSimState.gateway,
          selected?.type === 'gateway',
          simControls.showGatewayScan,
          elapsedSec
        );
        envSims.update(simControls, currentSimState, dt, elapsedSec);

        renderer.render(scene, camera);

        // Update 2D Projected Screen Coordinates for Single Central Gateway Badge
        const el = gatewayBadgeRef.current;
        if (el) {
          const width = renderer.domElement.clientWidth;
          const height = renderer.domElement.clientHeight;
          projVec.set(gx, gy + 26.8, gz);
          projVec.project(camera);

          if (projVec.z > 1.0 || projVec.z < -1.0) {
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
          } else {
            const x = (projVec.x * 0.5 + 0.5) * width;
            const y = (-(projVec.y * 0.5) + 0.5) * height;
            const inBounds =
              x > 30 && x < width - 30 && y > 48 && y < height - 50;
            el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
            el.style.opacity = inBounds ? '1' : '0';
            el.style.pointerEvents = inBounds ? 'auto' : 'none';
          }
        }

        afterDraw(tick);
      };

      frameId = requestAnimationFrame(tick);

      cleanupFn = () => {
        ro.disconnect();
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer.domElement.removeEventListener('pointerup', onPointerUp);
        orbit.dispose();
        envSims.dispose();
        textures.dispose();
        envRT.dispose();
        renderer.dispose();
      };
    }

    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      initScene(container, rect.width, rect.height);
    } else {
      const bootRo = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            bootRo.disconnect();
            initScene(container, width, height);
            break;
          }
        }
      });
      bootRo.observe(container);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      if (cleanupFn) cleanupFn();
    };
  }, []);

  const gw = simState.gateway;
  const isGatewaySelected = selectedInspectable?.type === 'gateway';
  const dotColor = STATUS_DOT_COLOR[gw.status];

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#0a0f18]">
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Single Central Gateway Hub (GW-01) Floating Telemetry Pin */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        <button
          ref={gatewayBadgeRef}
          onClick={() => onSelectInspectable({ type: 'gateway' })}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            opacity: 0,
            willChange: 'transform',
          }}
          className={`group flex flex-col items-start px-3 py-1.5 rounded border transition-colors text-left shadow-xl ${
            isGatewaySelected
              ? 'bg-[#080d16] border-sky-400 text-white ring-1 ring-sky-400/50'
              : 'bg-[#080d16]/94 border-slate-700/85 text-slate-100 hover:border-sky-400/75'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: dotColor }}
            />
            <span className="font-mono font-bold tracking-wider uppercase text-[11px] text-sky-300">
              {gw.id} · CENTRAL SAFETY GATEWAY
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2.5 font-mono text-[10px] text-slate-300 tabular-nums">
            <span>
              SMOKE <strong className="text-white">{gw.smokeAndFire.smokeDensityPct}%</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              AQI <strong className="text-white">{gw.airQuality.aqiScore}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              FLOOD <strong className="text-white">{gw.floodAndHydrology.floodProbabilityPct}%</strong>
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
