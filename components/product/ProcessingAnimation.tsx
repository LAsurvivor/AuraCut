"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const statuses = ["Analyze", "Cut", "Flip", "Host"];
const blobs = [
  { delay: 0, left: "29%", size: "30%", top: "22%" },
  { delay: 0.22, left: "47%", size: "36%", top: "17%" },
  { delay: 0.44, left: "38%", size: "42%", top: "38%" },
  { delay: 0.62, left: "58%", size: "28%", top: "47%" }
];

export function ProcessingAnimation({ imageUrl }: { imageUrl: string }) {
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
      <motion.img
        src={imageUrl}
        alt=""
        className="image-contain absolute inset-0 p-5"
        initial={{ filter: "blur(0px) saturate(1)" }}
        animate={{
          filter: ["blur(10px) saturate(0.6) brightness(0.58)", "blur(14px) saturate(0.48) brightness(0.5)", "blur(10px) saturate(0.6) brightness(0.58)"],
          opacity: [0.44, 0.34, 0.44]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,18,0.22),rgba(3,7,18,0.74))]" />

      <motion.div
        className="absolute left-1/2 top-1/2 h-[60%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-[44%] bg-cyan-200/12 blur-3xl"
        animate={{ opacity: [0.28, 0.72, 0.34], scale: [0.9, 1.08, 0.96] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-0 blur-xl contrast-[1.85]">
        {blobs.map((blob) => (
          <motion.span
            key={`${blob.left}-${blob.top}`}
            className="absolute rounded-full bg-cyan-100/72 mix-blend-screen"
            style={{ height: blob.size, left: blob.left, top: blob.top, width: blob.size }}
            animate={{
              borderRadius: ["44% 56% 52% 48%", "61% 39% 44% 56%", "48% 52% 64% 36%", "44% 56% 52% 48%"],
              opacity: [0.2, 0.46, 0.26],
              scale: [0.82, 1.08, 0.92],
              x: [0, 18, -10, 0],
              y: [0, -14, 12, 0]
            }}
            transition={{ delay: blob.delay, duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <motion.img
        src={imageUrl}
        alt=""
        className="image-contain absolute inset-0 p-5"
        style={{
          WebkitMaskImage: "radial-gradient(ellipse 32% 48% at 50% 50%, #000 0%, #000 52%, transparent 74%)",
          maskImage: "radial-gradient(ellipse 32% 48% at 50% 50%, #000 0%, #000 52%, transparent 74%)"
        }}
        animate={{
          filter: ["blur(1.5px) saturate(0.95)", "blur(0px) saturate(1.18)", "blur(1px) saturate(1)"],
          opacity: [0.68, 0.94, 0.72]
        }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
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
