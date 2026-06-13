"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const statuses = ["Analyze", "Cut", "Flip", "Host"];
const rows = 21;
const columns = 33;

type Dot = {
  column: number;
  delay: number;
  duration: number;
  id: string;
  opacity: number;
  pulseA: number;
  pulseB: number;
  row: number;
  size: number;
};

function buildDots(): Dot[] {
  const centerX = (columns - 1) / 2;
  const centerY = (rows - 1) / 2;
  const maxDistance = Math.hypot(centerX, centerY);

  return Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const dx = column - centerX;
    const dy = row - centerY;
    const distance = Math.hypot(dx, dy);
    const focus = 1 - Math.min(distance / maxDistance, 1);
    const flow =
      Math.sin(column * 0.58 + row * 0.24) +
      Math.cos(row * 0.7 - column * 0.18) +
      Math.sin((column + row) * 0.31);
    const normalizedFlow = (flow + 3) / 6;
    const pulseA = 1.36 + normalizedFlow * 0.72 + focus * 0.28;
    const pulseB = 0.96 + (1 - normalizedFlow) * 0.38 + focus * 0.16;

    return {
      column,
      delay: normalizedFlow * 1.35 + Math.sin(row * 0.44) * 0.16 + Math.cos(column * 0.29) * 0.12,
      duration: 2.45 + normalizedFlow * 0.72,
      id: `${row}-${column}`,
      opacity: 0.2 + focus * 0.34,
      pulseA,
      pulseB,
      row,
      size: 3 + focus * 1.4
    };
  });
}

export function ProcessingAnimation() {
  const [statusIndex, setStatusIndex] = useState(0);
  const dots = useMemo(buildDots, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % statuses.length);
    }, 680);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <motion.div
      data-processing-root
      className="absolute inset-0 overflow-hidden rounded-[2rem] bg-[#030712]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <motion.div
        className="absolute inset-0 bg-[linear-gradient(145deg,rgba(12,18,36,0.98),rgba(2,6,23,0.98)_58%,rgba(7,12,28,0.98)),linear-gradient(90deg,rgba(34,211,238,0.08),transparent_36%,rgba(168,85,247,0.08)_72%,transparent)]"
        animate={{
          filter: ["saturate(1.04)", "saturate(1.22)", "saturate(1.08)"]
        }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-0">
        <motion.div
          data-dot-field
          className="grid h-full w-full grid-cols-[repeat(33,minmax(0,1fr))] grid-rows-[repeat(21,minmax(0,1fr))] place-items-center"
          animate={{ opacity: [0.82, 1, 0.88, 0.96, 0.82] }}
          transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          {dots.map((dot) => {
            const hue =
              dot.column < columns * 0.34
                ? "bg-cyan-100 text-cyan-100"
                : dot.column > columns * 0.68
                  ? "bg-violet-200 text-violet-200"
                  : "bg-sky-100 text-sky-100";

            return (
              <motion.span
                key={dot.id}
                className={`rounded-full ${hue} shadow-[0_0_16px_currentColor] will-change-transform`}
                style={{ height: dot.size, opacity: dot.opacity, width: dot.size }}
                animate={{
                  opacity: [dot.opacity * 0.58, Math.min(dot.opacity + 0.48, 1), dot.opacity * 0.72, dot.opacity * 0.92],
                  scale: [0.52, dot.pulseA, 0.68, dot.pulseB, 0.58]
                }}
                transition={{
                  delay: dot.delay,
                  duration: dot.duration,
                  repeat: Infinity,
                  repeatDelay: 0,
                  ease: [0.22, 1, 0.36, 1]
                }}
              />
            );
          })}
        </motion.div>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/68 px-4 py-2 text-xs font-semibold uppercase tracking-normal text-cyan-50/86 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <motion.span
          key={statuses[statusIndex]}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {statuses[statusIndex]}
        </motion.span>
      </div>
    </motion.div>
  );
}
