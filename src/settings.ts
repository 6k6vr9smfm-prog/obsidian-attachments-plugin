import { App, PluginSettingTab, Setting } from "obsidian";
import type AttachmentsManagerPlugin from "./main";

export interface AttachmentsManagerSettings {
  excludePatterns: string[];
  twinFolder: string; // empty string = same folder as attachment
  syncOnStartup: boolean;
  watchedFolders: string[]; // empty = watch entire vault
  hasCreatedBase: boolean;
}

export const DEFAULT_SETTINGS: AttachmentsManagerSettings = {
  excludePatterns: [],
  twinFolder: "attachments/twins",
  syncOnStartup: true,
  watchedFolders: ["attachments"],
  hasCreatedBase: false,
};

export class AttachmentsManagerSettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: AttachmentsManagerPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Sync on startup")
      .setDesc("Automatically create twin files for all attachments when the plugin loads.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.syncOnStartup)
          .onChange(async (value) => {
            this.plugin.settings.syncOnStartup = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Twins folder")
      .setDesc(
        "Folder where twin files are created. Leave empty to place them next to the attachment."
      )
      .addText((text) =>
        text
          .setPlaceholder("e.g. attachments/twins")
          .setValue(this.plugin.settings.twinFolder)
          .onChange(async (value) => {
            this.plugin.settings.twinFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Watched folders")
      .setDesc(
        "Comma-separated list of folders to watch for attachments (e.g. attachments/, photos/). " +
          "Leave empty to watch the entire vault."
      )
      .addTextArea((text) =>
        text
          .setPlaceholder("attachments/, photos/")
          .setValue(this.plugin.settings.watchedFolders.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.watchedFolders = value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Exclude patterns")
      .setDesc(
        "Comma-separated list of path prefixes to ignore (e.g. archive/, private/). " +
          "Attachments inside matching folders will not get twin files."
      )
      .addTextArea((text) =>
        text
          .setPlaceholder("archive/, private/, temp/")
          .setValue(this.plugin.settings.excludePatterns.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.excludePatterns = value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            await this.plugin.saveSettings();
          })
      );
  }
}
