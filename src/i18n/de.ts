export default {
  // Commands
  'cmd.sync-all': 'Alle Anhang-Zwillinge synchronisieren',
  'cmd.generate-previews': 'Fehlende Vorschauen generieren',
  'cmd.move-twins': 'Zwillinge in konfigurierten Ordner verschieben',
  'cmd.recreate-base': 'Anhänge-Basisdatei erstellen oder aktualisieren',
  'cmd.delete-all-twins': 'Alle Zwillingsdateien löschen',
  'cmd.resync-twin': 'Zwillingsdatei neu synchronisieren',
  'cmd.import-files': 'Dateien vom Gerät importieren',

  // Notices
  'notice.synced-startup': (created: number, updated: number) =>
    `Zwillinge synchronisiert — ${created} erstellt, ${updated} aktualisiert.`,
  'notice.synced': (created: number, updated: number) =>
    `Zwillinge synchronisiert — ${created} erstellt, ${updated} aktualisiert.`,
  'notice.missing-previews': (count: number) =>
    `${count} Anhang/Anhänge ohne Vorschau. Führe "Fehlende Vorschauen generieren" aus.`,
  'notice.generated-previews': (count: number) =>
    `${count} Vorschau(en) generiert.`,
  'notice.moved-twins': (count: number, folder: string) =>
    `${count} Zwillingsdatei(en) nach ${folder} verschoben.`,
  'notice.base-created': 'Basisdatei erstellt/aktualisiert.',
  'notice.deleted-twins': (count: number) =>
    `${count} Zwillingsdatei(en) gelöscht.`,
  'notice.resynced': (name: string) =>
    `Zwilling neu synchronisiert für ${name}`,
  'notice.imported': (imported: number, failed: number) =>
    failed > 0
      ? `${imported} Datei(en) importiert, ${failed} fehlgeschlagen.`
      : `${imported} Datei(en) importiert.`,
  'notice.preview-failed-single': (name: string) =>
    `Vorschau für ${name} konnte nicht erstellt werden.`,
  'notice.preview-failed-multi': (count: number) =>
    `Vorschauen für ${count} Datei(en) konnten nicht erstellt werden.`,
  'modal.insert-links-title': 'Links in aktive Notiz einfügen?',
  'modal.insert-links-desc': (count: number) =>
    `${count} Wiki-Link(s) an der Cursorposition in der aktiven Notiz einfügen.`,
  'modal.insert-links-yes': 'Einfügen',
  'modal.insert-links-no': 'Überspringen',
  'modal.bulk-templater-title': 'Templater für jeden neuen Zwilling ausführen?',
  'modal.bulk-templater-desc': (count: number) =>
    `Du importierst ${count} Dateien. Wenn du fortfährst, fragt Templater einmal pro Datei nach den Vorlagenfeldern. Wähle "Überspringen", um die Zwillinge jetzt zu erstellen und Templater später für einzelne Zwillinge auszuführen.`,
  'modal.bulk-templater-yes': 'Templater für jeden ausführen',
  'modal.bulk-templater-no': 'Für diesen Stapel überspringen',

  // Settings
  'settings.sync-on-startup': 'Beim Start synchronisieren',
  'settings.sync-on-startup.desc': 'Automatisch Zwillingsdateien für neue Anhänge beim Start von Obsidian erstellen.',
  'settings.twin-folder': 'Zwillingsordner',
  'settings.twin-folder.desc': 'Ordner für Zwillings-Metadatendateien. Leer lassen, um Zwillinge neben Anhängen zu platzieren.',
  'settings.twin-folder.placeholder': 'z.B. attachments/twins',
  'settings.exclude-patterns': 'Ausschlussmuster',
  'settings.exclude-patterns.desc': 'Pfadpräfixe, die von der Zwillingserstellung ausgeschlossen werden (eines pro Zeile).',
  'settings.generate-previews': 'Vorschauen generieren',
  'settings.generate-previews.desc': 'Vorschau-Miniaturbilder für Anhänge generieren (Bilder, PDFs, Videos, Audio).',
  'settings.preview-folder': 'Vorschau-Ordner',
  'settings.preview-folder.desc': 'Ordner, in dem generierte Vorschau-Miniaturen gespeichert werden. Leer lassen, um sie neben den Anhängen zu platzieren.',
  'settings.preview-folder.placeholder': 'z. B. attachments/twins/previews',
  'settings.custom-fields': 'Benutzerdefinierte Frontmatter-Felder',
  'settings.custom-fields.desc': 'Zusätzliche Felder für jede Zwillingsdatei (ein "Schlüssel: Wert" pro Zeile). Wird ignoriert, wenn ein Vorlagenpfad gesetzt ist.',
  'settings.templater-enabled': 'Zwilling nach Erstellung mit Templater verarbeiten',
  'settings.templater-enabled.desc': 'Templater auf jedem neu erstellten Zwilling ausführen, damit `<% … %>`-Syntax in der Vorlage aufgelöst wird. Erfordert das Community-Plugin Templater.',
  'settings.templater-path': 'Zwillings-Vorlagendatei',
  'settings.templater-path.desc': 'Wird als Basis-Frontmatter und -Inhalt für jeden neuen Zwilling verwendet. Templater verarbeitet sie, wenn der Schalter oben aktiviert und Templater installiert ist. Leer lassen, um die obigen benutzerdefinierten Felder zu verwenden.',
  'settings.templater-status.not-installed': '⚠ Das Templater-Plugin ist nicht installiert. Zwillinge werden aus der Vorlage unverändert erstellt und `<% … %>`-Felder bleiben literal.',
  'settings.templater-status.empty-path': 'Setze unten eine Vorlagendatei, damit Templater sie verarbeiten kann.',
  'settings.templater-status.template-missing': '⚠ Vorlagendatei im Vault nicht gefunden.',
  'settings.templater-status.no-dynamic-fields': 'Die aktuelle Vorlage hat keine `<% … %>`-Dynamikfelder — Templater ändert nichts.',

  // Base display names
  'base.preview': 'Vorschau',
  'base.attachment': 'Anhang',
  'base.type': 'Typ',
  'base.categories': 'Kategorien',
  'base.size': 'Größe',
  'base.created': 'Erstellt',
  'base.modified': 'Geändert',
} as const;
