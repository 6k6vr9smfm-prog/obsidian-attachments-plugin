import { App, Modal, Plugin, Setting, TAbstractFile, TFile } from "obsidian";
import { CompanionManager } from "./companion-manager";
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
  private companionManager: CompanionManager;

  async onload() {
    await this.loadSettings();
    this.companionManager = new CompanionManager(this.app, this.settings);

    this.addSettingTab(new AttachmentsManagerSettingsTab(this.app, this));

    this.app.workspace.onLayoutReady(async () => {
      if (!this.settings.hasCreatedBase) {
        await createAttachmentsBase(this.app);
        this.settings.hasCreatedBase = true;
        await this.saveSettings();
      }

      if (this.settings.syncOnStartup) {
        await this.companionManager.syncAll();
      }
    });

    this.registerEvent(
      this.app.vault.on("create", (file: TAbstractFile) => {
        if (file instanceof TFile && isAttachment(file)) {
          this.companionManager.createCompanion(file);
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", (file: TAbstractFile) => {
        if (file instanceof TFile && isAttachment(file)) {
          this.companionManager.deleteCompanion(file.path);
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
        if (file instanceof TFile && isAttachment(file)) {
          this.companionManager.renameCompanion(oldPath, file);
        }
      })
    );

    this.addCommand({
      id: "sync-all-attachments",
      name: "Sync all attachment companions",
      callback: () => this.companionManager.syncAll(),
    });

    this.addCommand({
      id: "create-attachments-base",
      name: "Create Attachments Base",
      callback: async () => {
        await createAttachmentsBase(this.app);
      },
    });

    this.addCommand({
      id: "move-companions-to-folder",
      name: "Move all companion notes to configured folder",
      callback: () => this.companionManager.moveAllCompanionsToFolder(),
    });

    this.addCommand({
      id: "delete-all-companions",
      name: "Delete all companion notes",
      callback: () => {
        new ConfirmModal(
          this.app,
          "This will permanently delete all companion notes in your vault. This cannot be undone. Are you sure?",
          () => this.companionManager.deleteAllCompanions()
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
