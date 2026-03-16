import { App, Notice, TFile, normalizePath } from "obsidian";
import { getAttachmentType, isAttachment, isCompanionNote } from "./attachment-utils";
import type { AttachmentsManagerSettings } from "./settings";

interface AttachmentMetadata {
  attachment: string;
  type: string;
  extension: string;
  size: number;
  created: string;
  modified: string;
}

export class CompanionManager {
  constructor(private app: App, private settings: AttachmentsManagerSettings) {}

  async syncAll(): Promise<void> {
    const files = this.app.vault.getFiles();
    for (const file of files) {
      if (isAttachment(file) && !this.isExcluded(file.path) && this.isInWatchedFolder(file.path)) {
        await this.createCompanion(file);
      }
    }
  }

  async createCompanion(file: TFile): Promise<void> {
    if (this.isExcluded(file.path)) return;
    if (!this.isInWatchedFolder(file.path)) return;
    const companionPath = this.getCompanionPath(file);
    if (this.app.vault.getAbstractFileByPath(companionPath)) return;

    // Ensure companion folder exists if configured
    const folder = this.settings.companionFolder;
    if (folder) {
      try {
        await this.app.vault.createFolder(folder);
      } catch {
        // folder already exists, continue
      }
    }

    const content = await this.buildContent(file);
    await this.app.vault.create(companionPath, content);
  }

  async deleteCompanion(attachmentPath: string): Promise<void> {
    const companionPath = this.getCompanionPathFromRaw(attachmentPath);
    const companion = this.app.vault.getAbstractFileByPath(companionPath);
    if (companion instanceof TFile) {
      await this.app.vault.delete(companion);
    }
  }

  async renameCompanion(oldPath: string, newFile: TFile): Promise<void> {
    const oldCompanionPath = this.getCompanionPathFromRaw(oldPath);
    const oldCompanion = this.app.vault.getAbstractFileByPath(oldCompanionPath);
    if (oldCompanion instanceof TFile) {
      const newCompanionPath = this.getCompanionPath(newFile);
      await this.app.vault.rename(oldCompanion, newCompanionPath);
    }
    await this.updateCompanion(newFile);
  }

  private async updateCompanion(file: TFile): Promise<void> {
    const companionPath = this.getCompanionPath(file);
    const companion = this.app.vault.getAbstractFileByPath(companionPath);
    if (!(companion instanceof TFile)) return;
    const content = await this.buildContent(file);
    await this.app.vault.modify(companion, content);
  }

  async deleteAllCompanions(): Promise<void> {
    try {
      const files = this.app.vault.getFiles();
      let deleted = 0;

      for (const file of files) {
        if (!isCompanionNote(file)) continue;
        await this.app.vault.delete(file);
        deleted++;
      }

      new Notice(`Attachment Bases: deleted ${deleted} companion note${deleted === 1 ? "" : "s"}.`);
    } catch (e) {
      console.error("Attachment Bases: deleteAllCompanions failed", e);
      new Notice("Attachment Bases: error while deleting companions — check the console for details.");
    }
  }

  async moveAllCompanionsToFolder(): Promise<void> {
    const folder = this.settings.companionFolder;
    if (!folder) {
      new Notice("Attachment Bases: set a companion folder in settings before moving companions.");
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
        if (!isCompanionNote(file)) continue;
        const attachmentName = file.name.slice(0, -3); // e.g. "photo.jpg"
        const targetPath = normalizePath(`${folder}/${attachmentName}.md`);
        if (file.path === targetPath) continue;
        if (this.app.vault.getAbstractFileByPath(targetPath)) continue;
        await this.app.vault.rename(file, targetPath);
        moved++;
      }

      new Notice(`Attachment Bases: moved ${moved} companion note${moved === 1 ? "" : "s"} to ${folder}.`);
    } catch (e) {
      console.error("Attachment Bases: moveAllCompanionsToFolder failed", e);
      new Notice("Attachment Bases: error while moving companions — check the console for details.");
    }
  }

  private getCompanionPath(file: TFile): string {
    return this.getCompanionPathFromRaw(file.path);
  }

  private getCompanionPathFromRaw(attachmentPath: string): string {
    const folder = this.settings.companionFolder;
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
      `attachment: "[[${meta.attachment}]]"`,
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
