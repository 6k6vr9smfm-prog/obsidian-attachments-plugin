import { App, PluginSettingTab, Setting } from "obsidian";
import type AttachmentsManagerPlugin from "./main";

export const OPTIONAL_TWIN_PROPERTIES: { key: string; label: string; desc: string }[] = [
  { key: "type",       label: "Type",       desc: "Attachment type (image, pdf, video, audio)" },
  { key: "extension",  label: "Extension",  desc: "File extension (jpg, pdf, mp4, ...)" },
  { key: "size",       label: "Size",       desc: "File size in bytes" },
  { key: "created",    label: "Created",    desc: "File creation date" },
  { key: "modified",   label: "Modified",   desc: "File modification date" },
  { key: "categories", label: "Categories", desc: "Category tags (attachments)" },
];

export interface AttachmentsManagerSettings {
  excludePatterns: string[];
  twinFolder: string; // empty string = same folder as attachment
  syncOnStartup: boolean;
  watchedFolders: string[]; // empty = watch entire vault
  templatePath: string; // Templater template path, empty = use default content
  enabledTwinProperties: string[];
}

export const DEFAULT_SETTINGS: AttachmentsManagerSettings = {
  excludePatterns: [],
  twinFolder: "attachments/twins",
  syncOnStartup: true,
  watchedFolders: ["attachments"],
  templatePath: "templates/attachment.md",
  enabledTwinProperties: ["type", "extension", "size", "created", "modified", "categories"],
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
      .setName("Templater template")
      .setDesc(
        "Path to a Templater template file to use when creating twin files (e.g. templates/attachment.md). " +
          "Leave empty to use the default content. " +
          "In the template, use tp.file.title to get the attachment filename."
      )
      .addText((text) =>
        text
          .setPlaceholder("templates/attachment.md")
          .setValue(this.plugin.settings.templatePath)
          .onChange(async (value) => {
            this.plugin.settings.templatePath = value.trim();
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

    containerEl.createEl("h3", { text: "Twin file properties" });
    containerEl.createEl("p", {
      text: "Choose which optional properties are included in twin file frontmatter. " +
        "Mandatory properties (is_twin_file, attachment_file, preview) are always included.",
      cls: "setting-item-description",
    });

    for (const prop of OPTIONAL_TWIN_PROPERTIES) {
      new Setting(containerEl)
        .setName(prop.label)
        .setDesc(prop.desc)
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.enabledTwinProperties.includes(prop.key))
            .onChange(async (value) => {
              const set = new Set(this.plugin.settings.enabledTwinProperties);
              if (value) set.add(prop.key);
              else set.delete(prop.key);
              this.plugin.settings.enabledTwinProperties = [...set];
              await this.plugin.saveSettings();
            })
        );
    }
  }
}
