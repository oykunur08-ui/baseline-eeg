"use client";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { PlotParams } from "react-plotly.js";
import {
  simulateSessions,
  alignZScore,
  alignCovarianceWhitening,
  alignMovingAverage,
  centroidDriftL2,
  fisherRatio1D,
  type EEGSession,
  type Point2D,
} from "../../lib/eeg-simulation";

const Plot = dynamic<PlotParams>(() => import("react-plotly.js"), { ssr: false });

type AlignMethod = "none" | "zscore" | "covariance" | "moving_avg";

const METHODS: { id: AlignMethod; label: string }[] = [
  { id: "none",       label: "None (raw)" },
  { id: "zscore",     label: "Z-score" },
  { id: "covariance", label: "Cov. Whitening" },
  { id: "moving_avg", label: "Moving Avg" },
];

function sessionRgb(i: number, total: number): string {
  const t = total > 1 ? i / (total - 1) : 0;
  // #1B3F7A → #B8832A
  const r = Math.round(27  + (184 - 27)  * t);
  const g = Math.round(63  + (131 - 63)  * t);
  const b = Math.round(122 + (42  - 122) * t);
  return `rgb(${r},${g},${b})`;
}

function buildTraces(sessions: EEGSession[]) {
  const traces: object[] = [];
  const N = sessions.length;

  for (let i = 0; i < N; i++) {
    const s = sessions[i];
    const color = sessionRgb(i, N);
    const label = `S${i + 1}`;

    // Class 0 — circles
    traces.push({
      type: "scatter", mode: "markers",
      x: s.class0.map((p: Point2D) => p[0]),
      y: s.class0.map((p: Point2D) => p[1]),
      marker: { color, size: 4.5, symbol: "circle", opacity: 0.72, line: { width: 0 } },
      name: label, legendgroup: label, showlegend: true,
      hovertemplate: `${label} · Class A<extra></extra>`,
    });

    // Class 1 — diamonds
    traces.push({
      type: "scatter", mode: "markers",
      x: s.class1.map((p: Point2D) => p[0]),
      y: s.class1.map((p: Point2D) => p[1]),
      marker: { color, size: 4.5, symbol: "diamond", opacity: 0.72, line: { width: 0 } },
      name: label, legendgroup: label, showlegend: false,
      hovertemplate: `${label} · Class B<extra></extra>`,
    });
  }

  // Centroid drift trail
  traces.push({
    type: "scatter", mode: "lines+markers",
    x: sessions.map((s) => s.centroid[0]),
    y: sessions.map((s) => s.centroid[1]),
    line: { color: "rgba(58,56,48,0.4)", width: 1.5, dash: "dot" },
    marker: { color: "rgba(58,56,48,0.7)", size: 5, symbol: "circle" },
    name: "Centroids", showlegend: false,
    hovertemplate: "Centroid %{text}<extra></extra>",
    text: sessions.map((_, i) => `S${i + 1}`),
  });

  return traces;
}

function ScatterPlot({ sessions, title }: { sessions: EEGSession[]; title: string }) {
  return (
    <Plot
      data={buildTraces(sessions) as any}
      layout={{
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { family: "DM Mono, monospace", size: 10, color: "#6B6860" },
        margin: { l: 36, r: 12, t: 32, b: 36 },
        xaxis: {
          gridcolor: "rgba(0,0,0,0.06)",
          zerolinecolor: "rgba(0,0,0,0.08)",
          title: { text: "PC 1", font: { size: 10 } },
        },
        yaxis: {
          gridcolor: "rgba(0,0,0,0.06)",
          zerolinecolor: "rgba(0,0,0,0.08)",
          title: { text: "PC 2", font: { size: 10 } },
        },
        title: { text: title, font: { size: 10, color: "#6B6860" }, x: 0.03 },
        showlegend: sessions.length <= 6,
        legend: { bgcolor: "transparent", font: { size: 9 }, orientation: "h", y: -0.18 },
      } as any}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: 300 }}
    />
  );
}

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="bg-linen border border-stone rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
        <div className="text-xs font-mono text-mist">{label}</div>
      </div>
      <div className="text-xl font-light text-ink tracking-tight">{value}</div>
      {sub && <div className="text-xs text-mist mt-1">{sub}</div>}
    </div>
  );
}

