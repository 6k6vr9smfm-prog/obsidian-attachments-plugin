import { TAbstractFile, TFile, TFolder } from 'obsidian';
import { AttachmentsAutopilotSettings } from './settings';
import {
  getTwinPath,
  isTwinFile,
  isPreviewThumbnail,
  shouldProcess,
  classifyType,
  resolveWatchedScope,
  WatchedScope,
} from './file-utils';
import { buildTwinContent, mergeFrontmatter, parseFrontmatter, extractTemplateFrontmatter, TwinTemplate } from './twin-format';
import { getPreviewValue, getPreviewThumbnailPath, PreviewType, generatePreviewThumbnail, PreviewGeneratorAdapter } from './preview-generator';

export interface VaultAdapter {
  create(path: string, content: string): Promise<TFile>;
  delete(file: TFile): Promise<void>;
  rename(file: TAbstractFile, newPath: string): Promise<void>;
  read(file: TFile): Promise<string>;
  modify(file: TFile, content: string): Promise<void>;
  process(file: TFile, fn: (data: string) => string): Promise<string>;
  getAbstractFileByPath(path: string): TAbstractFile | null;
  getFiles(): TFile[];
  createFolder(path: string): Promise<TFolder>;
  /**
   * Returns Obsidian's `attachmentFolderPath` config value (or equivalent
   * from a test fake). Used to resolve the plugin's watched scope.
   */
  getAttachmentFolderPath(): string | undefined;
}

export type TemplaterRunner = (twinPath: string) => Promise<void>;

export class TwinManager {
  private previewAdapter: PreviewGeneratorAdapter | null = null;
  private templaterRunner: TemplaterRunner | null = null;

  constructor(
    private vault: VaultAdapter,
    private settings: AttachmentsAutopilotSettings,
  ) {}

  setPreviewAdapter(adapter: PreviewGeneratorAdapter): void {
    this.previewAdapter = adapter;
  }

  setTemplaterRunner(runner: TemplaterRunner): void {
    this.templaterRunner = runner;
  }

  private resolveScope(): WatchedScope {
    return resolveWatchedScope(this.vault.getAttachmentFolderPath());
  }

  async createTwin(file: TFile): Promise<void> {
    const scope = this.resolveScope();
    const ext = file.path.split('.').pop() || '';
    const type = classifyType(ext);
    let previewValue = '';

    if (this.settings.generatePreviews) {
      previewValue = getPreviewValue(file.path, type, this.settings, scope);

      // Generate thumbnail if needed and adapter is available
      if (PreviewType.needsGeneration(type) && this.previewAdapter) {
        await generatePreviewThumbnail(
          file.path,
          type,
          this.previewAdapter,
          this.settings,
          scope,
        );
      }
    }

    const template = await this.loadTemplate();
    const twinPath = getTwinPath(file.path, this.settings, scope);
    const content = buildTwinContent(file.path, file.stat, this.settings, previewValue, template);

    await this.ensureParentFolder(twinPath);

    const existingTwin = this.vault.getAbstractFileByPath(twinPath);
    if (existingTwin instanceof TFile) {
      // Atomic read-modify-write to avoid clobbering concurrent external edits
      await this.vault.process(existingTwin, (existingContent) =>
        mergeFrontmatter(existingContent, content),
      );
    } else {
      await this.vault.create(twinPath, content);
    }

    if (this.templaterRunner) {
      await this.templaterRunner(twinPath);
    }
  }

  async deleteTwin(file: TFile): Promise<void> {
    return this.deleteTwinByPath(file.path);
  }

  async deleteTwinByPath(attachmentPath: string): Promise<void> {
    const scope = this.resolveScope();
    const twinPath = getTwinPath(attachmentPath, this.settings, scope);
    const twin = this.vault.getAbstractFileByPath(twinPath);
    if (twin instanceof TFile) {
      await this.vault.delete(twin);
    }

    // Clean up the generated preview thumbnail, if any.
    // Only applies to non-image types — images reuse the attachment itself
    // as their preview, so there is no separate thumbnail file to remove.
    if (this.settings.generatePreviews) {
      const ext = attachmentPath.split('.').pop() || '';
      const type = classifyType(ext);
      if (PreviewType.needsGeneration(type)) {
        const previewPath = getPreviewThumbnailPath(attachmentPath, this.settings, scope);
        const preview = this.vault.getAbstractFileByPath(previewPath);
        if (preview instanceof TFile) {
          try {
            await this.vault.delete(preview);
          } catch (e) {
            console.error('Attachments Autopilot: failed to delete orphan preview', previewPath, e);
          }
        }
      }
    }
  }

