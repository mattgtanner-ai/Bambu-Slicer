import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Download,
  Film,
  Flame,
  Gauge,
  Layers,
  Lightbulb,
  Pause,
  Play,
  ScanLine,
  Square,
  Thermometer,
  Trash2,
  Video,
  Wifi,
  CheckCircle2,
  Cloud,
} from 'lucide-react';
import type {
  AmsSlot,
  BambuAccountProfile,
  PlateObject,
  PrintQueueItem,
  PrinterConnectionConfig,
  PrinterTelemetry,
  SpeedProfile,
} from '../types/slicer';
import { formatDuration } from '../utils/slicerEngine';
import { renderChamberTimelapseFrame } from '../utils/timelapseGenerator';
import { ChamberCameraCanvas } from './ChamberCameraCanvas';

interface DeviceMonitorViewProps {
  printerConfig: PrinterConnectionConfig;
  onUpdatePrinterConfig: (cfg: PrinterConnectionConfig) => void;
  telemetry: PrinterTelemetry;
  onUpdateTelemetry: (updater: (prev: PrinterTelemetry) => PrinterTelemetry) => void;
  amsSlots: AmsSlot[];
  onUpdateAmsSlot: (slotId: number, patch: Partial<AmsSlot>) => void;
  activeObjects: PlateObject[];
  onTriggerSimulatedAlert: (type: 'spaghetti' | 'filament_runout' | 'complete') => void;
  account?: BambuAccountProfile;
  onOpenAccountModal?: () => void;
  printQueue?: PrintQueueItem[];
  onStartNextQueueItem?: () => void;
  onRemoveQueueItem?: (id: string) => void;
  onMoveQueueItem?: (id: string, dir: 'up' | 'down') => void;
  onClearCompletedQueue?: () => void;
}

const SPEED_PROFILES: {
  id: SpeedProfile;
  label: string;
  pct: number;
  desc: string;
}[] = [
  { id: 'silent', label: 'Silent', pct: 50, desc: '50% speed · Stealth acoustics' },
  { id: 'standard', label: 'Standard', pct: 100, desc: '100% speed · Nominal profile' },
  { id: 'sport', label: 'Sport', pct: 124, desc: '124% speed · High flow CoreXY' },
  { id: 'ludicrous', label: 'Ludicrous', pct: 166, desc: '166% speed · Max 20,000 mm/s²' },
];

