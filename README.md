# Attachment Bases

An Obsidian plugin that creates companion markdown notes for your vault attachments, making them fully queryable through [Obsidian Bases](https://obsidian.md/bases).

## Why

Attachments (images, PDFs, audio, video) are invisible to Obsidian Bases — you can't filter, sort, or build views around them. This plugin solves that by automatically generating a companion `.md` note for every attachment, populated with frontmatter metadata that Bases can query.

A file like `photo.jpg` gets a companion `photo.jpg.md`:

```yaml
---
attachment: "[[photo.jpg]]"
type: image
extension: jpg
size: 204800
created: 2026-03-01
modified: 2026-03-12
---

![[photo.jpg]]
```

You can then build Bases views to filter by type, sort by date, search by size, and more — across all your attachments.

## Features

- Automatically creates companion notes when attachments are added
- Keeps companions in sync on rename and delete
- **Sync on startup** — catches any attachments added while the plugin was off
- **Manual sync** — command palette: `Sync all attachment companions`
- **Companion folder** — store all companion notes in a dedicated folder (e.g. `_meta`) instead of next to each attachment
- **Exclude patterns** — skip specific folders or paths

## Supported file types

| Type  | Extensions |
|-------|-----------|
| Image | jpg, jpeg, png, gif, webp, svg, bmp, tiff |
| PDF   | pdf |
| Audio | mp3, wav, ogg, m4a, flac, aac |
| Video | mp4, webm, mov, mkv, avi |

## Settings

| Setting | Description |
|---------|-------------|
| Sync on startup | Automatically sync all attachments when Obsidian opens |
| Companion folder | Folder to store companion notes (leave empty to place them next to each attachment) |
| Exclude patterns | Comma-separated list of path prefixes to skip (e.g. `archive/, templates/`) |

## Installation

### From the community plugin browser
1. Open Obsidian Settings → Community Plugins
2. Search for **Attachment Bases**
3. Click Install, then Enable

### Manual
1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/6k6vr9smfm-prog/obsidian-attachments-plugin/releases/latest)
2. Copy them to `.obsidian/plugins/attachment-bases/` in your vault
3. Enable the plugin in Settings → Community Plugins

## License

MIT