  async renameTwin(oldPath: string, newPath: string): Promise<void> {
    const scope = this.resolveScope();
    const oldTwinPath = getTwinPath(oldPath, this.settings, scope);
    const newTwinPath = getTwinPath(newPath, this.settings, scope);

    const twin = this.vault.getAbstractFileByPath(oldTwinPath);
    if (!twin || !(twin instanceof TFile)) return;

    // Compute preview paths once if previews are enabled
    const oldPreviewPath = this.settings.generatePreviews
      ? getPreviewThumbnailPath(oldPath, this.settings, scope)
      : '';
    const newPreviewPath = this.settings.generatePreviews
      ? getPreviewThumbnailPath(newPath, this.settings, scope)
      : '';

    // Rename preview file if it exists
    if (oldPreviewPath) {
      const previewFile = this.vault.getAbstractFileByPath(oldPreviewPath);
      if (previewFile && previewFile instanceof TFile) {
        try {
          await this.ensureParentFolder(newPreviewPath);
          await this.vault.rename(previewFile, newPreviewPath);
        } catch (e) {
          console.error('Attachments Autopilot: failed to rename preview', oldPreviewPath, e);
        }
      }
    }

    await this.ensureParentFolder(newTwinPath);

    await this.vault.rename(twin, newTwinPath);

    // Atomically update all in-content references (attachment path + preview path)
    const renamedTwin = this.vault.getAbstractFileByPath(newTwinPath);
    if (renamedTwin instanceof TFile) {
      await this.vault.process(renamedTwin, (data) => {
        let updated = data.replace(new RegExp(escapeRegExp(oldPath), 'g'), newPath);
        if (oldPreviewPath && newPreviewPath) {
          updated = updated.replace(new RegExp(escapeRegExp(oldPreviewPath), 'g'), newPreviewPath);
        }
        return updated;
      });
    }
  }

  async syncAll(): Promise<{ created: number; skipped: number }> {
    const scope = this.resolveScope();
    let created = 0;
    let skipped = 0;

    for (const file of this.vault.getFiles()) {
      if (!shouldProcess(file, this.settings, scope)) continue;

      const twinPath = getTwinPath(file.path, this.settings, scope);
      if (this.vault.getAbstractFileByPath(twinPath)) {
        skipped++;
        continue;
      }

      await this.createTwin(file);
      created++;
    }

    return { created, skipped };
  }

  async deleteAllTwins(): Promise<number> {
    let count = 0;

    // Snapshot file lists before deleting to avoid live array mutation
    const twins = this.vault.getFiles().filter(f => isTwinFile(f.path, this.settings));
    const previews = this.vault.getFiles().filter(f => isPreviewThumbnail(f.path));

    for (const file of twins) {
      await this.vault.delete(file);
      count++;
    }

    for (const file of previews) {
      try {
        await this.vault.delete(file);
      } catch {
        // Preview may already have been deleted
      }
    }

    return count;
  }

  async moveTwinsToFolder(newFolder: string): Promise<number> {
    // Discover twins by their canonical `attachment:` frontmatter key rather
    // than by path prefix. The UI mutates settings.twinFolder before invoking
    // this command, so comparing against the current setting would miss the
    // real previous location entirely (T2.3 bug).
    const scope = this.resolveScope();
    let count = 0;
    const scopedSettings = { ...this.settings, twinFolder: newFolder };
    const candidates = this.vault.getFiles().filter((f) => f.path.endsWith('.md'));

    for (const file of candidates) {
      const content = await this.vault.read(file);
      const { data } = parseFrontmatter(content);
      const raw = data['attachment'];
      if (typeof raw !== 'string' || !raw) continue;

      const attachmentPath = raw.replace(/^\[\[/, '').replace(/\]\]$/, '').trim();
      if (!attachmentPath) continue;

      const desiredPath = getTwinPath(attachmentPath, scopedSettings, scope);
      if (file.path === desiredPath) continue;

      await this.ensureParentFolder(desiredPath);
      await this.vault.rename(file, desiredPath);
      count++;
    }

    return count;
  }

