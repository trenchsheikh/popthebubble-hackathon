"use client";

const MAX_EDGE = 1280; // px — cap the longest edge so base64 payloads stay small
const QUALITY = 0.82;

/**
 * Read an image File, downscale it so its longest edge is <= MAX_EDGE, and
 * return a JPEG data URL. Keeps uploaded menu/product photos lightweight enough
 * to ship inside a JSON publish payload and hold in the in-memory store.
 */
export async function fileToDownscaledDataUrl(file: File): Promise<string> {
  const sourceUrl = await readAsDataUrl(file);
  const image = await loadImage(sourceUrl);

  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return sourceUrl; // fall back to the original if canvas is unavailable

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", QUALITY);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode the image file."));
    image.src = src;
  });
}
