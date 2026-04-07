# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Obsidian plugin that creates "twin" markdown files for non-markdown attachments (images, PDFs, videos, audio). Twins contain YAML frontmatter metadata, enabling attachment management via Obsidian's native Bases feature.

## Build & Test Commands

```bash
npm run dev          # esbuild watch mode (rebuilds on save)
npm run build        # TypeScript check + production bundle
npm test             # Run all Jest tests
npm test -- --watch  # Watch mode
npx jest <file>      # Run single test file, e.g. npx jest twin-manager
```

## Development Workflow

This project follows TDD. For every new module:
1. Write `__tests__/<module>.test.ts` with failing tests
2. Implement `src/<module>.ts` to pass
3. Run `npx jest` to verify, then `npm run build`

To test in Obsidian: the `test-vault/` directory is a real vault with the plugin symlinked in `.obsidian/plugins/attachment-bases/`. After building, reload Obsidian with `Cmd+R`.

## Architecture

**Core concept**: non-markdown files in watched folders get "twin" `.md` files in a configurable twin folder. The twin's YAML frontmatter is queryable by Obsidian Bases.

- **`src/main.ts`** — Plugin lifecycle. Registers vault events (`create`/`delete`/`rename`), commands, settings tab, and context menu. Uses `onLayoutReady()` to defer event registration. A `processing` Set prevents concurrent operations on the same path.

- **`src/twin-manager.ts`** — All twin CRUD operations. Depends on a `VaultAdapter` interface (not directly on Obsidian's Vault) so it's testable with `FakeVault`. Methods: `createTwin`, `deleteTwin`, `renameTwin`, `syncAll`, `deleteAllTwins`, `moveTwinsToFolder`. Calls preview generation when `generatePreviews` is enabled.

- **`src/file-utils.ts`** — Pure functions with zero Obsidian imports (uses the `TFile` type only). `shouldProcess()` is the single guard checked before every operation (rejects .md, twin folder, preview thumbnails, excluded paths, non-watched folders). `getTwinPath()` / `getAttachmentPathFromTwin()` handle path mapping between attachments and twins.

- **`src/twin-format.ts`** — Frontmatter generation and merging. `mergeFrontmatter()` overwrites only managed keys (`attachment`, `type`, `categories`, `size`, `created`, `modified`, `preview`) and preserves all user-added keys. `parseCustomFields()` parses user-defined `key: value` lines from settings into extra frontmatter entries.

- **`src/preview-generator.ts`** — Preview logic. Images use the attachment itself as preview. PDF/video/audio generate `.preview.png` thumbnails (requires DOM/canvas, only works inside Obsidian). Pure path logic is unit-tested; rendering functions are runtime-only.

- **`src/base-creator.ts`** — Creates an `Attachments.base` file (YAML) on first install, pre-configured to filter the twin folder.

- **`src/constants.ts`** — Extension-to-type map, managed frontmatter keys list, preview suffix.

- **`src/templater-integration.ts`** — Optional Templater plugin integration. `isTemplaterAvailable()` checks if Templater is installed. `runTemplaterOnFile()` processes a twin file through Templater. Wired via `TwinManager.setTemplaterRunner()` callback.

- **`src/settings.ts`** — Settings interface, defaults, and `PluginSettingTab` UI. Includes `customFields` (user-defined frontmatter), `templaterEnabled`, and `templaterTemplatePath`.

## Testing

Tests use Jest + ts-jest with manual Obsidian mocks at `__mocks__/obsidian.ts`. Test helpers and `FakeVault` (in-memory vault) live in `__tests__/__mocks__/helpers.ts`.

Key design: `file-utils.ts` and `twin-format.ts` are pure functions (no Obsidian dependency). `twin-manager.ts` depends on the `VaultAdapter` interface, tested via `FakeVault`.

## Twin Path Resolution

```
attachmentPath:  attachments/invoices/bill.pdf
watchedFolders:  ["attachments/"]
twinFolder:      attachments/twins

→ Strip watched prefix: invoices/bill.pdf
→ Twin path: attachments/twins/invoices/bill.pdf.md
```

When `twinFolder` is empty, twin goes next to the attachment: `attachments/invoices/bill.pdf.md`.
