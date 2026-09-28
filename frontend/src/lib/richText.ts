/**
 * Turns pasted HTML into markdown.
 *
 * The pack editor stores markdown, and the student reader renders markdown
 * without `rehype-raw` (so raw HTML is escaped, by design). That means content
 * copied out of Google Docs, Word or a webpage would otherwise be stored as
 * literal `<p>` and `<b>` tags and show up as visible tag soup.
 *
 * This is intentionally a small whitelist-based converter rather than a
 * dependency: the only HTML that reaches the editor is whatever a human pasted,
 * and every tag we do not understand is unwrapped so its text still survives.
 *
 * Plain-text and already-markdown pastes are returned untouched, so pasting from
 * another markdown field never gets mangled.
 */

/** Tags we recognise. Anything outside this list is not treated as HTML. */
const KNOWN_TAGS = [
  'a', 'b', 'blockquote', 'br', 'code', 'del', 'div', 'em', 'font', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'hr', 'i', 'ins', 'li', 'mark', 'ol', 'p', 'pre', 's', 'small', 'span', 'strike',
  'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
];

const KNOWN_TAG_RE = new RegExp(`</?(?:${KNOWN_TAGS.join('|')})(?:\\s[^>]*)?/?>`, 'i');

/**
 * Cap for a single rich-text pack field.
 *
 * The backend truncates at this same number (`backend/src/lib/richText.ts`,
 * `RICH_TEXT_MAX`), so the two must stay in step: if the client capped lower, an
 * admin would lose content the server would have kept, and if it capped higher,
 * a save would look successful while quietly discarding the tail.
 */
export const RICH_TEXT_MAX = 20000;

/**
 * Clamp a field to `RICH_TEXT_MAX` the same way the backend will.
 *
 * The editor warns past the cap rather than blocking the keystroke, so this is
 * what runs at save time. Trimming at a line boundary where possible means an
 * over-long field loses a whole trailing line instead of half a code fence,
 * which would render the remainder as inline code.
 */
export const clampRichText = (input: string, max: number = RICH_TEXT_MAX): string => {
  // Guard on type, not just length: section_data is admin-authored and the
  // backend stores it verbatim, so a field can legitimately hold a number or
  // null by the time it reaches here. Throwing here would turn one bad field
  // into a failed save for the entire pack.
  if (typeof input !== 'string' || input.length <= max) return input;
  const cut = input.slice(0, max);
  const lastBreak = cut.lastIndexOf('\n');
  return lastBreak > max * 0.5 ? cut.slice(0, lastBreak) : cut;
};

/**
 * The pack's rich-text fields, as dotted paths from the root of `section_data`.
 *
 * This is the authoritative list for clamping, and it is deliberately NOT the
 * whole document: `cheatsheets[].content` and `interview_questions[].code` are
 * preformatted (monospace, rendered in a `<pre>`), so clamping them at an
 * arbitrary character would be the same as corrupting them. The backend mirror
 * in `backend/src/lib/richText.ts` must cover the same paths or the two will
 * disagree about what a save keeps.
 */
export const RICH_TEXT_PATHS = [
  'overview.companyInfo',
  'overview.eligibility',
  'overview.salaryBreakdown',
  'overview.reviews.[].text',
  'core_subjects.[].topics.[].content',
  'core_subjects.[].topics.[].pyqs.[].question',
  'core_subjects.[].topics.[].pyqs.[].answer',
  'interview_questions.[].question',
  'interview_questions.[].solution',
  'cheatsheets.[].summary',
  'never_skip_topics.[].notes',
  'hr_round.[].question',
  'hr_round.[].answer',
] as const;

/** Resolve a path containing `[]` wildcards to every string it reaches. */
export const resolveRichTextValues = (root: unknown, path: string): string[] => {
  if (path === '') return typeof root === 'string' ? [root] : [];
  const dot = path.indexOf('.');
  const segment = dot === -1 ? path : path.slice(0, dot);
  const rest = dot === -1 ? '' : path.slice(dot + 1);
  const node = root as any;
  if (segment === '[]') {
    // A bare `[]` is the wildcard for "each element of the array I am already
    // inside". It appears whenever a path descends through a nested array, e.g.
    // `overview.reviews.[].text` — the segment after `reviews` has no name of
    // its own to strip the brackets from.
    return Array.isArray(node) ? node.flatMap((item) => resolveRichTextValues(item, rest)) : [];
  }
  if (segment.endsWith('[]')) {
    const arr = node?.[segment.slice(0, -2)];
    return Array.isArray(arr) ? arr.flatMap((item) => resolveRichTextValues(item, rest)) : [];
  }
  return node == null ? [] : resolveRichTextValues(node[segment], rest);
};

