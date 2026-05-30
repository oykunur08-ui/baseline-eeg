"use client";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

// ── Seeded pseudo-random (used by EEGWaveform only) ──────────────────────────
const seeded = (n: number) => { const s = Math.sin(n * 9301 + 49297) * 233280; return s - Math.floor(s); };

// ── Neural wave background ────────────────────────────────────────────────────
const WAVE_W = 1440;
const WAVE_H = 600;

function buildWavePath(
  baseY: number,
  components: { amp: number; fm: number; phase: number }[],
): string {
  const pts: string[] = [];
  for (let x = 0; x <= WAVE_W * 2; x += 8) {
    let y = baseY;
    for (const c of components) {
      y += c.amp * Math.sin((2 * Math.PI * c.fm * x) / WAVE_W + c.phase);
    }
    pts.push(`${x},${y.toFixed(2)}`);
  }
  return pts.map((p, i) => (i === 0 ? `M${p}` : `L${p}`)).join(" ");
}

const NEURAL_CHANNELS = [
  {
    d: buildWavePath(WAVE_H * 0.22, [
      { amp: 28, fm: 2, phase: 0.0 },
      { amp: 8,  fm: 6, phase: 1.5 },
      { amp: 3,  fm: 11, phase: 0.9 },
    ]),
    strokeWidth: 1.2,
    opacity: 0.65,
  },
  {
    d: buildWavePath(WAVE_H * 0.52, [
      { amp: 20, fm: 3, phase: 2.1 },
      { amp: 9,  fm: 7, phase: 0.4 },
      { amp: 4,  fm: 13, phase: 2.5 },
    ]),
    strokeWidth: 1.0,
    opacity: 0.50,
  },
  {
    d: buildWavePath(WAVE_H * 0.80, [
      { amp: 34, fm: 1, phase: 1.0 },
      { amp: 12, fm: 4, phase: 3.1 },
      { amp: 5,  fm: 9, phase: 1.7 },
    ]),
    strokeWidth: 1.3,
    opacity: 0.40,
  },
];

function NeuralWaveBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ opacity: 0.17 }}
    >
      <svg
        className="neural-bg-scroll"
        viewBox={`0 0 ${WAVE_W * 2} ${WAVE_H}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", width: "200%", height: "100%", top: 0, left: 0 }}
      >
        {NEURAL_CHANNELS.map((ch, i) => (
          <path
            key={i}
            d={ch.d}
            fill="none"
            stroke="#1B3F7A"
            strokeWidth={ch.strokeWidth}
            opacity={ch.opacity}
          />
        ))}
      </svg>
    </div>
  );
}

// ── EEG waveform (bottom decorative trace) ───────────────────────────────────
function EEGWaveform() {
  const POINTS = 80;
  const W = 1200, H = 120;

  const baselineY = H / 2;
  const pts: string[] = [];

  for (let i = 0; i < POINTS; i++) {
    const x = (i / (POINTS - 1)) * W;
    const spike = i === 25 || i === 50 || i === 65;
    const y = spike
      ? baselineY - (seeded(i) * 40 + 20) * (i % 2 === 0 ? 1 : -1)
      : baselineY + (Math.sin(i * 0.4) * 8 + (seeded(i + 100) - 0.5) * 4);
    pts.push(`${x},${y.toFixed(1)}`);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full opacity-30"
      preserveAspectRatio="none"
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="#1B3F7A"
        strokeWidth="1.5"
        className="eeg-line"
      />
    </svg>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMouseMove = (e: MouseEvent) => {
      const { left, top, width, height } = el.getBoundingClientRect();
      const x = (e.clientX - left) / width - 0.5;
      const y = (e.clientY - top) / height - 0.5;
      el.style.setProperty("--mx", String(x));
      el.style.setProperty("--my", String(y));
    };
    el.addEventListener("mousemove", onMouseMove);
    return () => el.removeEventListener("mousemove", onMouseMove);
  }, []);

  return (
    <section
      ref={containerRef}
      className="hero-section relative min-h-screen flex flex-col justify-between bg-parchment overflow-hidden pt-14"
    >
      {/* Neural wave background */}
      <NeuralWaveBackground />

      {/* Blueprint grid */}
      <div className="absolute inset-0 blueprint-grid opacity-60 pointer-events-none" />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 70% 40%, rgba(30,107,92,0.07), transparent 70%)",
        }}
      />

      {/* Extra ambient blob — top-left */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "15%",
          left: "5%",
          width: "min(400px, 35vw)",
          height: "min(400px, 35vw)",
          background: "radial-gradient(circle, rgba(184,131,42,0.18) 0%, transparent 70%)",
          filter: "blur(64px)",
          opacity: 0.22,
          borderRadius: "50%",
        }}
      />

      {/* Hero content */}
      <div className="w-full max-w-[1440px] mx-auto pl-6 pr-6 md:pl-10 md:pr-10 lg:pl-14 lg:pr-14 flex-1 flex flex-col justify-center">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="display text-ink leading-none mb-8"
        >
          BASE
          <br />
          LINE
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-xl md:text-2xl text-dim font-normal leading-relaxed max-w-xl"
        >
          Neural signals only become meaningful when interpreted relative to themselves.
        </motion.p>
      </div>

      <div className="container-wide pb-12">
        <EEGWaveform />
      </div>
    </section>
  );
}
