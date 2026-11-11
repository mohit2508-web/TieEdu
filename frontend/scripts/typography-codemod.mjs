/**
 * Typography codemod (PRACTICE_MODE_PLAN.md §10). Rewrites className strings only:
 *   1. Pill chips (rounded + horizontal padding + uppercase): capitalize (title case), 13px, 600 —
 *      drops `uppercase` and its `tracking-*`, `text-[10/11px]`/`text-xs` → `text-chip`,
 *      `font-bold/extrabold/black` → `font-semibold`.
 *   2. Sizes below the scale: `text-[9px]`, `text-[10px]`, `text-[11px]` → `text-xs`.
 *   3. `font-black` (900, which no loaded font has) → `font-extrabold`.
 * Usage:  node scripts/typography-codemod.mjs [--write]   (dry run without --write)
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('src');
const WRITE = process.argv.includes('--write');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(e.name)) files.push(p);
  }
})(ROOT);

const stats = { chips: 0, tiny: 0, black: 0, files: 0 };
// className="…" | className={`…`} | cn('…') / cx('…') string literals: any quoted run containing a Tailwind class.
const STR = /(["'`])((?:(?!\1)[^\n])*?\b(?:text-|font-|uppercase|rounded)[^\n]*?)\1/g;

function fixClasses(s) {
  let out = s;
  const tokens = out.split(/\s+/);
  const has = (re) => tokens.some((t) => re.test(t));
  const isChip = has(/^uppercase$/) && has(/^rounded(-full|-md|-lg|-sm)?$/) && has(/^px-(1|1\.5|2|2\.5|3)$/) && !has(/^(w|h)-\d/);
  if (isChip) {
    out = out
      // Data-driven labels ("in progress", "draft") keep a capital letter instead of shouting.
      .replace(/(^|\s)uppercase(?=\s|$)/g, '$1capitalize')
      .replace(/(^|\s)tracking-(wide|wider|widest|\[[^\]]+\])(?=\s|$)/g, '$1')
      .replace(/(^|\s)text-(\[1[01]px\]|xs)(?=\s|$)/g, '$1text-chip')
      .replace(/(^|\s)font-(bold|extrabold|black)(?=\s|$)/g, '$1font-semibold');
    stats.chips++;
  }
  const before = out;
  out = out.replace(/(^|\s)text-\[(9|10|11)px\](?=\s|$)/g, '$1text-xs');
  if (out !== before) stats.tiny++;
  const b2 = out;
  out = out.replace(/(^|\s)font-black(?=\s|$)/g, '$1font-extrabold');
  if (out !== b2) stats.black++;
  return out.replace(/ {2,}/g, ' ');
}

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const next = src.replace(STR, (m, q, body) => {
    if (body.includes('${') && q !== '`') return m;
    // Only touch strings that look like class lists (no sentences).
    if (!/^[\w\s\-:[\]/.#%()!>&*,'=${}@]+$/.test(body) || /\s(the|and|is|to)\s/.test(body)) return m;
    const fixed = fixClasses(body);
    return fixed === body ? m : q + fixed + q;
  });
  if (next !== src) {
    stats.files++;
    if (WRITE) fs.writeFileSync(f, next);
  }
}
console.log(`${WRITE ? 'changed' : 'would change'}: ${stats.files} files · ${stats.chips} chips → sentence case · ${stats.tiny} sub-12px sizes · ${stats.black} font-black`);
