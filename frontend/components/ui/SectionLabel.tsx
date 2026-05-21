"use client";
import { motion } from "framer-motion";
import clsx from "clsx";

interface Props {
  children: React.ReactNode;
  light?: boolean;
  className?: string;
}

export default function SectionLabel({ children, light, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={clsx(
        "section-label",
        light ? "text-parchment/60" : "text-mist",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
