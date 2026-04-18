import { App, Modal, Plugin, TFile, TAbstractFile, Notice, Menu, MenuItem, MarkdownView, Vault } from 'obsidian';
import { AttachmentsAutopilotSettings, AttachmentsAutopilotSettingTab, DEFAULT_SETTINGS } from './settings';
import { TwinManager, VaultAdapter } from './twin-manager';
import { shouldProcess, shouldProcessPath, resolveWatchedScope, isTwinFile } from './file-utils';
import { createAttachmentBase, recreateAttachmentBase } from './base-creator';
import { isTemplaterAvailable, runTemplaterOnFile, createTwinViaTemplater } from './templater-integration';
import { importFiles, pickLocalFiles, ImportAdapter } from './import-command';
import { t } from './i18n';

/**
 * Reads Obsidian's `attachmentFolderPath` config. Undocumented but stable
 * API (used by Obsidian Importer and other community plugins).
 */
function readAttachmentFolderPath(vault: Vault): string | undefined {
  const getConfig = (vault as unknown as { getConfig?: (key: string) => unknown }).getConfig;
  if (typeof getConfig !== 'function') return undefined;
  const value = getConfig.call(vault, 'attachmentFolderPath');
  return typeof value === 'string' ? value : undefined;
}

class InsertLinksModal extends Modal {
  private resolved = false;
  private resolve!: (insert: boolean) => void;
  private count: number;

  constructor(app: App, count: number) {
    super(app);
    this.count = count;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h3', { text: t('modal.insert-links-title') });
    contentEl.createEl('p', { text: t('modal.insert-links-desc')(this.count) });

    const buttonRow = contentEl.createDiv({ cls: 'modal-button-container' });
    buttonRow.createEl('button', { text: t('modal.insert-links-yes'), cls: 'mod-cta' })
      .addEventListener('click', () => this.finish(true));
    buttonRow.createEl('button', { text: t('modal.insert-links-no') })
      .addEventListener('click', () => this.finish(false));
  }

  onClose() {
    this.finish(false);
  }

  private finish(insert: boolean) {
    if (this.resolved) return;
    this.resolved = true;
    this.resolve(insert);
    this.close();
  }

  prompt(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }
}

class BulkTemplaterModal extends Modal {
  private resolved = false;
  private resolve!: (runTemplater: boolean) => void;
  private count: number;

  constructor(app: App, count: number) {
    super(app);
    this.count = count;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h3', { text: t('modal.bulk-templater-title') });
    contentEl.createEl('p', { text: t('modal.bulk-templater-desc')(this.count) });

    const buttonRow = contentEl.createDiv({ cls: 'modal-button-container' });
    buttonRow.createEl('button', { text: t('modal.bulk-templater-yes'), cls: 'mod-cta' })
      .addEventListener('click', () => this.finish(true));
    buttonRow.createEl('button', { text: t('modal.bulk-templater-no') })
      .addEventListener('click', () => this.finish(false));
  }

  onClose() {
    // Dismissing the modal without choosing defaults to "skip" — safer
    // than firing N interactive prompts the user never opted into.
    this.finish(false);
  }

  private finish(runTemplater: boolean) {
    if (this.resolved) return;
    this.resolved = true;
    this.resolve(runTemplater);
    this.close();
  }

  prompt(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }
}

export default class AttachmentsAutopilotPlugin extends Plugin {
  settings!: AttachmentsAutopilotSettings;
  twinManager!: TwinManager;
  private vaultAdapter!: VaultAdapter;
  private processing = new Set<string>();

  // Debounced aggregator for preview-generation failures. Preview errors
  // arrive per-file and can burst (e.g. import of several PDFs), so we
  // collect them in a 1.5s window and flush a single summary Notice
  // rather than spamming one per failure.
  private previewFailures: string[] = [];
  private previewFailuresTimer: number | null = null;

  private currentScope() {
    return resolveWatchedScope(readAttachmentFolderPath(this.app.vault));
  }

  private recordPreviewFailure(path: string) {
    const name = path.split('/').pop() || path;
    this.previewFailures.push(name);
    if (this.previewFailuresTimer !== null) {
      window.clearTimeout(this.previewFailuresTimer);
    }
    this.previewFailuresTimer = window.setTimeout(() => this.flushPreviewFailures(), 1500);
  }

  private flushPreviewFailures() {
    this.previewFailuresTimer = null;
    if (this.previewFailures.length === 0) return;
    const count = this.previewFailures.length;
    const msg = count === 1
      ? t('notice.preview-failed-single')(this.previewFailures[0])
      : t('notice.preview-failed-multi')(count);
    new Notice(msg, 6000);
    this.previewFailures = [];
  }

