# Attachments Autopilot

An Obsidian plugin that automatically creates queryable "twin" markdown files for your non-markdown attachments (images, PDFs, videos, audio, and more), so you can manage them like any other note — and browse them through Obsidian's native [Bases](https://help.obsidian.md/bases) feature.

## Why?

Obsidian Bases is great for querying markdown notes by frontmatter, but attachments don't have frontmatter. This plugin solves that by creating a small companion `.md` file ("twin") for every attachment in watched folders. The twin holds metadata (file type, size, created/modified dates, categories, optional preview), and on first install the plugin drops a pre-configured `Attachments.base` file that turns that metadata into a filterable gallery.

Everything is automatic: drop an image into a watched folder and its twin appears. Rename or delete the attachment and its twin follows. Your twin files stay in sync with your vault.

## Features

- **Automatic twin files** — new attachments get a twin created instantly, renamed/deleted ones are kept in sync.
- **Base integration** — ships with a pre-configured `Attachments.base` file so the gallery works out of the box.
- **Preview thumbnails** — optionally generates `.png` thumbnails for PDFs, videos, and audio. Images use themselves as the preview.
- **Templater support** — optionally run [Templater](https://github.com/SilentVoid13/Templater) on new twins to inject dynamic content.
- **Custom frontmatter fields** — add your own `key: value` fields to every twin.
- **Watched folders and exclude patterns** — scope what gets tracked.
- **Safe merging** — regenerating a twin only overwrites managed keys; your user-added frontmatter is preserved.
- **Multi-language UI** — English, Spanish, French, German, Italian.

## How it works

For every file in a watched folder (default: `attachments/`), the plugin creates a twin markdown file in the configured twin folder (default: `attachments/twins/`) mirroring the attachment's relative path:

```
attachments/invoices/bill.pdf
    → attachments/twins/invoices/bill.pdf.md
```

The twin's frontmatter looks something like:

```yaml
---
attachment: "[[attachments/invoices/bill.pdf]]"
type: pdf
categories: [document]
size: 238411
created: 2026-02-14
modified: 2026-02-14
attachment-preview: "[[attachments/twins/previews/invoices/bill.pdf.preview.png]]"
---
```

You can then query these twins using Bases, Dataview, or any other plugin that reads frontmatter.

## Installation

### From the Community Plugins browser (recommended)

1. Open Obsidian Settings → **Community plugins** → **Browse**.
2. Search for "Attachments Autopilot".
3. Click **Install**, then **Enable**.

### Manual installation

1. Download `main.js`, `manifest.json` from the [latest release](https://github.com/6k6vr9smfm-prog/obsidian-attachments-plugin/releases/latest).
2. Copy them into `YOUR_VAULT/.obsidian/plugins/attachments-autopilot/`.
3. Reload Obsidian and enable the plugin.

## Getting started

1. Enable the plugin. On first load, it creates an `Attachments.base` file pre-configured to filter the twin folder.
2. Drop a file into the `attachments/` folder (or whatever you've set as your watched folder). Its twin will appear in `attachments/twins/` automatically.
3. Open `Attachments.base` to see your attachment gallery.

## Commands

- **Sync all attachment twins** — scan watched folders and create any missing twins.
- **Generate missing previews** — (re)generate thumbnails for twins that are missing them.
- **Move twins to configured folder** — bulk-move twins if you change the twin folder location.
- **Create or update Attachments base file** — recreate the default `Attachments.base` file.
- **Delete all twin files** — wipe every twin and preview (ask before you run this).
- **Re-sync twin file** — right-click an attachment in the file explorer to rebuild just its twin.

## Settings

| Setting | Description |
| --- | --- |
| **Sync on startup** | Scan and create missing twins when Obsidian loads. |
| **Twin folder** | Where twins are stored. Empty = next to the attachment. |
| **Watched folders** | Paths that trigger twin creation (one per line). |
| **Exclude patterns** | Path prefixes to ignore. |
| **Generate previews** | Enable thumbnail generation for PDFs, video, audio. |
| **Preview folder** | Where thumbnails are stored. |
| **Custom frontmatter fields** | Extra `key: value` lines added to every twin. |
| **Templater integration** | Run Templater on new twins (requires Templater plugin). |
| **Templater template path** | Path to a template file. Its frontmatter and body are merged into new twins. |

## Contributing

Pull requests are welcome. The codebase follows TDD — see `CLAUDE.md` for the architecture overview. To work on the plugin:

```bash
npm install
npm run dev          # esbuild watch mode
npm test             # run Jest tests
npm run build        # TypeScript check + production bundle
```

## License

[MIT](./LICENSE)
