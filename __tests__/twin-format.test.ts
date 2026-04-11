import { makeSettings } from './__mocks__/helpers';
import {
  buildTwinContent,
  parseFrontmatter,
  mergeFrontmatter,
  parseCustomFields,
  extractTemplateFrontmatter,
} from '../src/twin-format';

const stat = { ctime: 1712188800000, mtime: 1712275200000, size: 2048 };

describe('buildTwinContent', () => {
  const settings = makeSettings();

  it('produces YAML frontmatter with correct fields', () => {
    const content = buildTwinContent('attachments/photo.png', stat, settings);
    expect(content).toContain('---');
    expect(content).toContain('attachment: "[[attachments/photo.png]]"');
    expect(content).toContain('attachment-type: image');
    expect(content).toContain('categories: attachments');
    expect(content).toContain('attachment-size: 2048');
    expect(content).toContain('attachment-preview: ""');
    expect(content).not.toContain('extension:');
  });

  it('includes an embed of the attachment in the body', () => {
    const content = buildTwinContent('attachments/photo.png', stat, settings);
    expect(content).toContain('![[attachments/photo.png]]');
  });

  it('classifies PDF correctly', () => {
    const content = buildTwinContent('attachments/doc.pdf', stat, settings);
    expect(content).toContain('attachment-type: pdf');
  });

  it('classifies video correctly', () => {
    const content = buildTwinContent('attachments/clip.mp4', stat, settings);
    expect(content).toContain('attachment-type: video');
  });

  it('classifies audio correctly', () => {
    const content = buildTwinContent('attachments/song.mp3', stat, settings);
    expect(content).toContain('attachment-type: audio');
  });

  it('classifies unknown extension as other', () => {
    const content = buildTwinContent('attachments/archive.zip', stat, settings);
    expect(content).toContain('attachment-type: other');
  });

  it('includes created and modified dates as ISO strings', () => {
    const content = buildTwinContent('attachments/photo.png', stat, settings);
    // ctime 1712188800000 = 2024-04-04T00:00:00.000Z
    expect(content).toContain('created: 2024-04-04');
    expect(content).toContain('modified: 2024-04-05');
  });

  it('includes custom fields when provided via settings', () => {
    const withCustom = makeSettings({ customFields: 'project: my-project\nstatus: unreviewed' });
    const content = buildTwinContent('attachments/photo.png', stat, withCustom);
    expect(content).toContain('project: my-project');
    expect(content).toContain('status: unreviewed');
  });

  it('does not add extra lines when customFields is empty', () => {
    const content = buildTwinContent('attachments/photo.png', stat, settings);
    const lines = content.split('\n').filter((l) => l.trim() !== '' && l !== '---');
    // Should only have managed keys + embed
    const frontmatterLines = lines.filter((l) => !l.startsWith('!'));
    expect(frontmatterLines.length).toBe(7); // attachment, type, categories, size, created, modified, preview
  });

  it('has frontmatter delimiters as first and after last property', () => {
    const content = buildTwinContent('attachments/photo.png', stat, settings);
    const lines = content.split('\n');
    expect(lines[0]).toBe('---');
    // Find second ---
    const secondDelim = lines.indexOf('---', 1);
    expect(secondDelim).toBeGreaterThan(0);
  });
});

describe('parseFrontmatter', () => {
  it('parses YAML frontmatter into key-value pairs', () => {
    const content = `---
attachment: "[[photo.png]]"
attachment-type: image
attachment-size: 1024
custom_field: hello
---

![[photo.png]]`;
    const result = parseFrontmatter(content);
    expect(result.data['attachment']).toBe('[[photo.png]]');
    expect(result.data['attachment-type']).toBe('image');
    expect(result.data['attachment-size']).toBe(1024);
    expect(result.data['custom_field']).toBe('hello');
  });

  it('returns body content below frontmatter', () => {
    const content = `---
attachment-type: image
---

Some body content`;
    const result = parseFrontmatter(content);
    expect(result.body.trim()).toBe('Some body content');
  });

  it('returns empty data for content without frontmatter', () => {
    const content = 'Just plain text';
    const result = parseFrontmatter(content);
    expect(result.data).toEqual({});
    expect(result.body).toBe('Just plain text');
  });

  it('handles quoted and unquoted string values', () => {
    const content = `---
quoted: "hello world"
unquoted: hello
---`;
    const result = parseFrontmatter(content);
    expect(result.data['quoted']).toBe('hello world');
    expect(result.data['unquoted']).toBe('hello');
  });
});

