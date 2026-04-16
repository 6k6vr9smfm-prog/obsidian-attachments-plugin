# Manual E2E Test Plan — Attachments Autopilot

Living checklist for end-to-end testing. Run before releases, after structural changes, and any time the Obsidian mobile app receives a significant update. Automated tests live in `__tests__/`; this file covers everything the Jest suite cannot — real Obsidian lifecycle, real filesystem, real mobile webviews.

## Legend
- `[ ]` not run
- `[X]` passing
- `[!]` failing (link to issue or note below)

## Preconditions

- [ ] `npm run build` completes with no TypeScript errors.
- [ ] `npm test` passes (all Jest suites green).
- [ ] `test-vault/.obsidian/plugins/attachment-bases/` is symlinked to the repo build output.
- [ ] Obsidian desktop reloaded (`Cmd+R` / `Ctrl+R`) on the latest build.
- [ ] Plugin appears enabled in **Settings → Community plugins**.
- [ ] For mobile tests: plugin installed via BRAT or sideloaded into Obsidian Mobile.

## Test vault seeding

Before each section, start from a known baseline:

1. Delete `test-vault/attachments/` and `test-vault/attachments/twins/`.
2. Reset plugin settings to defaults via **Settings → Attachments Autopilot → (reset fields)**.
3. Verify `test-vault/Attachments.base` is present (auto-created on first install).

---

## 1. Reactive flow — file create / delete / rename

### 1.1 Create → twin appears
- [ ] Drop `photo.png` into `attachments/` via Finder / Explorer.
- [ ] A twin appears at `attachments/twins/photo.png.md`.
- [ ] Twin frontmatter contains `attachment`, `attachment-type: image`, `attachment-size`, `created`, `modified`.
- [ ] For images only: `attachment-preview` links to the image itself (no thumbnail file generated).

### 1.2 Create in nested subfolder → twin mirrors structure
- [ ] Drop `attachments/invoices/2024/bill.pdf`.
- [ ] Twin appears at `attachments/twins/invoices/2024/bill.pdf.md` with parent folders auto-created.

### 1.3 Delete attachment → twin removed
- [ ] Delete `attachments/photo.png` from the vault.
- [ ] `attachments/twins/photo.png.md` is removed.
- [ ] Preview thumbnail (if any) is removed.

### 1.4 Rename attachment → twin renamed, in-content refs updated
- [ ] Rename `attachments/photo.png` to `attachments/photo-new.png`.
- [ ] Twin renames to `photo-new.png.md`.
- [ ] Inside the twin, all references to the old path are updated to the new path.
- [ ] Preview thumbnail (if any) renames in lockstep.

### 1.5 Move attachment within watched scope
- [ ] Move `attachments/photo.png` to `attachments/archive/photo.png`.
- [ ] Twin path updates to reflect the new subfolder location.

### 1.6 Move attachment into a non-watched folder
- [ ] Move `attachments/photo.png` to `unwatched/photo.png`.
- [ ] Orphan twin at the old path is cleaned up.
- [ ] No new twin is created at the unwatched destination.

### 1.7 Move attachment from non-watched into a watched folder
- [ ] Move `unwatched/photo.png` to `attachments/photo.png`.
- [ ] A twin is created at the expected watched path.

### 1.8 User-added frontmatter preserved across re-sync
- [ ] Add user-only fields to a twin (e.g. `utility: invoice`, `company: Acme`, plus a body paragraph).
- [ ] Modify the attachment on disk (touch mtime / resize).
- [ ] Trigger a re-sync (context menu → **Re-sync twin file**).
- [ ] Managed keys update (`attachment-size`, `modified`); user keys and body remain untouched.

### 1.9 Excluded patterns are skipped
- [ ] Add `attachments/private` to **Exclude patterns**.
- [ ] Drop `attachments/private/secret.pdf`.
- [ ] No twin is created.
- [ ] Previously created twins under `attachments/private/` are not touched by sync-all.

---

## 2. Commands

### 2.1 Sync all attachment twins
- [ ] With several existing attachments lacking twins, run **Sync all attachment twins**.
- [ ] Notice reports count of created / updated.
- [ ] Every eligible attachment now has a twin.

### 2.2 Generate missing previews
- [ ] Disable previews, import a PDF, then re-enable previews.
- [ ] Run **Generate missing previews**.
- [ ] Notice reports number generated.
- [ ] Twin's `attachment-preview` now points at the thumbnail and the thumbnail file exists.

