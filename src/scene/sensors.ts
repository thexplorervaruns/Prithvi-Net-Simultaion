import * as THREE from 'three';
import { ProceduralTextureSet } from './textures';
import { getTerrainHeight } from './terrain';
import { GATEWAY_COORDS } from '../simulation/worldLayout';
import { CentralGatewayHub } from '../simulation/types';

export interface CentralGatewaySceneResult {
  root: THREE.Group;
  gatewayGroup: THREE.Group;
  updateGatewayVisuals: (
    gateway: CentralGatewayHub,
    isSelected: boolean,
    showGatewayScan: boolean,
    elapsedSec: number
  ) => void;
}

const STATUS_HEX: Record<CentralGatewayHub['status'], number> = {
  Nominal: 0x10b981,
  Watch: 0xf59e0b,
  Warning: 0xf97316,
  Emergency: 0xef4444,
};

export function buildCentralGatewayHub(
  textures: ProceduralTextureSet
): CentralGatewaySceneResult {
  const root = new THREE.Group();
  root.name = 'CentralGatewayArchitecture';

  const [gx, gz] = GATEWAY_COORDS;
  const gy = getTerrainHeight(gx, gz);

  const gatewayGroup = new THREE.Group();
  gatewayGroup.name = 'GW-01-CentralGateway';
  gatewayGroup.position.set(gx, gy, gz);
  gatewayGroup.userData.isCentralGateway = true;

  // Photorealistic Architectural Materials
  const concretePlinthMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    map: textures.concreteMap,
    roughnessMap: textures.concreteRoughness,
    roughness: 0.76,
    metalness: 0.08,
  });

  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.88,
  });

  const darkGraphiteMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.32,
    metalness: 0.82,
  });

  const copperAccentMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.25,
    metalness: 0.85,
  });

  const opticalGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.08,
    metalness: 0.1,
    transmission: 0.45,
    reflectivity: 0.95,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity: 0.88,
  });

  const solarWingMat = new THREE.MeshPhysicalMaterial({
    map: textures.solarMap,
    roughness: 0.16,
    metalness: 0.28,
    clearcoat: 0.9,
  });

  // Soft Ground Ambient-Occlusion Contact Shadow
  const aoShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshBasicMaterial({
      map: textures.aoShadowMap,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    })
  );
  aoShadow.rotation.x = -Math.PI / 2;
  aoShadow.position.y = 0.04;
  gatewayGroup.add(aoShadow);

  // 1. Stepped Circular Architectural Plaza Plinth
  const lowerPlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(5.6, 6.2, 0.55, 48),
    concretePlinthMat
  );
  lowerPlinth.position.y = 0.275;
  lowerPlinth.receiveShadow = true;
  lowerPlinth.castShadow = true;
  gatewayGroup.add(lowerPlinth);

  const upperPlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.6, 0.55, 48),
    darkGraphiteMat
  );
  upperPlinth.position.y = 0.825;
  upperPlinth.receiveShadow = true;
  upperPlinth.castShadow = true;
  gatewayGroup.add(upperPlinth);

  // Recessed LED Status Ring in Plaza Base
  const plinthBeaconMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.92,
  });
  const plinthStatusRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.42, 0.11, 16, 64),
    plinthBeaconMat
  );
  plinthStatusRing.rotation.x = Math.PI / 2;
  plinthStatusRing.position.y = 0.62;
  gatewayGroup.add(plinthStatusRing);

  // 2. Ground-Level Smart Telemetry Pavilion Cabinet (Air Quality & Hydrology Core)
  const corePavilion = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.4, 3.6, 32),
    darkGraphiteMat
  );
  corePavilion.position.y = 2.9;
  corePavilion.castShadow = true;
  corePavilion.receiveShadow = true;
  gatewayGroup.add(corePavilion);

  // 4 Architectural Structural Titanium Buttress Fins around the Tower
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const finGroup = new THREE.Group();
    finGroup.rotation.y = angle;

    const lowerButtress = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 14.5, 1.35),
      titaniumMat
    );
    lowerButtress.position.set(0, 8.2, 1.55);
    lowerButtress.castShadow = true;
    finGroup.add(lowerButtress);

    gatewayGroup.add(finGroup);
  }

  // 3. Central Monolithic Smart-Telemetry Mast
  const mainTowerShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 1.25, 18.0, 32),
    titaniumMat
  );
  mainTowerShaft.position.y = 10.1;
  mainTowerShaft.castShadow = true;
  mainTowerShaft.receiveShadow = true;
  gatewayGroup.add(mainTowerShaft);

  // 4. Mid-Tower Dual Monocrystalline Solar Tracking Wings (y = 9.5m)
  const solarAssembly = new THREE.Group();
  solarAssembly.position.y = 9.5;

  const solarCrossarm = new THREE.Mesh(
    new THREE.BoxGeometry(9.2, 0.32, 0.38),
    darkGraphiteMat
  );
  solarCrossarm.castShadow = true;
  solarAssembly.add(solarCrossarm);

  for (const side of [-1, 1]) {
    const wingFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.14, 2.2),
      darkGraphiteMat
    );
    wingFrame.position.set(side * 3.1, 0.12, 0);
    wingFrame.rotation.x = 0.28;
    wingFrame.castShadow = true;

    const wingCells = new THREE.Mesh(
      new THREE.BoxGeometry(3.25, 0.16, 2.05),
      solarWingMat
    );
    wingCells.position.set(side * 3.1, 0.14, 0);
    wingCells.rotation.x = 0.28;

    solarAssembly.add(wingFrame, wingCells);
  }
  gatewayGroup.add(solarAssembly);

  // 5. Continuous-Flow Multi-Gas & Particulate (PM2.5/PM10/CO2/TVOC) Louvered Intake Deck (y = 13.8m)
  const intakeDeck = new THREE.Group();
  intakeDeck.position.y = 13.8;

  for (let l = 0; l < 5; l++) {
    const louverDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75 - l * 0.08, 1.85 - l * 0.08, 0.18, 32),
      titaniumMat
    );
    louverDisc.position.y = l * 0.34;
    louverDisc.castShadow = true;
    intakeDeck.add(louverDisc);
  }

  // Hydrology Ultrasonic & Phased-Array Flood Radar Transceiver Pod (facing drainage canal)
  const floodRadarPod = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.85, 1.4),
    darkGraphiteMat
  );
  floodRadarPod.position.set(-1.55, 0.4, 0);
  floodRadarPod.rotation.z = 0.35;
  intakeDeck.add(floodRadarPod);

  const radarLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.15, 24),
    copperAccentMat
  );
  radarLens.rotation.z = Math.PI / 2;
  radarLens.position.set(-2.1, 0.3, 0);
  intakeDeck.add(radarLens);

  gatewayGroup.add(intakeDeck);

  // 6. Upper 360° Optical Lidar & Thermal Fire/Smoke Observatory Pod (y = 17.6m)
  const observatoryPod = new THREE.Group();
  observatoryPod.position.y = 17.6;

  const lowerCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(2.15, 1.4, 0.8, 32),
    darkGraphiteMat
  );
  observatoryPod.add(lowerCollar);

  // Glazed 360° Optical Dome Enclosure
  const opticalCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(2.05, 2.05, 1.85, 32),
    opticalGlassMat
  );
  opticalCylinder.position.y = 1.3;
  observatoryPod.add(opticalCylinder);

  // Rotating Internal Lidar & Thermal Turret Assembly
  const rotatingTurret = new THREE.Group();
  rotatingTurret.position.y = 1.3;

  const turretCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.95, 1.3, 24),
    darkGraphiteMat
  );
  rotatingTurret.add(turretCore);

  // Dual Optical Lidar & IR Thermal Lenses
  const lens1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 1.85, 20),
    copperAccentMat
  );
  lens1.rotation.x = Math.PI / 2;
  lens1.position.y = 0.15;
  rotatingTurret.add(lens1);

  const turretBeaconRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.32, 0.08, 12, 36),
    plinthBeaconMat
  );
  turretBeaconRing.rotation.x = Math.PI / 2;
  rotatingTurret.add(turretBeaconRing);

  observatoryPod.add(rotatingTurret);

  // Upper Observatory Cap & Omnidirectional Telemetry Spire
  const upperCap = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 2.15, 0.7, 32),
    titaniumMat
  );
  upperCap.position.y = 2.55;
  observatoryPod.add(upperCap);

  // High-Gain Central Telemetry Spire & Crown Beacon
  const centralSpire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.24, 4.8, 16),
    titaniumMat
  );
  centralSpire.position.y = 5.2;
  observatoryPod.add(centralSpire);

  const crownBeaconSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 24, 24),
    plinthBeaconMat
  );
  crownBeaconSphere.position.y = 7.7;
  observatoryPod.add(crownBeaconSphere);

  // Subtle PointLight at the top of the Gateway Hub reflecting current alert state
  const gatewayPointLight = new THREE.PointLight(0x10b981, 2.4, 38, 1.5);
  gatewayPointLight.position.y = 7.7;
  observatoryPod.add(gatewayPointLight);

  gatewayGroup.add(observatoryPod);

  // 7. Selection Halo Ring around the Gateway Plaza
  const selectionRingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
  });
  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(6.5, 7.1, 64),
    selectionRingMat
  );
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.12;
  selectionRing.visible = false;
  gatewayGroup.add(selectionRing);

  // 8. Subtle Ground-Level Radial Environmental Scan Wave (Clean, Minimal, No Sky Clutter)
  const scanWaveMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const scanWaveRing = new THREE.Mesh(
    new THREE.RingGeometry(0.94, 1.0, 64),
    scanWaveMat
  );
  scanWaveRing.rotation.x = -Math.PI / 2;
  scanWaveRing.position.y = 0.25;
  gatewayGroup.add(scanWaveRing);

  // Static subtle perimeter coverage boundary circle (r = 85m)
  const perimeterBoundaryMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const perimeterBoundary = new THREE.Mesh(
    new THREE.RingGeometry(89.4, 90.0, 96),
    perimeterBoundaryMat
  );
  perimeterBoundary.rotation.x = -Math.PI / 2;
  perimeterBoundary.position.y = 0.22;
  gatewayGroup.add(perimeterBoundary);

  root.add(gatewayGroup);

  const updateGatewayVisuals = (
    gateway: CentralGatewayHub,
    isSelected: boolean,
    showGatewayScan: boolean,
    elapsedSec: number
  ) => {
    const statusHex = STATUS_HEX[gateway.status];

    // Update status beacon color smoothly
    plinthBeaconMat.color.setHex(statusHex);
    gatewayPointLight.color.setHex(statusHex);

    // Rotate internal 360° Lidar & Thermal Turret continuously
    rotatingTurret.rotation.y = elapsedSec * 1.15;

    // Selection ring visibility
    selectionRing.visible = isSelected;
    if (isSelected) {
      const s = 1.0 + Math.sin(elapsedSec * 3.5) * 0.03;
      selectionRing.scale.set(s, s, 1);
    }

    // Subtle ground-level environmental scan pulse
    scanWaveRing.visible = showGatewayScan;
    perimeterBoundary.visible = showGatewayScan;
    if (showGatewayScan) {
      scanWaveMat.color.setHex(statusHex);
      perimeterBoundaryMat.color.setHex(statusHex);

      const cycle = (elapsedSec * 0.28) % 1;
      const radius = 6.2 + cycle * 83.8; // Expands from plaza (6.2m) to 90m coverage boundary
      scanWaveRing.scale.set(radius, radius, 1);
      scanWaveMat.opacity = (1.0 - cycle) * 0.42;
    }
  };

  return {
    root,
    gatewayGroup,
    updateGatewayVisuals,
  };
}
