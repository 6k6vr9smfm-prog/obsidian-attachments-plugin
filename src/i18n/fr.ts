export default {
  // Commands
  'cmd.sync-all': 'Synchroniser tous les jumeaux de pièces jointes',
  'cmd.generate-previews': 'Générer les aperçus manquants',
  'cmd.move-twins': 'Déplacer les jumeaux vers le dossier configuré',
  'cmd.recreate-base': 'Créer ou mettre à jour le fichier base des pièces jointes',
  'cmd.delete-all-twins': 'Supprimer tous les fichiers jumeaux',
  'cmd.resync-twin': 'Re-synchroniser le fichier jumeau',
  'cmd.import-files': 'Importer des fichiers depuis l\'appareil',

  // Notices
  'notice.synced-startup': (created: number, updated: number) =>
    `Jumeaux synchronisés — ${created} créé(s), ${updated} mis à jour.`,
  'notice.synced': (created: number, updated: number) =>
    `Jumeaux synchronisés — ${created} créé(s), ${updated} mis à jour.`,
  'notice.missing-previews': (count: number) =>
    `${count} pièce(s) jointe(s) sans aperçu. Exécutez « Générer les aperçus manquants » pour corriger.`,
  'notice.generated-previews': (count: number) =>
    `${count} aperçu(s) généré(s).`,
  'notice.moved-twins': (count: number, folder: string) =>
    `${count} fichier(s) jumeau(x) déplacé(s) vers ${folder}.`,
  'notice.base-created': 'Fichier base créé/mis à jour.',
  'notice.deleted-twins': (count: number) =>
    `${count} fichier(s) jumeau(x) supprimé(s).`,
  'notice.resynced': (name: string) =>
    `Jumeau re-synchronisé pour ${name}`,
  'notice.imported': (imported: number, failed: number) =>
    failed > 0
      ? `${imported} fichier(s) importé(s), ${failed} échoué(s).`
      : `${imported} fichier(s) importé(s).`,
  'notice.preview-failed-single': (name: string) =>
    `Impossible de générer l'aperçu de ${name}.`,
  'notice.preview-failed-multi': (count: number) =>
    `Impossible de générer les aperçus de ${count} fichier(s).`,
  'modal.insert-links-title': 'Insérer les liens dans la note active ?',
  'modal.insert-links-desc': (count: number) =>
    `Insérer ${count} wiki-lien(s) à la position du curseur dans la note active.`,
  'modal.insert-links-yes': 'Insérer',
  'modal.insert-links-no': 'Ignorer',
  'modal.bulk-templater-title': 'Exécuter Templater sur chaque nouveau jumeau ?',
  'modal.bulk-templater-desc': (count: number) =>
    `Vous importez ${count} fichiers. Si vous continuez, Templater vous demandera de remplir les champs du modèle une fois par fichier. Choisissez « Ignorer » pour créer les jumeaux maintenant et exécuter Templater plus tard sur des jumeaux individuels.`,
  'modal.bulk-templater-yes': 'Exécuter Templater sur chacun',
  'modal.bulk-templater-no': 'Ignorer pour ce lot',

  // Settings
  'settings.sync-on-startup': 'Synchroniser au démarrage',
  'settings.sync-on-startup.desc': 'Créer automatiquement les fichiers jumeaux pour les nouvelles pièces jointes au démarrage d\'Obsidian.',
  'settings.twin-folder': 'Dossier des jumeaux',
  'settings.twin-folder.desc': 'Dossier de stockage des fichiers de métadonnées jumeaux. Laisser vide pour placer les jumeaux à côté des pièces jointes.',
  'settings.twin-folder.placeholder': 'ex. attachments/twins',
  'settings.exclude-patterns': 'Motifs d\'exclusion',
  'settings.exclude-patterns.desc': 'Préfixes de chemin à exclure de la création de jumeaux (un par ligne).',
  'settings.generate-previews': 'Générer les aperçus',
  'settings.generate-previews.desc': 'Générer des miniatures d\'aperçu pour les pièces jointes (images, PDFs, vidéos, audio).',
  'settings.preview-folder': 'Dossier des aperçus',
  'settings.preview-folder.desc': 'Dossier où sont stockées les miniatures générées. Laisser vide pour les placer à côté des pièces jointes.',
  'settings.preview-folder.placeholder': 'ex. attachments/twins/previews',
  'settings.custom-fields': 'Champs frontmatter personnalisés',
  'settings.custom-fields.desc': 'Champs supplémentaires pour chaque fichier jumeau (un « clé: valeur » par ligne). Ignoré si un modèle est configuré.',
  'settings.templater-enabled': 'Traiter le jumeau avec Templater après création',
  'settings.templater-enabled.desc': 'Exécuter Templater sur chaque jumeau nouvellement créé pour que la syntaxe `<% … %>` du modèle soit résolue. Nécessite le plugin communautaire Templater.',
  'settings.templater-path': 'Fichier modèle du jumeau',
  'settings.templater-path.desc': 'Utilisé comme base de frontmatter et de corps pour chaque nouveau jumeau. Templater le traite si la bascule ci-dessus est activée et que Templater est installé. Laisser vide pour utiliser les champs personnalisés ci-dessus.',
  'settings.templater-status.not-installed': '⚠ Le plugin Templater n\'est pas installé. Les jumeaux seront créés à partir du modèle tel quel et les champs `<% … %>` resteront littéraux.',
  'settings.templater-status.empty-path': 'Définissez un fichier modèle ci-dessous pour que Templater le traite.',
  'settings.templater-status.template-missing': '⚠ Fichier modèle introuvable dans le vault.',
  'settings.templater-status.no-dynamic-fields': 'Le modèle actuel n\'a pas de champs dynamiques `<% … %>` — Templater ne changera rien.',

  // Base display names
  'base.preview': 'Aperçu',
  'base.attachment': 'Pièce jointe',
  'base.type': 'Type',
  'base.categories': 'Catégories',
  'base.size': 'Taille',
  'base.created': 'Créé',
  'base.modified': 'Modifié',
} as const;
