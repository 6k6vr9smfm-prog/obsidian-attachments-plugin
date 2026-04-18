import { TFile } from 'obsidian';
import { TwinManager } from './twin-manager';

export interface ImportedFile {
  name: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface ImportAdapter {
  getAvailablePathForAttachment(filename: string, sourcePath?: string): Promise<string>;
  createBinary(path: string, data: ArrayBuffer): Promise<TFile>;
  getActiveMarkdownPath(): string | undefined;
}

export interface ImportResult {
  imported: TFile[];
  failed: { name: string; error: string }[];
}

export interface ImportOptions {
  /**
   * Skip running Templater on each new twin. Used by the bulk-import flow
   * to avoid firing interactive prompts once per file when the user has
   * declined to fill them at import time.
   */
  skipTemplater?: boolean;
}

export async function importFiles(
  files: ImportedFile[],
  adapter: ImportAdapter,
  twinManager: TwinManager,
  options?: ImportOptions,
): Promise<ImportResult> {
  const imported: TFile[] = [];
  const failed: { name: string; error: string }[] = [];

  if (files.length === 0) return { imported, failed };

  const sourcePath = adapter.getActiveMarkdownPath();

  for (const file of files) {
    try {
      const buffer = await file.arrayBuffer();
      const targetPath = await adapter.getAvailablePathForAttachment(file.name, sourcePath);
      const tfile = await adapter.createBinary(targetPath, buffer);
      await twinManager.createTwin(tfile, { skipTemplater: options?.skipTemplater });
      imported.push(tfile);
    } catch (e) {
      failed.push({
        name: file.name,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { imported, failed };
}

/**
 * Opens a native file picker via a hidden <input type="file">. Works on
 * desktop Electron, iOS WKWebView, and Android WebView.
 * Resolves with the selected files, or an empty array if cancelled.
 */
export function pickLocalFiles(multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = multiple;
    input.style.display = 'none';

    let settled = false;
    const settle = (files: File[]) => {
      if (settled) return;
      settled = true;
      if (input.parentNode) input.parentNode.removeChild(input);
      window.removeEventListener('focus', onFocus);
      resolve(files);
    };

    input.addEventListener('change', () => {
      settle(input.files ? Array.from(input.files) : []);
    });

    // Some browsers fire 'cancel' when the picker closes without a selection.
    input.addEventListener('cancel', () => settle([]));

    // Fallback for environments without the 'cancel' event: after the window
    // regains focus, if no files were picked, treat it as a cancellation.
    const onFocus = () => {
      setTimeout(() => {
        if (!settled && (!input.files || input.files.length === 0)) {
          settle([]);
        }
      }, 300);
    };
    window.addEventListener('focus', onFocus);

    document.body.appendChild(input);
    input.click();
  });
}
