"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const statuses = ["Analyze", "Cut", "Flip", "Host"];

const particles = [
  { left: "10%", top: "17%", delay: 0, drift: -18 },
  { left: "88%", top: "19%", delay: 0.18, drift: 14 },
  { left: "14%", top: "76%", delay: 0.34, drift: 16 },
  { left: "82%", top: "72%", delay: 0.52, drift: -20 },
  { left: "26%", top: "11%", delay: 0.7, drift: 12 },
  { left: "72%", top: "87%", delay: 0.88, drift: -14 },
  { left: "7%", top: "49%", delay: 1.04, drift: 18 },
  { left: "93%", top: "52%", delay: 1.2, drift: -16 }
];

export function ProcessingAnimation({ imageUrl }: { imageUrl: string }) {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStatusIndex((current) => Math.min(current + 1, statuses.length - 1));
    }, 650);

    return () => window.clearInterval(timer);
  }, []);

  const currentStatus = statuses[statusIndex];

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-lg bg-slate-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <motion.img
        src={imageUrl}
        alt=""
        className="image-contain absolute inset-0 p-5"
        initial={{ opacity: 0.88, filter: "saturate(1) brightness(1)" }}
        animate={{ opacity: 0.58, filter: "grayscale(0.72) saturate(0.58) brightness(0.68) contrast(1.04)" }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      <motion.img
        src={imageUrl}
        alt=""
        className="image-contain absolute inset-0 p-5"
        style={{
          WebkitMaskImage: "radial-gradient(ellipse 32% 48% at 50% 50%, #000 0%, #000 55%, transparent 74%)",
          maskImage: "radial-gradient(ellipse 32% 48% at 50% 50%, #000 0%, #000 55%, transparent 74%)"
        }}
        animate={{ opacity: [0.78, 1, 0.82], filter: ["saturate(1.04)", "saturate(1.18)", "saturate(1.08)"] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 h-[52%] w-[40%] -translate-x-1/2 -translate-y-1/2 rounded-[46%] border border-cyan-200/65 shadow-[0_0_22px_rgba(125,211,252,0.45),0_0_78px_rgba(168,85,247,0.34)]"
        animate={{
          scale: [0.96, 1.04, 0.98],
          opacity: [0.46, 0.88, 0.58],
          boxShadow: [
            "0 0 20px rgba(125,211,252,0.36), 0 0 58px rgba(168,85,247,0.26)",
            "0 0 32px rgba(34,211,238,0.58), 0 0 96px rgba(124,58,237,0.42)",
            "0 0 22px rgba(125,211,252,0.42), 0 0 70px rgba(59,130,246,0.30)"
          ]
        }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute -left-1/3 top-[-20%] h-[150%] w-28 rotate-12 bg-gradient-to-r from-transparent via-cyan-100/70 to-transparent blur-[2px]"
        animate={{ x: ["0%", "480%"], opacity: [0, 0.95, 0] }}
        transition={{ duration: 2.15, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute inset-0 bg-white/18 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.28, 0.06] }}
        transition={{ duration: 1.15, ease: "easeOut" }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(59,130,246,0.18),transparent_34%,rgba(34,211,238,0.10)_58%,rgba(168,85,247,0.14))]" />
      <div className="scan-lines absolute inset-0 opacity-[0.13]" />

      {particles.map((particle) => (
        <motion.span
          key={`${particle.left}-${particle.top}`}
          className="absolute h-1.5 w-1.5 rounded-full bg-cyan-100 shadow-[0_0_16px_rgba(103,232,249,0.72)]"
          style={{ left: particle.left, top: particle.top }}
          animate={{
            opacity: [0.08, 0.72, 0.14],
            x: [0, particle.drift, 0],
            y: [0, -10, 0],
            scale: [0.72, 1.22, 0.82]
          }}
          transition={{ duration: 2.6, repeat: Infinity, delay: particle.delay, ease: "easeInOut" }}
        />
      ))}

      <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-lg border border-white/18 bg-white/12 px-4 py-3 text-white shadow-[0_16px_46px_rgba(2,6,23,0.28)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <motion.span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/12 shadow-[inset_0_0_18px_rgba(255,255,255,0.14)]"
            animate={{ boxShadow: ["inset 0 0 18px rgba(255,255,255,0.12)", "inset 0 0 22px rgba(34,211,238,0.24)", "inset 0 0 18px rgba(255,255,255,0.12)"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-4 w-4 text-cyan-100" aria-hidden="true" />
          </motion.span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-normal text-cyan-100/78">AI render engine</p>
            <motion.p
              key={currentStatus}
              className="mt-0.5 text-sm font-semibold text-white"
              initial={{ opacity: 0, y: 5, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              {currentStatus}
            </motion.p>
          </div>
        </div>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((pulse) => (
            <motion.span
              key={pulse}
              className="h-1.5 w-1.5 rounded-full bg-cyan-100"
              animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.18, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: pulse * 0.18, ease: "easeInOut" }}
            />
          ))}
        </span>
      </div>
    </motion.div>
  );
}
