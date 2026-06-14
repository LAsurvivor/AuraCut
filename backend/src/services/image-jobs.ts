import { randomUUID } from "node:crypto";

import type { AppConfig } from "../config/env.js";
import { HttpError, isHttpError, type ErrorCode } from "../errors/http-error.js";
import { removeBackground } from "./background-removal.js";
import { createDeleteToken } from "./delete-token.js";
import { hostImages } from "./image-hosting.js";
import { flipHorizontally } from "./image-processing.js";
import { buildImagePublicIds } from "../utils/public-ids.js";
import type { ValidatedImageUpload } from "../utils/upload-validation.js";

export type ImageJobStage = "queued" | "removing" | "flipping" | "hosting" | "ready" | "failed";

export type ImageJobImage = {
  createdAt: string;
  deleteToken: string;
  id: string;
  metadata: {
    backgroundRemovalCreditsConsumed?: string;
    backgroundRemovalCreditsRemaining?: string;
    format?: string;
    height?: number;
    processedSizeBytes?: number;
    sourceSizeBytes?: number;
    width?: number;
  };
  originalUrl: string;
  processedUrl: string;
};

export type ImageJobSnapshot = {
  createdAt: string;
  error?: {
    code: ErrorCode;
    message: string;
  };
  id: string;
  image?: ImageJobImage;
  progress: number;
  stage: ImageJobStage;
  updatedAt: string;
};

export type ImageJobEvent =
  | {
      job: ImageJobSnapshot;
      type: "progress";
    }
  | {
      job: ImageJobSnapshot;
      type: "ready";
    }
  | {
      job: ImageJobSnapshot;
      type: "failed";
    };

type ImageJob = ImageJobSnapshot & {
  subscribers: Set<(event: ImageJobEvent) => void>;
  timeout: ReturnType<typeof setTimeout>;
};

const JOB_TTL_MS = 30 * 60 * 1000;
const BASE_JOB_TIMEOUT_MS = 45 * 1000;
const MAX_JOB_TIMEOUT_MS = 120 * 1000;
const TIMEOUT_MS_PER_UPLOAD_MB = 6 * 1000;
const BYTES_PER_MB = 1024 * 1024;
const jobs = new Map<string, ImageJob>();

export function createUploadedImageJob(upload: ValidatedImageUpload, config: AppConfig): ImageJobSnapshot {
  cleanupExpiredJobs();

  const now = new Date().toISOString();
  const timeoutMs = getJobTimeoutMs(upload.sizeBytes);
  const job = {
    createdAt: now,
    id: randomUUID(),
    progress: 22,
    stage: "queued",
    subscribers: new Set(),
    timeout: setTimeout(() => {
      failJob(job, new HttpError(504, "image_job_timeout", "Image processing timed out. Try again."));
    }, timeoutMs),
    updatedAt: now
  } satisfies ImageJob;

  jobs.set(job.id, job);
  void processUploadedImageJob(job, upload, config);

  return snapshotJob(job);
}

function getJobTimeoutMs(sizeBytes: number): number {
  const uploadMegabytes = Math.ceil(sizeBytes / BYTES_PER_MB);

  return Math.min(MAX_JOB_TIMEOUT_MS, BASE_JOB_TIMEOUT_MS + uploadMegabytes * TIMEOUT_MS_PER_UPLOAD_MB);
}

export function getImageJob(jobId: string): ImageJobSnapshot | undefined {
  const job = jobs.get(jobId);

  return job ? snapshotJob(job) : undefined;
}

export function subscribeToImageJob(jobId: string, subscriber: (event: ImageJobEvent) => void): (() => void) | undefined {
  const job = jobs.get(jobId);

  if (!job) {
    return undefined;
  }

  job.subscribers.add(subscriber);
  subscriber(eventFromJob(job));

  return () => {
    job.subscribers.delete(subscriber);
  };
}

