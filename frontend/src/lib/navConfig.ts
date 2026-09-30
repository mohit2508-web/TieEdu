// ============================================================================
// NAVIGATION CONFIG
//
// Every navigable surface in the product — the desktop bar, the mobile drawer,
// the bottom tab bar, the footer, and the command palette — reads from this
// file. It used to be a private `NAV_LINKS` array inside `Header.tsx` with a
// second, already-divergent hardcoded list in `Footer.tsx`. Two lists meant two
// truths, and a nav change needed two edits plus a diff check to be sure the
// two had not drifted again.
//
// Deliberately free of React and of `next/router` so the matching rules can be
// unit tested on bare node (see `scripts/nav-config.test.ts`).
// ============================================================================

import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BookOpen,
  Building2,
  CalendarCheck,
  Flame,
  GraduationCap,
  LayoutGrid,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  UserRound,
} from 'lucide-react';

export type NavRole = 'user' | 'admin' | null;

export interface NavItem {
  /** Stable key. Used by the drawer groups, the palette and as a React key. */
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * `exact`  — only this path.
   * `prefix` — this path and anything nested under it (`/courses/python`).
   */
  match: 'exact' | 'prefix';
  /** Drawer subtitle and the palette's secondary line. */
  description: string;
  /**
   * `free` is the acquisition hook. It gets a small chip rather than a louder
   * colour, because amber is reserved for money in this palette.
   */
  badge?: 'free';
  /** Renders in the desktop bar (everything else is drawer-only). */
  primary: boolean;
  /** Renders in the bottom tab bar. */
  tab?: boolean;
  /** Only ever shown to a signed-in platform admin. */
  adminOnly?: boolean;
  /** Extra words that should find this item in the command palette. */
  keywords?: string[];
}

/**
 * `vaults` is the product's word for a company intelligence vault, so it keeps
 * the "Vaults" label even though the route is `/`. The aliases let a student
 * type "companies" or "amazon" style queries and still land here.
 */
export const NAV_ITEMS: Record<string, NavItem> = {
  vaults: {
    id: 'vaults',
    href: '/',
    label: 'Vaults',
    icon: LayoutGrid,
    match: 'exact',
    description: 'Every company intelligence vault on TieEdu',
    primary: true,
    tab: true,
    keywords: ['home', 'companies', 'browse', 'start', 'company vaults'],
  },
  compare: {
    id: 'compare',
    href: '/compare',
    label: 'Compare',
    icon: GraduationCap,
    match: 'prefix',
    description: 'Side-by-side rounds, pay and process data',
    primary: true,
    keywords: ['versus', 'vs', 'side by side', 'matrix', 'difference'],
  },
  freeCourse: {
    id: 'freeCourse',
    href: '/interview-course',
    label: 'Free Course',
    icon: Sparkles,
    match: 'prefix',
    description: 'Free interview course — earn XP as you finish it',
    badge: 'free',
    primary: true,
    keywords: ['interview course', 'free', 'xp', 'practice'],
  },
  courses: {
    id: 'courses',
    href: '/courses',
    label: 'Courses',
    icon: BookOpen,
    match: 'prefix',
    description: 'Paid Python and C tracks with certificates',
    primary: true,
    tab: true,
    keywords: ['catalog', 'catalogue', 'python', 'c programming', 'tracks'],
  },
  studyPlan: {
    id: 'studyPlan',
    href: '/study-plan',
    label: 'Study Plan',
    icon: CalendarCheck,
    match: 'prefix',
    description: 'Your phased preparation plan and progress',
    primary: true,
    tab: true,
    keywords: ['plan', 'schedule', 'phases', 'progress', 'timeline'],
  },
  myCourses: {
    id: 'myCourses',
    href: '/my-courses',
    label: 'My Courses',
    icon: Award,
    match: 'prefix',
    description: 'Courses you have started, and your certificates',
    primary: false,
    keywords: ['enrolled', 'progress', 'certificates'],
  },
  account: {
    id: 'account',
    href: '/account',
    label: 'My account',
    icon: UserRound,
    match: 'prefix',
    description: 'Profile, orders and unlocks',
    primary: false,
    keywords: ['profile', 'orders', 'unlocks', 'settings', 'password'],
  },
  campus: {
    id: 'campus',
    href: '/campus',
    label: 'Campus TPO Portal',
    icon: Building2,
    match: 'prefix',
    description: 'Cohort dashboard for campus placement officers',
    primary: false,
    adminOnly: true,
    keywords: ['tpo', 'cohort', 'college', 'campus'],
  },
  admin: {
    id: 'admin',
    href: '/admin',
    label: 'Admin console',
    icon: ShieldCheck,
    match: 'prefix',
    description: 'Vaults, CMS, orders, users and audit',
    primary: false,
    adminOnly: true,
    keywords: ['cms', 'moderation', 'backend', 'manage'],
  },
  pricing: {
    id: 'pricing',
    href: '/#pricing',
    label: 'Pricing',
    icon: Tag,
    match: 'exact',
    description: 'Single round, packs and the complete vault',
    primary: false,
    keywords: ['price', 'cost', 'how much', 'rates', 'plans', 'fees'],
  },
};

export const ALL_NAV_ITEMS: NavItem[] = Object.values(NAV_ITEMS);

