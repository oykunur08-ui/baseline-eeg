"use client";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { PlotParams } from "react-plotly.js";
import { simulateCalibrationCurves } from "../../lib/eeg-simulation";

const Plot = dynamic<PlotParams>(() => import("react-plotly.js"), { ssr: false });

export default function CalibrationSimulator() {
  const curves = useMemo(() => simulateCalibrationCurves(99), []);

  const traces: object[] = [];

  // CI bands (filled area between upper/lower) — drawn first so they're behind lines
  for (const c of curves) {
    traces.push({
      type: "scatter",
      x: [...c.nSamples, ...[...c.nSamples].reverse()],
      y: [...c.upper, ...[...c.lower].reverse()],
      fill: "toself",
      fillcolor: c.color + "18",
      line: { width: 0 },
      showlegend: false,
      hoverinfo: "skip",
    });
  }

  // Mean lines
  for (const c of curves) {
    traces.push({
      type: "scatter",
      mode: "lines",
      x: c.nSamples,
      y: c.meanAcc,
      line: { color: c.color, width: 2 },
      name: c.method,
      hovertemplate: `${c.method}<br>n=%{x} samples<br>acc=%{y:.3f}<extra></extra>`,
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-mist leading-relaxed max-w-2xl">
        Simulated decoding accuracy as a function of calibration sample count.
        Confidence intervals show stability. Aligned methods are more reliable
        at low sample counts, but the performance ceiling does not improve.
      </p>

      <div className="border border-stone rounded-xl p-4 overflow-hidden">
        <Plot
          data={traces as any}
          layout={{
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { family: "DM Mono, monospace", size: 10, color: "#6B6860" },
            margin: { l: 52, r: 24, t: 20, b: 52 },
            xaxis: {
              gridcolor: "rgba(0,0,0,0.06)",
              zerolinecolor: "rgba(0,0,0,0.08)",
              title: { text: "Calibration samples", font: { size: 11 } },
              range: [0, 190],
            },
            yaxis: {
              gridcolor: "rgba(0,0,0,0.06)",
              zerolinecolor: "rgba(0,0,0,0.08)",
              title: { text: "Decoding accuracy", font: { size: 11 } },
              range: [0.36, 0.78],
              tickformat: ".0%",
            },
            legend: {
              bgcolor: "transparent",
              font: { size: 10 },
              x: 0.98, xanchor: "right", y: 0.08,
            },
            shapes: [
              // Chance line
              {
                type: "line", x0: 0, x1: 190, y0: 0.5, y1: 0.5,
                line: { color: "rgba(0,0,0,0.15)", width: 1, dash: "dot" },
              },
              // Real BNCI result
              {
                type: "line", x0: 0, x1: 190, y0: 0.576, y1: 0.576,
                line: { color: "rgba(30,107,92,0.5)", width: 1, dash: "dash" },
              },
            ],
            annotations: [
              {
                x: 185, y: 0.503, text: "chance", showarrow: false,
                font: { size: 9, color: "rgba(0,0,0,0.3)" }, xanchor: "right",
              },
              {
                x: 185, y: 0.579, text: "real result (57.6%)", showarrow: false,
                font: { size: 9, color: "rgba(30,107,92,0.7)" }, xanchor: "right",
              },
            ],
          } as any}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%", height: 360 }}
        />
      </div>

      {/* Insight cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            num: "01",
            title: "Alignment lowers variance",
            body: "At low sample counts (n < 30), aligned methods show tighter confidence intervals. They are more reliable estimates of true performance.",
            accent: "#1E6B5C",
          },
          {
            num: "02",
            title: "Raw eventually catches up",
            body: "With sufficient calibration data, raw features achieve similar accuracy. Alignment trades sample efficiency, not accuracy ceiling.",
            accent: "#1B3F7A",
          },
          {
            num: "03",
            title: "Moving average undershoots",
            body: "Temporal adaptation degrades performance when the adaptation rate exceeds the actual drift timescale, over-adapting to transient noise.",
            accent: "#B8832A",
          },
        ].map(({ num, title, body, accent }) => (
          <div key={num} className="p-5 border border-stone rounded-xl">
            <div className="text-xs font-mono mb-3" style={{ color: accent }}>{num}</div>
            <div className="text-xs font-semibold text-ink mb-2">{title}</div>
            <p className="text-xs text-mist leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      {/* Central finding */}
      <div
        className="p-5 border rounded-xl"
        style={{ borderColor: "rgba(30,107,92,0.25)", background: "rgba(30,107,92,0.05)" }}
      >
        <div className="text-xs font-mono text-mist/60 mb-2">Central finding</div>
        <p className="text-sm text-dim leading-relaxed italic">
          "Personalization reduces calibration burden. It stabilizes performance with fewer samples.
          It does not raise the accuracy ceiling. The underlying signal-to-noise ratio of the task
          remains the binding constraint."
        </p>
      </div>
    </div>
  );
}
