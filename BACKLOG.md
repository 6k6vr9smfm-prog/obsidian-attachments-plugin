# Obsidian Attachments Plugin — Backlog

## Legend
- `[ ]` todo
- `[~]` in progress
- `[x]` done

---

- [x] Plugin scaffold and esbuild setup
- [x] Twin file creation on file add
- [x] Twin file deletion on file delete
- [x] Twin file rename on file rename
- [x] Sync all command (manual trigger)
- [x] Sync on startup
- [x] Settings tab
- [x] `syncOnStartup` toggle
- [x] `twinFolder` (empty = next to attachment, or custom path e.g. `attachments/twins`)
- [x] `excludePatterns` (comma-separated path prefixes to skip)
- [x] Auto-create an Obsidian Base on plugin install (pre-configured to query twin files)
- [x] Configure watched folders — limit the plugin to listen for attachments only in specific folders
- [x] Default watched folders to `attachments/` and twin folder to `attachments/twins/` on first install
- [x] Bulk delete all twin files command
- [x] Command to move all existing twin files to the currently configured twin folder
- [x] Manual "re-sync single file" command from context menu
- [x] Previews for images — `preview` property references the attachment directly, no thumbnail generated
- [x] Previews for PDFs — first page rendered to PNG via Obsidian's `loadPdfJs()` API
- [x] Previews for videos — frame at t=1s via HTML5 video + canvas; color fallback for unsupported codecs
- [x] Previews for audio — color-from-filename placeholder with ♫ symbol
- [x] `generatePreviews` toggle in settings
- [x] Preview thumbnails auto-excluded from twin creation
- [ ] EXIF data for images (date taken, GPS, camera model, dimensions) — `exifr`
- [ ] PDF metadata (page count, title, author) — via `loadPdfJs()`
- [ ] Audio metadata (duration, bitrate, artist, album, title) — `music-metadata`
- [ ] Video metadata (duration, dimensions, codec) — `mediainfo.js`
- [ ] Graceful fallback when metadata extraction fails
- [ ] Templater integration — use a Templater template for twin file content instead of the built-in format
- [ ] Twin file template customization (user-defined frontmatter fields)
- [ ] Support for twin folder per attachment type (images → `_meta/images/`)
- [ ] Show twin status in file explorer (icon or badge)
