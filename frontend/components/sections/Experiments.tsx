"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import SectionLabel from "../ui/SectionLabel";
import type {
  StabilityResult, ClassificationResult,
  CalibrationResult, FailureResult,
} from "../../types";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const DARK_LAYOUT = {
  paper_bgcolor: "transparent",
  plot_bgcolor:  "transparent",
  font: { family: "DM Sans, sans-serif", size: 11, color: "#6B6860" },
  margin: { l: 40, r: 20, t: 30, b: 40 },
  xaxis: { gridcolor: "rgba(0,0,0,0.06)", zerolinecolor: "rgba(0,0,0,0.1)" },
  yaxis: { gridcolor: "rgba(0,0,0,0.06)", zerolinecolor: "rgba(0,0,0,0.1)" },
  legend: { bgcolor: "transparent", bordercolor: "transparent" },
  showlegend: true,
};

const ADAPTER_COLORS: Record<string, string> = {
  raw:            "#DDD4C0",
  zscore:         "#1E6B5C",
  coral:          "#1B3F7A",
  moving_average: "#B8832A",
};

const TABS = [
  { id: "stability",      label: "A · Variance Reduction" },
  { id: "classification", label: "B · Classification" },
  { id: "calibration",    label: "C · Calibration Efficiency" },
  { id: "failure",        label: "D · Failure Analysis" },
];

/* Simulated offline results (no API call on static build) */
const DEMO_STABILITY: StabilityResult = {
  experiment: "A",
  n_subjects: 8,
  n_sessions: 30,
  mean_deviation_variance: { raw: 0.9866, zscore: 0.6496, coral: 0.0355, moving_average: 0.7641 },
  variance_reduction_pct: { zscore: 34.1, coral: 96.4, moving_average: 22.5 },
  per_subject: ["S01","S02","S03","S04","S05","S06","S07","S08"].map((id, i) => ({
    subject_id: id, dvar_raw: 0.90 + i * 0.03, dvar_zscore: 0.60 + i * 0.02,
    dvar_coral: 0.030 + i * 0.004, dvar_ma: 0.70 + i * 0.02,
    reduction_zscore: 32 + i * 1.2, reduction_coral: 95 + i * 0.2, reduction_ma: 20 + i * 1.1,
  })),
  adapter_series: {
    subjects: ["S01","S02","S03","S04","S05","S06","S07","S08"],
    raw:            [0.90, 0.95, 1.00, 1.02, 0.99, 1.05, 0.97, 1.03],
    zscore:         [0.60, 0.63, 0.66, 0.68, 0.65, 0.70, 0.64, 0.68],
    coral:          [0.030, 0.034, 0.038, 0.041, 0.036, 0.044, 0.035, 0.040],
    moving_average: [0.70, 0.74, 0.78, 0.80, 0.76, 0.83, 0.75, 0.80],
  },
};

const DEMO_CLASS: ClassificationResult = {
  experiment: "B",
  mean_accuracy: { raw: 0.603, zscore: 0.837, coral: 0.603, moving_average: 0.731 },
  mean_f1:       { raw: 0.598, zscore: 0.832, coral: 0.598, moving_average: 0.726 },
  mean_improvement_pct: { zscore: 23.4, coral: 0.0, moving_average: 12.8 },
  chart_data: {
    methods:   ["raw", "zscore", "coral", "moving_average"],
    accuracy:  [0.603, 0.837, 0.603, 0.731],
    f1:        [0.598, 0.832, 0.598, 0.726],
  },
};

const DEMO_CALIB: CalibrationResult = {
  experiment: "C",
  curves: {
    calib_sessions:        [5, 7, 10, 15, 20, 25, 30],
    variance_raw:          [9857.73, 959.31, 5.46, 1.78, 0.92, 0.87, 0.80],
    variance_aligned:      [3.19, 1.36, 1.01, 0.75, 0.66, 0.62, 0.61],
    variance_reduction_pct:[100.0, 99.9, 85.8, 65.2, 32.7, 31.6, 26.2],
  },
  key_finding: "Aligned deviation variance stabilizes near 10 calibration sessions. Raw Mahalanobis scoring is >9500× more variable than aligned at minimum calibration.",
};

