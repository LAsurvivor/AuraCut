import sharp from "sharp";

const MAX_OUTPUT_DIMENSION = 4096;
const MIN_OUTPUT_DIMENSION = 1200;
const TARGET_MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

export type ProcessedImage = {
  buffer: Buffer;
  height?: number;
  mimeType: "image/png";
  width?: number;
};

export async function flipHorizontally(input: Buffer): Promise<ProcessedImage> {
  const sourceMetadata = await sharp(input, { failOn: "error" }).metadata();
  const sourceMaxDimension = Math.max(sourceMetadata.width ?? MAX_OUTPUT_DIMENSION, sourceMetadata.height ?? MAX_OUTPUT_DIMENSION);
  let outputMaxDimension = Math.min(sourceMaxDimension, MAX_OUTPUT_DIMENSION);
  let buffer = await renderFlippedPng(input, outputMaxDimension);

  while (buffer.length > TARGET_MAX_OUTPUT_BYTES && outputMaxDimension > MIN_OUTPUT_DIMENSION) {
    const resizeRatio = Math.sqrt(TARGET_MAX_OUTPUT_BYTES / buffer.length) * 0.92;
    outputMaxDimension = Math.max(MIN_OUTPUT_DIMENSION, Math.floor(outputMaxDimension * resizeRatio));
    buffer = await renderFlippedPng(input, outputMaxDimension);
  }

  const metadata = await sharp(buffer).metadata();

  return {
    buffer,
    height: metadata.height,
    mimeType: "image/png",
    width: metadata.width
  };
}

async function renderFlippedPng(input: Buffer, maxDimension: number): Promise<Buffer> {
  return sharp(input, { failOn: "error" })
    .flop()
    .resize({
      fit: "inside",
      height: maxDimension,
      width: maxDimension,
      withoutEnlargement: true
    })
    .png({
      adaptiveFiltering: true,
      compressionLevel: 9,
      effort: 10
    })
    .toBuffer();
}
