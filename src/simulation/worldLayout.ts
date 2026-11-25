import type {
  CameraPresetId,
  CentralGatewayHub,
  InspectableBuilding,
} from './types';

// Photorealistic South Indian terrain elevation model (1 unit = 1 meter)
export function groundHeightAt(x: number, z: number): number {
  let h = 0.65 - x * 0.004 - z * 0.0055;
  h += Math.sin(x * 0.042) * Math.cos(z * 0.038) * 0.18;

  // Western Ghats foothill backdrop on North & West perimeter
  const distNorth = Math.max(0, -z - 108);
  const distWest = Math.max(0, -x - 115);
  if (distNorth > 0 || distWest > 0) {
    const ridge = Math.pow(distNorth * 0.09, 1.35) + Math.pow(distWest * 0.08, 1.3);
    const hillNoise =
      (Math.sin(x * 0.035 + 1.2) * 0.5 + 0.5) * 6.5 +
      (Math.cos(z * 0.04 - 0.6) * 0.5 + 0.5) * 4.5;
    h += Math.min(34, ridge * (0.65 + 0.06 * hillNoise));
  }

  // Industrial plateau flattening
  if (x >= -104 && x <= -18 && z >= -94 && z <= -12) {
    const blendX = Math.min(1, Math.min(x - -104, -18 - x) / 6);
    const blendZ = Math.min(1, Math.min(z - -94, -12 - z) / 6);
    const blend = Math.max(0, Math.min(blendX, blendZ));
    h = h * (1 - blend) + 1.35 * blend;
  }

  // Civic & School flat pad
  if (x >= 2 && x <= 98 && z >= -44 && z <= -8) {
    const bx = Math.min(1, Math.min(x - 2, 98 - x) / 5);
    const bz = Math.min(1, Math.min(z - -44, -8 - z) / 5);
    const b = Math.max(0, Math.min(bx, bz));
    h = h * (1 - b) + 0.72 * b;
  }

  // Low-lying South Canal flood-prone pocket
  const dxLow = (x - 36) / 34;
  const dzLow = (z - 52) / 22;
  const lowDist = dxLow * dxLow + dzLow * dzLow;
  if (lowDist < 1) {
    h -= (1 - lowDist) * 0.42;
  }

  // Retention Basin depression
  const rx = (x - 75) / 22;
  const rz = (z - 68) / 20;
  const rDist = rx * rx + rz * rz;
  if (rDist < 1.2) {
    const factor = Math.max(0, 1 - rDist / 1.2);
    h -= factor * 2.25;
  }

  // Concrete Stormwater Canal trench
  const canalZ = getCanalCenterZ(x);
  if (x >= -94 && x <= 145) {
    const distCanal = Math.abs(z - canalZ);
    if (distCanal < 5.2) {
      const trench = Math.max(0, 1 - distCanal / 5.2);
      h -= trench * 1.9;
    }
  }

  return h;
}

export function getCanalCenterZ(x: number): number {
  if (x < 10) return 31;
  if (x < 60) {
    const t = (x - 10) / 50;
    return 31 + t * t * (3 - 2 * t) * 14;
  }
  if (x < 92) {
    const t = (x - 60) / 32;
    return 45 + t * 23;
  }
  return 68;
}

export const INDUSTRIAL_STACK_COORDS: [number, number, number] = [-48, 25.5, -42];
export const CULVERT_C2_COORDS: [number, number] = [48, 41];
export const GATEWAY_COORDS: [number, number] = [4, -6];

export const INITIAL_CENTRAL_GATEWAY: CentralGatewayHub = {
  id: 'GW-01',
  name: 'PRITHVI-NET Central Environmental Gateway Hub',
  tamilName: 'பிருத்வி-நெட் மைய சுற்றுச்சூழல் கட்டுப்பாட்டு நுழைவாயில்',
  zone: 'Central Civic & Industrial Telemetry Plaza',
  position: [GATEWAY_COORDS[0], 0, GATEWAY_COORDS[1]],
  status: 'Nominal',
  healthScorePct: 99,
  batteryPct: 99,
  solarInputW: 142.0,
  uplinkLatencyMs: 14,
  telemetryIntegrityPct: 99.9,
  activeScanRadiusM: 145,
  maintenanceNote:
    'Optical Smoke Lidar, IR Combustion Array, NDIR/Laser Air Analyzer & Hydrology Radar calibrated.',
  smokeAndFire: {
    smokeDensityPct: 0.3,
    combustionTempC: 31.2,
    flameSignatureKw: 0,
    coPpm: 0.4,
    particulateLoadMgM3: 0.02,
    fireRiskLevel: 'Nominal',
  },
  airQuality: {
    aqiScore: 32,
    aqiCategory: 'Good',
    pm25: 19.4,
    pm10: 36.8,
    co2: 416,
    tvoc: 84,
    no2Ppb: 14,
    smokeContributionPct: 0,
  },
  floodAndHydrology: {
    canalWaterLevelM: 0.26,
    upstreamHeadDeltaM: 0.0,
    basinWaterLevelM: 0.44,
    surfaceRunoffCm: 0,
    canalCapacityPct: 14,
    riseVelocityCmMin: 0.0,
    flowRateM3s: 0.38,
    culvertStatus: 'Clear',
    floodProbabilityPct: 4,
  },
  environmentalHazards: {
    ambientTempC: 30.8,
    humidityPct: 56,
    windSpeedMs: 4.4,
    windDirectionDeg: 288,
    barometricHpa: 1009.6,
    uvIndex: 7.4,
    acousticDbA: 51.0,
    solarIrradianceWm2: 810,
    heatStressIndexC: 32.1,
  },
};

