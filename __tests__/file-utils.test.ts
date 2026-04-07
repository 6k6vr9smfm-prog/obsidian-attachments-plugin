import { TFolder } from 'obsidian';
import { makeTFile, makeSettings } from './__mocks__/helpers';
import {
  classifyType,
  getTwinPath,
  getAttachmentPathFromTwin,
  isTwinFile,
  isAttachment,
  isExcluded,
  isInWatchedFolder,
  isPreviewThumbnail,
  shouldProcess,
  shouldProcessPath,
} from '../src/file-utils';

describe('classifyType', () => {
  it.each([
    ['png', 'image'],
    ['jpg', 'image'],
    ['jpeg', 'image'],
    ['gif', 'image'],
    ['svg', 'image'],
    ['bmp', 'image'],
    ['webp', 'image'],
    ['ico', 'image'],
    ['tiff', 'image'],
    ['tif', 'image'],
    ['avif', 'image'],
  ])('classifies %s as %s', (ext, expected) => {
    expect(classifyType(ext)).toBe(expected);
  });

  it.each([
    ['pdf', 'pdf'],
  ])('classifies %s as %s', (ext, expected) => {
    expect(classifyType(ext)).toBe(expected);
  });

  it.each([
    ['mp4', 'video'],
    ['mkv', 'video'],
    ['mov', 'video'],
    ['avi', 'video'],
    ['webm', 'video'],
    ['ogv', 'video'],
  ])('classifies %s as %s', (ext, expected) => {
    expect(classifyType(ext)).toBe(expected);
  });

  it.each([
    ['mp3', 'audio'],
    ['wav', 'audio'],
    ['ogg', 'audio'],
    ['flac', 'audio'],
    ['m4a', 'audio'],
    ['aac', 'audio'],
    ['wma', 'audio'],
  ])('classifies %s as %s', (ext, expected) => {
    expect(classifyType(ext)).toBe(expected);
  });

  it('classifies unknown extensions as other', () => {
    expect(classifyType('xyz')).toBe('other');
    expect(classifyType('docx')).toBe('other');
    expect(classifyType('zip')).toBe('other');
  });

  it('is case-insensitive', () => {
    expect(classifyType('PNG')).toBe('image');
    expect(classifyType('Pdf')).toBe('pdf');
  });
});

describe('getTwinPath', () => {
  const settings = makeSettings({
    twinFolder: 'attachments/twins',
    watchedFolders: ['attachments/'],
  });

  it('places twin in twinFolder mirroring relative path', () => {
    expect(getTwinPath('attachments/photo.png', settings))
      .toBe('attachments/twins/photo.png.md');
  });

  it('preserves subdirectory structure', () => {
    expect(getTwinPath('attachments/invoices/2024/bill.pdf', settings))
      .toBe('attachments/twins/invoices/2024/bill.pdf.md');
  });

  it('places twin next to attachment when twinFolder is empty', () => {
    const noTwinFolder = makeSettings({ twinFolder: '', watchedFolders: ['attachments/'] });
    expect(getTwinPath('attachments/photo.png', noTwinFolder))
      .toBe('attachments/photo.png.md');
  });

  it('handles files in root of watched folder', () => {
    expect(getTwinPath('attachments/doc.pdf', settings))
      .toBe('attachments/twins/doc.pdf.md');
  });

  it('handles multiple watched folders — matches the right one', () => {
    const multi = makeSettings({
      twinFolder: 'meta/twins',
      watchedFolders: ['attachments/', 'uploads/'],
    });
    expect(getTwinPath('uploads/file.png', multi))
      .toBe('meta/twins/file.png.md');
  });

  it('uses full path as relative when no watched folder matches', () => {
    const noMatch = makeSettings({
      twinFolder: 'twins',
      watchedFolders: ['other/'],
    });
    expect(getTwinPath('attachments/photo.png', noMatch))
      .toBe('twins/attachments/photo.png.md');
  });
});

describe('getAttachmentPathFromTwin', () => {
  const settings = makeSettings({
    twinFolder: 'attachments/twins',
    watchedFolders: ['attachments/'],
  });

  it('reverses getTwinPath', () => {
    expect(getAttachmentPathFromTwin('attachments/twins/photo.png.md', settings))
      .toBe('attachments/photo.png');
  });

  it('reverses nested path', () => {
    expect(getAttachmentPathFromTwin('attachments/twins/invoices/2024/bill.pdf.md', settings))
      .toBe('attachments/invoices/2024/bill.pdf');
  });

  it('returns null for paths not in twinFolder', () => {
    expect(getAttachmentPathFromTwin('other/photo.png.md', settings))
      .toBeNull();
  });

  it('reverses when twinFolder is empty (twin next to attachment)', () => {
    const noTwinFolder = makeSettings({ twinFolder: '', watchedFolders: ['attachments/'] });
    expect(getAttachmentPathFromTwin('attachments/photo.png.md', noTwinFolder))
      .toBe('attachments/photo.png');
  });
});

describe('isTwinFile', () => {
  const settings = makeSettings({ twinFolder: 'attachments/twins' });

  it('returns true for paths inside twinFolder', () => {
    expect(isTwinFile('attachments/twins/photo.png.md', settings)).toBe(true);
    expect(isTwinFile('attachments/twins/sub/file.pdf.md', settings)).toBe(true);
  });

  it('returns false for paths outside twinFolder', () => {
    expect(isTwinFile('attachments/photo.png', settings)).toBe(false);
    expect(isTwinFile('notes/note.md', settings)).toBe(false);
  });

  it('handles empty twinFolder — uses .md extension heuristic on attachment extensions', () => {
    const noTwinFolder = makeSettings({ twinFolder: '' });
    // When twinFolder is empty, twins live next to attachments as attachment.ext.md
    // We can't reliably detect these without the twinFolder prefix,
    // so isTwinFile returns false (guard relies on extension != md check instead)
    expect(isTwinFile('attachments/photo.png.md', noTwinFolder)).toBe(true);
  });
});

