"use client";
import { motion } from "framer-motion";
import SectionLabel from "../ui/SectionLabel";

const STEPS = [
  {
    num: "01",
    title: "Baseline Estimation",
    formula: "μ, Σ = fit(X_calib)",
    desc: "From a calibration session, estimate the subject-specific mean vector μ and regularized covariance matrix Σ, capturing the individual's neural feature distribution at a reference point in time.",
    color: "#1E6B5C",
  },
  {
    num: "02",
    title: "Covariance Alignment",
    formula: "z = Σ⁻¹/² (x − μ)",
    desc: "New sessions are projected into a covariance-normalized feature space. Mahalanobis deviation from the calibration baseline quantifies how far the current session has drifted from the subject's reference distribution.",
    color: "#1B3F7A",
  },
  {
    num: "03",
    title: "Temporal Adaptation",
    formula: "μₜ = (1−α)μₜ₋₁ + αxₜ",
    desc: "Slow drift is tracked via exponential moving-average recalibration. The estimated baseline gradually follows the subject's evolving distribution, at the cost of potentially over-adapting to transient states.",
    color: "#B8832A",
  },
  {
    num: "04",
    title: "Downstream Evaluation",
    formula: "f(z) → accuracy",
    desc: "Aligned features replace raw features as input to a downstream classifier. The research question: does reducing distributional drift improve decoding performance, or are the two quantities dissociable?",
    color: "#6B6860",
  },
];

const DISSOCIATION = [
  {
    label: "What alignment improves",
    items: [
      "Centroid drift (L₂ distance between session means)",
      "Feature variance across sessions",
      "Cross-session distributional stability",
    ],
    color: "#1E6B5C",
  },
  {
    label: "What alignment does not improve",
    items: [
      "Within-session class separability (Fisher ratio)",
      "Downstream classification accuracy",
      "The signal-to-noise ratio of the decoding task",
    ],
    color: "#B8832A",
  },
];

export default function Theory() {
  return (
    <section id="theory" className="bg-parchment py-section">
      <div className="container-wide">
        <SectionLabel className="mb-6">Chapter 02. Research Framework</SectionLabel>

        <div className="flex flex-col md:flex-row gap-16 mb-20">
          <div className="md:w-1/2">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="headline text-ink mb-6"
            >
              Studying the stability–utility gap
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-sm text-mist leading-relaxed"
            >
              The central question is not whether alignment works, since it measurably does,
              but whether improved stability translates to improved decoding performance.
              This evaluation framework tests three alignment strategies under identical
              wearable-constrained conditions and measures both drift reduction and
              classification accuracy independently.
            </motion.p>
          </div>

          {/* Core tension diagram */}
          <div className="md:w-1/2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="blueprint-grid rounded-2xl p-6 border border-stone"
            >
              <div className="text-xs font-mono text-mist/60 mb-5">Research tension</div>
              <div className="space-y-3">
                {[
                  { label: "EEG features drift across sessions",      state: "observed",  color: "#B8832A" },
                  { label: "Alignment reduces distributional drift",   state: "confirmed", color: "#1E6B5C" },
                  { label: "Reduced drift ≠ improved accuracy",        state: "finding",   color: "#1B3F7A", bold: true },
                  { label: "Stability and utility are dissociable",    state: "hypothesis", color: "#6B6860" },
                ].map(({ label, state, color, bold }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-4 p-3 rounded-lg ${bold ? "bg-navy/8" : "bg-stone/30"}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className={`text-xs leading-snug ${bold ? "font-semibold text-ink" : "text-dim"}`}>{label}</span>
                    <span className="text-xs font-mono text-mist/40 ml-auto flex-shrink-0">{state}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Alignment pipeline steps */}
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

        {/* Stability vs utility dissociation */}
        <div className="rule mb-16" />
        <SectionLabel className="mb-8">The core dissociation</SectionLabel>
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {DISSOCIATION.map(({ label, items, color }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="border border-stone rounded-xl p-6"
            >
              <div
                className="text-xs font-mono mb-5"
                style={{ color }}
              >
                {label}
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color + "80" }} />
                    <span className="text-sm text-dim leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Formal research question */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="p-8 border border-stone rounded-2xl bg-linen"
        >
          <div className="flex flex-col md:flex-row gap-8 md:gap-16">
            <div className="md:w-1/4 flex-shrink-0">
              <div className="text-xs font-mono text-mist/60 mb-1">Research question</div>
              <div className="w-8 h-px mt-3" style={{ background: "rgba(30,107,92,0.4)" }} />
            </div>
            <div className="md:w-3/4">
              <p className="text-sm text-dim leading-loose italic">
                "Does subject-specific covariance normalization stabilize EEG feature distributions
                across sessions, and if so, does that stability translate to improved
                downstream decoding performance under wearable deployment constraints?"
              </p>
              <p className="text-xs text-mist/70 mt-4 leading-relaxed">
                The answer found here: yes to the first, no to the second.
                The dissociation between these two outcomes is the principal finding
                and the motivation for further investigation.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
