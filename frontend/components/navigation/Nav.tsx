"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import clsx from "clsx";

const CHAPTERS = [
  { id: "problem",     label: "The Problem" },
  { id: "theory",      label: "Theory" },
  { id: "experiments", label: "Experiments" },
  { id: "demo",        label: "Live Demo" },
  { id: "notes",       label: "Notes" },
];

export default function Nav() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [active, setActive]       = useState("");

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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className={clsx(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          scrolled
            ? "bg-parchment/90 backdrop-blur-md border-b border-stone"
            : "bg-transparent"
        )}
      >
        <div className="container-wide flex items-center justify-between h-14">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="section-label text-ink hover:text-teal transition-colors"
          >
            BASELINE
          </button>

          {/* Desktop chapters */}
          <div className="hidden md:flex items-center gap-7">
            {CHAPTERS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={clsx(
                  "text-xs font-medium transition-colors",
                  active === id ? "text-ink" : "text-mist hover:text-dim"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/demo"
              className="text-xs font-semibold px-4 py-1.5 border border-ink/20 rounded-full
                         hover:bg-ink hover:text-parchment transition-all duration-200"
            >
              Open Demo →
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span className={clsx("block w-5 h-0.5 bg-ink transition-all", menuOpen && "rotate-45 translate-y-2")} />
            <span className={clsx("block w-5 h-0.5 bg-ink transition-all", menuOpen && "opacity-0")} />
            <span className={clsx("block w-5 h-0.5 bg-ink transition-all", menuOpen && "-rotate-45 -translate-y-2")} />
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
            className="fixed inset-0 z-40 bg-parchment pt-16 px-8 flex flex-col gap-6 md:hidden"
          >
            {CHAPTERS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-left text-2xl font-light text-ink border-b border-stone pb-4"
              >
                {label}
              </button>
            ))}
            <Link href="/demo" className="text-sm font-semibold text-teal mt-4">
              Open Live Demo →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
