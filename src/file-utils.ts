import { TFile } from 'obsidian';
import { EXTENSION_TYPE_MAP, PREVIEW_SUFFIX } from './constants';
import { AttachmentBasesSettings } from './settings';

export function classifyType(extension: string): string {
  return EXTENSION_TYPE_MAP[extension.toLowerCase()] ?? 'other';
}

export function getTwinPath(attachmentPath: string, settings: AttachmentBasesSettings): string {
  if (!settings.twinFolder) {
    return attachmentPath + '.md';
  }

  const relativePath = stripWatchedFolderPrefix(attachmentPath, settings.watchedFolders);
  return settings.twinFolder + '/' + relativePath + '.md';
}

export function getAttachmentPathFromTwin(
  twinPath: string,
  settings: AttachmentBasesSettings,
): string | null {
  if (settings.twinFolder) {
    const prefix = settings.twinFolder + '/';
    if (!twinPath.startsWith(prefix)) return null;
    const relativePath = twinPath.slice(prefix.length);
    if (!relativePath.endsWith('.md')) return null;
    const attachmentRelative = relativePath.slice(0, -3); // remove .md
    const watchedFolder = findWatchedFolder(twinPath, settings, attachmentRelative);
    return watchedFolder + attachmentRelative;
  }

  // No twinFolder — twin sits next to attachment
  if (!twinPath.endsWith('.md')) return null;
  return twinPath.slice(0, -3);
}

export function isTwinFile(path: string, settings: AttachmentBasesSettings): boolean {
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

export function isAttachment(file: any): file is TFile {
  return file instanceof TFile && file.extension !== 'md';
}

export function isExcluded(path: string, settings: AttachmentBasesSettings): boolean {
  return settings.excludePatterns.some((pattern) => path.startsWith(pattern));
}

export function isInWatchedFolder(path: string, settings: AttachmentBasesSettings): boolean {
  if (settings.watchedFolders.length === 0) return true;
  return settings.watchedFolders.some((folder) => path.startsWith(folder));
}

export function isPreviewThumbnail(path: string): boolean {
  return path.endsWith(PREVIEW_SUFFIX);
}

export function shouldProcess(file: any, settings: AttachmentBasesSettings): boolean {
  if (!isAttachment(file)) return false;
  if (isTwinFile(file.path, settings)) return false;
  if (isPreviewThumbnail(file.path)) return false;
  if (!isInWatchedFolder(file.path, settings)) return false;
  if (isExcluded(file.path, settings)) return false;
  return true;
}

/**
 * Path-based variant of shouldProcess. Used when checking a previous path
 * (e.g. the `oldPath` of a rename) where we don't have a TFile to inspect.
 */
export function shouldProcessPath(path: string, settings: AttachmentBasesSettings): boolean {
  const lastDot = path.lastIndexOf('.');
  const ext = lastDot === -1 ? '' : path.slice(lastDot + 1).toLowerCase();
  if (ext === 'md' || ext === '') return false;
  if (isTwinFile(path, settings)) return false;
  if (isPreviewThumbnail(path)) return false;
  if (!isInWatchedFolder(path, settings)) return false;
  if (isExcluded(path, settings)) return false;
  return true;
}

function stripWatchedFolderPrefix(path: string, watchedFolders: string[]): string {
  for (const folder of watchedFolders) {
    if (path.startsWith(folder)) {
      return path.slice(folder.length);
    }
  }
  return path;
}

function findWatchedFolder(
  _twinPath: string,
  settings: AttachmentBasesSettings,
  _attachmentRelative: string,
): string {
  // Return the first watched folder as the default prefix for reverse mapping
  if (settings.watchedFolders.length > 0) {
    return settings.watchedFolders[0];
  }
  return '';
}
