import React from 'react';
import {
  Bell,
  CloudRain,
  Flame,
  HelpCircle,
  Radio,
  ShieldAlert,
  Wind,
} from 'lucide-react';
import {
  SimulationControls,
  SimulationState,
} from '../simulation/types';

interface TopStatusBarProps {
  simState: SimulationState;
  controls: SimulationControls;
  alertFeedOpen: boolean;
  onToggleAlertFeed: () => void;
  onOpenHelp: () => void;
  onInspectGateway: () => void;
}

const OVERALL_META: Record<
  SimulationState['overallStatus'],
  { label: string; colorClass: string; dotColor: string }
> = {
  Nominal: {
    label: 'NOMINAL',
    colorClass: 'text-emerald-400',
    dotColor: '#10b981',
  },
  Watch: {
    label: 'WATCH',
    colorClass: 'text-amber-400',
    dotColor: '#f59e0b',
  },
  Warning: {
    label: 'WARNING',
    colorClass: 'text-orange-400',
    dotColor: '#f97316',
  },
  Emergency: {
    label: 'EMERGENCY',
    colorClass: 'text-red-400',
    dotColor: '#ef4444',
  },
};

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  simState,
  controls,
  alertFeedOpen,
  onToggleAlertFeed,
  onOpenHelp,
  onInspectGateway,
}) => {
  const overallMeta = OVERALL_META[simState.overallStatus];
  const gw = simState.gateway;

  const fireColor =
    simState.fireSmokeStatus === 'Critical'
      ? 'text-red-400'
      : simState.fireSmokeStatus === 'Elevated'
      ? 'text-orange-400'
      : 'text-emerald-400';

  const airColor =
    simState.airQualityStatus === 'Critical'
      ? 'text-red-400'
      : simState.airQualityStatus === 'Poor'
      ? 'text-orange-400'
      : simState.airQualityStatus === 'Moderate'
      ? 'text-amber-400'
      : 'text-emerald-400';

  const floodColor =
    simState.floodRiskStatus === 'Critical'
      ? 'text-red-400'
      : simState.floodRiskStatus === 'High'
      ? 'text-orange-400'
      : simState.floodRiskStatus === 'Moderate'
      ? 'text-amber-400'
      : 'text-emerald-400';

  const activeAlertCount = simState.alerts.filter(
    (a) => a.priority === 'CRITICAL' || a.priority === 'HIGH'
  ).length;

  return (
    <header className="pointer-events-auto h-14 px-5 bg-[#080c14]/94 border-b border-slate-800/90 flex items-center justify-between text-slate-200 z-20 select-none">
      {/* Zone 1: Brand Identity & Single Central Gateway Link */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
          <span className="font-mono font-bold tracking-wider text-sm text-white">
            PRITHVI-NET
          </span>
        </div>
        <span className="text-slate-700">|</span>
        <button
          onClick={onInspectGateway}
          className="flex items-center gap-2 text-xs text-slate-300 hover:text-sky-300 transition-colors cursor-pointer"
          title="Inspect GW-01 Central Environmental Safety Gateway"
        >
          <Radio className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-mono text-sky-400 font-semibold">
            {gw.id} CENTRAL HUB
          </span>
          <span className="hidden xl:inline text-slate-500">
            · Ettimadai Sector, Coimbatore
          </span>
        </button>
      </div>

      {/* Zone 2: Live Centralized Gateway Telemetry Summary */}
      <div className="flex items-center gap-6 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 uppercase tracking-wider text-[11px]">
            GATEWAY STATUS
          </span>
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: overallMeta.dotColor }}
          />
          <span className={`font-semibold ${overallMeta.colorClass}`}>
            {overallMeta.label}
          </span>
        </div>

        <span className="text-slate-800">|</span>

        <div className="flex items-center gap-2">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-slate-400 uppercase tracking-wider text-[11px]">
            FIRE & SMOKE
          </span>
          <span className={`font-semibold tabular-nums ${fireColor}`}>
            {gw.smokeAndFire.smokeDensityPct}% · {gw.smokeAndFire.combustionTempC}°C
          </span>
        </div>

        <span className="text-slate-800">|</span>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 uppercase tracking-wider text-[11px]">
            SMOKE-COUPLED AQI
          </span>
          <span className={`font-semibold tabular-nums ${airColor}`}>
            {gw.airQuality.aqiScore} ({gw.airQuality.pm25} µg/m³)
          </span>
        </div>

        <span className="text-slate-800">|</span>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 uppercase tracking-wider text-[11px]">
            FLOOD STAGE
          </span>
          <span className={`font-semibold tabular-nums ${floodColor}`}>
            {gw.floodAndHydrology.canalWaterLevelM.toFixed(2)}m ({gw.floodAndHydrology.floodProbabilityPct}%)
          </span>
        </div>

        <span className="text-slate-800 hidden lg:inline">|</span>

        <div className="hidden lg:flex items-center gap-4 text-slate-300 tabular-nums">
          <span className="flex items-center gap-1.5">
            <CloudRain className="w-3.5 h-3.5 text-sky-400" />
            {controls.rainfallIntensity} mm/h
          </span>
          <span className="flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-teal-400" />
            {controls.windSpeed.toFixed(1)} m/s
          </span>
        </div>
      </div>

      {/* Zone 3: Bilingual Alert Feed Toggle & System Guide */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleAlertFeed}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono border transition-colors cursor-pointer ${
            alertFeedOpen
              ? 'bg-slate-800 border-sky-500/60 text-white'
              : activeAlertCount > 0
              ? 'bg-red-950/70 border-red-500/60 text-red-200 hover:bg-red-900/60'
              : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:border-slate-500'
          }`}
        >
          {activeAlertCount > 0 ? (
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <Bell className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>GATEWAY ALERTS</span>
          <span className="font-bold tabular-nums">({simState.alerts.length})</span>
        </button>

        <button
          onClick={onOpenHelp}
          aria-label="System Architecture & Simulation Guide"
          className="p-1.5 rounded bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
