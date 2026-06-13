import { Readable } from "node:stream";

import { v2 as cloudinary } from "cloudinary";

import type { AppConfig } from "../config/env.js";
import { HttpError } from "../errors/http-error.js";
import type { ImagePublicIds } from "../utils/public-ids.js";

export type HostedImage = {
  bytes: number;
  format: string;
  publicId: string;
  secureUrl: string;
};

export type HostedImagePair = {
  original: HostedImage;
  processed: HostedImage;
};

type CloudinaryResource = {
  bytes?: number;
  format?: string;
  public_id?: string;
  secure_url?: string;
};

function configureCloudinary(config: AppConfig): void {
  if (!config.cloudinaryCloudName || !config.cloudinaryApiKey || !config.cloudinaryApiSecret) {
    throw new HttpError(503, "cloudinary_not_configured", "Image hosting is not configured yet.");
  }

  cloudinary.config({
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
    cloud_name: config.cloudinaryCloudName,
    secure: true
  });
}

function uploadBuffer(buffer: Buffer, publicId: string, config: AppConfig): Promise<HostedImage> {
  configureCloudinary(config);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        invalidate: true,
        overwrite: true,
        public_id: publicId,
        resource_type: "image",
        tags: ["auracut"]
      },
      (error, result) => {
        if (error || !result) {
          reject(new HttpError(503, "image_hosting_failed", "Cloudinary upload failed."));
          return;
        }

        resolve({
          bytes: result.bytes,
          format: result.format,
          publicId: result.public_id,
          secureUrl: result.secure_url
        });
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

async function readHostedImage(publicId: string, config: AppConfig): Promise<HostedImage> {
  configureCloudinary(config);

  try {
    const result = (await cloudinary.api.resource(publicId, { resource_type: "image" })) as CloudinaryResource;

    if (!result.secure_url) {
      throw new HttpError(404, "image_not_found", "The requested image is not available.");
    }

    return {
      bytes: result.bytes ?? 0,
      format: result.format ?? "png",
      publicId: result.public_id ?? publicId,
      secureUrl: result.secure_url
    };
  } catch (error) {
    if (isCloudinaryNotFound(error) || isLookupHttpError(error)) {
      throw new HttpError(404, "image_not_found", "The requested image is not available.");
    }

    throw new HttpError(503, "image_lookup_failed", "Could not read the hosted image.");
  }
}

function isCloudinaryNotFound(error: unknown): boolean {
  return readCloudinaryHttpCode(error) === 404;
}

function isLookupHttpError(error: unknown): boolean {
  return error instanceof HttpError && error.code === "image_not_found";
}

function readCloudinaryHttpCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const directCode = Number((error as { http_code?: unknown }).http_code);

  if (Number.isFinite(directCode)) {
    return directCode;
  }

  const nestedError = (error as { error?: unknown }).error;

  if (typeof nestedError !== "object" || nestedError === null) {
    return undefined;
  }

  const nestedCode = Number((nestedError as { http_code?: unknown }).http_code);

  return Number.isFinite(nestedCode) ? nestedCode : undefined;
}

export async function hostImages(
  originalBuffer: Buffer,
  processedBuffer: Buffer,
  publicIds: ImagePublicIds,
  config: AppConfig
): Promise<HostedImagePair> {
  const uploadResults = await Promise.allSettled([
    uploadBuffer(originalBuffer, publicIds.original, config),
    uploadBuffer(processedBuffer, publicIds.processed, config)
  ]);
  const [originalResult, processedResult] = uploadResults;

  if (originalResult.status === "rejected" || processedResult.status === "rejected") {
    const fulfilled = uploadResults.filter((result): result is PromiseFulfilledResult<HostedImage> => result.status === "fulfilled");
    await Promise.allSettled(fulfilled.map((asset) => cloudinary.uploader.destroy(asset.value.publicId)));

    if (originalResult.status === "rejected") {
      throw originalResult.reason;
    }

    if (processedResult.status === "rejected") {
      throw processedResult.reason;
    }

    throw new HttpError(503, "image_hosting_failed", "Cloudinary upload failed.");
  }

  return {
    original: originalResult.value,
    processed: processedResult.value
  };
}

export async function getHostedImages(publicIds: ImagePublicIds, config: AppConfig): Promise<HostedImagePair> {
  const [original, processed] = await Promise.all([
    readHostedImage(publicIds.original, config),
    readHostedImage(publicIds.processed, config)
  ]);

  return {
    original,
    processed
  };
}

export async function deleteHostedImages(publicIds: ImagePublicIds, config: AppConfig): Promise<void> {
  configureCloudinary(config);

  const results = await Promise.allSettled([
    cloudinary.uploader.destroy(publicIds.original, { invalidate: true, resource_type: "image" }),
    cloudinary.uploader.destroy(publicIds.processed, { invalidate: true, resource_type: "image" })
  ]);
  const rejected = results.find((result) => result.status === "rejected");

  if (rejected) {
    throw new HttpError(503, "image_delete_failed", "Cloudinary deletion failed.");
  }
}
