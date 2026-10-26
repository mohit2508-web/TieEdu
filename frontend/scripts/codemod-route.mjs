#!/usr/bin/env node
/**
 * "Route" design-system codemod.
 *
 *   node scripts/codemod-route.mjs           # dry run: counts + samples, writes nothing
 *   node scripts/codemod-route.mjs --apply   # rewrite files in place
 *
 * Moves existing markup onto the token system:
 *   1. text-[Npx]            -> the type scale (nothing below 12px)
 *   2. *-[#hex] colours      -> semantic tokens, chosen by ROLE as well as shade
 *                               (a grey used as text becomes a text token, never a
 *                               border colour that happens to be a closer shade)
 *   3. sky/blue/cyan palette -> the brand action colour family
 *   4. font-mono             -> removed outside code/ID contexts
 *
 * Purples and pinks are left alone: they are category colours (drop types).
 * The school app keeps its own brand and is skipped. Idempotent: a second run
 * finds nothing to change.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const APPLY = process.argv.includes('--apply');

const SKIP_DIRS = ['components/school', 'pages/school', 'components/companyPage'];
// Places where monospace is genuinely code or an identifier.
const MONO_ALLOWED = ['components/blocks', 'components/editor', 'components/admin', 'components/modals/BlockEditorModal.tsx', 'pages/verify', 'pages/admin'];

// ---------------------------------------------------------------- 1. type scale
function scaleFor(px) {
  if (px <= 12.5) return 'text-xs';
  if (px <= 14.5) return 'text-sm';
  if (px <= 16.5) return 'text-base';
  if (px <= 18.5) return 'text-lg';
  if (px <= 21) return 'text-xl';
  if (px <= 27) return 'text-2xl';
  if (px <= 35) return 'text-3xl';
  if (px <= 43) return 'text-4xl';
  if (px <= 52) return 'text-5xl';
  return 'text-6xl';
}

// ------------------------------------------------------------- 2. colour roles
function hexToHsl(hex) {
  const h = hex.length === 4 ? hex.slice(1).split('').map((c) => c + c).join('') : hex.slice(1, 7);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) hue = ((b - r) / d + 2) * 60;
    else hue = ((r - g) / d + 4) * 60;
  }
  // Chroma (max − min) says how far a colour is from grey regardless of how
  // light or dark it is. HSL saturation does not: near-black #10151C and warm
  // off-white #E9E7E1 both read as "saturated", which would turn a heading
  // navy and a border yellow.
  return { h: hue, s, l, c: max - min };
}

const lumOf = (hex) => hexToHsl(hex).l;
const NEUTRAL_TEXT = [
  ['heading', '#10151C'], ['ink-soft', '#2A3340'], ['body', '#3E4754'], ['muted', '#5A6470'], ['text-light', '#6B7480'],
];
const NEUTRAL_SURFACE = [
  ['card', '#FFFFFF'], ['app-warm', '#FCFBF8'], ['paper', '#F7F6F3'], ['surface-hover', '#F3F2EE'],
  ['line', '#E9E7E1'], ['line-strong', '#D6D2C8'],
];
const NEUTRAL_LINE = [['line', '#E9E7E1'], ['line-strong', '#D6D2C8'], ['muted', '#5A6470'], ['heading', '#10151C']];
const nearest = (list, l) => list.reduce((best, cur) => (Math.abs(lumOf(cur[1]) - l) < Math.abs(lumOf(best[1]) - l) ? cur : best))[0];

// Third-party brand colours (Google result blue, LinkedIn, Facebook, X/Twitter,
// WhatsApp) must keep their exact hex.
const KEEP = new Set(['#1A0DAB', '#0A66C2', '#1877F2', '#1DA1F2', '#25D366', '#000000']);
// Exact meanings the hue rules cannot infer.
const EXPLICIT = { '#241A06': 'money-ink' };

/** Returns the token for a hex in a given utility, or null to leave it unchanged. */
function tokenFor(utility, hex) {
  if (KEEP.has(hex)) return null;
  if (EXPLICIT[hex]) return EXPLICIT[hex];
  const { h, l, c } = hexToHsl(hex);
  const isText = utility === 'text' || utility === 'placeholder' || utility === 'decoration' || utility === 'caret';
  const isLine = ['border', 'divide', 'ring', 'outline'].includes(utility);

  // Neutrals: anything close to grey, at any lightness — except very light
  // TINTS (#E8F4FB, #F0F9FF), whose low chroma still carries a meaning
  // (brand panel, success panel); those fall through to their hue family.
  // Slate greys (#334155, #475569) sit just above 0.12 and are still neutral.
  const lightTint = l > 0.88 && c >= 0.055;
  if (c < 0.17 && !lightTint) {
    // Very light grey text only exists on dark bands; mid-light grey is faint
    // text on white and becomes the (now accessible) text-light.
    if (isText) return l > 0.9 ? 'white' : l >= 0.8 ? 'white/80' : nearest(NEUTRAL_TEXT, l);
    if (isLine) return l > 0.6 ? nearest(NEUTRAL_LINE.slice(0, 2), l) : nearest(NEUTRAL_LINE.slice(2), l);
    if (l < 0.35) return 'heading';
    if (l < 0.75) return 'muted';
    return nearest(NEUTRAL_SURFACE, l);
  }
  // Blues: the old primary — now the logo-orange action family; navy is the ink band.
  if (h >= 180 && h <= 250) {
    if (l >= 0.9) return isText ? 'white' : 'signal-soft';
    // Light-blue TEXT (#B8CCE4, #8AB9F1) is always a subtitle on a dark band.
    if (isText && l >= 0.65) return 'white/80';
    if (l >= 0.75) return isLine ? 'signal/30' : 'signal-soft';
    // Navy (#1F3A5F, #0E2A44): dark and only moderately chromatic.
    if (l < 0.18 || (l < 0.36 && c < 0.45)) return 'brand-ink';
    // The old primaries (#0284C7, #0369A1, #0271B5) are the action colour;
    // only the clearly darker ones (#075985 and below) are its hover shade.
    return l < 0.3 ? 'signal-hover' : 'signal';
  }
  // Light borders in a hue family stay light: a translucent tint of the
  // family colour, never the solid colour.
  // Greens and teals
  if (h > 80 && h < 180) {
    if (isLine && l >= 0.7) return 'success/30';
    if (l >= 0.86) return 'success-soft';
    return h >= 160 ? 'track' : 'success';
  }
  // Reds
  if (h >= 345 || h < 12) {
    if (isLine && l >= 0.7) return 'danger/30';
    return l >= 0.88 ? 'danger-soft' : 'danger';
  }
  // Orange-red (logo family); its dark browns (#92400E) read as amber.
  if (h >= 12 && h < 24) {
    if (isLine && l >= 0.7) return 'signal/30';
    if (l >= 0.88) return 'signal-soft';
    if (l < 0.35) return 'amber-deep';
    return l < 0.42 ? 'signal-hover' : 'signal';
  }
  // Ambers and yellows (#B45309 is h≈26, an amber-brown, not the logo red).
  // Amber TEXT on white is unreadable (#E8A33D is 2.2:1), so text maps to
  // amber-deep unless it is light amber, which only appears on dark bands.
  if (h >= 24 && h <= 65) {
    if (isLine && l >= 0.7) return 'money/40';
    if (isText) return l >= 0.55 ? 'money' : 'amber-deep';
    if (l >= 0.8) return 'warning-soft';
    if (l < 0.45) return 'amber-deep';
    return 'money';
  }
  // Purples, pinks: category colours — leave.
  return null;
}

