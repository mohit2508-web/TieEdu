export interface TextSelection {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export type TextEdit = TextSelection;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const PREFIX_RE =
  /^(\s*)(?:(?:#{1,6}\s+)|(?:[-*+]\s+\[[ xX]\]\s*)|(?:[-*+]\s+)|(?:\d+\.\s+)|(?:>\s?))/;

export const stripLinePrefix = (line: string) => line.replace(PREFIX_RE, '$1');

function lineBounds(value: string, start: number, end: number) {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const rest = value.slice(end);
  const nl = rest.indexOf('\n');
  const lineEnd = nl === -1 ? value.length : end + nl;
  return { lineStart, lineEnd };
}

function linesOf(s: TextSelection): string[] {
  const { lineStart, lineEnd } = lineBounds(s.value, s.selectionStart, s.selectionEnd);
  return s.value.slice(lineStart, lineEnd).split('\n');
}

function mapLines(s: TextSelection, fn: (line: string, index: number) => string): TextEdit {
  const { value, selectionStart, selectionEnd } = s;
  const { lineStart, lineEnd } = lineBounds(value, selectionStart, selectionEnd);
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  const nextLines = lines.map(fn);
  const nextBlock = nextLines.join('\n');
  const next = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);

  const firstDelta = nextLines[0].length - lines[0].length;
  const lastDelta = nextLines[nextLines.length - 1].length - lines[lines.length - 1].length;
  const sameLine = !block.slice(selectionStart - lineStart).includes('\n');

  return {
    value: next,
    selectionStart: clamp(selectionStart + firstDelta, lineStart, next.length),
    selectionEnd: clamp(selectionEnd + (sameLine ? firstDelta : lastDelta), lineStart, next.length),
  };
}

export function wrapInline(s: TextSelection, marker: string, placeholder = 'text'): TextEdit {
  const { value, selectionStart, selectionEnd } = s;
  const selected = value.slice(selectionStart, selectionEnd);

  const alreadyWrapped =
    value.slice(Math.max(0, selectionStart - marker.length), selectionStart) === marker &&
    value.slice(selectionEnd, selectionEnd + marker.length) === marker;

  if (alreadyWrapped) {
    return {
      value:
        value.slice(0, selectionStart - marker.length) +
        selected +
        value.slice(selectionEnd + marker.length),
      selectionStart: selectionStart - marker.length,
      selectionEnd: selectionEnd - marker.length,
    };
  }

  const inner = selected || placeholder;
  return {
    value: value.slice(0, selectionStart) + marker + inner + marker + value.slice(selectionEnd),
    selectionStart: selectionStart + marker.length,
    selectionEnd: selectionStart + marker.length + inner.length,
  };
}

export function toggleHeading(s: TextSelection, level: number): TextEdit {
  return mapLines(s, (line) => {
    if (new RegExp(`^#{${level}}\\s`).test(line)) return line.replace(/^#{1,6}\s+/, '');
    return '#'.repeat(level) + ' ' + line.replace(/^#{1,6}\s+/, '');
  });
}

export function toggleLinePrefix(
  s: TextSelection,
  isPrefixed: (line: string) => boolean,
  toPrefixed: (line: string, index: number) => string
): TextEdit {
  const lines = linesOf(s);
  const shouldRemove = lines.every((l) => l.trim() === '' || isPrefixed(l));
  return mapLines(s, (line, i) => {
    if (line.trim() === '') return line;
    return shouldRemove ? stripLinePrefix(line) : toPrefixed(stripLinePrefix(line), i);
  });
}

export const toggleBullet = (s: TextSelection) =>
  toggleLinePrefix(s, (l) => /^\s*[-*+]\s/.test(l), (l) => `- ${l}`);

export const toggleOrdered = (s: TextSelection) =>
  toggleLinePrefix(s, (l) => /^\s*\d+\.\s/.test(l), (l, i) => `${i + 1}. ${l}`);

export const toggleTask = (s: TextSelection) =>
  toggleLinePrefix(s, (l) => /^\s*[-*+]\s+\[[ xX]\]\s/.test(l), (l) => `- [ ] ${l}`);

export const toggleQuote = (s: TextSelection) =>
  toggleLinePrefix(s, (l) => /^\s*>/.test(l), (l) => `> ${l}`);

export const indentLines = (s: TextSelection) =>
  mapLines(s, (l) => (l.trim() === '' ? l : '  ' + l));

export const outdentLines = (s: TextSelection) => mapLines(s, (l) => l.replace(/^[ \t]{1,4}/, ''));

export function insertBlock(s: TextSelection, snippet: string): TextEdit {
  const { value, selectionStart, selectionEnd } = s;
  const selected = value.slice(selectionStart, selectionEnd);
  const needsBreak = selected === '' && selectionStart > 0 && !value.slice(0, selectionStart).endsWith('\n');
  const text = (needsBreak ? '\n\n' : '') + (selected || snippet);
  const next = value.slice(0, selectionStart) + text + value.slice(selectionEnd);
  const caret = selectionStart + text.length;
  return { value: next, selectionStart: caret, selectionEnd: caret };
}

export const insertHr = (s: TextSelection) => insertBlock(s, '---');

export const insertLink = (s: TextSelection) =>
  insertBlock(s, '[link text](https://example.com)');

export const insertCodeFence = (s: TextSelection, lang = 'cpp') =>
  insertBlock(s, '```' + lang + '\n// your code here\n```');

export const insertMermaid = (s: TextSelection) =>
  insertBlock(s, '```mermaid\nflowchart LR\n  A[Start] --> B[Done]\n```');

export const insertCallout = (s: TextSelection) =>
  insertBlock(s, '> **Pro tip**\n> Add the callout text here.');

export function insertTable(s: TextSelection, rows = 3, cols = 3): TextEdit {
  const header = `| ${new Array(cols).fill('Header').join(' | ')} |`;
  const divider = `| ${new Array(cols).fill('---').join(' | ')} |`;
  const body = new Array(rows)
    .fill(0)
    .map(() => `| ${new Array(cols).fill(' ').join(' | ')} |`)
    .join('\n');
  return insertBlock(s, `${header}\n${divider}\n${body}`);
}

export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

export const readingMinutes = (text: string) => Math.max(1, Math.round(wordCount(text) / 200));
