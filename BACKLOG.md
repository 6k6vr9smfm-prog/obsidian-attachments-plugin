# Obsidian Attachments Plugin — Backlog

## Legend
- `[ ]` todo
- `[~]` in progress
- `[x]` done

---

## Phase 1 — Core scaffold [x]
- [x] Plugin scaffold and esbuild setup
- [x] Companion note creation on file add
- [x] Companion note deletion on file delete
- [x] Companion note rename on file rename
- [x] Sync all command (manual trigger)
- [x] Sync on startup

---

## Phase 3 — Settings UI [x]
- [x] Settings tab
- [x] `syncOnStartup` toggle
- [x] `companionFolder` (empty = next to attachment, or custom path e.g. `_meta`)
- [x] `excludePatterns` (comma-separated path prefixes to skip)

---

## Phase 2 — Rich metadata [ ]

> **Library constraints:** Must use pure-JS libraries only (no native binaries) to stay cross-platform (macOS/Windows/Linux).
> Candidates: `exifr` (EXIF), `pdf-parse` (PDF), `music-metadata` (audio), `mediainfo.js` (video — WASM-based).

- [ ] EXIF data for images (date taken, GPS, camera model, dimensions) — `exifr`
- [ ] PDF metadata (page count, title, author) — `pdf-parse`
- [ ] Audio metadata (duration, bitrate, artist, album, title) — `music-metadata`
- [ ] Video metadata (duration, dimensions, codec) — `mediainfo.js`
- [ ] Graceful fallback when metadata extraction fails

---

## Phase 4 — Backlog (future)
- [ ] Manual "re-sync single file" command from context menu
- [ ] Companion note template customization (user-defined frontmatter fields)
- [ ] Bulk delete all companion notes command
- [ ] Support for companion folder per attachment type (images → `_meta/images/`)
- [ ] Show companion status in file explorer (icon or badge)