/** Return a copy of `root` with `path` replaced by `fn`. Does not mutate. */
export const setAtRichTextPath = (root: any, path: string, fn: (v: string) => string): any => {
  if (path === '') return typeof root === 'string' ? fn(root) : root;
  const dot = path.indexOf('.');
  const segment = dot === -1 ? path : path.slice(0, dot);
  const rest = dot === -1 ? '' : path.slice(dot + 1);
  if (segment === '[]') {
    return Array.isArray(root) ? root.map((item) => setAtRichTextPath(item, rest, fn)) : root;
  }
  if (segment.endsWith('[]')) {
    const name = segment.slice(0, -2);
    const arr = root?.[name];
    if (!Array.isArray(arr)) return root;
    return { ...root, [name]: arr.map((item) => setAtRichTextPath(item, rest, fn)) };
  }
  if (root == null) return root;
  const child = root[segment];
  // Absent stays absent, matching the backend mirror. Writing `fn(undefined)`
  // would materialise an empty string and add fields the pack never had.
  if (child === undefined) return root;
  return { ...root, [segment]: setAtRichTextPath(child, rest, fn) };
};

/** Clamp every rich-text field in a section_data object, leaving the rest alone. */
export const clampRichFields = <T>(section: T): T =>
  RICH_TEXT_PATHS.reduce<any>(
    (acc, path) => setAtRichTextPath(acc, path, clampRichText),
    section as any,
  );

/** Paths holding at least one value over the cap, for the save-time warning. */
export const overLimitRichTextPaths = (section: unknown): string[] =>
  RICH_TEXT_PATHS.filter((path) =>
    resolveRichTextValues(section, path).some((v) => v.length > RICH_TEXT_MAX),
  );

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–',
  mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“',
  rdquo: '”', bull: '•', middot: '·', copy: '©', reg: '®', trade: '™',
  deg: '°', times: '×', divide: '÷', laquo: '«', raquo: '»',
  euro: '€', pound: '£', rupee: '₹', rsquo32: '’',
};

/** Decodes the entity forms that show up in pasted content. */
export const decodeHtmlEntities = (input: string): string =>
  input.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named !== undefined ? named : match;
  });

/** Collapses runs of blank lines and trims, without touching indentation. */
const tidy = (input: string): string =>
  input
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const cellText = (html: string): string =>
  decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim();

/** Converts one <table>…</table> into a GFM table, or returns null if unusable. */
const convertTable = (html: string): string | null => {
  const rows: string[][] = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRe.exec(html))) {
    const cells: string[] = [];
    const cellRe = /<(t[dh])\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      cells.push(cellText(cellMatch[2]));
    }
    if (cells.length) rows.push(cells);
  }
  if (rows.length < 2) return null;

  const width = Math.max(...rows.map((r) => r.length));
  const pad = (row: string[]) =>
    `| ${Array.from({ length: width }, (_, i) => row[i] || '').join(' | ')} |`;

  return [pad(rows[0]), `| ${Array.from({ length: width }, () => '---').join(' | ')} |`, ...rows.slice(1).map(pad)].join('\n');
};

/**
 * Converts an HTML fragment to markdown. Assumes `html` actually contains HTML;
 * callers should check with {@link looksLikeHtml} first.
 */
