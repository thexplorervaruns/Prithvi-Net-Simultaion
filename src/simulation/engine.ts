import {
  CULVERT_C2_COORDS,
  GATEWAY_COORDS,
  INDUSTRIAL_STACK_COORDS,
  INITIAL_CENTRAL_GATEWAY,
  INSPECTABLE_BUILDINGS,
} from './worldLayout';
import type {
  AIIntelligenceState,
  CentralGatewayHub,
  EnvironmentalAlert,
  EventHistoryEntry,
  InspectableBuilding,
  RiskTrendPoint,
  ScenarioId,
  SimulationControls,
  SimulationState,
} from './types';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function computeDynamicAqi(pm25: number, pm10: number, coPpm: number): {
  aqiScore: number;
  aqiCategory: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Severe';
} {
  const pm25Sub =
    pm25 <= 30
      ? (pm25 / 30) * 50
      : pm25 <= 60
        ? 50 + ((pm25 - 30) / 30) * 50
        : pm25 <= 90
          ? 100 + ((pm25 - 60) / 30) * 100
          : pm25 <= 120
            ? 200 + ((pm25 - 90) / 30) * 100
            : Math.min(500, 300 + ((pm25 - 120) / 130) * 200);

  const pm10Sub = (pm10 / 250) * 250;
  const coSub = (coPpm / 17) * 250;
  const aqiScore = Math.round(clamp(Math.max(pm25Sub, pm10Sub, coSub), 12, 500));

  let aqiCategory: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Severe' = 'Good';
  if (aqiScore > 300) aqiCategory = 'Severe';
  else if (aqiScore > 200) aqiCategory = 'Poor';
  else if (aqiScore > 100) aqiCategory = 'Moderate';
  else if (aqiScore > 50) aqiCategory = 'Satisfactory';

  return { aqiScore, aqiCategory };
}

export function windTravelVector(windDirFromDeg: number): [number, number] {
  const rad = ((windDirFromDeg + 180) * Math.PI) / 180;
  return [Math.sin(rad), -Math.cos(rad)];
}

// Gaussian smoke & combustion plume concentration at (x, z)
export function evaluateSmokePlumeAt(
  x: number,
  z: number,
  controls: SimulationControls,
  simTimeSec: number
): number {
  if (!controls.fireAndSmokeActive || controls.smokeIntensity <= 0) return 0;

  const [sx, stackH, sz] = INDUSTRIAL_STACK_COORDS;
  const [wx, wz] = windTravelVector(controls.windDirection);

  const dx = x - sx;
  const dz = z - sz;
  const downwind = dx * wx + dz * wz;

  const radialDist = Math.hypot(dx, dz);
  const nearSourceSmoke =
    radialDist < 34 ? (1 - radialDist / 34) * (controls.smokeIntensity * 0.42) : 0;

  if (downwind <= 1) return nearSourceSmoke;

  const crosswind = Math.abs(-dx * wz + dz * wx);
  const sigmaY = 0.16 * Math.pow(downwind, 0.88) + 5.5;
  const sigmaZ = 0.1 * Math.pow(downwind, 0.82) + 3.2;
  const u = Math.max(0.8, controls.windSpeed);
  const hEff = stackH * (1 - Math.min(0.28, u * 0.014));

  const Q = (controls.smokeIntensity / 100) * 65000;
  const lateral = Math.exp(-(crosswind * crosswind) / (2 * sigmaY * sigmaY));
  const vertical = Math.exp(-(hEff * hEff) / (2 * sigmaZ * sigmaZ));
  const plume = (Q / (Math.PI * u * sigmaY * sigmaZ)) * lateral * vertical;

  const meander = 1 + 0.08 * Math.sin(simTimeSec * 0.85 + downwind * 0.05);
  const washout = 1 - Math.min(0.25, (controls.rainfallIntensity / 120) * 0.25);

  return Math.max(0, (plume + nearSourceSmoke) * meander * washout);
}