describe('mergeFrontmatter', () => {
  it('overwrites managed keys with new values', () => {
    const existing = `---
attachment: "[[old.png]]"
attachment-type: image
attachment-size: 500
custom_tag: important
---

User notes here`;

    const generated = `---
attachment: "[[new.png]]"
attachment-type: image
categories: attachments
attachment-size: 2048
created: 2024-04-04
modified: 2024-04-05
attachment-preview: ""
---

![[new.png]]`;

    const merged = mergeFrontmatter(existing, generated);
    // Managed keys updated
    expect(merged).toContain('attachment: "[[new.png]]"');
    expect(merged).toContain('attachment-size: 2048');
    expect(merged).toContain('categories: attachments');
    // User key preserved
    expect(merged).toContain('custom_tag: important');
    // User body preserved
    expect(merged).toContain('User notes here');
  });

  it('preserves user-added keys not in managed set', () => {
    const existing = `---
attachment: "[[photo.png]]"
attachment-type: image
utility: invoice
company: Acme Corp
---`;

    const generated = `---
attachment: "[[photo.png]]"
attachment-type: image
categories: attachments
attachment-size: 1024
created: 2024-04-04
modified: 2024-04-04
attachment-preview: ""
---

![[photo.png]]`;

    const merged = mergeFrontmatter(existing, generated);
    expect(merged).toContain('utility: invoice');
    expect(merged).toContain('company: "Acme Corp"');
  });

  it('adds new managed keys that were missing from existing', () => {
    const existing = `---
attachment: "[[photo.png]]"
attachment-type: image
---`;

    const generated = `---
attachment: "[[photo.png]]"
attachment-type: image
categories: attachments
attachment-size: 1024
created: 2024-04-04
modified: 2024-04-04
attachment-preview: ""
---

![[photo.png]]`;

    const merged = mergeFrontmatter(existing, generated);
    expect(merged).toContain('categories: attachments');
    expect(merged).toContain('attachment-size: 1024');
  });

  it('keeps user body when existing has custom content', () => {
    const existing = `---
attachment: "[[photo.png]]"
attachment-type: image
---

My custom notes about this file.
Very important stuff.`;

    const generated = `---
attachment: "[[photo.png]]"
attachment-type: image
categories: attachments
attachment-size: 1024
created: 2024-04-04
modified: 2024-04-04
attachment-preview: ""
---

![[photo.png]]`;

    const merged = mergeFrontmatter(existing, generated);
    expect(merged).toContain('My custom notes about this file.');
    expect(merged).toContain('Very important stuff.');
  });

  it('propagates new non-managed keys from generated when missing in existing', () => {
    // T3.6 regression: user adds customFields to settings AFTER twins already exist.
    // On re-sync, the newly-generated content carries the new fields, and the
    // merge must forward them into the existing twin (without clobbering any
    // manual edits the user may have made).
    const existing = `---
attachment: "[[attachments/photo.png]]"
attachment-type: image
categories: attachments
attachment-size: 1024
created: 2024-04-04
modified: 2024-04-04
attachment-preview: ""
---

![[attachments/photo.png]]`;

    const generated = `---
attachment: "[[attachments/photo.png]]"
attachment-type: image
categories: attachments
attachment-size: 1024
created: 2024-04-04
modified: 2024-04-04
attachment-preview: ""
project: my-project
status: unreviewed
---

![[attachments/photo.png]]`;

    const merged = mergeFrontmatter(existing, generated);
    expect(merged).toContain('project: my-project');
    expect(merged).toContain('status: unreviewed');
  });

  it('does not overwrite manually-edited non-managed keys with generated values', () => {
    // The user has tweaked `project: my-project` → `project: renamed`; a later
    // re-sync should NOT replace it with whatever customFields currently say.
    const existing = `---
attachment: "[[attachments/photo.png]]"
attachment-type: image
project: renamed-by-user
---`;

    const generated = `---
attachment: "[[attachments/photo.png]]"
attachment-type: image
categories: attachments
attachment-size: 1024
created: 2024-04-04
modified: 2024-04-04
attachment-preview: ""
project: my-project
---

![[attachments/photo.png]]`;

    const merged = mergeFrontmatter(existing, generated);
    expect(merged).toContain('project: renamed-by-user');
    expect(merged).not.toContain('project: my-project');
  });

  it('preserves custom fields from settings through merge', () => {
    const existing = `---
attachment: "[[attachments/photo.png]]"
attachment-type: image
categories: attachments
attachment-size: 1024
created: 2024-04-04
modified: 2024-04-04
attachment-preview: ""
project: my-project
---`;

    const generated = `---
attachment: "[[attachments/photo.png]]"
attachment-type: image
categories: attachments
attachment-size: 2048
created: 2024-04-04
modified: 2024-04-05
attachment-preview: ""
project: my-project
---

![[attachments/photo.png]]`;

    const merged = mergeFrontmatter(existing, generated);
    expect(merged).toContain('project: my-project');
    expect(merged).toContain('attachment-size: 2048');
  });
});

