"use client";
import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from "react";
import { CHANNEL_COLORS, ALL_CHANNEL_NAMES, DISPLAY_SAMPLES } from "../../lib/eeg-stream/signalGenerator";

// ── Public handle exposed to the parent via ref ───────────────────────────────

export interface EEGCanvasHandle {
  /** Push n new samples per channel. Internally shifts ring buffer. */
  pushSamples(samples: Float32Array[], nSamples: number): void;
  /** Mark session reset — clears buffers + resets cursor. */
  reset(): void;
}

interface EEGCanvasProps {
  nChannels: number;
  aligned: boolean;
  isRunning: boolean;
}

// ── Canvas drawing ────────────────────────────────────────────────────────────

const BG_COLOR       = "#080B12";
const GRID_MAJOR     = "rgba(40,60,95,0.35)";
const GRID_MINOR     = "rgba(25,40,70,0.20)";
const SEPARATOR      = "rgba(50,70,110,0.25)";
const AXIS_TEXT      = "rgba(120,140,170,0.55)";
const LABEL_WIDTH    = 54;  // px
const HEADER_H       = 28;  // px
const FOOTER_H       = 24;  // px

function drawFrame(
  canvas: HTMLCanvasElement,
  buffers: Float32Array[],
  nChannels: number,
  aligned: boolean,
  sessionTime: number,
) {
  const dpr = window.devicePixelRatio || 1;

  // Resize canvas if CSS size changed
  const cssW = canvas.offsetWidth;
  const cssH = canvas.offsetHeight;
  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  ctx.scale(dpr, dpr);

  const W = cssW;
  const H = cssH;
  const plotW = W - LABEL_WIDTH - 8;
  const plotH = H - HEADER_H - FOOTER_H;
  const channelH = plotH / Math.max(nChannels, 1);

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);

  // ── Grid ────────────────────────────────────────────────────────────────────

  ctx.lineWidth = 1;

  // Vertical time grid — major every 1 s, minor every 0.5 s (4 s window)
  const SECONDS = 4;
  for (let s = 0; s <= SECONDS * 2; s++) {
    const x = LABEL_WIDTH + (s / (SECONDS * 2)) * plotW;
    ctx.strokeStyle = s % 2 === 0 ? GRID_MAJOR : GRID_MINOR;
    ctx.beginPath();
    ctx.moveTo(x, HEADER_H);
    ctx.lineTo(x, HEADER_H + plotH);
    ctx.stroke();
  }

  // Horizontal channel separators + midlines
  for (let ch = 0; ch <= nChannels; ch++) {
    const y = HEADER_H + ch * channelH;
    ctx.strokeStyle = ch === 0 || ch === nChannels ? GRID_MAJOR : SEPARATOR;
    ctx.beginPath();
    ctx.moveTo(LABEL_WIDTH, y);
    ctx.lineTo(W - 8, y);
    ctx.stroke();
  }

  // ── Header bar ──────────────────────────────────────────────────────────────

  ctx.font = "10px DM Mono, monospace";
  ctx.fillStyle = aligned ? "rgba(30,107,92,0.9)" : "rgba(120,140,170,0.6)";
  const statusLabel = aligned ? "ALIGNED" : "RAW";
  ctx.fillText(statusLabel, LABEL_WIDTH + 8, 18);

  ctx.fillStyle = "rgba(120,140,170,0.45)";
  ctx.fillText("250 Hz  ·  sim", LABEL_WIDTH + 72, 18);

  const mins   = Math.floor(sessionTime / 60);
  const secs   = (sessionTime % 60).toFixed(1).padStart(4, "0");
  const timeStr = `${mins}:${secs}`;
  ctx.textAlign = "right";
  ctx.fillText(timeStr, W - 10, 18);
  ctx.textAlign = "left";

  // ── Waveforms ────────────────────────────────────────────────────────────────

  const DISPLAY_AMPLITUDE = 60; // μV full-scale half-height

  for (let ch = 0; ch < nChannels; ch++) {
    const buf = buffers[ch];
    if (!buf) continue;

    const yCenter = HEADER_H + ch * channelH + channelH / 2;
    const scale   = (channelH * 0.42) / DISPLAY_AMPLITUDE;
    const color   = CHANNEL_COLORS[ch % CHANNEL_COLORS.length];

    // Channel label
    ctx.fillStyle   = color + "BB";
    ctx.font        = "10px DM Mono, monospace";
    ctx.textAlign   = "right";
    ctx.fillText(ALL_CHANNEL_NAMES[ch] ?? `ch${ch + 1}`, LABEL_WIDTH - 6, yCenter + 4);
    ctx.textAlign = "left";

    // Midline for this channel (very subtle)
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(LABEL_WIDTH, yCenter);
    ctx.lineTo(W - 8, yCenter);
    ctx.stroke();
    ctx.setLineDash([]);

    // Waveform path
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.25;
    ctx.shadowColor = color;
    ctx.shadowBlur  = aligned ? 0 : 2.5;
    ctx.beginPath();

    const nSamples    = buf.length;
    const pixPerSamp  = plotW / nSamples;

    for (let i = 0; i < nSamples; i++) {
      const x = LABEL_WIDTH + i * pixPerSamp;
      const y = yCenter - (buf[i] ?? 0) * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── Footer — time axis ───────────────────────────────────────────────────────

  ctx.font      = "9px DM Mono, monospace";
  ctx.fillStyle = AXIS_TEXT;
  ctx.textAlign = "center";

  for (let s = 0; s <= SECONDS; s++) {
    const x    = LABEL_WIDTH + (s / SECONDS) * plotW;
    const label = s === SECONDS ? "0 s" : `-${SECONDS - s} s`;
    ctx.fillText(label, x, H - 7);
  }
  ctx.textAlign = "left";

  // Vertical cursor at right edge (current recording point)
  ctx.strokeStyle = "rgba(100,160,210,0.3)";
  ctx.lineWidth   = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(W - 9, HEADER_H);
  ctx.lineTo(W - 9, HEADER_H + plotH);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

// ── Component ─────────────────────────────────────────────────────────────────

const EEGCanvas = forwardRef<EEGCanvasHandle, EEGCanvasProps>(function EEGCanvas(
  { nChannels, aligned, isRunning },
  ref,
) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const buffersRef = useRef<Float32Array[]>([]);
  const sessionRef = useRef(0); // seconds, updated by parent via pushSamples

  // Initialize / resize buffers when channel count changes
  useEffect(() => {
    buffersRef.current = Array.from(
      { length: nChannels },
      (_, ch) => buffersRef.current[ch] ?? new Float32Array(DISPLAY_SAMPLES),
    ).slice(0, nChannels);
  }, [nChannels]);

  useImperativeHandle(ref, () => ({
    pushSamples(samples, nSamples) {
      sessionRef.current += nSamples / 250;
      for (let ch = 0; ch < samples.length && ch < buffersRef.current.length; ch++) {
        const buf = buffersRef.current[ch];
        buf.copyWithin(0, nSamples);
        buf.set(samples[ch].subarray(0, nSamples), DISPLAY_SAMPLES - nSamples);
      }
    },
    reset() {
      sessionRef.current = 0;
      buffersRef.current = Array.from(
        { length: nChannels },
        () => new Float32Array(DISPLAY_SAMPLES),
      );
    },
  }), [nChannels]);

  // RAF draw loop — runs continuously; only draws, never generates
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      drawFrame(canvas, buffersRef.current, nChannels, aligned, sessionRef.current);
    }
  }, [nChannels, aligned]);

  useEffect(() => {
    let rafId: number;
    const loop = () => { draw(); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full block"
      style={{
        height: `${Math.max(nChannels * 80, 240)}px`,
        imageRendering: "auto",
      }}
    />
  );
});

export default EEGCanvas;
