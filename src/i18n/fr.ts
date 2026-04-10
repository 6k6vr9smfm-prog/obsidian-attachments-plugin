export default {
  // Commands
  'cmd.sync-all': 'Synchroniser tous les jumeaux de pièces jointes',
  'cmd.generate-previews': 'Générer les aperçus manquants',
  'cmd.move-twins': 'Déplacer les jumeaux vers le dossier configuré',
  'cmd.recreate-base': 'Créer ou mettre à jour le fichier base des pièces jointes',
  'cmd.delete-all-twins': 'Supprimer tous les fichiers jumeaux',
  'cmd.resync-twin': 'Re-synchroniser le fichier jumeau',

  // Notices
  'notice.synced-startup': (created: number, skipped: number) =>
    `${created} jumeau(x) synchronisé(s), ${skipped} ignoré(s).`,
  'notice.synced': (created: number, skipped: number) =>
    `${created} jumeau(x) créé(s), ${skipped} déjà synchronisé(s).`,
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

  // Settings
  'settings.sync-on-startup': 'Synchroniser au démarrage',
  'settings.sync-on-startup.desc': 'Créer automatiquement les fichiers jumeaux pour les nouvelles pièces jointes au démarrage d\'Obsidian.',
  'settings.twin-folder': 'Dossier des jumeaux',
  'settings.twin-folder.desc': 'Dossier de stockage des fichiers de métadonnées jumeaux. Laisser vide pour placer les jumeaux à côté des pièces jointes.',
  'settings.twin-folder.placeholder': 'ex. attachments/twins',
  'settings.watched-folders': 'Dossiers surveillés',
  'settings.watched-folders.desc': 'Surveiller les pièces jointes uniquement dans ces dossiers (un par ligne). Laisser vide pour surveiller tout le coffre.',
  'settings.exclude-patterns': 'Motifs d\'exclusion',
  'settings.exclude-patterns.desc': 'Préfixes de chemin à exclure de la création de jumeaux (un par ligne).',
  'settings.generate-previews': 'Générer les aperçus',
  'settings.generate-previews.desc': 'Générer des miniatures d\'aperçu pour les pièces jointes (images, PDFs, vidéos, audio).',
  'settings.preview-folder': 'Dossier des aperçus',
  'settings.preview-folder.desc': 'Dossier où sont stockées les miniatures générées. Laisser vide pour les placer à côté des pièces jointes.',
  'settings.preview-folder.placeholder': 'ex. attachments/twins/previews',
  'settings.custom-fields': 'Champs frontmatter personnalisés',
  'settings.custom-fields.desc': 'Champs supplémentaires pour chaque fichier jumeau (un « clé: valeur » par ligne). Ignoré si un modèle est configuré.',
  'settings.templater-enabled': 'Intégration Templater',
  'settings.templater-enabled.desc': 'Exécuter Templater sur les fichiers jumeaux après leur création (nécessite le plugin Templater).',
  'settings.templater-path': 'Chemin du modèle Templater',
  'settings.templater-path.desc': 'Chemin vers un modèle dont le frontmatter et le corps sont appliqués aux nouveaux jumeaux (remplace les champs personnalisés). Laisser vide pour utiliser les champs personnalisés.',

  // Base display names
  'base.preview': 'Aperçu',
  'base.attachment': 'Pièce jointe',
  'base.type': 'Type',
  'base.categories': 'Catégories',
  'base.size': 'Taille',
  'base.created': 'Créé',
  'base.modified': 'Modifié',
} as const;
