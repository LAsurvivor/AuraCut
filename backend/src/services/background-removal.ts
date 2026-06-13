import type { AppConfig } from "../config/env.js";
import { HttpError } from "../errors/http-error.js";
import type { ValidatedImageUpload } from "../utils/upload-validation.js";

export type BackgroundRemovalResult = {
  buffer: Buffer;
  creditsConsumed?: string;
  mimeType: string;
  remainingCredits?: string;
};

async function readUpstreamError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await response.json().catch(() => undefined)) as { error?: string } | undefined;

    return body?.error ?? "The background removal service returned an error.";
  }

  const text = await response.text().catch(() => "");

  return text || "The background removal service returned an error.";
}

export async function removeBackground(upload: ValidatedImageUpload, config: AppConfig): Promise<BackgroundRemovalResult> {
  if (!config.clipdropApiKey) {
    throw new HttpError(503, "clipdrop_not_configured", "Background removal is not configured yet.");
  }

  const form = new FormData();
  const uploadArrayBuffer = new ArrayBuffer(upload.buffer.byteLength);
  new Uint8Array(uploadArrayBuffer).set(upload.buffer);
  const imageBlob = new Blob([uploadArrayBuffer], { type: upload.detectedMimeType });
  form.append("image_file", imageBlob, upload.filename);

  const response = await fetch("https://clipdrop-api.co/remove-background/v1", {
    method: "POST",
    headers: {
      accept: "image/png",
      "x-api-key": config.clipdropApiKey
    },
    body: form
  });
  const responseMimeType = response.headers.get("content-type") ?? "application/octet-stream";

  if (!response.ok) {
    const upstreamMessage = await readUpstreamError(response);
    const friendlyMessage =
      response.status === 402
        ? "Background removal credits are exhausted. Add credits or use a fresh API key."
        : `Background removal failed: ${upstreamMessage}`;

    throw new HttpError(502, "background_removal_failed", friendlyMessage);
  }

  if (!responseMimeType.startsWith("image/")) {
    throw new HttpError(502, "background_removal_invalid_response", "Background removal did not return an image.");
  }

  const arrayBuffer = await response.arrayBuffer();

  return {
    buffer: Buffer.from(arrayBuffer),
    creditsConsumed: response.headers.get("x-credits-consumed") ?? undefined,
    mimeType: responseMimeType.split(";")[0],
    remainingCredits: response.headers.get("x-remaining-credits") ?? undefined
  };
}