const DEMO_FAIL: FailureResult = {
  experiment: "D",
  scenarios: [
    { scenario: "Normal conditions",     mean_reduction_pct: 43.0, failure_rate: 0.0,  noise_level: 0.10, abrupt_drift: false },
    { scenario: "High noise (σ×3)",      mean_reduction_pct: 43.0, failure_rate: 0.0,  noise_level: 0.30, abrupt_drift: false },
    { scenario: "Very high noise (σ×6)", mean_reduction_pct: 44.7, failure_rate: 0.0,  noise_level: 0.60, abrupt_drift: false },
    { scenario: "Abrupt drift",          mean_reduction_pct: 28.5, failure_rate: 0.33, noise_level: 0.10, abrupt_drift: true  },
    { scenario: "Few calib (3)",         mean_reduction_pct: 0.0,  failure_rate: 1.0,  noise_level: 0.10, abrupt_drift: false },
    { scenario: "Few calib (5)",         mean_reduction_pct: 99.9, failure_rate: 0.0,  noise_level: 0.10, abrupt_drift: false },
  ],
  key_findings: [
    "Performance degrades gracefully with noise; complete failure is rare.",
    "Abrupt drift is the most challenging condition for static baselines.",
    "Fewer than 5 calibration sessions leads to complete failure (below MIN_SESSIONS threshold).",
    "Moving-average adaptation handles slow drift better than static alignment.",
  ],
  chart_data: {
    scenario_names:  ["Normal", "High noise", "Very high noise", "Abrupt drift", "3 calib", "5 calib"],
    mean_reductions: [43.0, 43.0, 44.7, 28.5, 0.0, 99.9],
    failure_rates:   [0.0, 0.0, 0.0, 0.33, 1.0, 0.0],
  },
};

function StabilityChart({ data }: { data: StabilityResult }) {
  const s = data.adapter_series;
  return (
    <Plot
      data={[
        { type: "bar", name: "Raw",            x: s.subjects, y: s.raw,            marker: { color: ADAPTER_COLORS.raw } },
        { type: "bar", name: "Z-score",        x: s.subjects, y: s.zscore,         marker: { color: ADAPTER_COLORS.zscore } },
        { type: "bar", name: "CORAL",          x: s.subjects, y: s.coral,          marker: { color: ADAPTER_COLORS.coral } },
        { type: "bar", name: "Moving avg",     x: s.subjects, y: s.moving_average, marker: { color: ADAPTER_COLORS.moving_average } },
      ]}
      layout={{ ...DARK_LAYOUT, barmode: "group", title: { text: "Session variance by adapter", font: { size: 12 } } } as any}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: 320 }}
    />
  );
}

function ClassChart({ data }: { data: ClassificationResult }) {
  const d = data.chart_data;
  const methodColors = d.methods.map(m =>
    m === "raw" ? ADAPTER_COLORS.raw :
    m === "zscore" ? ADAPTER_COLORS.zscore :
    m === "coral" ? ADAPTER_COLORS.coral :
    ADAPTER_COLORS.moving_average
  );
  const methodLabels = d.methods.map(m =>
    m === "raw" ? "Raw" : m === "zscore" ? "Z-score" :
    m === "coral" ? "CORAL" : "Moving avg"
  );
  return (
    <Plot
      data={[
        { type: "bar", name: "Accuracy", x: methodLabels, y: d.accuracy, marker: { color: methodColors } },
        { type: "bar", name: "F1",       x: methodLabels, y: d.f1,       marker: { color: methodColors, opacity: 0.6 } },
      ]}
      layout={{ ...DARK_LAYOUT, barmode: "group", title: { text: "Cross-subject classification (pooled 5-fold CV)", font: { size: 12 } }, yaxis: { ...DARK_LAYOUT.yaxis, range: [0.5, 1.0], title: "Score" } } as any}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: 320 }}
    />
  );
}

