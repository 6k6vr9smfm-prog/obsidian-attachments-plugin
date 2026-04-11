import { TFolder } from 'obsidian';
import { makeTFile, makeSettings } from './__mocks__/helpers';
import {
  classifyType,
  getTwinPath,
  getAttachmentPathFromTwin,
  isTwinFile,
  isAttachment,
  isExcluded,
  isInScope,
  isPreviewThumbnail,
  resolveWatchedScope,
  shouldProcess,
  shouldProcessPath,
  WatchedScope,
} from '../src/file-utils';

const SCOPE_ATTACHMENTS: WatchedScope = { mode: 'absolute', prefix: 'attachments/' };
const SCOPE_ALL: WatchedScope = { mode: 'all' };

describe('resolveWatchedScope', () => {
  it('returns all-scope for undefined (setting never set)', () => {
    expect(resolveWatchedScope(undefined)).toEqual({ mode: 'all' });
  });

  it('returns all-scope for null', () => {
    expect(resolveWatchedScope(null)).toEqual({ mode: 'all' });
  });

  it('returns all-scope for empty string', () => {
    expect(resolveWatchedScope('')).toEqual({ mode: 'all' });
  });

  it('returns all-scope for whitespace', () => {
    expect(resolveWatchedScope('   ')).toEqual({ mode: 'all' });
  });

  it('returns all-scope for vault root "/"', () => {
    expect(resolveWatchedScope('/')).toEqual({ mode: 'all' });
  });

  it('returns all-scope for "./" (same folder as current note)', () => {
    expect(resolveWatchedScope('./')).toEqual({ mode: 'all' });
  });

  it('returns all-scope for "./assets" (relative subfolder)', () => {
    expect(resolveWatchedScope('./assets')).toEqual({ mode: 'all' });
  });

  it('returns absolute scope for "attachments"', () => {
    expect(resolveWatchedScope('attachments')).toEqual({
      mode: 'absolute',
      prefix: 'attachments/',
    });
  });

  it('returns absolute scope for "attachments/" preserving the trailing slash', () => {
    expect(resolveWatchedScope('attachments/')).toEqual({
      mode: 'absolute',
      prefix: 'attachments/',
    });
  });

  it('returns absolute scope for nested absolute path', () => {
    expect(resolveWatchedScope('assets/files')).toEqual({
      mode: 'absolute',
      prefix: 'assets/files/',
    });
  });

  it('trims surrounding whitespace', () => {
    expect(resolveWatchedScope('  attachments  ')).toEqual({
      mode: 'absolute',
      prefix: 'attachments/',
    });
  });
});

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

  it.each([['pdf', 'pdf']])('classifies %s as %s', (ext, expected) => {
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
  const settings = makeSettings({ twinFolder: 'attachments/twins' });

  it('places twin in twinFolder mirroring relative path', () => {
    expect(getTwinPath('attachments/photo.png', settings, SCOPE_ATTACHMENTS))
      .toBe('attachments/twins/photo.png.md');
  });

  it('preserves subdirectory structure', () => {
    expect(getTwinPath('attachments/invoices/2024/bill.pdf', settings, SCOPE_ATTACHMENTS))
      .toBe('attachments/twins/invoices/2024/bill.pdf.md');
  });

  it('places twin next to attachment when twinFolder is empty', () => {
    const noTwinFolder = makeSettings({ twinFolder: '' });
    expect(getTwinPath('attachments/photo.png', noTwinFolder, SCOPE_ATTACHMENTS))
      .toBe('attachments/photo.png.md');
  });

  it('handles files in root of the scoped folder', () => {
    expect(getTwinPath('attachments/doc.pdf', settings, SCOPE_ATTACHMENTS))
      .toBe('attachments/twins/doc.pdf.md');
  });

  it('under all-scope mirrors the full vault path', () => {
    const cfg = makeSettings({ twinFolder: 'meta/twins' });
    expect(getTwinPath('notes/foo/photo.png', cfg, SCOPE_ALL))
      .toBe('meta/twins/notes/foo/photo.png.md');
  });

  it('under absolute-scope with a path outside the prefix keeps the full path', () => {
    // If an attachment somehow lands outside the scoped folder, we still
    // compute a twin path — the caller (shouldProcess) decides whether to
    // actually touch that file.
    expect(getTwinPath('other/photo.png', settings, SCOPE_ATTACHMENTS))
      .toBe('attachments/twins/other/photo.png.md');
  });
});