describe('isAttachment', () => {
  it('returns true for non-md files', () => {
    expect(isAttachment(makeTFile('photo.png'))).toBe(true);
    expect(isAttachment(makeTFile('doc.pdf'))).toBe(true);
    expect(isAttachment(makeTFile('song.mp3'))).toBe(true);
  });

  it('returns false for markdown files', () => {
    expect(isAttachment(makeTFile('note.md'))).toBe(false);
  });

  it('returns false for folders', () => {
    expect(isAttachment(new TFolder('attachments') as any)).toBe(false);
  });
});

describe('isExcluded', () => {
  it('excludes paths matching a pattern', () => {
    const settings = makeSettings({ excludePatterns: ['attachments/private', 'temp/'] });
    expect(isExcluded('attachments/private/secret.png', settings)).toBe(true);
    expect(isExcluded('temp/cache.bin', settings)).toBe(true);
  });

  it('does not exclude non-matching paths', () => {
    const settings = makeSettings({ excludePatterns: ['attachments/private'] });
    expect(isExcluded('attachments/public/photo.png', settings)).toBe(false);
  });

  it('returns false when no exclude patterns set', () => {
    const settings = makeSettings({ excludePatterns: [] });
    expect(isExcluded('anything/file.png', settings)).toBe(false);
  });
});

describe('isInWatchedFolder', () => {
  it('returns true for paths in watched folders', () => {
    const settings = makeSettings({ watchedFolders: ['attachments/', 'uploads/'] });
    expect(isInWatchedFolder('attachments/photo.png', settings)).toBe(true);
    expect(isInWatchedFolder('uploads/file.pdf', settings)).toBe(true);
  });

  it('returns false for paths outside watched folders', () => {
    const settings = makeSettings({ watchedFolders: ['attachments/'] });
    expect(isInWatchedFolder('notes/note.md', settings)).toBe(false);
  });

  it('returns true for any path when watchedFolders is empty (watch all)', () => {
    const settings = makeSettings({ watchedFolders: [] });
    expect(isInWatchedFolder('anywhere/file.png', settings)).toBe(true);
  });
});

describe('isPreviewThumbnail', () => {
  it('detects preview thumbnails by suffix', () => {
    expect(isPreviewThumbnail('attachments/twins/doc.pdf.preview.png')).toBe(true);
  });

  it('returns false for normal files', () => {
    expect(isPreviewThumbnail('attachments/photo.png')).toBe(false);
    expect(isPreviewThumbnail('attachments/twins/photo.png.md')).toBe(false);
  });
});

describe('shouldProcess', () => {
  const settings = makeSettings({
    twinFolder: 'attachments/twins',
    watchedFolders: ['attachments/'],
    excludePatterns: ['attachments/private'],
  });

  it('accepts a normal attachment in a watched folder', () => {
    expect(shouldProcess(makeTFile('attachments/photo.png'), settings)).toBe(true);
  });

  it('rejects markdown files', () => {
    expect(shouldProcess(makeTFile('attachments/note.md'), settings)).toBe(false);
  });

  it('rejects files inside twinFolder', () => {
    expect(shouldProcess(makeTFile('attachments/twins/photo.png.md'), settings)).toBe(false);
  });

  it('rejects files outside watched folders', () => {
    expect(shouldProcess(makeTFile('other/photo.png'), settings)).toBe(false);
  });

  it('rejects excluded paths', () => {
    expect(shouldProcess(makeTFile('attachments/private/secret.png'), settings)).toBe(false);
  });

  it('rejects preview thumbnails', () => {
    expect(shouldProcess(makeTFile('attachments/doc.pdf.preview.png'), settings)).toBe(false);
  });

  it('rejects folders', () => {
    expect(shouldProcess(new TFolder('attachments') as any, settings)).toBe(false);
  });
});

describe('shouldProcessPath', () => {
  const settings = makeSettings({
    twinFolder: 'attachments/twins',
    watchedFolders: ['attachments/'],
    excludePatterns: ['attachments/private'],
  });

  it('accepts a normal attachment path in a watched folder', () => {
    expect(shouldProcessPath('attachments/photo.png', settings)).toBe(true);
  });

  it('rejects paths outside watched folders', () => {
    expect(shouldProcessPath('other/photo.png', settings)).toBe(false);
  });

  it('rejects markdown paths', () => {
    expect(shouldProcessPath('attachments/note.md', settings)).toBe(false);
  });

  it('rejects paths inside twinFolder', () => {
    expect(shouldProcessPath('attachments/twins/photo.png.md', settings)).toBe(false);
  });

  it('rejects excluded paths', () => {
    expect(shouldProcessPath('attachments/private/secret.png', settings)).toBe(false);
  });

  it('rejects preview thumbnails', () => {
    expect(shouldProcessPath('attachments/doc.pdf.preview.png', settings)).toBe(false);
  });

  it('rejects paths with no extension', () => {
    expect(shouldProcessPath('attachments/noext', settings)).toBe(false);
  });
});