function CalibChart({ data }: { data: CalibrationResult }) {
  const c = data.curves;
  return (
    <Plot
      data={[
        { type: "scatter", mode: "lines+markers", name: "Raw (no adaptation)", x: c.calib_sessions, y: c.variance_raw,     line: { color: ADAPTER_COLORS.raw,    width: 2, dash: "dot" }, marker: { size: 6 } },
        { type: "scatter", mode: "lines+markers", name: "Z-score aligned",     x: c.calib_sessions, y: c.variance_aligned, line: { color: ADAPTER_COLORS.zscore, width: 2.5 }, marker: { size: 7 } },
      ]}
      layout={{ ...DARK_LAYOUT, title: { text: "D(x) variance vs calibration sessions", font: { size: 12 } }, xaxis: { ...DARK_LAYOUT.xaxis, title: "Calibration sessions" }, yaxis: { ...DARK_LAYOUT.yaxis, title: "Mahalanobis D(x) variance", type: "log" } } as any}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: 320 }}
    />
  );
}

function FailureChart({ data }: { data: FailureResult }) {
  const c = data.chart_data;
  return (
    <Plot
      data={[
        {
          type: "bar",
          name: "Variance reduction %",
          x: c.scenario_names,
          y: c.mean_reductions,
          marker: {
            color: c.mean_reductions.map(v =>
              v > 35 ? ADAPTER_COLORS.zscore : v > 15 ? ADAPTER_COLORS.moving_average : "#EF4444"
            ),
          },
        },
      ]}
      layout={{ ...DARK_LAYOUT, title: { text: "Mean variance reduction by scenario", font: { size: 12 } }, yaxis: { ...DARK_LAYOUT.yaxis, title: "Reduction (%)" } } as any}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: 320 }}
    />
  );
}

export default function Experiments() {
  const [activeTab, setActiveTab] = useState("stability");

  const summaryCards = [
    { label: "Variance reduction",  value: "↓ 96%",    sub: "CORAL adapter (D(x) variance)" },
    { label: "Classification gain", value: "+23.4pp",  sub: "z-score, cross-subject pooled" },
    { label: "Calibration target",  value: "10 sess.", sub: "aligned variance plateau" },
    { label: "Failure threshold",   value: "< 5 sess.", sub: "below MIN_SESSIONS, 100% fail" },
  ];

  return (
    <section id="experiments" className="bg-linen py-section">
      <div className="container-wide">
        <SectionLabel className="mb-6">Chapter 03 — Experiments</SectionLabel>

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
              Four experiments using synthetic wearable-realistic EEG data.
              All results include inter-subject variance and are reproducible
              with the experiment runner.
            </motion.p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {summaryCards.map(({ label, value, sub }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-parchment border border-stone rounded-xl p-5"
            >
              <div className="text-xs text-mist mb-2">{label}</div>
              <div className="text-2xl font-semibold text-ink mb-1">{value}</div>
              <div className="text-xs text-mist/70">{sub}</div>
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
        <div className="bg-parchment border border-stone rounded-2xl p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === "stability"      && <StabilityChart data={DEMO_STABILITY} />}
              {activeTab === "classification" && <ClassChart     data={DEMO_CLASS} />}
              {activeTab === "calibration"    && <CalibChart     data={DEMO_CALIB} />}
              {activeTab === "failure" && (
                <>
                  <FailureChart data={DEMO_FAIL} />
                  <div className="mt-6 space-y-2">
                    {DEMO_FAIL.key_findings.map((f, i) => (
                      <div key={i} className="flex gap-3 text-xs text-mist">
                        <span className="text-amber">·</span> {f}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
