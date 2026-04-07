import { makeTFile, makeSettings, FakeVault } from './__mocks__/helpers';
import {
  getPreviewValue,
  getPreviewThumbnailPath,
  PreviewType,
} from '../src/preview-generator';

describe('getPreviewValue', () => {
  const settings = makeSettings({
    previewFolder: 'attachments/twins/previews',
    watchedFolders: ['attachments/'],
  });

  it('returns wiki-link to the image itself for image types', () => {
    const result = getPreviewValue('attachments/photo.png', 'image', settings);
    expect(result).toBe('[[attachments/photo.png]]');
  });

  it('returns wiki-link to generated thumbnail for PDFs', () => {
    const result = getPreviewValue('attachments/doc.pdf', 'pdf', settings);
    expect(result).toBe('[[attachments/twins/previews/doc.pdf.preview.png]]');
  });

  it('returns wiki-link to generated thumbnail for videos', () => {
    const result = getPreviewValue('attachments/clip.mp4', 'video', settings);
    expect(result).toBe('[[attachments/twins/previews/clip.mp4.preview.png]]');
  });

  it('returns wiki-link to generated thumbnail for audio', () => {
    const result = getPreviewValue('attachments/song.mp3', 'audio', settings);
    expect(result).toBe('[[attachments/twins/previews/song.mp3.preview.png]]');
  });

  it('returns wiki-link to generated placeholder for other types', () => {
    const result = getPreviewValue('attachments/archive.zip', 'other', settings);
    expect(result).toBe('[[attachments/twins/previews/archive.zip.preview.png]]');
  });
});

describe('getPreviewThumbnailPath', () => {
  it('places thumbnail under previewFolder, stripping watched folder prefix', () => {
    const settings = makeSettings({
      previewFolder: 'attachments/twins/previews',
      watchedFolders: ['attachments/'],
    });
    expect(getPreviewThumbnailPath('attachments/doc.pdf', settings))
      .toBe('attachments/twins/previews/doc.pdf.preview.png');
  });

  it('preserves nested paths relative to watched folder', () => {
    const settings = makeSettings({
      previewFolder: 'attachments/twins/previews',
      watchedFolders: ['attachments/'],
    });
    expect(getPreviewThumbnailPath('attachments/sub/clip.mp4', settings))
      .toBe('attachments/twins/previews/sub/clip.mp4.preview.png');
  });

  it('falls back to next-to-attachment when previewFolder is empty', () => {
    const settings = makeSettings({
      previewFolder: '',
      watchedFolders: ['attachments/'],
    });
    expect(getPreviewThumbnailPath('attachments/doc.pdf', settings))
      .toBe('attachments/doc.pdf.preview.png');
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
