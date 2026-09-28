/**
 * Helpers for the company "pack" section_data blob.
 *
 * The pack is edited in the admin Pack Editor and rendered for students, so these
 * helpers are deliberately shared between the migration script and the editor
 * rather than re-implemented per call site.
 */

/** A markdown table row cell count for the salary/CTC table. */
const SALARY_COLUMNS = ['Component', 'Amount'] as const;

/** Matches a GFM table so we never "convert" a value that is already a table. */
const HAS_TABLE_ROW = /^\s*\|.+\|\s*$/m;
const HAS_TABLE_DELIMITER = /^\s*\|[\s:|-]+\|\s*$/m;

export const looksLikeMarkdownTable = (text: string): boolean =>
  HAS_TABLE_ROW.test(text) && HAS_TABLE_DELIMITER.test(text);

/**
 * Turns a pipe-delimited `Label: value | Label: value` string into a GFM table.
 *
 * Admins used to type CTC breakdowns as one run-on line because the old editor had
 * no formatting at all, e.g.
 *   "SDE-1 Base: Rs 12L - Rs 22L | Fixed Bonus: Rs 2L | Joining Stocks: Rs 4L - Rs 8L"
 * which rendered as an unreadable single sentence. As a table each component gets
 * its own row.
 *
 * Splitting is on the first colon of each segment only, so ranges such as
 * "Base: Rs 12L - Rs 22L" keep their colon-free value intact. Returns the input
 * unchanged when there is nothing to convert.
 */
export const pipeTextToMarkdownTable = (input: string): string => {
  const text = (input || '').trim();
  if (!text || looksLikeMarkdownTable(text)) return text;

  // A table needs at least two `Label: value` segments to be worth building.
  const segments = text
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  const parsed: Array<[string, string]> = [];
  for (const segment of segments) {
    const colon = segment.indexOf(':');
    if (colon <= 0) return text; // not `Label: value` shaped, leave it alone
    parsed.push([segment.slice(0, colon).trim(), segment.slice(colon + 1).trim()]);
  }
  if (parsed.length < 2) return text;
  if (parsed.some(([, value]) => !value)) return text;

  const lines = [
    `| ${SALARY_COLUMNS[0]} | ${SALARY_COLUMNS[1]} |`,
    '| --- | --- |',
    ...parsed.map(([label, value]) => `| ${label} | ${value} |`),
  ];
  return lines.join('\n');
};

/**
 * Normalises the CTC field: repairs mojibake, then promotes a pipe-delimited
 * one-liner to a real table. Already-tabular or free-form prose is left alone so
 * re-running the migration is safe.
 */
export const normalizeSalaryBreakdown = (input: string, repair: (s: string) => string): string => {
  const repaired = repair(input || '');
  if (!repaired.trim()) return repaired;
  // Only auto-table the single-line legacy format. Multi-line values are almost
  // always something the admin wrote by hand, so respect them.
  if (repaired.includes('\n')) return repaired;
  return pipeTextToMarkdownTable(repaired);
};
