'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronRight, LogIn, LogOut, UserRound, X } from 'lucide-react';
import {
  ALL_NAV_ITEMS,
  NAV_ACTIONS,
  NAV_ITEMS,
  isNavActive,
  resolveNavGroups,
  type NavItem,
  type NavRole,
} from '@/lib/navConfig';
import { Sheet } from '@/components/common/Sheet';
import { useShell } from '@/context/ShellContext';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { formatBadgeCount } from '@/lib/notifications';
import { cn } from '@/lib/cn';

/**
 * The mobile drawer.
 *
 * Replaces the old inline drawer that lived inside `Header.tsx`, which meant
 * each of the twelve pages had its own copy of the nav markup, its own open
 * state, and its own idea of which items were visible. This one is mounted once
 * and reads `navConfig`, so the drawer cannot disagree with the tab bar, the
 * footer or the palette.
 *
 * Three states in one component on purpose: the whole product is small enough
 * that a signed-out visitor, a student and a platform admin should all see one
 * coherent list rather than three different components.
 */
export const MobileNavDrawer: React.FC = () => {
  const router = useRouter();
  const { isOpen, closeOverlay, toggleOverlay } = useShell();
  const { user, logout } = useAuth();
  const { count, hydrated } = useCart();
  const open = isOpen('drawer');

  const role: NavRole = user?.role ?? null;
  const { groups, accountItems } = resolveNavGroups(role);
  const signedIn = Boolean(user);

  // Close on navigation. Without this the drawer stays over the new page after
  // a drawer-only link (e.g. "Pricing", which is a jump on the homepage).
  useEffect(() => {
    const onRouteChange = () => closeOverlay('drawer');
    router.events.on('routeChangeComplete', onRouteChange);
    return () => router.events.off('routeChangeComplete', onRouteChange);
  }, [router.events, closeOverlay]);

  const Row: React.FC<{ item: NavItem }> = ({ item }) => {
    const active = isNavActive(router.pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className="nav-row"
        onClick={() => closeOverlay('drawer')}
      >
        <span className="nav-row-icon" aria-hidden>
          <Icon size={18} strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="nav-row-label flex items-center gap-2">
            {item.label}
            {item.badge === 'free' && <span className="nav-link-badge">Free</span>}
          </span>
          <span className="nav-row-desc block">{item.description}</span>
        </span>
        <ChevronRight size={16} className="flex-none opacity-40" aria-hidden />
      </Link>
    );
  };

  /*
   * Phase 2: a `Sheet` with `side="right"`. It gains drag-to-close (drag the
   * header outward), a Tab focus trap, and focus restore — the previous version
   * moved focus in on open but let it walk straight out of the drawer and never
   * put it back. Escape and the body scroll lock stay with `ShellContext`,
   * which already owns both for the `drawer` overlay.
   *
   * `scroll={false}` because the drawer pins an account row below its own
   * scroller, and `hideOnDesktop` because the drawer is mobile-only by design —
   * hiding just the panel would leave an invisible scrim eating every click.
   */
  return (
    <Sheet
      open={open}
      onClose={() => closeOverlay('drawer')}
      title="Menu"
      side="right"
      zIndex={70}
      showHandle={false}
      hideOnDesktop
      scroll={false}
      closeOnEscape={false}
      blocksScroll={false}
      className="w-[min(21rem,88vw)] max-w-[min(21rem,88vw)] border-l border-[#EDEDEB] shadow-none"
      data-testid="nav-drawer"
      header={
        <div className="flex items-center justify-between gap-2 border-b border-[#EDEDEB] px-4 py-3">
          <p className="text-sm font-bold text-[#10151C]">Menu</p>
          <button
            type="button"
            onClick={() => closeOverlay('drawer')}
            aria-label="Close menu"
            className="icon-btn"
          >
            <X size={19} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {groups.map((group) => (
            <section key={group.id} className="mb-5">
              <h2 className="nav-group-label">{group.label}</h2>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <Row key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}

          <section className="mb-5">
            <h2 className="nav-group-label">Quick actions</h2>
            <div className="flex flex-col gap-0.5">
              {(['search', 'cart', 'leaderboard'] as const).map((id) => {
                const action = NAV_ACTIONS[id];
                const Icon = action.icon;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      // Close the drawer first so the overlay it opens is the
                      // only thing on screen — otherwise Escape has to unwind
                      // two layers for a search.
                      closeOverlay('drawer');
                      toggleOverlay(id);
                    }}
                    className="nav-row"
                  >
                    <span className="nav-row-icon" aria-hidden>
                      <Icon size={18} strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="nav-row-label">
                        {action.label}
                        {id === 'cart' && hydrated && count > 0 && (
                          <span className="ml-2 inline-flex align-middle">
                            <span className="chrome-badge">{formatBadgeCount(count)}</span>
                          </span>
                        )}
                      </span>
                      <span className="nav-row-desc block">{action.description}</span>
                    </span>
                    <ChevronRight size={16} className="flex-none opacity-40" aria-hidden />
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="nav-group-label">Account</h2>
            <div className="flex flex-col gap-0.5">
              {signedIn && (
                <Row item={NAV_ITEMS.account} />
              )}
              {accountItems.map((item) => (
                <Row key={item.id} item={item} />
              ))}
              <Row item={NAV_ITEMS.pricing} />
            </div>
          </section>
        </div>

        <div className="border-t border-[#EDEDEB] px-3 py-3">
          {signedIn ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#EAF4FB] text-[#0284C7]">
                <UserRound size={17} strokeWidth={2.2} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#10151C]">{user?.name}</span>
                <span className="block truncate text-xs text-[#6B7280]">{user?.email}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  closeOverlay('drawer');
                  logout();
                }}
                aria-label="Sign out"
                className="icon-btn"
              >
                <LogOut size={18} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => closeOverlay('drawer')}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#0284C7] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0369A1]"
            >
              <LogIn size={17} strokeWidth={2.4} aria-hidden />
              Sign in
            </Link>
          )}
        </div>
      </div>
    </Sheet>
  );
};

/**
 * Drawer affordance for a company vault.
 *
 * The old drawer had a separate "Search vaults" field that opened the search
 * modal only on a full Enter press and gave no feedback otherwise. This is one
 * row that opens the palette, which is the same destination and is reachable
 * from ⌘K on every page.
 */
export const DrawerSearchHint: React.FC = () => {
  const { toggleOverlay } = useShell();
  const action = NAV_ACTIONS.search;
  const Icon = action.icon;
  return (
    <button
      type="button"
      onClick={() => toggleOverlay('search')}
      className={cn('nav-row', 'text-[#6B7280]')}
    >
      <span className="nav-row-icon" aria-hidden>
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="nav-row-label">{action.label}</span>
        <span className="nav-row-desc block">Press ⌘K from anywhere</span>
      </span>
    </button>
  );
};

/** Count of destinations the drawer exposes — used by the palette's footer. */
export const DRAWER_ITEM_COUNT = ALL_NAV_ITEMS.length + Object.keys(NAV_ACTIONS).length;