describe('getAttachmentPathFromTwin', () => {
  const settings = makeSettings({ twinFolder: 'attachments/twins' });

  it('reverses getTwinPath under absolute scope', () => {
    expect(getAttachmentPathFromTwin('attachments/twins/photo.png.md', settings, SCOPE_ATTACHMENTS))
      .toBe('attachments/photo.png');
  });

  it('reverses a nested path', () => {
    expect(
      getAttachmentPathFromTwin(
        'attachments/twins/invoices/2024/bill.pdf.md',
        settings,
        SCOPE_ATTACHMENTS,
      ),
    ).toBe('attachments/invoices/2024/bill.pdf');
  });

  it('returns null for paths not in twinFolder', () => {
    expect(getAttachmentPathFromTwin('other/photo.png.md', settings, SCOPE_ATTACHMENTS))
      .toBeNull();
  });

  it('reverses when twinFolder is empty (twin next to attachment)', () => {
    const noTwinFolder = makeSettings({ twinFolder: '' });
    expect(getAttachmentPathFromTwin('attachments/photo.png.md', noTwinFolder, SCOPE_ATTACHMENTS))
      .toBe('attachments/photo.png');
  });

  it('under all-scope returns the relative path unchanged', () => {
    const cfg = makeSettings({ twinFolder: 'meta/twins' });
    expect(getAttachmentPathFromTwin('meta/twins/notes/foo/photo.png.md', cfg, SCOPE_ALL))
      .toBe('notes/foo/photo.png');
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

describe('isInScope', () => {
  it('returns true for paths inside the absolute scope prefix', () => {
    expect(isInScope('attachments/photo.png', SCOPE_ATTACHMENTS)).toBe(true);
  });

  it('returns false for paths outside the absolute scope prefix', () => {
    expect(isInScope('notes/note.md', SCOPE_ATTACHMENTS)).toBe(false);
  });

  it('returns true for any path when scope mode is "all"', () => {
    expect(isInScope('anywhere/file.png', SCOPE_ALL)).toBe(true);
    expect(isInScope('root.png', SCOPE_ALL)).toBe(true);
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
    excludePatterns: ['attachments/private'],
  });

  it('accepts a normal attachment in the scoped folder', () => {
    expect(shouldProcess(makeTFile('attachments/photo.png'), settings, SCOPE_ATTACHMENTS)).toBe(true);
  });

  it('rejects markdown files', () => {
    expect(shouldProcess(makeTFile('attachments/note.md'), settings, SCOPE_ATTACHMENTS)).toBe(false);
  });

  it('rejects files inside twinFolder', () => {
    expect(
      shouldProcess(makeTFile('attachments/twins/photo.png.md'), settings, SCOPE_ATTACHMENTS),
    ).toBe(false);
  });

  it('rejects files outside the absolute scope', () => {
    expect(shouldProcess(makeTFile('other/photo.png'), settings, SCOPE_ATTACHMENTS)).toBe(false);
  });

  it('accepts files anywhere when scope is "all"', () => {
    expect(shouldProcess(makeTFile('other/photo.png'), settings, SCOPE_ALL)).toBe(true);
  });

  it('rejects excluded paths even under scope "all"', () => {
    expect(
      shouldProcess(makeTFile('attachments/private/secret.png'), settings, SCOPE_ALL),
    ).toBe(false);
  });

  it('rejects preview thumbnails', () => {
    expect(
      shouldProcess(makeTFile('attachments/doc.pdf.preview.png'), settings, SCOPE_ATTACHMENTS),
    ).toBe(false);
  });

  it('rejects folders', () => {
    expect(shouldProcess(new TFolder('attachments') as any, settings, SCOPE_ATTACHMENTS)).toBe(false);
  });
});

describe('shouldProcessPath', () => {
  const settings = makeSettings({
    twinFolder: 'attachments/twins',
    excludePatterns: ['attachments/private'],
  });

  it('accepts a normal attachment path in the scoped folder', () => {
    expect(shouldProcessPath('attachments/photo.png', settings, SCOPE_ATTACHMENTS)).toBe(true);
  });

  it('rejects paths outside the absolute scope', () => {
    expect(shouldProcessPath('other/photo.png', settings, SCOPE_ATTACHMENTS)).toBe(false);
  });

  it('rejects markdown paths', () => {
    expect(shouldProcessPath('attachments/note.md', settings, SCOPE_ATTACHMENTS)).toBe(false);
  });

  it('rejects paths inside twinFolder', () => {
    expect(shouldProcessPath('attachments/twins/photo.png.md', settings, SCOPE_ATTACHMENTS)).toBe(
      false,
    );
  });

  it('rejects excluded paths', () => {
    expect(
      shouldProcessPath('attachments/private/secret.png', settings, SCOPE_ATTACHMENTS),
    ).toBe(false);
  });

  it('rejects preview thumbnails', () => {
    expect(shouldProcessPath('attachments/doc.pdf.preview.png', settings, SCOPE_ATTACHMENTS))
      .toBe(false);
  });

  it('rejects paths with no extension', () => {
    expect(shouldProcessPath('attachments/noext', settings, SCOPE_ATTACHMENTS)).toBe(false);
  });

  it('accepts any extensioned attachment path under scope "all"', () => {
    expect(shouldProcessPath('notes/photo.png', settings, SCOPE_ALL)).toBe(true);
  });
});
