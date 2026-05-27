"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import SectionLabel from "../ui/SectionLabel";

const INTERESTS = [
  { label: "Wearable EEG deployment", note: "Low-channel, noisy, real-world" },
  { label: "Longitudinal signal adaptation", note: "Cross-session, cross-state stability" },
  { label: "Subject-specific statistical alignment", note: "Without large labeled datasets" },
  { label: "Systems thinking in biosignal ML", note: "Infrastructure over architecture" },
  { label: "BCI under constraint", note: "Calibration efficiency, practical limits" },
];

export default function About() {
  return (
    <section id="about" className="relative bg-parchment py-section overflow-hidden border-t border-stone">
      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(27,63,122,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(27,63,122,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container-wide relative">
        <SectionLabel className="mb-16">
          Chapter 05. Researcher
        </SectionLabel>

        {/* Asymmetrical editorial layout */}
        <div className="grid lg:grid-cols-[1fr_2fr] gap-16 lg:gap-24 items-start mb-20">

          {/* Left — profile image column */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Frame decoration */}
            <div
              className="absolute -top-3 -left-3 w-16 h-16 border-t border-l pointer-events-none"
              style={{ borderColor: "rgba(30,107,92,0.4)" }}
            />
            <div
              className="absolute -bottom-3 -right-3 w-16 h-16 border-b border-r pointer-events-none"
              style={{ borderColor: "rgba(30,107,92,0.4)" }}
            />

            {/* Profile image */}
            <div className="relative aspect-[3/4] overflow-hidden rounded bg-stone/20 border border-stone">
              <Image
                src="/profile.jpg"
                alt="Öykü Nur Kesek"
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 400px"
              />
            </div>

            {/* Name / role tag */}
            <div className="mt-5">
              <div className="text-xs font-mono text-mist mb-1">Student Researcher</div>
              <div className="text-sm font-semibold text-ink mb-4">
                Öykü Nur Kesek
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Medium",        href: "https://medium.com/@oyku.nur08" },
                  { label: "LinkedIn",      href: "https://www.linkedin.com/in/oyku-nur-kesek/" },
                  { label: "Newsletter",    href: "https://oykukesek.substack.com/" },
                  { label: "GitHub",        href: "https://github.com/oykunur08-ui" },
                  { label: "Research Paper PDF", href: "https://drive.google.com/file/d/16XSafjZ41whivFS8FwHjvEZrJfFMMdM5/view?usp=sharing" },
                ].map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 border border-stone text-mist
                               rounded-full hover:border-dim hover:text-dim
                               transition-all duration-200"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right — editorial bio column */}
          <div>
            {/* Large editorial statement */}
            <motion.h2
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="headline text-ink mb-10 leading-tight"
            >
              Building infrastructure
              <br />
              <span className="text-mist">for minds at the</span>
              <br />
              margin of measurement.
            </motion.h2>

            {/* Bio text */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.9 }}
              className="space-y-5 text-sm text-mist leading-loose max-w-xl"
            >
              <p>
                I'm interested in the gap between laboratory neuroscience and real-world
                neurotechnology, specifically why EEG systems that perform well in controlled
                environments fail to remain stable across time, users, and deployment conditions.
              </p>
              <p>
                My current work centers on BASELINE, a research investigation into longitudinal
                distribution shift in wearable EEG systems. The core question: can subject-specific
                statistical alignment stabilize feature distributions across sessions, and if it
                can, does that stability actually improve decoding performance? The answer,
                as the data shows, is that these two things are dissociable.
              </p>
              <p>
                My interests sit at the intersection of EEG signal processing, statistical
                learning, and computational neuroscience infrastructure, with a focus on
                the systems-level constraints that govern real-world biosignal deployment.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Rule */}
        <div className="rule mb-16" />

        {/* Research interests — structured list */}
        <div className="grid md:grid-cols-[1fr_2fr] gap-16 items-start">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-xs font-mono text-mist mb-3">Research interests</div>
            <p className="text-sm text-mist leading-relaxed">
              Themes that cut across the technical work. The questions
              that make the engineering decisions feel necessary.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.8 }}
            className="space-y-0"
          >
            {INTERESTS.map(({ label, note }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                className="flex items-start justify-between gap-8 py-4 border-b border-stone last:border-0 group"
              >
                <div className="flex items-start gap-4">
                  <span className="text-xs font-mono text-mist/40 mt-0.5 w-5 flex-shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm text-dim group-hover:text-ink transition-colors duration-200">
                    {label}
                  </span>
                </div>
                <span className="text-xs text-mist/70 text-right flex-shrink-0 hidden md:block mt-0.5">
                  {note}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
