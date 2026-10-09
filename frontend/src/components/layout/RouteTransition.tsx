'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { isShellExcluded } from '@/lib/navConfig';
import {
  routeTransitionKind,
  routeTransitionSpec,
  type RouteDirection,
  type RouteTransitionSpec,
} from '@/lib/routeTransition';

/**
 * Phase 1 — MOBILE_APP_UI_PLAN.md §1.4. Route transitions.
 *
 * Two things here are load-bearing and neither is obvious.
 *
 * **1. The key is derived during render, not from an effect.**
 *
 * `AnimatePresence` keeps the *outgoing* element mounted and renders it with the
 * children it had when it started exiting. That is what lets the old page slide
 * left while the new one slides in. But it can only do that if the key changes in
 * the same React commit that swaps the page.
 *
 * Bumping a counter from a `useEffect` on `routeChangeComplete` looks equivalent
 * and is not: Next.js re-renders with the new page one commit *before* the
 * effect runs, so the still-old key gets the new children, and the element
 * AnimatePresence then retains for the exit is the new page sliding out. So the
 * key is read straight off the router during render, and the pending-navigation
 * bookkeeping lives in a ref — refs do not cause a render, so reading one during
 * render always yields the value for *this* commit.
 *
 * **2. `popLayout`, not `wait` or `sync`.**
 *
 * `wait` serialises the two screens, which loses the push entirely — the old page
 * is gone before the new one starts. `sync` overlaps them but leaves both in
 * normal flow, so the document is briefly twice as tall: a scrollbar appears, the
 * page jumps, and the header's scroll state reads a height that is about to
 * change. `popLayout` takes the exiting element out of flow instead, which is the
 * only mode that overlaps without reflowing.
 *
 * Note the `transform` on this wrapper is a containing block for `position: fixed`
 * descendants for the duration of the animation — the same trap
 * `glass-surface` + `backdrop-filter` sets in the header. Framer-motion clears the
 * transform at rest, so it only applies mid-transition, which is the one window in
 * which a page is not expected to have a fixed overlay open.
 */
const SCREEN_EASE = { ease: [0.32, 0.72, 0, 1] } as const;

/**
 * `enter` and `exit` are FUNCTIONS of `custom`, and that is the fix for a bug
 * this component shipped with.
 *
 * `AnimatePresence` keeps the outgoing screen mounted and renders it with the
 * props it had when it was still the current child. So a plain `exit={spec.exit}`
 * hands the leaving screen the exit target that was correct *at the time it was
 * created* — and at that moment `animating` was still false, so it had the
 * resting spec. A forward push therefore slid the incoming screen in from 24px
 * while the outgoing screen merely faded to zero, in place, with no travel: a
 * cross-fade with a slide on only one side. At rest the DOM is indistinguishable
 * from the working version, so no unit test and no screenshot catches it; it
 * only shows up mid-flight.
 *
 * Resolving `exit` through `custom` moves the lookup to animation time.
 * `AnimatePresence` re-renders the retained screen with the `custom` currently on
 * the wrapper, which by then is the *new* navigation's spec — so the screen being
 * left finally gets the exit that belongs to the navigation that is ending.
 *
 * `center` is deliberately a static object rather than a function of `custom`.
 * `custom` changes one navigation late, so a `center` derived from it would
 * re-resolve `animate` on the screen that is still sitting there, nudging it
 * toward the next screen's resting state. The settled position is the settled
 * position; the spec only decides where a screen *starts* and *ends*.
 */
const screenVariants: Variants = {
  enter: (spec: RouteTransitionSpec) => spec.initial,
  center: { opacity: 1, x: 0, y: 0 },
  exit: (spec: RouteTransitionSpec) => spec.exit,
};