### 2.3 Move twins to configured folder
- [ ] Change **Twin folder** from `attachments/twins` to `meta/twins`.
- [ ] Run **Move twins to configured folder**.
- [ ] All existing twins are moved with their subfolder structure preserved.
- [ ] Reactive flow continues to create new twins in the new location.

### 2.4 Create/update Attachments base file
- [ ] Run **Create or update Attachments base file**.
- [ ] `Attachments.base` is created or overwritten with the current twin folder filter.
- [ ] Opening the base in Obsidian shows attachment twins.

### 2.5 Delete all twin files
- [ ] Run **Delete all twin files**.
- [ ] All files under the twin folder are removed.
- [ ] Preview thumbnails under the preview folder are also removed.
- [ ] Notice reports the count.

### 2.6 Re-sync single file (context menu)
- [ ] Right-click an attachment in the file explorer.
- [ ] Select **Re-sync twin file**.
- [ ] Twin frontmatter is rebuilt; user-added keys remain.

### 2.7 Import files from device (NEW)
See section 4 for the full cross-platform import matrix.

---

## 3. Settings

### 3.1 Sync on startup toggle
- [ ] Enable, quit Obsidian (`Cmd+Q`), add a new attachment externally, relaunch.
- [ ] Startup sync runs and a notice reports created/updated counts.
- [ ] Note: `Cmd+R` reload does **not** trigger startup sync — this is expected (requires cold start).

### 3.2 Twin folder — custom path
- [ ] Set **Twin folder** to `meta/twins`.
- [ ] Create a new attachment → twin appears under `meta/twins/`.

### 3.3 Twin folder — empty (place next to attachment)
- [ ] Clear **Twin folder**.
- [ ] Create `attachments/photo.png` → twin appears at `attachments/photo.png.md`.

### 3.4 Watched scope (derived from Obsidian's native setting)
- [ ] Set **Settings → Files and links → Default location for new attachments** to `attachments`.
- [ ] Files in `attachments/` get twins; files elsewhere do not.
- [ ] Change the setting to `/` (vault root) → plugin watches the entire vault (all non-md files get twins).

### 3.5 Exclude patterns
- [ ] Add `attachments/private` as an exclusion.
- [ ] Files under that prefix are skipped during reactive and sync-all flows.

### 3.6 Custom frontmatter fields (T3.6 regression)
- [ ] Create several attachments so their twins exist (without custom fields).
- [ ] Add `project: my-project` and `status: unreviewed` to **Custom fields** in settings.
- [ ] Create a **new** attachment → twin contains both fields.
- [ ] Run **Sync all attachment twins** → notice reports N updated.
- [ ] Open a **pre-existing** twin → it now contains `project` and `status` keys (T3.6 fix: syncAll re-merges existing twins).

### 3.7 Templater integration
- [ ] Install Templater.
- [ ] Point **Templater template path** at a template with a `<% tp.date.now() %>` expression.
- [ ] Enable **Templater integration**.
- [ ] Create a new attachment → twin has the expression resolved to an actual date.

### 3.8 Preview folder
- [ ] Change **Preview folder** to `meta/previews`.
- [ ] Create a new PDF → thumbnail lands under `meta/previews/`.

### 3.9 Generate previews toggle
- [ ] Disable → new attachments get no preview value in frontmatter.
- [ ] Enable → new attachments get previews; images reference the file itself, others generate thumbnails.

---

## 4. Import files from device command

### 4.1 Desktop — single file
- [ ] Run **Import files from device**.
- [ ] Native OS file picker appears.
- [ ] Select one image.
- [ ] File lands at Obsidian's configured attachment folder (check **Settings → Files and links → Default location for new attachments**).
- [ ] Twin is created with correct frontmatter.
- [ ] Notice: `Imported 1 file(s).`

### 4.2 Desktop — multiple files, mixed types
- [ ] Select one image, one PDF, one text file from different folders in the picker.
- [ ] All three land at the attachment folder.
- [ ] Each gets a twin with the correct `attachment-type`.
- [ ] Notice reports `Imported 3 file(s).`

### 4.3 Desktop — collision handling
- [ ] Import `photo.png`.
- [ ] Import `photo.png` again (same source file).
- [ ] Second copy is written as `photo 1.png`; a separate twin is created for it.
- [ ] The original `photo.png` twin is untouched.

