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