export const RouteTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  /*
    Direction is not something Next.js tells us: the Pages Router has no "back"
    signal. The obvious way to infer it — "a history navigation fires
    `popstate` and then `routeChangeStart`" — is wrong, and measurably so.

    A plain `window.addEventListener('popstate', ...)` registers AFTER Next's own
    handler, because Next installs that listener when the router initialises.
    Listeners on the same target run in registration order, and for a route that
    is already in the component cache Next's handler emits `routeChangeStart`
    synchronously. Measured in a browser: `routeChangeStart` at 1741ms,
    `popstate` at 1743ms. So a popstate flag read in `routeChangeStart` is always
    one event too late, and every back navigation animates forwards.

    `router.beforePopState` is the supported hook for exactly this: Next calls it
    on the line immediately before the `change()` that emits `routeChangeStart`,
    so the flag is reliably set first.

    Note the return value. Next does `if (this._bps && !this._bps(state)) return`,
    so a falsy return CANCELS the navigation — returning `undefined` here would
    silently break the back button. It must be `true`.

    The flag is consumed by the next start and cleared, so a stray popstate (a
    hash change, say) cannot leak into a later forward navigation.
  */
  const pendingPop = useRef(false);
  const pending = useRef<{ shallow: boolean; from: string; direction: RouteDirection } | null>(null);

  /*
    Mobile only. The plan's non-goals treat desktop as a verification gate rather
    than a design target, and every mobile rule in it is `md:`-scoped — but this
    one is motion in JS, so `md:` cannot scope it and it would otherwise slide
    every desktop navigation by 24px. The query is Tailwind's `md` so the edge is
    the same one the rest of the chrome uses; a mismatch here would animate
    exactly where the header and tab bar have already switched to desktop.
  */
  const [wideViewport, setWideViewport] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setWideViewport(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    router.beforePopState(() => {
      pendingPop.current = true;
      return true;
    });
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onStart = (url: string, opts?: { shallow?: boolean }) => {
      pending.current = {
        shallow: Boolean(opts?.shallow),
        from: router.pathname,
        direction: pendingPop.current ? 'back' : 'forward',
      };
      pendingPop.current = false;
    };

    router.events.on('routeChangeStart', onStart);
    return () => {
      router.events.off('routeChangeStart', onStart);
    };
  }, [router.events, router.pathname]);

  /*
    `router.isReady` matters here: before it, `pathname` is still the previous
    page on a hard load, so a transition could be computed against a route the
    user never visited.
  */
  if (!router.isReady) return <>{children}</>;

  /*
    §1.4: "do not animate shell-excluded routes". `/login` and `/admin/*` own
    their own full-bleed layouts — a cross-fade between a centred login card and
    a CMS header is a visible smear, and neither has a chrome to slide.
  */
  // Early return for shell-excluded routes: they own their own chrome, and animating them
  // would slide a full-page PWA frame unnecessarily (a "web page" tell §1.4).
  if (isShellExcluded(router.pathname)) return <>{children}</>;

  // Desktop renders the page unwrapped, exactly as it did before §1.4.
  if (wideViewport) return <>{children}</>;

  const nav = pending.current;
  const animating = nav !== null && !nav.shallow;

  /*
    A shallow change keeps one static key, so the same element is updated in
    place and nothing animates.

    This app does not currently shallow-navigate anywhere — every `router.push`
    is a real route change — so this is a guard rather than a fix. It is here
    because the failure it prevents is nasty and easy to reintroduce: a
    query-only change that swaps the page component (anything added later for
    `?tab=` / `?page=`) would cross-fade the whole page on every tap, and unlike a
    transition that merely looks wrong, a cross-fade that resets scroll mid-read
    loses the reader's place.
  */
  const key = animating ? `${nav.from}=>${router.asPath}` : 'static';

  const kind = animating ? routeTransitionKind(nav.from, router.pathname) : 'rise';
  const spec = routeTransitionSpec({
    kind,
    direction: animating ? nav.direction : 'forward',
    reducedMotion: Boolean(reduceMotion),
  });

  return (
    <div className="relative">
      {/*
        `custom={spec}` is load-bearing and is the whole reason this component uses
        variant functions. See the note on `screenVariants`: the outgoing screen's
        `exit` is resolved through this value at animation time.
      */}
      <AnimatePresence mode="popLayout" initial={false} custom={spec}>
        <motion.div
          key={key}
          custom={spec}
          variants={screenVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ ...SCREEN_EASE, duration: spec.duration / 1000 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
