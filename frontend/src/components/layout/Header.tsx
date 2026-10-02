'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useReducedMotion } from 'framer-motion';
import { Award, ChevronDown, ChevronLeft, Command, Flame, LogOut, Search, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react';
import { TieEduLogo } from '@/components/common/TieEduLogo';
import { useAuth } from '@/context/AuthContext';
import { useShell } from '@/context/ShellContext';
import { useCart } from '@/context/CartContext';
import {
  MOBILE_TAB_ACTIONS,
  NAV_ACTIONS,
  PRIMARY_NAV,
  isNavActive,
  isRootDepth,
  resolveBackHref,
  resolveNavTitle,
} from '@/lib/navConfig';
import {
  initialHeaderScrollState,
  nextHeaderScrollState,
  seedHeaderScrollState,
  type HeaderScrollState,
} from '@/lib/headerScroll';
import { formatBadgeCount } from '@/lib/notifications';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { AccountMenu } from '@/components/layout/AccountMenu';
import { MobileMenuButton } from '@/components/layout/MobileTabBar';

/** Tailwind's `md`, negated. `tailwind.config.js` sets no custom `screens`. */
const BELOW_MD = '(max-width: 767.98px)';

/**
 * The site header.
 *
 * No props. It used to take `cartCount`, `onOpenCart`, `onOpenSearch` and
 * `onOpenLeaderboard`, which meant twelve pages each had to wire four callbacks
 * correctly and eight of them simply did not — the Search, Cart and
 * Leaderboard buttons on `/courses`, `/campus`, `/my-courses`, `/account`,
 * `/study-plan`, `/verify` and `/interview-course` were dead. Everything now
 * comes from context, so a button cannot be present and dead.
 *
 * One header for the whole app. `AppShell` mounts it, and `navConfig` is the
 * only place the link list exists.
 */
export const Header: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { toggleOverlay, anyOpen, isOpen } = useShell();
  const { count, hydrated } = useCart();
  const [accountOpen, setAccountOpen] = useState(false);

  // -------------------------------------------------------------------------
  // Phase 1 §1.1 — hide-on-scroll.
  //
  // The decision lives in `lib/headerScroll` as a pure reducer so it is unit
  // tested; this is only the listener and the veto. The veto is deliberately
  // three-way, because each case is a different way the bar is the user's only
  // way out:
  //
  //   overlay open   — a sheet covers the page, the bar is how you dismiss it
  //   pushed screen  — §1.3 puts the back chevron in this bar
  //   `md+`          — desktop keeps a conventionally pinned header
  //
  // An open account menu counts too: it is anchored to this bar, so sliding the
  // bar away would drag the menu off with it.
  // -------------------------------------------------------------------------
  const [scroll, setScroll] = useState<HeaderScrollState>(initialHeaderScrollState);
  const [belowMd, setBelowMd] = useState(false);
  const reduceMotion = useReducedMotion();

  const isPushedScreen = router.isReady && !isRootDepth(router.pathname);
  const canHide = belowMd && !anyOpen && !isPushedScreen && !accountOpen;

  // -------------------------------------------------------------------------
  // Phase 1 §1.3 — the native nav bar a pushed screen gets below `md`.
  // -------------------------------------------------------------------------
  const drillTitle = router.isReady ? resolveNavTitle(router.pathname) : '';
  const backHref = router.isReady ? resolveBackHref(router.pathname) : '/';

  /*
    History first, href as the safety net. `history.length` is 1 for a deep link
    opened in a fresh tab and for a reload, which is exactly when there is
    nothing to pop; anything above that we let the browser walk back, so the
    chevron returns the user to the scroll position and filter they left, which
    a `push` would throw away.
  */
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(backHref);
  };

  /*
    The 2px reading-progress line, written straight to the DOM.

    It has to track the scroll position every frame, and the whole point of the
    §1.1 listener is that scrolling does NOT re-render the header — it mutates a
    transform on a node React does not own. Folding progress into `scroll` state
    would put a re-render back on the scroll path and undo that, so this one
    element is driven imperatively from the same rAF callback instead.
  */
  const progressRef = useRef<HTMLSpanElement>(null);
  const pushedRef = useRef(isPushedScreen);
  pushedRef.current = isPushedScreen;

  // The scroll listener is registered once, so it cannot close over `canHide`.
  // A ref keeps it reading the current value; re-subscribing on every overlay
  // open would drop scroll events mid-gesture.
  const canHideRef = useRef(canHide);
  canHideRef.current = canHide;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(BELOW_MD);
    const sync = () => setBelowMd(mq.matches);
    sync();
    // Safari < 14 only has the deprecated `addListener`.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', sync);
      return () => mq.removeEventListener('change', sync);
    }
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Seed from the real position. A page can mount already scrolled — browser
    // back, a restored `#hash` — and seeding from 0 would read that offset as
    // one huge downward flick and open with the bar off-canvas.
    setScroll(seedHeaderScrollState(window.scrollY));

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        setScroll((prev) => nextHeaderScrollState(prev, y, canHideRef.current));

        /*
          §1.3 progress line. `scaleX` rather than `width` so this stays on the
          compositor — a width change relayouts the line's parent every frame.

          The `+ 1` on the denominator is the whole edge case: on a page shorter
          than the viewport the scrollable range is 0, and dividing by it yields
          `NaN`, which writes `scaleX(NaN)` and makes the bar vanish. Clamping
          also covers the overscroll bounce on iOS, where `scrollY` can go
          negative or past the maximum and the line would otherwise overshoot
          0..1 and show a gap at one end.
        */
        const el = progressRef.current;
        if (el && pushedRef.current) {
          const range = document.documentElement.scrollHeight - window.innerHeight;
          const p = range > 0 ? Math.min(1, Math.max(0, y / range)) : 0;
          el.style.transform = `scaleX(${p})`;
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // When the veto flips off, restore the bar immediately rather than waiting for
  // the next scroll event — which may never come, stranding a headerless page.
  useEffect(() => {
    if (canHide) return;
    setScroll((prev) => (prev.hidden ? { ...prev, hidden: false } : prev));
  }, [canHide]);

  // A new page starts from the top. Resetting on `routeChangeStart` rather than
  // `Complete` avoids inheriting the previous page's hidden state during the
  // navigation, when `window.scrollY` is still the old value.
  useEffect(() => {
    const onRouteStart = () => setScroll(initialHeaderScrollState);
    router.events.on('routeChangeStart', onRouteStart);
    return () => router.events.off('routeChangeStart', onRouteStart);
  }, [router.events]);

  return (
    /*
     * Phase 0 — MOBILE_APP_UI_PLAN.md §0.1, and Phase 1 — §1.1.
     *
     * `glass-surface` sets `backdrop-filter`, which makes this element a
     * containing block for `position: fixed` descendants. That is why the old
     * drawer needed a portal — the drawer lived inside the header and would
     * otherwise be clipped to the header's 64px. Overlays are now siblings of
     * the header in `AppShell`, so no portal is needed and the DOM is flat.
     *
     * `fixed`, not `sticky`. A sticky element keeps its slot in flow, so
     * translating it away leaves the gap it was holding open — which is exactly
     * the "web page with a permanently pinned header" tell §1.1 exists to
     * remove. `fixed` takes it out of flow entirely; `AppShell` reserves the
     * same height with `padding-top: var(--header-total)`, so nothing shifts.
     *
     * Height is `var(--header-total)` — the bar *plus* the notch — with the
     * inset as padding, so the four sub-bars that pin underneath it can offset
     * by the same number instead of hardcoding 64px.
     *
     * The transform is a compositor-only property, so scrolling does not
     * relayout the page on every frame. `will-change` is set only while hidden
     * for the same reason: a permanent `will-change` keeps a layer alive for
     * the whole session and costs memory for nothing.
     */
    <header
      className="glass-surface fixed inset-x-0 top-0 z-40 flex items-center"
      data-slide={scroll.hidden ? 'hidden' : 'shown'}
      data-scrolled={scroll.scrolled ? 'true' : undefined}
      style={{
        height: 'var(--header-total)',
        paddingTop: 'var(--safe-top)',
        transform: scroll.hidden ? 'translate3d(0, -100%, 0)' : 'translate3d(0, 0, 0)',
        /*
         * The slide is suppressed under `prefers-reduced-motion` rather than
         * shortened. §1.1 asks for "instant, not animated": a student who has
         * told the OS that movement makes them ill should not have a bar travel
         * across the screen, and a 0ms transition still produces a composited
         * frame of motion on some engines. `transition: none` is the only
         * expression of "do not move this".
         */
        transition: reduceMotion ? 'none' : 'transform 200ms var(--ease-out)',
        willChange: scroll.hidden ? 'transform' : undefined,
        boxShadow: scroll.scrolled ? 'var(--shadow-raised)' : undefined,
      }}
    >
      {/*
        Phase 1 — §1.3. The native nav bar a pushed screen gets below `md`.

        A sibling of the normal row, not a variant of it. The desktop bar is
        `md+`-scoped and must render identically to before, so the two rows never
        coexist: this one is `md:hidden` and the other drops below `md` on a
        pushed screen. Branching inside the shared row instead would mean the
        desktop layout is one `isPushedScreen &&` away from changing.

        The two actions are `MOBILE_TAB_ACTIONS` — the same two the tab bar
        carries, read from the same list. That is not a coincidence: §1.2 slides
        the tab bar away on exactly these routes, so if this bar did not take
        them over, search and the cart would be unreachable for the whole
        duration of the drill-down.
      */}
      {isPushedScreen && (
        <div className="flex w-full items-center gap-1 px-2 md:hidden" data-drill-header="">
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="icon-btn -ml-1 flex-none"
          >
            <ChevronLeft size={22} strokeWidth={2.4} aria-hidden />
          </button>

          {/*
            `truncate` + `min-w-0` is load-bearing: a long course or company name
            is the normal case, and without them the title pushes the two actions
            off the right edge of a 320px screen instead of ellipsising.
          */}
          <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#10151C]">
            {drillTitle}
          </span>

          <div className="flex flex-none items-center gap-0.5">
            {MOBILE_TAB_ACTIONS.map((id) => {
              const action = NAV_ACTIONS[id];
              const Icon = action.icon;
              const active = isOpen(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleOverlay(id)}
                  aria-expanded={active}
                  aria-haspopup="dialog"
                  aria-label={action.label}
                  className="icon-btn relative"
                >
                  <Icon size={20} strokeWidth={2} aria-hidden />
                  {id === 'cart' && hydrated && count > 0 && (
                    <span className="chrome-badge absolute -right-0.5 -top-0.5" aria-hidden>
                      {formatBadgeCount(count)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/*
        The 2px §1.3 reading-progress line, pinned to the header's bottom edge.
        `transform` is written imperatively from the scroll handler; React only
        ever renders the empty shell, so scrolling this bar costs no re-render.
      */}
      {isPushedScreen && (
        <span
          ref={progressRef}
          aria-hidden
          data-progress-line=""
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left bg-[var(--amber-deep)]"
          style={{ transform: 'scaleX(0)' }}
        />
      )}

      <div
        className={
          isPushedScreen
            ? 'mx-auto hidden w-full max-w-[1700px] items-center justify-between gap-3 px-3 sm:px-8 lg:px-12 md:flex'
            : 'mx-auto flex w-full max-w-[1700px] items-center justify-between gap-3 px-3 sm:px-8 lg:px-12'
        }
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          <Link href="/" className="flex flex-none items-center" aria-label="TieEdu home">
            <TieEduLogo size="sm" />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-0.5 md:flex">
            {PRIMARY_NAV.map((item) => {
              const active = isNavActive(router.pathname, item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className="nav-link"
                >
                  {item.label}
                  {item.badge === 'free' && <span className="nav-link-badge">Free</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-none items-center gap-1.5 sm:gap-2">
          {/* Desktop: a real field that widens on focus. The old one used
              `text-[--text-muted]`, which is not valid Tailwind — the muted
              colour never applied and the label rendered in body text. */}
          <button
            type="button"
            onClick={() => toggleOverlay('search')}
            aria-haspopup="dialog"
            aria-label="Search vaults"
            className="nav-search hidden lg:flex"
          >
            <Search size={16} strokeWidth={2.2} aria-hidden />
            <span className="flex-1 text-left text-[13px] font-medium">Search vaults…</span>
            <kbd className="inline-flex items-center gap-0.5">
              <Command size={11} strokeWidth={2.5} aria-hidden />
              K
            </kbd>
          </button>

          {/*
            The leaderboard used to be `hidden xl:inline-flex`, which meant a phone
            had no way to reach it at all — the one thing in the header that was
            missing by being *too* hidden rather than by overflowing. It is now an
            icon in every phone header and grows its label back at `xl`; the
            square 40px box comes from `.chip--icon` so it lines up with the bell
            and the account button.
          */}
          <button
            type="button"
            onClick={() => toggleOverlay('leaderboard')}
            aria-label="Leaderboard"
            title="Placement season XP rankings"
            className="chip chip--icon"
          >
            <Flame size={15} className="shrink-0 text-[var(--amber-deep)]" strokeWidth={2.2} aria-hidden />
            <span className="hidden font-bold xl:inline">Leaderboard</span>
          </button>

          {/*
            The cart and search buttons are `lg:inline-flex` — above `lg` the
            top bar and the bottom tab bar were both offering them.

            Below `lg` the bottom bar already has a Search slot and a Cart slot
            (with the badge), so the two icons here were pure duplication. On a
            360px phone the row needed ~374px: logo + search + cart + bell +
            account + hamburger. That overflow is what made the page scale down
            and the logo look like it was spilling out of the header. One
            surface per action is also the point of the bottom bar.
          */}
          <button
            type="button"
            onClick={() => toggleOverlay('cart')}
            aria-label={hydrated && count > 0 ? `Cart, ${count} items` : 'Cart, empty'}
            aria-haspopup="dialog"
            className="icon-btn hidden lg:inline-flex"
          >
            <span className="relative inline-flex">
              <ShoppingBag size={19} strokeWidth={2} aria-hidden />
              {/* Gated on `hydrated`: before the persisted cart is read back the
                  count is unknown, and a badge that jumps 0 -> 3 on load reads
                  as a bug. */}
              {hydrated && count > 0 && (
                <span className="chrome-badge absolute -right-2 -top-1.5" aria-hidden>
                  {formatBadgeCount(count)}
                </span>
              )}
            </span>
          </button>

          <NotificationBell />

          <AccountMenu onOpenChange={setAccountOpen} />

          <MobileMenuButton />
        </div>
      </div>
    </header>
  );
};