describe('parseFrontmatter — YAML lists', () => {
  it('parses single-line YAML list values', () => {
    const content = `---
tags: [alpha, beta]
attachment-type: image
---

body`;
    const result = parseFrontmatter(content);
    expect(result.data['tags']).toBe('[alpha, beta]');
  });

  it('parses multi-line YAML list values', () => {
    const content = `---
tags:
  - alpha
  - beta
attachment-type: image
---

body`;
    const result = parseFrontmatter(content);
    expect(result.data['tags']).toEqual(['alpha', 'beta']);
  });

  it('parses mixed scalar and list fields', () => {
    const content = `---
attachment-type: image
tags:
  - one
  - two
custom: hello
---`;
    const result = parseFrontmatter(content);
    expect(result.data['attachment-type']).toBe('image');
    expect(result.data['tags']).toEqual(['one', 'two']);
    expect(result.data['custom']).toBe('hello');
  });

  it('handles empty list value (key with no items)', () => {
    const content = `---
tags:
attachment-type: image
---`;
    const result = parseFrontmatter(content);
    expect(result.data['tags']).toBe('');
    expect(result.data['attachment-type']).toBe('image');
  });
});

describe('mergeFrontmatter — YAML lists', () => {
  it('preserves user-added list values through merge', () => {
    const existing = `---
attachment: "[[attachments/photo.png]]"
attachment-type: image
categories: attachments
attachment-size: 1024
created: 2024-04-04
modified: 2024-04-04
attachment-preview: ""
tags:
  - mi-tag-custom
---

![[attachments/photo.png]]`;

    const generated = `---
attachment: "[[attachments/photo.png]]"
attachment-type: image
categories: attachments
attachment-size: 2048
created: 2024-04-04
modified: 2024-04-05
attachment-preview: ""
---

![[attachments/photo.png]]`;

    const merged = mergeFrontmatter(existing, generated);
    expect(merged).toContain('tags:');
    expect(merged).toContain('  - mi-tag-custom');
  });

  it('preserves user-added inline list values through merge', () => {
    const existing = `---
attachment: "[[attachments/photo.png]]"
attachment-type: image
categories: attachments
attachment-size: 1024
created: 2024-04-04
modified: 2024-04-04
attachment-preview: ""
tags: [alpha, beta]
---`;

    const generated = `---
attachment: "[[attachments/photo.png]]"
attachment-type: image
categories: attachments
attachment-size: 2048
created: 2024-04-04
modified: 2024-04-05
attachment-preview: ""
---

![[attachments/photo.png]]`;

    const merged = mergeFrontmatter(existing, generated);
    expect(merged).toContain('tags: [alpha, beta]');
  });
});

