"use client";
import { motion } from "framer-motion";
import SectionLabel from "../ui/SectionLabel";

const STEPS = [
  {
    num: "01",
    title: "Baseline Learning",
    formula: "μ, Σ = fit(X_calib)",
    desc: "From calibration sessions, compute a subject-specific mean vector μ and regularized covariance Σ capturing the personal neural distribution.",
    color: "#1E6B5C",
  },
  {
    num: "02",
    title: "Embedding Alignment",
    formula: "z = Σ⁻¹/² (x − μ)",
    desc: "New sessions are projected into the personal embedding space. Mahalanobis distance from the baseline provides a deviation score that generalizes across feature scales.",
    color: "#1B3F7A",
  },
  {
    num: "03",
    title: "Longitudinal Adaptation",
    formula: "μₜ = (1−α)μₜ₋₁ + αxₜ",
    desc: "Slow drift is handled via exponential moving-average recalibration. The baseline gradually tracks the subject's evolving neural distribution without requiring full refit.",
    color: "#B8832A",
  },
  {
    num: "04",
    title: "Downstream Integration",
    formula: "f(z) → label",
    desc: "The aligned embedding z replaces raw features as input to any downstream classifier. No changes to model architecture required — Baseline is a drop-in layer.",
    color: "#0C1740",
  },
];

const SDK_CODE = `from sdk import Baseline

# Initialize with alignment strategy
bl = Baseline(adapter="zscore")

# Fit on calibration sessions (≥ 5 sessions)
bl.fit("alice", calibration_df)

# Transform new session into aligned space
result = bl.transform("alice", new_session)
print(result.mahal_distance)    # 1.24
print(result.deviation_label)   # "mild"
print(result.aligned_features)  # array([...])

# Evaluate alignment quality
report = bl.evaluate("alice")
print(report.variance_reduction)  # 42.1 %

# Uncertainty quantification
uncertainty = bl.get_uncertainty("alice", new_session)`;

export default function Theory() {
  return (
    <section id="theory" className="bg-parchment py-section">
      <div className="container-wide">
        <SectionLabel className="mb-6">Chapter 02 — Baseline Theory</SectionLabel>

        <div className="flex flex-col md:flex-row gap-16 mb-20">
          <div className="md:w-1/2">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="headline text-ink mb-6"
            >
              A performance infrastructure layer
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-sm text-mist leading-relaxed"
            >
              Baseline sits between raw EEG data and downstream ML models. It learns
              subject-specific distribution parameters during a brief calibration phase,
              then uses them to align future sessions into a stable embedding space.
              No neural network. No labeled training data per user. No architectural changes
              to existing pipelines.
            </motion.p>
          </div>

          {/* Architecture diagram */}
          <div className="md:w-1/2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="blueprint-grid rounded-2xl p-6 border border-stone"
            >
              <div className="flex flex-col gap-2">
                {[
                  { label: "Raw EEG features", bg: "bg-stone/50",   color: "text-dim" },
                  { label: "▼  Baseline Layer  ▼", bg: "bg-teal/10",  color: "text-teal", bold: true },
                  { label: "Aligned embedding z", bg: "bg-stone/50",  color: "text-dim" },
                  { label: "Downstream classifier", bg: "bg-navy/10", color: "text-navy" },
                ].map(({ label, bg, color, bold }) => (
                  <div
                    key={label}
                    className={`${bg} ${color} rounded-lg px-4 py-3 text-xs text-center
                                ${bold ? "font-semibold" : "font-mono"}`}
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-mist text-center">
                Drop-in replacement · no retraining required
              </div>
            </motion.div>
          </div>
        </div>

        {/* Pipeline steps */}
        <div className="rule mb-16" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="group"
            >
              <div
                className="w-8 h-px mb-4 transition-all duration-300 group-hover:w-16"
                style={{ background: step.color }}
              />
              <div className="text-xs font-mono text-mist mb-3">{step.num}</div>
              <div className="text-sm font-semibold text-ink mb-2">{step.title}</div>
              <div
                className="text-xs font-mono px-2 py-1 rounded mb-3 inline-block"
                style={{ background: `${step.color}18`, color: step.color }}
              >
                {step.formula}
              </div>
              <p className="text-xs text-mist leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* SDK code */}
        <div className="rule mb-16" />
        <SectionLabel className="mb-6">SDK — Python Interface</SectionLabel>
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          <div className="lg:w-2/5">
            <motion.h3
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="text-title text-ink mb-4"
            >
              Three methods. One interface.
            </motion.h3>
            <div className="space-y-4">
              {[
                { name: "Baseline.fit()",       desc: "Learn personal baseline from calibration sessions" },
                { name: "Baseline.transform()", desc: "Align new session to embedding space" },
                { name: "Baseline.evaluate()",  desc: "Compute variance reduction and reliability" },
              ].map(({ name, desc }) => (
                <div key={name} className="flex gap-3">
                  <div className="w-1 bg-teal/40 rounded flex-shrink-0 mt-1" />
                  <div>
                    <div className="text-xs font-mono text-teal">{name}</div>
                    <div className="text-xs text-mist mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="lg:w-3/5"
          >
            <pre className="code-block text-xs leading-relaxed overflow-x-auto">
              <code>{SDK_CODE}</code>
            </pre>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