  async onload() {
    await this.loadSettings();
    this.vaultAdapter = Object.assign(
      Object.create(this.app.vault) as Vault,
      {
        getAttachmentFolderPath: () => readAttachmentFolderPath(this.app.vault),
      },
    ) as unknown as VaultAdapter;
    this.twinManager = new TwinManager(this.vaultAdapter, this.settings);

    // Wire preview adapter using real vault binary methods.
    // Reads go through `vault.adapter.readBinary(path)` rather than
    // `vault.readBinary(file)` to sidestep an iOS-specific race: right
    // after `vault.createBinary` on the Capacitor filesystem, the
    // high-level indexed read sometimes returns empty or stale data
    // before Obsidian has re-indexed the freshly-written file. The
    // low-level adapter reads straight from disk and is race-free.
    this.twinManager.setPreviewAdapter({
      readBinary: (file: TFile) => this.app.vault.adapter.readBinary(file.path),
      createBinary: (path: string, data: ArrayBuffer) => this.app.vault.createBinary(path, data),
      getAbstractFileByPath: (path: string) => this.app.vault.getAbstractFileByPath(path),
      createFolder: (path: string) => this.app.vault.createFolder(path),
      onError: (path: string) => this.recordPreviewFailure(path),
    });

    // Always wire the Templater runner; gate inside the callback by reading
    // the live setting so runtime toggle changes take effect immediately
    // without needing a plugin reload.
    this.twinManager.setTemplaterRunner(async (twinFile: TFile) => {
      if (!this.settings.templaterEnabled) return;
      if (!isTemplaterAvailable(this.app)) return;
      await runTemplaterOnFile(this.app, twinFile);
    });

    // Templater-first twin creator: lets Templater's full pipeline (wizard
    // blocks, tp.system.prompt, tp.file.rename) author the twin. Returns
    // null to signal "not applicable — fall back to the static path".
    this.twinManager.setTemplaterTwinCreator(async (_attachment, folder, basename) => {
      if (!this.settings.templaterEnabled) return null;
      if (!this.settings.templaterTemplatePath) return null;
      if (!isTemplaterAvailable(this.app)) return null;
      const templateFile = this.app.vault.getAbstractFileByPath(this.settings.templaterTemplatePath);
      if (!(templateFile instanceof TFile)) return null;
      // Templater appends `.md` itself — strip it from the basename to
      // avoid ending up with "foo.pdf.md.md".
      const stem = basename.endsWith('.md') ? basename.slice(0, -3) : basename;
      return createTwinViaTemplater(this.app, templateFile, folder, stem);
    });

    // Wait for vault to be ready before registering events
    this.app.workspace.onLayoutReady(async () => {
      this.registerVaultEvents();

      // Build the reverse attachment→twin index from existing twins.
      // Required before syncAll / delete / rename operations, because
      // Templater-renamed twins can no longer be located via path mapping.
      try {
        await this.twinManager.buildIndex();
      } catch (e) {
        console.error('Attachments Autopilot: failed to build twin index', e);
      }

      // Auto-create Base file on first install
      if (!this.settings.baseCreated) {
        await createAttachmentBase(this.vaultAdapter, this.settings);
        this.settings.baseCreated = true;
        await this.saveSettings();
      }

      if (this.settings.syncOnStartup) {
        try {
          const { created, updated } = await this.twinManager.syncAll();
          if (created > 0 || updated > 0) {
            new Notice(t('notice.synced-startup')(created, updated));
          }
        } catch (e) {
          console.error('Attachments Autopilot: startup sync failed', e);
        }
      }

      // Generate any missing previews on startup
      if (this.settings.generatePreviews) {
        try {
          const count = await this.twinManager.generateMissingPreviews();
          if (count > 0) {
            new Notice(t('notice.generated-previews')(count));
          }
        } catch (e) {
          console.error('Attachments Autopilot: startup preview generation failed', e);
        }
      }
    });

    this.addCommand({
      id: 'sync-all',
      name: t('cmd.sync-all'),
      callback: async () => {
        const { created, updated } = await this.twinManager.syncAll();
        new Notice(t('notice.synced')(created, updated));
      },
    });

    this.addCommand({
      id: 'generate-missing-previews',
      name: t('cmd.generate-previews'),
      callback: async () => {
        const count = await this.twinManager.generateMissingPreviews();
        new Notice(t('notice.generated-previews')(count));
      },
    });

    this.addCommand({
      id: 'move-twins-to-folder',
      name: t('cmd.move-twins'),
      callback: async () => {
        const count = await this.twinManager.moveTwinsToFolder(this.settings.twinFolder);
        new Notice(t('notice.moved-twins')(count, this.settings.twinFolder));
      },
    });

    this.addCommand({
      id: 'recreate-base',
      name: t('cmd.recreate-base'),
      callback: async () => {
        await recreateAttachmentBase(this.vaultAdapter, this.settings);
        new Notice(t('notice.base-created'));
      },
    });

    this.addCommand({
      id: 'delete-all-twins',
      name: t('cmd.delete-all-twins'),
      callback: async () => {
        const count = await this.twinManager.deleteAllTwins();
        new Notice(t('notice.deleted-twins')(count));
      },
    });

    this.addCommand({
      id: 'import-files-from-device',
      name: t('cmd.import-files'),
      callback: async () => {
        const picked = await pickLocalFiles(true);
        if (picked.length === 0) return;

        // Bulk-import consent: if the user has Templater enabled with a
        // working template and is importing > 1 file, ask once whether to
        // run Templater on each new twin. Otherwise a multi-file import
        // fires N sequential interactive prompt sequences with no opt-out.
        let skipTemplater = false;
        if (
          picked.length > 1 &&
          this.settings.templaterEnabled &&
          this.settings.templaterTemplatePath &&
          isTemplaterAvailable(this.app)
        ) {
          const runOnEach = await new BulkTemplaterModal(this.app, picked.length).prompt();
          skipTemplater = !runOnEach;
        }

        const adapter: ImportAdapter = {
          getAvailablePathForAttachment: (filename: string, sourcePath?: string) =>
            this.app.fileManager.getAvailablePathForAttachment(filename, sourcePath ?? ''),
          createBinary: async (path: string, data: ArrayBuffer) => {
            // Pre-register in the processing Set so the vault 'create' event
            // handler skips this file — importFiles calls createTwin directly
            // and we don't want a duplicate (which would race with the
            // Templater runner and clobber its interactive output).
            this.processing.add(path);
            return this.app.vault.createBinary(path, data);
          },
          getActiveMarkdownPath: () => this.app.workspace.getActiveFile()?.path,
        };

        const result = await importFiles(picked, adapter, this.twinManager, { skipTemplater });

        // Clean up processing Set entries added by createBinary above
        for (const f of result.imported) {
          this.processing.delete(f.path);
        }

        new Notice(t('notice.imported')(result.imported.length, result.failed.length));
        for (const fail of result.failed) {
          console.error('Attachments Autopilot: import failed', fail);
        }

        // Offer to insert wiki-links at the cursor if there's an active note
        if (result.imported.length > 0) {
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (view) {
            const insert = await new InsertLinksModal(this.app, result.imported.length).prompt();
            if (insert) {
              const editor = view.editor;
              const links = result.imported.map(f => `![[${f.path}]]`).join('\n');
              editor.replaceSelection(links);
            }
          }
        }
      },
    });

    this.addSettingTab(new AttachmentsAutopilotSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
        if (file instanceof TFile && shouldProcess(file, this.settings, this.currentScope())) {
          menu.addItem((item: MenuItem) => {
            item
              .setTitle(t('cmd.resync-twin'))
              .setIcon('refresh-cw')
              .onClick(async () => {
                await this.twinManager.createTwin(file);
                new Notice(t('notice.resynced')(file.name));
              });
          });
        }
      }),
    );
  }

  private registerVaultEvents() {
    this.registerEvent(
      this.app.vault.on('create', async (file: TAbstractFile) => {
        if (!(file instanceof TFile)) return;
        if (!shouldProcess(file, this.settings, this.currentScope())) return;
        if (this.processing.has(file.path)) return;

        this.processing.add(file.path);
        try {
          await this.twinManager.createTwin(file);
        } finally {
          this.processing.delete(file.path);
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on('delete', async (file: TAbstractFile) => {
        if (!(file instanceof TFile)) return;

        // If an attachment was deleted, delete its twin
        if (shouldProcess(file, this.settings, this.currentScope())) {
          await this.twinManager.deleteTwin(file);
          return;
        }

        // If a twin was deleted manually, keep the index in sync.
        if (isTwinFile(file.path, this.settings)) {
          this.twinManager.onTwinDeleted(file.path);
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on('rename', async (file: TAbstractFile, oldPath: string) => {
        if (!(file instanceof TFile)) return;
        if (this.processing.has(file.path)) return;

        const scope = this.currentScope();
        const wasProcessable = shouldProcessPath(oldPath, this.settings, scope);
        const isProcessable = shouldProcess(file, this.settings, scope);

        // User-initiated rename of a twin file: update index so future
        // lookups find it at its new path. Runs alongside the attachment
        // branches below since an attachment rename never aliases a twin.
        if (isTwinFile(file.path, this.settings) || isTwinFile(oldPath, this.settings)) {
          this.twinManager.onTwinRenamed(oldPath, file.path);
        }

        this.processing.add(file.path);
        try {
          if (wasProcessable && isProcessable) {
            await this.twinManager.renameTwin(oldPath, file.path);
          } else if (!wasProcessable && isProcessable) {
            // Moved into a watched folder — create the twin
            await this.twinManager.createTwin(file);
          } else if (wasProcessable && !isProcessable) {
            // Moved out of a watched folder — clean up orphan twin
            await this.twinManager.deleteTwinByPath(oldPath);
          }
        } finally {
          this.processing.delete(file.path);
        }
      }),
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
