/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  HelpCircle,
  Radio,
  ShieldCheck,
  X,
} from 'lucide-react';
import { BottomCommandDock } from './components/BottomCommandDock';
import { DigitalTwinViewport } from './components/DigitalTwinViewport';
import { InspectorDrawer } from './components/InspectorDrawer';
import { TopStatusBar } from './components/TopStatusBar';
import {
  createInitialSimulationState,
  stepSimulation,
} from './simulation/engine';
import type {
  CameraPresetId,
  ScenarioId,
  SelectedInspectable,
  SimulationControls,
  SimulationState,
} from './simulation/types';

const DEFAULT_CONTROLS: SimulationControls = {
  isRunning: true,
  fireAndSmokeActive: false,
  smokeIntensity: 0,
  rainfallIntensity: 0,
  blockageSeverity: 0,
  windDirection: 288,
  windSpeed: 4.4,
  timeOfDay: 14.5,
  showGatewayScan: true,
  showVirtualHeatmap: false,
  flyoverActive: false,
};

export default function App() {
  const [controls, setControls] = useState<SimulationControls>(DEFAULT_CONTROLS);
  const [simState, setSimState] = useState<SimulationState>(() =>
    createInitialSimulationState()
  );
  const [activeCameraPreset, setActiveCameraPreset] =
    useState<CameraPresetId>('aerial');
  const [selectedInspectable, setSelectedInspectable] =
    useState<SelectedInspectable>({ type: 'gateway' });
  const [alertFeedOpen, setAlertFeedOpen] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  const activeScenarioRef = useRef<ScenarioId>('none');

  const handleStepSimulation = useCallback((dt: number) => {
    setControls((currentControls) => {
      setSimState((prevSim) =>
        stepSimulation(prevSim, currentControls, dt, activeScenarioRef.current)
      );
      return currentControls;
    });
  }, []);

  const handleUpdateControls = useCallback(
    (patch: Partial<SimulationControls>) => {
      setControls((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const handleTriggerScenario = useCallback((scenario: ScenarioId) => {
    activeScenarioRef.current = scenario;
    if (scenario === 'fire_smoke') {
      setControls({
        isRunning: true,
        fireAndSmokeActive: true,
        smokeIntensity: 88,
        rainfallIntensity: 0,
        blockageSeverity: 0,
        windDirection: 288,
        windSpeed: 5.8,
        timeOfDay: 15.25,
        showGatewayScan: true,
        showVirtualHeatmap: true,
        flyoverActive: false,
      });
      setActiveCameraPreset('industrial');
      setSelectedInspectable({ type: 'gateway' });
      setAlertFeedOpen(true);
    } else if (scenario === 'flood') {
      setControls({
        isRunning: true,
        fireAndSmokeActive: false,
        smokeIntensity: 0,
        rainfallIntensity: 108,
        blockageSeverity: 82,
        windDirection: 255,
        windSpeed: 6.8,
        timeOfDay: 16.0,
        showGatewayScan: true,
        showVirtualHeatmap: false,
        flyoverActive: false,
      });
      setActiveCameraPreset('flood');
      setSelectedInspectable({ type: 'gateway' });
      setAlertFeedOpen(true);
    } else if (scenario === 'combined') {
      setControls({
        isRunning: true,
        fireAndSmokeActive: true,
        smokeIntensity: 94,
        rainfallIntensity: 115,
        blockageSeverity: 88,
        windDirection: 285,
        windSpeed: 7.4,
        timeOfDay: 16.5,
        showGatewayScan: true,
        showVirtualHeatmap: true,
        flyoverActive: false,
      });
      setActiveCameraPreset('gateway');
      setSelectedInspectable({ type: 'gateway' });
      setAlertFeedOpen(true);
    } else {
      setControls(DEFAULT_CONTROLS);
      setSimState(createInitialSimulationState());
      setActiveCameraPreset('aerial');
      setSelectedInspectable({ type: 'gateway' });
      setAlertFeedOpen(false);
    }
  }, []);

  const handleInspectGateway = useCallback(() => {
    setSelectedInspectable({ type: 'gateway' });
    setActiveCameraPreset('gateway');
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#080c14] select-none">
      {/* 100vw x 100vh Photorealistic 3D Digital Twin Viewport */}
      <DigitalTwinViewport
        controls={controls}
        simState={simState}
        activeCameraPreset={activeCameraPreset}
        selectedInspectable={selectedInspectable}
        onSelectInspectable={setSelectedInspectable}
        onStepSimulation={handleStepSimulation}
      />

      {/* Pointer-Events-None HUD Overlay Layer */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between z-20">
        {/* Top 3-Zone Bar */}
        <TopStatusBar
          simState={simState}
          controls={controls}
          alertFeedOpen={alertFeedOpen}
          onToggleAlertFeed={() => setAlertFeedOpen((prev) => !prev)}
          onOpenHelp={() => setHelpOpen(true)}
          onInspectGateway={handleInspectGateway}
        />

        {/* Middle Floating Drawers (Left: Gateway Alert Feed, Right: Gateway / Building Inspector) */}
        <div className="flex-1 flex items-start justify-between px-4 py-3 overflow-hidden">
          {/* Left Floating Bilingual Alert Feed (Routed via GW-01) */}
          <div className="flex flex-col gap-2">
            {alertFeedOpen && (
              <aside className="pointer-events-auto w-96 bg-[#080c14]/96 border border-slate-700/85 rounded-md shadow-2xl text-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-14rem)]">
                <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                      GW-01 CENTRAL ALERT DISPATCH ({simState.alerts.length})
                    </span>
                  </div>
                  <button
                    onClick={() => setAlertFeedOpen(false)}
                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 space-y-2.5 overflow-y-auto text-xs">
                  {simState.alerts.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 font-mono space-y-1">
                      <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                      <div className="text-slate-200 font-semibold">
                        ALL ENVIRONMENTAL SYSTEMS NOMINAL
                      </div>
                      <div className="text-[11px]">
                        GW-01 Central Gateway reports zero active fire, smoke,
                        air-quality, or flood hazards.
                      </div>
                    </div>
                  ) : (
                    simState.alerts.map((alert) => {
                      const isCrit = alert.priority === 'CRITICAL';
                      return (
                        <div
                          key={alert.id}
                          className={`p-3 rounded border space-y-1.5 ${
                            isCrit
                              ? 'bg-red-950/75 border-red-500/70 text-red-100'
                              : 'bg-amber-950/70 border-amber-500/60 text-amber-100'
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider">
                            <span className="flex items-center gap-1.5 font-bold">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              {alert.priority} · {alert.location}
                            </span>
                            <span>{alert.timestamp}</span>
                          </div>
                          <div className="font-semibold text-white text-xs">
                            {alert.eventType}
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-200">
                            {alert.englishPreview}
                          </p>
                          <p className="text-[11px] leading-relaxed text-amber-200/95 border-t border-white/10 pt-1.5">
                            {alert.tamilPreview}
                          </p>
                          <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-300">
                            <span>ROUTED VIA: {alert.routedVia}</span>
                            <span>CONFIDENCE: {alert.confidencePct}%</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </aside>
            )}
          </div>

          {/* Right Floating Inspector Drawer (GW-01 Central Gateway or Clicked Building) */}
          <InspectorDrawer
            selected={selectedInspectable}
            simState={simState}
            onClose={() => setSelectedInspectable(null)}
          />
        </div>

        {/* Bottom Command & Telemetry Dock */}
        <BottomCommandDock
          controls={controls}
          simState={simState}
          activeCameraPreset={activeCameraPreset}
          onUpdateControls={handleUpdateControls}
          onSelectCameraPreset={setActiveCameraPreset}
          onTriggerScenario={handleTriggerScenario}
          onInspectGateway={handleInspectGateway}
        />
      </div>

      {/* Architecture & Simulation Guide Modal */}
      {helpOpen && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#080c14] border border-slate-700 rounded-md shadow-2xl text-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                  PRITHVI-NET · CENTRAL GATEWAY ARCHITECTURE GUIDE
                </h2>
              </div>
              <button
                onClick={() => setHelpOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs leading-relaxed text-slate-300">
              <div className="p-3 rounded bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="font-mono font-bold text-sky-400 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" /> SINGLE CENTRAL GATEWAY HUB (GW-01)
                </div>
                <p>
                  All environmental monitoring, safety telemetry, and bilingual
                  (English / Tamil) emergency alerts are unified and routed
                  through the single central command tower{' '}
                  <strong className="text-white">GW-01</strong> located at the
                  heart of the Ettimadai industrial-residential corridor.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-mono font-bold text-white uppercase">
                  INTEGRATED SAFETY SUBSYSTEMS:
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>
                    <strong className="text-orange-300">
                      Fire, Combustion & Smoke Detection:
                    </strong>{' '}
                    360° optical lidar and infrared thermal imaging monitor stack
                    combustion temperature (°C), IR radiant power (kW), CO (ppm),
                    and optical smoke density (%).
                  </li>
                  <li>
                    <strong className="text-amber-300">
                      Smoke-Coupled Air Quality Monitoring:
                    </strong>{' '}
                    Continuous-flow laser nephelometer & NDIR gas analyzers
                    compute real-time AQI, PM2.5, PM10, CO₂, TVOC, and NO₂ that
                    dynamically respond to smoke levels and wind dispersion.
                  </li>
                  <li>
                    <strong className="text-sky-300">
                      Flood & Hydrology Radar:
                    </strong>{' '}
                    Phased-array hydrology radar tracks stormwater canal water
                    level (m), Culvert C2 backwater surge, and flood overflow
                    probability (%).
                  </li>
                </ul>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setHelpOpen(false)}
                  className="px-4 py-1.5 rounded bg-sky-500 text-slate-950 font-mono font-bold text-xs hover:bg-sky-400 transition-colors cursor-pointer"
                >
                  EXPLORE 3D DIGITAL TWIN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
