"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import SectionLabel from "../ui/SectionLabel";

import type { PlotParams } from "react-plotly.js";
const Plot = dynamic<PlotParams>(() => import("react-plotly.js"), { ssr: false });

// ── Real BNCI Horizon 2020 results ────────────────────────────────────────────
// Dataset: 001-2014 · Subject A01 · Train: A01T · Test: A01E (future session)
// Channels: C3, C4, CP3, CP4 (4-channel wearable-constrained subset)
// Features: theta power, alpha power, beta power, temporal variance
// Classifier: logistic regression

const METHODS     = ["Raw",    "Cov. Whitening", "Moving Avg"];
const SHIFT       = [4.06,    0.22,              0.55];
const ACCURACY    = [0.576,   0.576,             0.514];
const METHOD_COLORS = ["#DDD4C0", "#1E6B5C",    "#B8832A"];

const LIGHT_LAYOUT = {
  paper_bgcolor: "transparent",
  plot_bgcolor:  "transparent",
  font: { family: "DM Sans, sans-serif", size: 11, color: "#6B6860" },
  margin: { l: 44, r: 24, t: 40, b: 44 },
  xaxis: { gridcolor: "rgba(0,0,0,0.06)", zerolinecolor: "rgba(0,0,0,0.08)" },
  yaxis: { gridcolor: "rgba(0,0,0,0.06)", zerolinecolor: "rgba(0,0,0,0.08)" },
  showlegend: false,
};

const TABS = [
  { id: "drift",    label: "A · Longitudinal Drift" },
  { id: "accuracy", label: "B · Classification Accuracy" },
  { id: "protocol", label: "C · Evaluation Protocol" },
];

// ── Drift chart — the central visual ─────────────────────────────────────────
function DriftChart() {
  return (
    <div>
      <Plot
        data={[
          {
            type: "bar",
            x: METHODS,
            y: SHIFT,
            marker: {
              color: METHOD_COLORS,
              line: { color: "rgba(0,0,0,0.08)", width: 1 },
            },
            text: SHIFT.map((v, i) =>
              i === 0
                ? `${v}`
                : `${v}<br><span style="font-size:10px">↓ ${((1 - v / SHIFT[0]) * 100).toFixed(1)}%</span>`
            ),
            textposition: "outside" as const,
            textfont: { size: 13, color: "#3A3830" },
            hovertemplate: "%{x}<br>Feature shift: %{y:.2f}<extra></extra>",
          },
        ]}
        layout={{
          ...LIGHT_LAYOUT,
          yaxis: {
            ...LIGHT_LAYOUT.yaxis,
            title: { text: "Longitudinal feature shift (L₂)", font: { size: 11 } },
            range: [0, 4.9],
          },
          annotations: [
            {
              x: "Cov. Whitening", y: 4.7,
              text: "94.6% reduction",
              showarrow: false,
              font: { size: 10, color: "#1E6B5C" },
              xanchor: "center" as const,
            },
          ],
        } as any}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height: 340 }}
      />
      <p className="text-xs text-mist mt-4 leading-relaxed max-w-2xl">
        Feature shift measured as L₂ distance between session-mean feature vectors
        (train A01T vs test A01E). Covariance whitening reduced longitudinal instability
        by 94.6%, from 4.06 to 0.22. Moving-average adaptation achieved moderate
        reduction (86.5%). This is the clearest finding in the evaluation.
      </p>
    </div>
  );
}

// ── Accuracy chart ────────────────────────────────────────────────────────────
function AccuracyChart() {
  return (
    <div>
      <Plot
        data={[
          {
            type: "bar",
            x: METHODS,
            y: ACCURACY,
            marker: {
              color: METHOD_COLORS,
              line: { color: "rgba(0,0,0,0.08)", width: 1 },
            },
            text: ACCURACY.map(v => `${(v * 100).toFixed(1)}%`),
            textposition: "outside" as const,
            textfont: { size: 13, color: "#3A3830" },
            hovertemplate: "%{x}<br>Accuracy: %{y:.3f}<extra></extra>",
          },
        ]}
        layout={{
          ...LIGHT_LAYOUT,
          yaxis: {
            ...LIGHT_LAYOUT.yaxis,
            title: { text: "Classification accuracy", font: { size: 11 } },
            range: [0.44, 0.66],
          },
          shapes: [
            {
              type: "line",
              x0: -0.5, x1: 2.5,
              y0: 0.5, y1: 0.5,
              line: { color: "rgba(0,0,0,0.15)", width: 1, dash: "dot" },
            },
          ],
          annotations: [
            {
              x: 2.3, y: 0.503,
              text: "chance",
              showarrow: false,
              font: { size: 9, color: "#9B9790" },
              xanchor: "right" as const,
            },
          ],
        } as any}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height: 340 }}
      />
      <p className="text-xs text-mist mt-4 leading-relaxed max-w-2xl">
        Despite 94.6% reduction in longitudinal feature shift, covariance whitening
        did not improve downstream decoding accuracy (57.6% in both raw and whitened
        conditions). Moving-average adaptation reduced accuracy to 51.4%. This dissociation
        between feature stability and decoding performance is the central finding,
        and the central limitation, of this evaluation.
      </p>
    </div>
  );
}

