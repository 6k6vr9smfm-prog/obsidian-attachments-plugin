import { TFile } from 'obsidian';
import { FakeVault, makeTFile, makeSettings } from './__mocks__/helpers';
import { TwinManager } from '../src/twin-manager';
import { AttachmentsAutopilotSettings } from '../src/settings';

describe('TwinManager', () => {
  let vault: FakeVault;
  let settings: AttachmentsAutopilotSettings;
  let manager: TwinManager;

  beforeEach(() => {
    vault = new FakeVault();
    settings = makeSettings({
      twinFolder: 'attachments/twins',
      excludePatterns: [],
      generatePreviews: false,
    });
    manager = new TwinManager(vault as any, settings);
  });

  describe('createTwin', () => {
    it('creates a twin file for an attachment', async () => {
      const file = makeTFile('attachments/photo.png', { size: 2048 });
      await manager.createTwin(file);

      expect(vault.has('attachments/twins/photo.png.md')).toBe(true);
      const content = vault.getContent('attachments/twins/photo.png.md')!;
      expect(content).toContain('attachment: "[[attachments/photo.png]]"');
      expect(content).toContain('attachment-type: image');
      expect(content).toContain('attachment-size: 2048');
    });

    it('creates twin with correct subdirectory structure', async () => {
      const file = makeTFile('attachments/docs/invoices/bill.pdf', { size: 4096 });
      await manager.createTwin(file);

      expect(vault.has('attachments/twins/docs/invoices/bill.pdf.md')).toBe(true);
    });

    it('preserves user-added keys when twin already exists', async () => {
      // Seed an existing twin with user-added metadata
      vault.seed('attachments/twins/photo.png.md', `---
attachment: "[[attachments/photo.png]]"
attachment-type: image
categories: attachments
attachment-size: 1024
created: 2024-04-04
modified: 2024-04-04
attachment-preview: ""
utility: invoice
company: "Acme Corp"
---

User notes about this photo.`);

      const file = makeTFile('attachments/photo.png', { size: 2048, mtime: 1712275200000 });
      await manager.createTwin(file);

      const content = vault.getContent('attachments/twins/photo.png.md')!;
      // Managed keys updated
      expect(content).toContain('attachment-size: 2048');
      // User keys preserved
      expect(content).toContain('utility: invoice');
      expect(content).toContain('company: "Acme Corp"');
      // User body preserved
      expect(content).toContain('User notes about this photo.');
    });

    it('creates parent directories if they do not exist', async () => {
      const file = makeTFile('attachments/deep/nested/photo.png');
      await manager.createTwin(file);

      expect(vault.has('attachments/twins/deep/nested/photo.png.md')).toBe(true);
    });
  });

  describe('deleteTwin', () => {
    it('deletes the twin file for an attachment', async () => {
      // Create twin first
      vault.seed('attachments/twins/photo.png.md', '---\nattachment-type: image\n---');
      const file = makeTFile('attachments/photo.png');

      await manager.deleteTwin(file);

      expect(vault.has('attachments/twins/photo.png.md')).toBe(false);
    });

    it('does nothing if twin does not exist', async () => {
      const file = makeTFile('attachments/photo.png');
      // Should not throw
      await expect(manager.deleteTwin(file)).resolves.toBeUndefined();
    });

    it('deletes twin by path string', async () => {
      vault.seed('attachments/twins/photo.png.md', '---\nattachment-type: image\n---');

      await manager.deleteTwinByPath('attachments/photo.png');

      expect(vault.has('attachments/twins/photo.png.md')).toBe(false);
    });

    it('deletes the orphan preview thumbnail when the attachment is removed (pdf)', async () => {
      settings = makeSettings({
        twinFolder: 'attachments/twins',
        generatePreviews: true,
        previewFolder: 'attachments/twins/previews',
      });
      manager = new TwinManager(vault as any, settings);

      vault.seed('attachments/twins/invoice.pdf.md', '---\nattachment-type: pdf\n---');
      vault.seed('attachments/twins/previews/invoice.pdf.preview.png', 'fake-png-bytes');

      await manager.deleteTwinByPath('attachments/invoice.pdf');

      expect(vault.has('attachments/twins/invoice.pdf.md')).toBe(false);
      expect(vault.has('attachments/twins/previews/invoice.pdf.preview.png')).toBe(false);
    });

    it('does not try to delete a preview for image attachments', async () => {
      settings = makeSettings({
        twinFolder: 'attachments/twins',
        generatePreviews: true,
        previewFolder: 'attachments/twins/previews',
      });
      manager = new TwinManager(vault as any, settings);

      vault.seed('attachments/twins/photo.png.md', '---\nattachment-type: image\n---');
      // Images use themselves as the preview — no separate thumbnail should exist
      // and the delete path must not crash when the preview lookup returns null.

      await expect(
        manager.deleteTwinByPath('attachments/photo.png'),
      ).resolves.toBeUndefined();
      expect(vault.has('attachments/twins/photo.png.md')).toBe(false);
    });

    it('does not touch previews when generatePreviews is disabled', async () => {
      // generatePreviews defaults to false in the top-level settings
      vault.seed('attachments/twins/invoice.pdf.md', '---\nattachment-type: pdf\n---');
      vault.seed('attachments/twins/previews/invoice.pdf.preview.png', 'fake');

      await manager.deleteTwinByPath('attachments/invoice.pdf');

      expect(vault.has('attachments/twins/invoice.pdf.md')).toBe(false);
      // Preview left alone because the user opted out of preview generation
      expect(vault.has('attachments/twins/previews/invoice.pdf.preview.png')).toBe(true);
    });
  });

  describe('renameTwin', () => {
    it('renames the twin file when attachment is renamed', async () => {
      vault.seed('attachments/twins/old-name.png.md', `---
attachment: "[[attachments/old-name.png]]"
attachment-type: image
categories: attachments
attachment-size: 1024
created: 2024-04-04
modified: 2024-04-04
attachment-preview: ""
---

![[attachments/old-name.png]]`);

      await manager.renameTwin('attachments/old-name.png', 'attachments/new-name.png');

      expect(vault.has('attachments/twins/old-name.png.md')).toBe(false);
      expect(vault.has('attachments/twins/new-name.png.md')).toBe(true);

      const content = vault.getContent('attachments/twins/new-name.png.md')!;
      expect(content).toContain('attachment: "[[attachments/new-name.png]]"');
      expect(content).toContain('![[attachments/new-name.png]]');
    });

    it('does nothing if old twin does not exist', async () => {
      await expect(
        manager.renameTwin('attachments/ghost.png', 'attachments/new.png'),
      ).resolves.toBeUndefined();
    });

    it('renames the preview file and updates attachment-preview when previews are enabled', async () => {
      settings.generatePreviews = true;
      settings.previewFolder = 'attachments/twins/previews';
      manager = new TwinManager(vault as any, settings);

      // Seed old preview file
      vault.seed('attachments/twins/previews/report.pdf.preview.png', 'binary-thumb');
      // Seed old twin with preview reference
      vault.seed('attachments/twins/report.pdf.md', `---
attachment: "[[attachments/report.pdf]]"
attachment-type: pdf
categories: attachments
attachment-size: 4096
created: 2024-04-04
modified: 2024-04-04
attachment-preview: "[[attachments/twins/previews/report.pdf.preview.png]]"
---

![[attachments/report.pdf]]`);

      await manager.renameTwin('attachments/report.pdf', 'attachments/informe.pdf');

      // Twin renamed
      expect(vault.has('attachments/twins/report.pdf.md')).toBe(false);
      expect(vault.has('attachments/twins/informe.pdf.md')).toBe(true);

      // Preview file renamed
      expect(vault.has('attachments/twins/previews/report.pdf.preview.png')).toBe(false);
      expect(vault.has('attachments/twins/previews/informe.pdf.preview.png')).toBe(true);

      // Twin content updated
      const content = vault.getContent('attachments/twins/informe.pdf.md')!;
      expect(content).toContain('attachment: "[[attachments/informe.pdf]]"');
      expect(content).toContain('attachment-preview: "[[attachments/twins/previews/informe.pdf.preview.png]]"');
      expect(content).not.toContain('report.pdf');
    });

    it('renames preview in subdirectory when attachment moves', async () => {
      settings.generatePreviews = true;
      settings.previewFolder = 'attachments/twins/previews';
      manager = new TwinManager(vault as any, settings);

      vault.seed('attachments/twins/previews/sub/doc.pdf.preview.png', 'binary-thumb');
      vault.seed('attachments/twins/sub/doc.pdf.md', `---
attachment: "[[attachments/sub/doc.pdf]]"
attachment-type: pdf
attachment-preview: "[[attachments/twins/previews/sub/doc.pdf.preview.png]]"
---

![[attachments/sub/doc.pdf]]`);

      await manager.renameTwin('attachments/sub/doc.pdf', 'attachments/other/doc.pdf');

      expect(vault.has('attachments/twins/previews/sub/doc.pdf.preview.png')).toBe(false);
      expect(vault.has('attachments/twins/previews/other/doc.pdf.preview.png')).toBe(true);
    });

    it('does not touch preview when attachment is an image (preview is self-referencing)', async () => {
      settings.generatePreviews = true;
      settings.previewFolder = 'attachments/twins/previews';
      manager = new TwinManager(vault as any, settings);

      vault.seed('attachments/twins/photo.png.md', `---
attachment: "[[attachments/photo.png]]"
attachment-type: image
attachment-preview: "[[attachments/photo.png]]"
---

![[attachments/photo.png]]`);

      await manager.renameTwin('attachments/photo.png', 'attachments/pic.png');

      // No preview file to rename for images
      const content = vault.getContent('attachments/twins/pic.png.md')!;
      expect(content).toContain('attachment-preview: "[[attachments/pic.png]]"');
    });

    it('handles move to different subdirectory', async () => {
      vault.seed('attachments/twins/photo.png.md', `---
attachment: "[[attachments/photo.png]]"
attachment-type: image
categories: attachments
attachment-size: 1024
created: 2024-04-04
modified: 2024-04-04
attachment-preview: ""
---

![[attachments/photo.png]]`);

      await manager.renameTwin('attachments/photo.png', 'attachments/archive/photo.png');

      expect(vault.has('attachments/twins/photo.png.md')).toBe(false);
      expect(vault.has('attachments/twins/archive/photo.png.md')).toBe(true);
    });
  });

  describe('syncAll', () => {
    it('creates twins for all unsynced attachments', async () => {
      vault.seed('attachments/a.png', 'binary-data', { size: 100 });
      vault.seed('attachments/b.pdf', 'binary-data', { size: 200 });

      const result = await manager.syncAll();

      expect(vault.has('attachments/twins/a.png.md')).toBe(true);
      expect(vault.has('attachments/twins/b.pdf.md')).toBe(true);
      expect(result.created).toBe(2);
    });

    it('updates (re-merges) files that already have twins', async () => {
      vault.seed('attachments/a.png', 'binary-data');
      vault.seed('attachments/twins/a.png.md', '---\nattachment-type: image\n---');

      const result = await manager.syncAll();

      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
    });

    it('propagates newly-added customFields to pre-existing twins on re-sync (T3.6)', async () => {
      // Twin was created before the user added any customFields
      vault.seed('attachments/a.png', 'binary-data');
      vault.seed(
        'attachments/twins/a.png.md',
        '---\nattachment: "[[attachments/a.png]]"\nattachment-type: image\ncategories: attachments\nattachment-size: 1024\ncreated: 2024-04-04\nmodified: 2024-04-04\nattachment-preview: ""\n---\n\n![[attachments/a.png]]\n',
      );

      // User now adds customFields and runs Sync all
      settings.customFields = 'project: inbox\nstatus: unreviewed';
      manager = new TwinManager(vault as any, settings);

      const result = await manager.syncAll();

      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
      const content = vault.getContent('attachments/twins/a.png.md')!;
      expect(content).toContain('project: inbox');
      expect(content).toContain('status: unreviewed');
      // Managed keys still present
      expect(content).toContain('attachment-type: image');
    });

    it('skips markdown files', async () => {
      vault.seed('attachments/note.md', '# Hello');

      const result = await manager.syncAll();

      expect(result.created).toBe(0);
    });

    it('skips files outside watched folders', async () => {
      vault.seed('other/photo.png', 'binary-data');

      const result = await manager.syncAll();

      expect(result.created).toBe(0);
    });

    it('skips files inside twinFolder', async () => {
      vault.seed('attachments/twins/existing.png.md', '---\n---');

      const result = await manager.syncAll();

      expect(result.created).toBe(0);
    });
  });

  describe('deleteAllTwins', () => {
    it('deletes all twin files', async () => {
      vault.seed('attachments/twins/a.png.md', '---\nattachment-type: image\n---');
      vault.seed('attachments/twins/b.pdf.md', '---\nattachment-type: pdf\n---');
      vault.seed('attachments/a.png', 'binary-data');

      const count = await manager.deleteAllTwins();

      expect(count).toBe(2);
      expect(vault.has('attachments/twins/a.png.md')).toBe(false);
      expect(vault.has('attachments/twins/b.pdf.md')).toBe(false);
      // Original attachment untouched
      expect(vault.has('attachments/a.png')).toBe(true);
    });

    it('returns 0 when no twins exist', async () => {
      const count = await manager.deleteAllTwins();
      expect(count).toBe(0);
    });

    it('also deletes orphan preview files', async () => {
      vault.seed('attachments/twins/a.png.md', '---\nattachment-type: image\n---');
      vault.seed('attachments/twins/previews/b.pdf.preview.png', 'binary-thumb');
      vault.seed('attachments/twins/previews/sub/c.pdf.preview.png', 'binary-thumb');
      vault.seed('attachments/a.png', 'binary-data');

      await manager.deleteAllTwins();

      expect(vault.has('attachments/twins/a.png.md')).toBe(false);
      expect(vault.has('attachments/twins/previews/b.pdf.preview.png')).toBe(false);
      expect(vault.has('attachments/twins/previews/sub/c.pdf.preview.png')).toBe(false);
      // Original attachment untouched
      expect(vault.has('attachments/a.png')).toBe(true);
    });
  });

  describe('moveTwinsToFolder', () => {
    it('moves all twins to a new folder', async () => {
      vault.seed('attachments/twins/a.png.md', '---\nattachment: "[[attachments/a.png]]"\nattachment-type: image\n---');
      vault.seed('attachments/twins/sub/b.pdf.md', '---\nattachment: "[[attachments/sub/b.pdf]]"\nattachment-type: pdf\n---');

      const count = await manager.moveTwinsToFolder('meta/twins');

      expect(count).toBe(2);
      expect(vault.has('attachments/twins/a.png.md')).toBe(false);
      expect(vault.has('attachments/twins/sub/b.pdf.md')).toBe(false);
      expect(vault.has('meta/twins/a.png.md')).toBe(true);
      expect(vault.has('meta/twins/sub/b.pdf.md')).toBe(true);
    });

    it('preserves subdirectory structure in new folder', async () => {
      vault.seed(
        'attachments/twins/deep/nested/file.png.md',
        '---\nattachment: "[[attachments/deep/nested/file.png]]"\nattachment-type: image\n---',
      );

      await manager.moveTwinsToFolder('new-twins');

      expect(vault.has('new-twins/deep/nested/file.png.md')).toBe(true);
    });

    it('returns 0 when no twins exist', async () => {
      const count = await manager.moveTwinsToFolder('new-twins');
      expect(count).toBe(0);
    });

    it('does nothing if target is the same as current twinFolder', async () => {
      vault.seed(
        'attachments/twins/a.png.md',
        '---\nattachment: "[[attachments/a.png]]"\nattachment-type: image\n---',
      );

      const count = await manager.moveTwinsToFolder('attachments/twins');

      expect(count).toBe(0);
      expect(vault.has('attachments/twins/a.png.md')).toBe(true);
    });

    it('still moves twins when settings.twinFolder was already updated to the new value', async () => {
      // T2.3 regression: the real flow is (1) user edits the settings UI, which
      // mutates settings.twinFolder in memory, then (2) runs the command. The
      // command must not rely on settings.twinFolder to know the *previous*
      // location — it must discover existing twins some other way (we use the
      // canonical `attachment:` frontmatter key).
      vault.seed(
        'attachments/twins/a.png.md',
        '---\nattachment: "[[attachments/a.png]]"\nattachment-type: image\n---',
      );
      vault.seed(
        'attachments/twins/sub/b.pdf.md',
        '---\nattachment: "[[attachments/sub/b.pdf]]"\nattachment-type: pdf\n---',
      );

      // Simulate the UI having already mutated the setting to the new value.
      settings.twinFolder = 'meta/twins';

      const count = await manager.moveTwinsToFolder('meta/twins');

      expect(count).toBe(2);
      expect(vault.has('attachments/twins/a.png.md')).toBe(false);
      expect(vault.has('attachments/twins/sub/b.pdf.md')).toBe(false);
      expect(vault.has('meta/twins/a.png.md')).toBe(true);
      expect(vault.has('meta/twins/sub/b.pdf.md')).toBe(true);
    });

    it('ignores .md files that are not twins (no attachment frontmatter)', async () => {
      vault.seed(
        'notes/daily.md',
        '---\ntags: [daily]\n---\n\nJust a normal note.',
      );
      vault.seed(
        'attachments/twins/a.png.md',
        '---\nattachment: "[[attachments/a.png]]"\nattachment-type: image\n---',
      );

      const count = await manager.moveTwinsToFolder('meta/twins');

      expect(count).toBe(1);
      expect(vault.has('notes/daily.md')).toBe(true);
      expect(vault.has('meta/twins/a.png.md')).toBe(true);
    });
  });

  describe('previews integration', () => {
    it('sets preview to attachment link for images when generatePreviews is on', async () => {
      settings.generatePreviews = true;
      manager = new TwinManager(vault as any, settings);

      const file = makeTFile('attachments/photo.png', { size: 2048 });
      await manager.createTwin(file);

      const content = vault.getContent('attachments/twins/photo.png.md')!;
      expect(content).toContain('attachment-preview: "[[attachments/photo.png]]"');
    });

    it('sets preview to empty when generatePreviews is off', async () => {
      settings.generatePreviews = false;
      manager = new TwinManager(vault as any, settings);

      const file = makeTFile('attachments/photo.png', { size: 2048 });
      await manager.createTwin(file);

      const content = vault.getContent('attachments/twins/photo.png.md')!;
      expect(content).toContain('attachment-preview: ""');
    });

    it('sets preview to thumbnail path for PDFs when generatePreviews is on', async () => {
      settings.generatePreviews = true;
      manager = new TwinManager(vault as any, settings);

      const file = makeTFile('attachments/doc.pdf', { size: 4096 });
      await manager.createTwin(file);

      const content = vault.getContent('attachments/twins/doc.pdf.md')!;
      expect(content).toContain('attachment-preview: "[[attachments/twins/previews/doc.pdf.preview.png]]"');
    });

    it('sets preview to placeholder thumbnail for unknown types when generatePreviews is on', async () => {
      settings.generatePreviews = true;
      manager = new TwinManager(vault as any, settings);

      const file = makeTFile('attachments/archive.zip', { size: 1024 });
      await manager.createTwin(file);

      const content = vault.getContent('attachments/twins/archive.zip.md')!;
      expect(content).toContain('attachment-preview: "[[attachments/twins/previews/archive.zip.preview.png]]"');
    });
  });

  describe('template integration', () => {
    it('uses the configured template file frontmatter and body', async () => {
      vault.seed(
        'templates/twin.md',
        '---\nstatus: unreviewed\nproject: inbox\n---\n## Notes\n',
      );
      settings.templaterTemplatePath = 'templates/twin.md';
      manager = new TwinManager(vault as any, settings);

      const file = makeTFile('attachments/photo.png', { size: 2048 });
      await manager.createTwin(file);

      const content = vault.getContent('attachments/twins/photo.png.md')!;
      expect(content).toContain('status: unreviewed');
      expect(content).toContain('project: inbox');
      expect(content).toContain('attachment: "[[attachments/photo.png]]"');
      expect(content).toContain('## Notes');
    });

    it('ignores customFields when template is set', async () => {
      vault.seed('templates/twin.md', '---\nstatus: open\n---\nbody\n');
      settings.templaterTemplatePath = 'templates/twin.md';
      settings.customFields = 'ignored: true';
      manager = new TwinManager(vault as any, settings);

      const file = makeTFile('attachments/photo.png', { size: 2048 });
      await manager.createTwin(file);

      const content = vault.getContent('attachments/twins/photo.png.md')!;
      expect(content).not.toContain('ignored: true');
      expect(content).toContain('status: open');
    });

    it('falls back to customFields when template path is set but file is missing', async () => {
      settings.templaterTemplatePath = 'templates/missing.md';
      settings.customFields = 'fallback: used';
      manager = new TwinManager(vault as any, settings);

      const file = makeTFile('attachments/photo.png', { size: 2048 });
      await manager.createTwin(file);

      const content = vault.getContent('attachments/twins/photo.png.md')!;
      expect(content).toContain('fallback: used');
    });
  });

  describe('templater callback', () => {
    it('invokes templaterRunner after twin creation when set', async () => {
      const runner = jest.fn();
      manager.setTemplaterRunner(runner);

      const file = makeTFile('attachments/photo.png', { size: 2048 });
      await manager.createTwin(file);

      expect(runner).toHaveBeenCalledTimes(1);
      const calledWith = runner.mock.calls[0][0];
      expect(calledWith).toBeInstanceOf(TFile);
      expect(calledWith.path).toBe('attachments/twins/photo.png.md');
    });

    it('does not invoke templaterRunner when not set', async () => {
      const file = makeTFile('attachments/photo.png', { size: 2048 });
      await manager.createTwin(file);
      // No error, no call — runner is null by default
    });

    it('does not invoke templaterRunner when twin already exists (re-sync)', async () => {
      // Re-running Templater on pre-existing twins would re-trigger any
      // interactive prompts in the template every startup — infinite prompt
      // loop on iOS reload. Templater should only run on first creation.
      vault.seed('attachments/twins/photo.png.md', '---\nattachment-type: image\n---');
      const runner = jest.fn();
      manager.setTemplaterRunner(runner);

      const file = makeTFile('attachments/photo.png', { size: 2048 });
      await manager.createTwin(file);

      expect(runner).not.toHaveBeenCalled();
    });

    it('does not invoke templaterRunner when skipTemplater is set, even on new twins', async () => {
      // Bulk-import flow calls createTwin with { skipTemplater: true } when
      // the user has declined to fill Templater prompts for the whole batch.
      const runner = jest.fn();
      manager.setTemplaterRunner(runner);

      const file = makeTFile('attachments/photo.png', { size: 2048 });
      await manager.createTwin(file, { skipTemplater: true });

      expect(runner).not.toHaveBeenCalled();
      // Twin should still be created as normal.
      expect(vault.has('attachments/twins/photo.png.md')).toBe(true);
    });
  });

  describe('templater twin creator (Templater-first flow)', () => {
    it('uses creator to build the twin and injects managed frontmatter', async () => {
      // Creator simulates Templater emitting a twin with extra fields but
      // no managed keys. The manager must merge managed keys into it.
      const creator = jest.fn(async (attachment: TFile, folder: string, basename: string) => {
        const path = `${folder}/${basename}.md`;
        return await vault.create(
          path,
          '---\namount: 42\nprovider: ACME\n---\n',
        );
      });
      manager.setTemplaterTwinCreator(creator);

      const file = makeTFile('attachments/photo.png', { size: 2048 });
      await manager.createTwin(file);

      expect(creator).toHaveBeenCalledTimes(1);
      const content = vault.getContent('attachments/twins/photo.png.md')!;
      expect(content).toContain('attachment: "[[attachments/photo.png]]"');
      expect(content).toContain('attachment-type: image');
      expect(content).toContain('attachment-size: 2048');
      expect(content).toContain('amount: 42');
      expect(content).toContain('provider: ACME');
    });

    it('moves twin back into twin folder when the creator renames it out', async () => {
      // Simulates Templater's tp.file.rename moving the twin to vault root.
      const creator = jest.fn(async () => {
        return await vault.create('Electricity (March 2026).md', '---\namount: 1.86\n---\n');
      });
      manager.setTemplaterTwinCreator(creator);

      const file = makeTFile('attachments/bill.pdf', { size: 4096 });
      await manager.createTwin(file);

      expect(vault.has('Electricity (March 2026).md')).toBe(false);
      expect(vault.has('attachments/twins/Electricity (March 2026).md')).toBe(true);
      const content = vault.getContent('attachments/twins/Electricity (March 2026).md')!;
      expect(content).toContain('attachment: "[[attachments/bill.pdf]]"');
      expect(content).toContain('amount: 1.86');
    });

    it('preserves a custom basename the creator assigned inside the twin folder', async () => {
      // Templater renamed the file in-place; we should keep that name.
      const creator = jest.fn(async (_f, folder: string) => {
        return await vault.create(`${folder}/Gas March.md`, '---\namount: 10\n---\n');
      });
      manager.setTemplaterTwinCreator(creator);

      const file = makeTFile('attachments/bill.pdf', { size: 4096 });
      await manager.createTwin(file);

      expect(vault.has('attachments/twins/Gas March.md')).toBe(true);
      expect(vault.has('attachments/twins/bill.pdf.md')).toBe(false);
    });

    it('falls back to the static path when the creator returns null', async () => {
      const creator = jest.fn(async () => null);
      manager.setTemplaterTwinCreator(creator);

      const file = makeTFile('attachments/photo.png', { size: 2048 });
      await manager.createTwin(file);

      expect(creator).toHaveBeenCalled();
      expect(vault.has('attachments/twins/photo.png.md')).toBe(true);
    });

    it('does not invoke creator when skipTemplater is set', async () => {
      const creator = jest.fn();
      manager.setTemplaterTwinCreator(creator);

      const file = makeTFile('attachments/photo.png', { size: 2048 });
      await manager.createTwin(file, { skipTemplater: true });

      expect(creator).not.toHaveBeenCalled();
      expect(vault.has('attachments/twins/photo.png.md')).toBe(true);
    });

    it('does not invoke creator when the twin already exists (re-sync path)', async () => {
      vault.seed(
        'attachments/twins/photo.png.md',
        '---\nattachment: "[[attachments/photo.png]]"\nattachment-type: image\n---',
      );
      const creator = jest.fn();
      manager.setTemplaterTwinCreator(creator);

      const file = makeTFile('attachments/photo.png', { size: 2048 });
      await manager.createTwin(file);

      expect(creator).not.toHaveBeenCalled();
    });

    it('recovers when creator throws but leaves a partial file behind', async () => {
      // Decision B: partial state is acceptable — continue with managed
      // frontmatter injection so the twin is at least linked to its attachment.
      const creator = jest.fn(async (_f, folder: string, basename: string) => {
        await vault.create(`${folder}/${basename}.md`, '---\namount: <% amount %>\n---\n');
        throw new Error('user cancelled prompt');
      });
      manager.setTemplaterTwinCreator(creator);

      const file = makeTFile('attachments/photo.png', { size: 2048 });
      await manager.createTwin(file);

      expect(vault.has('attachments/twins/photo.png.md')).toBe(true);
      const content = vault.getContent('attachments/twins/photo.png.md')!;
      expect(content).toContain('attachment: "[[attachments/photo.png]]"');
      // Unresolved Templater markers remain in place — user can fix them.
      // (mergeFrontmatter quotes values containing spaces, so match loosely.)
      expect(content).toMatch(/amount:\s*"?<% amount %>"?/);
    });
  });

  describe('twin index', () => {
    it('buildIndex populates the reverse map from existing twins', async () => {
      vault.seed(
        'attachments/twins/Electricity (March 2026).md',
        '---\nattachment: "[[attachments/2026-03 electricity.pdf]]"\nattachment-type: pdf\n---',
      );
      vault.seed(
        'attachments/twins/photo.png.md',
        '---\nattachment: "[[attachments/photo.png]]"\nattachment-type: image\n---',
      );

      await manager.buildIndex();

      expect(manager.getTwinPathForAttachment('attachments/2026-03 electricity.pdf'))
        .toBe('attachments/twins/Electricity (March 2026).md');
      expect(manager.getTwinPathForAttachment('attachments/photo.png'))
        .toBe('attachments/twins/photo.png.md');
    });

    it('deleteTwin uses the index to find a renamed twin', async () => {
      vault.seed(
        'attachments/twins/Electricity (March 2026).md',
        '---\nattachment: "[[attachments/2026-03 electricity.pdf]]"\nattachment-type: pdf\n---',
      );
      await manager.buildIndex();

      const attachment = makeTFile('attachments/2026-03 electricity.pdf');
      await manager.deleteTwin(attachment);

      expect(vault.has('attachments/twins/Electricity (March 2026).md')).toBe(false);
    });

    it('renameTwin updates attachment link in a custom-named twin without renaming the file', async () => {
      vault.seed(
        'attachments/twins/Electricity (March 2026).md',
        '---\nattachment: "[[attachments/2026-03 electricity.pdf]]"\nattachment-type: pdf\n---\n',
      );
      await manager.buildIndex();

      await manager.renameTwin('attachments/2026-03 electricity.pdf', 'attachments/2026-04 electricity.pdf');

      // Custom-named twin stays put
      expect(vault.has('attachments/twins/Electricity (March 2026).md')).toBe(true);
      expect(vault.has('attachments/twins/2026-04 electricity.pdf.md')).toBe(false);

      const content = vault.getContent('attachments/twins/Electricity (March 2026).md')!;
      expect(content).toContain('attachment: "[[attachments/2026-04 electricity.pdf]]"');
    });

    it('renameTwin renames a canonically-named twin as before', async () => {
      vault.seed(
        'attachments/twins/photo.png.md',
        '---\nattachment: "[[attachments/photo.png]]"\nattachment-type: image\n---\n',
      );
      await manager.buildIndex();

      await manager.renameTwin('attachments/photo.png', 'attachments/snapshot.png');

      expect(vault.has('attachments/twins/photo.png.md')).toBe(false);
      expect(vault.has('attachments/twins/snapshot.png.md')).toBe(true);
    });

    it('onTwinRenamed updates the index when the user renames a twin file', async () => {
      vault.seed(
        'attachments/twins/photo.png.md',
        '---\nattachment: "[[attachments/photo.png]]"\nattachment-type: image\n---',
      );
      await manager.buildIndex();

      manager.onTwinRenamed('attachments/twins/photo.png.md', 'attachments/twins/renamed.md');

      expect(manager.getTwinPathForAttachment('attachments/photo.png'))
        .toBe('attachments/twins/renamed.md');
    });

    it('onTwinDeleted clears the index entry when the user deletes a twin', async () => {
      vault.seed(
        'attachments/twins/photo.png.md',
        '---\nattachment: "[[attachments/photo.png]]"\nattachment-type: image\n---',
      );
      await manager.buildIndex();

      manager.onTwinDeleted('attachments/twins/photo.png.md');

      expect(manager.getTwinPathForAttachment('attachments/photo.png')).toBeNull();
    });
  });

  describe('countMissingPreviews', () => {
    it('counts twins with empty attachment-preview', async () => {
      vault.seed('attachments/twins/a.png.md', '---\nattachment: "[[attachments/a.png]]"\nattachment-type: image\nattachment-preview: ""\n---');
      vault.seed('attachments/twins/b.png.md', '---\nattachment: "[[attachments/b.png]]"\nattachment-type: image\nattachment-preview: "[[attachments/b.png]]"\n---');
      vault.seed('attachments/twins/c.pdf.md', '---\nattachment: "[[attachments/c.pdf]]"\nattachment-type: pdf\nattachment-preview: ""\n---');

      const count = await manager.countMissingPreviews();

      expect(count).toBe(2);
    });

    it('returns 0 when all twins have previews', async () => {
      vault.seed('attachments/twins/a.png.md', '---\nattachment-preview: "[[attachments/a.png]]"\n---');

      const count = await manager.countMissingPreviews();

      expect(count).toBe(0);
    });

    it('returns 0 when no twins exist', async () => {
      const count = await manager.countMissingPreviews();
      expect(count).toBe(0);
    });
  });

  describe('generateMissingPreviews', () => {
    it('updates twins that have empty attachment-preview', async () => {
      // Seed an attachment and its twin without preview
      vault.seed('attachments/photo.png', 'binary-data', { size: 1024 });
      vault.seed('attachments/twins/photo.png.md', '---\nattachment: "[[attachments/photo.png]]"\nattachment-type: image\nattachment-preview: ""\n---\n\n![[attachments/photo.png]]\n');

      settings.generatePreviews = true;
      manager = new TwinManager(vault as any, settings);

      const count = await manager.generateMissingPreviews();

      expect(count).toBe(1);
      const content = vault.getContent('attachments/twins/photo.png.md')!;
      expect(content).toContain('attachment-preview: "[[attachments/photo.png]]"');
    });

    it('returns 0 when no previews are missing', async () => {
      vault.seed('attachments/twins/a.png.md', '---\nattachment-preview: "[[attachments/a.png]]"\n---');

      settings.generatePreviews = true;
      manager = new TwinManager(vault as any, settings);

      const count = await manager.generateMissingPreviews();
      expect(count).toBe(0);
    });

    it('inserts attachment-preview when the key is missing entirely', async () => {
      vault.seed('attachments/photo.png', 'binary-data', { size: 1024 });
      vault.seed(
        'attachments/twins/photo.png.md',
        '---\nattachment: "[[attachments/photo.png]]"\nattachment-type: image\n---\n\n![[attachments/photo.png]]\n',
      );

      settings.generatePreviews = true;
      manager = new TwinManager(vault as any, settings);

      const count = await manager.generateMissingPreviews();

      expect(count).toBe(1);
      const content = vault.getContent('attachments/twins/photo.png.md')!;
      expect(content).toContain('attachment-preview: "[[attachments/photo.png]]"');
      // Existing keys preserved
      expect(content).toContain('attachment-type: image');
    });

    it('updates twins whose preview path is stale (points to a different location)', async () => {
      // Twin references the old next-to-attachment preview path, but previewFolder is now set
      vault.seed('attachments/photo.png', 'binary-data', { size: 1024 });
      vault.seed('attachments/twins/photo.png.md', '---\nattachment: "[[attachments/photo.png]]"\nattachment-type: image\nattachment-preview: "[[attachments/photo.png.preview.png]]"\n---\n');

      settings.generatePreviews = true;
      settings.previewFolder = 'attachments/twins/previews';
      manager = new TwinManager(vault as any, settings);

      const count = await manager.generateMissingPreviews();

      expect(count).toBe(1);
      const content = vault.getContent('attachments/twins/photo.png.md')!;
      expect(content).toContain('attachment-preview: "[[attachments/photo.png]]"');
    });
  });
});
