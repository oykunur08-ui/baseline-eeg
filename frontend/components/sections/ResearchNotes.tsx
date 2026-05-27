"use client";
import { motion } from "framer-motion";
import SectionLabel from "../ui/SectionLabel";

const NOTES = [
  {
    id: "N01",
    title: "On the scope of this evaluation",
    body: "Experiments use real EEG data from BNCI Horizon 2020 (001-2014), single subject A01, evaluated across two sessions (A01T to A01E). Single-subject evaluation is a known limitation. The observed drift reduction may not generalize across subjects, devices, or tasks. These results are proof-of-concept, not deployment-ready benchmarks.",
  },
  {
    id: "N02",
    title: "Method limitations",
    body: "Covariance whitening assumes the training session covariance is representative of the long-run statistic. In practice, a single session may under-sample the distribution. Moving-average adaptation can over-fit to short-term transient states if the decay rate is too aggressive relative to the actual drift timescale.",
  },
  {
    id: "N03",
    title: "What this system does not claim",
    body: "Baseline is not a classifier. It makes no clinical claims about cognitive state, mental health, or neurological function. The dissociation between feature stability and decoding accuracy observed here should be interpreted as a constraint on what statistical alignment alone can provide.",
  },
  {
    id: "N04",
    title: "Open questions",
    body: "Why did covariance whitening fail to improve accuracy despite 94.6% drift reduction? Is the discriminative signal for motor imagery orthogonal to the high-variance drift directions? Can Riemannian alignment outperform covariance whitening on multi-subject longitudinal evaluation? What is the minimum viable calibration protocol for wearable BCI deployment?",
  },
];

const FUTURE = [
  {
    title: "Continuous adaptation without recalibration",
    body: "Systems capable of updating personal neural representations longitudinally without requiring explicit recalibration sessions — treating alignment as a persistent background process rather than an upfront cost.",
  },
  {
    title: "Calibration-light wearable neurotechnology",
    body: "Wearable EEG systems designed around passive adaptation and minimal user burden. Practical deployment imposes hard constraints on setup time; the alignment layer should absorb longitudinal variation silently.",
  },
  {
    title: "Persistent personal neural embeddings",
    body: "Long-term subject-specific representation spaces capable of tracking gradual cognitive and physiological change across months or years. Whether such embeddings remain discriminative at that timescale is an open empirical question.",
  },
  {
    title: "Uncertainty-aware neural interfaces",
    body: "Adaptive systems that estimate signal reliability and drift in real time, flagging when alignment has degraded rather than silently producing uncertain predictions under noisy real-world conditions.",
  },
  {
    title: "Hardware and software co-design",
    body: "Wearable neurotechnology designed jointly with adaptive alignment infrastructure, rather than treating signal instability purely as a post-processing residual. Electrode placement, signal conditioning, and adaptation as a unified system.",
  },
  {
    title: "Federated personalization",
    body: "Privacy-preserving personalization allowing wearable neural devices to improve longitudinally without centralized storage of raw neural data — a necessary constraint for any deployment at population scale.",
  },
  {
    title: "Adaptive human-centered AI",
    body: "Whether future AI systems interacting with biological users require temporally adaptive representations rather than fixed assumptions about users. BASELINE examines one constrained, measurable piece of that larger question.",
  },
];

export default function ResearchNotes() {
  return (
    <section id="notes" className="bg-parchment py-section border-t border-stone">
      <div className="container-wide">
        <SectionLabel className="mb-6">Chapter 07. Research Notes</SectionLabel>

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
              These notes document where Baseline's assumptions hold, where
              they break down, and what the real evaluation revealed.
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
              The current evaluation establishes a methodological baseline.
              The deeper question it opens: how should future neurotechnology
              systems adapt to humans as continuously evolving biological
              distributions rather than static users?
            </p>
          </div>
          <div className="md:w-3/5 space-y-3">
            {FUTURE.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                className="flex items-start gap-4 py-4 border-b border-stone last:border-0"
              >
                <span className="text-xs font-mono text-mist/50 w-6 mt-0.5 flex-shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="text-sm text-dim mb-1.5">{item.title}</div>
                  <p className="text-xs text-mist leading-relaxed">{item.body}</p>
                </div>
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
              EEG Feature Alignment · Research Prototype · 2026
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
