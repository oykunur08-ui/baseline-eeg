"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import SectionLabel from "../ui/SectionLabel";

import type { PlotParams } from "react-plotly.js";
const Plot = dynamic<PlotParams>(() => import("react-plotly.js"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const DARK_LAYOUT = {
  paper_bgcolor: "transparent", plot_bgcolor: "transparent",
  font: { family: "DM Sans, sans-serif", size: 11, color: "#9E9B96" },
  margin: { l: 40, r: 20, t: 30, b: 40 },
  xaxis: { gridcolor: "rgba(0,0,0,0.06)" },
  yaxis: { gridcolor: "rgba(0,0,0,0.06)" },
  showlegend: true, legend: { bgcolor: "transparent" },
};

type State = "idle" | "loading" | "done" | "error";

interface DriftData {
  session_indices: number[];
  mahal_distances: number[];
  deviation_labels: string[];
}

const LABEL_COLORS: Record<string, string> = {
  stable: "#1E6B5C", mild: "#B8832A", moderate: "#F97316", high: "#EF4444",
};

export default function DemoPanel() {
  const [state, setState] = useState<State>("idle");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [drift, setDrift] = useState<DriftData | null>(null);
  const [error, setError] = useState("");
  const [nSessions, setNSessions] = useState(30);

  const generateData = async () => {
    setState("loading");
    setError("");
    try {
      const res = await fetch(`${API}/api/data/generate-synthetic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n_sessions: nSessions, load_to_db: true }),
      });
      if (!res.ok) throw new Error("Failed to generate data");

      const listRes = await fetch(`${API}/api/data/subjects`);
      const listData = await listRes.json();
      const names = listData.subjects.map((s: { user_id: string }) => s.user_id);
      setSubjects(names);
      setSelectedSubject(names[0] ?? "");
      setState("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setState("error");
    }
  };

  const buildAndVisualize = async () => {
    if (!selectedSubject) return;
    setState("loading");
    try {
      await fetch(`${API}/api/baseline/fit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedSubject, adapter: "zscore" }),
      });
      const profileRes = await fetch(`${API}/api/baseline/profile/${selectedSubject}`);
      const profile = await profileRes.json();
      setDrift(profile.deviation_series);
      setState("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setState("error");
    }
  };

  return (
    <section id="demo" className="bg-dark-bg py-section">
      <div className="container-wide">
        <SectionLabel light className="mb-6">Chapter 04 — Drift Simulation</SectionLabel>

        <div className="flex flex-col md:flex-row gap-16 mb-16">
          <div className="md:w-1/2">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="headline text-parchment"
            >
              Simulate longitudinal drift
            </motion.h2>
          </div>
          <div className="md:w-1/2 flex items-end">
            <p className="text-sm text-parchment/60 leading-relaxed">
              Synthetic EEG feature distributions, sampled under parametric longitudinal
              drift, allow direct observation of how alignment strategies behave across
              simulated sessions — independent of real participant data. Backed by the
              BASELINE adaptation pipeline — run{" "}
              <code className="font-mono text-teal text-xs">uvicorn api.main:app</code>{" "}
              to enable the simulation engine.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {/* Step 1: Generate */}
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
            <div className="text-xs font-mono text-parchment/50 mb-4">01 / Initialize profiles</div>
            <div className="mb-4">
              <label className="text-xs text-parchment/60 block mb-2">Sessions per profile</label>
              <input
                type="range" min={10} max={50} value={nSessions} step={5}
                onChange={e => setNSessions(Number(e.target.value))}
                className="w-full accent-teal"
              />
              <div className="text-xs text-teal text-right mt-1">{nSessions}</div>
            </div>
            <button
              onClick={generateData}
              disabled={state === "loading"}
              className="w-full py-2.5 text-xs font-semibold border border-teal/40 text-teal
                         rounded-xl hover:bg-teal/10 transition-colors disabled:opacity-40"
            >
              {state === "loading" ? "Initializing…" : "Initialize synthetic profiles"}
            </button>
          </div>

          {/* Step 2: Select + fit */}
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
            <div className="text-xs font-mono text-parchment/50 mb-4">02 / Select profile</div>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              disabled={subjects.length === 0}
              className="w-full bg-dark-card text-parchment border border-dark-border
                         rounded-lg px-3 py-2 text-xs mb-4 disabled:opacity-40"
            >
              {subjects.length === 0 && <option>Initialize profiles first</option>}
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={buildAndVisualize}
              disabled={!selectedSubject || state === "loading"}
              className="w-full py-2.5 text-xs font-semibold border border-parchment/20 text-parchment/80
                         rounded-xl hover:bg-parchment/5 transition-colors disabled:opacity-40"
            >
              Fit baseline & visualize
            </button>
          </div>

          {/* Step 3: Status */}
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
            <div className="text-xs font-mono text-parchment/50 mb-4">03 / Status</div>
            <AnimatePresence mode="wait">
              {state === "idle" && (
                <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-parchment/50">
                  Initialize synthetic profiles to begin.
                </motion.p>
              )}
              {state === "loading" && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-teal">Processing…</span>
                </motion.div>
              )}
              {state === "done" && (
                <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-xs text-teal font-semibold mb-2">✓ Ready</div>
                  {subjects.length > 0 && (
                    <div className="text-xs text-parchment/60">
                      {subjects.length} synthetic profiles loaded
                    </div>
                  )}
                  {drift && (
                    <div className="text-xs text-parchment/60 mt-1">
                      {drift.mahal_distances.length} simulated sessions
                    </div>
                  )}
                </motion.div>
              )}
              {state === "error" && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-xs text-red-400 font-semibold mb-1">Simulation engine offline</div>
                  <div className="text-xs text-parchment/60">{error}</div>
                  <div className="text-xs text-parchment/60 mt-2">
                    Start the BASELINE backend:{" "}
                    <code className="font-mono text-teal/70">uvicorn api.main:app</code>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Drift visualization */}
        <AnimatePresence>
          {drift && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-dark-surface border border-dark-border rounded-2xl p-6"
            >
              <div className="text-xs font-mono text-parchment/50 mb-4">
                Synthetic drift trajectory · {selectedSubject}
                <span className="ml-3 text-parchment/25">— simulated profile</span>
              </div>
              <Plot
                data={[
                  {
                    type: "scatter",
                    mode: "lines+markers",
                    x: drift.session_indices,
                    y: drift.mahal_distances,
                    line: { color: "#1E6B5C", width: 2 },
                    marker: {
                      size: 8,
                      color: drift.deviation_labels.map(l => LABEL_COLORS[l] ?? "#9CA3AF"),
                      line: { color: "rgba(0,0,0,0.3)", width: 1 },
                    },
                    name: "D(x)",
                    hovertemplate: "Session %{x}<br>D = %{y:.2f}<extra></extra>",
                  },
                ]}
                layout={{
                  ...DARK_LAYOUT,
                  xaxis: { ...DARK_LAYOUT.xaxis, title: "Session index" },
                  yaxis: { ...DARK_LAYOUT.yaxis, title: "Mahalanobis D(x)" },
                  shapes: [
                    { type: "rect", x0: 0, x1: drift.session_indices.at(-1) ?? 30, y0: 0,   y1: 1.5, fillcolor: "rgba(30,107,92,0.06)",  line: { width: 0 } },
                    { type: "rect", x0: 0, x1: drift.session_indices.at(-1) ?? 30, y0: 1.5, y1: 3.0, fillcolor: "rgba(184,131,42,0.06)", line: { width: 0 } },
                    { type: "rect", x0: 0, x1: drift.session_indices.at(-1) ?? 30, y0: 3.0, y1: 8.0, fillcolor: "rgba(239,68,68,0.04)",  line: { width: 0 } },
                  ],
                } as any}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: "100%", height: 300 }}
              />
              <div className="flex gap-6 mt-4 text-xs">
                {[["stable", "#1E6B5C"], ["mild", "#B8832A"], ["moderate", "#F97316"], ["high", "#EF4444"]].map(
                  ([label, color]) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-parchment/60 capitalize">{label}</span>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
