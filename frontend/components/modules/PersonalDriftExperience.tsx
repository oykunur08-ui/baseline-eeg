"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import type { PlotParams } from "react-plotly.js";
import {
  makeRng, sampleGaussian, fisherRatio1D, type EEGSession, type Point2D,
} from "../../lib/eeg-simulation";

const Plot = dynamic<PlotParams>(() => import("react-plotly.js"), { ssr: false });

type Phase = 0 | 1 | 2;

const PHASE_LABELS = [
  "Calibration baseline",
  "Session shift (drift)",
  "Alignment applied",
];

const PHASE_DESCRIPTIONS = [
  "Your neural distribution is captured during a brief calibration phase. Two feature clusters (Class A and B) are established in a reference position.",
  "In a new session, the entire distribution has shifted. Electrode impedance changed, you slept differently, time has passed. The classifier trained on session 1 now sees a different signal.",
  "Alignment removes the centroid shift. The clusters return to approximately their calibration position. But look at the class overlap. It is identical to session 1.",
];

function generatePhaseData(phase: Phase): EEGSession {
  const rng = makeRng(phase === 0 ? 1 : phase === 1 ? 2 : 3);
  const classGap = 1.1;
  const noise = 0.65;

  // Phase 0: baseline at origin
  // Phase 1: shifted by drift vector
  // Phase 2: drift removed (back near origin), same noise
  const driftX = phase === 1 ? 2.8 : 0;
  const driftY = phase === 1 ? 1.4 : 0;

  const N = 35;
  const class0: Point2D[] = [];
  const class1: Point2D[] = [];

  for (let i = 0; i < N; i++) {
    class0.push([
      sampleGaussian(rng, -classGap + driftX, noise),
      sampleGaussian(rng, 0.15 + driftY, noise * 0.9),
    ]);
    class1.push([
      sampleGaussian(rng, +classGap + driftX, noise),
      sampleGaussian(rng, -0.15 + driftY, noise * 0.9),
    ]);
  }

  const all = [...class0, ...class1];
  const cx = all.reduce((a, p) => a + p[0], 0) / all.length;
  const cy = all.reduce((a, p) => a + p[1], 0) / all.length;
  return { index: phase, class0, class1, centroid: [cx, cy] };
}

const PHASE_COLORS: Record<Phase, string> = {
  0: "#1B3F7A",
  1: "#B8832A",
  2: "#1E6B5C",
};

function PhaseChart({ session, phase }: { session: EEGSession; phase: Phase }) {
  const color = PHASE_COLORS[phase];

  const traces: object[] = [
    {
      type: "scatter", mode: "markers",
      x: session.class0.map((p: Point2D) => p[0]),
      y: session.class0.map((p: Point2D) => p[1]),
      marker: { color, size: 7, symbol: "circle", opacity: 0.75, line: { color: "rgba(0,0,0,0.2)", width: 1 } },
      name: "Class A", hovertemplate: "Class A<extra></extra>",
    },
    {
      type: "scatter", mode: "markers",
      x: session.class1.map((p: Point2D) => p[0]),
      y: session.class1.map((p: Point2D) => p[1]),
      marker: { color, size: 7, symbol: "diamond", opacity: 0.75, line: { color: "rgba(0,0,0,0.2)", width: 1 } },
      name: "Class B", hovertemplate: "Class B<extra></extra>",
    },
    // Centroid marker
    {
      type: "scatter", mode: "markers",
      x: [session.centroid[0]],
      y: [session.centroid[1]],
      marker: { color: "rgba(14,17,23,0.7)", size: 10, symbol: "cross", line: { width: 2, color: "rgba(14,17,23,0.7)" } },
      name: "Centroid", showlegend: false,
      hovertemplate: `Centroid (${session.centroid[0].toFixed(2)}, ${session.centroid[1].toFixed(2)})<extra></extra>`,
    },
  ];

  const axisRange = [-4.2, 4.2];

  return (
    <Plot
      data={traces as any}
      layout={{
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { family: "DM Mono, monospace", size: 10, color: "#6B6860" },
        margin: { l: 36, r: 16, t: 16, b: 36 },
        xaxis: {
          gridcolor: "rgba(0,0,0,0.06)",
          zerolinecolor: "rgba(0,0,0,0.1)",
          range: axisRange,
          title: { text: "Feature 1", font: { size: 10 } },
        },
        yaxis: {
          gridcolor: "rgba(0,0,0,0.06)",
          zerolinecolor: "rgba(0,0,0,0.1)",
          range: axisRange,
          title: { text: "Feature 2", font: { size: 10 } },
        },
        legend: { bgcolor: "transparent", font: { size: 9 }, x: 0.02, y: 0.98 },
        // Draw reference box from session 0 calibration region
        shapes: phase > 0
          ? [{
              type: "rect", x0: -3.2, x1: 3.2, y0: -3.2, y1: 3.2,
              line: { color: "rgba(27,63,122,0.3)", width: 1, dash: "dot" },
              fillcolor: "rgba(27,63,122,0.04)",
            }]
          : [],
        annotations: phase > 0
          ? [{
              x: -3.1, y: 3.1, text: "calibration region", showarrow: false,
              font: { size: 8, color: "rgba(27,63,122,0.6)" }, xanchor: "left",
            }]
          : [],
      } as any}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: 300 }}
    />
  );
}

