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
  BrainCircuit,
  Building2,
  CalendarCheck,
  Droplets,
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

// ---------------------------------------------------------------------------
// PLACEMENT ACCESS FLAG (visibility of the Campus TPO entry only)
//
// `GET /api/placement/me` maintains this localStorage flag; `resolveNavGroups`
// and the command palette read it synchronously — the pure nav functions run
// on bare node in the unit suites, where there is no window and the flag
// reads as false, exactly like a signed-out visitor.
//
// A heuristic, deliberately. It decides visibility of a LINK, never access to
// data: every `/tpo/*` screen still boots through `/api/placement/me`, and the
// server is the only authority. Its job is to keep a student from seeing a
// destination that would only ever tell them "no".
//
// Storage is reached through `globalThis` rather than the bare `window` /
// `localStorage` identifiers: the test runner compiles this file with
// `lib: ['ES2020']` (no DOM), where those names do not typecheck.
// ---------------------------------------------------------------------------

const PLACEMENT_ACCESS_KEY = 'tpo_portal_access';

type StorageLike = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };

const placementStorage = (): StorageLike | null => {
  const g = globalThis as { window?: { localStorage?: StorageLike }; localStorage?: StorageLike };
  return g.window?.localStorage ?? g.localStorage ?? null;
};

export const hasPlacementPortalAccess = (): boolean => {
  try {
    return placementStorage()?.getItem(PLACEMENT_ACCESS_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Writer — owned by the placement API client (`placementMe` on success/403,
 * `clearPlacementAccess` on sign-out). Exported here so the key and the read
 * side live in one dependency-free file.
 */
export const markPlacementAccess = (granted: boolean): void => {
  try {
    const storage = placementStorage();
    if (!storage) return;
    if (granted) storage.setItem(PLACEMENT_ACCESS_KEY, '1');
    else storage.removeItem(PLACEMENT_ACCESS_KEY);
  } catch {
    /* private mode — visibility falls back to "hidden", the safe side */
  }
};

/**
 * Called on sign-out: the flag belongs to whoever was signed in when `/me`
 * last succeeded. Leaving it behind would hand the next person (or a
 * signed-out visitor) a Campus TPO drawer entry that is not theirs.
 */
export const clearPlacementAccess = (): void => markPlacementAccess(false);

export type NavRole = 'user' | 'admin' | null;

/**
 * Where a route sits in the mobile navigation stack.
 *
 * `root`   — a top-level tab. The bottom tab bar stays.
 * `detail` — pushed onto the stack. The tab bar slides away and the header
 *            collapses to a native nav bar (back chevron + title).
 *
 * Phase 1 — MOBILE_APP_UI_PLAN.md §1.2. Resolved by `getNavigationDepth` rather
 * than opted into per page, so a new page cannot forget and end up with a tab
 * bar sitting on top of a full-screen reader.
 */
export type NavigationDepth = 'root' | 'detail';

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
  /**
   * Force this route to a depth regardless of nesting. Omit to let
   * `getNavigationDepth` decide from the path — a bare item is a root, and
   * anything nested under it is a detail.
   */
  depth?: NavigationDepth;
  /**
   * Phase 1 — §1.3. Where the mobile back chevron goes when there is no history
   * to pop — a deep link opened in a fresh tab, or a reload.
   *
   * Only needed when `depth` is pinned: a route that is a detail *at its own
   * href* has no parent implied by the path, because there is nothing below it to
   * strip. Nesting already handles itself (`/courses/python` → `/courses`).
   * Defaults to `/`, which is never a dead end.
   */
  parent?: string;
  /** Only ever shown to a signed-in platform admin. */
  adminOnly?: boolean;
  /**
   * Shown to platform admins AND to accounts holding a Campus TPO placement
   * grant (detected via the flag `/api/placement/me` leaves in localStorage).
   *
   * Separate from `adminOnly` on purpose: TPO staff are ordinary `user`
   * accounts — folding them into `adminOnly` would either hide the portal
   * entry from exactly the people it exists for, or (by loosening
   * `adminOnly`) hand every student a link to a surface whose denial screen
   * they have no business seeing.
   */
  placementOnly?: boolean;
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
  skillTest: {
    id: 'skillTest',
    href: '/skill-test',
    label: 'Skill Test',
    icon: BrainCircuit,
    match: 'prefix',
    description: 'Test your skills, know your level & earn verified certificates',
    badge: 'free',
    primary: true,
    tab: true,
    keywords: ['skill test', 'assessment', 'mcq', 'quiz', 'certificate', 'test', 'skills'],
  },
  drops: {
    id: 'drops',
    href: '/drops',
    label: 'Drops',
    icon: Droplets,
    match: 'prefix',
    description: 'Swipe the career feed — jobs, vaults, contests and deadlines',
    primary: true,
    tab: true,
    /*
      A full-screen vertical feed, not a document page: the tab bar slides away
      and the header collapses to a back chevron + title, exactly like a vault
      reader. It keeps its `tab` slot so the bar can *open* it.
    */
    depth: 'detail',
    /*
      A detail at its own href — `/drops` has nothing below it to strip — so the
      back target has to be declared, or the chevron dead-ends.
    */
    parent: '/',
    keywords: ['drops', 'feed', 'reels', 'jobs', 'deadlines', 'news', 'updates'],
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
    /*
      Its own path, but it is a course *reader* — a module strip, a question
      view and its own scroll position. Left as a root it would keep the tab
      bar pinned under a full-screen lesson, which is tell #8.
    */
    depth: 'detail',
    /*
      A detail at its own href, so there is no parent to infer from the path —
      `/interview-course` has nothing below it to strip. It is a primary item and
      not a tab, so the only sensible way out is the vault list it sits beside.
    */
    parent: '/',
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
    /*
      Drawer-only. The five tab slots are spoken for (vaults, skill test, drops,
      search, courses), and a plan a student opens once a week does not outrank
      a feed they open daily. Still on the desktop bar.
    */
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
    href: '/tpo',
    label: 'Campus TPO Portal',
    icon: Building2,
    match: 'prefix',
    description: 'Placement intelligence for campus placement officers',
    primary: false,
    // Not `adminOnly`: TPO staff are ordinary accounts with a placement GRANT.
    // Visible to platform admins and to accounts the placement backend has
    // confirmed (`/api/placement/me` leaves a flag in localStorage) — never to
    // a student whose worst outcome should be a denial screen they never see.
    placementOnly: true,
    keywords: ['tpo', 'cohort', 'college', 'campus', 'placement'],
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
  { id: 'explore', label: 'Explore', itemIds: ['vaults', 'compare', 'skillTest', 'drops', 'courses', 'freeCourse'] },
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

/**
 * The five slots, in render order: four routes and the search action.
 *
 * The list is explicit rather than derived because the bar's order is a
 * product decision (and mixes routes with actions), while `MOBILE_TABS` stays
 * derived so a new `tab: true` item cannot silently fall off the bar — it shows
 * up in `MOBILE_TABS` and fails the ordering test until it is placed here.
 */
export const MOBILE_TAB_SLOTS: string[] = ['vaults', 'skillTest', 'drops', 'search', 'courses'];

/**
 * The action set the mobile chrome offers: the tab bar renders `search` (via
 * `MOBILE_TAB_SLOTS`) and the drill-down header renders both.
 *
 * `cart` left the tab bar when Drops claimed the fifth slot — the cart stays
 * reachable in the drill header (the bar itself slides away on those routes,
 * so nothing is stranded there), in the drawer, and on the desktop bar.
 *
 * `.tab-slot` is `flex: 1 1 0` and `.tab-bar` is `space-around`, so the count is
 * derived rather than hard-coded: grow `MOBILE_TAB_SLOTS` and the bar re-spaces
 * itself. No width to recompute.
 */
export const MOBILE_TAB_ACTIONS: NavActionItem['id'][] = ['search', 'cart'];

/**
 * Routes that render their own chrome and must NOT receive the site shell.
 * Each already owns a centred logo or a CMS header of its own.
 *
 * Prefix-matched, so `/admin` also covers `/admin/login`.
 */
export const SHELL_EXCLUDED_ROUTES: string[] = ['/login', '/signup', '/admin', '/tpo', '/school'];

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
 * Detail routes that have no `NavItem` of their own, so they cannot be inferred
 * from the item list. Each is a pushed screen with no tab of its own.
 *
 * `/company/[slug]` is a vault, `/verify/[serial]` is a certificate. Both are
 * reached by drilling into something else, so both cover the tab bar.
 */
export const NAV_DETAIL_PREFIXES: string[] = ['/company', '/verify'];

/**
 * True when `path` is nested *strictly below* `prefix` — at least one more
 * segment. Deliberately not an equality test: `resolveBackHref` uses this to
 * find a parent, and a "parent" equal to the current page is a back button that
 * navigates nowhere.
 *
 * `/` is never a parent by nesting, since everything is below it; those routes
 * go through an explicit `parent` instead.
 */
const isNestedUnder = (path: string, prefix: string): boolean =>
  prefix !== '/' && path.startsWith(`${prefix}/`);

/**
 * The `NavItem` that owns this pathname: the longest matching href.
 *
 * Longest-match matters because `/` is a prefix of everything — `/courses/python`
 * has to resolve against `courses`, not against `vaults`.
 *
 * Split out of `getNavigationDepth` so §1.3's title and back-target resolve
 * through the *same* match. If depth and title each had their own copy, adding
 * a route could give a detail page a root-looking title, and nothing would fail.
 */
export const resolveNavItem = (pathname: string): NavItem | null => {
  const current = normalizePath(pathname);
  if (!current) return null;

  const matches = ALL_NAV_ITEMS.filter(
    (item) => !item.href.includes('#') && isNavActive(current, item.href)
  );
  if (matches.length === 0) return null;

  return matches.reduce((best, candidate) =>
    normalizePath(candidate.href).length > normalizePath(best.href).length ? candidate : best
  );
};

/**
 * Phase 1 — MOBILE_APP_UI_PLAN.md §1.3. The title a pushed screen shows in its
 * native nav bar.
 *
 * Never empty. A blank title is worse than a generic one: it collapses the bar to
 * an unlabelled chevron, and on a pushed screen that chevron is the only way out.
 */
export const resolveNavTitle = (pathname: string): string => {
  const item = resolveNavItem(pathname);
  return item ? item.label : 'TieEdu';
};

/**
 * Phase 1 — §1.3. Where the back chevron goes when there is nothing to pop.
 *
 * Resolution order:
 *   1. the owning item's `parent`, when the route is a detail at its own href and
 *      there is no nesting to strip (`/interview-course` → `/`)
 *   2. the owning item's own href, when the path is strictly nested below it
 *      (`/courses/python` → `/courses`)
 *   3. `/`
 *
 * Never returns the current page. A back chevron that targets where it already
 * is looks functional and strands the user, which is the failure §1.3 exists to
 * prevent.
 */
export const resolveBackHref = (pathname: string): string => {
  const item = resolveNavItem(pathname);
  if (!item) return '/';
  const current = normalizePath(pathname);
  if (isNestedUnder(current, normalizePath(item.href))) return normalizePath(item.href);
  return item.parent ?? '/';
};

/**
 * Phase 1 — MOBILE_APP_UI_PLAN.md §1.2. Which stack a pathname belongs to.
 *
 * Deliberately path-only. The plan also writes drill-downs as
 * `/company/[slug]?m=…?q=…` and `/courses/[slug]?lesson=…`, but in both cases
 * the *path* is already a detail, so the query adds nothing to the decision —
 * and reading it would mean a `?lesson=` on a root route could silently cover
 * the tab bar.
 *
 * Resolution order:
 *   1. an explicit detail prefix (`/company`, `/verify`)
 *   2. the longest matching `NavItem`
 *        - item pins `depth`            -> that depth
 *        - path has segments below href -> detail (pushed screen)
 *        - otherwise                     -> root (top-level tab)
 */
export const getNavigationDepth = (pathname: string): NavigationDepth => {
  const current = normalizePath(pathname);
  if (!current) return 'root';

  for (const prefix of NAV_DETAIL_PREFIXES) {
    // The bare prefix is a detail too (`/verify` with no serial still leaves
    // the tab stack), so this is a plain prefix test, not a segment test.
    if (current === prefix || current.startsWith(`${prefix}/`)) return 'detail';
  }

  const item = resolveNavItem(current);

  if (!item) {
    // An unknown route. `root` is the safe default: a tab bar on a page we have
    // never seen is a cosmetic miss, whereas hiding it on a new top-level page
    // would strand the user with no way to navigate away.
    return 'root';
  }

  if (item.depth) return item.depth;
  return normalizePath(current) === normalizePath(item.href) ? 'root' : 'detail';
};

/** True when the bottom tab bar should be visible on this route. */
export const isRootDepth = (pathname: string): boolean => getNavigationDepth(pathname) === 'root';

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
 *
 * Two independent gates, evaluated in order of blast radius:
 *  - `adminOnly`   → platform admins, full stop.
 *  - `placementOnly` → platform admins OR a confirmed placement grant. The
 *    grant check reads the localStorage flag `/api/placement/me` maintains;
 *    on the server (and in the bare-node unit suites) it is false, so SSR
 *    renders exactly what a signed-out visitor sees.
 */
export const resolveNavGroups = (role: NavRole): ResolvedNav => {
  const visible = (item: NavItem) =>
    (!item.adminOnly || isAdminRole(role)) &&
    (!item.placementOnly || isAdminRole(role) || hasPlacementPortalAccess());

  const groups: NavGroup[] = NAV_GROUPS.map((group) => ({
    id: group.id,
    label: NAV_GROUP_LABELS[group.id] || group.id,
    items: group.itemIds
      .map((id) => NAV_ITEMS[id])
      .filter((item): item is NavItem => Boolean(item) && visible(item)),
  })).filter((group) => group.items.length > 0);

  const accountItems = ALL_NAV_ITEMS.filter(
    (item) => (item.adminOnly || item.placementOnly) && visible(item)
  );

  return { groups, accountItems };
};

/** Everything a signed-out visitor can reach, in drawer order. */
export const resolveDrawerItems = (role: NavRole): NavItem[] => {
  const { groups, accountItems } = resolveNavGroups(role);
  return [...groups.flatMap((g) => g.items), ...accountItems, NAV_ITEMS.account, NAV_ITEMS.pricing];
};
