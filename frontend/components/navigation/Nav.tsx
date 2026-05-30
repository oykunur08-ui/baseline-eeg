"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

const CHAPTERS = [
  { id: "problem",     label: "Problem" },
  { id: "theory",      label: "Framework" },
  { id: "experiments", label: "Experiments" },
  { id: "lab",         label: "Lab" },
  { id: "about",       label: "Researcher" },
  { id: "paper",       label: "Paper" },
  { id: "notes",       label: "Notes" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive]     = useState("");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
      for (const { id } of [...CHAPTERS].reverse()) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 120) {
          setActive(id);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 px-4 pt-4"
      >
        <div
          className={clsx(
            "max-w-[90vw] mx-auto flex items-center justify-between h-14 px-5 md:px-7",
            "rounded-full transition-all duration-500",
            "bg-parchment/80 backdrop-blur-xl",
            "border border-stone/50",
            "shadow-[0_4px_24px_rgba(0,0,0,0.08)]",
            "text-ink"
          )}
        >
          {/* Logo wordmark */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-sm font-semibold tracking-[0.12em] text-ink/90 hover:opacity-70 transition-opacity duration-200 lowercase"
          >
            baseline
          </button>

          {/* Desktop chapters */}
          <div className="hidden md:flex items-center gap-5">
            {CHAPTERS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={clsx(
                  "text-xs font-medium transition-opacity duration-200",
                  active === id
                    ? "text-ink"
                    : "text-ink/45 hover:opacity-70"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* CTA group */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scrollTo("paper")}
              className="text-xs font-medium px-4 py-1.5
                         border-2 border-stone text-mist rounded-full
                         hover:border-dim hover:text-dim
                         transition-all duration-200"
            >
              Research Paper
            </button>
            <button
              onClick={() => scrollTo("lab")}
              className="text-xs font-bold px-4 py-1.5
                         bg-ink text-parchment rounded-full
                         hover:scale-[1.05] hover:shadow-[0_4px_20px_rgba(14,17,23,0.2)]
                         transition-all duration-200"
            >
              Interactive Lab →
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span className={clsx("block w-5 h-0.5 bg-ink transition-all duration-300", menuOpen && "rotate-45 translate-y-2")} />
            <span className={clsx("block w-5 h-0.5 bg-ink transition-all duration-300", menuOpen && "opacity-0")} />
            <span className={clsx("block w-5 h-0.5 bg-ink transition-all duration-300", menuOpen && "-rotate-45 -translate-y-2")} />
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-parchment/96 backdrop-blur-xl pt-24 px-8 flex flex-col gap-6 md:hidden"
          >
            {CHAPTERS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-left text-2xl font-light text-ink border-b border-stone pb-4 hover:opacity-70 transition-opacity duration-200"
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => scrollTo("lab")}
              className="mt-4 text-sm font-bold px-6 py-3 bg-ink text-parchment rounded-full self-start hover:scale-105 transition-transform duration-200"
            >
              Interactive Lab →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
