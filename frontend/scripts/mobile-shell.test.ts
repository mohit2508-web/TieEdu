/**
 * Mobile shell invariants — Phase 0 (MOBILE_APP_UI_PLAN.md §13).
 *
 * Every assertion here corresponds to a bug that was actually shipped, or to a
 * platform behaviour that only shows up on real hardware. They are cheap to
 * check and impossible to eyeball, which is exactly the profile of a guard
 * worth having: DevTools cannot show a notch inset, and a 64px bar that renders
 * fine on a laptop can be 30px tall on an iPhone.
 *
 * These are *source-level* assertions, not DOM tests. That is a deliberate
 * trade: they run in the existing plain-node runner with no DOM, and they fail
 * with a message that names the file and the fix, which is what matters when
 * someone refactors the header at 11pm.
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
function ok(value: unknown, note: string) {
  if (!value) throw new Error(note);
}

/** Walk up from the compiled location to the package root, like the other suites. */
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
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const GLOBALS = 'src/styles/globals.css';
const css = read(GLOBALS);

/**
 * Strip CSS comments before asserting on the stylesheet.
 *
 * Without this, the assertions below match their own explanatory prose: the
 * `.tab-bar` rule documents *why* it must not be sized to `--tabbar-h`, in a
 * comment containing that exact string. A test that greps raw CSS will fail on
 * the comment that explains the fix, which is the fastest way to get a guard
 * deleted.
 */
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '');

const rules = stripComments(css);

/** The text of one rule block, from its selector to the matching `}`. */
function block(selector: string): string {
  // Match the selector at a rule boundary only. A naive `indexOf('body')` also
  // matches `.empty-body`, `body-scroll`, or the word inside a property, and
  // then the assertion reads an unrelated block and fails for no reason.
  const atRuleStart = new RegExp(`(^|[}\\n;])\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`, 'm');
  const match = atRuleStart.exec(rules);
  if (!match) throw new Error(`no rule found for ${selector}`);
  const open = match.index + match[0].length - 1;
  let depth = 0;
  for (let i = open; i < rules.length; i += 1) {
    if (rules[i] === '{') depth += 1;
    if (rules[i] === '}') {
      depth -= 1;
      if (depth === 0) return rules.slice(open, i + 1);
    }
  }
  throw new Error(`unterminated rule for ${selector}`);
}

