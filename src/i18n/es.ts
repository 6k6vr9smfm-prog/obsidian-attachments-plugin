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
  'notice.synced-startup': (created: number, updated: number) =>
    `Gemelos sincronizados — ${created} creado(s), ${updated} actualizado(s).`,
  'notice.synced': (created: number, updated: number) =>
    `Gemelos sincronizados — ${created} creado(s), ${updated} actualizado(s).`,
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
  'notice.preview-failed-single': (name: string) =>
    `No se pudo generar la vista previa de ${name}.`,
  'notice.preview-failed-multi': (count: number) =>
    `No se pudieron generar las vistas previas de ${count} archivo(s).`,
  'modal.insert-links-title': 'Insertar enlaces en la nota activa?',
  'modal.insert-links-desc': (count: number) =>
    `Insertar ${count} wiki-link(s) en la posición del cursor en la nota activa.`,
  'modal.insert-links-yes': 'Insertar',
  'modal.insert-links-no': 'Omitir',
  'modal.bulk-templater-title': '¿Ejecutar Templater en cada nuevo gemelo?',
  'modal.bulk-templater-desc': (count: number) =>
    `Estás importando ${count} archivos. Si continúas, Templater te pedirá completar los campos de la plantilla una vez por archivo. Elige "Omitir" para crear los gemelos ahora y ejecutar Templater más tarde en gemelos individuales.`,
  'modal.bulk-templater-yes': 'Ejecutar Templater en cada uno',
  'modal.bulk-templater-no': 'Omitir en este lote',

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
  'settings.templater-enabled': 'Procesar gemelo con Templater tras la creación',
  'settings.templater-enabled.desc': 'Ejecutar Templater en cada nuevo gemelo para que la sintaxis `<% … %>` de la plantilla se resuelva. Requiere el plugin de la comunidad Templater.',
  'settings.templater-path': 'Archivo de plantilla del gemelo',
  'settings.templater-path.desc': 'Se usa como frontmatter y cuerpo base para cada nuevo gemelo. Templater lo procesa si el interruptor de arriba está activado y Templater está instalado. Dejar vacío para usar los campos personalizados de arriba.',
  'settings.templater-status.not-installed': '⚠ El plugin Templater no está instalado. Los gemelos se crearán con la plantilla tal cual y los campos `<% … %>` quedarán literales.',
  'settings.templater-status.empty-path': 'Configura un archivo de plantilla abajo para que Templater lo procese.',
  'settings.templater-status.template-missing': '⚠ Archivo de plantilla no encontrado en el vault.',
  'settings.templater-status.no-dynamic-fields': 'La plantilla actual no tiene campos dinámicos `<% … %>` — Templater no cambiará nada.',

  // Base display names
  'base.preview': 'Vista previa',
  'base.attachment': 'Adjunto',
  'base.type': 'Tipo',
  'base.categories': 'Categorías',
  'base.size': 'Tamaño',
  'base.created': 'Creado',
  'base.modified': 'Modificado',
} as const;