export const htmlToMarkdown = (html: string): string => {
  let text = html;

  // Code blocks first: their contents must not be treated as markup.
  const codeBlocks: string[] = [];
  text = text.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_m, inner: string) => {
    const lang = /<code\b[^>]*class=["'][^"']*language-([a-z0-9+#-]+)/i.exec(inner)?.[1] || '';
    const body = decodeHtmlEntities(inner.replace(/<[^>]+>/g, '')).replace(/\n+$/, '');
    const token = `\u0000CB${codeBlocks.length}\u0000`;
    codeBlocks.push('```' + lang + '\n' + body + '\n```');
    return token;
  });

  // Drop these entirely, contents included.
  text = text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');

  // Tables before generic tag handling, so <td> content is still grouped.
  const tables: string[] = [];
  text = text.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (match) => {
    const converted = convertTable(match);
    const token = `\u0000TB${tables.length}\u0000`;
    tables.push(converted ?? cellText(match));
    return `\n\n${token}\n\n`;
  });

  text = text
    // Inline formatting.
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, inner: string) => {
      const body = inner.trim();
      // Only wrap when there is something to emphasise, and never inside code.
      return body ? `**${body}**` : body;
    })
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, inner: string) => {
      const body = inner.trim();
      return body ? `*${body}*` : body;
    })
    .replace(/<(del|s|strike)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, inner: string) => {
      const body = inner.trim();
      return body ? `~~${body}~~` : body;
    })
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_m, inner: string) => {
      const body = decodeHtmlEntities(inner.replace(/<[^>]+>/g, '')).replace(/\n+/g, ' ');
      return body.trim() ? `\`${body.trim()}\`` : '';
    })
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
      const label = inner.replace(/<[^>]+>/g, '').trim();
      return label ? `[${label}](${href})` : href;
    })
    .replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (_m, i: string) => `^${i}`)
    .replace(/<sub\b[^>]*>([\s\S]*?)<\/sub>/gi, (_m, i: string) => `~${i}`)
    // Line breaks and horizontal rules.
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n\n---\n\n')
    // Headings.
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level: string, inner: string) => {
      return `\n\n${'#'.repeat(Number(level))} ${inner.replace(/<[^>]+>/g, '').trim()}\n\n`;
    })
    // Quote.
    .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, inner: string) => {
      const body = inner.replace(/<[^>]+>/g, '').trim();
      return `\n\n${body
        .split('\n')
        .map((line) => `> ${line}`.trimEnd())
        .join('\n')}\n\n`;
    })
    // Lists. The whole <ul>/<ol> is consumed at once so ordered items can be
    // numbered: a per-<li> replacement cannot count, and used to render every
    // item as "1.", which is what the shared fixture pins down.
    .replace(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, kind: string, inner: string) => {
      const items: string[] = [];
      const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let li: RegExpExecArray | null;
      while ((li = liRe.exec(inner)) !== null) {
        const body = li[1].replace(/<[^>]+>/g, '').trim();
        if (body) items.push(body);
      }
      if (!items.length) return '';
      const marker = kind.toLowerCase() === 'ol';
      return `\n\n${items.map((it, i) => (marker ? `${i + 1}. ${it}` : `- ${it}`)).join('\n')}\n\n`;
    })
    .replace(/<\/?(?:ul|ol)\b[^>]*>/gi, '\n')
    // Paragraphs and generic wrappers keep their block separation.
    .replace(/<\/?(?:p|div|section|article|tr|td|th|thead|tbody|tfoot|table|span|font|small|mark|ins|u)\b[^>]*>/gi, '\n');

  // Drop the tags we have not converted.
  text = text.replace(/<\/?[a-z][^>]*>/gi, '');

  text = decodeHtmlEntities(text);

  // Restore the extracted blocks.
  text = text.replace(/\u0000TB(\d+)\u0000/g, (_m, i: string) => tables[Number(i)] ?? '');
  text = text.replace(/\u0000CB(\d+)\u0000/g, (_m, i: string) => codeBlocks[Number(i)] ?? '');

  return tidy(text);
};

/**
 * True when the text contains at least one recognised HTML tag, i.e. when it
 * came from a rich source and needs converting. A plain-text or markdown paste
 * (including text with a bare `<` in it) returns false and is left alone.
 */
export const looksLikeHtml = (text: string): boolean => KNOWN_TAG_RE.test(text);

/**
 * True when the text still contains one of the HTML tags we model.
 *
 * After normalisation this must be false, otherwise the student reader will show
 * literal tags. Decoded text that merely *looks* like a tag (`&lt;team&gt;`
 * becoming `<team>`) is correct output and is not flagged, which is why this
 * checks the known-tag list rather than any `<x`.
 */
export const containsHtmlTag = (text: unknown): boolean =>
  typeof text === 'string' && KNOWN_TAG_RE.test(text);

