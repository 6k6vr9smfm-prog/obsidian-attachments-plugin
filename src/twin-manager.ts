import { App, Notice, TFile, normalizePath } from "obsidian";
import { getAttachmentType, isAttachment, isTwinNote } from "./attachment-utils";
import type { AttachmentsManagerSettings } from "./settings";

interface AttachmentMetadata {
  attachment: string;
  type: string;
  extension: string;
  size: number;
  created: string;
  modified: string;
}

export class TwinManager {
  constructor(private app: App, private settings: AttachmentsManagerSettings) {}

  async syncAll(): Promise<void> {
    const files = this.app.vault.getFiles();
    for (const file of files) {
      if (isAttachment(file) && !this.isExcluded(file.path) && this.isInWatchedFolder(file.path)) {
        await this.createTwin(file);
      }
    }
  }

  async createTwin(file: TFile): Promise<void> {
    if (this.isExcluded(file.path)) return;
    if (!this.isInWatchedFolder(file.path)) return;
    const twinPath = this.getTwinPath(file);
    if (this.app.vault.getAbstractFileByPath(twinPath)) return;

    // Ensure twin folder exists if configured
    const folder = this.settings.twinFolder;
    if (folder) {
      try {
        await this.app.vault.createFolder(folder);
      } catch {
        // folder already exists, continue
      }
    }

    const content = await this.buildContent(file);
    // Re-check after awaits: a concurrent createTwin call may have already created this file
    if (this.app.vault.getAbstractFileByPath(twinPath)) return;
    await this.app.vault.create(twinPath, content);
  }

  async deleteTwin(attachmentPath: string): Promise<void> {
    const twinPath = this.getTwinPathFromRaw(attachmentPath);
    const twin = this.app.vault.getAbstractFileByPath(twinPath);
    if (twin instanceof TFile) {
      await this.app.vault.delete(twin);
    }
  }

  async renameTwin(oldPath: string, newFile: TFile): Promise<void> {
    const oldTwinPath = this.getTwinPathFromRaw(oldPath);
    const oldTwin = this.app.vault.getAbstractFileByPath(oldTwinPath);
    if (oldTwin instanceof TFile) {
      const newTwinPath = this.getTwinPath(newFile);
      await this.app.vault.rename(oldTwin, newTwinPath);
    }
    await this.updateTwin(newFile);
  }

  private async updateTwin(file: TFile): Promise<void> {
    const twinPath = this.getTwinPath(file);
    const twin = this.app.vault.getAbstractFileByPath(twinPath);
    if (!(twin instanceof TFile)) return;
    const content = await this.buildContent(file);
    await this.app.vault.modify(twin, content);
  }

  async resyncTwin(file: TFile): Promise<void> {
    if (!isAttachment(file)) return;
    if (this.isExcluded(file.path)) return;
    if (!this.isInWatchedFolder(file.path)) return;
    const twinPath = this.getTwinPath(file);
    const twin = this.app.vault.getAbstractFileByPath(twinPath);
    const content = await this.buildContent(file);
    if (twin instanceof TFile) {
      await this.app.vault.modify(twin, content);
    } else {
      await this.createTwin(file);
    }
  }

  async deleteAllTwins(): Promise<void> {
    try {
      const files = this.app.vault.getFiles();
      let deleted = 0;

      for (const file of files) {
        if (!isTwinNote(file)) continue;
        await this.app.vault.delete(file);
        deleted++;
      }

      new Notice(`Attachment Bases: deleted ${deleted} twin file${deleted === 1 ? "" : "s"}.`);
    } catch (e) {
      console.error("Attachment Bases: deleteAllTwins failed", e);
      new Notice("Attachment Bases: error while deleting twin files — check the console for details.");
    }
  }

  async moveAllTwinsToFolder(): Promise<void> {
    const folder = this.settings.twinFolder;
    if (!folder) {
      new Notice("Attachment Bases: set a twins folder in settings before moving twin files.");
      return;
    }

    try {
      try {
        await this.app.vault.createFolder(folder);
      } catch {
        // folder already exists, continue
      }

      const files = this.app.vault.getFiles();
      let moved = 0;

      for (const file of files) {
        if (!isTwinNote(file)) continue;
        const attachmentName = file.name.slice(0, -3); // e.g. "photo.jpg"
        const targetPath = normalizePath(`${folder}/${attachmentName}.md`);
        if (file.path === targetPath) continue;
        if (this.app.vault.getAbstractFileByPath(targetPath)) continue;
        await this.app.vault.rename(file, targetPath);
        moved++;
      }

      new Notice(`Attachment Bases: moved ${moved} twin file${moved === 1 ? "" : "s"} to ${folder}.`);
    } catch (e) {
      console.error("Attachment Bases: moveAllTwinsToFolder failed", e);
      new Notice("Attachment Bases: error while moving twin files — check the console for details.");
    }
  }

  private getTwinPath(file: TFile): string {
    return this.getTwinPathFromRaw(file.path);
  }

  private getTwinPathFromRaw(attachmentPath: string): string {
    const folder = this.settings.twinFolder;
    if (!folder) {
      return attachmentPath + ".md";
    }
    const fileName = attachmentPath.split("/").pop() ?? attachmentPath;
    return normalizePath(`${folder}/${fileName}.md`);
  }

  private isExcluded(filePath: string): boolean {
    return this.settings.excludePatterns.some((pattern) =>
      filePath.startsWith(pattern)
    );
  }

  private isInWatchedFolder(filePath: string): boolean {
    if (this.settings.watchedFolders.length === 0) return true;
    return this.settings.watchedFolders.some((folder) =>
      filePath.startsWith(folder)
    );
  }

  private async buildContent(file: TFile): Promise<string> {
    const stat = await this.app.vault.adapter.stat(file.path);
    const meta: AttachmentMetadata = {
      attachment: file.name,
      type: getAttachmentType(file.extension),
      extension: file.extension.toLowerCase(),
      size: stat?.size ?? 0,
      created: stat?.ctime ? new Date(stat.ctime).toISOString().split("T")[0] : "",
      modified: stat?.mtime ? new Date(stat.mtime).toISOString().split("T")[0] : "",
    };

    return [
      "---",
      `attachm3nt: "[[${meta.attachment}]]"`,
      `type: ${meta.type}`,
      `extension: ${meta.extension}`,
      `size: ${meta.size}`,
      `created: ${meta.created}`,
      `modified: ${meta.modified}`,
      "---",
      "",
      `![[${meta.attachment}]]`,
      "",
    ].join("\n");
  }
}
