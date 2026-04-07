export class TFile {
  path: string;
  name: string;
  extension: string;
  basename: string;
  stat: { ctime: number; mtime: number; size: number };
  vault: any;
  parent: TFolder | null;

  constructor(path: string, stat?: { ctime: number; mtime: number; size: number }) {
    this.path = path;
    this.name = path.split('/').pop() || '';
    const parts = this.name.split('.');
    this.extension = parts.length > 1 ? parts.pop()! : '';
    this.basename = parts.join('.');
    this.stat = stat || { ctime: Date.now(), mtime: Date.now(), size: 1024 };
    this.parent = null;
    this.vault = null;
  }
}

export class TFolder {
  path: string;
  name: string;
  children: (TFile | TFolder)[];
  parent: TFolder | null;
  vault: any;

  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
    this.children = [];
    this.parent = null;
    this.vault = null;
  }
}

export type TAbstractFile = TFile | TFolder;

export class Notice {
  constructor(_message: string, _timeout?: number) {}
}

export class Plugin {
  app: any;
  manifest: any;
  async loadData(): Promise<any> { return null; }
  async saveData(_data: any): Promise<void> {}
  addCommand(_command: any): any { return {}; }
  addSettingTab(_tab: any): void {}
  registerEvent(_event: any): void {}
}

export class PluginSettingTab {
  app: any;
  plugin: any;
  containerEl: any;
  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = { empty: () => {} };
  }
  display(): void {}
  hide(): void {}
}

export class Setting {
  constructor(_containerEl: any) {}
  setName(_name: string): this { return this; }
  setDesc(_desc: string): this { return this; }
  addText(_cb: (text: any) => any): this { return this; }
  addToggle(_cb: (toggle: any) => any): this { return this; }
  addTextArea(_cb: (area: any) => any): this { return this; }
}

export async function loadPdfJs(): Promise<any> {
  return {};
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}
