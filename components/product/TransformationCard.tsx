"use client";

import { motion } from "framer-motion";
import { Check, Download, Eye, Link2, RefreshCw, Upload, X } from "lucide-react";
import { DragEvent, useEffect, useRef, useState } from "react";

import { ProcessingAnimation } from "./ProcessingAnimation";

type CardState = "idle" | "uploaded" | "processing" | "result" | "error";
type ToastKind = "copied" | "downloaded" | null;

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ACCEPTED_INPUT = "image/png,image/jpeg,image/webp,.jpg,.jpeg";
const MAX_UPLOAD_MB = 10;
const MOCK_IMAGE =
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1200&q=88";
const PRESET_IMAGES = [
  {
    name: "Portrait",
    url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=900&q=84"
  },
  {
    name: "Product",
    url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=84"
  },
  {
    name: "Studio",
    url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=84"
  },
  {
    name: "Object",
    url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=84"
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

export function TransformationCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<CardState>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("https://auracut.app/i/mock-clean-cut.png");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastKind>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    return () => {
      revokeBlobUrl(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (resultUrl !== previewUrl) {
        revokeBlobUrl(resultUrl);
      }
    };
  }, [previewUrl, resultUrl]);

  function reset() {
    revokeBlobUrl(previewUrl);

    if (resultUrl !== previewUrl) {
      revokeBlobUrl(resultUrl);
    }

    setState("idle");
    setPreviewUrl(null);
    setResultUrl(null);
    setError(null);
    setToast(null);
    setShowOriginal(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function showToast(kind: ToastKind): void {
    setToast(kind);
    window.setTimeout(() => setToast(null), 1500);
  }

  async function simulateProcessing(nextPreviewUrl: string): Promise<void> {
    setState("processing");
    await new Promise((resolve) => window.setTimeout(resolve, 3350));
    const processedUrl = await createMockProcessedPng(nextPreviewUrl).catch(() => nextPreviewUrl);
    setResultUrl((currentResultUrl) => {
      if (currentResultUrl !== nextPreviewUrl) {
        revokeBlobUrl(currentResultUrl);
      }

      return processedUrl;
    });
    setShareUrl(`https://auracut.app/i/${crypto.randomUUID().slice(0, 8)}.png`);
    setState("result");
  }

  async function handleFile(file: File) {
    const validationMessage = validateFile(file);
    if (validationMessage) {
      setError(validationMessage);
      setState("error");
      return;
    }

    revokeBlobUrl(previewUrl);

    if (resultUrl !== previewUrl) {
      revokeBlobUrl(resultUrl);
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);
    setResultUrl(null);
    setError(null);
    setShowOriginal(false);
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
    await navigator.clipboard.writeText(shareUrl);
    showToast("copied");
  }

  async function startMockUploaded(): Promise<void> {
    revokeBlobUrl(previewUrl);

    if (resultUrl !== previewUrl) {
      revokeBlobUrl(resultUrl);
    }

    setPreviewUrl(MOCK_IMAGE);
    setResultUrl(null);
    setState("uploaded");
    setError(null);
    setShowOriginal(false);
  }

  async function startMockProcessing(): Promise<void> {
    const source = previewUrl ?? MOCK_IMAGE;
    setPreviewUrl(source);
    await simulateProcessing(source);
  }

  async function startMockResult(): Promise<void> {
    const source = previewUrl ?? MOCK_IMAGE;
    setPreviewUrl(source);
    setResultUrl((currentResultUrl) => {
      if (currentResultUrl !== previewUrl && currentResultUrl !== source) {
        revokeBlobUrl(currentResultUrl);
      }

      return null;
    });
    setShareUrl("https://auracut.app/i/demo-result.png");
    setShowOriginal(false);
    setError(null);
    setState("processing");

    const processedUrl = await createMockProcessedPng(source).catch(() => source);
    setResultUrl((currentResultUrl) => {
      if (currentResultUrl !== previewUrl && currentResultUrl !== source) {
        revokeBlobUrl(currentResultUrl);
      }

      return processedUrl;
    });
    setState("result");
  }

  async function startPreset(url: string): Promise<void> {
    revokeBlobUrl(previewUrl);

    if (resultUrl !== previewUrl) {
      revokeBlobUrl(resultUrl);
    }

    setPreviewUrl(url);
    setResultUrl(null);
    setError(null);
    setShowOriginal(false);
    await simulateProcessing(url);
  }

  return (
    <motion.section
      id="studio"
      className="mx-auto w-full max-w-4xl px-4 pb-24 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <label
        className={`cinema-panel relative flex min-h-[300px] cursor-pointer items-center justify-center overflow-hidden rounded-[2rem] border transition duration-500 sm:min-h-[430px] ${
          isDragging
            ? "scale-[1.01] border-cyan-200/60 bg-white/[0.08] shadow-[0_0_0_1px_rgba(103,232,249,0.24),0_30px_120px_rgba(34,211,238,0.22)]"
            : state === "processing"
              ? "border-cyan-200/42 bg-slate-950 shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_30px_130px_rgba(59,130,246,0.22),inset_0_0_64px_rgba(168,85,247,0.13)]"
            : state === "idle"
              ? "border-dashed border-white/14 bg-white/[0.035] hover:border-cyan-200/34 hover:bg-white/[0.055] hover:shadow-[0_0_0_1px_rgba(34,211,238,0.14),0_26px_100px_rgba(59,130,246,0.16)]"
              : "border-white/12 bg-slate-950/78"
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
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
            <p className="relative mt-4 text-sm text-white/44">or upload from URL</p>
          </div>
        ) : null}

          {previewUrl && state !== "idle" ? (
            <img
              src={previewUrl}
              alt="Uploaded image"
              className={`image-contain absolute inset-0 p-5 transition duration-300 ${
                state === "result" && resultUrl && !showOriginal ? "opacity-0" : "opacity-100"
              }`}
            />
          ) : null}

          {state === "processing" && previewUrl ? <ProcessingAnimation imageUrl={previewUrl} /> : null}

          {state === "uploaded" ? (
            <span className="absolute left-4 top-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-white/12 bg-slate-950/54 px-3 text-xs font-semibold text-white/72 shadow-[0_16px_44px_rgba(2,6,23,0.24)] backdrop-blur-xl">
              <Upload className="h-3.5 w-3.5 text-cyan-100" aria-hidden="true" />
              Image
            </span>
          ) : null}

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
                  className="image-contain p-5"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.16 }}
                />
              ) : (
                <motion.img
                  key="processed"
                  src={resultUrl}
                  alt="Processed image"
                  className="image-contain p-5"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, delay: 0.05 }}
                />
              )}
              <span className="absolute left-4 top-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-white/12 bg-slate-950/58 px-3 text-xs font-semibold text-white/76 shadow-[0_16px_44px_rgba(2,6,23,0.24)] backdrop-blur-xl">
                <Check className={`h-3.5 w-3.5 ${showOriginal ? "text-cyan-100" : "text-emerald-200"}`} aria-hidden="true" />
                {showOriginal ? "Original" : "Ready"}
              </span>
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

      {state === "idle" ? (
        <div className="mt-5 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-white/42">
            No image? <span className="text-white/68">Try one.</span>
          </p>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_IMAGES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => void startPreset(preset.url)}
                className="group h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-1 transition hover:-translate-y-0.5 hover:border-cyan-100/32 hover:bg-white/[0.08]"
                title={preset.name}
                aria-label={`Try ${preset.name}`}
              >
                <img src={preset.url} alt="" className="h-full w-full rounded-[0.85rem] object-contain" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {resultUrl ? (
        <motion.div
          className="mt-4 flex justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className="flex flex-wrap justify-center gap-2 rounded-full border border-white/10 bg-white/[0.045] p-2 shadow-[0_18px_70px_rgba(2,6,23,0.22)] backdrop-blur-xl">
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
              className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/72 transition hover:border-cyan-200/30 hover:bg-white/[0.09] hover:text-white"
              title="Hold to compare"
              aria-label="Hold to compare"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span className="pointer-events-none absolute -top-9 scale-95 rounded-full border border-white/10 bg-slate-950/90 px-2 py-1 text-[11px] text-white/70 opacity-0 shadow-[0_12px_30px_rgba(2,6,23,0.32)] transition group-hover:scale-100 group-hover:opacity-100">Compare</span>
            </button>
            <button
              type="button"
              onClick={() => void copyUrl()}
              className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/72 transition hover:border-cyan-200/30 hover:bg-white/[0.09] hover:text-white"
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
              className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-slate-950 shadow-[0_0_34px_rgba(103,232,249,0.24)] transition hover:-translate-y-0.5 hover:bg-white"
              title="Download"
              aria-label="Download"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span className="pointer-events-none absolute -top-9 scale-95 rounded-full border border-white/10 bg-slate-950/90 px-2 py-1 text-[11px] text-white/70 opacity-0 shadow-[0_12px_30px_rgba(2,6,23,0.32)] transition group-hover:scale-100 group-hover:opacity-100">Save</span>
            </a>
            <button
              type="button"
              onClick={reset}
              className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/72 transition hover:border-cyan-200/30 hover:bg-white/[0.09] hover:text-white"
              title="Re-upload"
              aria-label="Re-upload"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span className="pointer-events-none absolute -top-9 scale-95 rounded-full border border-white/10 bg-slate-950/90 px-2 py-1 text-[11px] text-white/70 opacity-0 shadow-[0_12px_30px_rgba(2,6,23,0.32)] transition group-hover:scale-100 group-hover:opacity-100">Again</span>
            </button>
          </div>
        </motion.div>
      ) : null}

      <details className="mx-auto mt-4 w-fit text-xs text-white/28">
        <summary className="cursor-pointer rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 transition hover:text-white/58">dev</summary>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => void startMockUploaded()} className="rounded-full bg-white/[0.06] px-2.5 py-1.5 font-semibold text-white/48 transition hover:bg-white/[0.1] hover:text-white/72">
            uploaded
          </button>
          <button type="button" onClick={() => void startMockProcessing()} className="rounded-full bg-white/[0.06] px-2.5 py-1.5 font-semibold text-white/48 transition hover:bg-white/[0.1] hover:text-white/72">
            processing
          </button>
          <button type="button" onClick={() => void startMockResult()} className="rounded-full bg-white/[0.06] px-2.5 py-1.5 font-semibold text-white/48 transition hover:bg-white/[0.1] hover:text-white/72">
            result
          </button>
        </div>
      </details>

      {toast ? (
        <motion.div
          className="fixed bottom-5 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-slate-950/90 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(2,6,23,0.42),0_0_32px_rgba(34,211,238,0.12)] backdrop-blur-xl"
          initial={{ opacity: 0, y: 12, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 12, x: "-50%" }}
        >
          <Check className="h-4 w-4 text-cyan-100" aria-hidden="true" />
          {toast === "copied" ? "URL copied" : "Download started"}
        </motion.div>
      ) : null}
    </motion.section>
  );
}
