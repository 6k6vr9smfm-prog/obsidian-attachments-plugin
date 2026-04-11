import { TFile } from 'obsidian';
import { FakeVault, makeTFile, makeSettings } from './__mocks__/helpers';
import { TwinManager } from '../src/twin-manager';
import { importFiles, ImportAdapter, ImportedFile } from '../src/import-command';

function makeImportedFile(name: string, bytes: number[] = [1, 2, 3]): ImportedFile {
  return {
    name,
    arrayBuffer: async () => new Uint8Array(bytes).buffer,
  };
}

function makeAdapter(vault: FakeVault, activeMarkdownPath?: string): ImportAdapter {
  return {
    async getAvailablePathForAttachment(filename: string): Promise<string> {
      let target = `attachments/${filename}`;
      let n = 1;
      while (vault.has(target)) {
        const dot = filename.lastIndexOf('.');
        target =
          dot === -1
            ? `attachments/${filename} ${n}`
            : `attachments/${filename.slice(0, dot)} ${n}${filename.slice(dot)}`;
        n++;
      }
      return target;
    },
    async createBinary(path: string, data: ArrayBuffer): Promise<TFile> {
      return vault.seed(path, '', { size: data.byteLength });
    },
    getActiveMarkdownPath: () => activeMarkdownPath,
  };
}

describe('importFiles', () => {
  let vault: FakeVault;
  let manager: TwinManager;

  beforeEach(() => {
    vault = new FakeVault();
    const settings = makeSettings({
      twinFolder: 'attachments/twins',
      watchedFolders: ['attachments/'],
      excludePatterns: [],
      generatePreviews: false,
    });
    manager = new TwinManager(vault as any, settings);
  });

  it('imports a single file, writes binary, and creates its twin', async () => {
    const adapter = makeAdapter(vault);
    const file = makeImportedFile('photo.png', [10, 20, 30, 40]);

    const result = await importFiles([file], adapter, manager);

    expect(result.imported).toHaveLength(1);
    expect(result.failed).toHaveLength(0);
    expect(result.imported[0].path).toBe('attachments/photo.png');

    expect(vault.has('attachments/photo.png')).toBe(true);
    expect(vault.has('attachments/twins/photo.png.md')).toBe(true);

    const twin = vault.getContent('attachments/twins/photo.png.md')!;
    expect(twin).toContain('attachment: "[[attachments/photo.png]]"');
    expect(twin).toContain('attachment-type: image');
    expect(twin).toContain('attachment-size: 4');
  });

  it('imports multiple files and creates a twin for each', async () => {
    const adapter = makeAdapter(vault);
    const files = [
      makeImportedFile('a.png'),
      makeImportedFile('b.pdf'),
      makeImportedFile('c.txt'),
    ];

    const result = await importFiles(files, adapter, manager);

    expect(result.imported).toHaveLength(3);
    expect(result.failed).toHaveLength(0);

    expect(vault.has('attachments/a.png')).toBe(true);
    expect(vault.has('attachments/b.pdf')).toBe(true);
    expect(vault.has('attachments/c.txt')).toBe(true);
    expect(vault.has('attachments/twins/a.png.md')).toBe(true);
    expect(vault.has('attachments/twins/b.pdf.md')).toBe(true);
    expect(vault.has('attachments/twins/c.txt.md')).toBe(true);
  });

  it('handles filename collisions by using the adapter-resolved unique path', async () => {
    vault.seed('attachments/photo.png', '');
    const adapter = makeAdapter(vault);
    const file = makeImportedFile('photo.png');

    const result = await importFiles([file], adapter, manager);

    expect(result.imported).toHaveLength(1);
    expect(result.imported[0].path).toBe('attachments/photo 1.png');
    expect(vault.has('attachments/photo.png')).toBe(true);
    expect(vault.has('attachments/photo 1.png')).toBe(true);
    expect(vault.has('attachments/twins/photo 1.png.md')).toBe(true);
  });

  it('continues after one file fails and reports it in failed[]', async () => {
    const adapter: ImportAdapter = {
      async getAvailablePathForAttachment(filename: string) {
        if (filename === 'broken.pdf') throw new Error('disk full');
        return `attachments/${filename}`;
      },
      async createBinary(path: string, data: ArrayBuffer) {
        return vault.seed(path, '', { size: data.byteLength });
      },
      getActiveMarkdownPath: () => undefined,
    };

    const files = [
      makeImportedFile('ok.png'),
      makeImportedFile('broken.pdf'),
      makeImportedFile('also-ok.jpg'),
    ];

    const result = await importFiles(files, adapter, manager);

    expect(result.imported).toHaveLength(2);
    expect(result.imported.map((f) => f.path).sort()).toEqual([
      'attachments/also-ok.jpg',
      'attachments/ok.png',
    ]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]).toEqual({ name: 'broken.pdf', error: 'disk full' });

    expect(vault.has('attachments/ok.png')).toBe(true);
    expect(vault.has('attachments/also-ok.jpg')).toBe(true);
    expect(vault.has('attachments/broken.pdf')).toBe(false);
    expect(vault.has('attachments/twins/ok.png.md')).toBe(true);
    expect(vault.has('attachments/twins/also-ok.jpg.md')).toBe(true);
  });

  it('returns empty result for empty input without touching the adapter', async () => {
    let called = false;
    const adapter: ImportAdapter = {
      async getAvailablePathForAttachment() {
        called = true;
        return '';
      },
      async createBinary() {
        called = true;
        return makeTFile('never');
      },
      getActiveMarkdownPath: () => undefined,
    };

    const result = await importFiles([], adapter, manager);

    expect(result.imported).toHaveLength(0);
    expect(result.failed).toHaveLength(0);
    expect(called).toBe(false);
  });

  it('passes the active markdown path to getAvailablePathForAttachment', async () => {
    let received: string | undefined = 'not-called';
    const adapter: ImportAdapter = {
      async getAvailablePathForAttachment(filename: string, sourcePath?: string) {
        received = sourcePath;
        return `attachments/${filename}`;
      },
      async createBinary(path: string, data: ArrayBuffer) {
        return vault.seed(path, '', { size: data.byteLength });
      },
      getActiveMarkdownPath: () => 'notes/journal/today.md',
    };

    await importFiles([makeImportedFile('a.png')], adapter, manager);

    expect(received).toBe('notes/journal/today.md');
  });
});