describe('parseCustomFields', () => {
  it('parses key: value lines into a record', () => {
    const result = parseCustomFields('project: my-project\nstatus: unreviewed');
    expect(result).toEqual({ project: 'my-project', status: 'unreviewed' });
  });

  it('trims whitespace from keys and values', () => {
    const result = parseCustomFields('  project :  my-project  ');
    expect(result).toEqual({ project: 'my-project' });
  });

  it('skips blank lines', () => {
    const result = parseCustomFields('project: my-project\n\nstatus: done');
    expect(result).toEqual({ project: 'my-project', status: 'done' });
  });

  it('skips lines without colons', () => {
    const result = parseCustomFields('invalid line\nproject: ok');
    expect(result).toEqual({ project: 'ok' });
  });

  it('returns empty record for empty string', () => {
    expect(parseCustomFields('')).toEqual({});
  });

  it('handles values with colons', () => {
    const result = parseCustomFields('url: https://example.com');
    expect(result).toEqual({ url: 'https://example.com' });
  });
});

describe('extractTemplateFrontmatter', () => {
  it('returns template frontmatter lines and body when present', () => {
    const src = '---\nstatus: unreviewed\nproject: inbox\n---\n\n## Notes\n';
    const result = extractTemplateFrontmatter(src);
    expect(result.frontmatterLines).toEqual(['status: unreviewed', 'project: inbox']);
    expect(result.body).toBe('## Notes\n');
  });

  it('strips managed keys from template frontmatter', () => {
    const src = '---\nstatus: unreviewed\nattachment: "should-be-ignored"\ncategories: foo\ntags: bar\n---\nbody\n';
    const result = extractTemplateFrontmatter(src);
    expect(result.frontmatterLines).toEqual(['status: unreviewed', 'tags: bar']);
  });

  it('preserves multi-line list values (indented continuations)', () => {
    const src = '---\ntags:\n  - a\n  - b\nstatus: open\n---\nbody\n';
    const result = extractTemplateFrontmatter(src);
    expect(result.frontmatterLines).toEqual(['tags:', '  - a', '  - b', 'status: open']);
  });

  it('drops continuation lines of stripped managed keys', () => {
    const src = '---\ncategories:\n  - a\n  - b\nstatus: open\n---\n';
    const result = extractTemplateFrontmatter(src);
    expect(result.frontmatterLines).toEqual(['status: open']);
  });

  it('preserves Templater expressions verbatim', () => {
    const src = '---\nprocessed-at: <% tp.date.now("YYYY-MM-DD") %>\n---\nbody\n';
    const result = extractTemplateFrontmatter(src);
    expect(result.frontmatterLines).toEqual(['processed-at: <% tp.date.now("YYYY-MM-DD") %>']);
  });

  it('returns whole content as body when there is no frontmatter', () => {
    const src = 'no frontmatter here\njust body\n';
    const result = extractTemplateFrontmatter(src);
    expect(result.frontmatterLines).toEqual([]);
    expect(result.body).toBe(src);
  });
});

describe('buildTwinContent with template', () => {
  const settings = makeSettings();

  it('uses template frontmatter lines when template is provided', () => {
    const template = {
      frontmatterLines: ['status: unreviewed', 'project: inbox'],
      body: '## Notes\n',
    };
    const content = buildTwinContent('attachments/photo.png', stat, settings, '', template);
    expect(content).toContain('status: unreviewed');
    expect(content).toContain('project: inbox');
    // Managed keys still present
    expect(content).toContain('attachment: "[[attachments/photo.png]]"');
    expect(content).toContain('attachment-type: image');
    // Template body replaces default embed
    expect(content).toContain('## Notes');
    expect(content).not.toContain('![[attachments/photo.png]]');
  });

  it('ignores customFields when a template is provided', () => {
    const s = makeSettings({ customFields: 'ignored: true' });
    const template = { frontmatterLines: ['status: open'], body: '' };
    const content = buildTwinContent('attachments/photo.png', stat, s, '', template);
    expect(content).not.toContain('ignored: true');
    expect(content).toContain('status: open');
  });

  it('falls back to default embed when template body is empty', () => {
    const template = { frontmatterLines: [], body: '' };
    const content = buildTwinContent('attachments/photo.png', stat, settings, '', template);
    expect(content).toContain('![[attachments/photo.png]]');
  });
});