// ── Protocol panel ────────────────────────────────────────────────────────────
function ProtocolPanel() {
  const features = ["Theta band power (4–8 Hz)", "Alpha band power (8–13 Hz)", "Beta band power (13–30 Hz)", "Temporal variance"];
  const channels = ["C3", "C4", "CP3", "CP4"];

  return (
    <div className="grid md:grid-cols-2 gap-10">
      {/* Left: pipeline */}
      <div>
        <div className="text-xs font-mono text-mist mb-6">Evaluation pipeline</div>
        <div className="space-y-0">
          {[
            { label: "Dataset", value: "BNCI Horizon 2020 · 001-2014", color: "#1B3F7A" },
            { label: "Training session", value: "A01T  (calibration)", color: "#1E6B5C" },
            { label: "Test session", value: "A01E  (future, unseen)", color: "#B8832A" },
            { label: "Task", value: "Binary motor imagery", color: "#0C1740" },
            { label: "Classifier", value: "Logistic regression", color: "#6B6860" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="flex items-start gap-4 py-3 border-b border-stone last:border-0"
            >
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
              <div>
                <div className="text-xs font-mono text-mist/70 mb-0.5">{label}</div>
                <div className="text-sm text-dim">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: channels + features */}
      <div>
        <div className="text-xs font-mono text-mist mb-6">Wearable-constrained setup</div>

        <div className="mb-6">
          <div className="text-xs text-mist/70 mb-3">Channels (4-channel subset)</div>
          <div className="flex gap-2 flex-wrap">
            {channels.map(ch => (
              <span
                key={ch}
                className="text-xs font-mono px-3 py-1.5 rounded border border-teal/30 text-teal bg-teal/5"
              >
                {ch}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="text-xs text-mist/70 mb-3">Features per channel</div>
          <div className="space-y-2">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-dim">
                <span className="text-mist/40 font-mono w-4">{String(i + 1).padStart(2, "0")}</span>
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border border-stone rounded-xl bg-parchment/60">
          <div className="text-xs text-mist/60 mb-1">Leakage prevention</div>
          <p className="text-xs text-dim leading-relaxed">
            Adaptation statistics are fit exclusively on A01T. Test session A01E
            is never seen during calibration. No temporal leakage.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Experiments ───────────────────────────────────────────────────────────────
export default function Experiments() {
  const [activeTab, setActiveTab] = useState("drift");

  const summaryCards = [
    {
      label: "Feature Shift, Raw",
      value: "4.06",
      sub: "L₂ drift, A01T→A01E",
      accent: "#DDD4C0",
    },
    {
      label: "Feature Shift, Whitened",
      value: "0.22",
      sub: "↓ 94.6% reduction",
      accent: "#1E6B5C",
    },
    {
      label: "Classification Accuracy",
      value: "57.6%",
      sub: "raw = whitened (no decoding gain)",
      accent: "#1B3F7A",
    },
    {
      label: "Moving Avg Accuracy",
      value: "51.4%",
      sub: "adaptation reduced performance",
      accent: "#B8832A",
    },
  ];

  return (
    <section id="experiments" className="bg-linen py-section">
      <div className="container-wide">
        <SectionLabel className="mb-6">Chapter 03. Experiments</SectionLabel>

        <div className="flex flex-col md:flex-row gap-16 mb-16">
          <div className="md:w-1/2">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="headline text-ink"
            >
              What the data shows
            </motion.h2>
          </div>
          <div className="md:w-1/2 flex items-end">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-sm text-mist leading-relaxed"
            >
              Evaluated on real EEG data from BNCI Horizon 2020 (dataset 001-2014),
              subject A01, trained on session A01T and evaluated on future session A01E.
              A 4-channel wearable-constrained subset was used to simulate realistic
              deployment conditions.
            </motion.p>
          </div>
        </div>

        {/* Key finding callout */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-12 p-6 border border-stone rounded-xl bg-parchment/60"
        >
          <div className="text-xs font-mono text-mist/60 mb-2">Central finding</div>
          <p className="text-sm text-dim leading-relaxed italic max-w-3xl">
            "Covariance normalization substantially reduced longitudinal feature instability,
            though reduced drift did not necessarily improve downstream decoding accuracy."
          </p>
        </motion.div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {summaryCards.map(({ label, value, sub, accent }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.6 }}
              className="bg-parchment border border-stone rounded-xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                <div className="text-xs text-mist leading-tight">{label}</div>
              </div>
              <div className="text-2xl font-light text-ink tracking-tight mb-1">{value}</div>
              <div className="text-xs text-mist/70 leading-snug">{sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap text-xs font-medium px-4 py-2 rounded-full border transition-all
                ${activeTab === tab.id
                  ? "bg-ink text-parchment border-ink"
                  : "bg-transparent text-mist border-stone hover:border-dim"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Chart panels */}
        <div className="bg-parchment border border-stone rounded-2xl p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === "drift"    && <DriftChart />}
              {activeTab === "accuracy" && <AccuracyChart />}
              {activeTab === "protocol" && <ProtocolPanel />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Interpretation note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-8 grid md:grid-cols-3 gap-4"
        >
          {[
            {
              num: "01",
              title: "Drift was real and measurable",
              body: "Raw feature shift of 4.06 confirms longitudinal instability under wearable constraints. This is the core problem Baseline is designed to address.",
            },
            {
              num: "02",
              title: "Whitening stabilized features",
              body: "Covariance normalization reduced shift from 4.06 to 0.22, a 94.6% reduction, demonstrating effective statistical alignment.",
            },
            {
              num: "03",
              title: "Accuracy was not improved",
              body: "Feature stabilization did not translate to decoding gains. This dissociation suggests the downstream model absorbed the remaining variance independently.",
            },
          ].map(({ num, title, body }) => (
            <div key={num} className="p-5 border border-stone rounded-xl">
              <div className="text-xs font-mono text-mist/50 mb-3">{num}</div>
              <div className="text-xs font-semibold text-ink mb-2">{title}</div>
              <p className="text-xs text-mist leading-relaxed">{body}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