/** Every source file, so the sticky-offset rule can be checked globally. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const SOURCES = walk(path.join(ROOT, 'src'));

// --- safe areas -------------------------------------------------------------

check('safe-area vars are defined once, in :root', () => {
  for (const v of ['--safe-top', '--safe-bottom', '--safe-left', '--safe-right']) {
    ok(css.includes(`${v}: env(`), `${GLOBALS} must define ${v} via env()`);
  }
});

check('header and tab bar expose inset-inclusive totals', () => {
  // The bug these prevent: with `box-sizing: border-box`, a bar sized to
  // `--tabbar-h` plus `padding-bottom: <inset>` spends the inset INSIDE the bar,
  // so a 64px bar becomes 30px of tappable icon on a notched phone.
  ok(css.includes('--header-total: calc(var(--header-h) + var(--safe-top))'), 'missing --header-total');
  ok(css.includes('--tabbar-total: calc(var(--tabbar-h) + var(--safe-bottom))'), 'missing --tabbar-total');
});

check('the tab bar is sized by the inset-inclusive total, not the bare height', () => {
  const barBlock = block('.tab-bar');
  ok(barBlock.includes('height: var(--tabbar-total)'), '`.tab-bar` must use --tabbar-total');
  ok(!/height:\s*var\(--tabbar-h\)/.test(barBlock), '`.tab-bar` must not size to --tabbar-h');
});

check('no source still pins a sticky bar to the inset-blind header height', () => {
  // Every one of these was a bar that slid under the header on a notched phone.
  const offenders = SOURCES.filter((f) => fs.readFileSync(f, 'utf8').includes('top-[var(--header-h)]'));
  ok(
    offenders.length === 0,
    `these still use top-[var(--header-h)], which ignores the notch:\n    ${offenders
      .map((f) => path.relative(ROOT, f))
      .join('\n    ')}`
  );
});

check('anchor scrolling accounts for the notch too', () => {
  ok(css.includes('scroll-padding-top: calc(var(--header-total) + 1rem)'), 'scroll-padding-top must use --header-total');
});

// --- touch behaviour --------------------------------------------------------

check('the tap-highlight flash is suppressed', () => {
  // Without this, every tap in the app flashes grey/blue and announces itself as
  // a web link.
  ok(css.includes('-webkit-tap-highlight-color: transparent'), 'missing -webkit-tap-highlight-color');
});

check('the document does not rubber-band on drag', () => {
  ok(css.includes('overscroll-behavior-y: none'), 'missing overscroll-behavior-y: none');
});

check('double-tap zoom delay is removed without killing pinch-zoom', () => {
  // `touch-action: none` would also disable pinch-zoom, which is an
  // accessibility regression, so the assertion is specifically for `manipulation`.
  ok(css.includes('touch-action: manipulation'), 'missing touch-action: manipulation');
  ok(!/^\s*touch-action:\s*none;?\s*$/m.test(css), 'touch-action: none would disable pinch-zoom');
});

check('body must not become a scroll container', () => {
  // `overflow: hidden` or `contain` on body/html would stop the document from
  // scrolling at all, and `position: sticky` on the header — the entire nav
  // mechanism — silently stops working. `overflow-x: clip` is allowed on
  // purpose: it kills horizontal scroll without creating a scroll container, so
  // `position: fixed` overlays still escape clipping on iOS.
  const bodyBlock = block('body');
  ok(!/overflow(-y)?:\s*hidden/.test(bodyBlock), 'body must not use overflow: hidden');
  ok(!/overflow:\s*hidden/.test(bodyBlock), 'body must not use overflow: hidden');
  ok(!/contain:\s*(strict|layout|paint|content)/.test(bodyBlock), 'body must not use contain (breaks sticky)');
});

check('horizontal overflow is clipped, not hidden', () => {
  const bodyBlock = block('body');
  ok(/overflow-x:\s*clip/.test(bodyBlock), 'body should use overflow-x: clip to preserve fixed-overlay escape');
});

// --- press feedback ---------------------------------------------------------

check('the press primitive exists and scales on :active', () => {
  ok(css.includes('.pressable:active'), 'globals.css must define .pressable:active');
  ok(css.includes('.pressable {'), 'globals.css must define .pressable');
});

check('press feedback is reduced-motion aware, not removed', () => {
  const after = rules.slice(rules.indexOf('.pressable {'));
  ok(after.includes('prefers-reduced-motion'), '.pressable needs a reduced-motion branch');
});

// --- density ----------------------------------------------------------------

check('mobile leading is tighter than desktop', () => {
  // 1.75 is web-article leading and is the single most "blog" signal in the
  // typography. Desktop keeps it deliberately (plan non-goals).
  ok(/line-height:\s*1\.55/.test(css), 'mobile body leading should be 1.55');
  ok(/line-height:\s*1\.75/.test(css), 'desktop leading should remain 1.75');
});

// --- viewport / installability ---------------------------------------------

check('the viewport opts into edge-to-edge', () => {
  // Location matters as much as content. The tag used to live in `_document.tsx`,
  // which put a *second* one on every page because Next's Pages Router seeds the
  // head with its own and `next/document`'s `<Head>` does not dedupe. It belongs
  // in `next/head` (here, in `_app.tsx`), which does dedupe `<meta>` by `name`.
  // `anti-web.test.ts` additionally asserts the emitted HTML has exactly one.
  const app = read('src/pages/_app.tsx');
  ok(app.includes('viewport-fit=cover'), '_app must set viewport-fit=cover, or env() insets stay 0');
  ok(app.includes('initial-scale=1'), '_app must set initial-scale=1');
  // Match the JSX element, not the bare substring: the comment in `_document.tsx`
  // quotes `<meta name="viewport" ...>` to explain why the tag is *not* there, and
  // a substring check trips on its own explanation.
  ok(
    !/<meta\b[^>]*\bname="viewport"/.test(read('src/pages/_document.tsx')),
    '_document must not declare a viewport tag: next/document <Head> does not dedupe, so it duplicates Next\'s default and leaves the browser to pick'
  );
  const doc = read('src/pages/_document.tsx');
  ok(doc.includes('apple-mobile-web-app-capable'), 'missing apple-mobile-web-app-capable');
});

check('a valid installable manifest is served', () => {
  const manifest = JSON.parse(read('public/manifest.json'));
  ok(manifest.display === 'standalone', 'manifest.display must be standalone to hide the browser chrome');
  ok(typeof manifest.start_url === 'string' && manifest.start_url.length > 0, 'manifest needs start_url');
  ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'manifest needs icons');
  ok(typeof manifest.theme_color === 'string', 'manifest needs theme_color');
});

check('the manifest is declared in the document head', () => {
  ok(read('src/pages/_app.tsx').includes('rel="manifest"'), '_app must link the manifest');
});

// --- service worker correctness --------------------------------------------

check('the service worker never caches entitlement or money routes', () => {
  // The failure this prevents is severe and quiet: a cached `is_unlocked: false`
  // showing a paying student locked out of content they own, or a stale cart
  // total at checkout.
  const sw = read('public/sw.js');
  for (const route of ['/api/orders', '/api/payments', '/api/auth']) {
    ok(sw.includes(route), `sw.js never-cache list is missing ${route}`);
  }
  ok(
    /request\.method\s*!==\s*'GET'/.test(sw),
    'sw.js must ignore non-GET requests outright'
  );
});

check('the service worker is not cached by the browser', () => {
  // A cached sw.js can never be replaced, so the app silently stops updating
  // until the user clears site data.
  const config = read('next.config.mjs');
  ok(config.includes("source: '/sw.js'"), 'next.config.mjs must set headers for /sw.js');
  ok(/no-store/.test(config), 'sw.js headers must include no-store');
});

check('the service worker is registered in production only', () => {
  const app = read('src/pages/_app.tsx');
  ok(app.includes('serviceWorker'), '_app must register the service worker');
  ok(
    /NODE_ENV\s*!==\s*'production'/.test(app),
    'registration must be gated on production so dev never serves a stale shell'
  );
});

check('the offline fallback document exists', () => {
  ok(fs.existsSync(path.join(ROOT, 'public/offline.html')), 'public/offline.html is missing');
});

// --- overlay discipline -----------------------------------------------------

check('no page renders its own chrome', () => {
  // The AppShell owns the header, drawer, tab bar and overlays. A page that
  // mounts one of them again is back to the bug the shell was introduced to fix.
  const offenders: string[] = [];
  for (const file of SOURCES.filter((f) => f.includes(`${path.sep}pages${path.sep}`))) {
    const text = fs.readFileSync(file, 'utf8');
    if (/<Header|<CartModal|<SearchModal|<LeaderboardModal|<MobileTabBar/.test(text)) {
      offenders.push(path.relative(ROOT, file));
    }
  }
  ok(offenders.length === 0, `pages must not mount chrome directly:\n    ${offenders.join('\n    ')}`);
});

console.log(`\nmobile-shell: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
