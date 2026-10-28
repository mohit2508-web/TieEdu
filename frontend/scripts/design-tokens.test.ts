/**
 * Design tokens — the "Warm Paper" system (UI_REDESIGN_PLAN_V3).
 *
 * Colours are declared once in `globals.css` as RGB channels (`--rgb-*`) and
 * read by Tailwind as `rgb(var(--rgb-x) / <alpha-value>)`. That removes the old
 * hex duplication (and its drift risk) but creates a different one: a channel
 * referenced by Tailwind but missing from a theme compiles silently to an
 * invalid colour. So this suite asserts:
 *
 *   - every Tailwind colour is channel-based (no frozen hex literals, which
 *     would ignore the dark theme and break opacity modifiers);
 *   - every channel it references exists in the light theme AND the dark theme;
 *   - the brand aliases the interview feature relies on still resolve;
 *   - the key text/background pairs meet WCAG AA in both themes;
 *   - amber carries dark ink, never white; links use the teal `link` token;
 *   - the logo's own colour is unchanged;
 *   - every Tailwind shadow resolves to a declared CSS variable.
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

const ROOT = findRoot();
// The runner compiles suites into `.test-build/emit`; load the config from the real root.
const config = require(path.join(ROOT, 'tailwind.config.js'));
const css = fs.readFileSync(path.join(ROOT, 'src/styles/globals.css'), 'utf8');

/** `--name: value` declarations inside the first block matching `selector {`. */
function block(selector: string): Map<string, string> {
  const start = css.indexOf(selector + ' {');
  if (start === -1) throw new Error(`globals.css has no "${selector}" block`);
  const end = css.indexOf('\n}', start);
  const body = css.slice(start, end);
  const out = new Map<string, string>();
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out.set(m[1], m[2].trim());
  return out;
}

const light = block(':root');
const dark = block(":root[data-theme='dark']");

/** Flattens the Tailwind colour tree to [path, value] pairs. */
function leaves(node: any, prefix = ''): Array<[string, string]> {
  if (typeof node === 'string') return [[prefix, node]];
  return Object.entries(node).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
}

const CHANNEL_RE = /^rgb\(var\(--(rgb-[a-z0-9-]+)\) \/ <alpha-value>\)$/;

for (const [name, value] of leaves(config.tokens)) {
  check(`colors.${name} is channel-based`, () => {
    if (!CHANNEL_RE.test(value)) throw new Error(`expected rgb(var(--rgb-…) / <alpha-value>), got ${value}`);
  });
  const channel = value.match(CHANNEL_RE)?.[1];
  if (!channel) continue;
  check(`colors.${name}: --${channel} exists in the light theme`, () => {
    if (!light.has(channel)) throw new Error(`--${channel} is not declared in :root`);
  });
  check(`colors.${name}: --${channel} exists in the dark theme`, () => {
    if (!dark.has(channel)) throw new Error(`--${channel} is not declared in :root[data-theme='dark']`);
  });
}

check('brand.orange aliases brand.accent', () => {
  if (config.tokens.brand.orange !== config.tokens.brand.accent) throw new Error('brand.orange drifted from brand.accent');
});
check('brand.navy aliases brand.ink', () => {
  if (config.tokens.brand.navy !== config.tokens.brand.ink) throw new Error('brand.navy drifted from brand.ink');
});

