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

export type TemplaterRunner = (twinFile: TFile) => Promise<void>;

/**
 * Hook that delegates twin creation to Templater's own
 * `create_new_note_from_template` pipeline. Returns the resulting file
 * (possibly renamed by the template) or null to indicate the manager
 * should fall back to the static-template path.
 */
export type TemplaterTwinCreator = (
  attachment: TFile,
  folder: string,
  basename: string,
) => Promise<TFile | null>;

export class TwinManager {
  private previewAdapter: PreviewGeneratorAdapter | null = null;
  private templaterRunner: TemplaterRunner | null = null;
  private templaterTwinCreator: TemplaterTwinCreator | null = null;

  /**
   * Reverse index: attachment path → actual twin path. Needed because
   * Templater-authored twins can be renamed by `tp.file.rename`, making
   * the twin name no longer computable from the attachment path. Built
   * once at startup (see `buildIndex`) and kept current on every
   * create/rename/delete.
   */
  private twinIndex = new Map<string, string>();

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

  setTemplaterTwinCreator(creator: TemplaterTwinCreator | null): void {
    this.templaterTwinCreator = creator;
  }

  /**
   * Scans the twin folder and populates the reverse index from each
   * twin's `attachment:` frontmatter key. Call once at plugin load.
   */
  async buildIndex(): Promise<void> {
    this.twinIndex.clear();
    for (const file of this.vault.getFiles()) {
      if (!isTwinFile(file.path, this.settings)) continue;
      const content = await this.vault.read(file);
      const { data } = parseFrontmatter(content);
      const raw = data['attachment'];
      if (typeof raw !== 'string' || !raw) continue;
      const attachmentPath = raw.replace(/^\[\[/, '').replace(/\]\]$/, '').trim();
      if (attachmentPath) {
        this.twinIndex.set(attachmentPath, file.path);
      }
    }
  }

  /** Returns the indexed twin path for an attachment, or null if unknown. */
  getTwinPathForAttachment(attachmentPath: string): string | null {
    return this.twinIndex.get(attachmentPath) ?? null;
  }

  /** Called by main.ts when a file inside the twin folder is renamed by the user. */
  onTwinRenamed(oldTwinPath: string, newTwinPath: string): void {
    for (const [attachment, twin] of this.twinIndex) {
      if (twin === oldTwinPath) {
        this.twinIndex.set(attachment, newTwinPath);
        return;
      }
    }
  }

  /** Called by main.ts when a twin file is deleted by the user. */
  onTwinDeleted(twinPath: string): void {
    for (const [attachment, twin] of this.twinIndex) {
      if (twin === twinPath) {
        this.twinIndex.delete(attachment);
        return;
      }
    }
  }

  /**
   * Resolves the current twin path for an attachment. Prefers the index
   * (authoritative for Templater-renamed twins), falls back to the
   * computed path (works for canonically-named twins and legacy cases).
   */
  private findTwinPath(attachmentPath: string): string | null {
    const indexed = this.twinIndex.get(attachmentPath);
    if (indexed) {
      const file = this.vault.getAbstractFileByPath(indexed);
      if (file instanceof TFile) return indexed;
      this.twinIndex.delete(attachmentPath); // stale
    }
    const scope = this.resolveScope();
    const computed = getTwinPath(attachmentPath, this.settings, scope);
    const file = this.vault.getAbstractFileByPath(computed);
    return file instanceof TFile ? computed : null;
  }

  private resolveScope(): WatchedScope {
    return resolveWatchedScope(this.vault.getAttachmentFolderPath());
  }