// ------------------------------------------------- 3. blue palette -> tokens
function paletteToken(utility, shade) {
  const n = Number(shade);
  const isText = utility === 'text';
  const isLine = ['border', 'divide', 'ring', 'outline'].includes(utility);
  if (n <= 100) return isLine ? 'line' : isText ? 'signal' : 'signal-soft';
  if (n <= 300) return isLine ? 'signal/30' : isText ? 'signal' : 'signal-soft';
  if (n <= 600) return 'signal';
  if (n <= 800) return 'signal-hover';
  return 'brand-ink';
}

// ------------------------------------------------------------------- driver
const UTIL = '(bg|text|border(?:-[trblxy])?|ring|ring-offset|from|via|to|fill|stroke|divide|outline|decoration|placeholder|caret|shadow|accent)';
const HEX_CLASS = new RegExp(`\\b${UTIL}-\\[(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})\\](\\/(?:\\d{1,3}|\\[[0-9.]+\\]))?`, 'g');
const PALETTE_CLASS = new RegExp(`\\b${UTIL}-(sky|blue|cyan)-(50|100|200|300|400|500|600|700|800|900|950)(\\/\\d{1,3})?\\b`, 'g');
const PX_CLASS = /\btext-\[(\d+(?:\.\d+)?)px\]/g;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

