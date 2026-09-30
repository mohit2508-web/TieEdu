'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Award, ChevronDown, Command, Flame, LogOut, Search, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react';
import { TieEduLogo } from '@/components/common/TieEduLogo';
import { useAuth } from '@/context/AuthContext';
import { useShell } from '@/context/ShellContext';
import { useCart } from '@/context/CartContext';
import { PRIMARY_NAV, isNavActive } from '@/lib/navConfig';
import { formatBadgeCount } from '@/lib/notifications';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { MobileMenuButton } from '@/components/layout/MobileTabBar';

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
  const { toggleOverlay } = useShell();
  const { count, hydrated } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the account menu on navigation — it used to stay open over the new
  // page until a second click somewhere else.
  useEffect(() => {
    const onRouteChange = () => setMenuOpen(false);
    router.events.on('routeChangeComplete', onRouteChange);
    return () => router.events.off('routeChangeComplete', onRouteChange);
  }, [router.events]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [menuOpen]);

  const isAdmin = user?.role === 'admin';

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push('/');
  };

  return (
    /*
     * `glass-surface` sets `backdrop-filter`, which makes this element a
     * containing block for `position: fixed` descendants. That is why the old
     * drawer needed a portal — the drawer lived inside the header and would
     * otherwise be clipped to the header's 64px. Overlays are now siblings of
     * the header in `AppShell`, so no portal is needed and the DOM is flat.
     *
     * Height is `var(--header-h)` so the four sub-bars that pin underneath it
     * can offset by the same number instead of hardcoding 64px.
     */
    <header className="glass-surface sticky top-0 z-40">
      <div className="mx-auto flex h-[var(--header-h)] w-full max-w-[1700px] items-center justify-between gap-3 px-3 sm:px-8 lg:px-12">
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

          <button
            type="button"
            onClick={() => toggleOverlay('leaderboard')}
            aria-label="Leaderboard"
            title="Placement season XP rankings"
            className="chip hidden xl:inline-flex"
          >
            <Flame size={15} className="text-[var(--amber-deep)]" strokeWidth={2.2} aria-hidden />
            <span className="font-bold">Leaderboard</span>
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

          {!loading && user && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Account menu for ${user.name}`}
                className="flex items-center gap-1.5 rounded-xl border border-[#E9E7E1] bg-white/70 py-1 pl-1 pr-1.5 transition-colors hover:border-[#D6D2C8] focus-ring sm:pr-2"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="h-7 w-7 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0284C7] text-[13px] font-extrabold uppercase text-white">
                    {user.name.charAt(0)}
                  </span>
                )}
                <span className="hidden max-w-[140px] truncate text-[13px] font-bold text-[#10151C] lg:block">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown
                  size={14}
                  className={`hidden text-[var(--text-muted)] transition-transform sm:inline ${menuOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="animate-slide-up-chrome absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-white p-2 shadow-[var(--shadow-raised)]"
                >
                  <div className="border-b border-[#E9E7E1] px-3 py-2.5">
                    <p className="truncate text-[13px] font-bold text-[#10151C]">{user.name}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
                    <span
                      className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${
                        isAdmin ? 'bg-[#0E2A44] text-[#E8A33D]' : 'bg-[#E8F4FB] text-[#0271B5]'
                      }`}
                    >
                      {isAdmin ? 'Platform Admin' : 'Student'}
                    </span>
                  </div>

                  <div className="py-1.5">
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-[#3E4754] hover:bg-[#F3F2EE]"
                      >
                        <ShieldCheck size={16} className="text-[#0E2A44]" aria-hidden />
                        Admin console
                      </Link>
                    )}
                    <Link
                      href="/my-courses"
                      onClick={() => setMenuOpen(false)}
                      role="menuitem"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-[#3E4754] hover:bg-[#F3F2EE]"
                    >
                      <Award size={16} className="text-[#0E2A44]" aria-hidden />
                      My courses
                    </Link>
                    <Link
                      href="/account"
                      onClick={() => setMenuOpen(false)}
                      role="menuitem"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-[#3E4754] hover:bg-[#F3F2EE]"
                    >
                      <UserRound size={16} className="text-[#0284C7]" aria-hidden />
                      My account
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-[#C1442D] hover:bg-[#FDEDE9]"
                    >
                      <LogOut size={16} aria-hidden />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !user && (
            <Link href="/login" className="btn btn-primary hidden px-4 py-2 text-[13px] focus-ring md:inline-flex">
              Sign in
            </Link>
          )}

          <MobileMenuButton />
        </div>
      </div>
    </header>
  );
};