export function createInitialSimulationState(): SimulationState {
  const gateway: CentralGatewayHub = {
    ...INITIAL_CENTRAL_GATEWAY,
    smokeAndFire: { ...INITIAL_CENTRAL_GATEWAY.smokeAndFire },
    airQuality: { ...INITIAL_CENTRAL_GATEWAY.airQuality },
    floodAndHydrology: { ...INITIAL_CENTRAL_GATEWAY.floodAndHydrology },
    environmentalHazards: { ...INITIAL_CENTRAL_GATEWAY.environmentalHazards },
  };

  const buildings = INSPECTABLE_BUILDINGS.map((b) => ({ ...b }));

  const defaultControls: SimulationControls = {
    isRunning: true,
    fireAndSmokeActive: false,
    smokeIntensity: 0,
    rainfallIntensity: 0,
    blockageSeverity: 0,
    windDirection: 288,
    windSpeed: 4.4,
    timeOfDay: 10.5,
    showGatewayScan: true,
    showVirtualHeatmap: false,
    flyoverActive: false,
  };

  return {
    simTimeSec: 0,
    activeScenario: 'none',
    overallStatus: 'Nominal',
    fireSmokeStatus: 'Clear',
    airQualityStatus: 'Good',
    floodRiskStatus: 'Low',
    roadWetness: 0,
    gateway,
    buildings,
    ai: computeAIIntelligence(gateway, defaultControls),
    alerts: [],
    riskTrends: Array.from({ length: 16 }, (_, idx) => ({
      stepLabel: `T-${15 - idx}m`,
      smokeFireIndex: 1,
      airRisk: 12,
      floodRisk: 6,
      aqiScore: 32,
    })),
    eventHistory: [
      {
        id: 'evt-init-1',
        time: '10:30:00',
        category: 'GATEWAY',
        summary:
          'Central Gateway GW-01 online · Unified Smoke, Fire, Air Quality, Flood & Hazard scanning active.',
      },
      {
        id: 'evt-init-2',
        time: '10:30:04',
        category: 'AIR',
        summary: 'Smoke-to-AQI dynamic dispersion & hydrology radar baselines locked.',
      },
    ],
  };
}