export default function PersonalDriftExperience() {
  const [phase, setPhase] = useState<Phase>(0);

  const session = useMemo(() => generatePhaseData(phase), [phase]);

  const fisher = useMemo(() => {
    // Compute Fisher ratio across all three phases for comparison
    const phases: Phase[] = [0, 1, 2];
    return phases.map((p) => {
      const s = generatePhaseData(p);
      return fisherRatio1D([s])[0];
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 border border-stone rounded-xl bg-linen/50">
        <div className="text-xs font-mono text-mist/50 mt-0.5 flex-shrink-0">NOTE</div>
        <p className="text-xs text-mist leading-relaxed">
          Conceptual simulation only. No EEG signal is recorded or analyzed.
          This demonstrates the mathematical structure of longitudinal distribution shift,
          not a diagnosis, prediction, or personal measurement of any kind.
        </p>
      </div>

      <p className="text-sm text-mist leading-relaxed max-w-2xl">
        Step through three phases to understand what happens to a neural feature distribution
        across sessions, and what alignment can and cannot fix.
      </p>

      {/* Phase stepper */}
      <div className="flex gap-2 flex-wrap">
        {([0, 1, 2] as Phase[]).map((p) => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            className={`flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full border transition-all ${
              phase === p
                ? "border-teal text-teal bg-teal/10"
                : "border-stone text-mist hover:border-dim"
            }`}
          >
            <span className="font-mono opacity-50">{String(p + 1).padStart(2, "0")}</span>
            {PHASE_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Phase description */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="p-5 border rounded-xl"
          style={{ borderColor: PHASE_COLORS[phase] + "40", background: PHASE_COLORS[phase] + "0A" }}
        >
          <div
            className="text-xs font-mono mb-2"
            style={{ color: PHASE_COLORS[phase] + "BB" }}
          >
            Phase {phase + 1}. {PHASE_LABELS[phase]}
          </div>
          <p className="text-sm text-dim leading-relaxed">
            {PHASE_DESCRIPTIONS[phase]}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Chart */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="border border-stone rounded-xl p-4 overflow-hidden"
        >
          <PhaseChart session={session} phase={phase} />
        </motion.div>
      </AnimatePresence>

      {/* Fisher ratio across phases */}
      <div className="grid grid-cols-3 gap-3">
        {([0, 1, 2] as Phase[]).map((p) => (
          <div
            key={p}
            className="p-4 border rounded-xl transition-all"
            style={{
              borderColor: phase === p ? PHASE_COLORS[p] + "50" : "var(--stone)",
              background: phase === p ? PHASE_COLORS[p] + "08" : "transparent",
            }}
          >
            <div className="text-xs font-mono mb-2" style={{ color: PHASE_COLORS[p] + "99" }}>
              Phase {p + 1}
            </div>
            <div className="text-lg font-light text-ink">{fisher[p].toFixed(2)}</div>
            <div className="text-xs text-mist/60 mt-1">Fisher ratio</div>
          </div>
        ))}
      </div>

      {/* Invariance insight */}
      <div
        className="p-5 border rounded-xl"
        style={{ borderColor: "rgba(30,107,92,0.3)", background: "rgba(30,107,92,0.05)" }}
      >
        <div className="text-xs font-mono text-mist/60 mb-2">The invariance</div>
        <p className="text-sm text-dim leading-relaxed">
          The Fisher ratio across all three phases is approximately {fisher[0].toFixed(2)}, {fisher[1].toFixed(2)}, {fisher[2].toFixed(2)}.
          Class separability does not change as the distribution shifts, and it does not improve when alignment
          is applied. The underlying task difficulty, how mixed the two classes are, is
          a property of the signal, not the coordinate system.
        </p>
      </div>

      {/* Navigation hint */}
      {phase < 2 && (
        <div className="flex justify-end">
          <button
            onClick={() => setPhase((p) => Math.min(p + 1, 2) as Phase)}
            className="text-xs text-mist hover:text-dim transition-colors"
          >
            Next phase →
          </button>
        </div>
      )}
    </div>
  );
}
