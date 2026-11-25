import React from 'react';
import {
  Activity,
  BatteryCharging,
  Building2,
  Droplets,
  Flame,
  Gauge,
  Radio,
  ShieldCheck,
  Sparkles,
  Sun,
  Wind,
  X,
} from 'lucide-react';
import {
  CentralGatewayHub,
  SelectedInspectable,
  SimulationState,
} from '../simulation/types';

interface InspectorDrawerProps {
  selected: SelectedInspectable;
  simState: SimulationState;
  onClose: () => void;
}

const STATUS_COLORS: Record<CentralGatewayHub['status'], string> = {
  Nominal: 'text-emerald-400',
  Watch: 'text-amber-400',
  Warning: 'text-orange-400',
  Emergency: 'text-red-400',
};

const STATUS_DOT: Record<CentralGatewayHub['status'], string> = {
  Nominal: '#10b981',
  Watch: '#f59e0b',
  Warning: '#f97316',
  Emergency: '#ef4444',
};

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  selected,
  simState,
  onClose,
}) => {
  if (!selected) return null;

  if (selected.type === 'building') {
    const liveBuilding =
      simState.buildings.find((item) => item.id === selected.building.id) ??
      selected.building;

    return (
      <aside className="pointer-events-auto w-96 bg-[#080c14]/96 border border-slate-700/85 rounded-md shadow-2xl text-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-14rem)]">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                {liveBuilding.zone} · {liveBuilding.id}
              </div>
              <h3 className="text-sm font-semibold text-white">{liveBuilding.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto text-xs">
          <div className="text-[11px] text-amber-200/90 font-medium">
            {liveBuilding.tamilName}
          </div>
          <p className="text-slate-300 leading-relaxed">{liveBuilding.description}</p>

          <div className="grid grid-cols-2 gap-2.5 font-mono">
            <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">
                THERMAL STATUS
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {liveBuilding.thermalStatus}
              </div>
            </div>
            <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">
                EXPOSURE LEVEL
              </div>
              <div className="text-sm font-bold text-white mt-1 uppercase">
                {liveBuilding.exposureLevel}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-3 space-y-2.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              ESTIMATED EXPOSURE (ROUTED VIA GW-01)
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono">
              <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] text-slate-400">EST. PM2.5</div>
                <div className="text-xs font-bold text-amber-400 mt-0.5 tabular-nums">
                  {liveBuilding.estimatedPm25} µg/m³
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] text-slate-400">SMOKE PLUME</div>
                <div className="text-xs font-bold text-orange-400 mt-0.5 tabular-nums">
                  {liveBuilding.estimatedSmokePct}%
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] text-slate-400">FLOOD DEPTH</div>
                <div className="text-xs font-bold text-sky-400 mt-0.5 tabular-nums">
                  {liveBuilding.estimatedFloodDepthCm} cm
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Central Gateway Hub Inspection
  const gw = simState.gateway;

  return (
    <aside className="pointer-events-auto w-[410px] bg-[#080c14]/96 border border-slate-700/85 rounded-md shadow-2xl text-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-12.5rem)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center gap-2.5">
          <Radio className="w-4 h-4 text-sky-400" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                {gw.id} · CENTRAL HUB
              </span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: STATUS_DOT[gw.status] }}
              />
              <span
                className={`text-[11px] font-mono font-bold uppercase ${STATUS_COLORS[gw.status]}`}
              >
                {gw.status}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white">{gw.name}</h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto text-xs">
        <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between border-b border-slate-800/80 pb-2">
          <span>SECTOR: {gw.zone}</span>
          <span>RADIUS: {gw.activeScanRadiusM}m</span>
        </div>

        {/* 1. Smoke, Fire & Combustion Telemetry */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-orange-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" /> 1. FIRE, COMBUSTION & SMOKE LIDAR
            </span>
            <span className="font-bold uppercase">{gw.smokeAndFire.fireRiskLevel}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">SMOKE OPTICAL DENSITY</div>
              <div className="text-sm font-bold text-white mt-0.5 tabular-nums">
                {gw.smokeAndFire.smokeDensityPct}% ({gw.smokeAndFire.particulateLoadMgM3} mg/m³)
              </div>
            </div>
            <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">IR COMBUSTION TEMP</div>
              <div className="text-sm font-bold text-orange-400 mt-0.5 tabular-nums">
                {gw.smokeAndFire.combustionTempC} °C
              </div>
            </div>
            <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">CARBON MONOXIDE (CO)</div>
              <div className="text-sm font-bold text-white mt-0.5 tabular-nums">
                {gw.smokeAndFire.coPpm} ppm
              </div>
            </div>
            <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">IR RADIANT POWER</div>
              <div className="text-sm font-bold text-white mt-0.5 tabular-nums">
                {gw.smokeAndFire.flameSignatureKw} kW
              </div>
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-400 bg-slate-900/70 px-2.5 py-1.5 rounded border border-slate-800/80">
            ATTRIBUTION:{' '}
            <span className="text-slate-200">
              {simState.ai.sourceAttribution.likelyRegion} ({simState.ai.sourceAttribution.confidencePct}%)
            </span>
          </div>
        </div>

        {/* 2. Dynamic Smoke-Coupled Air Quality Telemetry */}
        <div className="space-y-2 border-t border-slate-800/80 pt-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5" /> 2. SMOKE-COUPLED AIR QUALITY
            </span>
            <span className="font-bold">
              AQI {gw.airQuality.aqiScore} ({gw.airQuality.aqiCategory})
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 font-mono">
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">PM2.5</div>
              <div className="text-xs font-bold text-white mt-0.5 tabular-nums">
                {gw.airQuality.pm25} µg/m³
              </div>
            </div>
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">PM10</div>
              <div className="text-xs font-bold text-white mt-0.5 tabular-nums">
                {gw.airQuality.pm10} µg/m³
              </div>
            </div>
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">NO₂</div>
              <div className="text-xs font-bold text-white mt-0.5 tabular-nums">
                {gw.airQuality.no2Ppb} ppb
              </div>
            </div>
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">CO₂</div>
              <div className="text-xs font-bold text-white mt-0.5 tabular-nums">
                {gw.airQuality.co2} ppm
              </div>
            </div>
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">TVOC</div>
              <div className="text-xs font-bold text-white mt-0.5 tabular-nums">
                {gw.airQuality.tvoc} ppb
              </div>
            </div>
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">SMOKE SHARE</div>
              <div className="text-xs font-bold text-orange-400 mt-0.5 tabular-nums">
                {gw.airQuality.smokeContributionPct}%
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
            <span>
              Air quality dynamically coupled to smoke density ({gw.smokeAndFire.smokeDensityPct}%).
            </span>
          </div>
        </div>

        {/* 3. Flood & Hydrology Telemetry */}
        <div className="space-y-2 border-t border-slate-800/80 pt-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-sky-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5" /> 3. FLOOD & CANAL HYDROLOGY RADAR
            </span>
            <span className="font-bold">
              RISK {gw.floodAndHydrology.floodProbabilityPct}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">CANAL WATER STAGE</div>
              <div className="text-xs font-bold text-white mt-0.5 tabular-nums">
                {gw.floodAndHydrology.canalWaterLevelM.toFixed(2)} m (+{gw.floodAndHydrology.upstreamHeadDeltaM.toFixed(2)}m surge)
              </div>
            </div>
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">CANAL CAPACITY</div>
              <div className="text-xs font-bold text-white mt-0.5 tabular-nums">
                {gw.floodAndHydrology.canalCapacityPct}% · {gw.floodAndHydrology.flowRateM3s} m³/s
              </div>
            </div>
          </div>
        </div>

        {/* 4. Multi-Hazard Weather & Hardware Diagnostics */}
        <div className="space-y-2 border-t border-slate-800/80 pt-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5" /> 4. MICRO-CLIMATE & HUB DIAGNOSTICS
          </div>
          <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">TEMP / HUM</div>
              <div className="font-bold text-white mt-0.5 tabular-nums">
                {gw.environmentalHazards.ambientTempC}°C / {gw.environmentalHazards.humidityPct}%
              </div>
            </div>
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">PRESSURE</div>
              <div className="font-bold text-white mt-0.5 tabular-nums">
                {gw.environmentalHazards.barometricHpa} hPa
              </div>
            </div>
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">ACOUSTIC</div>
              <div className="font-bold text-white mt-0.5 tabular-nums">
                {gw.environmentalHazards.acousticDbA} dBA
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
            <span className="flex items-center gap-1 text-emerald-400">
              <BatteryCharging className="w-3.5 h-3.5" /> {gw.batteryPct}%
            </span>
            <span className="flex items-center gap-1 text-amber-300">
              <Sun className="w-3.5 h-3.5" /> {gw.solarInputW}W PV
            </span>
            <span className="flex items-center gap-1 text-sky-400">
              <Activity className="w-3.5 h-3.5" /> {gw.uplinkLatencyMs}ms
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> {gw.telemetryIntegrityPct}% INTEGRITY
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
