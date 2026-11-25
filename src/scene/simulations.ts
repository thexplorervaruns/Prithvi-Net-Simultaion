import * as THREE from 'three';
import { ProceduralTextureSet } from './textures';
import { getTerrainHeight } from './terrain';
import { SimulationControls, SimulationState } from '../simulation/types';

export interface EnvironmentalSimulationsScene {
  root: THREE.Group;
  update: (
    controls: SimulationControls,
    simState: SimulationState,
    dt: number,
    elapsedSec: number
  ) => void;
  dispose: () => void;
}

interface PlumeParticle {
  x: number;
  y: number;
  z: number;
  age: number;
  maxAge: number;
  seed: number;
  stackIndex: number; // 0 = primary cracker stack, 1 = secondary flue
}

interface FlameParticle {
  x: number;
  y: number;
  z: number;
  age: number;
  maxAge: number;
  seed: number;
  stackIndex: number;
}

export function buildEnvironmentalSimulations(
  textures: ProceduralTextureSet
): EnvironmentalSimulationsScene {
  const root = new THREE.Group();
  root.name = 'EnvironmentalSimulations';

  const baseSourceY = getTerrainHeight(-56, -42);
  const STACK_SOURCES: [number, number, number][] = [
    [-48, baseSourceY + 26.8, -42], // Primary thermal cracker stack
    [-40, baseSourceY + 32.5, -47], // Secondary turbine hall stack
  ];

  // ============================================================================
  // 1. REALISTIC 3D FIRE & COMBUSTION FLAME SYSTEM + DYNAMIC THERMAL LIGHT
  // ============================================================================
  const FLAME_COUNT = 120;
  const flamePositions = new Float32Array(FLAME_COUNT * 3);
  const flameColors = new Float32Array(FLAME_COUNT * 3);

  const flameParticles: FlameParticle[] = [];
  for (let i = 0; i < FLAME_COUNT; i++) {
    const stackIndex = i % 5 === 0 ? 1 : 0;
    const src = STACK_SOURCES[stackIndex];
    const maxAge = 0.65 + Math.random() * 0.75;
    flameParticles.push({
      x: src[0],
      y: src[1],
      z: src[2],
      age: Math.random() * maxAge,
      maxAge,
      seed: Math.random() * 100,
      stackIndex,
    });
  }

  const flameGeo = new THREE.BufferGeometry();
  flameGeo.setAttribute('position', new THREE.BufferAttribute(flamePositions, 3));
  flameGeo.setAttribute('color', new THREE.BufferAttribute(flameColors, 3));

  const flameMat = new THREE.PointsMaterial({
    size: 6.5,
    map: textures.plumeSprite,
    vertexColors: true,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const flamePoints = new THREE.Points(flameGeo, flameMat);
  root.add(flamePoints);

  // Dynamic Flickering Thermal Fire PointLight at Combustion Stack
  const firePointLight = new THREE.PointLight(0xff6b1a, 0, 85, 1.4);
  firePointLight.position.set(
    STACK_SOURCES[0][0],
    STACK_SOURCES[0][1] + 2.5,
    STACK_SOURCES[0][2]
  );
  root.add(firePointLight);

  // ============================================================================
  // 2. VOLUMETRIC MULTI-STACK SMOKE & AIR POLLUTION PLUME
  // ============================================================================
  const PLUME_COUNT = 420;
  const plumePositions = new Float32Array(PLUME_COUNT * 3);
  const plumeColors = new Float32Array(PLUME_COUNT * 3);

  const particles: PlumeParticle[] = [];

  for (let i = 0; i < PLUME_COUNT; i++) {
    const maxAge = 8 + Math.random() * 11;
    const stackIndex = i % 4 === 0 ? 1 : 0;
    const src = STACK_SOURCES[stackIndex];
    particles.push({
      x: src[0],
      y: src[1],
      z: src[2],
      age: Math.random() * maxAge,
      maxAge,
      seed: Math.random() * 100,
      stackIndex,
    });
  }

  const plumeGeo = new THREE.BufferGeometry();
  plumeGeo.setAttribute('position', new THREE.BufferAttribute(plumePositions, 3));
  plumeGeo.setAttribute('color', new THREE.BufferAttribute(plumeColors, 3));

  const plumeMat = new THREE.PointsMaterial({
    size: 15,
    map: textures.plumeSprite,
    vertexColors: true,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    blending: THREE.NormalBlending,
    sizeAttenuation: true,
  });

  const plumePoints = new THREE.Points(plumeGeo, plumeMat);
  root.add(plumePoints);

  // Ground-Level Gaussian Dispersion Footprint Shader (Downwind Smoke/AQI Exposure)
  const footprintUniforms = {
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uWindRad: { value: 0 },
  };

  const footprintMat = new THREE.ShaderMaterial({
    uniforms: footprintUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv - vec2(0.12, 0.5);
        if (p.x < 0.0) discard;
        float sigmaY = 0.06 + p.x * 0.34;
        float crossSection = exp(-(p.y * p.y) / (2.0 * sigmaY * sigmaY));
        float along = smoothstep(0.0, 0.14, p.x) * (1.0 - smoothstep(0.45, 0.88, p.x));
        float wave = 0.88 + 0.12 * sin(p.x * 22.0 - uTime * 2.4);
        float density = crossSection * along * wave * uIntensity;

        vec3 lowColor = vec3(0.96, 0.62, 0.04);
        vec3 highColor = vec3(0.94, 0.24, 0.18);
        vec3 col = mix(lowColor, highColor, clamp(density * 1.35, 0.0, 1.0));
        float alpha = clamp(density * 0.38, 0.0, 0.42);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const footprintGeometry = new THREE.PlaneGeometry(175, 110, 1, 1);
  footprintGeometry.translate(175 * 0.38, 0, 0);
  const footprintPlane = new THREE.Mesh(footprintGeometry, footprintMat);
  footprintPlane.rotation.x = -Math.PI / 2;
  footprintPlane.position.set(STACK_SOURCES[0][0], 2.2, STACK_SOURCES[0][2]);
  root.add(footprintPlane);

  // ============================================================================
  // 3. REALISTIC GLSL URBAN FLOOD & HYDROLOGY SIMULATION
  // ============================================================================
  const waterUniforms = {
    uTime: { value: 0 },
    uFloodLevel: { value: 0 },
    uRainIntensity: { value: 0 },
  };

  const waterShaderMat = new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      uniform float uTime;
      uniform float uRainIntensity;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying float vWave;

      void main() {
        vUv = uv;
        vec3 pos = position;
        float w1 = sin(pos.x * 0.25 + uTime * 2.4) * 0.09;
        float w2 = cos(pos.y * 0.32 - uTime * 1.9) * 0.09;
        float ripple = sin((pos.x * pos.x + pos.y * pos.y) * 0.05 - uTime * 5.0) * 0.03 * uRainIntensity;
        pos.z += (w1 + w2 + ripple);
        vWave = w1 + w2 + ripple;
        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uFloodLevel;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying float vWave;

      void main() {
        vec3 deepWater = vec3(0.06, 0.24, 0.36);
        vec3 siltWater = vec3(0.16, 0.38, 0.46);
        vec3 crestFoam = vec3(0.68, 0.86, 0.96);

        float flowBand = sin(vWorldPos.z * 0.16 - uTime * 3.0) * 0.5 + 0.5;
        vec3 baseCol = mix(deepWater, siltWater, clamp(uFloodLevel * 0.82 + flowBand * 0.18, 0.0, 1.0));
        float crest = smoothstep(0.07, 0.16, vWave);
        vec3 finalCol = mix(baseCol, crestFoam, crest * 0.42);

        float alpha = clamp(0.66 + uFloodLevel * 0.22, 0.62, 0.90);
        gl_FragColor = vec4(finalCol, alpha);
      }
    `,
  });

  // Primary canal water surface mesh
  const canalWaterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(8.6, 230, 32, 120),
    waterShaderMat
  );
  canalWaterMesh.rotation.x = -Math.PI / 2;
  canalWaterMesh.position.set(-2, -1.7, 0);
  root.add(canalWaterMesh);

  // Retention basin & flood plain overflow water surface mesh
  const floodPlainMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(185, 130, 72, 72),
    waterShaderMat
  );
  floodPlainMesh.rotation.x = -Math.PI / 2;
  floodPlainMesh.position.set(16, -2.1, 32);
  root.add(floodPlainMesh);

  // ============================================================================
  // 4. ATMOSPHERIC RAINFALL STREAK SYSTEM
  // ============================================================================
  const RAIN_COUNT = 1600;
  const rainPositions = new Float32Array(RAIN_COUNT * 6);
  const rainSeeds: { x: number; y: number; z: number; speed: number }[] = [];

  for (let i = 0; i < RAIN_COUNT; i++) {
    const rx = (Math.random() - 0.5) * 240;
    const ry = Math.random() * 95;
    const rz = (Math.random() - 0.5) * 240;
    rainSeeds.push({
      x: rx,
      y: ry,
      z: rz,
      speed: 48 + Math.random() * 24,
    });
  }

  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.LineBasicMaterial({
    color: 0xbbe1fa,
    transparent: true,
    opacity: 0.36,
  });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  rainLines.visible = false;
  root.add(rainLines);

  // ============================================================================
  // 5. FRAME UPDATE LOOP
  // ============================================================================
  const update = (
    controls: SimulationControls,
    simState: SimulationState,
    dt: number,
    elapsedSec: number
  ) => {
    const windRad = ((controls.windDirection + 180) * Math.PI) / 180;
    const windVx = Math.sin(windRad) * (1.2 + controls.windSpeed * 0.85);
    const windVz = -Math.cos(windRad) * (1.2 + controls.windSpeed * 0.85);

    const isFireActive =
      controls.fireAndSmokeActive && controls.smokeIntensity > 2;
    const fireNorm = isFireActive ? controls.smokeIntensity / 100 : 0;

    // A) Update 3D Fire & Combustion Flame Particles + Thermal PointLight
    if (isFireActive) {
      flamePoints.visible = true;
      flameMat.opacity = Math.min(0.95, 0.45 + fireNorm * 0.5);
      flameMat.size = 5.5 + fireNorm * 4.5;

      // Realistic thermal flicker
      const flicker =
        0.85 +
        0.15 * Math.sin(elapsedSec * 19.0) +
        0.1 * Math.cos(elapsedSec * 31.0);
      firePointLight.intensity = fireNorm * 14.0 * flicker;

      const fPosAttr = flameGeo.getAttribute('position') as THREE.BufferAttribute;
      const fColAttr = flameGeo.getAttribute('color') as THREE.BufferAttribute;

      for (let i = 0; i < FLAME_COUNT; i++) {
        const fp = flameParticles[i];
        fp.age += dt;
        if (fp.age >= fp.maxAge) {
          fp.age = 0;
        }
        const t = fp.age / fp.maxAge;
        const src = STACK_SOURCES[fp.stackIndex];
        const flameHeight = (3.5 + fireNorm * 7.5) * t;
        const jitter = (0.35 + t * 1.1) * fireNorm;

        fp.x =
          src[0] +
          windVx * fp.age * 0.28 +
          Math.sin(elapsedSec * 12 + fp.seed) * jitter;
        fp.y = src[1] + flameHeight;
        fp.z =
          src[2] +
          windVz * fp.age * 0.28 +
          Math.cos(elapsedSec * 11 + fp.seed) * jitter;

        fPosAttr.setXYZ(i, fp.x, fp.y, fp.z);

        // White-yellow hot core -> bright orange -> deep ember red at top
        if (t < 0.3) {
          fColAttr.setXYZ(i, 1.0, 0.92, 0.55);
        } else if (t < 0.68) {
          fColAttr.setXYZ(i, 1.0, 0.48, 0.12);
        } else {
          fColAttr.setXYZ(i, 0.85, 0.18, 0.05);
        }
      }
      fPosAttr.needsUpdate = true;
      fColAttr.needsUpdate = true;
    } else {
      flamePoints.visible = false;
      firePointLight.intensity = 0;
    }

    // B) Update Volumetric Smoke & Air Pollution Plume
    const emissionFactor = isFireActive
      ? 0.4 + fireNorm * 0.95
      : 0.14; // Subtle clean steam vapor when normal

    plumeMat.opacity = isFireActive
      ? 0.36 + fireNorm * 0.44
      : 0.14;
    plumeMat.size = isFireActive
      ? 14 + fireNorm * 11
      : 9;

    const posAttr = plumeGeo.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = plumeGeo.getAttribute('color') as THREE.BufferAttribute;

    for (let i = 0; i < PLUME_COUNT; i++) {
      const p = particles[i];
      p.age += dt * (0.85 + controls.windSpeed * 0.08);
      if (p.age >= p.maxAge) {
        p.age = 0;
      }

      const t = p.age / p.maxAge;
      const src = STACK_SOURCES[p.stackIndex];
      const spread = (1.1 + t * 14.5) * (0.65 + emissionFactor * 0.55);
      const lift =
        Math.pow(t, 0.68) *
        (24 + Math.max(0, 26 - controls.windSpeed * 1.35));

      const turbX = Math.sin(elapsedSec * 1.4 + p.seed + t * 6.0) * spread;
      const turbZ = Math.cos(elapsedSec * 1.3 + p.seed * 1.3 + t * 6.0) * spread;
      const turbY = Math.sin(elapsedSec * 1.8 + p.seed) * (1.2 + t * 3.0);

      p.x = src[0] + windVx * p.age * 1.7 + turbX;
      p.y = src[1] + (isFireActive ? 2.5 : 0) + lift + turbY;
      p.z = src[2] + windVz * p.age * 1.7 + turbZ;

      posAttr.setXYZ(i, p.x, p.y, p.z);

      if (isFireActive) {
        // Warm ember-tinted dark combustion smoke transitioning to grey-amber haze
        const cR = THREE.MathUtils.lerp(0.42, 0.56, t);
        const cG = THREE.MathUtils.lerp(0.28, 0.52, t);
        const cB = THREE.MathUtils.lerp(0.22, 0.48, t);
        colAttr.setXYZ(i, cR, cG, cB);
      } else {
        colAttr.setXYZ(i, 0.88, 0.91, 0.95);
      }
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // Ground-level Gaussian exposure footprint orientation
    footprintUniforms.uTime.value = elapsedSec;
    footprintUniforms.uIntensity.value = isFireActive ? fireNorm : 0.04;
    footprintPlane.rotation.z = -Math.atan2(windVz, windVx);

    // C) Update Flood & Canal Hydrology Surface
    const fh = simState.gateway.floodAndHydrology;
    const canalStage = fh.canalWaterLevelM + fh.upstreamHeadDeltaM;
    const canalNormalized = Math.min(1, canalStage / 2.2);

    waterUniforms.uTime.value = elapsedSec;
    waterUniforms.uFloodLevel.value = canalNormalized;
    waterUniforms.uRainIntensity.value = Math.min(1, controls.rainfallIntensity / 100);

    // Canal bed is at y = -2.2; bank top is at y = 0.0
    const targetCanalY = -1.85 + Math.min(2.45, canalStage * 1.05);
    canalWaterMesh.position.y = THREE.MathUtils.lerp(
      canalWaterMesh.position.y,
      targetCanalY,
      0.1
    );

    const targetFloodY =
      canalStage > 1.15
        ? -2.0 + (canalStage - 1.15) * 1.45
        : -2.05 + canalStage * 0.42;
    floodPlainMesh.position.y = THREE.MathUtils.lerp(
      floodPlainMesh.position.y,
      targetFloodY,
      0.08
    );

    // D) Update Rainfall Particles
    if (controls.rainfallIntensity > 2) {
      rainLines.visible = true;
      const rainDensityFactor = Math.min(1, controls.rainfallIntensity / 120);
      rainMat.opacity = 0.16 + rainDensityFactor * 0.42;

      const rainAttr = rainGeo.getAttribute('position') as THREE.BufferAttribute;
      const streakWindX = windVx * 0.25;
      const streakWindZ = windVz * 0.25;

      for (let i = 0; i < RAIN_COUNT; i++) {
        const drop = rainSeeds[i];
        drop.y -= drop.speed * (0.7 + rainDensityFactor * 0.6) * dt;
        drop.x += streakWindX * dt * 6;
        drop.z += streakWindZ * dt * 6;

        if (drop.y < -2) {
          drop.y = 85 + Math.random() * 15;
          drop.x = (Math.random() - 0.5) * 240;
          drop.z = (Math.random() - 0.5) * 240;
        }

        const idx = i * 2;
        rainAttr.setXYZ(idx, drop.x, drop.y, drop.z);
        rainAttr.setXYZ(
          idx + 1,
          drop.x - streakWindX * 0.35,
          drop.y + 3.2,
          drop.z - streakWindZ * 0.35
        );
      }
      rainAttr.needsUpdate = true;
    } else {
      rainLines.visible = false;
    }
  };

  const dispose = () => {
    flameGeo.dispose();
    flameMat.dispose();
    plumeGeo.dispose();
    plumeMat.dispose();
    footprintGeometry.dispose();
    footprintMat.dispose();
    canalWaterMesh.geometry.dispose();
    floodPlainMesh.geometry.dispose();
    waterShaderMat.dispose();
    rainGeo.dispose();
    rainMat.dispose();
  };

  return { root, update, dispose };
}
