import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";

import { type AppConfig, isServiceConfigured } from "../config/env.js";
import { HttpError } from "../errors/http-error.js";
import { removeBackground } from "../services/background-removal.js";
import { createDeleteToken, verifyDeleteToken } from "../services/delete-token.js";
import { deleteHostedImages, getHostedImages, hostImages } from "../services/image-hosting.js";
import { flipHorizontally } from "../services/image-processing.js";
import { buildImagePublicIds } from "../utils/public-ids.js";
import { validateImageUpload } from "../utils/upload-validation.js";

const IMAGE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ImageParams = {
  id: string;
};

function requireCompleteConfiguration(config: AppConfig): void {
  if (!isServiceConfigured(config)) {
    throw new HttpError(503, "service_not_configured", "The image service is missing required environment variables.");
  }
}

function readDeleteTokenHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function registerImageRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  app.get("/api/health", async () => ({
    configured: isServiceConfigured(config),
    maxUploadMb: Math.round(config.maxUploadBytes / (1024 * 1024)),
    ok: true
  }));

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
