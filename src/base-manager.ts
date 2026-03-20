import { App, TFile } from "obsidian";

const DEFAULT_BASE_NAME = "attachments.base";

const BASE_CONTENT = `filters:
  and:
    - is_twin_file == true
views:
  - type: cards
    name: Cards
    order:
      - file.basename
      - created
    image: note.preview
`;

function getBaseName(watchedFolders: string[]): string {
  if (watchedFolders.length !== 1) return DEFAULT_BASE_NAME;
  const folder = watchedFolders[0].replace(/\/$/, "");
  const name = folder.split("/").pop() ?? folder;
  return `${name}.base`;
}

export async function createAttachmentsBase(app: App, watchedFolders: string[]): Promise<void> {
  const fileName = getBaseName(watchedFolders);
  const existing = app.vault.getAbstractFileByPath(fileName);
  if (existing instanceof TFile) {
    await app.vault.modify(existing, BASE_CONTENT);
  } else {
    await app.vault.create(fileName, BASE_CONTENT);
  }
}
