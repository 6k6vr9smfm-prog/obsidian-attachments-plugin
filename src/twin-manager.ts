import { TFile } from 'obsidian';
import { AttachmentBasesSettings } from './settings';
import { getTwinPath, getAttachmentPathFromTwin, isTwinFile, isPreviewThumbnail, shouldProcess, classifyType } from './file-utils';
import { buildTwinContent, mergeFrontmatter, parseFrontmatter, extractTemplateFrontmatter, TwinTemplate } from './twin-format';
import { getPreviewValue, getPreviewThumbnailPath, PreviewType, generatePreviewThumbnail, PreviewGeneratorAdapter } from './preview-generator';

export interface VaultAdapter {
  create(path: string, content: string): Promise<TFile>;
  delete(file: TFile): Promise<void>;
  rename(file: TFile, newPath: string): Promise<void>;
  read(file: TFile): Promise<string>;
  modify(file: TFile, content: string): Promise<void>;
  getAbstractFileByPath(path: string): any;
  getFiles(): TFile[];
  createFolder(path: string): Promise<any>;
}

export type TemplaterRunner = (twinPath: string) => Promise<void>;

export class TwinManager {
  private previewAdapter: PreviewGeneratorAdapter | null = null;
  private templaterRunner: TemplaterRunner | null = null;

  constructor(
    private vault: VaultAdapter,
    private settings: AttachmentBasesSettings,
  ) {}

  setPreviewAdapter(adapter: PreviewGeneratorAdapter): void {
    this.previewAdapter = adapter;
  }

  setTemplaterRunner(runner: TemplaterRunner): void {
    this.templaterRunner = runner;
  }

  async createTwin(file: TFile): Promise<void> {
    const ext = file.path.split('.').pop() || '';
    const type = classifyType(ext);
    let previewValue = '';

    if (this.settings.generatePreviews) {
      previewValue = getPreviewValue(file.path, type, this.settings);

      // Generate thumbnail if needed and adapter is available
      if (PreviewType.needsGeneration(type) && this.previewAdapter) {
        await generatePreviewThumbnail(file.path, type, this.previewAdapter, this.settings);
      }
    }

    const template = await this.loadTemplate();
    const twinPath = getTwinPath(file.path, this.settings);
    const content = buildTwinContent(file.path, file.stat, this.settings, previewValue, template);

    await this.ensureParentFolder(twinPath);

    const existingTwin = this.vault.getAbstractFileByPath(twinPath);
    if (existingTwin && existingTwin instanceof TFile) {
      const existingContent = await this.vault.read(existingTwin);
      const merged = mergeFrontmatter(existingContent, content);
      await this.vault.modify(existingTwin, merged);
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
    const twinPath = getTwinPath(attachmentPath, this.settings);
    const twin = this.vault.getAbstractFileByPath(twinPath);
    if (twin && twin instanceof TFile) {
      await this.vault.delete(twin);
    }
  }

  async renameTwin(oldPath: string, newPath: string): Promise<void> {
    const oldTwinPath = getTwinPath(oldPath, this.settings);
    const newTwinPath = getTwinPath(newPath, this.settings);

    const twin = this.vault.getAbstractFileByPath(oldTwinPath);
    if (!twin || !(twin instanceof TFile)) return;

    // Compute preview paths once if previews are enabled
    const oldPreviewPath = this.settings.generatePreviews ? getPreviewThumbnailPath(oldPath, this.settings) : '';
    const newPreviewPath = this.settings.generatePreviews ? getPreviewThumbnailPath(newPath, this.settings) : '';

    // Rename preview file if it exists
    if (oldPreviewPath) {
      const previewFile = this.vault.getAbstractFileByPath(oldPreviewPath);
      if (previewFile && previewFile instanceof TFile) {
        await this.ensureParentFolder(newPreviewPath);
        await this.vault.rename(previewFile, newPreviewPath);
      }
    }

    await this.ensureParentFolder(newTwinPath);

    // Read existing content and update all references (attachment path + preview path)
    const existingContent = await this.vault.read(twin);
    let updatedContent = existingContent
      .replace(new RegExp(escapeRegExp(oldPath), 'g'), newPath);

    if (oldPreviewPath) {
      updatedContent = updatedContent
        .replace(new RegExp(escapeRegExp(oldPreviewPath), 'g'), newPreviewPath);
    }

    await this.vault.rename(twin, newTwinPath);

    // Re-read the renamed file and update its content
    const renamedTwin = this.vault.getAbstractFileByPath(newTwinPath);
    if (renamedTwin && renamedTwin instanceof TFile) {
      await this.vault.modify(renamedTwin, updatedContent);
    }
  }

  async syncAll(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const file of this.vault.getFiles()) {
      if (!shouldProcess(file, this.settings)) continue;

      const twinPath = getTwinPath(file.path, this.settings);
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
    const files = this.vault.getFiles();

    for (const file of files) {
      if (isTwinFile(file.path, this.settings)) {
        await this.vault.delete(file);
        count++;
      }
    }

    // Also clean up orphan preview thumbnails
    for (const file of this.vault.getFiles()) {
      if (isPreviewThumbnail(file.path)) {
        await this.vault.delete(file);
      }
    }

    return count;
  }

  async moveTwinsToFolder(newFolder: string): Promise<number> {
    const currentFolder = this.settings.twinFolder;
    if (newFolder === currentFolder) return 0;

    const prefix = currentFolder + '/';
    const twins = this.vault.getFiles().filter((f) => f.path.startsWith(prefix));
    let count = 0;

    for (const twin of twins) {
      const relativePath = twin.path.slice(prefix.length);
      const newPath = newFolder + '/' + relativePath;

      await this.ensureParentFolder(newPath);
      await this.vault.rename(twin, newPath);
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
    let count = 0;
    for (const file of this.vault.getFiles()) {
      if (!isTwinFile(file.path, this.settings)) continue;

      const attachmentPath = getAttachmentPathFromTwin(file.path, this.settings);
      if (!attachmentPath) continue;

      const ext = attachmentPath.split('.').pop() || '';
      const type = classifyType(ext);
      const expectedPreview = getPreviewValue(attachmentPath, type, this.settings);
      if (!expectedPreview) continue;

      const content = await this.vault.read(file);
      const { data } = parseFrontmatter(content);
      const currentPreview = (data['attachment-preview'] || '') as string;

      let needsUpdate = currentPreview !== expectedPreview;

      // Even if the value is correct, the thumbnail file itself may be missing
      if (!needsUpdate && PreviewType.needsGeneration(type)) {
        const thumbPath = getPreviewThumbnailPath(attachmentPath, this.settings);
        if (!this.vault.getAbstractFileByPath(thumbPath)) {
          needsUpdate = true;
        }
      }

      if (!needsUpdate) continue;

      // Generate thumbnail if needed
      if (PreviewType.needsGeneration(type) && this.previewAdapter) {
        await generatePreviewThumbnail(attachmentPath, type, this.previewAdapter, this.settings);
      }

      // Update the twin's frontmatter (replace whatever is there, or insert if absent)
      const newLine = `attachment-preview: "${expectedPreview}"`;
      let updatedContent: string;
      if (/^attachment-preview:.*/m.test(content)) {
        updatedContent = content.replace(/^attachment-preview:.*/m, () => newLine);
      } else {
        updatedContent = insertFrontmatterLine(content, newLine);
        if (updatedContent === content) continue; // no frontmatter block — skip
      }
      await this.vault.modify(file, updatedContent);
      count++;
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
