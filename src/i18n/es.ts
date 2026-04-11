export default {
  // Commands
  'cmd.sync-all': 'Sincronizar todos los gemelos de adjuntos',
  'cmd.generate-previews': 'Generar vistas previas faltantes',
  'cmd.move-twins': 'Mover gemelos a la carpeta configurada',
  'cmd.recreate-base': 'Crear o actualizar archivo base de adjuntos',
  'cmd.delete-all-twins': 'Eliminar todos los archivos gemelos',
  'cmd.resync-twin': 'Re-sincronizar archivo gemelo',
  'cmd.import-files': 'Importar archivos desde el dispositivo',

  // Notices
  'notice.synced-startup': (created: number, skipped: number) =>
    `${created} gemelo(s) sincronizado(s), ${skipped} omitido(s).`,
  'notice.synced': (created: number, skipped: number) =>
    `${created} gemelo(s) creado(s), ${skipped} ya sincronizado(s).`,
  'notice.missing-previews': (count: number) =>
    `${count} adjunto(s) sin vista previa. Ejecuta "Generar vistas previas faltantes" para corregir.`,
  'notice.generated-previews': (count: number) =>
    `${count} vista(s) previa(s) generada(s).`,
  'notice.moved-twins': (count: number, folder: string) =>
    `${count} archivo(s) gemelo(s) movido(s) a ${folder}.`,
  'notice.base-created': 'Archivo base creado/actualizado.',
  'notice.deleted-twins': (count: number) =>
    `${count} archivo(s) gemelo(s) eliminado(s).`,
  'notice.resynced': (name: string) =>
    `Gemelo re-sincronizado para ${name}`,
  'notice.imported': (imported: number, failed: number) =>
    failed > 0
      ? `${imported} archivo(s) importado(s), ${failed} fallido(s).`
      : `${imported} archivo(s) importado(s).`,
  'notice.import-failed': (name: string, error: string) =>
    `Error al importar ${name}: ${error}`,

  // Settings
  'settings.sync-on-startup': 'Sincronizar al iniciar',
  'settings.sync-on-startup.desc': 'Crear automáticamente archivos gemelos para nuevos adjuntos al iniciar Obsidian.',
  'settings.twin-folder': 'Carpeta de gemelos',
  'settings.twin-folder.desc': 'Carpeta donde se almacenan los archivos de metadatos gemelos. Dejar vacío para colocarlos junto a los adjuntos.',
  'settings.twin-folder.placeholder': 'ej. attachments/twins',
  'settings.exclude-patterns': 'Patrones de exclusión',
  'settings.exclude-patterns.desc': 'Prefijos de ruta a excluir de la creación de gemelos (uno por línea).',
  'settings.generate-previews': 'Generar vistas previas',
  'settings.generate-previews.desc': 'Generar miniaturas de vista previa para adjuntos (imágenes, PDFs, videos, audio).',
  'settings.preview-folder': 'Carpeta de vistas previas',
  'settings.preview-folder.desc': 'Carpeta donde se guardan las miniaturas generadas. Déjalo vacío para colocarlas junto a los adjuntos.',
  'settings.preview-folder.placeholder': 'ej. attachments/twins/previews',
  'settings.custom-fields': 'Campos personalizados de frontmatter',
  'settings.custom-fields.desc': 'Campos adicionales para cada archivo gemelo (un "clave: valor" por línea). Se ignora si hay una plantilla configurada.',
  'settings.templater-enabled': 'Integración con Templater',
  'settings.templater-enabled.desc': 'Ejecutar Templater en archivos gemelos después de su creación (requiere el plugin Templater).',
  'settings.templater-path': 'Ruta de plantilla Templater',
  'settings.templater-path.desc': 'Ruta a una plantilla cuyo frontmatter y cuerpo se aplican a los nuevos gemelos (reemplaza los campos personalizados). Dejar vacío para usar los campos personalizados.',

  // Base display names
  'base.preview': 'Vista previa',
  'base.attachment': 'Adjunto',
  'base.type': 'Tipo',
  'base.categories': 'Categorías',
  'base.size': 'Tamaño',
  'base.created': 'Creado',
  'base.modified': 'Modificado',
} as const;
