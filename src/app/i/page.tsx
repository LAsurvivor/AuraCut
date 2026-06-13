"use client";

import { AlertTriangle, ArrowLeft, Download, Image as ImageIcon, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getStoredImage, markStoredImageDeleted } from "@/lib/client-image-store";
import { deleteHostedImage, fetchHostedImage } from "@/lib/image-api";

type ViewerState = "loading" | "ready" | "missing" | "error";
type DeleteMode = "local" | "remote" | "unavailable";

function readImageIdFromUrl(): string | null {
  const imageId = new URLSearchParams(window.location.search).get("id");

  return imageId?.trim() || null;
}

export default function SharedImagePage() {
  const [downloadName, setDownloadName] = useState("auracut");
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("unavailable");
  const [deleteToken, setDeleteToken] = useState<string | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [state, setState] = useState<ViewerState>("loading");

  async function deleteImage(): Promise<void> {
    if (!imageId) {
      return;
    }

    try {
      if (deleteMode === "remote" && deleteToken) {
        await deleteHostedImage({ deleteToken, id: imageId });
      }

      await markStoredImageDeleted(imageId);
    } catch {
      setState("error");
      return;
    }

    if (imageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imageUrl);
    }

    setImageUrl(null);
    setDeleteMode("unavailable");
    setDeleteToken(null);
    setState("missing");
  }

  useEffect(() => {
    let objectUrl: string | null = null;
    let isActive = true;
    const nextImageId = readImageIdFromUrl();

    setImageId(nextImageId);

    async function loadImage(): Promise<void> {
      if (!nextImageId) {
        setState("missing");
        return;
      }

      try {
        const record = await getStoredImage(nextImageId);

        if (!isActive) {
          return;
        }

        if (record?.deletedAt) {
          setState("missing");
          return;
        }

        if (record?.url) {
          setDownloadName(record.filename);
          setImageUrl(record.url);
          setDeleteToken(record.deleteToken ?? null);
          setDeleteMode(record.deleteToken ? "remote" : "unavailable");
          setState("ready");
          return;
        }

        if (record?.blob) {
          objectUrl = URL.createObjectURL(record.blob);
          setDownloadName(record.filename);
          setImageUrl(objectUrl);
          setDeleteToken(null);
          setDeleteMode("local");
          setState("ready");
          return;
        }

        const hostedImage = await fetchHostedImage(nextImageId);

        if (!isActive) {
          return;
        }

        setDownloadName(`auracut-${hostedImage.id}`);
        setImageUrl(hostedImage.processedUrl);
        setDeleteToken(null);
        setDeleteMode("unavailable");
        setState("ready");
      } catch {
        if (isActive) {
          setState("missing");
        }
      }
    }

    void loadImage();

    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);

  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.16),transparent_20rem),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.13),transparent_22rem),linear-gradient(180deg,#070a16,#02030a_58%,#05020d)]" />
      <div className="noise-overlay pointer-events-none absolute inset-0 -z-10 opacity-[0.3]" />

      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/#studio" className="font-serif text-2xl font-semibold tracking-normal text-white" aria-label="AuraCut home">
          AuraCut
        </Link>
        <Link
          href="/#studio"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-4 text-sm font-semibold text-white/72 transition hover:border-cyan-200/30 hover:bg-cyan-100 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Studio
        </Link>
      </nav>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center py-10">
        <div className="cinema-panel shared-image-canvas relative flex items-center justify-center overflow-hidden rounded-[2rem] border-white/10">
          {state === "loading" ? (
            <div className="flex flex-col items-center gap-4 text-white/60">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-100/14 bg-white/[0.045] text-cyan-100 shadow-[0_0_48px_rgba(34,211,238,0.12)]">
                <ImageIcon className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium">Loading image</p>
            </div>
          ) : null}

          {state === "ready" && imageUrl ? (
            <div className="checkerboard-dark checkerboard-animated absolute inset-0 flex items-center justify-center">
              <img
                src={imageUrl}
                alt="AuraCut generated result"
                className="image-contain"
                onError={() => setState("missing")}
              />
            </div>
          ) : null}

          {state === "missing" || state === "error" ? (
            <div className="flex max-w-md flex-col items-center px-6 text-center">
              <span className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-cyan-100/16 bg-white/[0.045] text-cyan-100 shadow-[0_0_48px_rgba(34,211,238,0.16),inset_0_0_28px_rgba(34,211,238,0.08)]">
                <span className="absolute inset-2 rounded-full bg-cyan-100/10 blur-md" />
                <AlertTriangle className="relative h-6 w-6" aria-hidden="true" />
              </span>
              <h1 className="text-xl font-semibold text-white">Image unavailable</h1>
              <p className="mt-2 text-sm leading-6 text-white/52">
                This image was deleted or is not saved in this browser.
              </p>
            </div>
          ) : null}
        </div>

        {state === "ready" && imageUrl ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <a
              href={imageUrl}
              download={downloadName}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm font-semibold text-white/72 shadow-[0_18px_70px_rgba(2,6,23,0.18)] transition hover:border-cyan-200/30 hover:bg-cyan-100 hover:text-slate-950"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download
            </a>
            {deleteMode !== "unavailable" ? (
              <button
                type="button"
                onClick={() => void deleteImage()}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm font-semibold text-white/72 shadow-[0_18px_70px_rgba(2,6,23,0.18)] transition hover:border-cyan-200/30 hover:bg-cyan-100 hover:text-slate-950"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </button>
            ) : null}
          </div>
        ) : null}

        {state === "missing" || state === "error" ? (
          <Link
            href="/#studio"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-cyan-100/18 bg-cyan-100 px-5 text-sm font-semibold text-slate-950 shadow-[0_18px_70px_rgba(34,211,238,0.22)] transition hover:bg-white"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Again
          </Link>
        ) : null}
      </section>
    </main>
  );
}
