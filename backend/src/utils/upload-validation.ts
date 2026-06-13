import { HttpError } from "../errors/http-error.js";

export type ValidatedImageUpload = {
  buffer: Buffer;
  detectedMimeType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  filename: string;
  sizeBytes: number;
};

type DetectedImageType = Pick<ValidatedImageUpload, "detectedMimeType" | "extension">;

function detectImageType(buffer: Buffer): DetectedImageType | undefined {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      detectedMimeType: "image/jpeg",
      extension: "jpg"
    };
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      detectedMimeType: "image/png",
      extension: "png"
    };
  }

  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return {
      detectedMimeType: "image/webp",
      extension: "webp"
    };
  }

  return undefined;
}

function normalizeFilename(filename: string | undefined): string {
  if (!filename) {
    return "upload";
  }

  const safe = filename.replace(/[^\w.\- ]+/g, "").trim();

  return safe.length > 0 ? safe.slice(0, 120) : "upload";
}

export function validateImageUpload(buffer: Buffer, filename: string | undefined, maxUploadBytes: number): ValidatedImageUpload {
  if (buffer.length === 0) {
    throw new HttpError(400, "empty_upload", "Please choose a non-empty image file.");
  }

  if (buffer.length > maxUploadBytes) {
    throw new HttpError(413, "file_too_large", "The selected image is larger than the allowed upload size.");
  }

  const detected = detectImageType(buffer);

  if (!detected) {
    throw new HttpError(400, "unsupported_file_type", "Please upload a PNG, JPG, JPEG, or WEBP image.");
  }

  return {
    buffer,
    detectedMimeType: detected.detectedMimeType,
    extension: detected.extension,
    filename: normalizeFilename(filename),
    sizeBytes: buffer.length
  };
}
