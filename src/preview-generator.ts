import { TAbstractFile, TFile, TFolder, loadPdfJs } from 'obsidian';
import { PREVIEW_SUFFIX } from './constants';
import { AttachmentsAutopilotSettings } from './settings';
import { stripScopePrefix, WatchedScope } from './file-utils';

/**
 * Returns the preview frontmatter value for a given attachment.
 * - Images: wiki-link to the attachment itself (no generation needed)
 * - PDF/video/audio: wiki-link to a generated .preview.png thumbnail
 * - Other: empty string
 */
export function getPreviewValue(
  attachmentPath: string,
  type: string,
  settings: AttachmentsAutopilotSettings,
  scope: WatchedScope,
): string {
  if (type === 'image') {
    return `[[${attachmentPath}]]`;
  }
  if (type === 'pdf' || type === 'video' || type === 'audio' || type === 'other') {
    return `[[${getPreviewThumbnailPath(attachmentPath, settings, scope)}]]`;
  }
  return '';
}

export function getPreviewThumbnailPath(
  attachmentPath: string,
  settings: AttachmentsAutopilotSettings,
  scope: WatchedScope,
): string {
  if (!settings.previewFolder) {
    return attachmentPath + PREVIEW_SUFFIX;
  }

  const relativePath = stripScopePrefix(attachmentPath, scope);
  return settings.previewFolder + '/' + relativePath + PREVIEW_SUFFIX;
}

export const PreviewType = {
  needsGeneration(type: string): boolean {
    return type === 'pdf' || type === 'video' || type === 'audio' || type === 'other';
  },
};

export interface PreviewGeneratorAdapter {
  readBinary(file: TFile): Promise<ArrayBuffer>;
  createBinary(path: string, data: ArrayBuffer): Promise<TFile>;
  getAbstractFileByPath(path: string): TAbstractFile | null;
  createFolder(path: string): Promise<TFolder>;
  /**
   * Called once per failed preview generation. The caller is expected to
   * aggregate failures (e.g. debounced summary Notice) — this module only
   * reports; it does not render UI itself.
   */
  onError?(path: string): void;
}

/**
 * Generates preview thumbnails for attachments that need them.
 * Requires DOM + canvas; Obsidian mobile (iOS WKWebView, Android
 * WebView) satisfies this, so the code runs on every platform. Any
 * platform-specific failure (e.g. a video codec the mobile webview
 * can't decode) is caught by the try/catch below and logged.
 *
 * Takes the `TFile` directly (not a path) because on the reactive
 * create-event path, `adapter.getAbstractFileByPath(path)` can return
 * null before Obsidian has finished indexing the newly-written file —
 * producing a silent preview-generation miss for PDFs in subfolders.
 * The caller already holds the `TFile` from the event, so thread it
 * through to sidestep the race entirely.
 */
export async function generatePreviewThumbnail(
  file: TFile,
  type: string,
  adapter: PreviewGeneratorAdapter,
  settings: AttachmentsAutopilotSettings,
  scope: WatchedScope,
): Promise<boolean> {
  const thumbPath = getPreviewThumbnailPath(file.path, settings, scope);

  // Skip if thumbnail already exists
  if (adapter.getAbstractFileByPath(thumbPath)) return false;

  // Ensure parent folder exists
  const lastSlash = thumbPath.lastIndexOf('/');
  if (lastSlash !== -1) {
    const folderPath = thumbPath.slice(0, lastSlash);
    if (!adapter.getAbstractFileByPath(folderPath)) {
      try {
        await adapter.createFolder(folderPath);
      } catch {
        // Folder may already exist due to race condition
      }
    }
  }

  try {
    if (type === 'pdf') {
      return await generatePdfPreview(file, thumbPath, adapter);
    }
    if (type === 'video') {
      return await generateVideoPreview(file, thumbPath, adapter);
    }
    if (type === 'audio') {
      return await generateAudioPreview(thumbPath, adapter);
    }
    if (type === 'other') {
      return await generateGenericPreview(file.path, thumbPath, adapter);
    }
  } catch (e) {
    console.error(`Attachments Autopilot: failed to generate preview for ${file.path}`, e);
    adapter.onError?.(file.path);
  }

  return false;
}

async function generatePdfPreview(
  file: TFile,
  thumbPath: string,
  adapter: PreviewGeneratorAdapter,
): Promise<boolean> {
  const data = await adapter.readBinary(file);
  const pdfjsLib = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const page = await pdf.getPage(1);

  const scale = 1;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  await page.render({ canvasContext: ctx, viewport }).promise;

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) return false;

  const arrayBuf = await blob.arrayBuffer();
  await adapter.createBinary(thumbPath, arrayBuf);
  return true;
}

async function generateVideoPreview(
  file: TFile,
  thumbPath: string,
  adapter: PreviewGeneratorAdapter,
): Promise<boolean> {
  const data = await adapter.readBinary(file);
  const blob = new Blob([data], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);

  try {
    const pngBuf = await extractVideoFrame(url);
    if (!pngBuf) return false;
    await adapter.createBinary(thumbPath, pngBuf);
    return true;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function extractVideoFrame(url: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';
    video.src = url;

    const timeout = setTimeout(() => {
      cleanup();
      resolve(generateColorPlaceholder());
    }, 5000);

    function cleanup() {
      clearTimeout(timeout);
      video.removeAttribute('src');
      video.load();
    }

    video.addEventListener('loadeddata', () => {
      video.currentTime = Math.min(1, video.duration / 2);
    });

    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        resolve(null);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        cleanup();
        if (blob) {
          blob.arrayBuffer().then(resolve);
        } else {
          resolve(null);
        }
      }, 'image/png');
    });

    video.addEventListener('error', () => {
      cleanup();
      // Fallback: color placeholder for unsupported codecs
      resolve(generateColorPlaceholder());
    });
  });
}

async function generateAudioPreview(
  thumbPath: string,
  adapter: PreviewGeneratorAdapter,
): Promise<boolean> {
  const pngBuf = await generateColorPlaceholder('♫');
  if (!pngBuf) return false;
  await adapter.createBinary(thumbPath, pngBuf);
  return true;
}

async function generateGenericPreview(
  attachmentPath: string,
  thumbPath: string,
  adapter: PreviewGeneratorAdapter,
): Promise<boolean> {
  const lastDot = attachmentPath.lastIndexOf('.');
  const ext = lastDot === -1 ? 'file' : attachmentPath.slice(lastDot + 1).toUpperCase();
  const pngBuf = await generateColorPlaceholder(ext);
  if (!pngBuf) return false;
  await adapter.createBinary(thumbPath, pngBuf);
  return true;
}

/**
 * Generates a small colored PNG placeholder with optional text.
 * Color is deterministic based on the path for visual variety.
 */
function generateColorPlaceholder(text?: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(null);
      return;
    }

    // Soft pastel background
    const hue = Math.floor(Math.random() * 360);
    ctx.fillStyle = `hsl(${hue}, 60%, 80%)`;
    ctx.fillRect(0, 0, 200, 200);

    if (text) {
      ctx.fillStyle = `hsl(${hue}, 60%, 30%)`;
      // Scale font so longer strings still fit (max ~160px wide)
      const fontSize = text.length <= 2 ? 100 : Math.max(36, Math.floor(160 / text.length * 2));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 100, 100);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        blob.arrayBuffer().then(resolve);
      } else {
        resolve(null);
      }
    }, 'image/png');
  });
}
