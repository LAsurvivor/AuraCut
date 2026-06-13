"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const statuses = ["Analyze", "Cut", "Flip", "Host"];
const blobs = [
  { color: "bg-cyan-200/70", delay: 0, left: "24%", size: "32%", top: "20%" },
  { color: "bg-violet-300/62", delay: 0.18, left: "48%", size: "40%", top: "16%" },
  { color: "bg-sky-300/58", delay: 0.36, left: "35%", size: "46%", top: "40%" },
  { color: "bg-fuchsia-300/42", delay: 0.54, left: "62%", size: "30%", top: "48%" }
];

export function ProcessingAnimation() {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % statuses.length);
    }, 720);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-[2rem] bg-[#030712]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(103,232,249,0.24),transparent_28%),radial-gradient(circle_at_72%_30%,rgba(192,132,252,0.2),transparent_30%),linear-gradient(135deg,rgba(8,13,30,0.98),rgba(2,6,23,0.98))]"
        animate={{
          filter: ["blur(18px) saturate(1.1)", "blur(30px) saturate(1.36)", "blur(20px) saturate(1.16)"],
          scale: [1.02, 1.07, 1.03]
        }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 h-[62%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-[44%] bg-cyan-100/14 blur-3xl"
        animate={{ opacity: [0.26, 0.74, 0.32], scale: [0.88, 1.12, 0.98] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-0 blur-2xl contrast-[1.9]">
        {blobs.map((blob) => (
          <motion.span
            key={`${blob.left}-${blob.top}`}
            className={`absolute rounded-full ${blob.color} mix-blend-screen`}
            style={{ height: blob.size, left: blob.left, top: blob.top, width: blob.size }}
            animate={{
              borderRadius: ["44% 56% 52% 48%", "64% 36% 42% 58%", "48% 52% 66% 34%", "44% 56% 52% 48%"],
              opacity: [0.26, 0.58, 0.32],
              scale: [0.82, 1.16, 0.94],
              x: [0, 22, -14, 0],
              y: [0, -18, 14, 0]
            }}
            transition={{ delay: blob.delay, duration: 3.45, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <motion.div
        className="absolute left-1/2 top-1/2 h-[54%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-[48%] border border-cyan-100/16 bg-cyan-100/[0.035] shadow-[0_0_70px_rgba(103,232,249,0.18),inset_0_0_54px_rgba(103,232,249,0.08)]"
        animate={{
          filter: ["blur(9px)", "blur(2px)", "blur(12px)"],
          opacity: [0.34, 0.82, 0.42],
          scale: [0.94, 1.04, 0.98]
        }}
        transition={{ duration: 2.7, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute -left-1/4 top-[-35%] h-[170%] w-24 rotate-12 bg-gradient-to-r from-transparent via-white/55 to-transparent blur-sm"
        animate={{ x: ["0%", "650%"], opacity: [0, 0.72, 0] }}
        transition={{ duration: 1.95, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-4 rounded-[1.55rem] border border-white/[0.07]" />
      <motion.div
        className="absolute inset-4 rounded-[1.55rem] border border-cyan-100/0"
        animate={{ borderColor: ["rgba(103,232,249,0.04)", "rgba(103,232,249,0.28)", "rgba(103,232,249,0.06)"] }}
        transition={{ duration: 2.25, repeat: Infinity, ease: "easeInOut" }}
      />

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
