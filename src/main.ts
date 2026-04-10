import { Plugin, TFile, TAbstractFile, Notice, Menu, MenuItem } from 'obsidian';
import { AttachmentsAutopilotSettings, AttachmentsAutopilotSettingTab, DEFAULT_SETTINGS } from './settings';
import { TwinManager } from './twin-manager';
import { shouldProcess, shouldProcessPath } from './file-utils';
import { createAttachmentBase, recreateAttachmentBase } from './base-creator';
import { isTemplaterAvailable, runTemplaterOnFile } from './templater-integration';
import { t } from './i18n';

export default class AttachmentsAutopilotPlugin extends Plugin {
  settings!: AttachmentsAutopilotSettings;
  twinManager!: TwinManager;
  private processing = new Set<string>();

  async onload() {
    await this.loadSettings();
    this.twinManager = new TwinManager(this.app.vault, this.settings);

    // Wire preview adapter using real vault binary methods
    this.twinManager.setPreviewAdapter({
      readBinary: (file: TFile) => this.app.vault.readBinary(file),
      createBinary: (path: string, data: ArrayBuffer) => this.app.vault.createBinary(path, data),
      getAbstractFileByPath: (path: string) => this.app.vault.getAbstractFileByPath(path),
      createFolder: (path: string) => this.app.vault.createFolder(path),
    });

    // Wire Templater integration if enabled
    if (this.settings.templaterEnabled) {
      this.twinManager.setTemplaterRunner(async (twinPath: string) => {
        if (!isTemplaterAvailable(this.app)) return;
        const twinFile = this.app.vault.getAbstractFileByPath(twinPath);
        if (twinFile instanceof TFile) {
          await runTemplaterOnFile(this.app, twinFile);
        }
      });
    }

    // Wait for vault to be ready before registering events
    this.app.workspace.onLayoutReady(async () => {
      this.registerVaultEvents();

      // Auto-create Base file on first install
      if (!this.settings.baseCreated) {
        await createAttachmentBase(this.app.vault, this.settings);
        this.settings.baseCreated = true;
        await this.saveSettings();
      }

      if (this.settings.syncOnStartup) {
        try {
          const { created, skipped } = await this.twinManager.syncAll();
          if (created > 0) {
            new Notice(t('notice.synced-startup')(created, skipped));
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
        const { created, skipped } = await this.twinManager.syncAll();
        new Notice(t('notice.synced')(created, skipped));
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
        await recreateAttachmentBase(this.app.vault, this.settings);
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

    this.addSettingTab(new AttachmentsAutopilotSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
        if (file instanceof TFile && shouldProcess(file, this.settings)) {
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
        if (!shouldProcess(file, this.settings)) return;
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
        if (shouldProcess(file, this.settings)) {
          await this.twinManager.deleteTwin(file);
          return;
        }

        // If a twin was deleted manually, do nothing (don't recreate)
      }),
    );

    this.registerEvent(
      this.app.vault.on('rename', async (file: TAbstractFile, oldPath: string) => {
        if (!(file instanceof TFile)) return;
        if (this.processing.has(file.path)) return;

        const wasProcessable = shouldProcessPath(oldPath, this.settings);
        const isProcessable = shouldProcess(file, this.settings);

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
