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

// ---------------------------------------------------------------------------
// Generic, per-character repair
//
// The audited map above covers the runs that existed when it was written. The
// course and vault content imported later carries a different shape — mostly
// DOUBLE-encoded punctuation ("â€”" re-encoded once more) — which the map does
// not list, so ~4,900 sequences stayed broken on every Python/C lesson title.
//
// This repair is safe where a whole-string "decode N times" is not, because it
// works one character at a time: a match must be exactly one UTF-8 lead byte
// plus the right number of continuation bytes (each written as its cp1252
// character), and it is only replaced if those bytes decode as valid UTF-8 to a
// single character. Legitimate accented text ("café", "Zürich", "₹", "²") never
// forms such a run, so it is never touched. Passes repeat until stable, which
// unwinds double and triple encoding one layer at a time.
// ---------------------------------------------------------------------------

/** cp1252 bytes 0x80–0x9F; undefined bytes keep their C1 code point. */
const CP1252_HIGH: Record<number, number> = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
  0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160, 0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018,
  0x92: 0x2019, 0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02dc,
  0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153, 0x9e: 0x017e, 0x9f: 0x0178,
};

const CHAR_TO_BYTE = new Map<string, number>();
for (let b = 0; b < 256; b++) CHAR_TO_BYTE.set(String.fromCharCode(CP1252_HIGH[b] ?? b), b);

const CONT =
  '[\u0080-\u00BF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D' +
  '\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]';
const UTF8_AS_CP1252 = new RegExp(
  `[\u00C2-\u00DF]${CONT}|[\u00E0-\u00EF]${CONT}{2}|[\u00F0-\u00F4]${CONT}{3}`,
  'g'
);
const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true });

function decodeOneLayer(input: string): string {
  return input.replace(UTF8_AS_CP1252, (run) => {
    const bytes = Array.from(run, (ch) => CHAR_TO_BYTE.get(ch));
    if (bytes.some((b) => b === undefined)) return run;
    try {
      const decoded = STRICT_UTF8.decode(Uint8Array.from(bytes as number[]));
      return Array.from(decoded).length === 1 ? decoded : run;
    } catch {
      return run;
    }
  });
}

/** Repairs UTF-8-read-as-cp1252 corruption, any depth. Leaves clean text unchanged. */
export const repairMojibakeGeneric = (input: string): string => {
  if (typeof input !== 'string' || !input) return input;
  let cur = input;
  for (let i = 0; i < 4; i++) {
    const next = decodeOneLayer(cur);
    if (next === cur) break;
    cur = next;
  }
  return cur;
};

/**
 * Deep repair over a JSON value — values AND object keys. Keys matter: quiz
 * answer maps are keyed by option text, so repairing the options but not the
 * keys would silently break every affected question's answer check.
 */
export const repairMojibakeGenericDeep = <T>(value: T): { value: T; changed: number } => {
  let changed = 0;
  const walk = (node: any): any => {
    if (typeof node === 'string') {
      const fixed = repairMojibakeGeneric(node);
      if (fixed !== node) changed += 1;
      return fixed;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(node)) {
        const fixedKey = repairMojibakeGeneric(key);
        if (fixedKey !== key) changed += 1;
        out[fixedKey] = walk(node[key]);
      }
      return out;
    }
    return node;
  };
  return { value: walk(value) as T, changed };
};
