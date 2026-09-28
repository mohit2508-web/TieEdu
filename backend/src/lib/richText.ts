/**
 * Server-side rich-text normalisation for company pack content.
 *
 * This is a deliberate mirror of `frontend/src/lib/richText.ts`. The editor
 * normalises pasted HTML on the client, but the client cannot be trusted: the
 * pack PUT endpoint is a plain JSON body, so anything can be posted to it. The
 * student reader renders markdown without `rehype-raw`, which means raw HTML is
 * escaped and shown literally — a `<br>` or a `<p>` stored in the database is
 * visible tag soup on the student page, and the whole pack is affected.
 *
 * Both implementations are covered by the same fixture in
 * `shared/fixtures/pack-content.fixture.json`, asserted by
 * `backend/scripts/pack-content.test.ts` and
 * `frontend/scripts/rich-text.test.ts`, so the two cannot drift. The fixture is
 * at the repo root rather than under either package because both suites read it,
 * and a copy in one place would be one more thing to keep in sync.
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
 * Must equal `RICH_TEXT_MAX` in `frontend/src/lib/richText.ts`. If the client
 * capped lower, an admin would lose content the server would have kept; if it
 * capped higher, a save would look successful while quietly discarding the tail.
 */
export const RICH_TEXT_MAX = 20000;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', mdash: '—', ndash: '–', copy: '©',
  reg: '®', trade: '™', deg: '°', times: '×',
  laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', bull: '•', middot: '·',
  eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç',
  uuml: 'ü', ouml: 'ö', auml: 'ä', szlig: 'ß',
  ntilde: 'ñ', euro: '€', pound: '£', yen: '¥',
};

export const decodeHtmlEntities = (input: string): string =>
  input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name: string) => {
      const key = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, key) ? NAMED_ENTITIES[key] : m;
    });

const safeCodePoint = (code: number): string => {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  // Surrogate halves are not valid standalone characters.
  if (code >= 0xd800 && code <= 0xdfff) return '';
  return String.fromCodePoint(code);
};

/**
 * Detects a run of known HTML tags, which is the signal that a field was pasted
 * from a word processor or a web page rather than typed as markdown.
 */
export const looksLikeHtml = (text: string): boolean => KNOWN_TAG_RE.test(text);

const stripTags = (input: string): string => input.replace(/<[^>]*>/g, '');

/**
 * Removes only tags that are NOT in the known list, so their text survives.
 *
 * This runs *before* entities are decoded, and that order is load-bearing.
 * Decoding first would turn `&lt;team&gt;` into `<team>`, which `stripTags` would
 * then delete — silently losing text the admin wrote. While `&lt;team&gt;` is
 * still encoded it is unambiguously not a tag, and a genuinely unknown real tag
 * like `<custom-tag>` still matches and is removed.
 */
const stripUnknownTags = (input: string): string =>
  input.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)(?:\s[^>]*)?\/?>/g, (match, slash: string, name: string) =>
    KNOWN_TAGS.includes(name.toLowerCase()) ? match : ''
  );

const listItems = (html: string): string[] => {
  const out: string[] = [];
  const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(decodeHtmlEntities(stripTags(m[1])).trim());
  return out.filter((s) => s.length > 0);
};

/** Number of leading `#` in a heading tag, or 0. */
const headingLevel = (tag: string): number => {
  const m = /^h([1-6])$/i.exec(tag);
  return m ? Number(m[1]) : 0;
};

/**
 * Converts a small whitelist of HTML into markdown.
 *
 * Unknown tags are unwrapped rather than dropped, so their text still survives.
 * Anything that is not HTML is returned untouched, so re-saving clean markdown
 * can never mangle it.
 */
