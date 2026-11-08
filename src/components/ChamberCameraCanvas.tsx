import React, { useEffect, useRef } from 'react';
import type { AmsSlot, PlateObject, PrinterTelemetry } from '../types/slicer';

interface ChamberCameraCanvasProps {
  telemetry: PrinterTelemetry;
  activeObjects: PlateObject[];
  amsSlots: AmsSlot[];
  compact?: boolean;
}

export const ChamberCameraCanvas: React.FC<ChamberCameraCanvasProps> = ({
  telemetry,
  activeObjects,
  amsSlots,
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;
  const objectsRef = useRef(activeObjects);
  objectsRef.current = activeObjects;
  const amsRef = useRef(amsSlots);
  amsRef.current = amsSlots;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tickCount = 0;

    const drawFrame = () => {
      tickCount++;
      const t = telemetryRef.current;
      const objs = objectsRef.current;
      const slots = amsRef.current;
      const w = canvas.width;
      const h = canvas.height;

      const lightOn = t.chamberLightOn;
      // 1. Enclosure background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      if (lightOn) {
        bgGrad.addColorStop(0, '#1e293b');
        bgGrad.addColorStop(0.55, '#0f172a');
        bgGrad.addColorStop(1, '#090d16');
      } else {
        bgGrad.addColorStop(0, '#070a10');
        bgGrad.addColorStop(1, '#030508');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Top LED bar glow when chamber light is active
      if (lightOn) {
        const ledGrad = ctx.createLinearGradient(0, 0, 0, h * 0.25);
        ledGrad.addColorStop(0, 'rgba(248, 250, 252, 0.22)');
        ledGrad.addColorStop(1, 'rgba(248, 250, 252, 0)');
        ctx.fillStyle = ledGrad;
        ctx.fillRect(0, 0, w, h * 0.25);
      }

      // 2. Enclosure perspective lines & Aux fan housing on left wall
      ctx.strokeStyle = lightOn ? 'rgba(71, 85, 105, 0.45)' : 'rgba(30, 41, 59, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.14, 0);
      ctx.lineTo(w * 0.22, h * 0.68);
      ctx.moveTo(w * 0.86, 0);
      ctx.lineTo(w * 0.78, h * 0.68);
      ctx.stroke();

      // 3. Perspective Textured PEI Build Plate trapeze
      const plateTopY = h * 0.64;
      const plateBotY = h * 0.90;
      ctx.fillStyle = lightOn ? '#1f242d' : '#11141a';
      ctx.beginPath();
      ctx.moveTo(w * 0.22, plateTopY);
      ctx.lineTo(w * 0.78, plateTopY);
      ctx.lineTo(w * 0.92, plateBotY);
      ctx.lineTo(w * 0.08, plateBotY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = lightOn ? 'rgba(16, 185, 129, 0.45)' : 'rgba(16, 185, 129, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Perspective build plate grid lines
      ctx.strokeStyle = lightOn ? 'rgba(148, 163, 184, 0.14)' : 'rgba(71, 85, 105, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        const frac = i / 8;
        const topX = w * (0.22 + frac * 0.56);
        const botX = w * (0.08 + frac * 0.84);
        ctx.beginPath();
        ctx.moveTo(topX, plateTopY);
        ctx.lineTo(botX, plateBotY);
        ctx.stroke();
      }

      // 4. Printed 3D model progress on plate
      const activeSlot = slots.find((s) => s.id === t.activeAmsSlot) || slots[0];
      const filamentColor = activeSlot ? activeSlot.colorHex : '#10b981';

      const progressFrac = Math.max(0.08, t.progressPct / 100);
      const maxModelPixH = h * 0.34;
      const currentModelPixH = maxModelPixH * progressFrac;
      const baseCenterY = (plateTopY + plateBotY) * 0.52;
      const modelWidth = w * 0.24;

      // Shadow on PEI bed
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, baseCenterY + 6, modelWidth * 0.58, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Extruded layers stack
      const layerStripes = Math.max(4, Math.floor(currentModelPixH / 3));
      for (let i = 0; i < layerStripes; i++) {
        const ly = baseCenterY - i * 3;
        const taper = 1 - Math.sin((i / 40) * Math.PI) * 0.12;
        const lw = modelWidth * taper;
        ctx.fillStyle = i % 2 === 0 ? filamentColor : '#334155';
        ctx.fillRect(w * 0.5 - lw / 2, ly - 3, lw, 3.2);
      }

      // Highlight top active layer
      const topLayerY = baseCenterY - currentModelPixH;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.5 - modelWidth * 0.45, topLayerY, modelWidth * 0.9, 3);

      // 5. Micro-LiDAR laser mesh overlay (when enabled)
      if (t.lidarOverlayOn) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
        ctx.lineWidth = 1;
        for (let lx = w * 0.32; lx <= w * 0.68; lx += 16) {
          ctx.beginPath();
          ctx.moveTo(lx, topLayerY - 12);
          ctx.lineTo(lx - 6, baseCenterY + 8);
          ctx.stroke();
        }
        // LiDAR laser scan beam from toolhead
        const scanSweepX =
          w * 0.5 + Math.sin(tickCount * 0.18) * (modelWidth * 0.42);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(scanSweepX + 18, topLayerY - 22);
        ctx.lineTo(scanSweepX, topLayerY);
        ctx.stroke();
      }

      // 6. Spaghetti extrusion anomaly simulation (if confidence >= 65%)
      if (t.spaghettiConfidencePct >= 65) {
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1.4;
        for (let s = 0; s < 14; s++) {
          ctx.beginPath();
          const sx = w * 0.42 + ((s * 19) % (w * 0.18));
          const sy = topLayerY - 4 + ((s * 7) % 16);
          ctx.moveTo(sx, sy);
          ctx.bezierCurveTo(sx - 15, sy - 18, sx + 22, sy - 24, sx + 8, sy - 6);
          ctx.stroke();
        }

        // Red AI bounding box overlay
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.36, topLayerY - 28, w * 0.28, 38);
        ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
        ctx.fillRect(w * 0.36, topLayerY - 46, 178, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillText(
          `SPAGHETTI DETECTED ${t.spaghettiConfidencePct}%`,
          w * 0.36 + 6,
          topLayerY - 33
        );
      }

      // 7. Carbon-Fiber CoreXY X-Gantry & Moving Toolhead
      const isMoving = t.state === 'PRINTING' || t.state === 'CALIBRATING_LIDAR';
      const headOsc = isMoving
        ? Math.sin(tickCount * 0.22) * (modelWidth * 0.38)
        : -w * 0.28;
      const headX = w * 0.5 + headOsc;
      const gantryY = Math.max(24, topLayerY - 46);

      // Dual Carbon Fiber Rods
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(w * 0.12, gantryY + 12, w * 0.76, 5);
      ctx.fillRect(w * 0.12, gantryY + 24, w * 0.76, 5);

      // X1 Carbon Toolhead Housing
      const thW = compact ? 38 : 52;
      const thH = compact ? 44 : 58;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.fillRect(headX - thW / 2, gantryY - 6, thW, thH);
      ctx.strokeRect(headX - thW / 2, gantryY - 6, thW, thH);

      // Bambu Lab Emerald Logo Bar on Toolhead
      ctx.fillStyle = '#10b981';
      ctx.fillRect(headX - thW / 2 + 5, gantryY + thH * 0.42, thW - 10, 4);

      // Hotend Glowing Nozzle Tip
      ctx.fillStyle = t.nozzleTempActual > 180 ? '#f97316' : '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(headX - 5, gantryY + thH - 6);
      ctx.lineTo(headX + 5, gantryY + thH - 6);
      ctx.lineTo(headX, topLayerY);
      ctx.closePath();
      ctx.fill();

      // Timestamp & Camera HUD watermark inside video frame
      ctx.font = '500 11px "JetBrains Mono", monospace';
      const camLabel = compact
        ? `CHAMBER CAM · L${t.currentLayer}/${t.totalLayers}`
        : `X1C CHAMBER CAM 1080P · 30FPS · ${objs.length} OBJ`;
      const boxWidth = Math.ceil(ctx.measureText(camLabel).width) + 18;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fillRect(10, 10, boxWidth, 22);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(camLabel, 19, 25);

      // Automated Timelapse Recording Badge (Top-Right of Video Feed)
      if (t.timelapseEnabled) {
        const recText = compact
          ? `REC TL · ${t.timelapseFramesCaptured}F`
          : t.state === 'COMPLETED'
          ? `TIMELAPSE READY · ${t.totalLayers} FRAMES`
          : `REC TIMELAPSE · ${t.timelapseFramesCaptured}/${t.totalLayers}F`;
        const recBoxW = Math.ceil(ctx.measureText(recText).width) + 28;
        const rx = w - recBoxW - 10;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.fillRect(rx, 10, recBoxW, 22);
        ctx.fillStyle =
          t.state === 'COMPLETED'
            ? '#10b981'
            : tickCount % 6 < 4
            ? '#ef4444'
            : '#f87171';
        ctx.beginPath();
        ctx.arc(rx + 11, 21, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(recText, rx + 20, 25);
      }
    };

    drawFrame();
    const interval = window.setInterval(drawFrame, 100);
    return () => window.clearInterval(interval);
  }, [compact]);

  return (
    <canvas
      ref={canvasRef}
      width={compact ? 360 : 720}
      height={compact ? 210 : 405}
      data-testid={compact ? 'pip-chamber-camera' : 'main-chamber-camera'}
      className="w-full h-full object-cover block"
    />
  );
};
