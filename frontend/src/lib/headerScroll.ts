// ============================================================================
// HEADER SCROLL BEHAVIOUR — Phase 1, MOBILE_APP_UI_PLAN.md §1.1
//
// Web tell #1 is "the page scrolls under a permanently pinned header". Native
// bars react to scroll direction, so this module holds the decision and the
// header holds only the listener.
//
// It is a pure reducer on purpose. The obvious alternative — a `useState` and a
// closure inside `Header.tsx` — cannot be unit tested, and the two failure modes
// here are both silent:
//
//   * a header that never comes back once hidden, and
//   * a header that flickers because a 1px scroll delta flips the state.
//
// The thresholds are exported so the tests assert the shipped numbers rather
// than restating them.
// ============================================================================

/**
 * How far the page must travel *down*, in one gesture, before the header
 * leaves. Larger than the reveal threshold on purpose: hiding is the surprising
 * direction, so it takes a deliberate flick, while revealing should feel
 * instant.
 */
export const HIDE_ON_SCROLL_DOWN_DELTA = 8;

/**
 * How far the page must travel *up* before the header returns. Not literally
 * "any scroll up": iOS reports sub-pixel deltas while a scroll is settling, and
 * treating each one as a reversal makes the header strobe. `overscroll-behavior-y:
 * none` in `globals.css` suppresses the rubber-band case; this covers the rest.
 */
export const REVEAL_ON_SCROLL_UP_DELTA = 2;

/**
 * Shadow threshold, deliberately separate from the hide threshold. A hairline
 * border should appear as soon as content is under the bar, while the bar
 * itself stays put — a student scrolling 10px should not lose the nav.
 */
export const HEADER_SHADOW_DELTA = 6;

/**
 * Below this the header is always visible. It is what stops a page loaded
 * already-scrolled (a restored `#hash`, a back-navigation) from opening with
 * its own nav missing.
 */
export const HEADER_ALWAYS_VISIBLE_UNTIL = HIDE_ON_SCROLL_DOWN_DELTA;

export interface HeaderScrollState {
  /** Last observed `window.scrollY`, kept so the next delta has a baseline. */
  y: number;
  /** Translate the bar off-canvas. */
  hidden: boolean;
  /** Paint the elevation shadow. */
  scrolled: boolean;
}

export const initialHeaderScrollState: HeaderScrollState = {
  y: 0,
  hidden: false,
  scrolled: false,
};

/**
 * Baseline for a fresh mount, seeded from the real scroll position.
 *
 * Without this the first scroll event after a cold mount is compared against
 * `y: 0`, so a page that mounts already scrolled — browser back, a restored
 * `#hash`, a re-attached tab — reads its own offset as one enormous downward
 * flick and opens with the bar translated off-canvas. The user has no nav and
 * no way to know that scrolling up brings it back.
 *
 * Always starts visible: a mount is not a gesture.
 */
export const seedHeaderScrollState = (y: number): HeaderScrollState => ({
  y,
  hidden: false,
  scrolled: y > HEADER_SHADOW_DELTA,
});

/**
 * Next state for a scroll position.
 *
 * `enabled` is the caller's veto, and it covers every case where hiding would be
 * wrong: an overlay is open (the header is the only way back out of a sheet), the
 * route is a pushed screen (its back chevron must not disappear — §1.3), and
 * the viewport is `md+` (desktop keeps a conventional pinned bar). The veto
 * still tracks `scrolled`, because a shadow is correct at any width.
 */
export const nextHeaderScrollState = (
  prev: HeaderScrollState,
  y: number,
  enabled: boolean
): HeaderScrollState => {
  const scrolled = y > HEADER_SHADOW_DELTA;

  if (!enabled) return { y, hidden: false, scrolled };

  // Near the top the bar is pinned regardless of delta. Note this only forces
  // `hidden` — the shadow still tracks its own lower threshold, which is the
  // entire reason the two numbers are not the same value.
  if (y <= HEADER_ALWAYS_VISIBLE_UNTIL) return { y, hidden: false, scrolled };

  const delta = y - prev.y;
  if (delta >= HIDE_ON_SCROLL_DOWN_DELTA) return { y, hidden: true, scrolled: true };
  if (delta <= -REVEAL_ON_SCROLL_UP_DELTA) return { y, hidden: false, scrolled: true };

  // Inside the deadzone. Hold whatever we were doing rather than re-deciding,
  // so a settling scroll cannot strobe the bar.
  return { y, hidden: prev.hidden, scrolled };
};
