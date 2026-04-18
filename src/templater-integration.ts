import { App, TFile, TFolder } from 'obsidian';

/**
 * Shape of the Templater plugin's public runtime we rely on.
 * This interface is intentionally minimal — only the methods we call.
 * Accessing other plugins requires going through `app.plugins`, which is
 * not part of Obsidian's public API, hence the `any` cast in getTemplaterPlugin().
 */
interface TemplaterPlugin {
  templater: {
    overwrite_file_commands(file: TFile): Promise<void>;
    create_new_note_from_template(
      template: TFile | string,
      folder?: TFolder | string,
      filename?: string,
      open_new_note?: boolean,
    ): Promise<TFile | undefined>;
  };
}

function getTemplaterPlugin(app: App): TemplaterPlugin | undefined {
  // `app.plugins` is not in Obsidian's public API. This is the standard
  // cross-plugin integration pattern used throughout the community.
  return (app as unknown as { plugins?: { plugins?: Record<string, unknown> } })
    .plugins?.plugins?.['templater-obsidian'] as TemplaterPlugin | undefined;
}

/**
 * Checks if Templater plugin is installed and enabled.
 */
export function isTemplaterAvailable(app: App): boolean {
  return !!getTemplaterPlugin(app);
}

/**
 * Runs Templater's template processing on an existing file.
 * This overwrites the file content with Templater-processed output.
 */
export async function runTemplaterOnFile(app: App, file: TFile): Promise<void> {
  const templaterPlugin = getTemplaterPlugin(app);
  if (!templaterPlugin) return;

  try {
    await templaterPlugin.templater.overwrite_file_commands(file);
  } catch (e) {
    console.error('Attachments Autopilot: Templater processing failed', e);
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

/**
 * Returns true if the given content contains Templater dynamic syntax
 * (a `<% ... %>` marker). Used to decide whether running Templater on a
 * twin is worthwhile and to surface a "no dynamic fields" hint in settings.
 */
export function hasTemplaterSyntax(content: string): boolean {
  return /<%[\s\S]*?%>/.test(content);
}

/**
 * Creates a new twin file by invoking Templater's own
 * `create_new_note_from_template` pipeline — meaning `<%*` wizard blocks,
 * `tp.system.prompt`, `tp.file.rename`, etc. all work natively. Returns
 * the resulting TFile (which may have been renamed by the template) or
 * null if Templater is unavailable or the call produced no file.
 *
 * The caller is responsible for (a) ensuring the file is inside the twin
 * folder after Templater runs and (b) merging managed frontmatter into
 * whatever content the template emitted.
 */
export async function createTwinViaTemplater(
  app: App,
  template: TFile,
  folder: string,
  basename: string,
): Promise<TFile | null> {
  const templaterPlugin = getTemplaterPlugin(app);
  if (!templaterPlugin) return null;

  const result = await templaterPlugin.templater.create_new_note_from_template(
    template,
    folder,
    basename,
    false,
  );
  return result ?? null;
}