export const DeviceMonitorView: React.FC<DeviceMonitorViewProps> = ({
  printerConfig,
  onUpdatePrinterConfig,
  telemetry,
  onUpdateTelemetry,
  amsSlots,
  onUpdateAmsSlot,
  activeObjects,
  onTriggerSimulatedAlert,
  account,
  onOpenAccountModal,
  printQueue = [],
  onStartNextQueueItem,
  onRemoveQueueItem,
  onMoveQueueItem,
  onClearCompletedQueue,
}) => {
  const [editingConnection, setEditingConnection] = useState(false);
  const [lanIpInput, setLanIpInput] = useState(printerConfig.lanIp);
  const [accessCodeInput, setAccessCodeInput] = useState(printerConfig.accessCode);
  const [serialInput, setSerialInput] = useState(printerConfig.serialNumber);
  const [connError, setConnError] = useState<string | null>(null);

  const [nozzleInput, setNozzleInput] = useState(String(telemetry.nozzleTempTarget));
  const [bedInput, setBedInput] = useState(String(telemetry.bedTempTarget));

  // Interactive Timelapse Replay Preview State
  const [isReplayingTimelapse, setIsReplayingTimelapse] = useState(false);
  const [replayFrame, setReplayFrame] = useState<number>(telemetry.totalLayers || 240);
  const timelapsePreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (telemetry.latestTimelapseVideo) {
      setReplayFrame(telemetry.latestTimelapseVideo.totalFrames);
      setIsReplayingTimelapse(true);
    }
  }, [telemetry.latestTimelapseVideo]);

  useEffect(() => {
    if (!isReplayingTimelapse || !telemetry.latestTimelapseVideo) return;
    const totalF = telemetry.latestTimelapseVideo.totalFrames;
    const timer = window.setInterval(() => {
      setReplayFrame((prev) => (prev >= totalF ? 1 : Math.min(totalF, prev + 8)));
    }, 80);
    return () => window.clearInterval(timer);
  }, [isReplayingTimelapse, telemetry.latestTimelapseVideo]);

  useEffect(() => {
    const canvas = timelapsePreviewCanvasRef.current;
    const videoMeta = telemetry.latestTimelapseVideo;
    if (!canvas || !videoMeta) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const activeSlot =
      amsSlots.find((s) => s.id === telemetry.activeAmsSlot) || amsSlots[0];
    renderChamberTimelapseFrame(
      ctx,
      canvas.width,
      canvas.height,
      replayFrame,
      videoMeta.totalFrames,
      videoMeta.jobName,
      activeSlot ? activeSlot.colorHex : '#10b981',
      videoMeta.captureMode
    );
  }, [replayFrame, telemetry.latestTimelapseVideo, telemetry.activeAmsSlot, amsSlots]);

  const handleDownloadTimelapseWebm = () => {
    const video = telemetry.latestTimelapseVideo;
    if (!video) return;
    let url = video.videoUrl;
    let revokeAfter = false;
    if (!url) {
      const webmHeader = new Uint8Array([
        0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81,
        0x01, 0x42, 0xf2, 0x81, 0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84,
        0x77, 0x65, 0x62, 0x6d, 0x42, 0x87, 0x81, 0x02, 0x42, 0x85, 0x81, 0x02,
      ]);
      const blob = new Blob([webmHeader], { type: 'video/webm' });
      url = URL.createObjectURL(blob);
      revokeAfter = true;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = video.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (revokeAfter) {
      URL.revokeObjectURL(url);
    }
  };

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedIp = lanIpInput.trim();
    const trimmedCode = accessCodeInput.trim();
    const trimmedSerial = serialInput.trim();

    if (!trimmedIp || !/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmedIp)) {
      setConnError('Enter a valid IPv4 address for your Bambu X1 Carbon (e.g. 192.168.1.142).');
      return;
    }
    if (trimmedCode.length < 6) {
      setConnError('Enter the 8-character LAN Access Code from the X1C touchscreen settings.');
      return;
    }
    if (trimmedSerial.length < 8) {
      setConnError('Enter a valid Bambu X1C Serial Number (e.g. 00M09A351800421).');
      return;
    }

    setConnError(null);
    onUpdatePrinterConfig({
      ...printerConfig,
      lanIp: trimmedIp,
      accessCode: trimmedCode,
      serialNumber: trimmedSerial,
      connected: true,
    });
    setEditingConnection(false);
  };

  const applyNozzleTarget = () => {
    const val = Number(nozzleInput);
    if (!Number.isNaN(val) && val >= 0 && val <= 300) {
      onUpdateTelemetry((prev) => ({
        ...prev,
        nozzleTempTarget: Math.round(val),
      }));
    }
  };

  const applyBedTarget = () => {
    const val = Number(bedInput);
    if (!Number.isNaN(val) && val >= 0 && val <= 120) {
      onUpdateTelemetry((prev) => ({
        ...prev,
        bedTempTarget: Math.round(val),
      }));
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#0b0f17] p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Top Printer Identity & Wireless Link Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">
                {printerConfig.printerName}
              </h1>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-mono text-emerald-400">
                {printerConfig.connected ? 'LAN MQTT Connected' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Model: {printerConfig.model} · IP: {printerConfig.lanIp} · SN: {printerConfig.serialNumber} · Nozzle: 0.4mm Hardened Steel
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onOpenAccountModal && (
              <button
                type="button"
                onClick={onOpenAccountModal}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  account?.isLoggedIn
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-600/50 hover:bg-emerald-950/70'
                    : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                {account?.isLoggedIn
                  ? `Bambu Cloud (${account.nickname})`
                  : 'Log In to Bambu Account'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setEditingConnection((prev) => !prev)}
              className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              Configure LAN / Access Code
            </button>

            {telemetry.state === 'PRINTING' ? (
              <button
                type="button"
                onClick={() =>
                  onUpdateTelemetry((prev) => ({
                    ...prev,
                    state: 'PAUSED',
                    substage: 'User Paused Print',
                  }))
                }
                className="px-4 py-2 text-xs font-semibold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Pause className="w-3.5 h-3.5" />
                Pause Print
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  onUpdateTelemetry((prev) => ({
                    ...prev,
                    state: 'PRINTING',
                    substage: 'Printing Outer Wall & Gyroid Infill',
                    spaghettiConfidencePct: 12,
                  }))
                }
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                Resume / Start Job
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                onUpdateTelemetry((prev) => ({
                  ...prev,
                  state: 'IDLE',
                  substage: 'Ready on Textured PEI Plate',
                  progressPct: 0,
                  currentLayer: 0,
                  spaghettiConfidencePct: 0,
                }))
              }
              className="px-3.5 py-2 text-xs font-medium text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Square className="w-3.5 h-3.5" />
              Stop Job
            </button>
          </div>
        </div>

        {/* Collapsible LAN Connection Setup Form */}
        {editingConnection && (
          <form
            onSubmit={handleSaveConnection}
            className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Bambu Lab X1 Carbon Direct Wireless LAN Configuration
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connect directly via local MQTT port 8883 + FTPS 990 using your printer’s LAN-Only Access Code.
                </p>
              </div>
            </div>

            {connError && (
              <div
                role="alert"
                className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-200"
              >
                {connError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="bambu-lan-ip"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Printer LAN IPv4 Address
                </label>
                <input
                  id="bambu-lan-ip"
                  type="text"
                  value={lanIpInput}
                  onChange={(e) => setLanIpInput(e.target.value)}
                  placeholder="192.168.1.142"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="bambu-access-code"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  LAN Access Code (8 digits)
                </label>
                <input
                  id="bambu-access-code"
                  type="text"
                  value={accessCodeInput}
                  onChange={(e) => setAccessCodeInput(e.target.value)}
                  placeholder="38492017"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="bambu-serial-num"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  X1 Carbon Serial Number
                </label>
                <input
                  id="bambu-serial-num"
                  type="text"
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  placeholder="00M09A351800421"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setEditingConnection(false);
                  setConnError(null);
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors"
              >
                Save & Pair X1 Carbon
              </button>
            </div>
          </form>
        )}

        {/* Main 12-Column Split: Left 7 Cols = Integrated Chamber Camera + Job Progress; Right 5 Cols = Thermals, Speed, AMS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left 7 Columns: Live Chamber Camera Feed & Active Print Job Progress */}
          <div className="lg:col-span-7 flex flex-col gap-3.5">
            {/* Chamber Camera Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h2 className="text-sm font-semibold text-slate-100 whitespace-nowrap">
                    Chamber Camera Feed
                  </h2>
                </div>

                {/* Camera Overlays, Timelapse Recording & Enclosure Light Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTelemetry((prev) => ({
                        ...prev,
                        timelapseEnabled: !prev.timelapseEnabled,
                      }))
                    }
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      telemetry.timelapseEnabled
                        ? 'bg-rose-500/15 border-rose-500/50 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    Timelapse Rec: {telemetry.timelapseEnabled ? 'Enabled' : 'Disabled'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTelemetry((prev) => ({
                        ...prev,
                        chamberLightOn: !prev.chamberLightOn,
                      }))
                    }
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      telemetry.chamberLightOn
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    Light: {telemetry.chamberLightOn ? 'On' : 'Off'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTelemetry((prev) => ({
                        ...prev,
                        lidarOverlayOn: !prev.lidarOverlayOn,
                      }))
                    }
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      telemetry.lidarOverlayOn
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    LiDAR Mesh: {telemetry.lidarOverlayOn ? 'Active' : 'Hidden'}
                  </button>
                </div>
              </div>

              {/* Live Video Canvas */}
              <div className="relative h-[265px] w-full bg-slate-950">
                <ChamberCameraCanvas
                  telemetry={telemetry}
                  activeObjects={activeObjects}
                  amsSlots={amsSlots}
                />

                {/* Bottom Measured Scrim with Live Telemetry Overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 flex items-end justify-between">
                  <div>
                    <div className="text-xs font-mono text-emerald-400">
                      STAGE: {telemetry.state} · {telemetry.substage}
                    </div>
                    <div className="text-sm font-semibold text-white mt-0.5">
                      {telemetry.activeJobName}
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-200 tabular-nums">
                    <div>
                      Z-Height: <span className="text-white font-semibold">{telemetry.zHeightMm.toFixed(2)} mm</span>
                    </div>
                    <div>
                      LiDAR First-Layer Score: <span className="text-emerald-400 font-semibold">{Math.round(telemetry.lidarFirstLayerScore * 100)}/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Print Progress & Layer Scrubber Bar */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300 font-mono tabular-nums">
                    <span>
                      Layer {telemetry.currentLayer} / {telemetry.totalLayers}
                    </span>
                    <span>·</span>
                    <span>Elapsed: {formatDuration(telemetry.elapsedSeconds)}</span>
                    <span>·</span>
                    <span>Remaining: {formatDuration(telemetry.remainingSeconds)}</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-emerald-400 tabular-nums">
                    {telemetry.progressPct}%
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${telemetry.progressPct}%` }}
                  />
                </div>

                {/* Interactive Fault & Completion Test Triggers */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400">
                    Test Automated Guardrails:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onTriggerSimulatedAlert('spaghetti')}
                      className="px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      Simulate Spaghetti Fault
                    </button>
                    <button
                      type="button"
                      onClick={() => onTriggerSimulatedAlert('filament_runout')}
                      className="px-2.5 py-1 text-xs font-medium text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      Simulate Filament Runout
                    </button>
                    <button
                      type="button"
                      onClick={() => onTriggerSimulatedAlert('complete')}
                      className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      Complete Print Now
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Automated Chamber Camera Timelapse Video Generator & Player Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Film className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <h2 className="text-sm font-semibold text-slate-100">
                      Automated Chamber Camera Timelapse Studio
                    </h2>
                    <p className="text-xs text-slate-400">
                      {telemetry.timelapseEnabled
                        ? `Recording 1080p keyframes at each Z-layer increment (${
                            telemetry.timelapseMode === 'smooth_park'
                              ? 'Smooth Toolhead Park'
                              : 'Continuous Layer Capture'
                          } · ${telemetry.timelapseFps} FPS)`
                        : 'Timelapse recording is currently disabled for this print job.'}
                    </p>
                  </div>
                </div>

                {telemetry.latestTimelapseVideo ? (
                  <button
                    type="button"
                    onClick={handleDownloadTimelapseWebm}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Timelapse Video (.webm)
                  </button>
                ) : (
                  <span className="text-xs font-mono text-slate-400 tabular-nums">
                    {telemetry.timelapseEnabled
                      ? `Captured: ${telemetry.timelapseFramesCaptured} / ${telemetry.totalLayers} frames`
                      : 'Standby'}
                  </span>
                )}
              </div>

              {telemetry.latestTimelapseVideo && (
                <div className="p-3.5 bg-slate-950 border border-emerald-700/60 rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-bold text-slate-100 font-mono">
                        {telemetry.latestTimelapseVideo.fileName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-slate-300 tabular-nums">
                      <span>{telemetry.latestTimelapseVideo.resolution}</span>
                      <span>·</span>
                      <span>{telemetry.latestTimelapseVideo.fps} FPS</span>
                      <span>·</span>
                      <span>{telemetry.latestTimelapseVideo.totalFrames} Frames</span>
                      <span>·</span>
                      <span>{telemetry.latestTimelapseVideo.durationSeconds}s</span>
                      <span>·</span>
                      <span className="text-emerald-400 font-semibold">
                        {telemetry.latestTimelapseVideo.formattedFileSize}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Timelapse Video Playback Canvas + Scrubber */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-5 rounded-lg overflow-hidden border border-slate-800 bg-black aspect-video">
                      <canvas
                        ref={timelapsePreviewCanvasRef}
                        width={420}
                        height={236}
                        data-testid="timelapse-replay-canvas"
                        className="w-full h-full object-cover block"
                      />
                    </div>

                    <div className="md:col-span-7 space-y-2.5">
                      <div className="text-xs font-medium text-slate-200">
                        Compiled Chamber Timelapse Preview (Layer 1 → {telemetry.latestTimelapseVideo.totalFrames})
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Generated automatically from the X1C 1080p chamber camera feed upon print completion. Use the scrubber below to inspect layer progression or download the encoded <code className="text-emerald-400">.webm</code> video file.
                      </p>

                      <div className="flex items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsReplayingTimelapse((prev) => !prev)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          {isReplayingTimelapse ? (
                            <>
                              <Pause className="w-3 h-3 text-amber-400" />
                              Pause Replay
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 text-emerald-400" />
                              Play Timelapse
                            </>
                          )}
                        </button>

                        <input
                          type="range"
                          aria-label="Scrub Timelapse Video Frame"
                          min={1}
                          max={telemetry.latestTimelapseVideo.totalFrames}
                          value={replayFrame}
                          onChange={(e) => {
                            setIsReplayingTimelapse(false);
                            setReplayFrame(Number(e.target.value));
                          }}
                          className="flex-1 accent-emerald-500"
                        />

                        <span className="text-xs font-mono text-emerald-400 tabular-nums whitespace-nowrap">
                          Frame {replayFrame}/{telemetry.latestTimelapseVideo.totalFrames}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right 5 Columns: Multi-Plate Print Queue, Thermal & Fan Telemetry, Speed Mode, and 4-Slot AMS Rack */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Multi-Plate Sequential Print Queue Card */}
            <div
              data-testid="device-print-queue-panel"
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <h2 className="text-sm font-semibold text-slate-100">
                      Multi-Plate Print Queue ({printQueue.length} {printQueue.length === 1 ? 'Plate' : 'Plates'})
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      {printQueue.length > 0
                        ? `${printQueue.filter((q) => q.status === 'queued').length} waiting · ${
                            printQueue.filter((q) => q.status === 'completed').length
                          } completed`
                        : 'Slice all plates and send to printer to queue sequential multi-plate jobs'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {printQueue.some((q) => q.status === 'queued') && onStartNextQueueItem && (
                    <button
                      type="button"
                      onClick={onStartNextQueueItem}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                    >
                      <Play className="w-3 h-3" />
                      Start Next Plate
                    </button>
                  )}
                  {printQueue.some((q) => q.status === 'completed') && onClearCompletedQueue && (
                    <button
                      type="button"
                      onClick={onClearCompletedQueue}
                      className="px-2 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Clear Done
                    </button>
                  )}
                </div>
              </div>

              {printQueue.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {printQueue.map((item, idx) => {
                    const isPrinting = item.status === 'printing';
                    const isCompleted = item.status === 'completed';
                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs ${
                          isPrinting
                            ? 'bg-emerald-950/25 border-emerald-500/70'
                            : isCompleted
                            ? 'bg-slate-950/60 border-slate-800/70 opacity-75'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded shrink-0 ${
                              isPrinting
                                ? 'bg-emerald-500 text-slate-950'
                                : isCompleted
                                ? 'bg-slate-800 text-emerald-400'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            #{idx + 1}{' '}
                            {isPrinting
                              ? 'PRINTING'
                              : isCompleted
                              ? 'DONE'
                              : 'QUEUED'}
                          </span>
                          <div className="truncate">
                            <div className="font-semibold text-slate-100 truncate">
                              {item.plateName} · {item.jobName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                              {item.formattedTime} · {item.filamentGrams}g · {item.totalLayers} Layers
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {item.status === 'queued' && onMoveQueueItem && (
                            <>
                              <button
                                type="button"
                                aria-label={`Move ${item.plateName} up in queue`}
                                onClick={() => onMoveQueueItem(item.id, 'up')}
                                className="p-1 text-slate-400 hover:text-slate-100 rounded"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Move ${item.plateName} down in queue`}
                                onClick={() => onMoveQueueItem(item.id, 'down')}
                                className="p-1 text-slate-400 hover:text-slate-100 rounded"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {onRemoveQueueItem && !isPrinting && (
                            <button
                              type="button"
                              aria-label={`Remove ${item.plateName} from queue`}
                              onClick={() => onRemoveQueueItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-400 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 font-mono">
                  No multi-plate queue active. Add 2–9 plates in Prepare, click &ldquo;Slice All Plates&rdquo;, and send to create an ordered print queue.
                </div>
              )}
            </div>

            {/* Thermal & Cooling Telemetry Control Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-emerald-400" />
                  Thermal & Chamber Cooling Control
                </h2>
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  Chamber: {telemetry.chamberTempActual}°C
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Hardened Steel Nozzle Temperature */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Nozzle (300°C Max)</span>
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div className="text-base font-mono font-bold text-slate-100 tabular-nums">
                    {telemetry.nozzleTempActual}°C{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {telemetry.nozzleTempTarget}°C
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <input
                      type="number"
                      aria-label="Target Nozzle Temperature"
                      min={0}
                      max={300}
                      value={nozzleInput}
                      onChange={(e) => setNozzleInput(e.target.value)}
                      className="w-20 px-2 py-1 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={applyNozzleTarget}
                      className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
                    >
                      Set °C
                    </button>
                  </div>
                </div>

                {/* Textured PEI Build Plate Temperature */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Textured PEI Bed</span>
                    <Thermometer className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div className="text-base font-mono font-bold text-slate-100 tabular-nums">
                    {telemetry.bedTempActual}°C{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {telemetry.bedTempTarget}°C
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <input
                      type="number"
                      aria-label="Target Bed Temperature"
                      min={0}
                      max={120}
                      value={bedInput}
                      onChange={(e) => setBedInput(e.target.value)}
                      className="w-20 px-2 py-1 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={applyBedTarget}
                      className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
                    >
                      Set °C
                    </button>
                  </div>
                </div>
              </div>

              {/* 3 Cooling Fans Sliders */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Part Fan</span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      {telemetry.partFanPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Part Cooling Fan Percentage"
                    min={0}
                    max={100}
                    step={10}
                    value={telemetry.partFanPct}
                    onChange={(e) =>
                      onUpdateTelemetry((prev) => ({
                        ...prev,
                        partFanPct: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Aux Fan</span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      {telemetry.auxFanPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Auxiliary Part Fan Percentage"
                    min={0}
                    max={100}
                    step={10}
                    value={telemetry.auxFanPct}
                    onChange={(e) =>
                      onUpdateTelemetry((prev) => ({
                        ...prev,
                        auxFanPct: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Chamber</span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      {telemetry.chamberFanPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Chamber Exhaust Fan Percentage"
                    min={0}
                    max={100}
                    step={10}
                    value={telemetry.chamberFanPct}
                    onChange={(e) =>
                      onUpdateTelemetry((prev) => ({
                        ...prev,
                        chamberFanPct: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* CoreXY Speed Mode Selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  Bambu CoreXY Speed Mode
                </h2>
                <span className="text-xs font-mono text-emerald-400 tabular-nums">
                  {telemetry.speedMultiplierPct}% Feedrate
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SPEED_PROFILES.map((sp) => {
                  const active = telemetry.speedProfile === sp.id;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() =>
                        onUpdateTelemetry((prev) => ({
                          ...prev,
                          speedProfile: sp.id,
                          speedMultiplierPct: sp.pct,
                        }))
                      }
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        active
                          ? 'bg-emerald-500/15 border-emerald-500 text-slate-100'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-semibold">{sp.label}</div>
                      <div className="text-[11px] font-mono text-emerald-400 tabular-nums">
                        {sp.pct}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bambu 4-Slot AMS (Automatic Material System) Rack */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">
                    AMS (Automatic Material System) · 4 Slots
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 tabular-nums">
                    Internal Hygrometer: Index {telemetry.amsHumidityIndex}/5 · {telemetry.amsTempC}°C
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {amsSlots.map((slot) => {
                  const isFeeding = telemetry.activeAmsSlot === slot.id;
                  return (
                    <div
                      key={slot.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isFeeding
                          ? 'bg-slate-950 border-emerald-500/70'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-sm border border-white/20 shrink-0"
                            style={{ backgroundColor: slot.colorHex }}
                          />
                          <span className="text-xs font-bold text-slate-100 font-mono">
                            Slot A{slot.id}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTelemetry((prev) => ({
                              ...prev,
                              activeAmsSlot: slot.id,
                            }))
                          }
                          className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                            isFeeding
                              ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {isFeeding ? 'Active Feed' : 'Load Spool'}
                        </button>
                      </div>

                      <div className="mt-2 text-xs font-medium text-slate-200">
                        {slot.material} · {slot.colorName}
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                        <span>K={slot.kFactor.toFixed(3)}</span>
                        <span
                          className={
                            slot.remainingPct <= 10 ? 'text-rose-400 font-semibold' : 'text-slate-300'
                          }
                        >
                          {slot.remainingPct}% Spool
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1.5">
                        <div
                          className={`h-full ${
                            slot.remainingPct <= 10 ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${slot.remainingPct}%` }}
                        />
                      </div>

                      {slot.remainingPct <= 15 && (
                        <button
                          type="button"
                          onClick={() => onUpdateAmsSlot(slot.id, { remainingPct: 100 })}
                          className="mt-2 w-full py-1 text-[11px] font-medium text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/50 rounded transition-colors"
                        >
                          Refill Spool A{slot.id} (100%)
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
