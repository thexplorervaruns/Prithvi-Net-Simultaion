export type CameraPresetId =
  | 'aerial'
  | 'gateway'
  | 'industrial'
  | 'residential'
  | 'drainage'
  | 'flood';

export type ScenarioId = 'none' | 'fire_smoke' | 'flood' | 'combined';

export type AlertPriority = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'ADVISORY';

export interface SimulationControls {
  isRunning: boolean;
  fireAndSmokeActive: boolean;
  smokeIntensity: number; // 0 to 100 (%) — drives fire combustion, smoke density & dynamic air quality
  rainfallIntensity: number; // 0 to 120 (mm/hr)
  blockageSeverity: number; // 0 to 100 (%) at Culvert C2
  windDirection: number; // 0 to 360 deg (direction wind blows FROM)
  windSpeed: number; // 0.5 to 18 (m/s)
  timeOfDay: number; // 0 to 24 (hours)
  showGatewayScan: boolean;
  showVirtualHeatmap: boolean;
  flyoverActive: boolean;
}

export interface SmokeAndFireTelemetry {
  smokeDensityPct: number; // 0-100% optical obscuration
  combustionTempC: number; // localized thermal signature (°C)
  flameSignatureKw: number; // IR combustion radiant power (kW)
  coPpm: number; // carbon monoxide (ppm)
  particulateLoadMgM3: number; // mg/m³
  fireRiskLevel: 'Nominal' | 'Thermal Watch' | 'Active Smoke' | 'Combustion Alert';
}

export interface AirQualityTelemetry {
  aqiScore: number; // 0-500 dynamic score coupled to smoke & combustion
  aqiCategory: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Severe';
  pm25: number; // µg/m³
  pm10: number; // µg/m³
  co2: number; // ppm
  tvoc: number; // ppb
  no2Ppb: number; // ppb
  smokeContributionPct: number; // % of PM2.5 driven by active smoke
}

export interface FloodAndHydrologyTelemetry {
  canalWaterLevelM: number; // m
  upstreamHeadDeltaM: number; // m backwater surge at Culvert C2
  basinWaterLevelM: number; // m
  surfaceRunoffCm: number; // cm
  canalCapacityPct: number; // %
  riseVelocityCmMin: number; // cm/min
  flowRateM3s: number; // m³/s
  culvertStatus: 'Clear' | 'Elevated Flow' | 'Partial Blockage' | 'Critical Backwater';
  floodProbabilityPct: number; // %
}

export interface EnvironmentalHazardTelemetry {
  ambientTempC: number;
  humidityPct: number;
  windSpeedMs: number;
  windDirectionDeg: number;
  barometricHpa: number;
  uvIndex: number;
  acousticDbA: number;
  solarIrradianceWm2: number;
  heatStressIndexC: number;
}

export interface CentralGatewayHub {
  id: 'GW-01';
  name: string;
  tamilName: string;
  zone: string;
  position: [number, number, number];
  status: 'Nominal' | 'Watch' | 'Warning' | 'Emergency';
  healthScorePct: number;
  batteryPct: number;
  solarInputW: number;
  uplinkLatencyMs: number;
  telemetryIntegrityPct: number;
  activeScanRadiusM: number;
  maintenanceNote: string;
  smokeAndFire: SmokeAndFireTelemetry;
  airQuality: AirQualityTelemetry;
  floodAndHydrology: FloodAndHydrologyTelemetry;
  environmentalHazards: EnvironmentalHazardTelemetry;
}

export interface InspectableBuilding {
  id: string;
  name: string;
  tamilName: string;
  category: 'Industrial' | 'Civic' | 'Residential' | 'Infrastructure';
  zone: string;
  description: string;
  position: [number, number, number];
  estimatedPm25: number;
  estimatedSmokePct: number;
  estimatedFloodDepthCm: number;
  thermalStatus: 'Normal' | 'Elevated' | 'Combustion Alert';
  exposureLevel: 'Low' | 'Moderate' | 'Elevated' | 'High';
}

export type SelectedInspectable =
  | { type: 'gateway' }
  | { type: 'building'; building: InspectableBuilding }
  | null;

export interface SourceAttributionOutput {
  likelyRegion: string;
  estimatedCoords: [number, number];
  bearingDeg: number;
  angularUncertaintyDeg: number;
  confidencePct: number;
  dominantPlumeAxisDeg: number;
  rationale: string;
}

export interface DrainagePredictionOutput {
  anomalyDetected: boolean;
  suspectedLocation: string;
  upstreamDownstreamDeltaM: number;
  estimatedBlockagePct: number;
  estimatedFloodProbPct: number;
  timeToOverflowMin: number | null;
  affectedStreets: string[];
  confidencePct: number;
  uncertaintyMarginPct: number;
}

export interface VirtualSectorEstimate {
  id: string;
  label: string;
  x: number;
  z: number;
  estimatedPm25: number;
  estimatedSmokePct: number;
  estimatedFloodCm: number;
  uncertaintyPm25: number;
  confidencePct: number;
}

export interface GatewayDiagnosticsOutput {
  opticalLidarHealthPct: number;
  airAnalyzerHealthPct: number;
  hydrologyRadarHealthPct: number;
  driftLabel: string;
  humidityBiasWarning: boolean;
  recommendation: string;
}

export interface AIIntelligenceState {
  sourceAttribution: SourceAttributionOutput;
  drainagePrediction: DrainagePredictionOutput;
  virtualMapping: VirtualSectorEstimate[];
  gatewayDiagnostics: GatewayDiagnosticsOutput;
}

export interface EnvironmentalAlert {
  id: string;
  timestamp: string;
  routedVia: 'GW-01 Central Gateway';
  location: string;
  eventType: string;
  affectedArea: string;
  confidencePct: number;
  priority: AlertPriority;
  englishPreview: string;
  tamilPreview: string;
}

export interface RiskTrendPoint {
  stepLabel: string;
  smokeFireIndex: number;
  airRisk: number;
  floodRisk: number;
  aqiScore: number;
}

export interface EventHistoryEntry {
  id: string;
  time: string;
  category: 'FIRE/SMOKE' | 'AIR' | 'FLOOD' | 'GATEWAY';
  summary: string;
}

export interface SimulationState {
  simTimeSec: number;
  activeScenario: ScenarioId;
  overallStatus: 'Nominal' | 'Watch' | 'Warning' | 'Emergency';
  fireSmokeStatus: 'Clear' | 'Elevated' | 'Critical';
  airQualityStatus: 'Good' | 'Moderate' | 'Poor' | 'Critical';
  floodRiskStatus: 'Low' | 'Moderate' | 'High' | 'Critical';
  roadWetness: number;
  gateway: CentralGatewayHub;
  buildings: InspectableBuilding[];
  ai: AIIntelligenceState;
  alerts: EnvironmentalAlert[];
  riskTrends: RiskTrendPoint[];
  eventHistory: EventHistoryEntry[];
}
