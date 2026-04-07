export const EXTENSION_TYPE_MAP: Record<string, string> = {
  // Image
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', svg: 'image',
  bmp: 'image', webp: 'image', ico: 'image', tiff: 'image', tif: 'image', avif: 'image',
  // PDF
  pdf: 'pdf',
  // Video
  mp4: 'video', mkv: 'video', mov: 'video', avi: 'video', webm: 'video', ogv: 'video',
  // Audio
  mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio', m4a: 'audio', aac: 'audio', wma: 'audio',
};

export const MANAGED_FRONTMATTER_KEYS = [
  'attachment', 'attachment-type', 'categories', 'attachment-size', 'created', 'modified', 'attachment-preview',
] as const;

export const PREVIEW_SUFFIX = '.preview.png';
