export default {
  // Commands
  'cmd.sync-all': 'Sincronizza tutti i gemelli degli allegati',
  'cmd.generate-previews': 'Genera anteprime mancanti',
  'cmd.move-twins': 'Sposta i gemelli nella cartella configurata',
  'cmd.recreate-base': 'Crea o aggiorna il file base degli allegati',
  'cmd.delete-all-twins': 'Elimina tutti i file gemelli',
  'cmd.resync-twin': 'Ri-sincronizza il file gemello',

  // Notices
  'notice.synced-startup': (created: number, skipped: number) =>
    `${created} gemello/i sincronizzato/i, ${skipped} saltato/i.`,
  'notice.synced': (created: number, skipped: number) =>
    `${created} gemello/i creato/i, ${skipped} già sincronizzato/i.`,
  'notice.missing-previews': (count: number) =>
    `${count} allegato/i senza anteprima. Esegui "Genera anteprime mancanti" per correggere.`,
  'notice.generated-previews': (count: number) =>
    `${count} anteprima/e generata/e.`,
  'notice.moved-twins': (count: number, folder: string) =>
    `${count} file gemello/i spostato/i in ${folder}.`,
  'notice.base-created': 'File base creato/aggiornato.',
  'notice.deleted-twins': (count: number) =>
    `${count} file gemello/i eliminato/i.`,
  'notice.resynced': (name: string) =>
    `Gemello ri-sincronizzato per ${name}`,

  // Settings
  'settings.sync-on-startup': 'Sincronizza all\'avvio',
  'settings.sync-on-startup.desc': 'Crea automaticamente i file gemelli per i nuovi allegati all\'avvio di Obsidian.',
  'settings.twin-folder': 'Cartella dei gemelli',
  'settings.twin-folder.desc': 'Cartella dove vengono salvati i file di metadati gemelli. Lasciare vuoto per posizionarli accanto agli allegati.',
  'settings.twin-folder.placeholder': 'es. attachments/twins',
  'settings.watched-folders': 'Cartelle monitorate',
  'settings.watched-folders.desc': 'Monitorare gli allegati solo in queste cartelle (una per riga). Lasciare vuoto per monitorare l\'intero vault.',
  'settings.exclude-patterns': 'Modelli di esclusione',
  'settings.exclude-patterns.desc': 'Prefissi di percorso da escludere dalla creazione dei gemelli (uno per riga).',
  'settings.generate-previews': 'Genera anteprime',
  'settings.generate-previews.desc': 'Genera miniature di anteprima per gli allegati (immagini, PDF, video, audio).',
  'settings.preview-folder': 'Cartella delle anteprime',
  'settings.preview-folder.desc': 'Cartella dove vengono salvate le miniature generate. Lascia vuoto per posizionarle accanto agli allegati.',
  'settings.preview-folder.placeholder': 'es. attachments/twins/previews',
  'settings.custom-fields': 'Campi frontmatter personalizzati',
  'settings.custom-fields.desc': 'Campi aggiuntivi per ogni file gemello (un "chiave: valore" per riga). Ignorato se è impostato un modello.',
  'settings.templater-enabled': 'Integrazione Templater',
  'settings.templater-enabled.desc': 'Esegui Templater sui file gemelli dopo la creazione (richiede il plugin Templater).',
  'settings.templater-path': 'Percorso del modello Templater',
  'settings.templater-path.desc': 'Percorso di un modello il cui frontmatter e corpo vengono applicati ai nuovi gemelli (sostituisce i campi personalizzati). Lasciare vuoto per usare i campi personalizzati.',

  // Base display names
  'base.preview': 'Anteprima',
  'base.attachment': 'Allegato',
  'base.type': 'Tipo',
  'base.categories': 'Categorie',
  'base.size': 'Dimensione',
  'base.created': 'Creato',
  'base.modified': 'Modificato',
} as const;
