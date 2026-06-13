"use client";

import { motion } from "framer-motion";
import { Check, Download, Eye, Link2, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { DragEvent, useEffect, useRef, useState } from "react";

import { ProcessingAnimation } from "./ProcessingAnimation";

type CardState = "idle" | "processing" | "result" | "error";
type ToastKind = "copied" | "downloaded" | "deleted" | null;

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ACCEPTED_INPUT = "image/png,image/jpeg,image/webp,.jpg,.jpeg";
const MAX_UPLOAD_MB = 10;
const PRESET_IMAGES = [
  {
    name: "Portrait",
    url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&h=900&q=84"
  },
  {
    name: "Watch",
    url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&h=900&q=84"
  },
  {
    name: "Pet",
    url: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&h=900&q=84"
  },
  {
    name: "Plant",
    url: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&h=900&q=84"
  }
];

function revokeBlobUrl(url: string | null): void {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function loadImage(sourceUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    if (!sourceUrl.startsWith("blob:") && !sourceUrl.startsWith("data:")) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image."));
    image.src = sourceUrl;
  });
}

function colorDistance(data: Uint8ClampedArray, index: number, color: [number, number, number]): number {
  const red = data[index] - color[0];
  const green = data[index + 1] - color[1];
  const blue = data[index + 2] - color[2];

  return Math.sqrt(red * red + green * green + blue * blue);
}

function sampleBackgroundColor(data: Uint8ClampedArray, width: number, height: number): [number, number, number] {
  const samplePoints = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)],
    [width - 1, Math.floor(height / 2)]
  ];

  const total = samplePoints.reduce(
    (sum, [x, y]) => {
      const index = (y * width + x) * 4;
      sum[0] += data[index];
      sum[1] += data[index + 1];
      sum[2] += data[index + 2];
      return sum;
    },
    [0, 0, 0]
  );

  return [total[0] / samplePoints.length, total[1] / samplePoints.length, total[2] / samplePoints.length];
}

async function createMockProcessedPng(sourceUrl: string): Promise<string> {
  const image = await loadImage(sourceUrl);
  const maxSide = 1500;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Canvas is unavailable.");
  }

  context.translate(width, 0);
  context.scale(-1, 1);
  context.drawImage(image, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  const backgroundColor = sampleBackgroundColor(imageData.data, width, height);
  const transparentDistance = 46;
  const featherDistance = 88;

  for (let index = 0; index < imageData.data.length; index += 4) {
    const distance = colorDistance(imageData.data, index, backgroundColor);

    if (distance < transparentDistance) {
      imageData.data[index + 3] = 0;
    } else if (distance < featherDistance) {
      const opacity = (distance - transparentDistance) / (featherDistance - transparentDistance);
      imageData.data[index + 3] = Math.round(imageData.data[index + 3] * opacity);
    }
  }

  context.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not create mock PNG."));
        return;
      }

      resolve(URL.createObjectURL(blob));
    }, "image/png");
  });
}

function validateFile(file: File): string | undefined {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const hasAllowedExtension = extension ? ["png", "jpg", "jpeg", "webp"].includes(extension) : false;

  if (!ACCEPTED_TYPES.includes(file.type) && !hasAllowedExtension) {
    return "Upload a PNG, JPG, JPEG, or WEBP image.";
  }

  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `Keep images under ${MAX_UPLOAD_MB} MB.`;
  }

  return undefined;
}

async function copyTextToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textArea);

    if (!copied) {
      throw new Error("Could not copy URL.");
    }
  }
}

