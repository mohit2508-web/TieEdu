/**
 * Navigation config tests.
 *
 * The nav is the only chrome on all twenty routes, so two classes of bug are
 * worth guarding hard:
 *
 *  1. Active-route matching that over-highlights. A naive `startsWith` lights up
 *     "Courses" for `/coursesxyz`, which is a real URL someone reaches by
 *     hand-editing a link.
 *  2. A nav entry pointing at a route that does not exist. That is exactly how
 *     the header and the footer drifted apart in the first place — the header
 *     had `Pricing`, the footer did not, and nothing failed.
 *
 * This suite imports the real `src/lib/navConfig` module (the runner rewrites
 * the `@/*` alias after compiling), so the code under test is the code that
 * ships.
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  ALL_NAV_ITEMS,
  MOBILE_TABS,
  NAV_ACTIONS,
  NAV_GROUPS,
  NAV_ITEMS,
  PRIMARY_NAV,
  SHELL_EXCLUDED_ROUTES,
  isNavActive,
  isShellExcluded,
  resolveNavGroups,
} from '../src/lib/navConfig';

let pass = 0;
let fail = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
  } catch (err: any) {
    fail += 1;
    console.error(`FAIL  ${name}\n      ${err?.message}`);
  }
}
function eq(actual: unknown, expected: unknown, note = '') {
  if (actual !== expected) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${note ? ` — ${note}` : ''}`);
  }
}
function ok(value: unknown, note: string) {
  if (!value) throw new Error(`expected truthy${note ? ` — ${note}` : ''}`);
}

// ---------------------------------------------------------------------------
// isNavActive — segment-aware prefix matching
// ---------------------------------------------------------------------------

check('home is active only on the exact root', () => {
  eq(isNavActive('/', '/'), true);
  eq(isNavActive('/compare', '/'), false);
  eq(isNavActive('/courses', '/'), false);
});

check('nested course routes light up Courses', () => {
  eq(isNavActive('/courses', '/courses'), true);
  eq(isNavActive('/courses/python-basics', '/courses'), true);
  eq(isNavActive('/courses/c-programming', '/courses'), true);
});

check('a hand-typed /coursesxyz must not light up Courses', () => {
  // The whole point of the trailing-slash segment check. A plain `startsWith`
  // gets this wrong and highlights a page the user is not on.
  eq(isNavActive('/coursesxyz', '/courses'), false);
  eq(isNavActive('/compares', '/compare'), false);
  eq(isNavActive('/study-planner', '/study-plan'), false);
});

check('query strings and trailing slashes are ignored', () => {
  eq(isNavActive('/courses/', '/courses'), true);
  eq(isNavActive('/courses?page=2', '/courses'), true);
  eq(isNavActive('/courses/?page=2&sort=az', '/courses'), true);
  eq(isNavActive('/compare#pricing', '/compare'), true);
});

check('a hash target is never the active page', () => {
  // `/#pricing` is a jump within the home page. If it could go active, the
  // whole homepage would render "Pricing" as the current section.
  eq(isNavActive('/', '/#pricing'), false);
  eq(isNavActive('/courses', '/#pricing'), false);
  eq(isNavActive('/compare', '/#pricing'), false);
});

check('unrelated routes match nothing', () => {
  eq(isNavActive('/login', '/courses'), false);
  eq(isNavActive('/verify/TIEEDU-1', '/courses'), false);
  eq(isNavActive('/admin', '/courses'), false);
});

check('every nav item resolves its own active state consistently', () => {
  for (const item of ALL_NAV_ITEMS) {
    if (item.href.includes('#')) {
      eq(isNavActive(item.href, item.href), false, `${item.id} is a hash target`);
      continue;
    }
    eq(isNavActive(item.href, item.href), true, `${item.id} should be active on its own href`);
  }
});

// ---------------------------------------------------------------------------
// Route existence — the drift guard
// ---------------------------------------------------------------------------

/**
 * The runner compiles every suite into `.test-build/emit`, so `__dirname` points
 * at the emitted copy and not at the real tree. Walk up until the actual
 * `src/pages` shows up, which also keeps the suite working whether it is run
 * from the repo root or from `frontend/`.
 */
const findPagesDir = (): string => {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, 'src', 'pages');
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('could not locate src/pages from ' + __dirname);
};

/**
 * Every non-hash href must resolve to a real page under `src/pages`. This is
 * the assertion that would have caught the footer falling out of sync with the
 * header: a nav link to a page nobody wrote is a dead button in the chrome.
 */
check('every nav href resolves to a real page', () => {
  const pagesDir = findPagesDir();
  for (const item of ALL_NAV_ITEMS) {
    if (item.href.includes('#')) continue;
    const path = item.href.split('?')[0];
    const candidates = [
      join(pagesDir, `${path}.tsx`),
      join(pagesDir, path, 'index.tsx'),
    ];
    ok(
      candidates.some((c) => existsSync(c)),
      `${item.id} -> ${item.href} has no page file (looked for ${candidates.join(' and ')})`
    );
  }
});

check('no two nav items share an href', () => {
  const seen = new Map<string, string>();
  for (const item of ALL_NAV_ITEMS) {
    const prev = seen.get(item.href);
    if (prev) throw new Error(`${prev} and ${item.id} both point at ${item.href}`);
    seen.set(item.href, item.id);
  }
});

check('nav item ids match their config keys', () => {
  for (const [key, item] of Object.entries(NAV_ITEMS)) {
    eq(item.id, key, 'id must equal its key so React keys stay stable');
  }
});