### 4.4 Desktop — picker cancelled
- [ ] Run the command, close the picker without selecting.
- [ ] No notice appears.
- [ ] No error in the developer console (`Cmd+Option+I`).

### 4.5 Desktop — active-note source path
- [ ] In **Settings → Files and links**, set **Default location for new attachments** to *Subfolder under current folder* → `_attachments`.
- [ ] Open a note at `notes/journal/today.md`.
- [ ] Run the import command and pick a file.
- [ ] File lands at `notes/journal/_attachments/<filename>`.
- [ ] Twin is still created at the expected twin-folder path.

### 4.6 Desktop — import into a watched folder (both paths fire)
- [ ] With Obsidian's attachment folder set to a path **inside** one of the plugin's watched folders (default case), import a file.
- [ ] Twin is created exactly once — no duplicate work, no console errors. (The `processing` Set in `main.ts` dedupes the explicit `createTwin` call against the `vault.on('create')` listener.)

### 4.7 Desktop — import outside watched scope
- [ ] Temporarily set **Default location for new attachments** to a folder outside the watched scope (e.g. `imports/`).
- [ ] Run the import command.
- [ ] File lands in `imports/`; twin is still created via the explicit call.
- [ ] The `vault.on('create')` listener correctly skips this file (it's outside the watched scope), so only our explicit call runs.

### 4.8 Desktop — partial failure
- [ ] Simulate failure: import a file while the attachment folder path is invalid (e.g. contains characters the OS rejects — platform-dependent; skip if hard to reproduce).
- [ ] Command continues with remaining files.
- [ ] A per-file error notice appears for the failing file.
- [ ] Developer console logs `Attachments Autopilot: import failed` with details.

### 4.9 Desktop — insert links modal (active note open)
- [ ] Open a markdown note and place the cursor in the body.
- [ ] Run **Import files from device** and pick 2 files.
- [ ] After import, a modal appears: "Insert links into active note?"
- [ ] Click **Insert** → two `![[path]]` wiki-links are inserted at the cursor position.
- [ ] The links render correctly in reading view.

### 4.10 Desktop — insert links modal (no active note)
- [ ] Close all tabs (or switch to a non-markdown view like Settings).
- [ ] Run **Import files from device** and pick a file.
- [ ] Files are imported, twins created, **no modal appears**.
- [ ] Notice reports the import count normally.

### 4.11 Desktop — insert links modal dismissed
- [ ] Open a markdown note.
- [ ] Run the import command, pick a file.
- [ ] When the modal appears, click **Skip** (or press Escape).
- [ ] No links are inserted. The note is unchanged.

### 4.12 iOS — Files app / iCloud Drive
- [ ] Run the import command on Obsidian Mobile (iOS).
- [ ] The iOS document picker opens.
- [ ] Navigate to iCloud Drive, select a PDF.
- [ ] File is downloaded (if iCloud-hosted) and copied into the vault's attachment folder.
- [ ] Twin appears with correct frontmatter.
- [ ] **Expected**: no PDF thumbnail is generated — this is an existing mobile limitation, not a regression.
- [ ] Notice: `Imported 1 file(s).`

### 4.13 iOS — Photos / Camera Roll
- [ ] Run the import command.
- [ ] Switch to **Photos** in the picker and select an image.
- [ ] Image lands in the attachment folder.
- [ ] Twin has `attachment-type: image` and `attachment-preview` references the image itself.
- [ ] The image displays in the twin's preview (images always work, even on mobile).

### 4.14 iOS — multiple files
- [ ] Select 3+ files in a single picker session.
- [ ] All are imported, all get twins.
- [ ] No mobile console errors (view via Obsidian Mobile's "show debug console" developer toggle, if enabled).

### 4.15 iOS — picker cancelled
- [ ] Open the picker, cancel without selecting.
- [ ] No notice, no error.

### 4.16 Android — Storage Access Framework picker
- [ ] Run the import command on Obsidian Mobile (Android).
- [ ] Android SAF picker opens.
- [ ] Select a file from **Downloads** or **Drive**.
- [ ] File is copied into the attachment folder and twin is created.

### 4.17 Android — multiple files from different sources
- [ ] Select files from both Downloads and Drive in one session (if SAF allows it).
- [ ] All are imported.

---

## 5. Preview generation (per type)

### 5.1 Image — uses file itself
- [ ] Import or drop `photo.png`.
- [ ] Twin's `attachment-preview` equals the image wiki-link.
- [ ] No separate `.preview.png` is generated in the preview folder.

### 5.2 PDF — first-page thumbnail (desktop only)
- [ ] Drop `document.pdf`.
- [ ] Thumbnail appears in the preview folder.
- [ ] Twin's `attachment-preview` points to it.
- [ ] The thumbnail is a rasterized first page.

### 5.2b PDF in subfolder — thumbnail generated on first create (reactive race fix)
- [ ] Drop `attachments/invoices/2024/report.pdf` (nested subfolder).
- [ ] Twin appears at `attachments/twins/invoices/2024/report.pdf.md`.
- [ ] Thumbnail `.preview.png` is generated on the **first** reactive create — no need to run "Generate missing previews" afterwards.
- [ ] If this fails, it's a regression of the 0.6.9 fix (TFile threading into preview generator).

### 5.3 Video — frame-at-1s (desktop only)
- [ ] Drop `clip.mp4`.
- [ ] Thumbnail appears showing a frame approximately 1 second in.
- [ ] If the codec isn't decodable, a color-fallback image is used instead (no hard failure).

### 5.4 Audio — color placeholder (desktop only)
- [ ] Drop `song.mp3`.
- [ ] Thumbnail is a colored placeholder with a ♫ symbol.
- [ ] Color is deterministic per filename.

### 5.5 Other — color placeholder
- [ ] Drop `archive.zip`.
- [ ] Twin is created with a color-fallback preview.

### 5.6 Mobile — preview generation (0.7.1 enablement)
Previously the plugin skipped all thumbnail generation on mobile. As of 0.7.1 the DOM guard is gone and mobile runs the same code path as desktop. The try/catch around generation still absorbs platform failures.
- [ ] On iOS, import a PDF. Expected: thumbnail file is created under the preview folder and appears in the twin's `attachment-preview`.
- [ ] On iOS, import an MP4. Expected: either a real video frame thumbnail or a color-placeholder fallback (never a broken link).
- [ ] On iOS, import an MP3. Expected: ♫ color-placeholder thumbnail.
- [ ] On iOS, import a ZIP. Expected: extension-labeled color-placeholder.
- [ ] Repeat on Android.
- [ ] For any failing type on a given platform, capture the mobile debug console error (prefix `Attachments Autopilot: failed to generate preview for …`) and file an issue. Failures should be logged, not silent, and should never crash the twin creation.

---

## 6. Cross-cutting regression checks

### 6.1 Plugin enable / disable cycle
- [ ] Disable the plugin; re-enable.
- [ ] Existing twins are untouched.
- [ ] New attachments are still twinned.
- [ ] No duplicate event registrations (verify by dropping a file once and confirming only one twin is created).

### 6.2 Plugin reload on `Cmd+R`
- [ ] After reload, commands still work.
- [ ] Settings tab still renders without error.

### 6.3 Fresh install flow
- [ ] Delete `test-vault/.obsidian/plugins/attachment-bases/data.json`.
- [ ] Reload Obsidian.
- [ ] Plugin initializes with defaults.
- [ ] `Attachments.base` is auto-created.

### 6.4 Concurrent events don't double-twin
- [ ] Drop 10 attachments at once (bulk file drop).
- [ ] Exactly 10 twins are created; no duplicates, no "file not found" errors in the console.

### 6.5 Large vault sync-all
- [ ] Seed the vault with 100+ existing attachments.
- [ ] Run **Sync all attachment twins**.
- [ ] Completes in reasonable time (subjective; note duration).
- [ ] All twins are present.

### 6.6 Vault on iCloud (macOS)
- [ ] Place the test vault inside iCloud Drive.
- [ ] Repeat sections 1 and 4.1–4.2.
- [ ] No filesystem race errors; twins are created correctly even with iCloud sync running.

---

## 7. Reporting

For each session, record results in `E2E-test-results-<round>.md`:

- Date, platform, Obsidian version, plugin version.
- Which sections were run.
- Failing checks with reproduction steps and developer console output.
- Environmental notes (vault location, iCloud on/off, Obsidian mobile build number).

Failing checks should produce a GitHub issue or backlog entry before the round is closed.
