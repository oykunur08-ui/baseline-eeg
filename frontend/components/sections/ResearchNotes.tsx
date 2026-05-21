"use client";
import { motion } from "framer-motion";
import SectionLabel from "../ui/SectionLabel";

const NOTES = [
  {
    id: "N01",
    title: "On the validity of synthetic evaluation",
    body: "All experiments use simulated EEG data with parametric inter-subject variability and longitudinal drift. Synthetic evaluation is a necessary first step — results should be interpreted as proof-of-concept, not deployment-ready performance metrics. Real-device validation requires hardware access and ethical approval.",
  },
  {
    id: "N02",
    title: "Method limitations",
    body: "Static CORAL alignment assumes source and target session covariance are estimable from available data. In single-session online deployment, this reduces to z-score normalization. Moving-average adaptation can over-fit to rare transient states if the EMA decay is too aggressive.",
  },
  {
    id: "N03",
    title: "What this system does not claim",
    body: "Baseline is not a classifier. It makes no clinical claims about cognitive state, mental health, or neurological function. Deviation scores are statistical distances from an individual's own history — not diagnoses.",
  },
  {
    id: "N04",
    title: "Open questions",
    body: "Can Riemannian geometry-based alignment outperform covariance normalization on real-world wearable data? How does session length interact with baseline stability? What is the minimum viable calibration protocol for BCI deployment?",
  },
];

const FUTURE = [
  "Riemannian manifold alignment comparison",
  "Online uncertainty quantification",
  "Multi-device cross-session validation",
  "Federated personal baseline learning",
  "Integration with real wearable EEG SDKs",
];

export default function ResearchNotes() {
  return (
    <section id="notes" className="bg-parchment py-section border-t border-stone">
      <div className="container-wide">
        <SectionLabel className="mb-6">Chapter 05 — Research Notes</SectionLabel>

        <div className="flex flex-col md:flex-row gap-16 mb-16">
          <div className="md:w-1/2">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="headline text-ink"
            >
              Limitations, caveats, and what comes next
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
              Research-grade work requires honest accounting of its boundaries.
              These notes document where Baseline's assumptions hold and where
              they break down.
            </motion.p>
          </div>
        </div>

        {/* Notes grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-20">
          {NOTES.map((note, i) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.7 }}
              className="border border-stone rounded-xl p-7"
            >
              <div className="text-xs font-mono text-mist/60 mb-3">{note.id}</div>
              <h3 className="text-sm font-semibold text-ink mb-3">{note.title}</h3>
              <p className="text-sm text-mist leading-relaxed">{note.body}</p>
            </motion.div>
          ))}
        </div>

        {/* Future directions */}
        <div className="rule mb-16" />
        <div className="flex flex-col md:flex-row gap-12">
          <div className="md:w-2/5">
            <h3 className="text-title text-ink mb-4">Future directions</h3>
            <p className="text-sm text-mist leading-relaxed">
              The current system establishes baseline methodology. Extensions
              in Riemannian geometry and federated learning represent the most
              promising next directions for real-world deployment.
            </p>
          </div>
          <div className="md:w-3/5 space-y-3">
            {FUTURE.map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                className="flex items-center gap-4 py-3 border-b border-stone last:border-0"
              >
                <span className="text-xs font-mono text-mist/50 w-6">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-dim">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="rule mt-20 mb-8" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="text-sm font-semibold text-ink mb-1">BASELINE</div>
            <div className="text-xs text-mist">
              EEG Representation Alignment · Research Prototype · 2025
            </div>
          </div>
          <div className="text-xs text-mist max-w-sm text-right leading-relaxed">
            Not a medical device. Not a diagnostic tool.
            A research concept exploring lightweight personalization
            under wearable EEG deployment constraints.
          </div>
        </div>
      </div>
    </section>
  );
}
