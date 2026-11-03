/**
 * Project Pulse — copy detection (PROJECT_PULSE_PLAN.md §5.1).
 *
 * C source is reduced to tokens with comments, strings, numbers and identifiers
 * erased (renaming a variable changes nothing), fingerprinted with k-gram
 * winnowing, and compared pairwise by Jaccard overlap. Fingerprints of the
 * teacher's starter code are removed first, so shared starter code is not a match.
 */

const KEYWORDS = new Set(('auto break case char const continue default do double else enum extern float for goto if inline int long register ' +
  'restrict return short signed sizeof static struct switch typedef union unsigned void volatile while bool true false NULL ' +
  'printf scanf fgets fopen fclose fread fwrite fprintf malloc free strcpy strlen strcmp').split(' '));
const K = 12;
const W = 4;
export const SIMILAR_AT = 70;

export const tokens = (src: string): string[] => {
  const s = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ').replace(/^\s*#.*$/gm, ' ')
    .replace(/"(\\.|[^"\\])*"/g, ' S ').replace(/'(\\.|[^'\\])*'/g, ' S ');
  return (s.match(/[A-Za-z_]\w*|\d[\w.]*|[^\s\w]/g) || []).map((t) => (KEYWORDS.has(t) ? t : /^\d/.test(t) ? 'N' : /^[A-Za-z_]/.test(t) ? 'I' : t));
};

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

export const fingerprints = (src: string): Set<number> => {
  const t = tokens(src);
  const grams: number[] = [];
  for (let i = 0; i + K <= t.length; i++) grams.push(hash(t.slice(i, i + K).join(' ')));
  const out = new Set<number>();
  if (grams.length && grams.length < W) grams.forEach((g) => out.add(g));
  for (let i = 0; i + W <= grams.length; i++) out.add(Math.min(...grams.slice(i, i + W)));
  return out;
};

/** Pairs at or above SIMILAR_AT %, highest first. `subs` = [{id, code}] of .c/.h joined. */
export const similarPairs = (subs: { id: string; code: string }[], starterCode: string) => {
  const starter = fingerprints(starterCode);
  const prints = subs.map((s) => ({ id: s.id, fp: new Set([...fingerprints(s.code)].filter((x) => !starter.has(x))) })).filter((s) => s.fp.size >= 20);
  const out: { a: string; b: string; score: number }[] = [];
  for (let i = 0; i < prints.length; i++) for (let j = i + 1; j < prints.length; j++) {
    const a = prints[i].fp, b = prints[j].fp;
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    const score = Math.round((inter / (a.size + b.size - inter)) * 100);
    if (score >= SIMILAR_AT) out.push({ a: prints[i].id, b: prints[j].id, score });
  }
  return out.sort((x, y) => y.score - x.score);
};
