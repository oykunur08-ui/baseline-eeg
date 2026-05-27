"use client";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import type { PlotParams } from "react-plotly.js";
import { simulateLongitudinalFeatures } from "../../lib/eeg-simulation";

const Plot = dynamic<PlotParams>(() => import("react-plotly.js"), { ssr: false });

export default function LongitudinalViewer() {
  const [nSessions, setNSessions] = useState(20);
  const [view, setView]           = useState<"raw" | "aligned">("raw");

  const features = useMemo(() => simulateLongitudinalFeatures(nSessions, 7), [nSessions]);

  const traces: object[] = features.map((f) => ({
    type: "scatter",
    mode: "lines+markers",
    x: f.sessions,
    y: view === "raw" ? f.raw : f.aligned,
    line: { color: f.color, width: 2 },
    marker: { color: f.color, size: 5 },
    name: f.band,
    hovertemplate: `${f.band}<br>Session %{x}<br>Power %{y:.2f} μV²/Hz<extra></extra>`,
  }));

  // Drift event vertical shapes
  const driftEvents = features[0]?.driftEvents ?? [];
  const shapes: object[] = driftEvents
    .filter((e) => e <= nSessions)
    .map((e) => ({
      type: "line",
      x0: e, x1: e, y0: 0, y1: 1, yref: "paper",
      line: { color: "rgba(184,131,42,0.35)", width: 1, dash: "dot" },
    }));

  const annotations: object[] = driftEvents
    .filter((e) => e <= nSessions)
    .map((e) => ({
      x: e, y: 1.04, yref: "paper",
      text: "drift event", showarrow: false,
      font: { size: 8, color: "#B8832A" }, xanchor: "center",
    }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-mist leading-relaxed max-w-2xl">
        Spectral power features across simulated sessions. Raw trajectories show clear upward
        drift driven by electrode impedance change and circadian variation. Toggle to aligned
        view: drift is reduced, but within-session noise persists. Alignment removes the mean
        shift, not the underlying variability.
      </p>

      {/* Controls row */}
      <div className="flex items-center gap-6 flex-wrap">
        {/* View toggle */}
        <div className="flex gap-2">
          {(["raw", "aligned"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs font-medium px-4 py-1.5 rounded-full border transition-all ${
                view === v
                  ? "bg-teal text-parchment border-teal"
                  : "border-stone text-mist hover:border-dim"
              }`}
            >
              {v === "raw" ? "Raw" : "Aligned (moving avg)"}
            </button>
          ))}
        </div>

        {/* Session count */}
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <label className="text-xs text-mist whitespace-nowrap">Sessions</label>
          <input
            type="range" min={8} max={30} step={1} value={nSessions}
            onChange={(e) => setNSessions(Number(e.target.value))}
            className="flex-1 accent-teal"
          />
          <span className="text-xs font-mono text-teal w-4">{nSessions}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="border border-stone rounded-xl p-4 overflow-hidden">
        <Plot
          data={traces as any}
          layout={{
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { family: "DM Mono, monospace", size: 10, color: "#6B6860" },
            margin: { l: 52, r: 24, t: 20, b: 48 },
            xaxis: {
              gridcolor: "rgba(0,0,0,0.06)",
              zerolinecolor: "rgba(0,0,0,0.08)",
              title: { text: "Session", font: { size: 11 } },
              range: [0.5, nSessions + 0.5],
            },
            yaxis: {
              gridcolor: "rgba(0,0,0,0.06)",
              zerolinecolor: "rgba(0,0,0,0.08)",
              title: { text: "Band power (μV²/Hz)", font: { size: 11 } },
            },
            legend: {
              bgcolor: "transparent",
              font: { size: 10 },
              x: 0.02, y: 0.98, xanchor: "left", yanchor: "top",
            },
            shapes,
            annotations,
          } as any}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%", height: 340 }}
        />
      </div>

      {/* Comparison stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {features.map((f) => {
          const vals = view === "raw" ? f.raw : f.aligned;
          const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
          const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
          const rawMean = f.raw.reduce((a, b) => a + b, 0) / f.raw.length;
          const rawStd  = Math.sqrt(f.raw.reduce((a, b) => a + (b - rawMean) ** 2, 0) / f.raw.length);
          const reduction = view === "aligned"
            ? `σ ↓ ${((1 - std / rawStd) * 100).toFixed(0)}%`
            : "raw trajectory";
          return (
            <div key={f.band} className="p-4 border border-stone rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-px" style={{ background: f.color }} />
                <div className="text-xs font-mono text-mist leading-tight">{f.band}</div>
              </div>
              <div className="text-lg font-light text-ink">{mean.toFixed(1)}</div>
              <div className="text-xs text-mist/60 mt-1">σ = {std.toFixed(2)}</div>
              <div className="text-xs mt-1" style={{ color: f.color + "AA" }}>{reduction}</div>
            </div>
          );
        })}
        <div className="p-4 border border-stone rounded-xl flex flex-col justify-center">
          <div className="text-xs font-mono text-mist/60 mb-2">Drift events marked</div>
          <div className="text-lg font-light text-amber">{driftEvents.filter((e) => e <= nSessions).length}</div>
          <div className="text-xs text-mist/60 mt-1">sudden impedance shifts</div>
        </div>
      </div>

      {/* Insight */}
      <div
        className="p-5 border rounded-xl"
        style={{ borderColor: view === "aligned" ? "rgba(30,107,92,0.3)" : "rgba(184,131,42,0.3)" }}
      >
        <div className="text-xs font-mono text-mist/60 mb-2">Key observation</div>
        <p className="text-sm text-dim leading-relaxed">
          {view === "raw"
            ? "Raw feature trajectories show clear monotonic drift across sessions, with alpha power rising and theta falling. Drift events create sudden discontinuities. A classifier trained on session 1 treats session 15 as a different signal source."
            : "Moving-average alignment substantially reduces the monotonic drift component. However, within-session noise and drift event discontinuities remain. The signal is more stationary, but not stationary. The same subject remains statistically non-identical to themselves over time."}
        </p>
      </div>
    </div>
  );
}
