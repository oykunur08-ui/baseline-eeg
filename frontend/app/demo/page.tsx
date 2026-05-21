"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const DARK_LAYOUT = {
  paper_bgcolor: "rgba(22,27,40,1)",
  plot_bgcolor:  "rgba(22,27,40,1)",
  font: { family: "DM Sans, sans-serif", size: 11, color: "#6B7280" },
  margin: { l: 40, r: 20, t: 30, b: 40 },
  xaxis: { gridcolor: "rgba(255,255,255,0.05)" },
  yaxis: { gridcolor: "rgba(255,255,255,0.05)" },
  legend: { bgcolor: "transparent" },
};

type Tab = "stability" | "classification" | "calibration" | "failure";

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("stability");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  const runExperiment = async (tab: Tab) => {
    setActiveTab(tab);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/experiments/${tab}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(prev => ({ ...(prev ?? {}), [tab]: data }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Could not reach API: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: "stability",      label: "Variance Reduction" },
    { id: "classification", label: "Classification" },
    { id: "calibration",    label: "Calibration Efficiency" },
    { id: "failure",        label: "Failure Analysis" },
  ];

  const current = results?.[activeTab] as Record<string, unknown> | undefined;

  return (
    <div className="min-h-screen bg-dark-bg text-parchment font-sans">
      {/* Header */}
      <div className="border-b border-dark-border">
        <div className="container-wide flex items-center justify-between h-14">
          <Link href="/" className="text-xs font-semibold text-dark-muted hover:text-parchment transition-colors">
            ← BASELINE
          </Link>
          <div className="section-label text-dark-muted">Experiment Runner</div>
          <div className="w-20" />
        </div>
      </div>

      <div className="container-wide py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-light text-parchment mb-2">Live Experiments</h1>
          <p className="text-sm text-dark-muted">
            Connect to the FastAPI backend and run evaluation experiments in real time.
          </p>
        </div>

        {/* Connection status */}
        <div className="bg-dark-surface border border-dark-border rounded-xl p-4 mb-8 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
          <span className="text-xs text-dark-muted">
            API endpoint: <code className="text-teal/80 font-mono">{API}</code>
          </span>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => runExperiment(tab.id)}
              disabled={loading}
              className={`text-xs font-medium px-4 py-2 rounded-full border transition-all disabled:opacity-50
                ${activeTab === tab.id
                  ? "bg-teal text-dark-bg border-teal"
                  : "border-dark-border text-dark-muted hover:border-dark-muted"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-900/40 rounded-xl p-4 mb-6 text-xs text-red-300">
            {error} — Make sure the backend is running with{" "}
            <code className="font-mono">uvicorn api.main:app --reload</code>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 py-8">
            <div className="w-5 h-5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-dark-muted">Running experiment…</span>
          </div>
        )}

        {/* Results */}
        <AnimatePresence mode="wait">
          {!loading && current && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* JSON preview */}
              <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-dark-border flex items-center justify-between">
                  <span className="text-xs font-mono text-dark-muted">Result JSON</span>
                </div>
                <pre className="p-4 text-xs font-mono text-parchment/70 overflow-auto max-h-80 leading-relaxed">
                  {JSON.stringify(current, null, 2)}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && !current && !error && (
          <div className="py-16 text-center text-dark-muted text-sm">
            Select an experiment above to run it against the backend.
          </div>
        )}
      </div>
    </div>
  );
}
