"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import EEGCanvas,    { type EEGCanvasHandle }  from "../../components/eeg-stream/EEGCanvas";
import StreamControls, { type StreamConfig }   from "../../components/eeg-stream/StreamControls";
import FeaturePanel                            from "../../components/eeg-stream/FeaturePanel";

import { SignalGenerator, SAMPLES_PER_FRAME }  from "../../lib/eeg-stream/signalGenerator";
import { DriftModel }                          from "../../lib/eeg-stream/driftModel";
import { FeatureExtractor, type ChannelMetrics } from "../../lib/eeg-stream/featureExtraction";
import { RealtimeAligner }                     from "../../lib/eeg-stream/alignment";

// ── Initial config ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: StreamConfig = {
  driftIntensity: 1.2,
  noiseLevel:     1.0,
  nChannels:      4,
  aligned:        "none",
  seed:           42,
};

// ── Blinking REC indicator ────────────────────────────────────────────────────

function RecDot({ active }: { active: boolean }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-2 transition-opacity duration-300"
      style={{
        background: active ? "#1E6B5C" : "#8B3030",
        opacity: active ? 1 : 0.5,
      }}
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [config, setConfig]         = useState<StreamConfig>(DEFAULT_CONFIG);
  const [isRunning, setIsRunning]   = useState(false);
  const [metrics, setMetrics]       = useState<ChannelMetrics[]>([]);
  const [driftIndex, setDriftIndex] = useState(0);
  const [isCalib, setIsCalib]       = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [showDebug, setShowDebug]   = useState(false);
  const [debugSnapshot, setDebugSnapshot] = useState<number[][]>([]);

  // ── Refs — never trigger re-renders ──────────────────────────────────────────

  const canvasRef    = useRef<EEGCanvasHandle>(null);
  const isRunRef     = useRef(false);
  const configRef    = useRef<StreamConfig>(DEFAULT_CONFIG);
  const rafRef       = useRef<number>();

  const genRef       = useRef<SignalGenerator>(new SignalGenerator(DEFAULT_CONFIG.seed, DEFAULT_CONFIG.nChannels));
  const driftRef     = useRef<DriftModel>(new DriftModel(DEFAULT_CONFIG.nChannels));
  const extractRef   = useRef<FeatureExtractor>(new FeatureExtractor(DEFAULT_CONFIG.nChannels));
  const alignRef     = useRef<RealtimeAligner>(new RealtimeAligner(DEFAULT_CONFIG.nChannels));

  // Frame counter for throttled React state updates
  const frameCount   = useRef(0);
  const METRICS_INTERVAL = 15; // update React state every N frames (~2 Hz)

  // Keep configRef in sync
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { isRunRef.current = isRunning; }, [isRunning]);

  // ── Reset all engines when channel count or seed changes ─────────────────────

  const resetEngines = useCallback((cfg: StreamConfig) => {
    genRef.current.reset(cfg.seed, cfg.nChannels);
    driftRef.current = new DriftModel(cfg.nChannels);
    extractRef.current.reset(cfg.nChannels);
    alignRef.current.reset(cfg.nChannels);
    canvasRef.current?.reset();
    setMetrics([]);
    setDriftIndex(0);
    setIsCalib(false);
    setSessionTime(0);
  }, []);

  // When channel count or seed changes, reset
  useEffect(() => {
    resetEngines(config);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.nChannels, config.seed]);

  // ── Main RAF loop (single, stable) ───────────────────────────────────────────

  useEffect(() => {
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);

      if (!isRunRef.current) return;

      const cfg = configRef.current;

      // 1. Get drift offsets
      const driftOffsets = driftRef.current.getDrift(cfg.driftIntensity);

      // 2. Generate raw samples
      const rawSamples = genRef.current.generate(SAMPLES_PER_FRAME, cfg.noiseLevel, driftOffsets);

      // 3. Apply alignment
      const alignMethod = cfg.aligned;
      const displaySamples = alignRef.current.apply(rawSamples, alignMethod);

      // 4. Advance drift model
      driftRef.current.advance(SAMPLES_PER_FRAME, cfg.driftIntensity);

      // 5. Push to canvas (non-React, very fast)
      canvasRef.current?.pushSamples(displaySamples, SAMPLES_PER_FRAME);

      // 6. Feature extraction
      extractRef.current.update(rawSamples); // always on raw signal

      // 7. Throttled React state update
      frameCount.current++;
      if (frameCount.current % METRICS_INTERVAL === 0) {
        const m = extractRef.current.update(rawSamples);
        setMetrics([...m]);
        setDriftIndex(driftRef.current.driftIndex);
        setIsCalib(extractRef.current.isCalibrated);
        setSessionTime(genRef.current.elapsedSeconds);

        if (showDebug) {
          setDebugSnapshot(rawSamples.map((ch) => Array.from(ch.slice(0, 8))));
        }
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDebug]); // stable — only showDebug can change the snapshot branch

  // ── Config change handler ─────────────────────────────────────────────────────

  const handleConfigChange = useCallback((patch: Partial<StreamConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      configRef.current = next;
      return next;
    });
  }, []);

  const handleToggle = useCallback(() => {
    setIsRunning((v) => !v);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    isRunRef.current = false;
    resetEngines(configRef.current);
  }, [resetEngines]);

  // ── Render ────────────────────────────────────────────────────────────────────

  const aligned = config.aligned !== "none";

  return (
    <div className="min-h-screen bg-dark-bg text-parchment font-sans flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-dark-border flex-shrink-0">
        <div className="container-wide h-12 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-mono text-parchment/30 hover:text-parchment/70 transition-colors"
          >
            ← BASELINE
          </Link>

          <div className="flex items-center gap-3">
            <RecDot active={isRunning} />
            <span className="section-label text-parchment/50">
              EEG Stream Laboratory
            </span>
          </div>

          <button
            onClick={() => setShowDebug((v) => !v)}
            className={`text-xs font-mono px-3 py-1 rounded border transition-all ${
              showDebug
                ? "border-parchment/25 text-parchment/50"
                : "border-dark-border text-parchment/20 hover:border-dark-muted"
            }`}
          >
            debug
          </button>
        </div>
      </header>

      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <StreamControls
        config={config}
        isRunning={isRunning}
        onConfigChange={handleConfigChange}
        onToggle={handleToggle}
        onReset={handleReset}
      />

      {/* ── Canvas area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* Idle / intro overlay */}
        {!isRunning && sessionTime === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-x-0 top-1/3 -translate-y-1/2 z-10 flex flex-col items-center
                       pointer-events-none"
          >
            <p className="text-sm text-parchment/30 font-mono tracking-widest mb-2">
              STREAM PAUSED
            </p>
            <p className="text-xs text-parchment/20 font-mono">
              Press Start to begin simulation
            </p>
          </motion.div>
        )}

        {/* Main canvas */}
        <div
          className="relative bg-[#080B12] flex-1"
          style={{ minHeight: `${config.nChannels * 80}px` }}
        >
          <EEGCanvas
            ref={canvasRef}
            nChannels={config.nChannels}
            aligned={aligned}
            isRunning={isRunning}
          />
        </div>

        {/* Alignment banner */}
        {aligned && (
          <div
            className="border-t flex-shrink-0 px-6 py-2 flex items-center gap-4"
            style={{ borderColor: "rgba(30,107,92,0.25)", background: "rgba(30,107,92,0.05)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0" />
            <p className="text-xs text-teal/70">
              {config.aligned === "zscore"
                ? "Z-score alignment active. Mean drift removed, amplitude normalized to 20 μV RMS"
                : "Moving-average alignment active. DC offset removed, amplitude preserved"}
              <span className="ml-3 text-teal/40">
                · stability ≠ improved decoding performance
              </span>
            </p>
          </div>
        )}
      </div>

      {/* ── Feature panel ───────────────────────────────────────────────────── */}
      <FeaturePanel
        metrics={metrics}
        nChannels={config.nChannels}
        driftIndex={driftIndex}
        isCalibrated={isCalib}
        sessionTime={sessionTime}
      />

      {/* ── Debug panel ─────────────────────────────────────────────────────── */}
      {showDebug && (
        <div className="border-t border-dark-border bg-dark-card flex-shrink-0">
          <div className="container-wide py-4">
            <div className="text-xs font-mono text-parchment/30 mb-3">
              Debug, last 8 raw samples per channel (μV)
            </div>
            <div className="grid md:grid-cols-4 gap-3">
              {debugSnapshot.map((ch, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-xs font-mono text-parchment/25">
                    ch{i + 1}
                  </div>
                  <div className="text-xs font-mono text-parchment/50 leading-relaxed">
                    [{ch.map((v) => v.toFixed(1)).join(", ")}]
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-dark-border">
              <div className="text-xs font-mono text-parchment/25 mb-2">
                Stream config
              </div>
              <pre className="text-xs font-mono text-parchment/40 leading-relaxed">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── Scientific insight footer ────────────────────────────────────────── */}
      <footer className="border-t border-dark-border flex-shrink-0">
        <div className="container-wide py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="text-xs font-mono text-parchment/20">
            Fully deterministic · browser-only simulation · seed-controlled
          </div>
          <div className="text-xs text-parchment/20 max-w-md text-right leading-relaxed hidden md:block">
            Alignment reduces baseline drift. It does not increase the signal-to-noise
            ratio of neural features or improve downstream decoding.
          </div>
        </div>
      </footer>

    </div>
  );
}
