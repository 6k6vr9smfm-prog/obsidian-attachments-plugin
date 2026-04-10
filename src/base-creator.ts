import { TFile } from 'obsidian';
import { AttachmentsAutopilotSettings } from './settings';
import { VaultAdapter } from './twin-manager';
import { t } from './i18n';

const BASE_FILENAME = 'attachments.base';

export function getBaseContent(settings: AttachmentsAutopilotSettings): string {
  const folder = settings.twinFolder || '.';

  return `filters:
  and:
    - file.hasProperty("attachment")
properties:
  attachment-preview:
    displayName: ${t('base.preview')}
  attachment:
    displayName: ${t('base.attachment')}
  attachment-type:
    displayName: ${t('base.type')}
  categories:
    displayName: ${t('base.categories')}
  attachment-size:
    displayName: ${t('base.size')}
  created:
    displayName: ${t('base.created')}
  modified:
    displayName: ${t('base.modified')}
views:
  - type: cards
    name: All Attachments
    image: note.attachment-preview
    imageFit: contain
`;
}

export async function createAttachmentBase(
  vault: VaultAdapter,
  settings: AttachmentsAutopilotSettings,
): Promise<void> {
  const existing = vault.getAbstractFileByPath(BASE_FILENAME);
  if (existing) return;

  const content = getBaseContent(settings);
  await vault.create(BASE_FILENAME, content);
}

export async function recreateAttachmentBase(
  vault: VaultAdapter,
  settings: AttachmentsAutopilotSettings,
): Promise<void> {
  const existing = vault.getAbstractFileByPath(BASE_FILENAME);
  const content = getBaseContent(settings);

  if (existing instanceof TFile) {
    await vault.modify(existing, content);
  } else {
    await vault.create(BASE_FILENAME, content);
  }
}
