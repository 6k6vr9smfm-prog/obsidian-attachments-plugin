import { classifyType } from './file-utils';
import { MANAGED_FRONTMATTER_KEYS } from './constants';
import { AttachmentsAutopilotSettings } from './settings';

export interface FileStat {
  ctime: number;
  mtime: number;
  size: number;
}

export function parseCustomFields(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!raw) return result;

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;
    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    if (key) {
      result[key] = value;
    }
  }

  return result;
}

export interface TwinTemplate {
  /** Raw frontmatter lines from the template, with managed keys stripped. */
  frontmatterLines: string[];
  /** Body content from the template (post-frontmatter). */
  body: string;
}

export function buildTwinContent(
  attachmentPath: string,
  stat: FileStat,
  settings: AttachmentsAutopilotSettings,
  previewValue?: string,
  template?: TwinTemplate | null,
): string {
  const ext = attachmentPath.split('.').pop() || '';
  const type = classifyType(ext);
  const created = new Date(stat.ctime).toISOString().slice(0, 10);
  const modified = new Date(stat.mtime).toISOString().slice(0, 10);
  const preview = previewValue ?? '';

  const lines = [
    '---',
    `attachment: "[[${attachmentPath}]]"`,
    `attachment-type: ${type}`,
    `categories: attachments`,
    `attachment-size: ${stat.size}`,
    `created: ${created}`,
    `modified: ${modified}`,
    preview ? `attachment-preview: "${preview}"` : `attachment-preview: ""`,
  ];

  if (template) {
    // Template's non-managed frontmatter lines are appended verbatim,
    // preserving user formatting (lists, multi-line values, etc.).
    lines.push(...template.frontmatterLines);
    lines.push('---');
    const body = template.body.trim().length > 0
      ? template.body
      : `![[${attachmentPath}]]\n`;
    return lines.join('\n') + '\n\n' + body + (body.endsWith('\n') ? '' : '\n');
  }

  // Fallback: use customFields setting
  const customFields = parseCustomFields(settings.customFields);
  for (const [key, value] of Object.entries(customFields)) {
    lines.push(`${key}: ${value}`);
  }

  lines.push('---');

  return lines.join('\n') + '\n\n' + `![[${attachmentPath}]]` + '\n';
}

/**
 * Extracts non-managed frontmatter lines and body from a template file's content.
 * Preserves raw formatting (lists, multi-line values) by keeping lines verbatim.
 * Returns null if the content has no frontmatter block.
 */
export function extractTemplateFrontmatter(templateContent: string): TwinTemplate {
  if (!templateContent.startsWith('---')) {
    return { frontmatterLines: [], body: templateContent };
  }
  const endIdx = templateContent.indexOf('\n---', 3);
  if (endIdx === -1) {
    return { frontmatterLines: [], body: templateContent };
  }

  const yamlBlock = templateContent.slice(4, endIdx); // skip "---\n"
  let body = templateContent.slice(endIdx + 4); // skip "\n---"
  if (body.startsWith('\n')) body = body.slice(1);
  if (body.startsWith('\n')) body = body.slice(1);

  const managedSet = new Set<string>(MANAGED_FRONTMATTER_KEYS);
  const out: string[] = [];
  let skippingManagedBlock = false;

  for (const line of yamlBlock.split('\n')) {
    // Top-level key line: starts without whitespace and contains ':'
    if (/^\S/.test(line) && line.includes(':')) {
      const key = line.slice(0, line.indexOf(':')).trim();
      skippingManagedBlock = managedSet.has(key);
      if (!skippingManagedBlock) out.push(line);
    } else {
      // Continuation line (indented or blank) — belongs to previous key
      if (!skippingManagedBlock) out.push(line);
    }
  }

  return { frontmatterLines: out, body };
}

export function parseFrontmatter(content: string): { data: Record<string, any>; body: string } {
  const data: Record<string, any> = {};

  if (!content.startsWith('---')) {
    return { data, body: content };
  }

  const endIndex = content.indexOf('\n---', 3);
  if (endIndex === -1) {
    return { data, body: content };
  }

  const yamlBlock = content.slice(4, endIndex);
  const body = content.slice(endIndex + 4); // skip \n---

  let currentKey = '';

  for (const line of yamlBlock.split('\n')) {
    // Continuation line (indented) — belongs to current key
    if (/^\s/.test(line) && currentKey) {
      const trimmed = line.trim();
      // YAML list item: "  - value"
      if (trimmed.startsWith('- ')) {
        const itemValue = trimmed.slice(2).trim();
        if (!Array.isArray(data[currentKey])) {
          data[currentKey] = [];
        }
        data[currentKey].push(itemValue);
      }
      continue;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value: any = line.slice(colonIndex + 1).trim();

    if (!key) continue;
    currentKey = key;

    // Parse quoted strings
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    // Parse numbers
    else if (/^\d+$/.test(value)) {
      value = parseInt(value, 10);
    }

    data[key] = value;
  }

  return { data, body };
}

export function mergeFrontmatter(existingContent: string, generatedContent: string): string {
  const existing = parseFrontmatter(existingContent);
  const generated = parseFrontmatter(generatedContent);

  const managedSet = new Set<string>(MANAGED_FRONTMATTER_KEYS);

  // Start with all generated managed keys
  const merged: Record<string, any> = {};

  // First, copy all managed keys from generated
  for (const key of MANAGED_FRONTMATTER_KEYS) {
    if (key in generated.data) {
      merged[key] = generated.data[key];
    }
  }

  // Then, copy all non-managed keys from existing (user-added)
  for (const [key, value] of Object.entries(existing.data)) {
    if (!managedSet.has(key)) {
      merged[key] = value;
    }
  }

  // Build frontmatter string
  const lines = ['---'];
  for (const [key, value] of Object.entries(merged)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']') && !value.includes('[[')) {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'string' && (value.includes('[[') || value.includes(' '))) {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');

  // Use existing body if it has user content, otherwise use generated body
  const body = existing.body.trim() ? existing.body : generated.body;

  return lines.join('\n') + '\n' + body;
}
