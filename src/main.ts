import { App, Menu, Modal, Plugin, Setting, TAbstractFile, TFile } from "obsidian";
import { TwinManager } from "./twin-manager";
import { isAttachment } from "./attachment-utils";
import {
  AttachmentsManagerSettings,
  AttachmentsManagerSettingsTab,
  DEFAULT_SETTINGS,
} from "./settings";
import { createAttachmentsBase } from "./base-manager";

class ConfirmModal extends Modal {
  constructor(app: App, private message: string, private onConfirm: () => void) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("p", { text: this.message });
    new Setting(contentEl)
      .addButton((btn) =>
        btn.setButtonText("Cancel").onClick(() => this.close())
      )
      .addButton((btn) =>
        btn
          .setButtonText("Delete")
          .setWarning()
          .onClick(() => {
            this.close();
            this.onConfirm();
          })
      );
  }

  onClose() {
    this.contentEl.empty();
  }
}

export default class AttachmentsManagerPlugin extends Plugin {
  settings: AttachmentsManagerSettings;
  private twinManager: TwinManager;

  async onload() {
    await this.loadSettings();
    this.twinManager = new TwinManager(this.app, this.settings);

    this.addSettingTab(new AttachmentsManagerSettingsTab(this.app, this));

    this.app.workspace.onLayoutReady(async () => {
      if (!this.settings.hasCreatedBase) {
        await createAttachmentsBase(this.app);
        this.settings.hasCreatedBase = true;
        await this.saveSettings();
      }

      if (this.settings.syncOnStartup) {
        await this.twinManager.syncAll();
      }
    });

    this.registerEvent(
      this.app.vault.on("create", (file: TAbstractFile) => {
        if (file instanceof TFile && isAttachment(file)) {
          this.twinManager.createTwin(file).catch(console.error);
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", (file: TAbstractFile) => {
        if (file instanceof TFile && isAttachment(file)) {
          this.twinManager.deleteTwin(file.path).catch(console.error);
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
        if (file instanceof TFile && isAttachment(file)) {
          this.twinManager.renameTwin(oldPath, file).catch(console.error);
        }
      })
    );

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu: Menu, file: TAbstractFile) => {
        if (!(file instanceof TFile) || !isAttachment(file)) return;
        menu.addItem((item) =>
          item
            .setTitle("Resync twin file")
            .setIcon("refresh-cw")
            .onClick(() => this.twinManager.resyncTwin(file).catch(console.error))
        );
      })
    );

    this.addCommand({
      id: "sync-all-attachments",
      name: "Sync all attachment twin files",
      callback: () => this.twinManager.syncAll(),
    });

    this.addCommand({
      id: "create-attachments-base",
      name: "Create Attachments Base",
      callback: async () => {
        await createAttachmentsBase(this.app);
      },
    });

    this.addCommand({
      id: "move-twins-to-folder",
      name: "Move all twin files to configured folder",
      callback: () => this.twinManager.moveAllTwinsToFolder(),
    });

    this.addCommand({
      id: "delete-all-twins",
      name: "Delete all twin files",
      callback: () => {
        new ConfirmModal(
          this.app,
          "This will permanently delete all twin files in your vault. This cannot be undone. Are you sure?",
          () => this.twinManager.deleteAllTwins()
        ).open();
      },
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
