import { App, Menu, Modal, Notice, Plugin, Setting, TAbstractFile, TFile } from "obsidian";
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
      await createAttachmentsBase(this.app, this.settings.watchedFolders);

      await this.ensureDefaultTemplate();

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
      callback: async () => {
        try {
          await this.twinManager.syncAll();
        } catch (e) {
          console.error("Attachment Bases: syncAll failed", e);
          new Notice("Attachment Bases: sync failed — check the console for details.");
        }
      },
    });

    this.addCommand({
      id: "create-attachments-base",
      name: "Create Attachments Base",
      callback: async () => {
        try {
          await createAttachmentsBase(this.app, this.settings.watchedFolders);
        } catch (e) {
          console.error("Attachment Bases: createAttachmentsBase failed", e);
          new Notice("Attachment Bases: failed to create base file — check the console for details.");
        }
      },
    });

    this.addCommand({
      id: "move-twins-to-folder",
      name: "Move all twin files to configured folder",
      callback: () => this.twinManager.moveAllTwinsToFolder(),
    });

    this.addCommand({
      id: "create-default-template",
      name: "Create default twin template",
      callback: async () => {
        try {
          const path = this.settings.templatePath || "templates/attachment.md";
          await this.createDefaultTemplate(path);
        } catch (e) {
          console.error("Attachment Bases: createDefaultTemplate failed", e);
          new Notice("Attachment Bases: failed to create template — check the console for details.");
        }
      },
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

  private async ensureDefaultTemplate(): Promise<void> {
    const path = this.settings.templatePath;
    if (!path) return;
    if (this.app.vault.getAbstractFileByPath(path)) return;
    await this.createDefaultTemplate(path);
  }

  async createDefaultTemplate(path: string): Promise<void> {
    const folder = path.split("/").slice(0, -1).join("/");
    if (folder) {
      try {
        await this.app.vault.createFolder(folder);
      } catch {
        // already exists
      }
    }

    // If a file already exists at this path, add a numeric suffix
    let targetPath = path;
    if (this.app.vault.getAbstractFileByPath(targetPath)) {
      const withoutExt = path.replace(/\.md$/, "");
      let i = 1;
      while (this.app.vault.getAbstractFileByPath(`${withoutExt}-${i}.md`)) i++;
      targetPath = `${withoutExt}-${i}.md`;
    }

    const content = [
      "---",
      `is_twin_file: true`,
      `attachment_file: "[[<% tp.file.title %>]]"`,
      `categories:`,
      `  - attachments`,
      `created: <% tp.date.now("YYYY-MM-DD") %>`,
      "---",
      "",
      `![[<% tp.file.title %>]]`,
      "",
    ].join("\n");

    const file = await this.app.vault.create(targetPath, content);
    this.app.workspace.getLeaf().openFile(file);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
