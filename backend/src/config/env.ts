import "dotenv/config";

const DEFAULT_MAX_UPLOAD_MB = 10;
const BYTES_PER_MB = 1024 * 1024;

export type AppConfig = {
  allowedOrigins: string[];
  clipdropApiKey?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  cloudinaryCloudName?: string;
  deleteTokenSecret?: string;
  maxUploadBytes: number;
  nodeEnv: string;
  port: number;
};

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value) {
    return ["https://lasurvivor.github.io"];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getConfig(): AppConfig {
  const maxUploadMb = parsePositiveInteger(process.env.MAX_UPLOAD_MB, DEFAULT_MAX_UPLOAD_MB);
  const port = parsePositiveInteger(process.env.PORT, 8080);

  return {
    allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
    clipdropApiKey: process.env.CLIPDROP_API_KEY,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    deleteTokenSecret: process.env.DELETE_TOKEN_SECRET,
    maxUploadBytes: maxUploadMb * BYTES_PER_MB,
    nodeEnv: process.env.NODE_ENV ?? "development",
    port
  };
}

export function isServiceConfigured(config: AppConfig): boolean {
  return Boolean(
    config.clipdropApiKey &&
      config.cloudinaryCloudName &&
      config.cloudinaryApiKey &&
      config.cloudinaryApiSecret &&
      config.deleteTokenSecret
  );
}
