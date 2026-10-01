/**
 * Header scroll behaviour tests — Phase 1, MOBILE_APP_UI_PLAN.md §1.1.
 *
 * Both halves of this feature fail silently, so both are pinned:
 *
 *  1. a header that hides and never comes back — the user is on a long page with
 *     no nav and has to guess that scrolling up brings it back;
 *  2. a header that hides when it should not, i.e. on a pushed screen or behind
 *     an open sheet, where the bar is the only affordance for getting out.
 *
 * The suite drives the real reducer from `src/lib/headerScroll`, so the numbers
 * asserted here are the numbers that ship.
 */
import {
  HIDE_ON_SCROLL_DOWN_DELTA,
  HEADER_ALWAYS_VISIBLE_UNTIL,
  HEADER_SHADOW_DELTA,
  REVEAL_ON_SCROLL_UP_DELTA,
  initialHeaderScrollState,
  nextHeaderScrollState,
  seedHeaderScrollState,
  type HeaderScrollState,
} from '../src/lib/headerScroll';

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
function eq(actual: unknown, expected: unknown, note = '') {
  if (actual !== expected) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${note ? ` — ${note}` : ''}`);
  }
}
function ok(value: unknown, note = '') {
  if (!value) throw new Error(note || 'expected truthy');
}

/** Feed a sequence of scroll positions through the reducer. */
function run(positions: number[], enabled = true): HeaderScrollState {
  return positions.reduce<HeaderScrollState>(
    (state, y) => nextHeaderScrollState(state, y, enabled),
    initialHeaderScrollState
  );
}

check('starts visible and unshadowed at the top of the page', () => {
  const s = run([0]);
  eq(s.hidden, false);
  eq(s.scrolled, false);
});

check('a short scroll down does not hide the header', () => {
  // Under the hide threshold the bar must stay: the reader's first paragraphs
  // are short and a bar that flickers away on every small nudge feels broken.
  const s = run([0, HIDE_ON_SCROLL_DOWN_DELTA - 1]);
  eq(s.hidden, false, 'a nudge must not hide the bar');
});

check('scrolling down past the threshold hides the header', () => {
  const s = run([0, 40]);
  eq(s.hidden, true);
});

check('scrolling up brings the header back', () => {
  const s = run([0, 400, 360]);
  eq(s.hidden, false, 'the header must return on scroll up');
});

check('the header survives an arbitrarily long scroll as long as it keeps rising', () => {
  // 400px down, then 2000px of continued upward scrolling. A reducer that
  // compared against `initialHeaderScrollState` instead of the previous value
  // would re-hide on the first frame and strand the user.
  const s = run([0, 900, 700, 500, 300, 100, 0]);
  eq(s.hidden, false);
  eq(s.scrolled, false, 'back at the top the shadow goes too');
});

check('a long downward scroll then any upward scroll reveals it again', () => {
  const s = run([0, 2000, 2000 - REVEAL_ON_SCROLL_UP_DELTA]);
  eq(s.hidden, false);
});

check('sub-pixel deltas do not strobe the bar', () => {
  // iOS reports deltas of 1-2px while a scroll settles. Each must be a no-op,
  // not a fresh hide/reveal decision.
  const hidden = run([0, 400]);
  eq(hidden.hidden, true);
  let state = hidden;
  for (let i = 0; i < 12; i += 1) {
    state = nextHeaderScrollState(state, state.y - 1, true);
  }
  eq(state.hidden, true, 'a settling scroll must not reveal the bar');
});

check('the shadow appears before the header hides', () => {
  // Ordering is the whole reason the thresholds are separate numbers: at 7px
  // the content is visibly under the bar, so there is a shadow, but the bar is
  // still there to be used.
  const s = run([0, HEADER_SHADOW_DELTA + 1]);
  eq(s.scrolled, true, 'shadow belongs on once content is underneath');
  eq(s.hidden, false, 'but the bar must still be present');
});

check('no shadow at or below the shadow threshold', () => {
  eq(run([0, HEADER_SHADOW_DELTA]).scrolled, false);
  eq(run([0, HEADER_SHADOW_DELTA + 1]).scrolled, true);
});

check('a page restored mid-scroll opens with its header visible', () => {
  // Browser back-navigation and `#hash` targets both mount scrolled. The
  // reducer has no delta to work from, so it must not infer "user was scrolling
  // down" from a large absolute position.
  const s = run([0, 1500]);
  eq(s.hidden, true);
  const restored = seedHeaderScrollState(1500);
  eq(restored.hidden, false, 'a cold mount must not open hidden');
  eq(restored.scrolled, true, 'and it should be shadowed since content is under it');
});

check('the header is pinned until the page has genuinely moved', () => {
  // Near the absolute top the bar is pinned whatever the delta says, so every
  // position in that window is exhaustively visible.
  for (let y = 0; y <= HEADER_ALWAYS_VISIBLE_UNTIL; y += 1) {
    eq(run([0, y]).hidden, false, `must stay visible at y=${y}`);
  }
  // One pixel past the cut-off, the same 9px of travel is enough to hide. The
  // boundary is the absolute position, not the gesture.
  eq(run([0, HEADER_ALWAYS_VISIBLE_UNTIL + 1]).hidden, true);
  eq(run([0, 100]).hidden, true, 'past a real flick it hides');
  eq(run([0, 5000]).hidden, true, 'deep scroll keeps it hidden until the user scrolls up');
});

check('disabled hides nothing but still shadows', () => {
  // The veto covers overlay-open, pushed screens and md+. In all three the bar
  // stays, but content really is scrolled under it, so the shadow is correct.
  const s = run([0, 600], false);
  eq(s.hidden, false, 'the veto must keep the bar');
  eq(s.scrolled, true, 'and must not drop the shadow');
});

check('re-enabling does not retroactively hide a bar the user is looking at', () => {
  // Overlay closes while the page is scrolled. The next scroll event is often
  // still downward, and the header must not shoot off as the sheet falls.
  let state = run([0, 600], false);
  eq(state.hidden, false);
  state = nextHeaderScrollState(state, state.y + 2, true);
  eq(state.hidden, false, 'a 2px continuation must not hide it');
  state = nextHeaderScrollState(state, state.y + 40, true);
  eq(state.hidden, true, 'but a real flick still hides it');
});

check('thresholds are ordered so the phases cannot overlap', () => {
  // shadow < always-visible < hide. If the shadow threshold ever rose above the
  // always-visible cut-off, the bar would appear with no shadow on the way out.
  ok(HEADER_SHADOW_DELTA < HEADER_ALWAYS_VISIBLE_UNTIL, 'shadow must come on first');
  ok(
    REVEAL_ON_SCROLL_UP_DELTA < HIDE_ON_SCROLL_DOWN_DELTA,
    'reveal must be cheaper than hide, or the bar strobes'
  );
});

console.log(`\nheader-scroll: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