  async countMissingPreviews(): Promise<number> {
    let count = 0;
    for (const file of this.vault.getFiles()) {
      if (!isTwinFile(file.path, this.settings)) continue;
      const content = await this.vault.read(file);
      const { data } = parseFrontmatter(content);
      if (!data['attachment-preview'] || data['attachment-preview'] === '') {
        count++;
      }
    }
    return count;
  }

  async generateMissingPreviews(): Promise<number> {
    // Read the canonical `attachment:` frontmatter key instead of inverting
    // twin paths — this is resilient to runtime scope changes and to twins
    // that may have been created under a different layout in the past.
    const scope = this.resolveScope();
    let count = 0;
    for (const file of this.vault.getFiles()) {
      if (!isTwinFile(file.path, this.settings)) continue;

      const content = await this.vault.read(file);
      const { data } = parseFrontmatter(content);
      const rawAttachment = data['attachment'];
      if (typeof rawAttachment !== 'string' || !rawAttachment) continue;

      const attachmentPath = rawAttachment
        .replace(/^\[\[/, '')
        .replace(/\]\]$/, '')
        .trim();
      if (!attachmentPath) continue;

      const ext = attachmentPath.split('.').pop() || '';
      const type = classifyType(ext);
      const expectedPreview = getPreviewValue(attachmentPath, type, this.settings, scope);
      if (!expectedPreview) continue;

      const currentPreview = (data['attachment-preview'] || '') as string;

      let needsUpdate = currentPreview !== expectedPreview;

      // Even if the value is correct, the thumbnail file itself may be missing
      if (!needsUpdate && PreviewType.needsGeneration(type)) {
        const thumbPath = getPreviewThumbnailPath(attachmentPath, this.settings, scope);
        if (!this.vault.getAbstractFileByPath(thumbPath)) {
          needsUpdate = true;
        }
      }

      if (!needsUpdate) continue;

      // Generate thumbnail if needed
      if (PreviewType.needsGeneration(type) && this.previewAdapter) {
        await generatePreviewThumbnail(
          attachmentPath,
          type,
          this.previewAdapter,
          this.settings,
          scope,
        );
      }

      // Atomically update the twin's frontmatter (replace existing line, or insert if absent).
      // Skip files that lack a frontmatter block entirely.
      const newLine = `attachment-preview: "${expectedPreview}"`;
      let mutated = false;
      await this.vault.process(file, (data) => {
        if (/^attachment-preview:.*/m.test(data)) {
          mutated = true;
          return data.replace(/^attachment-preview:.*/m, () => newLine);
        }
        const inserted = insertFrontmatterLine(data, newLine);
        if (inserted === data) return data; // no frontmatter block — leave as-is
        mutated = true;
        return inserted;
      });
      if (mutated) count++;
    }
    return count;
  }

  private async loadTemplate(): Promise<TwinTemplate | null> {
    const path = this.settings.templaterTemplatePath;
    if (!path) return null;
    const file = this.vault.getAbstractFileByPath(path);
    if (!file || !(file instanceof TFile)) return null;
    const content = await this.vault.read(file);
    return extractTemplateFrontmatter(content);
  }

  private async ensureParentFolder(filePath: string): Promise<void> {
    const lastSlash = filePath.lastIndexOf('/');
    if (lastSlash === -1) return;

    const folderPath = filePath.slice(0, lastSlash);
    const existing = this.vault.getAbstractFileByPath(folderPath);
    if (!existing) {
      try {
        await this.vault.createFolder(folderPath);
      } catch {
        // Folder may already exist due to race condition
      }
    }
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Insert a line at the end of a twin's YAML frontmatter (before the closing ---).
 * Returns the original content unchanged if no frontmatter block is found.
 */
function insertFrontmatterLine(content: string, line: string): string {
  if (!content.startsWith('---')) return content;
  const closeIdx = content.indexOf('\n---', 3);
  if (closeIdx === -1) return content;
  return content.slice(0, closeIdx) + '\n' + line + content.slice(closeIdx);
}
