/**
 * Mobile layout guards — the failures a phone shows and a desktop never does.
 *
 * Grid blowout: `grid gap-4 lg:grid-cols-3` has a single implicit column on a
 * phone, sized `auto`, which grows to the widest unbreakable child. One long
 * URL inside a card made the Today screen 554px wide on a 390px phone, and the
 * browser zoomed the whole page out to fit. A base `grid-cols-1`
 * (minmax(0, 1fr)) lets the column shrink to the screen instead.
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
const files: string[] = [];
const walk = (d: string) => {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) files.push(p);
  }
};
walk(path.join(ROOT, 'src'));

check('every responsive grid declares its phone column (no grid blowout)', () => {
  const offenders: string[] = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    for (const m of text.matchAll(/className="([^"]*)"/g)) {
      const t = m[1].split(/\s+/);
      if (!t.includes('grid')) continue;
      if (!t.some((c) => /^(sm|md|lg|xl|2xl):grid-cols-/.test(c))) continue;
      if (t.some((c) => /^grid-cols-/.test(c) || /grid-flow-col/.test(c))) continue;
      const line = text.slice(0, m.index).split('\n').length;
      offenders.push(`${path.relative(ROOT, f)}:${line}`);
    }
  }
  if (offenders.length) {
    throw new Error(`add grid-cols-1 (or another base column count) to:\n      ${offenders.join('\n      ')}`);
  }
});

check('a .btn has a height even without padding of its own', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/styles/globals.css'), 'utf8');
  const block = css.slice(css.indexOf('.btn {'), css.indexOf('}', css.indexOf('.btn {')));
  if (!/min-height:\s*36px/.test(block)) throw new Error('.btn lost its min-height (an unpadded button collapses to 18px)');
});

check('the touch-target floor sets height only (a min-width crushes flex chips)', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/styles/globals.css'), 'utf8');
  const start = css.indexOf('@media (pointer: coarse) {\n  :where(a[href]');
  if (start === -1) throw new Error('touch-target floor missing');
  // Comments stripped: the block's own comment explains, by name, why there is no min-width.
  const block = css.slice(start, css.indexOf('\n}', start)).replace(/\/\*[\s\S]*?\*\//g, '');
  if (!/min-height:\s*24px/.test(block)) throw new Error('touch-target floor lost its 24px min-height');
  if (/min-width\s*:/.test(block)) throw new Error('touch-target floor must not set min-width');
});

console.log(`\nmobile-layout: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
