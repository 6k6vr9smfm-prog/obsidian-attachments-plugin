export default {
  // Commands
  'cmd.sync-all': 'Alle Anhang-Zwillinge synchronisieren',
  'cmd.generate-previews': 'Fehlende Vorschauen generieren',
  'cmd.move-twins': 'Zwillinge in konfigurierten Ordner verschieben',
  'cmd.recreate-base': 'Anhänge-Basisdatei erstellen oder aktualisieren',
  'cmd.delete-all-twins': 'Alle Zwillingsdateien löschen',
  'cmd.resync-twin': 'Zwillingsdatei neu synchronisieren',

  // Notices
  'notice.synced-startup': (created: number, skipped: number) =>
    `Attachment Bases: ${created} Zwilling(e) synchronisiert, ${skipped} übersprungen.`,
  'notice.synced': (created: number, skipped: number) =>
    `Attachment Bases: ${created} Zwilling(e) erstellt, ${skipped} bereits synchronisiert.`,
  'notice.missing-previews': (count: number) =>
    `Attachment Bases: ${count} Anhang/Anhänge ohne Vorschau. Führe "Fehlende Vorschauen generieren" aus.`,
  'notice.generated-previews': (count: number) =>
    `Attachment Bases: ${count} Vorschau(en) generiert.`,
  'notice.moved-twins': (count: number, folder: string) =>
    `Attachment Bases: ${count} Zwillingsdatei(en) nach ${folder} verschoben.`,
  'notice.base-created': 'Attachment Bases: Basisdatei erstellt/aktualisiert.',
  'notice.deleted-twins': (count: number) =>
    `Attachment Bases: ${count} Zwillingsdatei(en) gelöscht.`,
  'notice.resynced': (name: string) =>
    `Zwilling neu synchronisiert für ${name}`,

  // Settings
  'settings.sync-on-startup': 'Beim Start synchronisieren',
  'settings.sync-on-startup.desc': 'Automatisch Zwillingsdateien für neue Anhänge beim Start von Obsidian erstellen.',
  'settings.twin-folder': 'Zwillingsordner',
  'settings.twin-folder.desc': 'Ordner für Zwillings-Metadatendateien. Leer lassen, um Zwillinge neben Anhängen zu platzieren.',
  'settings.twin-folder.placeholder': 'z.B. attachments/twins',
  'settings.watched-folders': 'Überwachte Ordner',
  'settings.watched-folders.desc': 'Nur Anhänge in diesen Ordnern überwachen (einer pro Zeile). Leer lassen für den gesamten Tresor.',
  'settings.exclude-patterns': 'Ausschlussmuster',
  'settings.exclude-patterns.desc': 'Pfadpräfixe, die von der Zwillingserstellung ausgeschlossen werden (eines pro Zeile).',
  'settings.generate-previews': 'Vorschauen generieren',
  'settings.generate-previews.desc': 'Vorschau-Miniaturbilder für Anhänge generieren (Bilder, PDFs, Videos, Audio).',
  'settings.preview-folder': 'Vorschau-Ordner',
  'settings.preview-folder.desc': 'Ordner, in dem generierte Vorschau-Miniaturen gespeichert werden. Leer lassen, um sie neben den Anhängen zu platzieren.',
  'settings.preview-folder.placeholder': 'z. B. attachments/twins/previews',
  'settings.custom-fields': 'Benutzerdefinierte Frontmatter-Felder',
  'settings.custom-fields.desc': 'Zusätzliche Felder für jede Zwillingsdatei (ein "Schlüssel: Wert" pro Zeile). Wird ignoriert, wenn ein Vorlagenpfad gesetzt ist.',
  'settings.templater-enabled': 'Templater-Integration',
  'settings.templater-enabled.desc': 'Templater nach der Erstellung auf Zwillingsdateien ausführen (erfordert Templater-Plugin).',
  'settings.templater-path': 'Templater-Vorlagenpfad',
  'settings.templater-path.desc': 'Pfad zu einer Vorlage, deren Frontmatter und Inhalt auf neue Zwillinge angewendet werden (ersetzt benutzerdefinierte Felder). Leer lassen, um benutzerdefinierte Felder zu verwenden.',

  // Base display names
  'base.preview': 'Vorschau',
  'base.attachment': 'Anhang',
  'base.type': 'Typ',
  'base.categories': 'Kategorien',
  'base.size': 'Größe',
  'base.created': 'Erstellt',
  'base.modified': 'Geändert',
} as const;
