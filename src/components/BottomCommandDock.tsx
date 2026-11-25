import React, { useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Clock,
  CloudRain,
  Flame,
  Gauge,
  Radio,
  RotateCcw,
  Sliders,
  Sparkles,
  Sun,
  Wind,
} from 'lucide-react';
import {
  CameraPresetId,
  CentralGatewayHub,
  ScenarioId,
  SimulationControls,
  SimulationState,
} from '../simulation/types';
import { CAMERA_PRESETS } from '../simulation/worldLayout';

interface BottomCommandDockProps {
  controls: SimulationControls;
  simState: SimulationState;
  activeCameraPreset: CameraPresetId;
  onUpdateControls: (patch: Partial<SimulationControls>) => void;
  onSelectCameraPreset: (preset: CameraPresetId) => void;
  onTriggerScenario: (scenario: ScenarioId) => void;
  onInspectGateway: () => void;
}

type DockTabId = 'simulation' | 'gateway' | 'cameras' | 'timeline';

const STATUS_DOT: Record<CentralGatewayHub['status'], string> = {
  Nominal: '#10b981',
  Watch: '#f59e0b',
  Warning: '#f97316',
  Emergency: '#ef4444',
};

export const BottomCommandDock: React.FC<BottomCommandDockProps> = ({
  controls,
  simState,
  activeCameraPreset,
  onUpdateControls,
  onSelectCameraPreset,
  onTriggerScenario,
  onInspectGateway,
}) => {
  const [activeTab, setActiveTab] = useState<DockTabId>('simulation');
  const [expanded, setExpanded] = useState<boolean>(true);

  const gw = simState.gateway;

  return (
    <section className="pointer-events-auto w-full max-w-6xl mx-auto px-4 pb-3 z-20 select-none">
      <div className="bg-[#080c14]/95 border border-slate-700/85 rounded-md shadow-2xl text-slate-200 overflow-hidden">
        {/* Top Tab Navigation & Quick Scenario Strip */}
        <div className="px-4 py-2 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3 bg-slate-900/75">
          {/* Left: View Mode Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setActiveTab('simulation');
                setExpanded(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'simulation' && expanded
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>ENVIRONMENTAL CONTROLS</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('gateway');
                setExpanded(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'gateway' && expanded
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>GW-01 CENTRAL HUB TELEMETRY</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('cameras');
                setExpanded(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'cameras' && expanded
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>3D CAMERA VIEWS ({CAMERA_PRESETS.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('timeline');
                setExpanded(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'timeline' && expanded
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>GATEWAY LOG ({simState.eventHistory.length})</span>
            </button>
          </div>

          {/* Right: 1-Click Investor Demonstration Scenarios */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 hidden md:inline">
              SCENARIOS:
            </span>

            <button
              onClick={() => onTriggerScenario('fire_smoke')}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
                simState.activeScenario === 'fire_smoke'
                  ? 'bg-orange-950/90 border-orange-500 text-orange-200'
                  : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-orange-500/60'
              }`}
            >
              1. Fire & Smoke Event
            </button>

            <button
              onClick={() => onTriggerScenario('flood')}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
                simState.activeScenario === 'flood'
                  ? 'bg-sky-950/90 border-sky-400 text-sky-200'
                  : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-sky-400/60'
              }`}
            >
              2. Urban Flood Event
            </button>

            <button
              onClick={() => onTriggerScenario('combined')}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
                simState.activeScenario === 'combined'
                  ? 'bg-red-950/90 border-red-500 text-red-200'
                  : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-red-500/60'
              }`}
            >
              3. Combined Emergency
            </button>

            <button
              onClick={() => onTriggerScenario('none')}
              title="Reset to Baseline Conditions"
              className="p-1.5 rounded bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setExpanded((prev) => !prev)}
              aria-label="Toggle Control Dock"
              className="p-1.5 rounded bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Dock Body */}
        {expanded && (
          <div className="p-4">
            {/* TAB 1: ENVIRONMENTAL CONTROLS */}
            {activeTab === 'simulation' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                {/* Col 1: Fire, Combustion & Smoke Control */}
                <div className="p-3 rounded bg-slate-900/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      FIRE & SMOKE SOURCE
                    </span>
                    <button
                      onClick={() =>
                        onUpdateControls({
                          fireAndSmokeActive: !controls.fireAndSmokeActive,
                          smokeIntensity: !controls.fireAndSmokeActive
                            ? Math.max(45, controls.smokeIntensity)
                            : controls.smokeIntensity,
                        })
                      }
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                        controls.fireAndSmokeActive
                          ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {controls.fireAndSmokeActive ? 'ACTIVE' : 'NORMAL'}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>Combustion & Smoke Level</span>
                      <span className="text-white font-bold tabular-nums">
                        {controls.fireAndSmokeActive
                          ? `${controls.smokeIntensity}%`
                          : '0% (Baseline)'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={controls.smokeIntensity}
                      onChange={(e) =>
                        onUpdateControls({
                          fireAndSmokeActive: Number(e.target.value) > 0,
                          smokeIntensity: Number(e.target.value),
                        })
                      }
                      className="w-full accent-orange-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                    />
                    <div className="text-[10px] font-mono text-amber-400/90 flex items-center justify-between pt-0.5">
                      <span>Smoke → Dynamic AQI</span>
                      <span className="font-bold">
                        AQI {gw.airQuality.aqiScore} · {gw.airQuality.pm25} µg/m³
                      </span>
                    </div>
                  </div>
                </div>

                {/* Col 2: Rainfall & Flood Control */}
                <div className="p-3 rounded bg-slate-900/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                      MONSOON RAINFALL
                    </span>
                    <span className="text-xs font-mono font-bold text-sky-400 tabular-nums">
                      {controls.rainfallIntensity} mm/hr
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>Canal Stage / Risk</span>
                      <span className="text-white font-bold tabular-nums">
                        {gw.floodAndHydrology.canalWaterLevelM.toFixed(2)} m ({gw.floodAndHydrology.floodProbabilityPct}%)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={120}
                      value={controls.rainfallIntensity}
                      onChange={(e) =>
                        onUpdateControls({
                          rainfallIntensity: Number(e.target.value),
                        })
                      }
                      className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                      <span>Culvert C2 Blockage</span>
                      <span className="text-sky-300 font-bold tabular-nums">
                        {controls.blockageSeverity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={controls.blockageSeverity}
                      onChange={(e) =>
                        onUpdateControls({
                          blockageSeverity: Number(e.target.value),
                        })
                      }
                      className="w-full accent-sky-400 cursor-pointer h-1 bg-slate-800 rounded"
                    />
                  </div>
                </div>

                {/* Col 3: Wind Vector Control */}
                <div className="p-3 rounded bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-teal-400" />
                      WIND DISPERSION
                    </span>
                    <span className="text-xs font-mono font-bold text-teal-400 tabular-nums">
                      {controls.windSpeed.toFixed(1)} m/s · {controls.windDirection}°
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 mb-1">
                        Speed (m/s)
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={16}
                        step={0.5}
                        value={controls.windSpeed}
                        onChange={(e) =>
                          onUpdateControls({ windSpeed: Number(e.target.value) })
                        }
                        className="w-full accent-teal-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                      />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 mb-1">
                        Direction (°)
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={359}
                        value={controls.windDirection}
                        onChange={(e) =>
                          onUpdateControls({
                            windDirection: Number(e.target.value),
                          })
                        }
                        className="w-full accent-teal-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Col 4: Solar Time & Central Gateway Scan Wave */}
                <div className="p-3 rounded bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-300" />
                      SOLAR TIME & GATEWAY
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300 tabular-nums">
                      {Math.floor(controls.timeOfDay)
                        .toString()
                        .padStart(2, '0')}
                      :
                      {Math.round((controls.timeOfDay % 1) * 60)
                        .toString()
                        .padStart(2, '0')}{' '}
                      IST
                    </span>
                  </div>

                  <input
                    type="range"
                    min={6.5}
                    max={18.5}
                    step={0.25}
                    value={controls.timeOfDay}
                    onChange={(e) =>
                      onUpdateControls({ timeOfDay: Number(e.target.value) })
                    }
                    className="w-full accent-amber-300 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[10px] font-mono text-slate-400">
                      GW-01 Ground Lidar Scan
                    </span>
                    <button
                      onClick={() =>
                        onUpdateControls({
                          showGatewayScan: !controls.showGatewayScan,
                        })
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                        controls.showGatewayScan
                          ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {controls.showGatewayScan ? 'VISIBLE' : 'HIDDEN'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CENTRAL GATEWAY HUB (GW-01) UNIFIED SUBSYSTEM MATRIX */}
            {activeTab === 'gateway' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: STATUS_DOT[gw.status] }}
                    />
                    <span className="text-xs font-mono font-bold text-white">
                      {gw.id} · {gw.name}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ({gw.zone})
                    </span>
                  </div>
                  <button
                    onClick={onInspectGateway}
                    className="px-2.5 py-1 rounded bg-sky-500/20 border border-sky-500/50 text-sky-300 hover:bg-sky-500/30 text-xs font-mono transition-colors cursor-pointer"
                  >
                    Open Full Gateway Inspector →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
                  {/* Subsystem 1: Fire & Smoke */}
                  <div className="p-3 rounded bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-orange-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5" /> SMOKE & COMBUSTION
                      </span>
                      <span className="uppercase">{gw.smokeAndFire.fireRiskLevel}</span>
                    </div>
                    <div className="text-sm font-bold text-white tabular-nums">
                      Smoke: {gw.smokeAndFire.smokeDensityPct}% · Temp: {gw.smokeAndFire.combustionTempC}°C
                    </div>
                    <div className="text-[11px] text-slate-400 tabular-nums">
                      CO: {gw.smokeAndFire.coPpm} ppm · IR Power:{' '}
                      {gw.smokeAndFire.flameSignatureKw} kW
                    </div>
                  </div>

                  {/* Subsystem 2: Smoke-Coupled Air Quality */}
                  <div className="p-3 rounded bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> SMOKE-COUPLED AQI
                      </span>
                      <span>
                        {gw.airQuality.aqiScore} ({gw.airQuality.aqiCategory})
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white tabular-nums">
                      PM2.5: {gw.airQuality.pm25} µg/m³ · PM10: {gw.airQuality.pm10} µg/m³
                    </div>
                    <div className="text-[11px] text-slate-400 tabular-nums">
                      CO₂: {gw.airQuality.co2} ppm · TVOC: {gw.airQuality.tvoc} ppb
                    </div>
                  </div>

                  {/* Subsystem 3: Flood & Hydrology */}
                  <div className="p-3 rounded bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-sky-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <CloudRain className="w-3.5 h-3.5" /> FLOOD & HYDROLOGY
                      </span>
                      <span className="uppercase">{gw.floodAndHydrology.culvertStatus}</span>
                    </div>
                    <div className="text-sm font-bold text-white tabular-nums">
                      Stage: {gw.floodAndHydrology.canalWaterLevelM.toFixed(2)}m · Risk:{' '}
                      {gw.floodAndHydrology.floodProbabilityPct}%
                    </div>
                    <div className="text-[11px] text-slate-400 tabular-nums">
                      Canal Cap: {gw.floodAndHydrology.canalCapacityPct}% · Flow:{' '}
                      {gw.floodAndHydrology.flowRateM3s} m³/s
                    </div>
                  </div>

                  {/* Subsystem 4: Multi-Hazard & Weather */}
                  <div className="p-3 rounded bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-teal-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5" /> ENVIRONMENTAL HAZARDS
                      </span>
                      <span>{gw.healthScorePct}% HEALTH</span>
                    </div>
                    <div className="text-sm font-bold text-white tabular-nums">
                      {gw.environmentalHazards.ambientTempC}°C · RH {gw.environmentalHazards.humidityPct}% ·{' '}
                      {gw.environmentalHazards.acousticDbA} dBA
                    </div>
                    <div className="text-[11px] text-slate-400 tabular-nums">
                      Heat Index: {gw.environmentalHazards.heatStressIndexC}°C · Baro:{' '}
                      {gw.environmentalHazards.barometricHpa} hPa
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CINEMATIC 3D CAMERA PERSPECTIVES */}
            {activeTab === 'cameras' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {CAMERA_PRESETS.map((preset) => {
                  const isActive = activeCameraPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => onSelectCameraPreset(preset.id)}
                      className={`p-2.5 rounded border text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sky-950/80 border-sky-400 text-white'
                          : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-xs font-mono font-bold text-sky-300">
                        {preset.label}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">
                        [{preset.target[0]}, {preset.target[2]}]
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB 4: CENTRAL GATEWAY EVENT TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto font-mono text-xs">
                {simState.eventHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-1.5 rounded bg-slate-900/90 border border-slate-800/90"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 tabular-nums">
                        {item.time}
                      </span>
                      <span className="uppercase text-[10px] font-bold text-sky-400">
                        [GW-01 · {item.category}]
                      </span>
                      <span className="text-slate-200">{item.summary}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
