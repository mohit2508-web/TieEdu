/**
 * Phase 1 shell invariants — MOBILE_APP_UI_PLAN.md §1.1, §1.2, §1.3, §1.4.
 *
 * Same trade as `mobile-shell.test.ts`, and for the same reason: these are
 * source-level assertions, not DOM tests, because every failure mode here is
 * invisible in a screenshot on a laptop.
 *
 * The one that matters most is the height reservation. The header is
 * `position: fixed` so it can slide out of view, and a fixed element
 * contributes nothing to layout. That means the content column is solely
 * responsible for reserving the space. Delete one class and every page on the
 * site renders with its first 64px underneath the nav — no error, no warning,
 * no failing test anywhere else. `AppShell` and the header have to agree, and
 * the only cheap way to keep them agreeing is to assert both sides here.
 */
import * as fs from 'fs';
import * as path from 'path';

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

const appShell = read('src/components/layout/AppShell.tsx');
const header = read('src/components/layout/Header.tsx');
const tabBar = read('src/components/layout/MobileTabBar.tsx');
const navConfig = read('src/lib/navConfig.ts');
const css = read('src/styles/globals.css');

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

/**
 * `globals.css` with comments removed. Comments are documentation, not
 * declarations, so every rule lookup below reads this rather than the raw file.
 * Replaced with a space rather than deleted so `/* ... *\/` inside a comment
 * cannot weld two lines together and invent a selector.
 */
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, ' ');

/**
 * Body of the `{ ... }` block starting at or after `from`, brace-counted so
 * nesting works.
 *
 * The §1.2 assertions are all "this declaration is inside this rule". Written as
 * one flat regex per fact they have to guess where the rule ends, and they get
 * it wrong in both directions: a pattern that reaches past the closing brace
 * picks up declarations from the *next* rule and passes, while a pattern tight
 * enough to avoid that breaks whenever a comment is reflowed. Extracting the
 * block first makes each assertion say only what it means.
 */
