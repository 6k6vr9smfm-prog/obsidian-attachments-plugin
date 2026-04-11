# Obsidian Attachments Plugin — Features

## Legend
- `[ ]` todo
- `[~]` in progress
- `[X]` done

---

- [X] Plugin scaffold and setup
- [X] Twin file creation on file add
- [X] Twin file deletion on file delete
- [X] Twin file rename on file rename
- [X] Sync all command (manual trigger)
- [X] Sync on startup
- [X] Settings tab
- [X] `syncOnStartup` toggle
- [X] `twinFolder` (empty = next to attachment, or custom path e.g. `attachments/twins`)
- [X] `excludePatterns` (comma-separated path prefixes to skip)
- [X] Auto-create an Obsidian Base on plugin install (pre-configured to query twin files)
- [X] Configure watched folders — limit the plugin to listen for attachments only in specific folders
- [X] Default watched folders to `attachments/` and twin folder to `attachments/twins/` on first install
- [X] Bulk delete all twin files command
- [X] Command to move all existing twin files to the currently configured twin folder
- [X] Manual "re-sync single file" command from context menu
- [X] Previews for images — `preview` property references the attachment directly, no thumbnail generated
- [X] Previews for PDFs — first page rendered to PNG via Obsidian's `loadPdfJs()` API
- [X] Previews for videos — frame at t=1s via HTML5 video + canvas; color fallback for unsupported codecs
- [X] Previews for audio — color-from-filename placeholder with ♫ symbol
- [X] `generatePreviews` toggle in settings
- [X] Preview thumbnails auto-excluded from twin creation
- [X] Templater integration — use a Templater template for twin file content instead of the built-in format
- [X] Twin file template customization (user-defined frontmatter fields)
- [X] Mobile compatibility — skip preview generation on platforms without DOM (Obsidian Mobile)
- [X] Rename plugin to "Attachments Autopilot" and prep for Obsidian community submission
- [X] "Import files from device" command — cross-platform (desktop, iOS, Android) multi-file import via native picker; honors Obsidian's native attachment folder setting
- [X] MANUAL-TESTS.md — living E2E checklist covering reactive flow, commands, settings, previews, and import
- [X] 0.6.7 — fix `moveTwinsToFolder` (T2.3): detect twins by canonical `attachment:` frontmatter so the command is resilient to the UI mutating `settings.twinFolder` before invocation
- [X] 0.6.7 — fix `mergeFrontmatter` (T3.6): forward non-managed keys from the generated content to existing twins on re-sync, so new `customFields` propagate without clobbering manual edits
- [X] 0.6.7 — flip `generatePreviews` default to `true` so new installs get thumbnails out of the box
- [X] 0.6.8 — drop `watchedFolders` setting; derive the plugin's scope from Obsidian's native `Files and links → Default location for new attachments` (supports absolute paths, `/`, `./`, `./subfolder`)
- [X] 0.6.8 — refactor `generateMissingPreviews` to discover twins via the canonical `attachment:` frontmatter key, so it's resilient to runtime scope changes (same pattern as the 0.6.7 `moveTwinsToFolder` fix)
- [X] 0.6.9 — fix T3.6 for real: `syncAll` now always runs the read-modify-write path instead of early-returning on existing twins, so newly-added `customFields` propagate to pre-existing twins. Notice shape changed from `{ created, skipped }` to `{ created, updated }`. The 0.6.7 `mergeFrontmatter` fix was correct but unreachable.
- [X] 0.6.9 — fix reactive PDF preview race: `generatePreviewThumbnail` now takes the `TFile` from the create event directly instead of re-resolving via `getAbstractFileByPath`, which could return null before Obsidian finished indexing the new file (visible on PDFs created in subfolders).

---

## Open

### Investigations
- [ ] **Levantar el gate móvil de preview generation.** El check `typeof document === 'undefined'` en `preview-generator.ts:70` puede ser excesivamente conservador — WKWebView sí tiene `document`. Verificar empíricamente en iOS si PDF.js + canvas funcionan; si sí, eliminar el gate y dar previews móviles "gratis". External APIs descartados (privacidad, coste, review).

### Deferred features
- [ ] **Insertar wiki-links después del import.** Toggle opcional para añadir `![[file]]` en la nota activa al cursor tras ejecutar el comando de import.
- [ ] **Drag-and-drop import.** Ruta UX paralela al comando — soltar archivos desde el OS sobre la ventana de Obsidian.

### Validación pendiente (MANUAL-TESTS.md sección 4)
- [ ] T4.1–T4.8 desktop: single, multi, collision, cancel, source-path activo, dentro/fuera de watched folders, partial failure.
- [ ] T4.9–T4.12 iOS: Files/iCloud, Photos, multi, cancel.
- [ ] T4.13–T4.14 Android SAF: Downloads + multi-source.
- [ ] T5.6 confirmar gate móvil para PDF/video/audio sin errores en consola.
- [ ] T6.6 vault en iCloud (macOS), repetir flow reactivo + import.

### Mantenimiento
- [ ] **GitHub Actions Node 20 → 24.** El workflow `release.yml` usa `actions/checkout@v4`, `actions/setup-node@v4`, `softprops/action-gh-release@v2`, todos sobre Node 20. Forzado a Node 24 el 2 de junio de 2026; Node 20 eliminado el 16 de septiembre de 2026.

### Próximos releases
- [ ] (sin planificar)
