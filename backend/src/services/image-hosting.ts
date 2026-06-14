import { Readable } from "node:stream";

import { v2 as cloudinary } from "cloudinary";

import type { AppConfig } from "../config/env.js";
import { HttpError } from "../errors/http-error.js";
import type { ImagePublicIds } from "../utils/public-ids.js";
import { withRetry } from "../utils/retry.js";

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
  access_control?: Array<{
    access_type?: string;
    end?: string;
  }>;
  bytes?: number;
  created_at?: string;
  format?: string;
  public_id?: string;
  secure_url?: string;
};

const HOSTED_IMAGE_TTL_DAYS = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const DELETED_MARKER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lmQ8pQAAAABJRU5ErkJggg==",
  "base64"
);

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

function getHostedImageExpirationDate(): Date {
  return new Date(Date.now() + HOSTED_IMAGE_TTL_DAYS * MILLISECONDS_PER_DAY);
}

function getAnonymousAccessControl(expiresAt: Date): Array<{ access_type: "anonymous"; end: string }> {
  return [
    {
      access_type: "anonymous",
      end: expiresAt.toISOString()
    }
  ];
}

function isResourceExpired(resource: CloudinaryResource): boolean {
  const anonymousAccess = resource.access_control?.find((access) => access.access_type === "anonymous");
  const endsAt = anonymousAccess?.end;

  return Boolean(endsAt && Date.parse(endsAt) <= Date.now());
}

async function uploadBuffer(buffer: Buffer, publicId: string, expiresAt: Date, config: AppConfig): Promise<HostedImage> {
  configureCloudinary(config);

  try {
    return await withRetry(
      () =>
        new Promise<HostedImage>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              access_control: getAnonymousAccessControl(expiresAt),
              invalidate: true,
              overwrite: true,
              public_id: publicId,
              resource_type: "image",
              tags: ["auracut"]
            },
            (error, result) => {
              if (error || !result) {
                reject(error ?? new HttpError(503, "image_hosting_failed", "Cloudinary upload failed."));
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
        }),
      {
        shouldRetry: isRetryableCloudinaryError
      }
    );
  } catch {
    throw new HttpError(503, "image_hosting_failed", "Cloudinary upload failed.");
  }
}

async function readHostedImage(publicId: string, config: AppConfig): Promise<HostedImage> {
  configureCloudinary(config);

  try {
    const result = (await withRetry(() => cloudinary.api.resource(publicId, { resource_type: "image" }), {
      shouldRetry: (error) => !isCloudinaryNotFound(error) && isRetryableCloudinaryError(error)
    })) as CloudinaryResource;

    if (!result.secure_url) {
      throw new HttpError(404, "image_not_found", "The requested image is not available.");
    }

    if (isResourceExpired(result)) {
      throw new HttpError(404, "image_not_found", "The requested image is no longer available.");
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

async function uploadDeletedMarker(publicId: string, config: AppConfig): Promise<void> {
  configureCloudinary(config);

  try {
    await withRetry(
      () =>
        new Promise<void>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              invalidate: true,
              overwrite: true,
              public_id: publicId,
              resource_type: "image",
              tags: ["auracut", "deleted"]
            },
            (error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            }
          );

          Readable.from(DELETED_MARKER_PNG).pipe(uploadStream);
        }),
      {
        shouldRetry: isRetryableCloudinaryError
      }
    );
  } catch {
    throw new HttpError(503, "image_delete_failed", "Cloudinary deletion marker failed.");
  }
}

async function hostedImageExists(publicId: string, config: AppConfig): Promise<boolean> {
  configureCloudinary(config);

  try {
    await withRetry(() => cloudinary.api.resource(publicId, { resource_type: "image" }), {
      shouldRetry: (error) => !isCloudinaryNotFound(error) && isRetryableCloudinaryError(error)
    });
    return true;
  } catch (error) {
    if (isCloudinaryNotFound(error)) {
      return false;
    }

    throw new HttpError(503, "image_lookup_failed", "Could not read the hosted image.");
  }
}

function isCloudinaryNotFound(error: unknown): boolean {
  return readCloudinaryHttpCode(error) === 404;
}

function isRetryableCloudinaryError(error: unknown): boolean {
  const status = readCloudinaryHttpCode(error);

  return status === undefined || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
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
  const expiresAt = getHostedImageExpirationDate();
  const uploadResults = await Promise.allSettled([
    uploadBuffer(originalBuffer, publicIds.original, expiresAt, config),
    uploadBuffer(processedBuffer, publicIds.processed, expiresAt, config)
  ]);
  const [originalResult, processedResult] = uploadResults;

  if (originalResult.status === "rejected" || processedResult.status === "rejected") {
    const fulfilled = uploadResults.filter((result): result is PromiseFulfilledResult<HostedImage> => result.status === "fulfilled");
    await Promise.allSettled(fulfilled.map((asset) => destroyHostedImage(asset.value.publicId)));

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
  if (await hostedImageExists(publicIds.deleted, config)) {
    throw new HttpError(404, "image_not_found", "The requested image is not available.");
  }

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

  await uploadDeletedMarker(publicIds.deleted, config);

  const results = await Promise.allSettled([
    destroyHostedImage(publicIds.original),
    destroyHostedImage(publicIds.processed)
  ]);
  const rejected = results.find((result) => result.status === "rejected");

  if (rejected) {
    throw new HttpError(503, "image_delete_failed", "Cloudinary deletion failed.");
  }
}

async function destroyHostedImage(publicId: string): Promise<void> {
  await withRetry(() => cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: "image" }), {
    shouldRetry: isRetryableCloudinaryError
  });
}
