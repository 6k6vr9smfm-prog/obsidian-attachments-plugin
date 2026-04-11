import { App, PluginSettingTab, Setting } from 'obsidian';
import type AttachmentsAutopilotPlugin from './main';
import { t } from './i18n';

export interface AttachmentsAutopilotSettings {
  syncOnStartup: boolean;
  twinFolder: string;
  excludePatterns: string[];
  generatePreviews: boolean;
  previewFolder: string;
  baseCreated: boolean;
  customFields: string;
  templaterEnabled: boolean;
  templaterTemplatePath: string;
}

export const DEFAULT_SETTINGS: AttachmentsAutopilotSettings = {
  syncOnStartup: false,
  twinFolder: 'attachments/twins',
  excludePatterns: [],
  generatePreviews: true,
  previewFolder: 'attachments/twins/previews',
  baseCreated: false,
  customFields: '',
  templaterEnabled: false,
  templaterTemplatePath: '',
};

export class AttachmentsAutopilotSettingTab extends PluginSettingTab {
  plugin: AttachmentsAutopilotPlugin;

  constructor(app: App, plugin: AttachmentsAutopilotPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName(t('settings.sync-on-startup'))
      .setDesc(t('settings.sync-on-startup.desc'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.syncOnStartup).onChange(async (value) => {
          this.plugin.settings.syncOnStartup = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('settings.twin-folder'))
      .setDesc(t('settings.twin-folder.desc'))
      .addText((text) =>
        text
          .setPlaceholder(t('settings.twin-folder.placeholder'))
          .setValue(this.plugin.settings.twinFolder)
          .onChange(async (value) => {
            this.plugin.settings.twinFolder = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings.exclude-patterns'))
      .setDesc(t('settings.exclude-patterns.desc'))
      .addTextArea((area) =>
        area
          .setPlaceholder('attachments/private\ntemp/')
          .setValue(this.plugin.settings.excludePatterns.join('\n'))
          .onChange(async (value) => {
            this.plugin.settings.excludePatterns = value
              .split('\n')
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings.generate-previews'))
      .setDesc(t('settings.generate-previews.desc'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.generatePreviews).onChange(async (value) => {
          this.plugin.settings.generatePreviews = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('settings.preview-folder'))
      .setDesc(t('settings.preview-folder.desc'))
      .addText((text) =>
        text
          .setPlaceholder(t('settings.preview-folder.placeholder'))
          .setValue(this.plugin.settings.previewFolder)
          .onChange(async (value) => {
            this.plugin.settings.previewFolder = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings.custom-fields'))
      .setDesc(t('settings.custom-fields.desc'))
      .addTextArea((area) =>
        area
          .setPlaceholder('project: my-project\nstatus: unreviewed')
          .setValue(this.plugin.settings.customFields)
          .onChange(async (value) => {
            this.plugin.settings.customFields = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings.templater-enabled'))
      .setDesc(t('settings.templater-enabled.desc'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.templaterEnabled).onChange(async (value) => {
          this.plugin.settings.templaterEnabled = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('settings.templater-path'))
      .setDesc(t('settings.templater-path.desc'))
      .addText((text) =>
        text
          .setPlaceholder('templates/attachment-twin.md')
          .setValue(this.plugin.settings.templaterTemplatePath)
          .onChange(async (value) => {
            this.plugin.settings.templaterTemplatePath = value.trim();
            await this.plugin.saveSettings();
          }),
      );
  }
}