export const INSPECTABLE_BUILDINGS: InspectableBuilding[] = [
  {
    id: 'BLD-IND-01',
    name: 'Ettimadai Gas-Processing & Energy Complex',
    tamilName: 'எட்டிமடை எரிவாயு மற்றும் ஆற்றல் வளாகம்',
    category: 'Industrial',
    zone: 'Northwest Industrial Sector',
    description:
      'Modern hydrocarbon processing hall, turbine control bay, and high-altitude thermal cracker stack monitored continuously by GW-01 optical lidar.',
    position: [-48, 1.35, -42],
    estimatedPm25: 22,
    estimatedSmokePct: 0.4,
    estimatedFloodDepthCm: 0,
    thermalStatus: 'Normal',
    exposureLevel: 'Low',
  },
  {
    id: 'BLD-IND-02',
    name: 'Cryogenic & Pressurized Spherical Tank Farm',
    tamilName: 'உயர் அழுத்த எரிவாயு சேமிப்பு வளாகம்',
    category: 'Industrial',
    zone: 'Northwest Industrial Sector',
    description:
      'Four pressurized spherical hydrocarbon storage vessels inside concrete containment bund walls with elevated process pipe racks.',
    position: [-76, 1.35, -48],
    estimatedPm25: 21,
    estimatedSmokePct: 0.3,
    estimatedFloodDepthCm: 0,
    thermalStatus: 'Normal',
    exposureLevel: 'Low',
  },
  {
    id: 'BLD-RES-01',
    name: 'Mullai Heights Architectural Towers',
    tamilName: 'முல்லை நவீன குடியிருப்பு கோபுரங்கள்',
    category: 'Residential',
    zone: 'Northeast Residential Sector',
    description:
      'Multi-family high-rise residential complex with double-glazed curtain walls, cantilevered glass balconies, and rooftop solar PV array.',
    position: [42, 0.72, -32],
    estimatedPm25: 20,
    estimatedSmokePct: 0.2,
    estimatedFloodDepthCm: 0,
    thermalStatus: 'Normal',
    exposureLevel: 'Low',
  },
  {
    id: 'BLD-RES-02',
    name: 'Kurinji Green Terraces',
    tamilName: 'குறிஞ்சி பசுமை குடியிருப்பு வளாகம்',
    category: 'Residential',
    zone: 'East Residential Sector',
    description:
      'Contemporary residential apartment block featuring rooftop rainwater harvesting and solar microgrid tie-in.',
    position: [68, 0.72, -28],
    estimatedPm25: 19,
    estimatedSmokePct: 0.2,
    estimatedFloodDepthCm: 0,
    thermalStatus: 'Normal',
    exposureLevel: 'Low',
  },
  {
    id: 'BLD-PUB-01',
    name: 'Ettimadai Academy & Civic Campus',
    tamilName: 'எட்டிமடை கல்வி மற்றும் சமூக வளாகம்',
    category: 'Civic',
    zone: 'South Civic Sector',
    description:
      'Contemporary architectural courtyard school campus with glazed atrium and solar roof canopies; priority sensitive receptor for smoke and flood protection.',
    position: [24, 0.4, 36],
    estimatedPm25: 19,
    estimatedSmokePct: 0.2,
    estimatedFloodDepthCm: 0,
    thermalStatus: 'Normal',
    exposureLevel: 'Low',
  },
  {
    id: 'BLD-PUB-02',
    name: 'Regional Medical & Emergency Center',
    tamilName: 'மண்டல மருத்துவ மற்றும் அவசர சிகிச்சை மையம்',
    category: 'Civic',
    zone: 'Southeast Civic Sector',
    description:
      'Curtain-wall glass medical complex with positive-pressure HEPA filtration and emergency dispatch bay.',
    position: [64, 0.4, 34],
    estimatedPm25: 18,
    estimatedSmokePct: 0.1,
    estimatedFloodDepthCm: 0,
    thermalStatus: 'Normal',
    exposureLevel: 'Low',
  },
];

export interface CameraPresetConfig {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_PRESETS: CameraPresetConfig[] = [
  {
    id: 'aerial',
    label: 'Full Twin Aerial',
    position: [114, 72, 116],
    target: [2, 2, 2],
  },
  {
    id: 'gateway',
    label: 'Central Gateway Hub',
    position: [26, 18, 22],
    target: [GATEWAY_COORDS[0], 6, GATEWAY_COORDS[1]],
  },
  {
    id: 'industrial',
    label: 'Industrial Complex',
    position: [-12, 30, -4],
    target: [-54, 8, -48],
  },
  {
    id: 'residential',
    label: 'Residential Quarter',
    position: [10, 15, 68],
    target: [28, 4, 44],
  },
  {
    id: 'drainage',
    label: 'Canal & Culvert C2',
    position: [18, 17, 62],
    target: [44, 0, 39],
  },
  {
    id: 'flood',
    label: 'Retention Basin',
    position: [98, 28, 96],
    target: [52, 0, 54],
  },
];
