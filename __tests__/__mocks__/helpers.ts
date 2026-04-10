import { TFile, TFolder } from 'obsidian';
import { AttachmentsAutopilotSettings, DEFAULT_SETTINGS } from '../../src/settings';

export function makeTFile(
  path: string,
  opts?: { size?: number; ctime?: number; mtime?: number }
): TFile {
  return new TFile(path, {
    ctime: opts?.ctime ?? 1712188800000,  // 2024-04-04
    mtime: opts?.mtime ?? 1712188800000,
    size: opts?.size ?? 1024,
  });
}

export function makeTFolder(path: string): TFolder {
  return new TFolder(path);
}

export function makeSettings(overrides?: Partial<AttachmentsAutopilotSettings>): AttachmentsAutopilotSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

/**
 * In-memory fake vault for testing TwinManager.
 */
export class FakeVault {
  private files = new Map<string, { file: TFile; content: string }>();
  private folders = new Set<string>();

  async create(path: string, content: string): Promise<TFile> {
    const file = makeTFile(path);
    this.files.set(path, { file, content });
    return file;
  }

  async delete(file: TFile): Promise<void> {
    this.files.delete(file.path);
  }

  async rename(file: TFile, newPath: string): Promise<void> {
    const entry = this.files.get(file.path);
    if (!entry) throw new Error(`File not found: ${file.path}`);
    this.files.delete(file.path);
    const newFile = makeTFile(newPath, file.stat);
    this.files.set(newPath, { file: newFile, content: entry.content });
  }

  async read(file: TFile): Promise<string> {
    const entry = this.files.get(file.path);
    if (!entry) throw new Error(`File not found: ${file.path}`);
    return entry.content;
  }

  async modify(file: TFile, content: string): Promise<void> {
    const entry = this.files.get(file.path);
    if (!entry) throw new Error(`File not found: ${file.path}`);
    entry.content = content;
  }

  getAbstractFileByPath(path: string): TFile | TFolder | null {
    const entry = this.files.get(path);
    if (entry) return entry.file;
    if (this.folders.has(path)) return new TFolder(path);
    return null;
  }

  getFiles(): TFile[] {
    return Array.from(this.files.values()).map((e) => e.file);
  }

  async createFolder(path: string): Promise<void> {
    this.folders.add(path);
  }

  // Test helper: seed a file that already exists
  seed(path: string, content: string, opts?: { size?: number; ctime?: number; mtime?: number }): TFile {
    const file = makeTFile(path, opts);
    this.files.set(path, { file, content });
    return file;
  }

  // Test helper: check if file exists
  has(path: string): boolean {
    return this.files.has(path);
  }

  // Test helper: get content
  getContent(path: string): string | undefined {
    return this.files.get(path)?.content;
  }
}
