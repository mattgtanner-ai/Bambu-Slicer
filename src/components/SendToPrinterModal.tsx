import React, { useEffect, useState } from 'react';
import { Cloud, Film, Layers, Send, Video, Wifi, X } from 'lucide-react';
import type {
  AmsSlot,
  BambuAccountProfile,
  BuildPlate,
  MultiPlateSliceResult,
  PrintJobDispatchOptions,
  PrinterConnectionConfig,
  SliceResult,
  TimelapseCaptureMode,
} from '../types/slicer';

interface SendToPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  sliceResult: SliceResult;
  multiPlateSliceResult?: MultiPlateSliceResult;
  sliceAllMode?: boolean;
  printerConfig: PrinterConnectionConfig;
  amsSlots: AmsSlot[];
  account: BambuAccountProfile;
  onOpenAccountModal: () => void;
  plates: BuildPlate[];
  activePlateId: number;
  initialTimelapseEnabled?: boolean;
  initialTimelapseMode?: TimelapseCaptureMode;
  initialTimelapseFps?: 30 | 60;
  onToggleTimelapseImmediate?: (
    enabled: boolean,
    mode: TimelapseCaptureMode,
    fps: 30 | 60
  ) => void;
  onConfirmSendPrint: (options: PrintJobDispatchOptions) => void;
}

