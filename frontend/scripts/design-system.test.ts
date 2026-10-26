/**
 * "Route" design-system guard.
 *
 * The codemod (scripts/codemod-route.mjs) moved the app onto tokens: one type
 * scale, one palette, monospace only for code. This suite keeps it there — the
 * audit that started the redesign found 1,571 hand-picked font sizes and 195
 * colours, and they got there one "just this once" at a time.
 *
 * Fails on, anywhere in src/ (the school app and the company page's CSS module
 * keep their own systems):
 *   - text-[Npx]                       use the scale (text-xs … text-6xl)
 *   - *-[#hex] colours                 use a token; only the allowlist below
 *   - sky/blue/cyan palette classes    the old primary; use signal / info
 *   - font-mono outside code contexts
 *   - the Sparkles icon                the most "AI-generated" icon there is
 */
import * as fs from 'fs';
import * as path from 'path';

let pass = 0;
let fail = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
  } catch (err: any) {
    fail += 1;
    console.error(`FAIL  ${name}\n      ${err?.message}`);
  }
}

function findRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('could not locate package root from ' + __dirname);
}

const SRC = path.join(findRoot(), 'src');
const SKIP = ['components/school', 'pages/school', 'components/companyPage'];
const MONO_ALLOWED = ['components/blocks', 'components/editor', 'components/admin', 'components/modals/BlockEditorModal.tsx', 'pages/verify', 'pages/admin', 'pages/design.tsx'];

/**
 * Colours allowed as literals: drop-type category purples (they have no token
 * by design — one hue per category) and third-party brand colours.
 */
const HEX_ALLOWED = new Set([
  '#7C3AED', '#6D28D9', '#4B2A80', '#D2C2F0', '#EFE8FB', '#F1EBFE', // category purples
  '#0A66C2', '#1A0DAB', '#1877F2', '#1DA1F2', '#25D366', '#000000', // LinkedIn, Google, Facebook, X, WhatsApp
]);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

const files = walk(SRC)
  .map((f) => ({ abs: f, rel: path.relative(SRC, f).replace(/\\/g, '/') }))
  .filter((f) => !SKIP.some((d) => f.rel.startsWith(d)));

function findAll(re: RegExp, filter?: (file: string, match: string) => boolean): string[] {
  const out: string[] = [];
  for (const f of files) {
    const lines = fs.readFileSync(f.abs, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(re)) {
        if (!filter || filter(f.rel, m[0])) out.push(`${f.rel}:${i + 1}  ${m[0]}`);
      }
    });
  }
  return out;
}

function none(hits: string[], hint: string) {
  if (hits.length) throw new Error(`${hits.length} found — ${hint}\n      ${hits.slice(0, 8).join('\n      ')}`);
}

check('no arbitrary font sizes (text-[Npx])', () => {
  none(findAll(/\btext-\[\d+(?:\.\d+)?px\]/g), 'use text-xs / sm / base / lg / xl / 2xl … (12px minimum)');
});

check('no ad-hoc hex colour classes', () => {
  none(
    findAll(/\b[a-z-]+-\[(#[0-9A-Fa-f]{3,8})\]/g, (_f, m) => !HEX_ALLOWED.has(m.replace(/.*\[(#[0-9A-Fa-f]+)\].*/, '$1').toUpperCase())),
    'use a token (signal, money, heading, muted, line, success, …)'
  );
});

check('no old blue palette classes', () => {
  none(
    findAll(/\b(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline)-(?:sky|blue|cyan)-\d{2,3}\b/g),
    'the brand action colour is signal; use info for informational blue'
  );
});

check('font-mono only in code and identifier contexts', () => {
  none(
    findAll(/className=[^>]*\bfont-mono\b/g, (file) => !MONO_ALLOWED.some((d) => file.startsWith(d))),
    'monospace is for code; labels, prices and tags use the body font'
  );
});

check('no Sparkles icon', () => {
  none(findAll(/\bSparkles\b/g), 'pick an icon that says what the thing is');
});

console.log(`\ndesign-system: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
