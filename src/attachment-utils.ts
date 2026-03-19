import { TFile } from "obsidian";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff", "tif"]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "m4a", "flac", "aac"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "mkv", "avi"]);

export const ATTACHMENT_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS,
  ...PDF_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
]);

export function isAttachment(file: TFile): boolean {
  return ATTACHMENT_EXTENSIONS.has(file.extension.toLowerCase());
}

export function isTwinNote(file: TFile): boolean {
  if (file.extension !== "md") return false;
  const nameWithoutMd = file.name.slice(0, -3);
  const lastDot = nameWithoutMd.lastIndexOf(".");
  if (lastDot === -1) return false;
  const ext = nameWithoutMd.slice(lastDot + 1).toLowerCase();
  return ATTACHMENT_EXTENSIONS.has(ext);
}

export function getAttachmentType(extension: string): string {
  const ext = extension.toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (PDF_EXTENSIONS.has(ext)) return "pdf";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  return "other";
}