/** Desktop bar order. The first entry is the home link. */
export const PRIMARY_NAV: NavItem[] = ALL_NAV_ITEMS.filter((i) => i.primary);

/**
 * Drawer sections. `campus` and `admin` are deliberately absent from the group
 * list and appended to the account block by `resolveNavGroups` — a B2B control
 * plane does not belong next to "Compare".
 */
export const NAV_GROUPS: { id: string; label: string; itemIds: string[] }[] = [
  { id: 'explore', label: 'Explore', itemIds: ['vaults', 'compare', 'courses', 'freeCourse'] },
  { id: 'plan', label: 'Plan & learn', itemIds: ['studyPlan', 'myCourses'] },
];

export const NAV_GROUP_LABELS: Record<string, string> = {
  explore: 'Explore',
  plan: 'Plan & learn',
  account: 'Account',
};

/**
 * Actions that are not routes. They sit in the drawer as a distinct group and
 * in the tab bar as slots, and their "active" state is the overlay being open.
 */
export interface NavActionItem {
  id: 'search' | 'cart' | 'leaderboard';
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ACTIONS: Record<NavActionItem['id'], NavActionItem> = {
  search: {
    id: 'search',
    label: 'Search vaults',
    shortLabel: 'Search',
    icon: Search,
    description: 'Find a company vault or jump anywhere',
  },
  cart: {
    id: 'cart',
    label: 'Cart',
    shortLabel: 'Cart',
    icon: ShoppingBag,
    description: 'Review rounds, packs and checkout',
  },
  leaderboard: {
    id: 'leaderboard',
    label: 'Leaderboard',
    shortLabel: 'Ranks',
    icon: Flame,
    description: 'Placement season XP rankings',
  },
};

/**
 * Bottom tab bar. Five slots is the practical ceiling before every target drops
 * below a 48px touch area. Everything else lives in the drawer.
 */
export const MOBILE_TABS: NavItem[] = ALL_NAV_ITEMS.filter((i) => i.tab);

export const MOBILE_TAB_ACTIONS: NavActionItem['id'][] = ['search', 'cart'];

/**
 * Routes that render their own chrome and must NOT receive the site shell.
 * Each already owns a centred logo or a CMS header of its own.
 *
 * Prefix-matched, so `/admin` also covers `/admin/login`.
 */
export const SHELL_EXCLUDED_ROUTES: string[] = ['/login', '/signup', '/admin'];

/** True when this pathname opts out of the site shell entirely. */
export const isShellExcluded = (pathname: string): boolean =>
  SHELL_EXCLUDED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

/** Trailing slashes are cosmetic; `next/router` can hand back either form. */
const normalizePath = (value: string): string => {
  const [path] = value.split('#');
  const [withoutQuery] = path.split('?');
  const trimmed = withoutQuery.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
};

/**
 * Whether `href` should render as the page the user is currently on.
 *
 * A hash target (`/#pricing`) is a jump within a page, never a page of its
 * own, so it can never be active — otherwise landing on the homepage would
 * light up "Pricing" for the whole time the visitor is there.
 *
 * Prefix matching is segment-aware: `/courses/python` lights up "Courses", but
 * `/coursesxyz` (a hand-typed URL) must not.
 */
export const isNavActive = (pathname: string, href: string): boolean => {
  if (href.includes('#')) return false;
  const target = normalizePath(href);
  const current = normalizePath(pathname);
  if (target === '/') return current === '/';
  if (current === target) return true;
  const item = ALL_NAV_ITEMS.find((i) => i.href === href);
  if (item && item.match === 'exact') return false;
  return current.startsWith(`${target}/`);
};

export const isItemActive = (pathname: string, item: NavItem): boolean =>
  isNavActive(pathname, item.href);

export const isAdminRole = (role: NavRole): boolean => role === 'admin';

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export interface ResolvedNav {
  groups: NavGroup[];
  /** Admin-only destinations plus the signed-out / signed-in auth action. */
  accountItems: NavItem[];
}

/**
 * The drawer's item list for a given role. Filtering by role here rather than
 * with a hand-rolled `isAdmin &&` at each call site is what stops the Campus
 * link from appearing for students on one surface and not another.
 */
export const resolveNavGroups = (role: NavRole): ResolvedNav => {
  const visible = (item: NavItem) => !item.adminOnly || isAdminRole(role);

  const groups: NavGroup[] = NAV_GROUPS.map((group) => ({
    id: group.id,
    label: NAV_GROUP_LABELS[group.id] || group.id,
    items: group.itemIds
      .map((id) => NAV_ITEMS[id])
      .filter((item): item is NavItem => Boolean(item) && visible(item)),
  })).filter((group) => group.items.length > 0);

  const accountItems = ALL_NAV_ITEMS.filter(
    (item) => item.adminOnly && visible(item)
  );

  return { groups, accountItems };
};

/** Everything a signed-out visitor can reach, in drawer order. */
export const resolveDrawerItems = (role: NavRole): NavItem[] => {
  const { groups, accountItems } = resolveNavGroups(role);
  return [...groups.flatMap((g) => g.items), ...accountItems, NAV_ITEMS.account, NAV_ITEMS.pricing];
};
