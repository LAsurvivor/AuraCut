import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";

import { type AppConfig, isServiceConfigured } from "../config/env.js";
import { HttpError } from "../errors/http-error.js";
import { removeBackground } from "../services/background-removal.js";
import { createDeleteToken, verifyDeleteToken } from "../services/delete-token.js";
import { deleteHostedImages, getHostedImages, hostImages } from "../services/image-hosting.js";
import { createUploadedImageJob, getImageJob, subscribeToImageJob, type ImageJobEvent } from "../services/image-jobs.js";
import { flipHorizontally } from "../services/image-processing.js";
import { loadPresetImagePair } from "../services/preset-images.js";
import { buildImagePublicIds } from "../utils/public-ids.js";
import { validateImageUpload } from "../utils/upload-validation.js";

const IMAGE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ImageParams = {
  id: string;
};

type ImageJobParams = {
  jobId: string;
};

type PresetBody = {
  preset?: string;
};

function requireCompleteConfiguration(config: AppConfig): void {
  if (!isServiceConfigured(config)) {
    throw new HttpError(503, "service_not_configured", "The image service is missing required environment variables.");
  }
}

function readDeleteTokenHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function sendSseEvent(event: ImageJobEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function registerImageRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  app.get("/api/health", async () => ({
    configured: isServiceConfigured(config),
    maxUploadMb: Math.round(config.maxUploadBytes / (1024 * 1024)),
    ok: true
  }));

  app.post("/api/images/jobs", async (request, reply) => {
    const file = await request.file();

    if (!file) {
      throw new HttpError(400, "missing_file", "Please upload one image file.");
    }

    const buffer = await file.toBuffer();
    const upload = validateImageUpload(buffer, file.filename, config.maxUploadBytes);
    requireCompleteConfiguration(config);
    const job = createUploadedImageJob(upload, config);

    return reply.status(202).send({
      job
    });
  });

  app.get<{ Params: ImageJobParams }>("/api/images/jobs/:jobId/events", async (request, reply) => {
    requireCompleteConfiguration(config);

    const { jobId } = request.params;

    if (!IMAGE_ID_PATTERN.test(jobId)) {
      throw new HttpError(400, "invalid_job_id", "The image job id is invalid.");
    }

    if (!getImageJob(jobId)) {
      throw new HttpError(404, "job_not_found", "The image job is no longer available.");
    }

    reply.hijack();
    reply.raw.writeHead(200, {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no"
    });
    reply.raw.write("retry: 1000\n\n");

    const closeStream = () => {
      if (!reply.raw.destroyed) {
        reply.raw.end();
      }
    };
    const unsubscribe = subscribeToImageJob(jobId, (event) => {
      if (reply.raw.destroyed) {
        return;
      }

      reply.raw.write(sendSseEvent(event));

      if (event.type === "ready" || event.type === "failed") {
        setTimeout(closeStream, 100);
      }
    });

    const keepAlive = setInterval(() => {
      if (!reply.raw.destroyed) {
        reply.raw.write(": keep-alive\n\n");
      }
    }, 15000);

    request.raw.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe?.();
    });
  });

  app.post("/api/images", async (request, reply) => {
    const file = await request.file();

    if (!file) {
      throw new HttpError(400, "missing_file", "Please upload one image file.");
    }

    const buffer = await file.toBuffer();
    const upload = validateImageUpload(buffer, file.filename, config.maxUploadBytes);
    requireCompleteConfiguration(config);

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const publicIds = buildImagePublicIds(id);
    const backgroundRemoved = await removeBackground(upload, config);
    const flipped = await flipHorizontally(backgroundRemoved.buffer);
    const hostedImages = await hostImages(upload.buffer, flipped.buffer, publicIds, config);

    return reply.status(201).send({
      image: {
        createdAt,
        deleteToken: createDeleteToken(id, config.deleteTokenSecret as string),
        id,
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
      }
    });
  });

  app.post<{ Body: PresetBody }>("/api/images/presets", async (request, reply) => {
    requireCompleteConfiguration(config);

    const preset = request.body?.preset;

    if (!preset) {
      throw new HttpError(400, "preset_not_found", "The selected sample image is not available.");
    }

    const presetImage = await loadPresetImagePair(preset);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const publicIds = buildImagePublicIds(id);
    const hostedImages = await hostImages(presetImage.originalBuffer, presetImage.processedBuffer, publicIds, config);

    return reply.status(201).send({
      image: {
        createdAt,
        deleteToken: createDeleteToken(id, config.deleteTokenSecret as string),
        id,
        metadata: {
          format: hostedImages.processed.format,
          processedSizeBytes: hostedImages.processed.bytes,
          sourceSizeBytes: hostedImages.original.bytes
        },
        originalUrl: hostedImages.original.secureUrl,
        processedUrl: hostedImages.processed.secureUrl
      }
    });
  });

  app.get<{ Params: ImageParams }>("/api/images/:id", async (request) => {
    requireCompleteConfiguration(config);

    const { id } = request.params;

    if (!IMAGE_ID_PATTERN.test(id)) {
      throw new HttpError(400, "invalid_image_id", "The image id is invalid.");
    }

    const hostedImages = await getHostedImages(buildImagePublicIds(id), config);

    return {
      image: {
        id,
        metadata: {
          format: hostedImages.processed.format,
          processedSizeBytes: hostedImages.processed.bytes,
          sourceSizeBytes: hostedImages.original.bytes
        },
        originalUrl: hostedImages.original.secureUrl,
        processedUrl: hostedImages.processed.secureUrl
      }
    };
  });

  app.delete<{ Params: ImageParams }>("/api/images/:id", async (request, reply) => {
    requireCompleteConfiguration(config);

    const { id } = request.params;

    if (!IMAGE_ID_PATTERN.test(id)) {
      throw new HttpError(400, "invalid_image_id", "The image id is invalid.");
    }

    const deleteToken = readDeleteTokenHeader(request.headers["x-delete-token"]);
    verifyDeleteToken(id, deleteToken, config.deleteTokenSecret as string);
    await deleteHostedImages(buildImagePublicIds(id), config);

    return reply.send({
      deleted: true,
      id
    });
  });
}