export const htmlToMarkdown = (html: string): string => {
  // Unknown tags go first, while entities are still encoded, so that decoded
  // text which merely looks like a tag is not mistaken for one and deleted.
  const source = stripUnknownTags(html);

  // Headings first, so a heading wrapping a list or emphasis is not flattened.
  let out = source.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level: string, inner: string) => {
    const text = decodeHtmlEntities(stripTags(inner)).trim();
    return text ? `\n\n${'#'.repeat(Number(level))} ${text}\n\n` : '';
  });

  // Unordered and ordered lists, keeping one item per line.
  out = out.replace(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, kind: string, inner: string) => {
    const items = listItems(inner);
    if (!items.length) return '';
    const rendered = items.map((it, i) => (kind.toLowerCase() === 'ol' ? `${i + 1}. ${it}` : `- ${it}`));
    return `\n\n${rendered.join('\n')}\n\n`;
  });

  // A table becomes a markdown table. Rows are split on <tr>, cells on <t[dhr]>,
  // and the first row is promoted to the header.
  out = out.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_, inner: string) => {
    const rows: string[][] = [];
    const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rm: RegExpExecArray | null;
    while ((rm = rowRe.exec(inner)) !== null) {
      const cells: string[] = [];
      const cellRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cm: RegExpExecArray | null;
      while ((cm = cellRe.exec(rm[1])) !== null) cells.push(decodeHtmlEntities(stripTags(cm[1])).trim());
      if (cells.length) rows.push(cells);
    }
    if (rows.length < 2) return '';
    const width = Math.max(...rows.map((r) => r.length));
    const pad = (r: string[]) => [...r, ...Array(Math.max(0, width - r.length)).fill('')];
    const [head, ...tail] = rows.map(pad);
    const body = tail.map((r) => `| ${r.join(' | ')} |`).join('\n');
    return `\n\n| ${head.join(' | ')} |\n| ${head.map(() => '---').join(' | ')} |\n${body}\n\n`;
  });

  // Line breaks and paragraph/div boundaries. A run of N <br> becomes N
  // newlines, so a single <br> is a line break and the <br><br> that the CTC
  // packs are full of is a paragraph break. That is the reported breakage.
  out = out
    .replace(/(?:<br\s*\/?>\s*)+/gi, (run) => {
      const count = (run.match(/<br\b/gi) || []).length;
      return '\n'.repeat(Math.max(1, count));
    })
    .replace(/<\/(?:p|div|tr|blockquote|h[1-6]|li)>/gi, '\n\n')
    .replace(/<(?:p|div|blockquote)\b[^>]*>/gi, '\n\n')
    .replace(/<hr\s*\/?>/gi, '\n\n---\n\n');

  // Inline formatting. Contents are preserved; only the tags change.
  out = out
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner: string) => `**${inner.trim()}**`)
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner: string) => `*${inner.trim()}*`)
    .replace(/<(del|s|strike)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner: string) => `~~${inner.trim()}~~`)
    .replace(/<(ins|u)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner: string) => inner.trim())
    .replace(/<mark\b[^>]*>([\s\S]*?)<\/mark>/gi, (_, inner: string) => `**${inner.trim()}**`)
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, inner: string) => `\`${inner.trim()}\``)
    .replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, inner: string) => `\n\n\`\`\`\n${stripTags(inner).replace(/^\n+|\n+$/g, '')}\n\`\`\`\n\n`);

  // Links: keep the label and the href.
  out = out.replace(/<a\b[^>]*href=["']?([^"'>\s]+)["']?[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, inner: string) => {
    const label = decodeHtmlEntities(stripTags(inner)).trim();
    return label ? `[${label}](${href})` : '';
  });

  // Only known tags are left at this point. Strip exactly those; a blanket
  // `<[^>]*>` here would also eat decoded text that looks like a tag, which is
  // why entity decoding is deliberately still pending.
  out = out.replace(
    new RegExp(`</?(?:${KNOWN_TAGS.join('|')})(?:\\s[^>]*)?/?>`, 'gi'),
    ''
  );

  // Normalise whitespace, then decode. Decoding last means nothing after this
  // point can mistake a decoded `<` for a tag.
  out = out
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return decodeHtmlEntities(out);
};

/**
 * Normalises a stored rich-text field: HTML becomes markdown, entities are
 * decoded, and the result is clamped. Safe to run on already-clean markdown, and
 * idempotent, so the repair script can re-run without changing anything.
 */
export const normaliseRichText = (value: unknown, limit: number = RICH_TEXT_MAX): string => {
  if (typeof value !== 'string') return '';
  let text = value;
  if (looksLikeHtml(text)) text = htmlToMarkdown(text);
  else text = decodeHtmlEntities(text).replace(/\r\n?/g, '\n').trim();
  return text.length > limit ? text.slice(0, limit) : text;
};

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
 * The pack's rich-text fields, as dotted paths from the root of `section_data`.
 *
 * Must match `RICH_TEXT_PATHS` in `frontend/src/lib/richText.ts`.
 * `cheatsheets[].content` and `interview_questions[].code` are preformatted
 * (monospace, rendered in a `<pre>`), so they are deliberately absent: their
 * alignment is the point and reflowing them would destroy it.
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
    return Array.isArray(node) ? node.flatMap((item) => resolveRichTextValues(item, rest)) : [];
  }
  if (segment.endsWith('[]')) {
    const arr = node?.[segment.slice(0, -2)];
    return Array.isArray(arr) ? arr.flatMap((item) => resolveRichTextValues(item, rest)) : [];
  }
  return node == null ? [] : resolveRichTextValues(node[segment], rest);
};

/** Return a copy of `root` with `path` replaced by `fn`. Does not mutate. */
export const setAtRichTextPath = (root: any, path: string, fn: (v: any) => any): any => {
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
  // Absent stays absent. Writing `fn(undefined)` here would materialise an empty
  // string, which made a partially-filled pack look changed to the repair script
  // and would add empty fields to data that never had them.
  if (child === undefined) return root;
  return { ...root, [segment]: setAtRichTextPath(child, rest, fn) };
};

/** Clamp every rich-text field in a section_data object, leaving the rest alone. */
export const clampRichFields = <T>(section: T): T =>
  RICH_TEXT_PATHS.reduce<any>((acc, path) => setAtRichTextPath(acc, path, (v) => normaliseRichText(v)), section as any);

/** Paths that actually changed, for the repair script's report. */
export const changedRichTextPaths = (before: unknown, after: unknown): string[] =>
  RICH_TEXT_PATHS.filter((path) => {
    const a = resolveRichTextValues(before, path);
    const b = resolveRichTextValues(after, path);
    return a.length !== b.length || a.some((v, i) => v !== b[i]);
  });
