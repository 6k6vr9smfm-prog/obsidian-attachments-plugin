# Attachments Manager

An Obsidian plugin that makes vault attachments queryable in [Obsidian Bases](https://obsidian.md/bases).

Attachments (images, PDFs, audio, video) are invisible to Bases — you can't filter, sort, or build views around them. This plugin generates a companion "twin" `.md` note for every attachment, populated with frontmatter metadata that Bases can query. It also generates thumbnail previews for PDFs and videos, and uses the file itself as the preview for images.

## How it works

When you add `photo.jpg` to a watched folder, the plugin creates `photo.jpg.md`:

```yaml
---
is_twin_file: true
attachment_file: "[[photo.jpg]]"
preview: "[[photo.jpg]]"
categories:
  - attachments
type: image
extension: jpg
size: 204800
created: 2026-03-01
modified: 2026-03-12
---

![[photo.jpg]]
```

The plugin also creates an `attachments.base` file — an Obsidian Base pre-configured to show all twins as a card gallery with preview images.

Twins stay in sync automatically: renaming or deleting an attachment renames or deletes its twin and thumbnail.

## Features

- **Automatic twin creation** — twins are created as soon as attachments appear in watched folders
- **Thumbnail previews** — auto-generated PNG thumbnails for PDFs (first page) and videos (frame capture), images use themselves
- **Lifecycle sync** — renaming or deleting an attachment updates or removes its twin and thumbnail
- **Sync on startup** — catches attachments added while the plugin was off
- **Attachments Base** — auto-generated `.base` file with a card view filtered to twin files
- **Templater support** — use a custom Templater template for twin content; metadata fields are always preserved
- **Watched folders** — limit the plugin to specific folders, or watch the entire vault
- **Twins folder** — store all twins in a dedicated folder instead of next to each attachment
- **Exclude patterns** — skip specific folders or paths
- **Right-click resync** — resync a single attachment from the file context menu

## Supported file types

| Type  | Extensions                                   | Thumbnail          |
|-------|----------------------------------------------|--------------------|
| Image | jpg, jpeg, png, gif, webp, svg, bmp, tiff    | Uses file itself   |
| PDF   | pdf                                          | First page render  |
| Audio | mp3, wav, ogg, m4a, flac, aac                | Generated icon     |
| Video | mp4, webm, mov, mkv, avi                     | Frame capture      |

## Commands

All commands are available from the command palette (`Cmd/Ctrl+P`):

| Command | Description |
|---------|-------------|
| Sync all attachment twin files | Create twins for any attachments that don't have one yet |
| Create Attachments Base | Generate the `.base` file for Bases card view |
| Move all twin files to configured folder | Bulk-move twins to the configured twins folder |
| Create default twin template | Generate the default Templater template |
| Delete all twin files | Remove all twin files and thumbnails (confirmation required) |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Sync on startup | On | Create missing twins automatically when the plugin loads |
| Twins folder | `attachments/twins` | Where twin files are stored. Leave empty to place next to each attachment |
| Watched folders | `attachments` | Comma-separated folders to watch. Leave empty to watch the entire vault |
| Templater template | `templates/attachment.md` | Path to a Templater template for twin content. Leave empty for default. Use `tp.file.title` in the template to reference the attachment filename |
| Exclude patterns | *(empty)* | Comma-separated path prefixes to ignore (e.g. `archive/, private/`) |

## Installation

### From the community plugin browser

1. Open Settings > Community Plugins
2. Search for **Attachments Manager**
3. Click Install, then Enable

### Manual (BRAT)

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Add this repository URL: `https://github.com/6k6vr9smfm-prog/obsidian-attachments-plugin`
3. Enable the plugin in Settings > Community Plugins

### Manual

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/6k6vr9smfm-prog/obsidian-attachments-plugin/releases/latest)
2. Create `.obsidian/plugins/attachment-bases/` in your vault
3. Copy both files there
4. Enable the plugin in Settings > Community Plugins

## License

MIT