export const SendToPrinterModal: React.FC<SendToPrinterModalProps> = ({
  isOpen,
  onClose,
  sliceResult,
  multiPlateSliceResult,
  sliceAllMode = false,
  printerConfig,
  amsSlots,
  account,
  onOpenAccountModal,
  plates,
  activePlateId,
  initialTimelapseEnabled = true,
  initialTimelapseMode = 'smooth_park',
  initialTimelapseFps = 30,
  onToggleTimelapseImmediate,
  onConfirmSendPrint,
}) => {
  const [dispatchMode, setDispatchMode] = useState<'bambu_cloud' | 'lan_mqtt'>(
    account.isLoggedIn && account.cloudPrintEnabled ? 'bambu_cloud' : 'lan_mqtt'
  );
  const [selectedDevId, setSelectedDevId] = useState<string>(
    account.selectedPrinterDevId || printerConfig.serialNumber
  );
  const [selectedPlateId, setSelectedPlateId] = useState<number | 'all'>(
    sliceAllMode && plates.length > 1 ? 'all' : activePlateId
  );

  const [bedLeveling, setBedLeveling] = useState(true);
  const [flowDynamicsLidar, setFlowDynamicsLidar] = useState(true);
  const [firstLayerInspection, setFirstLayerInspection] = useState(true);
  const [timelapseRecording, setTimelapseRecording] = useState(
    initialTimelapseEnabled
  );
  const [timelapseMode, setTimelapseMode] =
    useState<TimelapseCaptureMode>(initialTimelapseMode);
  const [timelapseFps, setTimelapseFps] = useState<30 | 60>(
    initialTimelapseFps
  );

  useEffect(() => {
    if (sliceAllMode && plates.length > 1) {
      setSelectedPlateId('all');
    } else {
      setSelectedPlateId(activePlateId);
    }
  }, [activePlateId, sliceAllMode, plates.length, isOpen]);

  useEffect(() => {
    if (account.isLoggedIn && account.cloudPrintEnabled) {
      setDispatchMode('bambu_cloud');
      if (account.selectedPrinterDevId) {
        setSelectedDevId(account.selectedPrinterDevId);
      }
    }
  }, [account.isLoggedIn, account.cloudPrintEnabled, account.selectedPrinterDevId]);

  useEffect(() => {
    setTimelapseRecording(initialTimelapseEnabled);
  }, [initialTimelapseEnabled]);

  if (!isOpen) return null;

  const isAllPlatesSelected =
    selectedPlateId === 'all' && plates.length > 1 && Boolean(multiPlateSliceResult);
  const activeSummary =
    typeof selectedPlateId === 'number' && multiPlateSliceResult
      ? multiPlateSliceResult.plates.find((s) => s.plateId === selectedPlateId)?.sliceResult ||
        sliceResult
      : sliceResult;

  const displayedFormattedTime =
    isAllPlatesSelected && multiPlateSliceResult
      ? multiPlateSliceResult.formattedTotalTime
      : activeSummary.formattedTime;
  const displayedGrams =
    isAllPlatesSelected && multiPlateSliceResult
      ? multiPlateSliceResult.totalFilamentGrams
      : activeSummary.totalFilamentGrams;
  const displayedMeters =
    isAllPlatesSelected && multiPlateSliceResult
      ? multiPlateSliceResult.totalFilamentMeters
      : activeSummary.totalFilamentMeters;
  const displayedLayers =
    isAllPlatesSelected && multiPlateSliceResult
      ? multiPlateSliceResult.totalLayersAcrossPlates
      : activeSummary.totalLayers;

  const handleToggleTimelapse = (checked: boolean) => {
    setTimelapseRecording(checked);
    onToggleTimelapseImmediate?.(checked, timelapseMode, timelapseFps);
  };

  const handleModeChange = (mode: TimelapseCaptureMode) => {
    setTimelapseMode(mode);
    onToggleTimelapseImmediate?.(timelapseRecording, mode, timelapseFps);
  };

  const handleFpsChange = (fps: 30 | 60) => {
    setTimelapseFps(fps);
    onToggleTimelapseImmediate?.(timelapseRecording, timelapseMode, fps);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-print-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2
              id="send-print-modal-title"
              className="text-base font-bold text-slate-100"
            >
              {isAllPlatesSelected
                ? `Dispatch Multi-Plate Print Queue to ${printerConfig.printerName}`
                : `Send Sliced Job to ${printerConfig.printerName}`}
            </h2>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Wireless LAN Direct · {printerConfig.lanIp} · {printerConfig.model}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Send Print Dialog"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Plate Selector */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Target Build Plate ({plates.length} Total)
                </div>
                <div className="text-[11px] text-slate-400">
                  {plates.length > 1
                    ? 'Send a single plate or queue all sliced plates sequentially'
                    : 'Choose which plate toolpath to send to the printer'}
                </div>
              </div>
              <select
                aria-label="Select Target Build Plate"
                value={String(selectedPlateId)}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedPlateId(val === 'all' ? 'all' : Number(val));
                }}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100"
              >
                {plates.length > 1 && (
                  <option value="all">
                    All Plates — Create Print Queue ({plates.length} Plates)
                  </option>
                )}
                {plates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.id === activePlateId ? '(Active Viewport)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Ordered Print Queue Preview when All Plates is selected */}
            {isAllPlatesSelected && multiPlateSliceResult && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Sequential Multi-Plate Print Queue ({multiPlateSliceResult.plates.length} Jobs)
                  </span>
                  <span className="font-mono text-slate-400">
                    Plate 1 starts immediately · {multiPlateSliceResult.plates.length - 1} queued
                  </span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {multiPlateSliceResult.plates.map((ps, idx) => (
                    <div
                      key={ps.plateId}
                      className="px-2.5 py-1.5 bg-slate-900/90 border border-slate-800 rounded flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${
                            idx === 0
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          #{idx + 1} {idx === 0 ? 'PRINTING' : 'QUEUED'}
                        </span>
                        <span className="text-slate-100 font-sans font-medium truncate">
                          {ps.plateName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                        {ps.sliceResult.formattedTime} · {ps.sliceResult.totalFilamentGrams}g · {ps.sliceResult.totalLayers}L
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Wireless Dispatch Mode: Bambu Cloud vs LAN Direct */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-emerald-400" />
                Wireless Print Connection
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                {dispatchMode === 'bambu_cloud' ? 'Bambu Cloud MQTT' : 'Local LAN Port 8883'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDispatchMode('bambu_cloud')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  dispatchMode === 'bambu_cloud'
                    ? 'bg-emerald-950/30 border-emerald-500/80 text-emerald-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  Bambu Cloud Wireless
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Send via Bambu Studio Cloud account
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDispatchMode('lan_mqtt')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  dispatchMode === 'lan_mqtt'
                    ? 'bg-emerald-950/30 border-emerald-500/80 text-emerald-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-slate-300" />
                  Direct LAN Mode
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Direct local subnet {printerConfig.lanIp}
                </div>
              </button>
            </div>

            {/* Cloud Mode Account Status */}
            {dispatchMode === 'bambu_cloud' && (
              <div className="pt-2 border-t border-slate-800/80">
                {account.isLoggedIn ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="text-slate-300">
                        Logged in as <span className="font-bold text-emerald-400">{account.accountEmail}</span>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenAccountModal}
                        className="text-[11px] text-emerald-400 hover:underline"
                      >
                        Switch Account / Printers
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-400 whitespace-nowrap">
                        Target Cloud Printer:
                      </label>
                      <select
                        aria-label="Target Cloud Printer"
                        value={selectedDevId}
                        onChange={(e) => setSelectedDevId(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-100"
                      >
                        {account.boundPrinters.map((p) => (
                          <option key={p.devId} value={p.devId}>
                            {p.name} ({p.devId}) · {p.online ? 'Online' : 'Offline'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg flex items-center justify-between gap-3">
                    <div className="text-xs text-amber-200">
                      You are not logged in to your Bambu Studio account. Log in to enable wireless cloud printing.
                    </div>
                    <button
                      type="button"
                      onClick={onOpenAccountModal}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shrink-0 whitespace-nowrap"
                    >
                      Log In to Bambu
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Job Summary Metrics */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg text-center font-mono tabular-nums">
            <div>
              <div className="text-[11px] text-slate-400">
                {isAllPlatesSelected ? 'Total Queue Time' : 'Est. Print Time'}
              </div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                {displayedFormattedTime}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Total Filament</div>
              <div className="text-sm font-bold text-slate-100 mt-0.5">
                {displayedGrams}g ({displayedMeters}m)
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Total Layers</div>
              <div className="text-sm font-bold text-slate-100 mt-0.5">
                {displayedLayers} Layers
              </div>
            </div>
          </div>

          {/* AMS Spool Mapping Verification */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-200">
              AMS Filament Slot Mapping
            </div>
            <div className="grid grid-cols-2 gap-2">
              {sliceResult.filamentBySlot.map((used) => {
                const slot =
                  amsSlots.find((s) => s.id === used.slotId) || amsSlots[0];
                return (
                  <div
                    key={used.slotId}
                    className="p-2 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-white/20"
                        style={{ backgroundColor: used.colorHex }}
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-100">
                          AMS Slot A{used.slotId}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {slot?.material} ({used.grams}g)
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400">
                      Ready
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bambu X1 Carbon Pre-Print Calibration & LiDAR Options */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-200">
              Bambu X1 Carbon Pre-Flight &amp; Dispatch Options
            </div>

            <label className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
              <div>
                <div className="text-xs font-medium text-slate-100">
                  Auto Bed Leveling (Eddy Current + Dual-Laser)
                </div>
                <div className="text-[11px] text-slate-400">
                  Probes 36-point mesh across Textured PEI Plate before printing
                </div>
              </div>
              <input
                type="checkbox"
                checked={bedLeveling}
                onChange={(e) => setBedLeveling(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
              <div>
                <div className="text-xs font-medium text-slate-100">
                  Micro-LiDAR Flow Dynamics Calibration
                </div>
                <div className="text-[11px] text-slate-400">
                  Extrudes calibration lines and scans K-factor with 7μm LiDAR
                </div>
              </div>
              <input
                type="checkbox"
                checked={flowDynamicsLidar}
                onChange={(e) => setFlowDynamicsLidar(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
              <div>
                <div className="text-xs font-medium text-slate-100">
                  First-Layer LiDAR &amp; AI Spaghetti Inspection
                </div>
                <div className="text-[11px] text-slate-400">
                  Automatically pauses print &amp; sends alert if adhesion fails
                </div>
              </div>
              <input
                type="checkbox"
                checked={firstLayerInspection}
                onChange={(e) => setFirstLayerInspection(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
            </label>

            {/* Automated Chamber Camera Timelapse Toggle & Encoder Settings */}
            <div
              className={`p-3 rounded-lg border transition-colors space-y-2.5 ${
                timelapseRecording
                  ? 'bg-emerald-950/20 border-emerald-500/60'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Video
                    className={`w-4 h-4 shrink-0 ${
                      timelapseRecording ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-100">
                      Automated Chamber Camera Timelapse Recording
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Captures 1080p chamber feed at each Z-layer increment and compiles a downloadable .webm video upon completion
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  aria-label="Enable Automated Chamber Camera Timelapse Recording"
                  checked={timelapseRecording}
                  onChange={(e) => handleToggleTimelapse(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 shrink-0 ml-3"
                />
              </label>

              {timelapseRecording && (
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="dispatch-timelapse-mode"
                      className="block text-[11px] text-slate-400 mb-1"
                    >
                      Timelapse Capture Mode
                    </label>
                    <select
                      id="dispatch-timelapse-mode"
                      value={timelapseMode}
                      onChange={(e) =>
                        handleModeChange(e.target.value as TimelapseCaptureMode)
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="smooth_park">
                        Smooth (Park Toolhead per Layer)
                      </option>
                      <option value="continuous_layer">
                        Traditional (No Toolhead Park)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="dispatch-timelapse-fps"
                      className="block text-[11px] text-slate-400 mb-1"
                    >
                      Video Output Frame Rate
                    </label>
                    <select
                      id="dispatch-timelapse-fps"
                      value={timelapseFps}
                      onChange={(e) =>
                        handleFpsChange(Number(e.target.value) as 30 | 60)
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value={30}>1080p · 30 FPS (.webm)</option>
                      <option value={60}>1080p · 60 FPS (.webm)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Timelapse:{' '}
              {timelapseRecording
                ? `Enabled (${displayedLayers} frames @ ${timelapseFps}fps)`
                : 'Disabled'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={dispatchMode === 'bambu_cloud' && !account.isLoggedIn}
              onClick={() => {
                if (isAllPlatesSelected) {
                  onConfirmSendPrint({
                    dispatchMode,
                    targetPrinterDevId: selectedDevId,
                    targetPlateId: 'all',
                    targetPlateName: `All Plates (${plates.length} Queued)`,
                    queueAllPlates: true,
                    bedLeveling,
                    flowDynamicsLidar,
                    firstLayerInspection,
                    timelapseRecording,
                    timelapseMode,
                    timelapseFps,
                    amsMapping: { 1: 1, 2: 2, 3: 3, 4: 4 },
                  });
                  return;
                }
                const targetPlate = plates.find((p) => p.id === selectedPlateId);
                onConfirmSendPrint({
                  dispatchMode,
                  targetPrinterDevId: selectedDevId,
                  targetPlateId: selectedPlateId,
                  targetPlateName: targetPlate?.name || `Plate ${selectedPlateId}`,
                  queueAllPlates: false,
                  bedLeveling,
                  flowDynamicsLidar,
                  firstLayerInspection,
                  timelapseRecording,
                  timelapseMode,
                  timelapseFps,
                  amsMapping: { 1: 1, 2: 2, 3: 3, 4: 4 },
                });
              }}
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              {isAllPlatesSelected
                ? dispatchMode === 'bambu_cloud'
                  ? `Queue All ${plates.length} Plates via Bambu Cloud`
                  : `Queue All ${plates.length} Plates via LAN Mode`
                : dispatchMode === 'bambu_cloud'
                ? `Send Plate ${selectedPlateId} via Bambu Cloud`
                : `Send Plate ${selectedPlateId} via LAN Mode`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

