'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, ShoppingBag } from 'lucide-react';
import {
  MOBILE_TAB_SLOTS,
  NAV_ACTIONS,
  NAV_ITEMS,
  isNavActive,
  isRootDepth,
} from '@/lib/navConfig';
import type { NavActionItem } from '@/lib/navConfig';
import { useShell } from '@/context/ShellContext';
import { formatBadgeCount } from '@/lib/notifications';

/**
 * The mobile navigation bar.
 *
 * Five slots, in the order the product chose: vaults, skill test, drops,
 * search, courses. Cart gave up its slot to Drops and now lives in the drill
 * header (which takes over exactly when this bar slides away), the drawer and
 * the desktop bar — a sixth route would drop every target under 48px on a
 * 320px screen, and a nav bar whose targets are too small to hit is worse than
 * one with fewer entries, since it looks like it works.
 *
 * The bar is not scrollable and does not reflow. It is `position: fixed` and
 * `height: var(--tabbar-total)` (not `--tabbar-h`: the box-sizing reset would
 * otherwise spend the home-indicator inset inside the bar's own height and
 * shrink its touch targets). It slides out of view on drill-down routes while
 * staying mounted — see `data-depth` below and `.page-body` in `globals.css`
 * for the space reserved on either side of that transition.
 */
export const MobileTabBar: React.FC = () => {
  const router = useRouter();
  const { isOpen, toggleOverlay } = useShell();

  /*
   * Phase 1 — MOBILE_APP_UI_PLAN.md §1.2.
   *
   * The bar is a root-level affordance. On a drill-down route it would offer a
   * shortcut out of the hierarchy the user just entered, which is the opposite
   * of the back affordance that route is supposed to present.
   *
   * `AppShell` calls the same `isRootDepth` for the content column's bottom
   * padding, so the bar and the space reserved for it agree by construction
   * rather than by two copies of a route list.
   */
  const atRoot = isRootDepth(router.pathname);

  return (
    <nav
      aria-label="Primary"
      className="tab-bar md:hidden"
      data-depth={atRoot ? 'root' : 'detail'}
    >
      {MOBILE_TAB_SLOTS.map((id) => {
        const route = NAV_ITEMS[id];
        if (route) {
          const active = isNavActive(router.pathname, route.href);
          const Icon = route.icon;
          return (
            <Link
              key={id}
              href={route.href}
              aria-current={active ? 'page' : undefined}
              className="tab-slot"
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} aria-hidden />
              <span>{route.label}</span>
            </Link>
          );
        }

        const action = (NAV_ACTIONS as Record<string, NavActionItem | undefined>)[id];
        if (!action) return null;
        const Icon = action.icon;
        const active = isOpen(action.id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => toggleOverlay(action.id)}
            data-active={active || undefined}
            aria-expanded={active}
            aria-haspopup="dialog"
            className="tab-slot"
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} aria-hidden />
            <span>{action.shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
};

/**
 * The menu trigger. Rendered in the mobile header row rather than inside the
 * bar, so the bar can keep its five slots at full touch size.
 */
export const MobileMenuButton: React.FC = () => {
  const { isOpen, toggleOverlay } = useShell();
  const open = isOpen('drawer');
  return (
    <button
      type="button"
      onClick={() => toggleOverlay('drawer')}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={open ? 'Close menu' : 'Open menu'}
      /*
       * `md:hidden` is load-bearing. `.icon-btn` is shared with the desktop
       * header's notification and account triggers, so it cannot hide itself at
       * `md`; without this the hamburger sat next to the full desktop nav bar.
       */
      className="icon-btn md:hidden"
    >
      <Menu size={21} strokeWidth={2.2} aria-hidden />
    </button>
  );
};

/** Shared with the header so both draw the same cart affordance. */
export const CartTriggerBadge: React.FC<{ count: number; hydrated: boolean }> = ({ count, hydrated }) => (
  <span className="relative inline-flex">
    <ShoppingBag size={19} strokeWidth={2} aria-hidden />
    {hydrated && count > 0 && (
      <span className="chrome-badge absolute -right-2 -top-1.5" aria-hidden>
        {formatBadgeCount(count)}
      </span>
    )}
  </span>
);
