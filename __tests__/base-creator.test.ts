import { FakeVault, makeSettings } from './__mocks__/helpers';
import { createAttachmentBase, getBaseContent } from '../src/base-creator';

describe('getBaseContent', () => {
  it('produces valid YAML with hasProperty filter', () => {
    const settings = makeSettings();
    const content = getBaseContent(settings);

    expect(content).toContain('filters:');
    expect(content).toContain('file.hasProperty("attachment")');
  });

  it('includes a cards view with attachment-preview as image', () => {
    const settings = makeSettings();
    const content = getBaseContent(settings);

    expect(content).toContain('type: cards');
    expect(content).toContain('image: note.attachment-preview');
  });

  it('configures useful properties for attachment management', () => {
    const settings = makeSettings();
    const content = getBaseContent(settings);

    expect(content).toContain('attachment');
    expect(content).toContain('type');
    expect(content).toContain('size');
    expect(content).toContain('preview');
  });
});

describe('createAttachmentBase', () => {
  it('creates a .base file in the vault root', async () => {
    const vault = new FakeVault();
    const settings = makeSettings({ twinFolder: 'attachments/twins' });

    await createAttachmentBase(vault as any, settings);

    expect(vault.has('attachments.base')).toBe(true);
  });

  it('does not overwrite an existing .base file', async () => {
    const vault = new FakeVault();
    vault.seed('attachments.base', 'custom content');
    const settings = makeSettings();

    await createAttachmentBase(vault as any, settings);

    expect(vault.getContent('attachments.base')).toBe('custom content');
  });

  it('base content uses hasProperty filter', async () => {
    const vault = new FakeVault();
    const settings = makeSettings({ twinFolder: 'my-meta/twins' });

    await createAttachmentBase(vault as any, settings);

    const content = vault.getContent('attachments.base')!;
    expect(content).toContain('file.hasProperty("attachment")');
  });
});