/**
 * Entry point for pasted content: converts HTML to markdown, and otherwise
 * returns the text as-is with line endings normalised.
 */
export const normalizePastedText = (text: string): string => {
  if (!text) return '';
  return looksLikeHtml(text) ? htmlToMarkdown(text) : tidy(text);
};

/**
 * Turn a "Label: value" list into a two-column markdown table.
 *
 * Accepts either one fact per line or several facts on one line separated by
 * `|`:
 *
 *   Base: 12-22L | Bonus: 2L
 *   Stocks: 4-8L
 *
 * The value keeps everything after the first colon, so ranges and figures that
 * themselves contain colons ("CTC: 12: 30") are not truncated. Input that is
 * already a markdown table, that contains no `label: value` pair, that yields
 * fewer than two facts, or that contains prose or a URL is returned untouched —
 * this is an authoring convenience, so it must never rewrite text it does not
 * understand.
 *
 * Known limit: a trailing line that is exactly `Label: value` becomes a row, even
 * when it was meant as prose ("Note: ask HR"). That form is indistinguishable
 * from a real fact, and no text is lost either way, so it is left to the author to
 * spot in the preview.
 */
export const pipeTextToMarkdownTable = (text: string): string => {
  if (!text || !text.trim()) return text || '';

  const lines = text.split(/\r?\n/);

  // Already a table: leave it alone rather than nesting tables.
  const nonEmpty = lines.filter((l) => l.trim());
  if (nonEmpty.length > 0 && nonEmpty.every((l) => l.trim().startsWith('|'))) return text;

  // A prose sentence such as "See https://example.com for details" has a colon in
  // it but is not a fact list. Converting that would replace the admin's text with
  // a nonsense row, so bail out instead. The raw chunk is tested as well as the
  // split parts, because "mailto:someone" leaves the scheme as a bare label.
  const isUrlish = (raw: string, label: string, value: string) =>
    /^(?:https?|ftp|mailto|tel|sms|data|file):/i.test(raw) ||
    /^(?:https?|ftp|mailto|tel|sms|data|file):/i.test(label) ||
    /^(?:https?|ftp|mailto|tel|sms|data|file):/i.test(value) ||
    value.startsWith('//');

  const cells: [string, string][] = [];
  let seenFactLine = false;
  let strayText = false;

  for (const line of lines) {
    if (!line.trim()) continue;

    const lineChunks: Array<[string, string]> = [];
    let unparsed = 0;

    // Split on the pipe separator, but not one that is inside a markdown link.
    for (const raw of line.split(/(?<!\])\|/)) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf(':');
      if (idx <= 0) {
        unparsed++;
        continue;
      }
      const label = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (!label || !value) {
        unparsed++;
        continue;
      }
      if (isUrlish(trimmed, label, value)) return text;
      lineChunks.push([label, value]);
    }

    if (lineChunks.length === 0) {
      // Free-form prose is fine as a preamble above the facts, but once the
      // facts have started a non-fact line means this is not a fact list.
      if (seenFactLine) strayText = true;
      continue;
    }

    // Prose sharing a line with real facts (or a half-written "Label:") is not
    // something we should reshape.
    if (unparsed > 0) strayText = true;

    seenFactLine = true;
    cells.push(...lineChunks);
  }

  // A single "label: value" is more likely prose than a table. Leave anything we
  // are not confident about untouched.
  if (cells.length < 2 || strayText) return text;

  const escape = (v: string) => v.replace(/\|/g, '\\|');
  const out = ['| Component | Amount |', '| --- | --- |'];
  for (const [label, value] of cells) out.push(`| ${escape(label)} | ${escape(value)} |`);

  // Preserve any prose above the facts instead of dropping it.
  const firstCellLine = lines.findIndex((l) =>
    l.split(/(?<!\])\|/).some((c) => {
      const t = c.trim();
      const i = t.indexOf(':');
      return i > 0 && t.slice(0, i).trim() && t.slice(i + 1).trim();
    })
  );
  const preamble = lines
    .slice(0, firstCellLine)
    .filter((l) => l.trim())
    .join('\n');

  return preamble ? `${preamble}\n\n${out.join('\n')}` : out.join('\n');
};
