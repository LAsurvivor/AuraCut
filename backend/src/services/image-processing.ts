import sharp from "sharp";

export type ProcessedImage = {
  buffer: Buffer;
  height?: number;
  mimeType: "image/png";
  width?: number;
};

export async function flipHorizontally(input: Buffer): Promise<ProcessedImage> {
  const buffer = await sharp(input, { failOn: "error" }).flop().png().toBuffer();
  const metadata = await sharp(buffer).metadata();

  return {
    buffer,
    height: metadata.height,
    mimeType: "image/png",
    width: metadata.width
  };
}
