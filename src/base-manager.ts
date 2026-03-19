import { App, TFile } from "obsidian";

const BASE_FILE_NAME = "Attachments.base";

const BASE_CONTENT = `filters:
  and:
    - attachment != null
views:
  - type: table
    name: Table
    order:
      - attachment
      - type
      - size
      - created
`;

export async function createAttachmentsBase(app: App): Promise<void> {
  const existing = app.vault.getAbstractFileByPath(BASE_FILE_NAME);
  if (existing instanceof TFile) {
    await app.vault.modify(existing, BASE_CONTENT);
  } else {
    await app.vault.create(BASE_FILE_NAME, BASE_CONTENT);
  }
}