  async createTwin(file: TFile, opts?: { skipTemplater?: boolean }): Promise<void> {
    const scope = this.resolveScope();
    const ext = file.path.split('.').pop() || '';
    const type = classifyType(ext);
    let previewValue = '';

    if (this.settings.generatePreviews) {
      previewValue = getPreviewValue(file.path, type, this.settings, scope);

      // Generate thumbnail if needed and adapter is available. Pass the
      // TFile directly (not the path) to sidestep an indexing race where
      // `getAbstractFileByPath` returns null for a just-created file in
      // a subfolder — the reactive create-event path hits this on PDFs.
      if (PreviewType.needsGeneration(type) && this.previewAdapter) {
        await generatePreviewThumbnail(
          file,
          type,
          this.previewAdapter,
          this.settings,
          scope,
        );
      }
    }

    const template = await this.loadTemplate();
    const twinPath = getTwinPath(file.path, this.settings, scope);

    // Two flavors of the "generated content" argument to mergeFrontmatter:
    //   - staticContent: managed frontmatter + the template's non-managed
    //     keys and body — used when no Templater pass is happening (static
    //     mode or standalone new twin).
    //   - managedOnlyContent: managed frontmatter only, default embed-link
    //     body. Used as the merge payload for Templater-authored twins.
    //     Passing staticContent there would inject the template's raw
    //     `<%*` source as a body fallback whenever Templater emits an
    //     empty body (wizard templates typically do), leaking unprocessed
    //     template source into the final twin.
    const staticContent = buildTwinContent(file.path, file.stat, this.settings, previewValue, template);
    const managedOnlyContent = buildTwinContent(file.path, file.stat, this.settings, previewValue, null);

    // If a twin already exists (computed path OR index-tracked renamed path),
    // update it in place — don't invoke creator or runner. Re-running either
    // would re-trigger interactive Templater prompts on every sync. Use the
    // managed-only payload so re-sync never re-injects template source.
    const existingPath = this.findTwinPath(file.path) ?? twinPath;
    const existingTwin = this.vault.getAbstractFileByPath(existingPath);
    if (existingTwin instanceof TFile) {
      await this.vault.process(existingTwin, (existingContent) =>
        mergeFrontmatter(existingContent, managedOnlyContent),
      );
      this.twinIndex.set(file.path, existingTwin.path);
      return;
    }

    await this.ensureParentFolder(twinPath);
    const expectedFolder = parentFolder(twinPath);

    // Templater-first path: let Templater create the file via its own
    // `create_new_note_from_template` pipeline (fully supports <%* blocks,
    // tp.system.prompt, tp.file.rename, etc.), then merge managed frontmatter.
    if (!opts?.skipTemplater && this.templaterTwinCreator) {
      const attachmentBasename = file.path.split('/').pop() || file.path;
      let createdByTemplater: TFile | null = null;
      try {
        createdByTemplater = await this.templaterTwinCreator(file, expectedFolder, attachmentBasename);
      } catch (e) {
        // Decision B: if the runner threw mid-prompt but left a partial file
        // behind, recover it below. Otherwise fall through to static path.
        console.error('Attachments Autopilot: Templater twin creation failed', e);
        createdByTemplater = this.findStrayTwin(file.path, expectedFolder, attachmentBasename);
      }

      if (createdByTemplater) {
        const settled = await this.ensureInTwinFolder(createdByTemplater, expectedFolder);
        const currentContent = await this.vault.read(settled);
        if (looksUnprocessed(currentContent)) {
          // Template had a fatal error (e.g. syntax error) — Templater left
          // raw `<%* ... -%>` source on disk without processing. Replace
          // with a clean managed-only twin (managed frontmatter + embed
          // link body) rather than merging into the raw source.
          await this.vault.modify(settled, managedOnlyContent);
        } else {
          await this.vault.process(settled, (existingContent) =>
            mergeFrontmatter(existingContent, managedOnlyContent),
          );
        }
        this.twinIndex.set(file.path, settled.path);
        return;
      }
      // Creator returned null → fall through to static path.
    }

    const createdTwin = await this.vault.create(twinPath, staticContent);
    this.twinIndex.set(file.path, twinPath);

    // Static-path runner (legacy): runs Templater's overwrite_file_commands
    // on the already-written file. Kept for backwards compatibility when
    // the creator hook is not wired.
    if (!opts?.skipTemplater && this.templaterRunner && createdTwin) {
      await this.templaterRunner(createdTwin);
    }
  }

  /**
   * If Templater's creation threw, a file may still have been written to
   * its intended target path. Look it up so we can salvage partial state.
   */
  private findStrayTwin(attachmentPath: string, expectedFolder: string, basename: string): TFile | null {
    const candidate = `${expectedFolder}/${basename}.md`;
    const file = this.vault.getAbstractFileByPath(candidate);
    if (file instanceof TFile) return file;
    // Also check if anything in the twin folder already points at this attachment.
    for (const f of this.vault.getFiles()) {
      if (!isTwinFile(f.path, this.settings)) continue;
      if (f.path === candidate) return f;
    }
    void attachmentPath;
    return null;
  }

