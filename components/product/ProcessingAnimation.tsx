"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";

const statuses = ["Analyze", "Cut", "Flip", "Host"];
const rows = 21;
const columns = 33;
const tau = Math.PI * 2;
const waveSpeed = 1.72;

type Dot = {
  amplitude: number;
  baseOpacity: number;
  baseRadius: number;
  color: [number, number, number];
  column: number;
  phase: number;
  row: number;
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
    const color: Dot["color"] =
      column < columns * 0.34 ? [207, 250, 254] : column > columns * 0.68 ? [221, 214, 254] : [224, 242, 254];
    const flow =
      Math.sin(column * 0.58 + row * 0.24) +
      Math.cos(row * 0.7 - column * 0.18) +
      Math.sin((column + row) * 0.31);
    const normalizedFlow = (flow + 3) / 6;

    return {
      amplitude: 1.05 + normalizedFlow * 0.42 + focus * 0.28,
      baseOpacity: 0.18 + focus * 0.32,
      baseRadius: 1.55 + focus * 0.95,
      color,
      column,
      phase: normalizedFlow * tau + Math.sin(row * 0.44) * 0.7 + Math.cos(column * 0.29) * 0.55,
      row
    };
  });
}

function DotFieldCanvas({ dots }: { dots: Dot[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    let animationFrame = 0;
    let height = 1;
    let lastFrameTime: number | null = null;
    let phaseTime = 0;
    let width = 1;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);

      const t = time * 0.001;
      const cellWidth = width / columns;
      const cellHeight = height / rows;
      const centerX = (columns - 1) / 2;
      const centerY = (rows - 1) / 2;

      context.globalCompositeOperation = "lighter";

      for (const dot of dots) {
        const x = (dot.column + 0.5) * cellWidth;
        const y = (dot.row + 0.5) * cellHeight;
        const radial = Math.hypot(dot.column - centerX, dot.row - centerY) * 0.12;
        const flowTime = t * waveSpeed;
        const wave =
          Math.sin(flowTime * 1.9 + dot.phase + dot.column * 0.13) * 0.58 +
          Math.sin(flowTime * 1.18 - dot.row * 0.31 + dot.column * 0.09) * 0.29 +
          Math.cos(flowTime * 0.82 + radial + dot.phase * 0.42) * 0.18;
        const pulse = Math.max(0, Math.min(1, (wave + 1) / 2));
        const easedPulse = 0.5 - Math.cos(pulse * Math.PI) / 2;
        const radius = dot.baseRadius * (0.44 + easedPulse * dot.amplitude * 1.18);
        const opacity = dot.baseOpacity * (0.4 + easedPulse * 1.22);
        const [r, g, b] = dot.color;

        context.beginPath();
        context.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.13})`;
        context.arc(x, y, radius * 3.4, 0, tau);
        context.fill();

        context.beginPath();
        context.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(opacity, 0.92)})`;
        context.arc(x, y, radius, 0, tau);
        context.fill();
      }

      context.globalCompositeOperation = "source-over";
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(phaseTime);
    };

    const tick = (time: number) => {
      if (lastFrameTime === null) {
        lastFrameTime = time;
      }

      const delta = Math.min(time - lastFrameTime, 1000 / 40);
      lastFrameTime = time;
      phaseTime += delta;
      draw(phaseTime);
      animationFrame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      window.cancelAnimationFrame(animationFrame);
      lastFrameTime = null;
      if (mediaQuery.matches) {
        draw(1000);
        return;
      }
      animationFrame = window.requestAnimationFrame(tick);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    start();
    mediaQuery.addEventListener("change", start);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      mediaQuery.removeEventListener("change", start);
      observer.disconnect();
    };
  }, [dots]);

  return <canvas ref={canvasRef} data-dot-field className="processing-dot-canvas absolute inset-0 h-full w-full" aria-hidden="true" />;
}

export function ProcessingAnimation() {
  const dots = useMemo(buildDots, []);

  return (
    <motion.div
      data-processing-root
      className="absolute inset-0 overflow-hidden rounded-[2rem] bg-[#030712]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <div
        className="processing-gradient absolute inset-0"
        aria-hidden="true"
      />

      <DotFieldCanvas dots={dots} />

      <div className="absolute bottom-5 left-1/2 h-8 min-w-24 -translate-x-1/2 overflow-hidden rounded-full border border-white/10 bg-slate-950/68 px-4 text-xs font-semibold uppercase tracking-normal text-cyan-50/86 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        {statuses.map((status, index) => (
          <span
            key={status}
            className="processing-status-word absolute inset-0 flex items-center justify-center"
            style={{ animationDelay: `${index * 0.68}s` }}
          >
            {status}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
