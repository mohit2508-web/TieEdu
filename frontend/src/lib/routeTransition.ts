/**
 * Phase 1 — MOBILE_APP_UI_PLAN.md §1.4. Route transition geometry.
 *
 * Pure, and separate from the component that plays it, for the same reason
 * `lib/headerScroll` exists: the interesting part of a transition is a table of
 * numbers, and a table of numbers is exactly what cannot be checked by looking
 * at it. A component that hard-codes these values can only be verified by
 * watching twenty navigations and hoping.
 *
 * Two kinds:
 *
 *   rise — a lateral move between top-level tabs. Opacity plus an 8px rise,
 *          reversed on back. The plan's "180ms opacity + 8px rise".
 *   push — the iOS navigation-controller feel for anything touching the detail
 *          stack: the new screen enters from the right by 24px while the old
 *          one shifts left and dims.
 *
 * The split is driven by depth, not by which links were clicked, so a tab that
 * happens to link straight to a detail gets the push and no root-to-root pair
 * accidentally gets one.
 */
import type { Target } from 'framer-motion';
import { getNavigationDepth } from '@/lib/navConfig';

export type RouteDirection = 'forward' | 'back';
export type RouteTransitionKind = 'rise' | 'push';

/**
 * Framer-motion's own `Target`, not a hand-rolled `{opacity, x?, y?}`.
 *
 * `Target` resolves to a mapped type with a CSS-custom-property index signature,
 * and a plain interface does not satisfy it — so a local shape here is a compile
 * error at the `initial`/`animate`/`exit` call site, and the obvious "fix" is a
 * cast that would then hide any real mismatch. This is a type-only import, so the
 * module still has no runtime dependency and the tests still read as plain data.
 */
export type RouteOffset = Target;

export interface RouteTransitionSpec {
  initial: RouteOffset;
  animate: RouteOffset;
  exit: RouteOffset;
  duration: number;
}

/** §1.4: "180ms opacity + 8px rise". */
export const ROUTE_RISE_PX = 8;
/** §1.4: the drill-down push, "from the right ~24px". */
export const ROUTE_PUSH_PX = 24;
export const ROUTE_TRANSITION_MS = 180;

/**
 * How dimmed the outgoing screen goes during a push.
 *
 * Not 0. During a push the incoming screen is opaque and sits on top, so the
 * outgoing one is only ever visible in the ~24px sliver to the left of the
 * incoming screen's leading edge. Fading it to 0 makes that sliver show
 * whatever is behind both of them; a partial dim reads as depth, which is the
 * effect the plan is asking for.
 */
export const ROUTE_PUSH_DIM = 0.6;

/**
 * Whether a navigation plays the push or the rise.
 *
 * `push` whenever either end of the move is on the detail stack — drilling in
 * and backing out are the same gesture seen from two sides, and giving the
 * outward move a different animation is what makes a nav stack feel like a set
 * of unrelated pages.
 */
export const routeTransitionKind = (fromPath: string, toPath: string): RouteTransitionKind =>
  getNavigationDepth(fromPath) === 'detail' || getNavigationDepth(toPath) === 'detail'
    ? 'push'
    : 'rise';

/**
 * The three keyframes for one navigation.
 *
 * `reducedMotion` collapses everything to a cross-fade. The plan is explicit
 * that this is a fade and not a shorter animation: a 1ms slide is still a
 * slide, and a student who has asked the OS for less movement should not get a
 * screen sliding across their viewport because the duration was multiplied by
 * zero.
 */
export const routeTransitionSpec = (opts: {
  kind: RouteTransitionKind;
  direction: RouteDirection;
  reducedMotion?: boolean;
}): RouteTransitionSpec => {
  const { kind, direction, reducedMotion = false } = opts;
  const forward = direction === 'forward';

  if (reducedMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      duration: ROUTE_TRANSITION_MS,
    };
  }

  if (kind === 'push') {
    return {
      initial: { opacity: 0, x: forward ? ROUTE_PUSH_PX : -ROUTE_PUSH_PX },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: ROUTE_PUSH_DIM, x: forward ? -ROUTE_PUSH_PX : ROUTE_PUSH_PX },
      duration: ROUTE_TRANSITION_MS,
    };
  }

  return {
    initial: { opacity: 0, y: forward ? ROUTE_RISE_PX : -ROUTE_RISE_PX },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    duration: ROUTE_TRANSITION_MS,
  };
};
