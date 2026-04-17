import { makeSettings, makeTFile } from './__mocks__/helpers';
import {
  getPreviewValue,
  getPreviewThumbnailPath,
  PreviewType,
  generatePreviewThumbnail,
} from '../src/preview-generator';
import { WatchedScope } from '../src/file-utils';

const SCOPE_ATTACHMENTS: WatchedScope = { mode: 'absolute', prefix: 'attachments/' };
const SCOPE_ALL: WatchedScope = { mode: 'all' };

describe('getPreviewValue', () => {
  const settings = makeSettings({ previewFolder: 'attachments/twins/previews' });

  it('returns wiki-link to the image itself for image types', () => {
    const result = getPreviewValue('attachments/photo.png', 'image', settings, SCOPE_ATTACHMENTS);
    expect(result).toBe('[[attachments/photo.png]]');
  });

  it('returns wiki-link to generated thumbnail for PDFs', () => {
    const result = getPreviewValue('attachments/doc.pdf', 'pdf', settings, SCOPE_ATTACHMENTS);
    expect(result).toBe('[[attachments/twins/previews/doc.pdf.preview.png]]');
  });

  it('returns wiki-link to generated thumbnail for videos', () => {
    const result = getPreviewValue('attachments/clip.mp4', 'video', settings, SCOPE_ATTACHMENTS);
    expect(result).toBe('[[attachments/twins/previews/clip.mp4.preview.png]]');
  });

  it('returns wiki-link to generated thumbnail for audio', () => {
    const result = getPreviewValue('attachments/song.mp3', 'audio', settings, SCOPE_ATTACHMENTS);
    expect(result).toBe('[[attachments/twins/previews/song.mp3.preview.png]]');
  });

  it('returns wiki-link to generated placeholder for other types', () => {
    const result = getPreviewValue(
      'attachments/archive.zip',
      'other',
      settings,
      SCOPE_ATTACHMENTS,
    );
    expect(result).toBe('[[attachments/twins/previews/archive.zip.preview.png]]');
  });
});

describe('getPreviewThumbnailPath', () => {
  it('places thumbnail under previewFolder, stripping the scoped prefix', () => {
    const settings = makeSettings({ previewFolder: 'attachments/twins/previews' });
    expect(getPreviewThumbnailPath('attachments/doc.pdf', settings, SCOPE_ATTACHMENTS))
      .toBe('attachments/twins/previews/doc.pdf.preview.png');
  });

  it('preserves nested paths relative to the scoped prefix', () => {
    const settings = makeSettings({ previewFolder: 'attachments/twins/previews' });
    expect(getPreviewThumbnailPath('attachments/sub/clip.mp4', settings, SCOPE_ATTACHMENTS))
      .toBe('attachments/twins/previews/sub/clip.mp4.preview.png');
  });

  it('falls back to next-to-attachment when previewFolder is empty', () => {
    const settings = makeSettings({ previewFolder: '' });
    expect(getPreviewThumbnailPath('attachments/doc.pdf', settings, SCOPE_ATTACHMENTS))
      .toBe('attachments/doc.pdf.preview.png');
  });

  it('under all-scope mirrors the full vault path under previewFolder', () => {
    const settings = makeSettings({ previewFolder: 'meta/previews' });
    expect(getPreviewThumbnailPath('notes/foo/doc.pdf', settings, SCOPE_ALL))
      .toBe('meta/previews/notes/foo/doc.pdf.preview.png');
  });
});

describe('generatePreviewThumbnail — failure resilience', () => {
  it('swallows readBinary errors and returns false without throwing', async () => {
    const settings = makeSettings({ previewFolder: 'attachments/twins/previews' });
    const adapter = {
      readBinary: jest.fn().mockRejectedValue(new Error('boom')),
      createBinary: jest.fn(),
      getAbstractFileByPath: jest.fn().mockReturnValue(null),
      createFolder: jest.fn().mockResolvedValue(undefined),
      onError: jest.fn(),
    };

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await generatePreviewThumbnail(
        makeTFile('attachments/doc.pdf'),
        'pdf',
        adapter,
        settings,
        SCOPE_ATTACHMENTS,
      );
      expect(result).toBe(false);
      expect(adapter.createBinary).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
      expect(adapter.onError).toHaveBeenCalledWith('attachments/doc.pdf');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('does not report onError when a concurrent caller already wrote the thumb', async () => {
    // Simulates the import-path race: `vault.createBinary` for the attachment
    // fires a vault `create` event that re-enters preview generation
    // concurrently with the import command's explicit call. Both pass the
    // upfront existence check, both render, and one loses at createBinary.
    // The loser's post-catch re-check should see the thumb on disk and
    // suppress the false-positive onError.
    const settings = makeSettings({ previewFolder: 'attachments/twins/previews' });
    const thumbPath = 'attachments/twins/previews/doc.pdf.preview.png';
    let thumbLookupCount = 0;
    const adapter = {
      // Render throws — stands in for "concurrent winner already finished".
      readBinary: jest.fn().mockRejectedValue(new Error('race-loser')),
      createBinary: jest.fn(),
      getAbstractFileByPath: jest.fn().mockImplementation((path: string) => {
        if (path !== thumbPath) return null;
        thumbLookupCount++;
        // First call = upfront existence guard (thumb not yet on disk).
        // Second call = post-catch re-check (winner has since written it).
        return thumbLookupCount > 1 ? ({} as unknown as ReturnType<typeof makeTFile>) : null;
      }),
      createFolder: jest.fn().mockResolvedValue(undefined),
      onError: jest.fn(),
    };

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await generatePreviewThumbnail(
        makeTFile('attachments/doc.pdf'),
        'pdf',
        adapter,
        settings,
        SCOPE_ATTACHMENTS,
      );
      expect(result).toBe(false);
      expect(adapter.onError).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe('PreviewType classification', () => {
  it('images need no generation', () => {
    expect(PreviewType.needsGeneration('image')).toBe(false);
  });

  it('PDFs need generation', () => {
    expect(PreviewType.needsGeneration('pdf')).toBe(true);
  });

  it('videos need generation', () => {
    expect(PreviewType.needsGeneration('video')).toBe(true);
  });

  it('audio needs generation', () => {
    expect(PreviewType.needsGeneration('audio')).toBe(true);
  });

  it('other needs generation (placeholder)', () => {
    expect(PreviewType.needsGeneration('other')).toBe(true);
  });
});