// ---------------------------------------------------------------------------
// Role gating
// ---------------------------------------------------------------------------

check('students never see admin destinations', () => {
  const { groups, accountItems } = resolveNavGroups('user');
  const labels = [...groups.flatMap((g) => g.items), ...accountItems].map((i) => i.id);
  ok(!labels.includes('campus'), 'Campus TPO Portal leaked to a student');
  ok(!labels.includes('admin'), 'Admin console leaked to a student');
});

check('admins do see both admin destinations', () => {
  const { accountItems } = resolveNavGroups('admin');
  const ids = accountItems.map((i) => i.id);
  ok(ids.includes('campus'), 'Campus TPO Portal missing for an admin');
  ok(ids.includes('admin'), 'Admin console missing for an admin');
});

check('a signed-out visitor sees no admin destinations', () => {
  const { accountItems } = resolveNavGroups(null);
  eq(accountItems.length, 0);
});

check('every configured group resolves to at least one item for a student', () => {
  const { groups } = resolveNavGroups('user');
  eq(groups.length, NAV_GROUPS.length);
  for (const group of groups) {
    ok(group.items.length > 0, `group ${group.id} is empty`);
    ok(group.label.length > 0, `group ${group.id} has no label`);
  }
});

check('group membership does not repeat an item', () => {
  const { groups } = resolveNavGroups('admin');
  const ids = groups.flatMap((g) => g.items.map((i) => i.id));
  eq(new Set(ids).size, ids.length, 'an item appears in two groups');
});

// ---------------------------------------------------------------------------
// Shell opt-out list
// ---------------------------------------------------------------------------

check('auth and admin routes are excluded from the site shell', () => {
  for (const route of ['/login', '/signup', '/admin']) {
    ok(SHELL_EXCLUDED_ROUTES.includes(route), `${route} missing from SHELL_EXCLUDED_ROUTES`);
  }
});

check('isShellExcluded is prefix-aware so /admin/login is covered', () => {
  eq(isShellExcluded('/login'), true);
  eq(isShellExcluded('/signup'), true);
  eq(isShellExcluded('/admin'), true);
  eq(isShellExcluded('/admin/login'), true);
  eq(isShellExcluded('/admin/anything/deep'), true);
});

check('ordinary product routes keep the site shell', () => {
  for (const route of ['/', '/courses', '/study-plan', '/company/razorpay', '/verify', '/my-courses']) {
    eq(isShellExcluded(route), false, `${route} should keep the header`);
  }
});

check('a route that merely starts with the same letters is not excluded', () => {
  // `/administrator` must not be swallowed by the `/admin` prefix rule.
  eq(isShellExcluded('/administrator'), false);
  eq(isShellExcluded('/login-help'), false);
});

// ---------------------------------------------------------------------------
// Desktop bar and tab bar composition
// ---------------------------------------------------------------------------

check('the desktop bar keeps every top-level destination', () => {
  const ids = PRIMARY_NAV.map((i) => i.id);
  for (const required of ['vaults', 'compare', 'freeCourse', 'courses', 'studyPlan']) {
    ok(ids.includes(required), `${required} is missing from the desktop bar`);
  }
  ok(PRIMARY_NAV.length >= 5, 'desktop bar collapsed below five links');
  ok(!ids.includes('campus'), 'the B2B TPO portal does not belong in the main bar');
  ok(!ids.includes('admin'), 'the admin console does not belong in the main bar');
});

check('the desktop bar hides admin-only items from its rendered order', () => {
  // PRIMARY_NAV is role-independent by design; the component filters. Guard
  // that the filter is even possible: nothing admin-only may be marked primary.
  for (const item of PRIMARY_NAV) {
    ok(!item.adminOnly, `${item.id} is adminOnly but marked primary`);
  }
});

check('the tab bar stays at five slots', () => {
  eq(MOBILE_TABS.length, 3, 'expected three route tabs');
  eq(NAV_ACTIONS.search.id, 'search');
  eq(NAV_ACTIONS.cart.id, 'cart');
  eq(NAV_ACTIONS.leaderboard.id, 'leaderboard');
});

check('tab bar routes are ordered vaults, courses, study plan', () => {
  eq(MOBILE_TABS.map((i) => i.id).join(','), 'vaults,courses,studyPlan');
});

check('nav icons are unique where the surfaces show them side by side', () => {
  // The drawer renders every icon in a column, so two items sharing a glyph
  // read as a rendering bug. (This is what `Study Plan` and `Pricing` both
  // using `Tag` looked like.)
  const grouped = NAV_GROUPS.flatMap((g) => g.itemIds);
  const seen = new Map<string, string>();
  for (const id of grouped) {
    const item = NAV_ITEMS[id];
    const name = item.icon.displayName || item.icon.name || String(id);
    const prev = seen.get(name);
    ok(!prev, `${prev} and ${id} share the ${name} icon`);
    seen.set(name, id);
  }
});

check('every nav item carries a description for the drawer and palette', () => {
  for (const item of ALL_NAV_ITEMS) {
    ok(item.description.trim().length > 8, `${item.id} has no usable description`);
    ok(item.label.trim().length > 0, `${item.id} has no label`);
  }
});

check('only the free course carries the free badge', () => {
  const badged = ALL_NAV_ITEMS.filter((i) => i.badge);
  eq(badged.length, 1);
  eq(badged[0].id, 'freeCourse');
});

console.log(`\nnav-config: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