function Slider({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <label className="text-xs text-mist">{label}</label>
        <span className="text-xs font-mono text-teal">{format ? format(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-teal"
      />
    </div>
  );
}

export default function DriftGeometryLab() {
  const [driftIntensity, setDriftIntensity] = useState(1.5);
  const [noiseLevel, setNoiseLevel]         = useState(0.6);
  const [nSessions, setNSessions]           = useState(6);
  const [method, setMethod]                 = useState<AlignMethod>("none");

  const raw = useMemo(
    () => simulateSessions({ nSessions, driftIntensity, noiseLevel, pointsPerClass: 28, seed: 42 }),
    [nSessions, driftIntensity, noiseLevel]
  );

  const aligned = useMemo(() => {
    if (method === "none")       return raw;
    if (method === "zscore")     return alignZScore(raw);
    if (method === "covariance") return alignCovarianceWhitening(raw);
    return alignMovingAverage(raw);
  }, [raw, method]);

  const rawDrift     = useMemo(() => centroidDriftL2(raw), [raw]);
  const alignedDrift = useMemo(() => centroidDriftL2(aligned), [aligned]);
  const rawFisher    = useMemo(() => fisherRatio1D(raw), [raw]);
  const alignedFisher= useMemo(() => fisherRatio1D(aligned), [aligned]);

  const maxRawDrift     = Math.max(...rawDrift).toFixed(2);
  const maxAlignedDrift = Math.max(...alignedDrift).toFixed(2);
  const meanRawFisher   = (rawFisher.reduce((a, b) => a + b, 0) / rawFisher.length).toFixed(2);
  const meanAlignFisher = (alignedFisher.reduce((a, b) => a + b, 0) / alignedFisher.length).toFixed(2);

  const driftReduction = method === "none" ? null
    : ((1 - Number(maxAlignedDrift) / Number(maxRawDrift)) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm text-mist leading-relaxed max-w-2xl">
        Simulated 2D feature space across sessions. Each session has two classes (circle vs diamond).
        Watch how centroid drift shifts the distribution across sessions, then observe
        that alignment removes the shift without changing class separability.
      </p>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-5 border border-stone rounded-xl bg-linen">
        <Slider
          label="Drift intensity"
          value={driftIntensity} min={0.3} max={3.0} step={0.1}
          onChange={setDriftIntensity} format={(v) => v.toFixed(1)}
        />
        <Slider
          label="Within-session noise"
          value={noiseLevel} min={0.2} max={1.4} step={0.1}
          onChange={setNoiseLevel} format={(v) => v.toFixed(1)}
        />
        <Slider
          label="Sessions"
          value={nSessions} min={3} max={8} step={1}
          onChange={setNSessions}
        />
      </div>

      {/* Method selector */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs text-mist/60 self-center mr-1 font-mono">alignment</span>
        {METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              method === m.id
                ? "bg-teal text-parchment border-teal"
                : "border-stone text-mist hover:border-dim"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border border-stone rounded-xl p-3 overflow-hidden">
          <ScatterPlot sessions={raw} title="Raw, session drift visible" />
        </div>
        <div className="border border-stone rounded-xl p-3 overflow-hidden">
          <ScatterPlot
            sessions={aligned}
            title={method === "none" ? "No alignment selected" : `Aligned, ${METHODS.find((m) => m.id === method)?.label}`}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Max centroid drift (raw)" value={maxRawDrift} sub="L₂ from session 1" accent="#9B9790" />
        <Metric
          label="Max centroid drift (aligned)"
          value={method === "none" ? "-" : maxAlignedDrift}
          sub={driftReduction ? `↓ ${driftReduction}% reduction` : "select alignment"}
          accent="#1E6B5C"
        />
        <Metric label="Fisher ratio (raw)" value={meanRawFisher} sub="mean across sessions" accent="#1B3F7A" />
        <Metric
          label="Fisher ratio (aligned)"
          value={method === "none" ? "-" : meanAlignFisher}
          sub="≈ unchanged"
          accent="#B8832A"
        />
      </div>

      {/* Insight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-5 border rounded-xl"
        style={{ borderColor: method !== "none" ? "rgba(30,107,92,0.3)" : "var(--stone)" }}
      >
        <div className="text-xs font-mono text-mist/60 mb-2">Key observation</div>
        <p className="text-sm text-dim leading-relaxed">
          {method === "none"
            ? "Centroid drift is clearly visible across sessions. Sessions are far apart in feature space. A static classifier calibrated on S1 will fail on S6."
            : `${METHODS.find((m) => m.id === method)?.label} reduced centroid drift by ${driftReduction}%. The sessions are now closer together. But the Fisher ratio (class separability) is ${meanAlignFisher}, nearly identical to the raw value of ${meanRawFisher}. Alignment corrected the shift. It did not create new signal.`}
        </p>
      </motion.div>

      {/* Symbol legend */}
      <div className="flex gap-6 text-xs text-mist/60">
        <div className="flex items-center gap-2">
          <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#6B6860"/></svg>
          Class A (e.g. left MI)
        </div>
        <div className="flex items-center gap-2">
          <svg width="10" height="10" viewBox="0 0 10 10"><polygon points="5,1 9,9 1,9" fill="none" stroke="#6B6860" strokeWidth="1.5"/></svg>
          Class B (e.g. right MI)
        </div>
        <div className="flex items-center gap-2">
          <svg width="16" height="4" viewBox="0 0 16 4"><line x1="0" y1="2" x2="16" y2="2" stroke="#6B6860" strokeWidth="1.5" strokeDasharray="3,2"/></svg>
          Centroid trail
        </div>
      </div>
    </div>
  );
}
