export default {
  // Commands
  'cmd.sync-all': 'Sincronizza tutti i gemelli degli allegati',
  'cmd.generate-previews': 'Genera anteprime mancanti',
  'cmd.move-twins': 'Sposta i gemelli nella cartella configurata',
  'cmd.recreate-base': 'Crea o aggiorna il file base degli allegati',
  'cmd.delete-all-twins': 'Elimina tutti i file gemelli',
  'cmd.resync-twin': 'Ri-sincronizza il file gemello',
  'cmd.import-files': 'Importa file dal dispositivo',

  // Notices
  'notice.synced-startup': (created: number, updated: number) =>
    `Gemelli sincronizzati — ${created} creato/i, ${updated} aggiornato/i.`,
  'notice.synced': (created: number, updated: number) =>
    `Gemelli sincronizzati — ${created} creato/i, ${updated} aggiornato/i.`,
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
  'notice.imported': (imported: number, failed: number) =>
    failed > 0
      ? `${imported} file importato/i, ${failed} fallito/i.`
      : `${imported} file importato/i.`,
  'notice.preview-failed-single': (name: string) =>
    `Impossibile generare l'anteprima di ${name}.`,
  'notice.preview-failed-multi': (count: number) =>
    `Impossibile generare le anteprime di ${count} file.`,
  'modal.insert-links-title': 'Inserire i link nella nota attiva?',
  'modal.insert-links-desc': (count: number) =>
    `Inserire ${count} wiki-link alla posizione del cursore nella nota attiva.`,
  'modal.insert-links-yes': 'Inserisci',
  'modal.insert-links-no': 'Salta',
  'modal.bulk-templater-title': 'Eseguire Templater su ogni nuovo gemello?',
  'modal.bulk-templater-desc': (count: number) =>
    `Stai importando ${count} file. Se continui, Templater ti chiederà di compilare i campi del modello una volta per file. Scegli "Salta" per creare i gemelli ora ed eseguire Templater in seguito su gemelli singoli.`,
  'modal.bulk-templater-yes': 'Esegui Templater su ciascuno',
  'modal.bulk-templater-no': 'Salta per questo lotto',

  // Settings
  'settings.sync-on-startup': 'Sincronizza all\'avvio',
  'settings.sync-on-startup.desc': 'Crea automaticamente i file gemelli per i nuovi allegati all\'avvio di Obsidian.',
  'settings.twin-folder': 'Cartella dei gemelli',
  'settings.twin-folder.desc': 'Cartella dove vengono salvati i file di metadati gemelli. Lasciare vuoto per posizionarli accanto agli allegati.',
  'settings.twin-folder.placeholder': 'es. attachments/twins',
  'settings.exclude-patterns': 'Modelli di esclusione',
  'settings.exclude-patterns.desc': 'Prefissi di percorso da escludere dalla creazione dei gemelli (uno per riga).',
  'settings.generate-previews': 'Genera anteprime',
  'settings.generate-previews.desc': 'Genera miniature di anteprima per gli allegati (immagini, PDF, video, audio).',
  'settings.preview-folder': 'Cartella delle anteprime',
  'settings.preview-folder.desc': 'Cartella dove vengono salvate le miniature generate. Lascia vuoto per posizionarle accanto agli allegati.',
  'settings.preview-folder.placeholder': 'es. attachments/twins/previews',
  'settings.custom-fields': 'Campi frontmatter personalizzati',
  'settings.custom-fields.desc': 'Campi aggiuntivi per ogni file gemello (un "chiave: valore" per riga). Ignorato se è impostato un modello.',
  'settings.templater-enabled': 'Elabora il gemello con Templater dopo la creazione',
  'settings.templater-enabled.desc': 'Esegui Templater su ogni gemello appena creato affinché la sintassi `<% … %>` nel modello venga risolta. Richiede il plugin della comunità Templater.',
  'settings.templater-path': 'File modello del gemello',
  'settings.templater-path.desc': 'Usato come frontmatter e corpo di base per ogni nuovo gemello. Templater lo elabora se l\'interruttore sopra è attivo e Templater è installato. Lasciare vuoto per usare i campi personalizzati sopra.',
  'settings.templater-status.not-installed': '⚠ Il plugin Templater non è installato. I gemelli saranno creati dal modello così com\'è e i campi `<% … %>` resteranno letterali.',
  'settings.templater-status.empty-path': 'Imposta un file modello sotto affinché Templater lo elabori.',
  'settings.templater-status.template-missing': '⚠ File modello non trovato nel vault.',
  'settings.templater-status.no-dynamic-fields': 'Il modello attuale non ha campi dinamici `<% … %>` — Templater non cambierà nulla.',

  // Base display names
  'base.preview': 'Anteprima',
  'base.attachment': 'Allegato',
  'base.type': 'Tipo',
  'base.categories': 'Categorie',
  'base.size': 'Dimensione',
  'base.created': 'Creato',
  'base.modified': 'Modificato',
} as const;
