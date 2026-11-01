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
/*
 * Warm Paper (UI_REDESIGN_PLAN_V3 §5) gives mono a second job besides code:
 * eyebrows, badges, codes and countdowns. Those roles live in the components
 * below, so screens get mono through them rather than by hand.
 */
const MONO_ALLOWED = [
  'components/blocks', 'components/editor', 'components/admin', 'components/modals/BlockEditorModal.tsx', 'pages/verify', 'pages/admin', 'pages/design.tsx',
  'components/ui/Badge.tsx', 'components/ui/DeviceFrame.tsx', 'components/common/PrefsControl.tsx',
  // The landing's codes, countdowns, URL pills and round numbers (plan §9 E1, E4, E5, E11).
  'components/home/landing',
  // Pseudocode questions in company mock tests are code.
  'pages/skill-test/[slug]/assessment.tsx',
];

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

/*
 * Warm Paper §13: colours come from tokens. A hex literal is allowed only as a
 * `var(--x, #…)` fallback, in a comment, or in one of these files, each for a
 * stated reason.
 */
const HEX_FILES: Record<string, string> = {
  'components/courses/CertificatePreview.tsx': 'mirrors the printed certificate PDF',
  'components/ui/Cover.tsx': 'generated course-cover palette',
  'components/blocks/CourseAnimations.tsx': 'lesson illustrations',
  'components/common/CompanyOrbitHero3D.tsx': 'retired 3D hero, kept for the studio',
  'components/companyPage/CompanyPageV2.tsx': 'the studio accent choices, light and dark',
  'components/companyPage/InteractiveSections.tsx': 'chart series on the teal band',
  'components/home/BranchGoalBand.tsx': 'category purples',
  'components/home/QuickActions.tsx': 'category purples',
  'components/home/SkillRail.tsx': 'category purples',
  'components/common/BrandTile.tsx': 'category purples',
  'components/admin/companyPage/CompanyPageStudio.tsx': 'the Google result preview',
  'components/checkout/CartModal.tsx': 'Razorpay checkout needs a hex',
  'pages/account.tsx': 'canvas image export',
  'pages/campus/[slug].tsx': 'validates and defaults a college theme hex',
  'pages/_document.tsx': 'browser theme-color meta',
  'pages/mock-drive/index.tsx': 'a chip on the always-dark card',
  'pages/skill-test/certificates/[certificateId].tsx': 'LinkedIn blue',
  'pages/my-certificates.tsx': 'LinkedIn blue',
  'components/common/TieEduLogo.tsx': 'the logo',
  'lib/briefing/briefingLogic.ts': 'per-kind tones; the card appends alpha digits to the hex',
  'lib/courseFormat.ts': 'generated course-cover palette',
  'lib/shareCard.ts': 'canvas share image',
  'lib/theme.ts': 'browser theme-color meta',
};

check('no hard-coded hex colours outside tokens', () => {
  const hits: string[] = [];
  for (const f of files) {
    if (HEX_FILES[f.rel]) continue;
    const lines = fs.readFileSync(f.abs, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').replace(/^\s*\*.*$/, '');
      const stripped = code.replace(/var\(--[\w-]+,\s*#[0-9A-Fa-f]{3,8}\)/g, '').replace(/,\s*#[0-9A-Fa-f]{3,8}\)/g, ')');
      for (const m of stripped.matchAll(/#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b(?![\w-])/g)) {
        if (/^#\d+[a-z]?$/i.test(m[0]) && !/[a-f]/i.test(m[0].slice(1))) {
          // "#01", "#123" read as numbers/labels, not colours, unless 6 digits
          if (m[0].length !== 7) continue;
        }
        hits.push(`${f.rel}:${i + 1}  ${m[0]}`);
      }
    });
  }
  none(hits, 'use a token (rgb(var(--rgb-…)) or a Tailwind colour); add a file to HEX_FILES only with a reason');
});

check('no Sparkles icon', () => {
  none(findAll(/\bSparkles\b/g), 'pick an icon that says what the thing is');
});

console.log(`\ndesign-system: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
