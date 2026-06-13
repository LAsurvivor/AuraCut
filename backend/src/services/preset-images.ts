import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { HttpError } from "../errors/http-error.js";

const PRESETS = {
  boy: {
    originalPath: "images/presets/boy-before.avif",
    processedPath: "images/presets/boy-after-flipped.png"
  },
  cavapoo: {
    originalPath: "images/presets/cavapoo-before.avif",
    processedPath: "images/presets/cavapoo-after-flipped.png"
  },
  earrings: {
    originalPath: "images/presets/earrings-before.jpeg",
    processedPath: "images/presets/earrings-after-flipped.png"
  },
  ferrari: {
    originalPath: "images/presets/ferrari-before.jpg",
    processedPath: "images/presets/ferrari-after-flipped.png"
  }
} as const;

type PresetKey = keyof typeof PRESETS;

export type PresetImagePair = {
  originalBuffer: Buffer;
  processedBuffer: Buffer;
  preset: PresetKey;
};

function isPresetKey(value: string): value is PresetKey {
  return value in PRESETS;
}

function resolveStaticAsset(relativePath: string): string {
  const candidateRoots = [path.join(process.cwd(), "public"), path.join(process.cwd(), "out")];

  for (const root of candidateRoots) {
    const candidatePath = path.join(root, relativePath);

    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  throw new HttpError(500, "preset_asset_missing", "A preset image asset is missing.");
}

export async function loadPresetImagePair(preset: string): Promise<PresetImagePair> {
  if (!isPresetKey(preset)) {
    throw new HttpError(400, "preset_not_found", "The selected sample image is not available.");
  }

  const presetDefinition = PRESETS[preset];
  const [originalBuffer, processedBuffer] = await Promise.all([
    readFile(resolveStaticAsset(presetDefinition.originalPath)),
    readFile(resolveStaticAsset(presetDefinition.processedPath))
  ]);

  return {
    originalBuffer,
    preset,
    processedBuffer
  };
}
