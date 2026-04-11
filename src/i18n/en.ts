export default {
  // Commands
  'cmd.sync-all': 'Sync all attachment twins',
  'cmd.generate-previews': 'Generate missing previews',
  'cmd.move-twins': 'Move twins to configured folder',
  'cmd.recreate-base': 'Create or update Attachments base file',
  'cmd.delete-all-twins': 'Delete all twin files',
  'cmd.resync-twin': 'Re-sync twin file',
  'cmd.import-files': 'Import files from device',

  // Notices
  'notice.synced-startup': (created: number, skipped: number) =>
    `Synced ${created} twin(s), ${skipped} skipped.`,
  'notice.synced': (created: number, skipped: number) =>
    `Created ${created} twin(s), ${skipped} already synced.`,
  'notice.missing-previews': (count: number) =>
    `${count} attachment(s) missing previews. Run "Generate missing previews" to fix.`,
  'notice.generated-previews': (count: number) =>
    `Generated ${count} preview(s).`,
  'notice.moved-twins': (count: number, folder: string) =>
    `Moved ${count} twin file(s) to ${folder}.`,
  'notice.base-created': 'Base file created/updated.',
  'notice.deleted-twins': (count: number) =>
    `Deleted ${count} twin file(s).`,
  'notice.resynced': (name: string) =>
    `Twin re-synced for ${name}`,
  'notice.imported': (imported: number, failed: number) =>
    failed > 0
      ? `Imported ${imported} file(s), ${failed} failed.`
      : `Imported ${imported} file(s).`,
  'notice.import-failed': (name: string, error: string) =>
    `Failed to import ${name}: ${error}`,

  // Settings
  'settings.sync-on-startup': 'Sync on startup',
  'settings.sync-on-startup.desc': 'Automatically create twin files for new attachments when Obsidian starts.',
  'settings.twin-folder': 'Twin folder',
  'settings.twin-folder.desc': 'Folder where twin metadata files are stored. Leave empty to place twins next to attachments.',
  'settings.twin-folder.placeholder': 'e.g. attachments/twins',
  'settings.exclude-patterns': 'Exclude patterns',
  'settings.exclude-patterns.desc': 'Path prefixes to exclude from twin creation (one per line).',
  'settings.generate-previews': 'Generate previews',
  'settings.generate-previews.desc': 'Generate preview thumbnails for attachments (images, PDFs, videos, audio).',
  'settings.preview-folder': 'Preview folder',
  'settings.preview-folder.desc': 'Folder where generated preview thumbnails are stored. Leave empty to place previews next to attachments.',
  'settings.preview-folder.placeholder': 'e.g. attachments/twins/previews',
  'settings.custom-fields': 'Custom frontmatter fields',
  'settings.custom-fields.desc': 'Extra fields added to every twin file (one "key: value" per line). Ignored when a template path is set.',
  'settings.templater-enabled': 'Templater integration',
  'settings.templater-enabled.desc': 'Run Templater on twin files after creation (requires Templater plugin).',
  'settings.templater-path': 'Templater template path',
  'settings.templater-path.desc': 'Path to a template file whose frontmatter and body are merged into new twins (replaces custom fields). Leave empty to use custom fields instead.',

  // Base display names
  'base.preview': 'Preview',
  'base.attachment': 'Attachment',
  'base.type': 'Type',
  'base.categories': 'Categories',
  'base.size': 'Size',
  'base.created': 'Created',
  'base.modified': 'Modified',
} as const;
