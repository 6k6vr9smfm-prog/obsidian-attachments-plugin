import { App, TFile, loadPdfJs } from "obsidian";

const MAX_WIDTH = 400;
const MAX_HEIGHT = 300;

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Generates a PNG thumbnail for a PDF, video, or audio file.
 * Returns null if generation fails or the type is unsupported.
 * For images, callers should use the attachment itself directly — no thumbnail needed.
 */
export async function generateThumbnail(
  app: App,
  file: TFile
): Promise<ArrayBuffer | null> {
  const ext = file.extension.toLowerCase();
  if (ext === "pdf") return generatePdfThumbnail(app, file);
  if (VIDEO_EXTENSIONS.has(ext)) return generateVideoThumbnail(app, file);
  if (AUDIO_EXTENSIONS.has(ext)) return generateAudioThumbnail(file);
  return null;
}

// ── Extension sets (mirrors attachment-utils, kept local to avoid coupling) ───

const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "mkv", "avi"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "m4a", "flac", "aac"]);

// ── PDF ───────────────────────────────────────────────────────────────────────

const PDF_TIMEOUT_MS = 15_000;

async function generatePdfThumbnail(
  app: App,
  file: TFile
): Promise<ArrayBuffer | null> {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("loadPdfJs timeout")), PDF_TIMEOUT_MS)
    );
    const pdfjsLib = await Promise.race([loadPdfJs(), timeout]);
    const arrayBuffer = await app.vault.readBinary(file);

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(MAX_WIDTH / viewport.width, MAX_HEIGHT / viewport.height);
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(scaledViewport.width);
    canvas.height = Math.round(scaledViewport.height);
    const context = canvas.getContext("2d");
    if (!context) return null;

    await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
    return await canvasToBuffer(canvas);
  } catch (e) {
    console.error("Attachment Bases: PDF thumbnail failed", e);
    return null;
  }
}

// ── Video ─────────────────────────────────────────────────────────────────────

function generateVideoThumbnail(
  app: App,
  file: TFile
): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
    video.muted = true;
    document.body.appendChild(video);

    const TIMEOUT_MS = 10_000;
    let settled = false;

    const finish = async (success: boolean, fallback = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (!success) {
        video.remove();
        resolve(fallback ? generateVideoFallback(file) : null);
        return;
      }

      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) { video.remove(); resolve(null); return; }

        const scale = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { video.remove(); resolve(null); return; }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        video.remove();
        resolve(await canvasToBuffer(canvas));
      } catch {
        video.remove();
        resolve(null);
      }
    };

    const timer = setTimeout(() => finish(false, true), TIMEOUT_MS);

    video.addEventListener("loadedmetadata", () => {
      // Seek to 1s, or 10% into the video if it's shorter than 1s
      video.currentTime = video.duration >= 1 ? 1 : video.duration * 0.1;
    });

    video.addEventListener("seeked", () => finish(true));
    video.addEventListener("error", () => finish(false, true));

    video.src = app.vault.getResourcePath(file);
  });
}

// ── Video fallback ────────────────────────────────────────────────────────────

async function generateVideoFallback(file: TFile): Promise<ArrayBuffer | null> {
  try {
    const hue = hashString(file.name) % 360;
    const canvas = document.createElement("canvas");
    canvas.width = MAX_WIDTH;
    canvas.height = MAX_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = `hsl(${hue}, 50%, 30%)`;
    ctx.fillRect(0, 0, MAX_WIDTH, MAX_HEIGHT);

    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.font = "bold 140px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("▶", MAX_WIDTH / 2, MAX_HEIGHT / 2);

    return await canvasToBuffer(canvas);
  } catch (e) {
    console.error("Attachment Bases: video fallback thumbnail failed", e);
    return null;
  }
}

// ── Audio ─────────────────────────────────────────────────────────────────────

async function generateAudioThumbnail(file: TFile): Promise<ArrayBuffer | null> {
  try {
    const hue = hashString(file.name) % 360;

    const canvas = document.createElement("canvas");
    canvas.width = MAX_WIDTH;
    canvas.height = MAX_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background
    ctx.fillStyle = `hsl(${hue}, 55%, 35%)`;
    ctx.fillRect(0, 0, MAX_WIDTH, MAX_HEIGHT);

    // Music note symbol
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.font = `bold 140px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♫", MAX_WIDTH / 2, MAX_HEIGHT / 2);

    return await canvasToBuffer(canvas);
  } catch (e) {
    console.error("Attachment Bases: audio thumbnail failed", e);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function canvasToBuffer(canvas: HTMLCanvasElement): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(null); return; }
      blob.arrayBuffer().then(resolve).catch(() => resolve(null));
    }, "image/png");
  });
}

/** Deterministic hash of a string → non-negative integer. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i);
  }
  return Math.abs(h);
}
