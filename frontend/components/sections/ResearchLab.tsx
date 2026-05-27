"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import SectionLabel from "../ui/SectionLabel";

const DriftGeometryLab      = dynamic(() => import("../modules/DriftGeometryLab"),      { ssr: false });
const CalibrationSimulator  = dynamic(() => import("../modules/CalibrationSimulator"),  { ssr: false });
const LongitudinalViewer    = dynamic(() => import("../modules/LongitudinalViewer"),    { ssr: false });
const PersonalDriftExperience = dynamic(() => import("../modules/PersonalDriftExperience"), { ssr: false });

const MODULES = [
  {
    id: "geometry",
    label: "Drift Geometry",
    tag: "Module I",
    title: "Drift Geometry Lab",
    subtitle: "Visualize session-to-session feature space drift and the limits of alignment",
    insight: "Alignment reduces centroid drift. It does not improve class separability.",
    component: DriftGeometryLab,
  },
  {
    id: "calibration",
    label: "Calibration Efficiency",
    tag: "Module II",
    title: "Calibration Efficiency Simulator",
    subtitle: "Calibration sample count versus decoding stability across alignment strategies",
    insight: "More calibration data stabilizes estimates. It does not raise the accuracy ceiling.",
    component: CalibrationSimulator,
  },
  {
    id: "longitudinal",
    label: "Longitudinal Features",
    tag: "Module III",
    title: "Longitudinal Feature Viewer",
    subtitle: "Alpha, beta, and theta band power trajectories across simulated sessions",
    insight: "The same subject is statistically non-stationary across time.",
    component: LongitudinalViewer,
  },
  {
    id: "experience",
    label: "Drift Experience",
    tag: "Module IV",
    title: "Personal Drift Experience",
    subtitle: "Step through calibration, session shift, and alignment. Observe what changes and what does not.",
    insight: "Alignment corrects coordinates. It cannot change the signal's intrinsic separability.",
    component: PersonalDriftExperience,
  },
] as const;

type ModuleId = typeof MODULES[number]["id"];

export default function ResearchLab() {
  const [active, setActive] = useState<ModuleId>("geometry");

  const current = MODULES.find((m) => m.id === active)!;
  const Component = current.component;

  return (
    <section id="lab" className="bg-parchment py-section">
      <div className="container-wide">
        <SectionLabel className="mb-6">Chapter 04. Interactive Research Lab</SectionLabel>

        <div className="flex flex-col md:flex-row gap-16 mb-14">
          <div className="md:w-1/2">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="headline text-ink"
            >
              Four views into one problem
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
              Each module is a different lens on the same phenomenon: longitudinal distribution
              shift in EEG systems. All simulations are deterministic and run in the browser,
              with no backend required. Seed-controlled for reproducibility.
            </motion.p>
          </div>
        </div>

        {/* Module selector — horizontal tabs */}
        <div className="flex gap-1 mb-10 overflow-x-auto pb-1">
          {MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => setActive(m.id)}
              className={`whitespace-nowrap text-xs font-medium px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                active === m.id
                  ? "bg-ink/5 border-stone text-ink"
                  : "border-transparent text-mist hover:text-dim hover:border-stone"
              }`}
            >
              <span className="font-mono opacity-50 mr-1.5">{m.tag.replace("Module ", "")}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Module panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Module header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <div className="text-xs font-mono text-mist mb-2">{current.tag}</div>
                <h3 className="text-title text-ink mb-2">{current.title}</h3>
                <p className="text-sm text-mist max-w-xl">{current.subtitle}</p>
              </div>
              <div
                className="flex-shrink-0 px-4 py-3 border rounded-xl max-w-xs md:text-right"
                style={{ borderColor: "rgba(30,107,92,0.25)", background: "rgba(30,107,92,0.06)" }}
              >
                <div className="text-xs font-mono text-teal/60 mb-1">Core insight</div>
                <p className="text-xs text-teal/80 leading-relaxed italic">
                  {current.insight}
                </p>
              </div>
            </div>

            {/* Module content */}
            <Component />
          </motion.div>
        </AnimatePresence>

        {/* Cross-module synthesis */}
        <div className="rule mt-16 mb-12" />
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="text-xs font-mono text-mist mb-4">What these modules share</div>
            <p className="text-sm text-mist leading-relaxed">
              Across all four views, the same structural finding emerges: EEG feature distributions
              shift across time in ways that are measurable and partially correctable.
              Correction and improvement are not the same thing.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Drift is real and measurable across sessions",
              "Alignment methods reduce distributional shift",
              "Reduced drift does not guarantee better decoding",
              "Stability and utility are not identical",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xs font-mono text-mist/40 mt-0.5 w-5 flex-shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-dim">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
