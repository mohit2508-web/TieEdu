'use client';

import React from 'react';
import { useRouter } from 'next/router';
import { isShellExcluded } from '@/lib/navConfig';
import { Header } from '@/components/layout/Header';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';
import { CartModal } from '@/components/checkout/CartModal';
import { SearchModal } from '@/components/modals/SearchModal';
import { LeaderboardModal } from '@/components/modals/LeaderboardModal';

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

  // `router.isReady` matters: before it, `pathname` is still the previous page
  // on a hard load, and gating on that would flash the shell onto a login page.
  if (!router.isReady || isShellExcluded(router.pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/*
        The tab bar is fixed, so main content has to reserve its height or the
        last row of every page sits under it. `--tabbar-h` is the same var the
        bar is sized with, so the two cannot disagree.
      */}
      {/*
        A plain div, not `<main>`. Seven pages (`/`, both `[slug]` routes, and
        `verify/[serial]`) already render their own `<main>`, so wrapping them
        produced nested main landmarks — invalid HTML and two competing
        document-outline roots for screen readers. The page owns the landmark.
      */}
      <div className="flex-1 pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom,0px))] md:pb-0">
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
    </div>
  );
};
