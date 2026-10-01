/**
 * Design-token sync — guards the `tailwind.config.js` <-> `globals.css` duplication.
 *
 * WHY THIS TEST EXISTS
 *
 * `theme.extend.colors` in `tailwind.config.js` has to repeat the hex values that
 * live in `:root` in `globals.css`. It cannot reference `var(--brand-accent)`
 * instead, because Tailwind can only apply an opacity modifier (`bg-brand-orange/10`)
 * to a colour it can parse as a literal. A `var()` entry compiles fine and then
 * silently breaks every `/NN` variant of itself.
 *
 * That duplication is a drift risk, and drift here is invisible: change a hex in
 * one file and the other keeps serving the old value with no error anywhere. So
 * the two are asserted equal.
 *
 * WHY THE brand ALIASES EXIST
 *
 * The interview feature was written against `brand-orange` and `brand-navy`,
 * classes for which no CSS variable has ever existed. The Tailwind theme had no
 * `colors` key at all, so all 47 of those usages compiled to no rule and the
 * interview page's orange accents simply did not render. They are now defined as
 * aliases of the tokens that were clearly intended.
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
function eq(actual: unknown, expected: string | undefined, what: string) {
  if (expected === undefined) {
    throw new Error(`${what}: globals.css has no such variable, so the config entry has nothing to match`);
  }
  if (actual !== expected) {
    throw new Error(`${what}: tailwind.config has ${JSON.stringify(actual)}, globals.css has ${JSON.stringify(expected)}`);
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

// The runner compiles every suite into `.test-build/emit`, so `__dirname` points
// there and a relative `require('../tailwind.config.js')` resolves inside the
// build output. The config has to be loaded from the real package root.
const config = require(path.join(ROOT, 'tailwind.config.js'));

const css = fs.readFileSync(path.join(ROOT, 'src/styles/globals.css'), 'utf8');

/** Every `--token: value` declaration in the stylesheet. */
const vars = new Map<string, string>();
for (const m of css.matchAll(/^\s*--([a-z0-9-]+):\s*([^;]+);/gm)) {
  vars.set(m[1], m[2].trim());
}

const colors = config.tokens;

// family.sub -> the CSS variable it must match. `DEFAULT` entries are checked
// against the bare family name.
const MAPPING: Array<[string, string]> = [
  ['app', 'bg-app'],
  ['app-warm', 'bg-app-warm'],
  ['surface', 'bg-surface'],
  ['surface-hover', 'bg-surface-hover'],
  ['sky-soft', 'bg-sky-soft'],
  ['border.subtle', 'border-subtle'],
  ['border.strong', 'border-strong'],
  ['ink.DEFAULT', 'ink'],
  ['ink.soft', 'ink-soft'],
  ['brand.sky', 'brand-sky'],
  ['brand.sky-strong', 'brand-sky-strong'],
  ['brand.sky-soft', 'brand-sky-soft'],
  ['brand.primary', 'brand-primary'],
  ['brand.ink', 'brand-ink'],
  ['brand.accent', 'brand-accent'],
  ['brand.accent-hover', 'brand-accent-hover'],
  ['brand.mint', 'brand-mint'],
  ['text.heading', 'text-heading'],
  ['text.body', 'text-body'],
  ['text.muted', 'text-muted'],
  ['text.light', 'text-light'],
  ['success', 'color-success'],
  ['warning', 'color-warning'],
  ['error', 'color-error'],
  ['info', 'color-info'],
  ['accent-ink', 'accent-ink'],
  ['amber-deep', 'amber-deep'],
];

for (const [configPath, cssVar] of MAPPING) {
  check(`colors.${configPath} matches --${cssVar}`, () => {
    const value = configPath
      .split('.')
      .reduce<any>((acc, key) => (acc == null ? acc : acc[key]), colors);
    if (value === undefined) {
      throw new Error(`colors.${configPath} is missing from tailwind.config.js`);
    }
    eq(value, vars.get(cssVar), `colors.${configPath} vs --${cssVar}`);
  });
}

// The two aliases that fixed the interview page. They intentionally have no CSS
// variable of their own, so they are asserted against the tokens they mirror.
check('brand.orange aliases brand.accent', () => {
  eq(colors.brand.orange, colors.brand.accent, 'brand.orange vs brand.accent');
});
check('brand.navy aliases brand.ink', () => {
  eq(colors.brand.navy, colors.brand.ink, 'brand.navy vs brand.ink');
});

check('the interview aliases are actually reachable as classes', () => {
  // The regression that prompted all of this: these two class names were used 47
  // times and resolved to nothing. Assert the theme exposes them.
  if (typeof colors.brand?.orange !== 'string') throw new Error('bg-brand-orange would compile to nothing');
  if (typeof colors.brand?.navy !== 'string') throw new Error('to-brand-navy would compile to nothing');
});

for (const name of Object.keys(config.boxShadow)) {
  check(`boxShadow.${name} matches --shadow-${name}`, () => {
    eq(config.boxShadow[name], vars.get(`shadow-${name}`), `boxShadow.${name} vs --shadow-${name}`);
  });
}

console.log(`\ndesign-tokens: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
