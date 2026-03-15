import { Plugin, TAbstractFile, TFile } from "obsidian";
import { CompanionManager } from "./companion-manager";
import { isAttachment } from "./attachment-utils";
import {
  AttachmentsManagerSettings,
  AttachmentsManagerSettingsTab,
  DEFAULT_SETTINGS,
} from "./settings";
import { createAttachmentsBase } from "./base-manager";

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
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
