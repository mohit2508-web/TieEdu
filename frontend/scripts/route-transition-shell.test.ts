/**
 * Phase 1 — MOBILE_APP_UI_PLAN.md §1.4. Route transition invariants.
 *
 * The keyframes themselves are unit-tested against real values in
 * `route-transition.test.ts`. This suite covers the things that are correct in
 * isolation and wrong in combination — the wiring — and that a screenshot cannot
 * show.
 *
 * The two that matter most are both about *how* the exit is produced:
 *
 *  - the key must change in the same commit as the page swaps. `AnimatePresence`
 *    renders the outgoing element with the children it had when it began
 *    exiting, so a key bumped from an effect one commit late makes the NEW page
 *    slide out. Nothing throws; it just looks like the animation is running
 *    backwards.
 *  - the mode must be `popLayout`. `wait` serialises the push into a fade, and
 *    `sync` leaves both screens in flow, so the document is briefly twice as
 *    tall and the header's scroll state reads a height about to change.
 */
import * as fs from 'fs';
import * as path from 'path';

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

const rtRaw = read('src/components/layout/RouteTransition.tsx');
const appRaw = read('src/pages/_app.tsx');

/**
 * Source invariants are asserted against comments-stripped, whitespace-collapsed
 * text. The first version of this suite matched raw source with
 * `[\s\S]{0,200}` hops, which is not a weaker check — it is a check that breaks
 * the moment a legitimate comment is inserted, so the next person to touch this
 * deletes or "fixes" the assertion instead of the behaviour. Comments explain
 * *why* the code is shaped this way; they must not be load-bearing for the test.
 */
