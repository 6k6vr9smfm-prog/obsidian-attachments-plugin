# Obsidian Attachments Plugin — Backlog

## Legend
- `[ ]` todo
- `[~]` in progress
- `[x]` done

---

- [x] Plugin scaffold and esbuild setup
- [x] Companion note creation on file add
- [x] Companion note deletion on file delete
- [x] Companion note rename on file rename
- [x] Sync all command (manual trigger)
- [x] Sync on startup
- [x] Settings tab
- [x] `syncOnStartup` toggle
- [x] `companionFolder` (empty = next to attachment, or custom path e.g. `_meta`)
- [x] `excludePatterns` (comma-separated path prefixes to skip)
- [x] Auto-create an Obsidian Base on plugin install (pre-configured to query companion notes)
- [x] Configure watched folder — limit the plugin to listen for attachments only in a specific folder
- [ ] EXIF data for images (date taken, GPS, camera model, dimensions) — `exifr`
- [ ] PDF metadata (page count, title, author) — `pdf-parse`
- [ ] Audio metadata (duration, bitrate, artist, album, title) — `music-metadata`
- [ ] Video metadata (duration, dimensions, codec) — `mediainfo.js`
- [ ] Graceful fallback when metadata extraction fails
- [ ] Templater integration — use a Templater template for companion note content instead of the built-in format
- [ ] Manual "re-sync single file" command from context menu
- [ ] Companion note template customization (user-defined frontmatter fields)
- [x] Bulk delete all companion notes command
- [x] Command to move all existing companion notes to the currently configured companion folder
- [ ] Default watched folders to `attachments/` and companion folder to `mdpairs/` on first install (create folders if they don't exist)
- [ ] Support for companion folder per attachment type (images → `_meta/images/`)
- [ ] Show companion status in file explorer (icon or badge)
