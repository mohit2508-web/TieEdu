/**
 * Repairs mojibake in stored content.
 *
 * Some seed/pack content was written through a broken Windows encoding chain
 * (UTF-8 bytes read as cp1252 with a smart-quote table, then re-encoded, up to
 * three times). The result is unreadable text in the UI, e.g. a salary field
 * reading "Base: \u00C3\u0192..." instead of "Base: \u20B9".
 *
 * The chain is NOT losslessly invertible: cp1252 maps several bytes onto the same
 * smart-punctuation characters, so a generic "decode N times" pass either grows
 * the string forever or lands on a different character. Instead we keep an
 * explicit, audited map of the corrupted runs that actually exist in the data and
 * swap them for the character they were meant to be. Every entry below was
 * confirmed by reading its surrounding sentence.
 *
 * Ordering matters: MOJIBAKE_MAP is applied longest-run-first (see
 * `repairMojibake`) because one entry contains another as a substring.
 */

/** The corrupted run exactly as it appears in data, and its intended character. */
const MOJIBAKE_MAP: ReadonlyArray<readonly [string, string]> = [
  // A "range dash followed by a rupee sign", e.g. "Rs 12L<run>22L" where the run
  // stands for "<en dash>Rs". This is two characters, not one: mapping it to a bare
  // en dash would silently drop the second rupee and read "Rs 12L-22L".
  [
    '\u00C3\u0192\u00C2\u00A2\u00C3\u00A2\u00E2\u20AC\u0161\u00C2\u00AC\u00C3\u00A2\u00E2\u201A\u00AC\u00C5\u201C\u00C3\u0192\u00C2\u00A2\u00C3\u00A2\u00E2\u201A\u00AC\u00C5\u00A1\u00C3\u201A\u00C2\u00B9',
    '\u2013\u20B9', // en dash + rupee
  ],
  // Rupee, triple-encoded. The most common corruption: every CTC field.
  ['\u00C3\u0192\u00C2\u00A2\u00C3\u00A2\u00E2\u201A\u00AC\u00C5\u00A1\u00C3\u201A\u00C2\u00B9', '\u20B9'], // rupee
  // Arrow, triple-encoded. "Situation -> Task -> Action"
  [
    '\u00C3\u0192\u00C2\u00A2\u00C3\u00A2\u00E2\u201A\u00AC\u00C2\u00A0\u00C3\u00A2\u00E2\u201A\u00AC\u00E2\u201E\u00A2',
    '\u2192', // rightwards arrow
  ],
  // Em dash, triple-encoded.
  [
    '\u00C3\u0192\u00C2\u00A2\u00C3\u00A2\u00E2\u20AC\u0161\u00C2\u00AC\u00C3\u00A2\u00E2\u201A\u00AC\u00C2\u009D',
    '\u2014', // em dash
  ],
  // Em dash, single-encoded. 66 occurrences, mostly in order descriptions.
  ['\u00E2\u20AC\u201D', '\u2014'],
  // Arrow, single-encoded: "problem -> design -> build".
  ['\u00E2\u2020\u2019', '\u2192'],
  // Arrow, single-encoded: "90 Mins -> 2 DSA + 10 MCQs".
  ['\u00C3\u0192\u00C2\u00A2\u00C3\u00A2\u00E2\u20AC\u0161\u00C2\u00AC\u00C3\u201A\u00C2\u00A2', '\u2192'],
  // Middle dot inside a Big-O expression: "O(d*(N+k))".
  ['\u00C3\u0192\u00E2\u20AC\u0161\u00C3\u201A\u00C2\u00B7', '\u00B7'], // middle dot
  // Rupee, single-encoded: "pay (498)".
  ['\u00E2\u201A\u00B9', '\u20B9'],
  // Superscript two: "O(n2)".
  ['\u00C2\u00B2', '\u00B2'],
];

/** Longest first so a run that contains another run is replaced before it. */
const ORDERED_MAP = [...MOJIBAKE_MAP].sort((a, b) => b[0].length - a[0].length);

/** True when the string still contains one of the known corrupted runs. */
export const hasMojibake = (input: string): boolean =>
  ORDERED_MAP.some(([bad]) => input.includes(bad));

/**
 * Replaces every known corrupted run with the character it was meant to be.
 * No-ops on clean text, so it is safe to run over every string in the database.
 */
export const repairMojibake = (input: string): string => {
  if (typeof input !== 'string' || !input) return input;
  let out = input;
  for (const [bad, good] of ORDERED_MAP) {
    if (out.includes(bad)) out = out.split(bad).join(good);
  }
  return out;
};

/**
 * Applies `repairMojibake` to every string in a JSON-like value, in place.
 * Returns the number of strings that were changed.
 */
export const repairMojibakeDeep = <T>(value: T): { value: T; changed: number } => {
  let changed = 0;
  const walk = (node: any): any => {
    if (typeof node === 'string') {
      if (!hasMojibake(node)) return node;
      const fixed = repairMojibake(node);
      if (fixed !== node) changed += 1;
      return fixed;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      for (const key of Object.keys(node)) node[key] = walk(node[key]);
      return node;
    }
    return node;
  };
  return { value: walk(value), changed };
};