function normalize(src: string): string {
  return src
    // JSX comments first: they are `/* */` wrapped in braces, so stripping the
    // inner form alone would leave a bare `{ }` in the text.
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const rt = normalize(rtRaw);
const app = normalize(appRaw);

/** Assert a strict nesting order by source position. */
function ordered(haystack: string, needles: string[], note: string) {
  let prev = -1;
  for (const needle of needles) {
    const idx = haystack.indexOf(needle);
    if (idx === -1) throw new Error(`${note}: not found — ${needle}`);
    if (idx <= prev) throw new Error(`${note}: ${needle} is out of order`);
    prev = idx;
  }
}

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
function eq(actual: unknown, expected: unknown, note: string) {
  if (actual !== expected) {
    throw new Error(`${note}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

check('the transition is mounted around the page, inside the shell', () => {
  // Around the page and inside `AppShell`. Wrapping `AppShell` instead would
  // slide the header, tab bar and overlays off screen and back on every
  // navigation, which is the "web page" tell §1.4 exists to remove.
  ordered(
    app,
    [
      '<AppShell>',
      '<RouteTransition>',
      '<Component {...pageProps} />',
      '</RouteTransition>',
      '</AppShell>',
    ],
    'RouteTransition must wrap the page and sit inside AppShell'
  );
});

check('the exit mode is popLayout', () => {
  ok(
    /<AnimatePresence\s+mode="popLayout"/.test(rt),
    'must use mode="popLayout": `wait` serialises the push away, `sync` double-heights the document'
  );
  ok(!/mode="wait"/.test(rt), 'mode="wait" loses the overlapping push');
  ok(!/mode="sync"/.test(rt), 'mode="sync" leaves both screens in normal flow');
});

check('the first load does not animate', () => {
  // Two independent guards, and both are wanted: `initial={false}` stops
  // AnimatePresence playing `initial` for the first child, and the isReady check
  // means there is no navigation to animate even before the router is ready.
  ok(/<AnimatePresence[^>]*initial=\{false\}/.test(rt), 'AnimatePresence needs initial={false}');
  ok(
    rt.includes('if (!router.isReady) return <>{children}</>;'),
    'must bail before the router is ready — a hard load still has the previous pathname, so a transition would be computed against a route the user never visited'
  );
});

check('the key is derived during render, not bumped from an effect', () => {
  // The regression this guards is subtle and looks correct in review. Next.js
  // re-renders with the new page one commit before a `useEffect` on
  // routeChangeComplete runs, so an effect-bumped key leaves the still-old key
  // holding the NEW children — and AnimatePresence then slides the new page out
  // on the way in.
  //
  // This asserts the exact inline form rather than a blanket "no useState". The
  // first version of this check banned the hook outright, which was a proxy for
  // the invariant rather than the invariant itself: it then failed the moment the
  // component legitimately needed state for the `md` media query, and the easy
  // "fix" would have been to delete the assertion. A key that is this exact
  // expression cannot be state-driven, so pinning the expression is the real
  // protection.
  ok(
    /const key = animating \? `\$\{nav\.from\}=>\$\{router\.asPath\}` : 'static';/.test(rt),
    'the key must be computed inline from the router during render'
  );
  ok(/key=\{key\}/.test(rt), 'the animated element must be keyed by that local const');
  ok(
    !/const key = [^;]*\buseState|setKey\(/.test(rt),
    'the key must not be bumped from a state setter'
  );
  ok(
    /useRef/.test(rt),
    'pending navigation bookkeeping belongs in a ref, which does not cause a render'
  );
});

check('the transition is mobile-only, so desktop navigation is untouched', () => {
  // The plan scopes every mobile rule with `md:` and treats desktop as a
  // verification gate, not a design target. This one is motion in JS, so `md:`
  // cannot scope it — without this gate every desktop navigation slides 24px.
  ok(
    /matchMedia\('\(min-width: 768px\)'\)/.test(rt),
    'the breakpoint must be Tailwind\'s md (768px), the same edge the chrome uses'
  );
  ok(
    /if \(wideViewport\) return <>\{children\}<\/>/.test(rt),
    'desktop must render the page unwrapped'
  );
});

check('shallow route changes are never animated', () => {
  // A guard, not a fix: nothing in the app shallow-navigates today (every
  // `router.push` is a real route change). It is here because the failure it
  // prevents is easy to reintroduce and expensive — a query-only change that
  // swaps the page component cross-fades the whole page on every tap, and a
  // cross-fade that resets scroll loses the reader's place.
  ok(
    /const animating = nav !== null && !nav\.shallow;/.test(rt),
    'the animation must be gated on a non-shallow navigation'
  );
  ok(
    /const key = animating \?[^:]+: 'static';/.test(rt),
    'a shallow change must keep one static key so the element updates in place'
  );
});

check('direction comes from Next\'s own beforePopState hook, not a popstate listener', () => {
  // The Pages Router has no "back" signal, and the obvious inference — "popstate
  // fires, then routeChangeStart" — is wrong. A `window` popstate listener
  // registers after Next's own, listeners run in registration order, and for a
  // cached route Next's handler emits routeChangeStart synchronously. Measured:
  // routeChangeStart at 1741ms, popstate at 1743ms. A listener-based flag is
  // therefore always one event too late and every back animates forwards.
  ok(
    /router\.beforePopState\(\(\) =>/.test(rt),
    'must use router.beforePopState, which Next calls immediately before change()'
  );
  ok(
    !/addEventListener\('popstate'/.test(rt),
    "a window popstate listener races Next's own and is always too late"
  );
  ok(
    /direction:\s*pendingPop\.current \? 'back' : 'forward'/.test(rt),
    'back must come from the popstate flag'
  );
  // The flag is consumed per navigation, so a stray popstate (a hash change)
  // cannot leak into a later forward navigation.
  ok(
    /pendingPop\.current = false;/.test(rt),
    'the popstate flag must be cleared once consumed'
  );
});

check('the beforePopState hook returns true', () => {
  // Next does `if (this._bps && !this._bps(state)) return`, so a falsy return
  // CANCELS the navigation. `() => { pendingPop.current = true; }` returns
  // undefined and silently breaks the back button — with no error, just a route
  // that refuses to go back.
  ok(
    /pendingPop\.current = true;\s*return true;/.test(rt),
    'the hook must return true or it vetoes every back navigation'
  );
});

check('shell-excluded routes are not animated', () => {
  // `/login` and `/admin/*` own full-bleed layouts. A cross-fade between a
  // centred login card and a CMS header is a visible smear, and neither has a
  // chrome worth sliding.
  ok(
    rt.includes('if (isShellExcluded(router.pathname)) return <>{children}</>;'),
    'shell-excluded routes must render their children with no motion wrapper'
  );
});

check('both bail-outs hand the page through untouched', () => {
  // Returning `<>{children}</>` rather than an empty fragment is load-bearing:
  // the early returns still have to render the page, and `<>{}</>` would silently
  // blank the screen on a cold load of a shell-excluded route.
  const emptyReturns = rt.match(/return <>\{?\}?<\/>/g) ?? [];
  eq(emptyReturns.length, 0, 'no early return may render an empty fragment');
  ok(
    (rt.match(/return <>\{children\}<\/>/g) ?? []).length >= 3,
    'isReady, shell-excluded and desktop must all return the children'
  );
});

check('reduced motion is passed through to the spec, not handled ad hoc', () => {
  // The cross-fade-only rule lives in the pure module where it is unit-tested.
  // Re-implementing it here with a shorter duration is the exact failure the
  // spec's own test forbids.
  ok(/useReducedMotion\(\)/.test(rt), 'must read the reduced-motion preference');
  ok(
    /reducedMotion: Boolean\(reduceMotion\)/.test(rt),
    'must pass reducedMotion to routeTransitionSpec'
  );
  ok(
    !/duration:\s*0/.test(rt) && !/reduceMotion \? 0 :/.test(rt),
    'reduced motion must not be implemented as a zero duration'
  );
});

check('the exit wrapper is a positioned ancestor for the popped-out screen', () => {
  // `popLayout` takes the exiting element out of flow with `position: absolute`.
  // Without a positioned ancestor it resolves against the viewport, so the
  // outgoing page anchors to the top of the *window* instead of the content
  // column and visibly jumps as it slides away.
  ordered(rt, ['<div className="relative">', '<AnimatePresence'], 'the wrapper must be the parent');
});

check('the exit target is resolved at animation time, not frozen at mount', () => {
  // This is the one that actually bit. `AnimatePresence` renders the outgoing
  // screen with the props from the render that created it, and on that render
  // `animating` was still false — so `exit={spec.exit}` handed the leaving screen
  // the *resting* spec. Observed in a browser: the incoming screen slid in from
  // 24px while the outgoing screen just faded to 0 in place, with no travel. The
  // DOM at rest is identical to the working version, so this is invisible to a
  // unit test and to every screenshot.
  //
  // `custom` is the fix: `AnimatePresence` re-renders the retained screen with the
  // `custom` currently on the wrapper, which is the new navigation's spec by then.
  ok(
    rt.includes('exit: (spec: RouteTransitionSpec) => spec.exit,'),
    '`exit` must be a function of `custom`, not a static target'
  );
  ok(
    rt.includes('enter: (spec: RouteTransitionSpec) => spec.initial,'),
    '`enter` must be a function of `custom` too, for the same reason'
  );
  ok(
    /<AnimatePresence[^>]*custom=\{spec\}/.test(rt),
    'the spec must be passed as `custom` for the outgoing screen to read'
  );
  ok(
    !/exit=\{spec\.exit\}/.test(rt),
    'a plain exit prop reintroduces the frozen-spec bug'
  );
});

check('the settled state does not depend on `custom`', () => {
  // `custom` changes one navigation late. A `center` derived from it would
  // re-resolve `animate` on the screen still sitting there and nudge it toward
  // the next screen's resting state — the classic "the page twitches before it
  // moves" artefact.
  ok(
    rt.includes('center: { opacity: 1, x: 0, y: 0 },'),
    '`center` must be a static object'
  );
  ok(
    !/center:\s*\(/.test(rt),
    '`center` must not be a function of `custom`'
  );
});

console.log(`\nroute-transition-shell: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
