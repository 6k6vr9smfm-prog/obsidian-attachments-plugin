import { App, PluginSettingTab, Setting } from "obsidian";
import type AttachmentsManagerPlugin from "./main";

export interface AttachmentsManagerSettings {
  excludePatterns: string[];
  companionFolder: string; // empty string = same folder as attachment
  syncOnStartup: boolean;
}

export const DEFAULT_SETTINGS: AttachmentsManagerSettings = {
  excludePatterns: [],
  companionFolder: "",
  syncOnStartup: true,
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
      .setDesc("Automatically create companion notes for all attachments when the plugin loads.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.syncOnStartup)
          .onChange(async (value) => {
            this.plugin.settings.syncOnStartup = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Companion folder")
      .setDesc(
        "Folder where companion notes are created. Leave empty to place them next to the attachment."
      )
      .addText((text) =>
        text
          .setPlaceholder("e.g. _meta or attachments/notes")
          .setValue(this.plugin.settings.companionFolder)
          .onChange(async (value) => {
            this.plugin.settings.companionFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Exclude patterns")
      .setDesc(
        "Comma-separated list of path prefixes to ignore (e.g. archive/, private/). " +
          "Attachments inside matching folders will not get companion notes."
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
