'use client';

import React from 'react';
import { useRouter } from 'next/router';
import { isShellExcluded, isRootDepth } from '@/lib/navConfig';
import { Header } from '@/components/layout/Header';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';
import { CartModal } from '@/components/checkout/CartModal';
import { SearchModal } from '@/components/modals/SearchModal';
import { LeaderboardModal } from '@/components/modals/LeaderboardModal';
import { DailyBriefing } from '@/components/briefing/DailyBriefing';

/**
 * The site chrome, mounted once.
 *
 * This used to be the `<Header cartCount onOpenCart onOpenSearch
 * onOpenLeaderboard />` block copy-pasted into twelve pages, each with its own
 * `useState` for the drawer and its own `SearchModal`/`LeaderboardModal`. Two
 * consequences: the tabs were dead on the eight pages whose buttons had no
 * handler, and each page had a private cart, so a student who added rounds on
 * one page and navigated to another saw an empty cart.
 *
 * Both are structural, not stylistic, so the fix is structural: the header and
 * every overlay it opens live here, once, above the page. Pages now only render
 * content, plus whatever cross-sell they want the cart drawer to show (via
 * `useCartScope`).
 *
 * `/login`, `/signup` and `/admin/*` are excluded — each already owns a
 * centred logo or a CMS header, and stacking the marketing nav on top of the
 * admin console made both look broken.
 */
export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();

  /*
    Phase 1 — MOBILE_APP_UI_PLAN.md §1.2.

    Read before the `isReady` early return on purpose. `isRootDepth` is a pure
    function over `pathname`, not a hook, so calling it before the return cannot
    violate the rules of hooks — and computing it here means the content column
    and `MobileTabBar` derive the same answer from the same resolver instead of
    each keeping a private list of "which routes hide the bar".
  */
  const atRoot = isRootDepth(router.pathname);

  // `router.isReady` matters: before it, `pathname` is still the previous page
  // on a hard load, and gating on that would flash the shell onto a login page.
  //
  // The excluded routes still need the safe-area padding. They render no chrome
  // of their own, so in standalone mode `viewport-fit=cover` would put the
  // centred login card behind the notch and the home indicator.
  if (!router.isReady || isShellExcluded(router.pathname)) {
    return (
      <div
        className="min-h-[100dvh]"
        style={{
          paddingTop: 'var(--safe-top)',
          paddingRight: 'var(--safe-right)',
          paddingBottom: 'var(--safe-bottom)',
          paddingLeft: 'var(--safe-left)',
        }}
      >
        {children}
      </div>
    );
  }

  return (
    /*
      Phase 0 — MOBILE_APP_UI_PLAN.md §0.1.
      Phase 1 — §1.1.

      The four `--safe-*` insets are applied HERE, once, and nowhere else. The
      alternative — each component reading `env(safe-area-inset-*)` itself — is
      how a header ends up respecting the notch while a bottom sheet does not,
      and the bug only shows up on a real notched phone.

      `paddingTop` is gone from this wrapper and now lives on the `<header>`
      itself, because the header became `position: fixed` to be translatable out
      of view (a `sticky` element keeps its slot in flow, so translating it
      leaves the gap it was holding). A fixed header contributes nothing to
      layout, so the space it used to occupy is reserved on the content column
      below instead — by the same token, so the two cannot disagree.

      Note this is padding on a wrapper, not `overflow: hidden` on a parent: the
      overlays below are `position: fixed` and a clipping ancestor would trap
      them inside the padded box.
    */
    <div
      className="flex min-h-[100dvh] flex-col"
      style={{
        paddingRight: 'var(--safe-right)',
        paddingLeft: 'var(--safe-left)',
      }}
    >
      <Header />

      {/*
        A plain div, not `<main>`. Seven pages (`/`, both `[slug]` routes, and
        `verify/[serial]`) already render their own `<main>`, so wrapping them
        produced nested main landmarks — invalid HTML and two competing
        document-outline roots for screen readers. The page owns the landmark.

        `--header-total` replaces the space the fixed header vacated, and
        `--tabbar-total` does the same for the tab bar, which is also fixed.
        Both totals include the home-indicator inset, so content cannot end up
        under the gesture bar.

        As of §1.2 those two reservations are `.page-body`'s job rather than
        utility classes, because the bottom one has to collapse on drill-down
        routes in step with the bar animating out. `data-tabbar` carries the
        state; the rule lives in `globals.css` next to the bar's own.
      */}
      <div className="page-body flex-1" data-tabbar={atRoot ? 'on' : 'off'}>
        {children}
      </div>

      <MobileTabBar />

      {/* Overlays. Siblings of the header, not children: `glass-surface` sets
          `backdrop-filter`, which makes the header a containing block for
          `position: fixed` descendants and would clip these to its 64px. */}
      <MobileNavDrawer />
      <SearchModal />
      <CartModal />
      <LeaderboardModal />
      <DailyBriefing />
    </div>
  );
};
