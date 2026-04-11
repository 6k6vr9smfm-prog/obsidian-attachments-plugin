import { TAbstractFile, TFile } from 'obsidian';
import { EXTENSION_TYPE_MAP, PREVIEW_SUFFIX } from './constants';
import { AttachmentsAutopilotSettings } from './settings';

/**
 * Resolved interpretation of Obsidian's "Default location for new attachments"
 * setting. The plugin watches this folder (and only this folder, unless the
 * mode is `all`).
 */
export type WatchedScope =
  | { mode: 'absolute'; prefix: string } // e.g. "attachments/"
  | { mode: 'all' }; // vault root, relative paths, or unset

/**
 * Interprets the raw value of Obsidian's `attachmentFolderPath` config.
 *
 *   - absolute path ("attachments", "assets/files") → scope to that folder
 *   - "/", "./", "./subfolder", "", undefined → scope the entire vault
 *
 * Relative paths are treated as "watch everywhere" because they resolve
 * against the active note's location, which we can't know statically. Users
 * who need a stricter scope can rely on `excludePatterns`.
 */
export function resolveWatchedScope(raw: string | undefined | null): WatchedScope {
  const value = (raw ?? '').trim();
  if (value === '' || value === '/' || value.startsWith('./')) {
    return { mode: 'all' };
  }
  const prefix = value.endsWith('/') ? value : value + '/';
  return { mode: 'absolute', prefix };
}

export function classifyType(extension: string): string {
  return EXTENSION_TYPE_MAP[extension.toLowerCase()] ?? 'other';
}

export function getTwinPath(
  attachmentPath: string,
  settings: AttachmentsAutopilotSettings,
  scope: WatchedScope,
): string {
  if (!settings.twinFolder) {
    return attachmentPath + '.md';
  }
  const relativePath = stripScopePrefix(attachmentPath, scope);
  return settings.twinFolder + '/' + relativePath + '.md';
}

export function getAttachmentPathFromTwin(
  twinPath: string,
  settings: AttachmentsAutopilotSettings,
  scope: WatchedScope,
): string | null {
  if (settings.twinFolder) {
    const prefix = settings.twinFolder + '/';
    if (!twinPath.startsWith(prefix)) return null;
    const relativePath = twinPath.slice(prefix.length);
    if (!relativePath.endsWith('.md')) return null;
    const attachmentRelative = relativePath.slice(0, -3); // remove .md
    return scopePrefixString(scope) + attachmentRelative;
  }

  // No twinFolder — twin sits next to attachment
  if (!twinPath.endsWith('.md')) return null;
  return twinPath.slice(0, -3);
}

export function isTwinFile(path: string, settings: AttachmentsAutopilotSettings): boolean {
  if (settings.twinFolder) {
    if (!path.startsWith(settings.twinFolder + '/')) return false;
    if (!path.endsWith('.md')) return false;
    return true;
  }
  // No twinFolder — heuristic: path ends with known-attachment-extension + .md
  if (!path.endsWith('.md')) return false;
  const withoutMd = path.slice(0, -3);
  const lastDot = withoutMd.lastIndexOf('.');
  if (lastDot === -1) return false;
  const ext = withoutMd.slice(lastDot + 1).toLowerCase();
  return ext in EXTENSION_TYPE_MAP;
}

export function isAttachment(file: TAbstractFile): file is TFile {
  return file instanceof TFile && file.extension !== 'md';
}

export function isExcluded(path: string, settings: AttachmentsAutopilotSettings): boolean {
  return settings.excludePatterns.some((pattern) => path.startsWith(pattern));
}

export function isInScope(path: string, scope: WatchedScope): boolean {
  if (scope.mode === 'all') return true;
  return path.startsWith(scope.prefix);
}

export function isPreviewThumbnail(path: string): boolean {
  return path.endsWith(PREVIEW_SUFFIX);
}

export function shouldProcess(
  file: TAbstractFile,
  settings: AttachmentsAutopilotSettings,
  scope: WatchedScope,
): boolean {
  if (!isAttachment(file)) return false;
  if (isTwinFile(file.path, settings)) return false;
  if (isPreviewThumbnail(file.path)) return false;
  if (!isInScope(file.path, scope)) return false;
  if (isExcluded(file.path, settings)) return false;
  return true;
}

/**
 * Path-based variant of shouldProcess. Used when checking a previous path
 * (e.g. the `oldPath` of a rename) where we don't have a TFile to inspect.
 */
export function shouldProcessPath(
  path: string,
  settings: AttachmentsAutopilotSettings,
  scope: WatchedScope,
): boolean {
  const lastDot = path.lastIndexOf('.');
  const ext = lastDot === -1 ? '' : path.slice(lastDot + 1).toLowerCase();
  if (ext === 'md' || ext === '') return false;
  if (isTwinFile(path, settings)) return false;
  if (isPreviewThumbnail(path)) return false;
  if (!isInScope(path, scope)) return false;
  if (isExcluded(path, settings)) return false;
  return true;
}

export function stripScopePrefix(path: string, scope: WatchedScope): string {
  if (scope.mode === 'all') return path;
  if (path.startsWith(scope.prefix)) return path.slice(scope.prefix.length);
  return path;
}

function scopePrefixString(scope: WatchedScope): string {
  return scope.mode === 'absolute' ? scope.prefix : '';
}