// ---- contrast ---------------------------------------------------------------
function rgbOf(theme: Map<string, string>, name: string): number[] {
  const v = theme.get(name) ?? light.get(name);
  if (!v) throw new Error(`--${name} missing`);
  return v.split(/\s+/).map(Number);
}
function lum([r, g, b]: number[]): number {
  const f = (x: number) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a: number[], b: number[]): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const PAIRS: Array<[string, string, number]> = [
  ['rgb-text-body', 'rgb-bg-app', 4.5],
  ['rgb-text-muted', 'rgb-bg-surface', 4.5],
  ['rgb-text-light', 'rgb-bg-app', 4.5], // captions, footer fine print
  ['rgb-text-heading', 'rgb-bg-app', 4.5],
  ['rgb-link', 'rgb-bg-surface', 4.5], // links (amber is never link text)
  ['rgb-link', 'rgb-bg-app', 4.5],
  ['rgb-on-primary', 'rgb-signal', 4.5], // text on the amber fill
  ['rgb-on-primary', 'rgb-signal-hover', 3], // pressed fill, button labels are 15px/600
  ['rgb-secondary', 'rgb-secondary-soft', 4.5],
  ['rgb-on-hero', 'rgb-brand-ink', 4.5], // text on the teal band
  ['rgb-on-hero-muted', 'rgb-brand-ink', 4.5],
  ['rgb-ink', 'rgb-highlight', 4.5], // the marker
  ['rgb-info', 'rgb-info-soft', 4.5],
  ['rgb-rose', 'rgb-rose-soft', 4.5],
  ['rgb-text-muted', 'rgb-bg-surface-hover', 4.5],
  ['rgb-signal-ink', 'rgb-signal-soft', 4.5],
  ['rgb-money-ink', 'rgb-money', 4.5],
  ['rgb-success', 'rgb-bg-surface', 4.5],
  ['rgb-success', 'rgb-bg-surface-hover', 4.5], // green chips on tinted backgrounds
  ['rgb-warning', 'rgb-bg-surface', 4.5],
  ['rgb-danger', 'rgb-bg-surface', 4.5],
];
for (const [fg, bg, min] of PAIRS) {
  for (const [label, theme] of [['light', light], ['dark', dark]] as const) {
    check(`contrast ${fg} on ${bg} (${label}) ≥ ${min}`, () => {
      const r = ratio(rgbOf(theme, fg), rgbOf(theme, bg));
      if (r < min) throw new Error(`${r.toFixed(2)}:1`);
    });
  }
}
// White on amber is 2.0:1. The rule is dark ink on amber; this fails loudly if
// someone "fixes" a button back to white text by retuning the palette.
check('white text on the light action colour is not readable (amber takes ink)', () => {
  const r = ratio([255, 255, 255], rgbOf(light, 'rgb-signal'));
  if (r >= 4.5) throw new Error(`white on --rgb-signal is ${r.toFixed(2)}:1 — the palette changed; review the on-primary rule`);
});
check('amber is never link text on paper (link is its own token)', () => {
  if (config.tokens.link === config.tokens.signal.DEFAULT) throw new Error('link aliases signal');
});
check('the logo colour is unchanged (owner decision)', () => {
  if (light.get('rgb-logo') !== '248 65 9') throw new Error(`light --rgb-logo is ${light.get('rgb-logo')}`);
  if (dark.get('rgb-logo') !== '255 94 46') throw new Error(`dark --rgb-logo is ${dark.get('rgb-logo')}`);
});
check('text on amber fills is re-pointed to on-primary in both themes', () => {
  const rule = css.indexOf('TEXT ON AMBER');
  if (rule === -1 || !/\.bg-signal[\s\S]{0,900}color: rgb\(var\(--rgb-on-primary\)\)/.test(css.slice(rule))) throw new Error('rule missing');
});
// The dark palette remap in globals.css: status text on its tint, and
// on-accent text on the fills that turn light in dark.
const DARK_PAIRS: Array<[string, string]> = [
  ['rgb-danger', 'rgb-danger-soft'],
  ['rgb-success', 'rgb-success-soft'],
  ['rgb-warning', 'rgb-warning-soft'],
  ['rgb-info', 'rgb-info-soft'],
  ['rgb-purple', 'rgb-purple-soft'],
  ['rgb-on-accent', 'rgb-signal'],
  ['rgb-on-accent', 'rgb-success'],
  ['rgb-on-accent', 'rgb-track'],
  ['rgb-on-accent', 'rgb-brand-mint'],
  ['rgb-on-accent', 'rgb-amber-deep'],
  ['rgb-on-accent', 'rgb-danger'],
  ['rgb-text-heading', 'rgb-brand-ink'], // bg-heading code blocks remap to the band
];
for (const [fg, bg] of DARK_PAIRS) {
  check(`contrast ${fg} on ${bg} (dark remap) ≥ 4.5`, () => {
    const r = ratio(rgbOf(dark, fg), rgbOf(dark, bg));
    if (r < 4.5) throw new Error(`${r.toFixed(2)}:1`);
  });
}
check('dark remap rules are all scoped to the dark theme', () => {
  const start = css.indexOf('/* ---- Dark mode: legacy palette remap');
  if (start === -1) throw new Error('remap section missing');
  const bad = css
    .slice(start)
    .split('\n')
    .filter((l) => /^[^\s/*].*[{,]\s*$/.test(l) && !l.startsWith(":root[data-theme='dark']"));
  if (bad.length) throw new Error(`unscoped selector(s): ${bad.join(' | ')}`);
});
// Drop type chips are white text on a per-type hex, the same in both themes.
const drops = [...light].filter(([k]) => k.startsWith('drop-'));
check('drop chip colours are declared', () => {
  if (drops.length < 10) throw new Error(`found ${drops.length} --drop-* colours`);
});
for (const [name, hex] of drops) {
  check(`white text on --${name} ≥ 4.5`, () => {
    const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) throw new Error(`expected #rrggbb, got ${hex}`);
    const r = ratio([255, 255, 255], m.slice(1).map((x) => parseInt(x, 16)));
    if (r < 4.5) throw new Error(`${r.toFixed(2)}:1`);
  });
}
check('white text on the mint badge ≥ 4.5', () => {
  const r = ratio([255, 255, 255], rgbOf(light, 'rgb-brand-mint'));
  if (r < 4.5) throw new Error(`${r.toFixed(2)}:1`);
});

// ---- shadows resolve to declared variables ----------------------------------
// Tailwind shadows are `var(--shadow-x)` so the dark theme can swap them.
for (const name of Object.keys(config.boxShadow)) {
  check(`boxShadow.${name} is var(--shadow-${name}) and declared`, () => {
    if (config.boxShadow[name] !== `var(--shadow-${name})`) throw new Error(`got ${JSON.stringify(config.boxShadow[name])}`);
    if (!light.has(`shadow-${name}`)) throw new Error(`--shadow-${name} is not declared in :root`);
  });
}
check('shadows are ink-tinted, not the old cool grey', () => {
  if (/rgba\(16, 21, 28/.test(css)) throw new Error('found rgba(16, 21, 28, …) — use rgb(var(--rgb-shadow) / a)');
});

console.log(`\ndesign-tokens: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
