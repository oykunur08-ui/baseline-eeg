"use client";
import { motion } from "framer-motion";
import SectionLabel from "../ui/SectionLabel";

const PROBLEMS = [
  {
    id: "01",
    title: "Inter-subject Variability",
    body:
      "Resting alpha power can differ by 3× across individuals. Population-level models trained on pooled data are structurally biased against everyone they claim to represent.",
    metric: "~3× variance in α-power across subjects",
  },
  {
    id: "02",
    title: "Longitudinal Drift",
    body:
      "EEG features shift gradually across sessions due to electrode impedance changes, circadian effects, and cognitive load history. Static calibrations become unreliable within hours.",
    metric: "Detectable drift in as few as 3 sessions",
  },
  {
    id: "03",
    title: "Wearable Constraints",
    body:
      "Consumer EEG devices offer 2–4 channels, noisy preprocessing, and no gel. Clinical preprocessing pipelines designed for 64-channel lab setups fail in deployment.",
    metric: "2–4 channels vs 64–256 in research",
  },
  {
    id: "04",
    title: "Limited Calibration",
    body:
      "Real-world users will not sit through 30-minute calibration sessions. Systems that need large labeled datasets per user are commercially non-viable.",
    metric: "< 5 min acceptable calibration time",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function Problem() {
  return (
    <section id="problem" className="bg-linen py-section">
      <div className="container-wide">
        <div className="flex flex-col md:flex-row gap-16">
          {/* Left column */}
          <div className="md:w-2/5 flex flex-col justify-between">
            <div>
              <SectionLabel className="mb-6">
                Chapter 01. The Problem
              </SectionLabel>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="headline text-ink mb-8"
              >
                Why EEG fails in the wild
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-sm text-mist leading-relaxed max-w-sm"
              >
                Most EEG research optimizes for benchmark accuracy on controlled lab datasets.
                Deployment reveals the gap between academic performance and real-world robustness.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-12 p-6 border border-stone rounded-xl"
            >
              <div className="text-xs text-mist mb-2">Core hypothesis</div>
              <p className="text-sm text-dim leading-relaxed font-light italic">
                "Subject-specific covariance normalization can partially stabilize feature
                distributions across sessions without requiring retraining of downstream models."
              </p>
            </motion.div>
          </div>

          {/* Right column — problem cards */}
          <div className="md:w-3/5">
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {PROBLEMS.map((p) => (
                <motion.div
                  key={p.id}
                  variants={item}
                  className="p-6 border border-stone rounded-xl bg-parchment
                             hover:border-dim/20 transition-colors duration-300 group"
                >
                  <div className="text-xs text-mist font-mono mb-4">{p.id}</div>
                  <h3 className="text-sm font-semibold text-ink mb-3">{p.title}</h3>
                  <p className="text-xs text-mist leading-relaxed mb-4">{p.body}</p>
                  <div className="text-xs font-mono text-teal pt-3 border-t border-stone">
                    {p.metric}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