function blockAt(src: string, from: number): string {
  const open = src.indexOf('{', from);
  if (open < 0) throw new Error('no block opened after offset ' + from);
  let depth = 1;
  for (let i = open + 1; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  throw new Error('unterminated block after offset ' + from);
}

/**
 * Bodies of every rule whose selector list contains `selector`, brace-counted
 * so nesting works.
 *
 * Three things this has to get right, each of which a flat regex gets wrong:
 *
 *  - Comments are stripped first. The §1.2 block documents itself by naming
 *    `.tab-bar[data-depth='detail']` in prose, and an unstripped search finds
 *    that sentence and returns the *next* rule's declarations.
 *  - All matching rules are returned, not just the first. `.tab-bar` is declared
 *    four separate times in this file (geometry, the §1.2 transition, a reduced-
 *    motion override, a mount animation), and which one answers a given question
 *    depends on the question.
 *  - A selector only counts if it actually *ends* there. `.tab-bar` is a prefix
 *    of `.tab-bar[data-depth='detail']`, so a bare `indexOf` would file the
 *    detail rule's declarations under the base selector.
 */
function rules(selector: string): string[] {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const at = cssRules.indexOf(selector, from);
    if (at < 0) return out;
    from = at + selector.length;
    if (!/^\s*[,{]/.test(cssRules.slice(from))) continue;
    out.push(blockAt(cssRules, at));
  }
}

/** True if any rule for `selector` declares something matching `decl`. */
function hasRule(selector: string, decl: RegExp): boolean {
  const bodies = rules(selector);
  if (bodies.length === 0) throw new Error('no rule for selector: ' + selector);
  return bodies.some((b) => decl.test(b));
}

/**
 * Every `@media` block whose condition matches, as bodies. `min-width: 768px`
 * appears in several places in this file, so the desktop assertions have to scan
 * all of them rather than assume the first.
 */
function mediaBlocks(condition: RegExp): string[] {
  const bodies: string[] = [];
  for (const m of cssRules.matchAll(/@media[^{]*/g)) {
    if (!condition.test(m[0])) continue;
    bodies.push(blockAt(cssRules, m.index! + m[0].length));
  }
  return bodies;
}

check('the header is fixed, not sticky', () => {
  // A sticky header keeps its slot in flow, so translating it away leaves the
  // gap it was holding open — the exact tell §1.1 removes.
  ok(/<header[\s\S]{0,400}?\bfixed\b/.test(header), 'Header must be position: fixed');
  ok(
    !/<header[\s\S]{0,400}?\bsticky\b/.test(header),
    'Header must not be sticky; a sticky element cannot slide out without leaving a gap'
  );
});

check('the content column reserves the space the fixed header gave up', () => {
  // The load-bearing assertion in this file, and it is two-sided on purpose.
  // The class on the column and the declaration in the stylesheet are separate
  // facts: rename the class and the padding silently becomes a no-op, so a
  // green test here has to mean "the rule the class resolves to still says
  // var(--header-total)".
  ok(/className="[^"]*\bpage-body\b/.test(appShell), 'AppShell content column must carry the page-body class');
  ok(
    hasRule('.page-body', /padding-top:\s*var\(--header-total\)/),
    '.page-body must reserve var(--header-total); without it every page starts under the nav'
  );
});

check('the tab bar reservation collapses on drill-down routes, in step with the bar', () => {
  // §1.2. The bar is fixed, so the column owns its space too. If only the bar
  // animates away and the padding stays, a drill-down page keeps a ~64px dead
  // strip under its last row — visible as a gap above the home indicator, and
  // worst on the list-heavy screens §1.2 is aimed at.
  ok(/data-tabbar=\{atRoot\s*\?\s*'on'\s*:\s*'off'\}/.test(appShell), 'AppShell must pass depth to .page-body as data-tabbar');
  ok(
    hasRule(".page-body[data-tabbar='off']", /padding-bottom:\s*0/),
    ".page-body[data-tabbar='off'] must release the bottom reservation"
  );
  ok(
    hasRule('.page-body', /transition:\s*padding-bottom\s+var\(--dur-base\)\s+var\(--ease-out\)/),
    'the padding must transition with the same duration and easing as the bar, or the two disagree mid-animation'
  );
  ok(
    hasRule(".tab-bar[data-depth='detail']", /transform\s+var\(--dur-base\)\s+var\(--ease-out\)/),
    'the bar must use the same duration and easing, so the pairing is checkable'
  );
});

check('the tab bar slides out but stays mounted', () => {
  // Unmounting is the regression this guards: React removes the nav, the column
  // reflows, and the bar re-enters from nothing on the way back.
  ok(
    /<nav[\s\S]{0,300}?className="tab-bar md:hidden"/.test(tabBar),
    'the bar must be rendered unconditionally, with no route-conditional mount'
  );
  ok(
    !/\{atRoot\s*&&\s*\(/.test(appShell),
    'AppShell must not gate <MobileTabBar /> on depth'
  );
  ok(
    hasRule(".tab-bar[data-depth='detail']", /transform:\s*translateY\(100%\)/),
    'the detail state must translate the bar off-canvas'
  );
  ok(
    hasRule(".tab-bar[data-depth='detail']", /opacity:\s*0/),
    'the detail state must fade, so it reads as leaving rather than being cut off'
  );
});

check('the hidden bar leaves the tab order, and only after it has slid', () => {
  // `opacity: 0` does not remove anything from the tab order, so a bar that is
  // merely transparent is still reachable by keyboard — a focus ring on an
  // invisible element. `visibility` is what fixes that, and it is discrete, so
  // it cannot tween: it has to be delayed on the way out and immediate on the
  // way back, or the bar is either unreachable or a trap for `--dur-base`.
  ok(
    hasRule(".tab-bar[data-depth='detail']", /visibility:\s*hidden/),
    'the detail state must set visibility: hidden to drop the bar from the tab order'
  );
  ok(
    hasRule(".tab-bar[data-depth='detail']", /pointer-events:\s*none/),
    'the hidden bar must not swallow taps meant for the content behind it'
  );

  // Out: delayed by the slide duration, or the bar disappears without animating.
  const hiding = rules(".tab-bar[data-depth='detail']")
    .map((b) => /visibility 0s linear ([^;]+);/.exec(b))
    .find(Boolean);
  ok(hiding, 'the detail state must declare a visibility transition');
  ok(
    /var\(--dur-base\)/.test(hiding![1]),
    'hiding must wait for the slide to finish, or the bar vanishes without animating'
  );

  // Back: immediate, or the returning bar is focusable only once it has landed.
  ok(
    hasRule('.tab-bar', /visibility 0s linear 0s/),
    'revealing must be immediate, so the bar is focusable again as it starts returning'
  );
});

check('the bar and the column derive depth from the same resolver', () => {
  // Two independent copies of the route list drift. The bar would slide out
  // while the column kept its 64px, or the reverse, and neither is a crash.
  for (const [name, src] of [['MobileTabBar', tabBar], ['AppShell', appShell]] as const) {
    ok(/isRootDepth\(router\.pathname\)/.test(src), `${name} must resolve depth via navConfig.isRootDepth`);
  }
  ok(/data-depth=\{atRoot\s*\?\s*'root'\s*:\s*'detail'\}/.test(tabBar), 'the bar must map depth to data-depth');
});

check('the tab bar still gets no desktop reservation', () => {
  // `.tab-bar` is `md:hidden`, so at `md` and up there is no bar to make room
  // for. Without this the column keeps 64px of dead space under every desktop
  // page — which is exactly the "looks fine, subtly wrong" class of bug.
  const md = mediaBlocks(/min-width:\s*768px/);
  ok(md.length > 0, 'no @media (min-width: 768px) block found to check the desktop reservation in');
  ok(
    md.some((body) => /\.page-body\s*\{[^}]*padding-bottom:\s*0/.test(body)),
    '.page-body must drop its bottom reservation at the md breakpoint'
  );
  // And the base rule must still ask for it, or the breakpoint is asserting that
  // a reservation which was never there is gone.
  ok(
    hasRule('.page-body', /padding-bottom:\s*var\(--tabbar-total\)/),
    '.page-body must reserve var(--tabbar-total) below md, the same total .tab-bar sizes itself with'
  );
});

check('reduced motion drops the tab bar travel and the padding shift', () => {
  const reduced = mediaBlocks(/prefers-reduced-motion:\s*reduce/);
  ok(reduced.length > 0, 'no prefers-reduced-motion block found');
  ok(
    reduced.some((body) => /\.tab-bar[^,{]*\{[^}]*transition:\s*none/.test(body)),
    'the tab bar must set transition:none under reduced motion, travel included'
  );
  ok(
    reduced.some((body) => /\.page-body\s*\{[^}]*transition:\s*none/.test(body)),
    '.page-body must set transition:none under reduced motion'
  );
});

// ---------------------------------------------------------------------------
// §1.3 — the native nav bar a pushed screen gets below `md`
// ---------------------------------------------------------------------------

check('a pushed screen swaps the logo row for a back/title/actions bar, below md only', () => {
  // Two rows that never coexist. If the drill bar were not `md:hidden`, desktop
  // would grow a second nav bar; if the main row were not dropped below `md`, a
  // phone would show the logo *and* a chevron.
  ok(
    /isPushedScreen\s*&&\s*\(\s*<div[^>]*data-drill-header/.test(header),
    'the drill-down bar must be gated on isPushedScreen'
  );
  // Read the whole opening tag rather than assuming attribute order.
  const drillTag = /<div[^>]*data-drill-header=""[^>]*>/.exec(header)?.[0] ?? '';
  ok(drillTag, 'could not find the drill-down bar opening tag');
  ok(
    /\bmd:hidden\b/.test(drillTag),
    'the drill-down bar must be md:hidden so the desktop bar is untouched'
  );
  ok(
    /isPushedScreen\s*\?\s*'[^']*\bhidden\b[^']*\bmd:flex\b/.test(header),
    'the shared logo row must drop below md on a pushed screen and return at md'
  );
});

check('the drill-down title and back target come from navConfig, not from the page', () => {
  // A per-page title prop is how the header drifts from the nav again, and it
  // puts a required prop back on a component whose whole design point is having
  // none.
  ok(/resolveNavTitle\(router\.pathname\)/.test(header), 'the title must come from resolveNavTitle');
  ok(/resolveBackHref\(router\.pathname\)/.test(header), 'the back target must come from resolveBackHref');
  ok(
    /export const resolveNavTitle/.test(navConfig) && /export const resolveBackHref/.test(navConfig),
    'navConfig must own both resolvers centrally'
  );
});

check('back prefers history and falls back to a resolved href', () => {
  // History is what preserves the scroll offset and filters the user left; the
  // href is what keeps a deep link in a fresh tab from dead-ending. Asserting
  // only one of them misses half the case.
  ok(/window\.history\.length\s*>\s*1/.test(header), 'back must pop history when there is any');
  ok(/router\.back\(\)/.test(header), 'back must use router.back()');
  ok(/router\.push\(backHref\)/.test(header), 'back must fall back to a resolved href');
  // Order matters: the history branch has to be tested first, or every deep link
  // silently becomes a push and the scroll position is lost.
  const handler = /const goBack[\s\S]{0,400}?\n  \};/;
  const body = handler.exec(header)?.[0] ?? '';
  ok(
    body.indexOf('router.back()') < body.indexOf('router.push('),
    'the history branch must come before the href fallback'
  );
});

check('the drill bar inherits the search and cart the tab bar gave up', () => {
  // This is the §1.2 -> §1.3 hand-off, and it is easy to miss: the tab bar slides
  // away on exactly these routes, so if the drill bar does not take its two
  // actions over, search and the cart are unreachable for the whole drill-down.
  ok(/MOBILE_TAB_ACTIONS\.map/.test(header), 'the drill bar must render MOBILE_TAB_ACTIONS');
  ok(
    /MOBILE_TAB_ACTIONS/.test(tabBar),
    'MOBILE_TAB_ACTIONS must be the same list the tab bar uses, not a second pair'
  );
  ok(/NAV_ACTIONS\[id\]/.test(header), 'the actions must resolve through NAV_ACTIONS');
});

check('the reading-progress line is compositor-only and cannot produce NaN', () => {
  // `width` would relayout the header's own box every scroll frame, putting back
  // exactly the cost the §1.1 transform was chosen to avoid.
  ok(/progressRef/.test(header), 'the progress line must be driven through a ref');
  ok(/scaleX\(\$\{p\}\)/.test(header), 'progress must be written as scaleX');
  ok(
    /className="[^"]*\borigin-left\b/.test(header),
    'the line needs origin-left, or it scales from the centre'
  );
  // A page shorter than the viewport has a scroll range of 0; without this guard
  // the write is scaleX(NaN) and the line disappears.
  ok(
    /range\s*>\s*0\s*\?/.test(header),
    'progress must guard the divide-by-zero case on short pages'
  );
  ok(/Math\.min\(1,\s*Math\.max\(0,/.test(header), 'progress must clamp, or iOS overscroll overshoots 0..1');
});

check('the progress line is not React state', () => {
  // The regression is subtle and expensive: putting progress in the `scroll`
  // state object would re-render the whole header on every scroll frame, which
  // is the one thing §1.1 was built to avoid.
  const stateSetter = /setScroll\([^)]*progress/i;
  ok(!stateSetter.test(header), 'progress must not flow through the scroll reducer state');
  // The ref is read into a local and the node is mutated directly; asserting the
  // exact expression would break on a harmless rename, so this checks the two
  // facts that matter — the node comes from the ref, and it is written to
  // imperatively rather than through JSX.
  ok(/=\s*progressRef\.current/.test(header), 'the line node must be read from progressRef');
  ok(/\.style\.transform\s*=/.test(header), 'progress must be written imperatively to the node');
});

check('the header owns its own notch inset now that it leaves the flow', () => {
  // AppShell dropped `paddingTop` from the *shell* branch when the header became
  // fixed, so the inset has to be applied by the header or a notched phone puts
  // the logo under the status bar.
  ok(/paddingTop:\s*'var\(--safe-top\)'/.test(header), 'Header must apply var(--safe-top) itself');
  ok(
    /height:\s*'var\(--header-total\)'/.test(header),
    'Header height must be the inset-inclusive total so content offsets cannot drift from it'
  );
});

check('the shell-excluded branch still pads for the notch', () => {
  // `/login`, `/signup` and `/admin/*` render no header of their own, so this
  // branch is the only thing standing between a centred login card and the
  // notch. It is easy to read the inset move as "AppShell no longer pads the
  // top" and delete it from the wrong branch.
  ok(
    /paddingTop:\s*'var\(--safe-top\)'/.test(appShell),
    'the excluded-routes branch must keep its own top inset'
  );
  ok(
    /isShellExcluded\(router\.pathname\)/.test(appShell),
    'AppShell must still branch on isShellExcluded'
  );
});

check('the header slide is a transform, not a layout property', () => {
  // Animating `top`/`margin` would relayout the whole page on every scroll
  // frame; on a mid-range Android that is the difference between smooth and a
  // visible stutter, which is worse than not animating at all.
  ok(/translate3d\(0,\s*-100%,\s*0\)/.test(header), 'hidden state must use translate3d off-canvas');
  ok(/willChange:\s*scroll\.hidden/.test(header), 'will-change must be conditional, not permanent');
});

check('reduced motion disables the slide outright', () => {
  ok(
    /transition:\s*reduceMotion\s*\?\s*'none'/.test(header),
    'Header must set transition:none under prefers-reduced-motion, not a shorter duration'
  );
});

check('the header cannot hide while it is the only way out', () => {
  // Three independent vetoes. Any one of them reverting to `true` reintroduces
  // a stranded user, so they are asserted individually.
  const vetoes = [
    { re: /belowMd\s*&&\s*!anyOpen/, why: 'an open overlay must pin the header' },
    { re: /!isPushedScreen/, why: 'a pushed screen hides the tab bar, so the header is the only nav' },
    { re: /!menuOpen/, why: 'the account menu is anchored to the header and would be dragged off with it' },
  ];
  for (const v of vetoes) {
    ok(v.re.test(header), `canHide must include the veto: ${v.why}`);
  }
});

check('the scroll listener is passive and frame-throttled', () => {
  // A non-passive scroll listener blocks the compositor and turns a smooth
  // scroll into a janky one; without rAF coalescing a single flick fires dozens
  // of state updates.
  ok(/addEventListener\('scroll',\s*onScroll,\s*\{\s*passive:\s*true\s*\}\)/.test(header), 'scroll listener must be passive');
  ok(/requestAnimationFrame/.test(header), 'scroll handling must be rAF-coalesced');
});

check('depth is resolved from navConfig, not opted into per page', () => {
  // §1.2 is explicit that this must be central, "so a new page cannot forget".
  // A per-page flag would be invisible in review and easy to miss.
  ok(/export const getNavigationDepth/.test(navConfig), 'navConfig must own getNavigationDepth');
  ok(/export const isRootDepth/.test(navConfig), 'navConfig must own isRootDepth');
  ok(
    !/navigationDepth|isRootDepth|getNavigationDepth/.test(read('src/pages/index.tsx')),
    'pages must not branch on depth themselves'
  );
});

/*
 * Deliberately NOT here: "every tab route resolves to root depth". That needs a
 * real `getNavigationDepth()` call, and this suite only reads source as text. An
 * earlier version of it counted `tab: true` matches in the file and asserted
 * nothing about depth — it passed no matter what the resolver returned, which is
 * worse than having no test, because it looked like coverage.
 *
 * The real assertion lives in `nav-config.test.ts`, which imports the resolver
 * and checks each tab route, each detail route and the `/company` + `/verify`
 * prefixes by evaluated value.
 */

console.log(`\nphase1-shell: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