  /**
   * Ensures the twin file lives inside the expected twin-folder path. If
   * a template's `tp.file.rename` moved it elsewhere (e.g. vault root),
   * move it back, preserving whatever basename the template chose.
   */
  private async ensureInTwinFolder(twin: TFile, expectedFolder: string): Promise<TFile> {
    const currentFolder = parentFolder(twin.path);
    if (currentFolder === expectedFolder) return twin;
    const basename = twin.path.split('/').pop() || twin.path;
    const target = expectedFolder ? `${expectedFolder}/${basename}` : basename;
    if (target === twin.path) return twin;
    await this.ensureParentFolder(target);
    await this.vault.rename(twin, target);
    const moved = this.vault.getAbstractFileByPath(target);
    return moved instanceof TFile ? moved : twin;
  }

  async deleteTwin(file: TFile): Promise<void> {
    return this.deleteTwinByPath(file.path);
  }

  async deleteTwinByPath(attachmentPath: string): Promise<void> {
    const scope = this.resolveScope();
    const twinPath = this.findTwinPath(attachmentPath);
    if (twinPath) {
      const twin = this.vault.getAbstractFileByPath(twinPath);
      if (twin instanceof TFile) {
        await this.vault.delete(twin);
      }
      this.twinIndex.delete(attachmentPath);
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
    const currentTwinPath = this.findTwinPath(oldPath);
    if (!currentTwinPath) return;
    const twin = this.vault.getAbstractFileByPath(currentTwinPath);
    if (!(twin instanceof TFile)) return;

    const computedOldTwinPath = getTwinPath(oldPath, this.settings, scope);
    const computedNewTwinPath = getTwinPath(newPath, this.settings, scope);
    // If the twin currently sits at its canonical path, rename it to the new
    // canonical path. If it sits elsewhere (e.g. Templater-renamed), preserve
    // that name — only the attachment link inside needs updating.
    const isCanonicallyNamed = currentTwinPath === computedOldTwinPath;

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

    let finalTwinPath = currentTwinPath;
    if (isCanonicallyNamed) {
      await this.ensureParentFolder(computedNewTwinPath);
      await this.vault.rename(twin, computedNewTwinPath);
      finalTwinPath = computedNewTwinPath;
    }

    // Atomically update all in-content references (attachment path + preview path)
    const renamedTwin = this.vault.getAbstractFileByPath(finalTwinPath);
    if (renamedTwin instanceof TFile) {
      await this.vault.process(renamedTwin, (data) => {
        let updated = data.replace(new RegExp(escapeRegExp(oldPath), 'g'), newPath);
        if (oldPreviewPath && newPreviewPath) {
          updated = updated.replace(new RegExp(escapeRegExp(oldPreviewPath), 'g'), newPreviewPath);
        }
        return updated;
      });
    }

    this.twinIndex.delete(oldPath);
    this.twinIndex.set(newPath, finalTwinPath);
  }

  async syncAll(): Promise<{ created: number; updated: number }> {
    const scope = this.resolveScope();
    let created = 0;
    let updated = 0;

    for (const file of this.vault.getFiles()) {
      if (!shouldProcess(file, this.settings, scope)) continue;

      const existed = this.findTwinPath(file.path) !== null;

      // Always call createTwin — it's idempotent (read-modify-write via
      // mergeFrontmatter on existing twins). Skipping when the twin exists
      // would prevent newly-added customFields / template keys from
      // propagating to pre-existing twins on re-sync (T3.6).
      await this.createTwin(file);
      if (existed) {
        updated++;
      } else {
        created++;
      }
    }

    return { created, updated };
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

      // Generate thumbnail if needed. Resolve the TFile first — this is
      // the non-reactive path (command / startup), so the file is already
      // indexed and the lookup is safe.
      if (PreviewType.needsGeneration(type) && this.previewAdapter) {
        const attachmentFile = this.vault.getAbstractFileByPath(attachmentPath);
        if (attachmentFile instanceof TFile) {
          await generatePreviewThumbnail(
            attachmentFile,
            type,
            this.previewAdapter,
            this.settings,
            scope,
          );
        }
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

function parentFolder(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? '' : path.slice(0, idx);
}

/**
 * A Templater-authored file that still contains `<%*` means Templater
 * aborted before running (e.g. template syntax error) and wrote the raw
 * template to disk. Used to decide whether to salvage or replace.
 */
function looksUnprocessed(content: string): boolean {
  return /<%\s*\*/.test(content);
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