async function processUploadedImageJob(job: ImageJob, upload: ValidatedImageUpload, config: AppConfig): Promise<void> {
  try {
    updateJob(job, "removing", 34);
    const backgroundRemoved = await removeBackground(upload, config);

    if (isTerminalJob(job)) {
      return;
    }

    updateJob(job, "flipping", 72);
    const flipped = await flipHorizontally(backgroundRemoved.buffer);

    if (isTerminalJob(job)) {
      return;
    }

    updateJob(job, "hosting", 84);
    const publicIds = buildImagePublicIds(job.id);
    const hostedImages = await hostImages(upload.buffer, flipped.buffer, publicIds, config);

    if (isTerminalJob(job)) {
      return;
    }

    const image: ImageJobImage = {
      createdAt: job.createdAt,
      deleteToken: createDeleteToken(job.id, config.deleteTokenSecret as string),
      id: job.id,
      metadata: {
        backgroundRemovalCreditsConsumed: backgroundRemoved.creditsConsumed,
        backgroundRemovalCreditsRemaining: backgroundRemoved.remainingCredits,
        format: hostedImages.processed.format,
        height: flipped.height,
        processedSizeBytes: hostedImages.processed.bytes,
        sourceSizeBytes: upload.sizeBytes,
        width: flipped.width
      },
      originalUrl: hostedImages.original.secureUrl,
      processedUrl: hostedImages.processed.secureUrl
    };

    completeJob(job, image);
  } catch (error) {
    failJob(job, error);
  }
}

function completeJob(job: ImageJob, image: ImageJobImage): void {
  if (isTerminalJob(job)) {
    return;
  }

  clearTimeout(job.timeout);
  job.image = image;
  job.progress = 100;
  job.stage = "ready";
  job.updatedAt = new Date().toISOString();
  broadcast(job, "ready");
}

function failJob(job: ImageJob, error: unknown): void {
  if (isTerminalJob(job)) {
    return;
  }

  clearTimeout(job.timeout);
  const fallback = new HttpError(500, "internal_error", "Something went wrong while processing the image.");
  const httpError = isHttpError(error) ? error : fallback;

  job.error = {
    code: httpError.code,
    message: httpError.message
  };
  job.progress = 0;
  job.stage = "failed";
  job.updatedAt = new Date().toISOString();
  broadcast(job, "failed");
}

function updateJob(job: ImageJob, stage: Exclude<ImageJobStage, "ready" | "failed">, progress: number): void {
  if (isTerminalJob(job)) {
    return;
  }

  job.stage = stage;
  job.progress = progress;
  job.updatedAt = new Date().toISOString();
  broadcast(job, "progress");
}

function isTerminalJob(job: ImageJobSnapshot): boolean {
  return job.stage === "ready" || job.stage === "failed";
}

function broadcast(job: ImageJob, type: ImageJobEvent["type"]): void {
  const event = {
    job: snapshotJob(job),
    type
  } as ImageJobEvent;

  job.subscribers.forEach((subscriber) => subscriber(event));
}

function eventFromJob(job: ImageJob): ImageJobEvent {
  if (job.stage === "ready") {
    return {
      job: snapshotJob(job),
      type: "ready"
    };
  }

  if (job.stage === "failed") {
    return {
      job: snapshotJob(job),
      type: "failed"
    };
  }

  return {
    job: snapshotJob(job),
    type: "progress"
  };
}

function snapshotJob(job: ImageJob): ImageJobSnapshot {
  return {
    createdAt: job.createdAt,
    error: job.error,
    id: job.id,
    image: job.image,
    progress: job.progress,
    stage: job.stage,
    updatedAt: job.updatedAt
  };
}

function cleanupExpiredJobs(): void {
  const now = Date.now();

  jobs.forEach((job, jobId) => {
    if (now - Date.parse(job.updatedAt) > JOB_TTL_MS) {
      jobs.delete(jobId);
    }
  });
}
