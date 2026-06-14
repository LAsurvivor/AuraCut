"use client";

export async function downloadImageFile(url: string, filename: string): Promise<void> {
  const response = await fetch(url, {
    cache: "no-store",
    mode: "cors"
  });

  if (!response.ok) {
    throw new Error("Could not download image.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename || "auracut";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
