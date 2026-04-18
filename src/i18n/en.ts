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
  'notice.synced-startup': (created: number, updated: number) =>
    `Synced twins — ${created} created, ${updated} updated.`,
  'notice.synced': (created: number, updated: number) =>
    `Synced twins — ${created} created, ${updated} updated.`,
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
  'notice.preview-failed-single': (name: string) =>
    `Couldn't generate preview for ${name}.`,
  'notice.preview-failed-multi': (count: number) =>
    `Couldn't generate previews for ${count} file(s).`,
  'modal.insert-links-title': 'Insert links into active note?',
  'modal.insert-links-desc': (count: number) =>
    `Insert ${count} wiki-link(s) at the cursor position in the active note.`,
  'modal.insert-links-yes': 'Insert',
  'modal.insert-links-no': 'Skip',
  'modal.bulk-templater-title': 'Run Templater on each new twin?',
  'modal.bulk-templater-desc': (count: number) =>
    `You're importing ${count} files. If you continue, Templater will ask you to fill template fields once per file. Choose "Skip" to create the twins now and run Templater later on individual twins.`,
  'modal.bulk-templater-yes': 'Run Templater on each',
  'modal.bulk-templater-no': 'Skip for this batch',

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
  'settings.templater-enabled': 'Process twin with Templater after creation',
  'settings.templater-enabled.desc': 'Run Templater on each newly-created twin so `<% … %>` syntax in the template is resolved. Requires the Templater community plugin.',
  'settings.templater-path': 'Twin template file',
  'settings.templater-path.desc': 'Used as the base frontmatter and body for every new twin. Templater processes it if the toggle above is on and Templater is installed. Leave empty to fall back to the custom fields above.',
  'settings.templater-status.not-installed': '⚠ Templater plugin is not installed. Twins will be created from the template as-is and `<% … %>` fields will remain literal.',
  'settings.templater-status.empty-path': 'Set a template file below for Templater to process.',
  'settings.templater-status.template-missing': '⚠ Template file not found in the vault.',
  'settings.templater-status.no-dynamic-fields': 'Current template has no `<% … %>` dynamic fields — Templater will not change anything.',

  // Base display names
  'base.preview': 'Preview',
  'base.attachment': 'Attachment',
  'base.type': 'Type',
  'base.categories': 'Categories',
  'base.size': 'Size',
  'base.created': 'Created',
  'base.modified': 'Modified',
} as const;