function computeAIIntelligence(
  gateway: CentralGatewayHub,
  controls: SimulationControls
): AIIntelligenceState {
  const [wx, wz] = windTravelVector(controls.windDirection);
  const smokePct = gateway.smokeAndFire.smokeDensityPct;

  let likelyRegion = 'No Active Fire or Smoke Source';
  let estCoords: [number, number] = [-48, -42];
  let attributionConf = 96;
  let angUncertainty = 6;
  let rationale =
    'Central Gateway GW-01 360° optical lidar and NDIR/laser air analyzers report clean baseline atmosphere across all sectors.';

  if (controls.fireAndSmokeActive && smokePct > 4) {
    estCoords = [INDUSTRIAL_STACK_COORDS[0], INDUSTRIAL_STACK_COORDS[2]];
    attributionConf = Math.round(clamp(96 - controls.windSpeed * 0.35, 82, 97));
    angUncertainty = Math.round(clamp(7 + (100 - attributionConf) * 0.35, 6, 16));
    likelyRegion = 'Northwest Industrial Complex (Combustion Unit & Stack B)';
    rationale = `GW-01 optical lidar & IR radiometer locked onto thermal combustion signature (${gateway.smokeAndFire.combustionTempC.toFixed(0)}°C) and smoke plume advecting along ${Math.round(
      (controls.windDirection + 180) % 360
    )}° wind axis.`;
  }

  // Drainage & Flood Prediction routed through GW-01 Radar
  const fh = gateway.floodAndHydrology;
  const estBlockagePct = Math.round(
    clamp(controls.blockageSeverity * 0.9 + (fh.upstreamHeadDeltaM > 0.25 ? 12 : 0), 0, 98)
  );
  const anomalyDetected = estBlockagePct >= 20 || fh.riseVelocityCmMin > 2.5;
  const floodProb = fh.floodProbabilityPct;

  const affectedStreets: string[] = [];
  if (floodProb >= 35) affectedStreets.push('South Canal Lane');
  if (floodProb >= 55) affectedStreets.push('Culvert C2 Crossing');
  if (floodProb >= 72) affectedStreets.push('Mullai Residences Frontage');
  if (floodProb >= 84) affectedStreets.push('Retention Basin Perimeter');

  const headroomCm = Math.max(0, (1.85 - (fh.canalWaterLevelM + fh.upstreamHeadDeltaM)) * 100);
  const timeToOverflowMin =
    fh.riseVelocityCmMin > 0.6 && headroomCm > 0
      ? Math.round(headroomCm / fh.riseVelocityCmMin)
      : headroomCm <= 5
        ? 0
        : null;

  // Virtual Spatial Sector Mapping computed by GW-01
  const virtualTargets = [
    { id: 'V-IND', label: 'Industrial Processing Sector', x: -52, z: -46 },
    { id: 'V-SCHOOL', label: 'Ettimadai Academy Courtyard', x: 20, z: -26 },
    { id: 'V-HOSP', label: 'Regional Medical Center', x: 76, z: -24 },
    { id: 'V-MULLAI', label: 'Mullai Residences & Canal', x: 26, z: 48 },
  ];

  const virtualMapping = virtualTargets.map((vt) => {
    const localSmoke = clamp(evaluateSmokePlumeAt(vt.x, vt.z, controls, 1) * 0.9, 0.2, 100);
    const estPm25 = Number(clamp(19.0 + localSmoke * 2.9, 14, 380).toFixed(1));
    const distGw = Math.hypot(vt.x - GATEWAY_COORDS[0], vt.z - GATEWAY_COORDS[1]);
    const uncertaintyPm25 = Number((1.6 + distGw * 0.04 + (estPm25 > 70 ? 3.5 : 0)).toFixed(1));

    const distCanal = Math.hypot(vt.x - CULVERT_C2_COORDS[0], vt.z - CULVERT_C2_COORDS[1]);
    const totalDepth = fh.canalWaterLevelM + fh.upstreamHeadDeltaM;
    const localFloodCm =
      vt.id === 'V-MULLAI'
        ? Math.round(clamp((totalDepth - 1.2) * 48, 0, 54))
        : Math.round(clamp((totalDepth - 1.5) * 26 * Math.exp(-distCanal / 45), 0, 28));

    return {
      id: vt.id,
      label: vt.label,
      x: vt.x,
      z: vt.z,
      estimatedPm25: estPm25,
      estimatedSmokePct: Number(localSmoke.toFixed(1)),
      estimatedFloodCm: localFloodCm,
      uncertaintyPm25,
      confidencePct: Math.round(clamp(97 - distGw * 0.08, 86, 98)),
    };
  });

  const rh = gateway.environmentalHazards.humidityPct;
  const humidityBiasWarning = rh > 82;

  return {
    sourceAttribution: {
      likelyRegion,
      estimatedCoords: estCoords,
      bearingDeg: Math.round((controls.windDirection + 180) % 360),
      angularUncertaintyDeg: angUncertainty,
      confidencePct: attributionConf,
      dominantPlumeAxisDeg: Math.round((controls.windDirection + 180) % 360),
      rationale,
    },
    drainagePrediction: {
      anomalyDetected,
      suspectedLocation: anomalyDetected
        ? 'Culvert C2 Stormwater Crossing'
        : 'All Canal & Culvert Channels Clear',
      upstreamDownstreamDeltaM: fh.upstreamHeadDeltaM,
      estimatedBlockagePct: estBlockagePct,
      estimatedFloodProbPct: floodProb,
      timeToOverflowMin,
      affectedStreets,
      confidencePct: anomalyDetected ? 94 : 98,
      uncertaintyMarginPct: anomalyDetected ? 5 : 2,
    },
    virtualMapping,
    gatewayDiagnostics: {
      opticalLidarHealthPct: 99,
      airAnalyzerHealthPct: humidityBiasWarning ? 94 : 99,
      hydrologyRadarHealthPct: 99,
      driftLabel: humidityBiasWarning ? '+2.8 µg/m³ (RH Compensated)' : '±0.3 µg/m³ (Zero Drift)',
      humidityBiasWarning,
      recommendation: humidityBiasWarning
        ? 'High humidity (>82%) detected — GW-01 heated intake and Köhler optical correction active.'
        : gateway.maintenanceNote,
    },
  };
}

