"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const statuses = ["Analyze", "Cut", "Flip", "Host"];

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
        animate={{ opacity: [0.42, 0.5, 0.42], filter: ["grayscale(0.75) brightness(0.62)", "grayscale(0.55) brightness(0.72)", "grayscale(0.75) brightness(0.62)"] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.img
        src={imageUrl}
        alt=""
        className="image-contain absolute inset-0 p-5"
        style={{
          WebkitMaskImage: "radial-gradient(ellipse 31% 47% at 50% 50%, #000 0%, #000 52%, transparent 74%)",
          maskImage: "radial-gradient(ellipse 31% 47% at 50% 50%, #000 0%, #000 52%, transparent 74%)"
        }}
        animate={{ opacity: [0.62, 0.88, 0.64], filter: ["saturate(0.95)", "saturate(1.16)", "saturate(1)"] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 h-[55%] w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-[45%] border border-cyan-100/36 shadow-[0_0_42px_rgba(34,211,238,0.18)]"
        animate={{ opacity: [0.22, 0.72, 0.28], scale: [0.98, 1.025, 0.99] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute -left-1/4 top-[-30%] h-[160%] w-20 rotate-12 bg-gradient-to-r from-transparent via-white/48 to-transparent blur-sm"
        animate={{ x: ["0%", "620%"], opacity: [0, 0.7, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-4 rounded-[1.55rem] border border-white/[0.07]" />
      <motion.div
        className="absolute inset-4 rounded-[1.55rem] border border-cyan-100/0"
        animate={{ borderColor: ["rgba(103,232,249,0.05)", "rgba(103,232,249,0.24)", "rgba(103,232,249,0.06)"] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_24%,rgba(34,211,238,0.04)_65%,transparent)]" />

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