const stats = { px: 0, hex: 0, hexKept: 0, palette: 0, mono: 0, files: 0 };
const samples = { px: new Map(), hex: new Map(), palette: new Map() };
const note = (kind, from, to) => samples[kind].set(`${from} -> ${to}`, (samples[kind].get(`${from} -> ${to}`) || 0) + 1);

for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file).replace(/\\/g, '/');
  if (SKIP_DIRS.some((d) => rel.startsWith(d))) continue;
  const before = fs.readFileSync(file, 'utf8');
  let src = before;

  src = src.replace(PX_CLASS, (m, px) => {
    const to = scaleFor(Number(px));
    stats.px++;
    note('px', m, to);
    return to;
  });

  src = src.replace(HEX_CLASS, (m, utility, hex, alpha = '') => {
    const base = utility.replace(/-[trblxy]$/, '');
    const token = tokenFor(base, hex.toUpperCase());
    if (!token) {
      stats.hexKept++;
      return m;
    }
    // A token that already carries an opacity (signal/30) wins over the source alpha.
    const out = `${utility}-${token}${token.includes('/') ? '' : alpha}`;
    stats.hex++;
    note('hex', `${utility}-[${hex.toUpperCase()}]`, out);
    return out;
  });

  src = src.replace(PALETTE_CLASS, (m, utility, _color, shade, alpha = '') => {
    const base = utility.replace(/-[trblxy]$/, '');
    const token = paletteToken(base, shade);
    const out = `${utility}-${token}${token.includes('/') ? '' : alpha}`;
    stats.palette++;
    note('palette', m.replace(/\/\d+$/, ''), out);
    return out;
  });

  if (!MONO_ALLOWED.some((d) => rel.startsWith(d))) {
    // Only inside class strings: `font-mono` as a whole word between quotes/backticks/spaces.
    src = src.replace(/(className=(?:"|\{`|\{['"])[^"`}]*?)\bfont-mono\b ?/g, (m, pre) => {
      stats.mono++;
      return pre;
    });
  }

  if (src !== before) {
    stats.files++;
    if (APPLY) fs.writeFileSync(file, src);
  }
}

const top = (m, n = 14) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `    ${String(v).padStart(4)}  ${k}`).join('\n');
console.log(`Route codemod — ${APPLY ? 'APPLIED' : 'dry run'}`);
console.log(`  files changed:        ${stats.files}`);
console.log(`  font sizes -> scale:  ${stats.px}`);
console.log(`  hex -> tokens:        ${stats.hex}   (left as category colours: ${stats.hexKept})`);
console.log(`  blue palette -> brand: ${stats.palette}`);
console.log(`  font-mono removed:    ${stats.mono}`);
console.log('\n  top font-size mappings:\n' + top(samples.px, 8));
console.log('\n  top colour mappings:\n' + top(samples.hex, process.argv.includes('--all') ? 2000 : 24));
console.log('\n  top palette mappings:\n' + top(samples.palette, 10));
