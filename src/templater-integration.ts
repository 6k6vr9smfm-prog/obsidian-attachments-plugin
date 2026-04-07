import { App, TFile } from 'obsidian';

/**
 * Checks if Templater plugin is installed and enabled.
 */
export function isTemplaterAvailable(app: App): boolean {
  return !!(app as any).plugins?.plugins?.['templater-obsidian'];
}

/**
 * Runs Templater's template processing on an existing file.
 * This overwrites the file content with Templater-processed output.
 */
export async function runTemplaterOnFile(app: App, file: TFile): Promise<void> {
  const templaterPlugin = (app as any).plugins?.plugins?.['templater-obsidian'];
  if (!templaterPlugin) return;

  try {
    await templaterPlugin.templater.overwrite_file_commands(file);
  } catch (e) {
    console.error('Attachment Bases: Templater processing failed', e);
  }
}

/**
 * Reads a template file and returns its content, or null if not found.
 */
export async function getTemplateContent(app: App, templatePath: string): Promise<string | null> {
  const file = app.vault.getAbstractFileByPath(templatePath);
  if (!file || !(file instanceof TFile)) return null;
  return app.vault.read(file);
}