function formatSimClock(timeOfDay: number): string {
  const wrapped = ((timeOfDay % 24) + 24) % 24;
  const hrs = Math.floor(wrapped);
  const mins = Math.floor((wrapped - hrs) * 60);
  const secs = Math.floor(((wrapped - hrs) * 60 - mins) * 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function stepSimulation(
  prev: SimulationState,
  controls: SimulationControls,
  dt: number,
  activeScenario: ScenarioId
): SimulationState {
  const simTimeSec = prev.simTimeSec + dt;
  const timeStr = formatSimClock(controls.timeOfDay + simTimeSec * 0.002);

  const hourAngle = ((controls.timeOfDay - 14) / 24) * Math.PI * 2;
  const baseTemp = 28.6 + 5.0 * Math.cos(hourAngle) - (controls.rainfallIntensity / 120) * 4.6;
  const baseHumidity = clamp(
    60 - 14 * Math.cos(hourAngle) + (controls.rainfallIntensity / 120) * 35,
    35,
    97
  );

  const wetTarget = clamp(controls.rainfallIntensity / 45, 0, 1);
  const roadWetness =
    prev.roadWetness +
    (wetTarget - prev.roadWetness) * Math.min(1, dt * (wetTarget > prev.roadWetness ? 0.5 : 0.14));

  const solarFactor =
    Math.max(0, Math.sin(clamp((controls.timeOfDay - 6) / 12, 0, 1) * Math.PI)) *
    (1 - (controls.rainfallIntensity / 120) * 0.55);

  // 1. CENTRAL GATEWAY SMOKE, FIRE & COMBUSTION TELEMETRY
  // GW-01 lidar measures peak plume density across the monitored basin + local plaza concentration
  const sourceSmoke = controls.fireAndSmokeActive ? controls.smokeIntensity * 0.92 : 0.3;
  const gwPlumeSmoke = evaluateSmokePlumeAt(
    GATEWAY_COORDS[0],
    GATEWAY_COORDS[1],
    controls,
    simTimeSec
  );
  const targetSmokePct = clamp(Math.max(sourceSmoke * 0.85, gwPlumeSmoke), 0.3, 100);
  const prevSmoke = prev.gateway.smokeAndFire.smokeDensityPct;
  const smokeDensityPct = Number(
    clamp(prevSmoke + (targetSmokePct - prevSmoke) * Math.min(1, dt * 2.1), 0.3, 100).toFixed(1)
  );

  const targetCombustionTemp =
    controls.fireAndSmokeActive && controls.smokeIntensity > 5
      ? baseTemp + controls.smokeIntensity * 4.2 + Math.sin(simTimeSec * 3.2) * 8
      : baseTemp + 0.4;
  const combustionTempC = Number(
    (
      prev.gateway.smokeAndFire.combustionTempC +
      (targetCombustionTemp - prev.gateway.smokeAndFire.combustionTempC) * Math.min(1, dt * 2.4)
    ).toFixed(1)
  );
  const flameSignatureKw =
    controls.fireAndSmokeActive && controls.smokeIntensity > 5
      ? Math.round(controls.smokeIntensity * 18.5 + Math.sin(simTimeSec * 4) * 25)
      : 0;
  const coPpm = Number((0.4 + smokeDensityPct * 0.48).toFixed(1));
  const particulateLoadMgM3 = Number((0.02 + smokeDensityPct * 0.048).toFixed(2));

  let fireRiskLevel: CentralGatewayHub['smokeAndFire']['fireRiskLevel'] = 'Nominal';
  if (smokeDensityPct >= 48 || combustionTempC > 220) fireRiskLevel = 'Combustion Alert';
  else if (smokeDensityPct >= 18) fireRiskLevel = 'Active Smoke';
  else if (smokeDensityPct >= 5) fireRiskLevel = 'Thermal Watch';

  // 2. CENTRAL GATEWAY AIR QUALITY (Dynamically changes based on smoke levels)
  const baselinePm25 = 19.2 + Math.sin(simTimeSec * 0.5) * 0.8;
  const smokePm25Boost = smokeDensityPct * 2.95;
  const rhBoost = baseHumidity > 82 ? (baseHumidity - 82) * 0.4 : 0;
  const targetPm25 = clamp(baselinePm25 + smokePm25Boost + rhBoost, 14, 395);
  const pm25 = Number(
    (
      prev.gateway.airQuality.pm25 +
      (targetPm25 - prev.gateway.airQuality.pm25) * Math.min(1, dt * 2.0)
    ).toFixed(1)
  );
  const pm10 = Number((pm25 * 1.64 + smokeDensityPct * 1.4 + 8.0).toFixed(1));
  const co2 = Math.round(415 + smokeDensityPct * 4.1 + Math.cos(simTimeSec * 0.4) * 3);
  const tvoc = Math.round(82 + smokeDensityPct * 7.2);
  const no2Ppb = Math.round(14 + smokeDensityPct * 1.65);
  const smokeContributionPct = Math.round(clamp((smokePm25Boost / Math.max(1, pm25)) * 100, 0, 96));
  const { aqiScore, aqiCategory } = computeDynamicAqi(pm25, pm10, coPpm);

  // 3. CENTRAL GATEWAY FLOOD & HYDROLOGY TELEMETRY
  const blockageFactor = controls.blockageSeverity / 100;
  const culvertConductance = Math.max(0.08, 1 - blockageFactor * 0.88);
  const targetCanal = clamp(0.24 + (controls.rainfallIntensity / 120) * 1.18, 0.22, 1.55);
  const prevCanal = prev.gateway.floodAndHydrology.canalWaterLevelM;
  const canalWaterLevelM = Number(
    (
      prevCanal +
      (targetCanal - prevCanal) * Math.min(1, dt * (targetCanal > prevCanal ? 0.3 : 0.16))
    ).toFixed(2)
  );

  const targetHead =
    blockageFactor *
    (0.25 + (controls.rainfallIntensity / 120) * 1.15) *
    (0.4 + 0.6 * (1 - culvertConductance));
  const prevHead = prev.gateway.floodAndHydrology.upstreamHeadDeltaM;
  const upstreamHeadDeltaM = Number(
    (
      prevHead +
      (targetHead - prevHead) * Math.min(1, dt * (targetHead > prevHead ? 0.36 : 0.22))
    ).toFixed(2)
  );

  const targetBasin = clamp(
    0.42 + (controls.rainfallIntensity / 120) * 1.65 * (0.45 + 0.55 * culvertConductance),
    0.4,
    2.18
  );
  const prevBasin = prev.gateway.floodAndHydrology.basinWaterLevelM;
  const basinWaterLevelM = Number(
    (
      prevBasin +
      (targetBasin - prevBasin) * Math.min(1, dt * (targetBasin > prevBasin ? 0.22 : 0.12))
    ).toFixed(2)
  );

  const effectiveDepth = canalWaterLevelM + upstreamHeadDeltaM;
  const prevEffective = prevCanal + prevHead;
  const riseVelocityCmMin = Number(
    (((effectiveDepth - prevEffective) / Math.max(0.016, dt)) * 100 * 0.35).toFixed(1)
  );
  const canalCapacityPct = Math.round(clamp((effectiveDepth / 1.85) * 100, 8, 100));
  const surfaceRunoffCm = Math.round(clamp((effectiveDepth - 1.2) * 46, 0, 56));
  const flowRateM3s = Number(
    clamp(
      (0.35 + (controls.rainfallIntensity / 120) * 5.2) * culvertConductance,
      0.18,
      6.8
    ).toFixed(2)
  );

  let culvertStatus: CentralGatewayHub['floodAndHydrology']['culvertStatus'] = 'Clear';
  if (canalCapacityPct >= 84 || upstreamHeadDeltaM > 0.55) culvertStatus = 'Critical Backwater';
  else if (controls.blockageSeverity >= 25 || upstreamHeadDeltaM > 0.22)
    culvertStatus = 'Partial Blockage';
  else if (canalCapacityPct >= 48) culvertStatus = 'Elevated Flow';

  const floodProbabilityPct = Math.round(
    clamp(
      canalCapacityPct * 0.68 +
        (controls.rainfallIntensity / 120) * 28 +
        controls.blockageSeverity * 0.28 -
        10,
      3,
      98
    )
  );

  // 4. ENVIRONMENTAL HAZARDS TELEMETRY
  const heatStressIndexC = Number(
    (baseTemp + (baseHumidity > 60 ? (baseHumidity - 60) * 0.12 : 0)).toFixed(1)
  );
  const acousticDbA = Number(
    (
      50.5 +
      (controls.rainfallIntensity / 120) * 13 +
      (controls.fireAndSmokeActive ? 6.5 : 0) +
      Math.sin(simTimeSec * 1.1) * 0.9
    ).toFixed(1)
  );

  // Status Rollups
  const fireSmokeStatus: SimulationState['fireSmokeStatus'] =
    smokeDensityPct >= 42 ? 'Critical' : smokeDensityPct >= 10 ? 'Elevated' : 'Clear';

  const airQualityStatus: SimulationState['airQualityStatus'] =
    pm25 > 120 ? 'Critical' : pm25 > 75 ? 'Poor' : pm25 > 42 ? 'Moderate' : 'Good';

  const floodRiskStatus: SimulationState['floodRiskStatus'] =
    floodProbabilityPct >= 75
      ? 'Critical'
      : floodProbabilityPct >= 50
        ? 'High'
        : floodProbabilityPct >= 26
          ? 'Moderate'
          : 'Low';

  let overallStatus: SimulationState['overallStatus'] = 'Nominal';
  if (
    fireSmokeStatus === 'Critical' ||
    airQualityStatus === 'Critical' ||
    floodRiskStatus === 'Critical'
  ) {
    overallStatus = 'Emergency';
  } else if (
    fireSmokeStatus === 'Elevated' ||
    airQualityStatus === 'Poor' ||
    floodRiskStatus === 'High'
  ) {
    overallStatus = 'Warning';
  } else if (airQualityStatus === 'Moderate' || floodRiskStatus === 'Moderate') {
    overallStatus = 'Watch';
  }

  const gateway: CentralGatewayHub = {
    ...prev.gateway,
    status: overallStatus,
    solarInputW: Number((165 * solarFactor).toFixed(1)),
    smokeAndFire: {
      smokeDensityPct,
      combustionTempC,
      flameSignatureKw,
      coPpm,
      particulateLoadMgM3,
      fireRiskLevel,
    },
    airQuality: {
      aqiScore,
      aqiCategory,
      pm25,
      pm10,
      co2,
      tvoc,
      no2Ppb,
      smokeContributionPct,
    },
    floodAndHydrology: {
      canalWaterLevelM,
      upstreamHeadDeltaM,
      basinWaterLevelM,
      surfaceRunoffCm,
      canalCapacityPct,
      riseVelocityCmMin,
      flowRateM3s,
      culvertStatus,
      floodProbabilityPct,
    },
    environmentalHazards: {
      ambientTempC: Number(baseTemp.toFixed(1)),
      humidityPct: Math.round(baseHumidity),
      windSpeedMs: Number(controls.windSpeed.toFixed(1)),
      windDirectionDeg: Math.round(controls.windDirection),
      barometricHpa: Number((1009.8 - (controls.rainfallIntensity / 120) * 6.8).toFixed(1)),
      uvIndex: Number((8.5 * solarFactor).toFixed(1)),
      acousticDbA,
      solarIrradianceWm2: Math.round(940 * solarFactor),
      heatStressIndexC,
    },
  };

  // Update buildings telemetry estimated via Central Gateway
  const buildings: InspectableBuilding[] = prev.buildings.map((b) => {
    const localSmoke = clamp(
      evaluateSmokePlumeAt(b.position[0], b.position[2], controls, simTimeSec) * 0.9,
      0.1,
      100
    );
    const estPm = Number(clamp(18.5 + localSmoke * 2.8, 15, 360).toFixed(1));
    const estFlood =
      b.id === 'BLD-PUB-01' || b.id === 'BLD-PUB-02' ? surfaceRunoffCm : 0;
    const isInd = b.id === 'BLD-IND-01';
    const thermalStatus: InspectableBuilding['thermalStatus'] =
      isInd && controls.fireAndSmokeActive && controls.smokeIntensity > 45
        ? 'Combustion Alert'
        : isInd && controls.fireAndSmokeActive
          ? 'Elevated'
          : 'Normal';
    const exposureLevel: InspectableBuilding['exposureLevel'] =
      estPm > 120 || estFlood > 25
        ? 'High'
        : estPm > 65 || estFlood > 10
          ? 'Elevated'
          : estPm > 38
            ? 'Moderate'
            : 'Low';

    return {
      ...b,
      estimatedPm25: estPm,
      estimatedSmokePct: Number(localSmoke.toFixed(1)),
      estimatedFloodDepthCm: estFlood,
      thermalStatus,
      exposureLevel,
    };
  });

  const ai = computeAIIntelligence(gateway, controls);

  // All alerts routed exclusively through GW-01 Central Gateway
  const alerts: EnvironmentalAlert[] = [];
  if (controls.fireAndSmokeActive && (smokeDensityPct > 10 || pm25 > 45)) {
    alerts.push({
      id: 'GW-ALT-FIRE-01',
      timestamp: timeStr,
      routedVia: 'GW-01 Central Gateway',
      location: ai.sourceAttribution.likelyRegion,
      eventType: 'Fire Combustion & Smoke-Coupled AQI Alert',
      affectedArea: 'Industrial Sector · Civic Campus · Downwind Plume Corridor',
      confidencePct: ai.sourceAttribution.confidencePct,
      priority: smokeDensityPct >= 42 || pm25 > 115 ? 'CRITICAL' : 'HIGH',
      englishPreview: `[GW-01 CENTRAL DISPATCH] Thermal combustion (${combustionTempC.toFixed(0)}°C) & smoke (${smokeDensityPct.toFixed(0)}%) detected. Downwind AQI degraded to ${aqiScore} (${pm25.toFixed(0)} µg/m³ PM2.5). Activate civic HVAC filtration.`,
      tamilPreview: `[GW-01 மைய எச்சரிக்கை] தொழிற்சாலை பகுதியில் தீ/புகை (${smokeDensityPct.toFixed(0)}%) கண்டறியப்பட்டு காற்றின் தரம் (AQI ${aqiScore}) பாதிக்கப்பட்டுள்ளது. பாதுகாப்பு நடவடிக்கைகளை மேற்கொள்ளவும்.`,
    });
  }

  if (ai.drainagePrediction.anomalyDetected || floodProbabilityPct >= 48) {
    alerts.push({
      id: 'GW-ALT-FLOOD-01',
      timestamp: timeStr,
      routedVia: 'GW-01 Central Gateway',
      location: ai.drainagePrediction.suspectedLocation,
      eventType: ai.drainagePrediction.anomalyDetected
        ? 'Culvert C2 Blockage & Backwater Surge'
        : 'Stormwater Canal High-Water Alert',
      affectedArea:
        ai.drainagePrediction.affectedStreets.length > 0
          ? ai.drainagePrediction.affectedStreets.join(' · ')
          : 'Southern Stormwater Canal Corridor',
      confidencePct: ai.drainagePrediction.confidencePct,
      priority: floodProbabilityPct >= 75 ? 'CRITICAL' : 'HIGH',
      englishPreview: `[GW-01 CENTRAL DISPATCH] Hydrology radar detected +${upstreamHeadDeltaM.toFixed(2)}m backwater surge at Culvert C2 (${ai.drainagePrediction.estimatedBlockagePct}% blockage). Flood probability at ${floodProbabilityPct}%.`,
      tamilPreview: `[GW-01 மைய எச்சரிக்கை] பாலம் C2 கால்வாயில் நீரோட்டத் தடை (${ai.drainagePrediction.estimatedBlockagePct}%) காரணமாக நீர்மட்டம் உயர்கிறது. தாழ்வான பகுதிகளில் வெள்ள அபாயம் (${floodProbabilityPct}%).`,
    });
  }

  let riskTrends = prev.riskTrends;
  let eventHistory = prev.eventHistory;
  const prevBucket = Math.floor(prev.simTimeSec / 2.5);
  const currBucket = Math.floor(simTimeSec / 2.5);

  if (currBucket > prevBucket) {
    const airRisk = Math.round(clamp(((pm25 - 15) / 140) * 100, 5, 100));
    riskTrends = [
      ...prev.riskTrends.slice(-15),
      {
        stepLabel: timeStr.slice(0, 5),
        smokeFireIndex: Math.round(smokeDensityPct),
        airRisk,
        floodRisk: floodProbabilityPct,
        aqiScore,
      },
    ];

    if (prev.overallStatus !== overallStatus) {
      const cat: EventHistoryEntry['category'] =
        fireSmokeStatus !== 'Clear'
          ? 'FIRE/SMOKE'
          : floodRiskStatus === 'High' || floodRiskStatus === 'Critical'
            ? 'FLOOD'
            : 'GATEWAY';
      eventHistory = [
        {
          id: `evt-${Date.now()}`,
          time: timeStr,
          category: cat,
          summary: `GW-01 Hub status → ${overallStatus} (Smoke: ${fireSmokeStatus}, AQI: ${aqiScore}, Flood: ${floodRiskStatus}).`,
        },
        ...prev.eventHistory,
      ].slice(0, 14);
    }
  }

  return {
    simTimeSec,
    activeScenario,
    overallStatus,
    fireSmokeStatus,
    airQualityStatus,
    floodRiskStatus,
    roadWetness,
    gateway,
    buildings,
    ai,
    alerts,
    riskTrends,
    eventHistory,
  };
}