export function TransformationCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLLabelElement>(null);
  const hostedBlobUrlsRef = useRef<Set<string>>(new Set());
  const validShareUrlsRef = useRef<Set<string>>(new Set());
  const [state, setState] = useState<CardState>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastKind>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showCompleteTick, setShowCompleteTick] = useState(false);
  const [showResultActions, setShowResultActions] = useState(false);
  const isCanvasExpanded = state !== "idle" && Boolean(previewUrl);

  function revokeIfDisposable(url: string | null): void {
    if (!url || hostedBlobUrlsRef.current.has(url)) {
      return;
    }

    revokeBlobUrl(url);
  }

  useEffect(() => {
    return () => {
      revokeIfDisposable(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (resultUrl !== previewUrl && !hostedBlobUrlsRef.current.has(resultUrl ?? "")) {
        revokeBlobUrl(resultUrl);
      }
    };
  }, [previewUrl, resultUrl]);

  useEffect(() => {
    const hostedBlobUrls = hostedBlobUrlsRef.current;

    return () => {
      hostedBlobUrls.forEach((url) => revokeBlobUrl(url));
      hostedBlobUrls.clear();
    };
  }, []);

  useEffect(() => {
    if (state !== "processing") {
      return;
    }

    let animationFrame = 0;
    let lastProgress = -1;
    const startedAt = performance.now();
    const duration = 3350;

    const tick = (time: number) => {
      const elapsed = Math.max(0, time - startedAt);
      const rawProgress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - rawProgress, 2.45);
      const nextProgress = Math.min(99, Math.round(easedProgress * 99));

      if (nextProgress !== lastProgress) {
        lastProgress = nextProgress;
        setProcessingProgress(nextProgress);
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [state]);

  useEffect(() => {
    if (!showCompleteTick) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowCompleteTick(false);
      setShowResultActions(true);
    }, 720);

    return () => window.clearTimeout(timer);
  }, [showCompleteTick]);

  function clearWorkspace(): void {
    revokeIfDisposable(previewUrl);

    setState("idle");
    setPreviewUrl(null);
    setResultUrl(null);
    setShareUrl(null);
    setError(null);
    setToast(null);
    setShowOriginal(false);
    setProcessingProgress(0);
    setShowCompleteTick(false);
    setShowResultActions(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function showToast(kind: ToastKind): void {
    setToast(kind);
    window.setTimeout(() => setToast(null), 1500);
  }

  function centerCanvasInViewport(): void {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function getCanvasCenterTop(): number | null {
      const canvas = canvasRef.current;

      if (!canvas) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();

      return Math.max(0, window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2);
    }

    function scrollToCanvasCenter(behavior: ScrollBehavior): void {
      const nextTop = getCanvasCenterTop();

      if (nextTop === null) {
        return;
      }

      window.scrollTo({ behavior, top: nextTop });
    }

    function snapCanvasToCenter(): void {
      const nextTop = getCanvasCenterTop();

      if (nextTop !== null) {
        window.scrollTo(0, nextTop);
      }
    }

    requestAnimationFrame(() => {
      canvasRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "center",
        inline: "nearest"
      });
      scrollToCanvasCenter(prefersReducedMotion ? "auto" : "smooth");
      window.setTimeout(snapCanvasToCenter, 180);
      window.setTimeout(snapCanvasToCenter, 420);
      window.setTimeout(snapCanvasToCenter, 760);
    });
  }

  async function simulateProcessing(nextPreviewUrl: string): Promise<void> {
    setProcessingProgress(0);
    setShowCompleteTick(false);
    setShowResultActions(false);
    setState("processing");
    centerCanvasInViewport();
    const processedPromise = createMockProcessedPng(nextPreviewUrl).catch(() => nextPreviewUrl);
    const [, processedUrl] = await Promise.all([new Promise((resolve) => window.setTimeout(resolve, 3350)), processedPromise]);
    const nextShareUrl = `https://auracut.app/i/${crypto.randomUUID().slice(0, 8)}.png`;

    if (processedUrl.startsWith("blob:")) {
      hostedBlobUrlsRef.current.add(processedUrl);
    }

    setResultUrl((currentResultUrl) => {
      if (currentResultUrl !== nextPreviewUrl && !hostedBlobUrlsRef.current.has(currentResultUrl ?? "")) {
        revokeBlobUrl(currentResultUrl);
      }

      return processedUrl;
    });
    setShareUrl(nextShareUrl);
    validShareUrlsRef.current.add(nextShareUrl);
    setProcessingProgress(100);
    setShowCompleteTick(true);
    setShowResultActions(false);
    setState("result");
  }

  async function handleFile(file: File) {
    const validationMessage = validateFile(file);
    if (validationMessage) {
      setError(validationMessage);
      setState("error");
      return;
    }

    revokeIfDisposable(previewUrl);

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);
    setResultUrl(null);
    setShareUrl(null);
    setError(null);
    setShowOriginal(false);
    setProcessingProgress(0);
    setShowCompleteTick(false);
    setShowResultActions(false);
    await simulateProcessing(nextPreviewUrl);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  }

  async function copyUrl() {
    if (!shareUrl) {
      return;
    }

    await copyTextToClipboard(shareUrl);
    showToast("copied");
  }

  function deleteImage(): void {
    if (shareUrl) {
      validShareUrlsRef.current.delete(shareUrl);
    }

    if (resultUrl) {
      hostedBlobUrlsRef.current.delete(resultUrl);
      revokeBlobUrl(resultUrl);
    }

    clearWorkspace();
    showToast("deleted");
  }

  function startAgain(): void {
    clearWorkspace();
  }

  async function startPreset(url: string): Promise<void> {
    revokeIfDisposable(previewUrl);

    setPreviewUrl(url);
    setResultUrl(null);
    setShareUrl(null);
    setError(null);
    setShowOriginal(false);
    setProcessingProgress(0);
    setShowCompleteTick(false);
    setShowResultActions(false);
    await simulateProcessing(url);
  }

  return (
    <motion.section
      id="studio"
      className={`tool-shell mx-auto w-full px-4 pb-36 sm:px-6 sm:pb-40 lg:px-8 lg:pb-44 ${isCanvasExpanded ? "tool-shell-expanded" : ""}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <div className="tool-stage">
        <label
          ref={canvasRef}
          className={`cinema-panel tool-canvas relative flex origin-bottom cursor-pointer items-center justify-center overflow-hidden rounded-[2rem] border transition-[background-color,border-color,box-shadow,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isDragging
              ? "scale-[1.01] border-cyan-200/60 bg-white/[0.08] shadow-[0_0_0_1px_rgba(103,232,249,0.24),0_30px_120px_rgba(34,211,238,0.22)]"
            : state === "processing"
                ? "tool-canvas-expanded border-cyan-200/42 bg-slate-950 shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_30px_130px_rgba(59,130,246,0.22),inset_0_0_64px_rgba(168,85,247,0.13)]"
            : state === "idle"
                ? "border-dashed border-white/14 bg-white/[0.035] hover:border-cyan-200/34 hover:bg-white/[0.055] hover:shadow-[0_0_0_1px_rgba(34,211,238,0.14),0_26px_100px_rgba(59,130,246,0.16)]"
                : "tool-canvas-expanded border-white/12 bg-slate-950/78"
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_INPUT}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          />

        {state === "idle" ? (
          <div className="relative flex flex-col items-center px-6 text-center">
            <motion.span
              className="absolute -inset-x-24 -inset-y-28 bg-[linear-gradient(115deg,transparent_18%,rgba(34,211,238,0.11)_38%,rgba(168,85,247,0.10)_58%,transparent_78%)] blur-2xl"
              animate={{ x: ["-8%", "8%", "-4%"], opacity: [0.34, 0.72, 0.42] }}
              transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              className="relative inline-flex min-h-12 items-center gap-2 rounded-full border border-cyan-100/18 bg-cyan-100 px-6 text-sm font-semibold text-slate-950 shadow-[0_0_44px_rgba(103,232,249,0.22)] transition hover:bg-white"
              animate={isDragging ? { y: [0, -5, 0], scale: [1, 1.03, 1] } : { y: 0, scale: 1 }}
              transition={{ duration: 1.2, repeat: isDragging ? Infinity : 0, ease: "easeInOut" }}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload Image
            </motion.span>
            <p className="relative mt-4 text-sm text-white/44">or drop an image here.</p>
          </div>
        ) : null}

          {previewUrl && state === "result" ? (
            <img
              src={previewUrl}
              alt="Uploaded image"
              className={`image-contain absolute inset-0 transition duration-300 ${
                state === "result" && resultUrl && !showOriginal ? "opacity-0" : "opacity-100"
              }`}
            />
          ) : null}

          {state === "processing" ? <ProcessingAnimation /> : null}

          {state === "result" && resultUrl ? (
            <motion.div
              className={`absolute inset-0 flex items-center justify-center ${showOriginal ? "bg-slate-950" : "checkerboard-dark checkerboard-animated"}`}
              initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
              animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              {showOriginal && previewUrl ? (
                <motion.img
                  key="original"
                  src={previewUrl}
                  alt="Original image"
                  className="image-contain"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.16 }}
                />
              ) : (
                <motion.img
                  key="processed"
                  src={resultUrl}
                  alt="Processed image"
                  className="image-contain"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, delay: 0.05 }}
                />
              )}
            </motion.div>
          ) : null}

          {state === "error" ? (
            <div className="flex max-w-md flex-col items-center px-6 text-center">
              <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-lg border border-rose-200/18 bg-rose-400/10 text-rose-200">
                <X className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="text-xl font-semibold text-white">Could not transform</h3>
              <p className="mt-2 text-sm leading-6 text-white/52">{error}</p>
            </div>
          ) : null}
        </label>

        <div
          className={`preset-tray flex flex-col items-center gap-3 text-center ${
            state === "idle" ? "opacity-100" : "preset-tray-hidden"
          }`}
          aria-hidden={state !== "idle"}
        >
          <p className="text-sm text-white/42">
            No Image? <span className="text-white/68">Try one of these.</span>
          </p>
          <div className="grid grid-cols-4 gap-3">
            {PRESET_IMAGES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                disabled={state !== "idle"}
                onClick={() => void startPreset(preset.url)}
                className="group h-16 w-16 rounded-[1.15rem] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-100/70"
                title={preset.name}
                aria-label={`Try ${preset.name}`}
              >
                <img
                  src={preset.url}
                  alt=""
                  className="h-full w-full rounded-[1.15rem] object-cover shadow-[0_14px_38px_rgba(2,6,23,0.32)] transition duration-300 group-hover:shadow-[0_18px_48px_rgba(34,211,238,0.18)]"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex h-14 flex-col items-center gap-3">
        {state === "processing" ? (
          <motion.div
            className="inline-flex h-10 min-w-20 items-center justify-center rounded-full border border-cyan-100/18 bg-cyan-100/10 px-5 text-sm font-semibold tabular-nums text-cyan-50 shadow-[0_18px_70px_rgba(34,211,238,0.16),inset_0_0_24px_rgba(34,211,238,0.08)] backdrop-blur-xl"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            aria-live="polite"
          >
            {processingProgress}%
          </motion.div>
        ) : null}

        {showCompleteTick ? (
          <motion.div
            className="inline-flex h-10 items-center gap-2 rounded-full border border-cyan-100/22 bg-cyan-100 px-4 text-sm font-semibold text-slate-950 shadow-[0_18px_70px_rgba(34,211,238,0.24)]"
            initial={{ opacity: 0, scale: 0.76 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Ready"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Ready
          </motion.div>
        ) : null}

        {resultUrl && showResultActions ? (
          <motion.div
            className="flex flex-wrap justify-center gap-2 rounded-full border border-white/10 bg-white/[0.045] p-2 shadow-[0_18px_70px_rgba(2,6,23,0.22)] backdrop-blur-xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                setShowOriginal(true);
              }}
              onPointerUp={(event) => {
                event.preventDefault();
                setShowOriginal(false);
              }}
              onPointerCancel={() => setShowOriginal(false)}
              onPointerLeave={() => setShowOriginal(false)}
              onKeyDown={(event) => {
                if (event.key === " " || event.key === "Enter") {
                  setShowOriginal(true);
                }
              }}
              onKeyUp={() => setShowOriginal(false)}
              onBlur={() => setShowOriginal(false)}
              className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/72 transition hover:border-cyan-200/30 hover:bg-cyan-100 hover:text-slate-950"
              title="Hold to compare"
              aria-label="Hold to compare"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span className="pointer-events-none absolute -top-9 scale-95 rounded-full border border-white/10 bg-slate-950/90 px-2 py-1 text-[11px] text-white/70 opacity-0 shadow-[0_12px_30px_rgba(2,6,23,0.32)] transition group-hover:scale-100 group-hover:opacity-100">Compare</span>
            </button>
            <button
              type="button"
              onClick={() => void copyUrl()}
              className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/72 transition hover:border-cyan-200/30 hover:bg-cyan-100 hover:text-slate-950"
              title="Copy URL"
              aria-label="Copy URL"
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              <span className="pointer-events-none absolute -top-9 scale-95 rounded-full border border-white/10 bg-slate-950/90 px-2 py-1 text-[11px] text-white/70 opacity-0 shadow-[0_12px_30px_rgba(2,6,23,0.32)] transition group-hover:scale-100 group-hover:opacity-100">Copy</span>
            </button>
            <a
              href={resultUrl}
              download
              onClick={() => showToast("downloaded")}
              className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/72 transition hover:border-cyan-200/30 hover:bg-cyan-100 hover:text-slate-950"
              title="Download"
              aria-label="Download"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span className="pointer-events-none absolute -top-9 scale-95 rounded-full border border-white/10 bg-slate-950/90 px-2 py-1 text-[11px] text-white/70 opacity-0 shadow-[0_12px_30px_rgba(2,6,23,0.32)] transition group-hover:scale-100 group-hover:opacity-100">Save</span>
            </a>
            <button
              type="button"
              onClick={startAgain}
              className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/72 transition hover:border-cyan-200/30 hover:bg-cyan-100 hover:text-slate-950"
              title="Again"
              aria-label="Generate again"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span className="pointer-events-none absolute -top-9 scale-95 rounded-full border border-white/10 bg-slate-950/90 px-2 py-1 text-[11px] text-white/70 opacity-0 shadow-[0_12px_30px_rgba(2,6,23,0.32)] transition group-hover:scale-100 group-hover:opacity-100">Again</span>
            </button>
            <button
              type="button"
              onClick={deleteImage}
              className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/72 transition hover:border-cyan-200/30 hover:bg-cyan-100 hover:text-slate-950"
              title="Delete"
              aria-label="Delete image"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span className="pointer-events-none absolute -top-9 scale-95 rounded-full border border-white/10 bg-slate-950/90 px-2 py-1 text-[11px] text-white/70 opacity-0 shadow-[0_12px_30px_rgba(2,6,23,0.32)] transition group-hover:scale-100 group-hover:opacity-100">Delete</span>
            </button>
          </motion.div>
        ) : null}
      </div>

      {toast ? (
        <motion.div
          className="fixed bottom-6 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-cyan-100/20 bg-slate-950/92 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(2,6,23,0.42),0_0_38px_rgba(34,211,238,0.2)] backdrop-blur-xl"
          initial={{ opacity: 0, y: 12, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 12, x: "-50%" }}
        >
          <Check className="h-4 w-4 text-cyan-100" aria-hidden="true" />
          {toast === "copied"
            ? "URL copied"
            : toast === "deleted"
              ? "Image deleted"
              : "Download started"}
        </motion.div>
      ) : null}
    </motion.section>
  );
}
