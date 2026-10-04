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
  MOBILE_TAB_SLOTS,
  MOBILE_TABS,
  NAV_ACTIONS,
  NAV_DETAIL_PREFIXES,
  NAV_GROUPS,
  NAV_ITEMS,
  PRIMARY_NAV,
  SHELL_EXCLUDED_ROUTES,
  getNavigationDepth,
  isNavActive,
  isRootDepth,
  isShellExcluded,
  resolveBackHref,
  resolveNavGroups,
  resolveNavItem,
  resolveNavTitle,
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
  eq(MOBILE_TAB_SLOTS.length, 5, 'five slots is the touch-target ceiling on 320px');
  // Every slot must resolve, or it renders as a blank target on the bar.
  for (const id of MOBILE_TAB_SLOTS) {
    const isRoute = Object.prototype.hasOwnProperty.call(NAV_ITEMS, id);
    const isAction = Object.prototype.hasOwnProperty.call(NAV_ACTIONS, id);
    ok(isRoute || isAction, `slot ${id} resolves to neither a route nor an action`);
  }
  eq(NAV_ACTIONS.search.id, 'search');
  eq(NAV_ACTIONS.cart.id, 'cart');
  eq(NAV_ACTIONS.leaderboard.id, 'leaderboard');
  ok(!MOBILE_TAB_SLOTS.includes('cart'), 'cart gave up its slot to drops');
});

check('tab bar routes are ordered vaults, skill test, drops, search, courses', () => {
  eq(MOBILE_TAB_SLOTS.join(','), 'vaults,skillTest,drops,search,courses');
  // `MOBILE_TABS` stays derived so a new `tab: true` item cannot fall off the
  // bar unnoticed — it lands here and fails until it is placed in the slots.
  eq(MOBILE_TABS.map((i) => i.id).join(','), 'vaults,skillTest,drops,courses');
  ok(
    MOBILE_TABS.every((i) => MOBILE_TAB_SLOTS.includes(i.id)),
    'a tab item is not placed in the slot list'
  );
  ok(
    !MOBILE_TABS.some((i) => i.id === 'studyPlan'),
    'study plan is drawer-only now — it kept its desktop bar slot'
  );
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

check('only the free course and the skill test carry the free badge', () => {
  // The chip budget is deliberately tiny: two acquisitions hooks, no third.
  const badged = ALL_NAV_ITEMS.filter((i) => i.badge);
  eq(badged.map((i) => i.id).join(','), 'skillTest,freeCourse');
});

// ---------------------------------------------------------------------------
// Phase 1 §1.2 — navigation depth.
//
// The whole point of the depth resolver is that the tab bar disappears on
// pushed screens. A wrong 'root' here is the exact web tell the phase exists to
// remove (a tab bar sitting under a full-screen vault reader), so every real
// route in the app is pinned below rather than spot-checked.
// ---------------------------------------------------------------------------

const ROOT_ROUTES = ['/', '/courses', '/study-plan', '/compare', '/account', '/my-courses', '/campus'];

check('top-level tab routes resolve to root depth', () => {
  for (const route of ROOT_ROUTES) {
    eq(getNavigationDepth(route), 'root', `${route} should keep the tab bar`);
    ok(isRootDepth(route), `${route} should keep the tab bar`);
  }
});

check('pushed screens resolve to detail depth', () => {
  const detail = [
    '/company/amazon',
    '/company/amazon/mobile',
    '/verify/ABC-123',
    '/courses/python',
    '/courses/advanced-data-structures',
    '/interview-course',
  ];
  for (const route of detail) {
    eq(getNavigationDepth(route), 'detail', `${route} should hide the tab bar`);
    ok(!isRootDepth(route), `${route} should hide the tab bar`);
  }
});

check('depth ignores trailing slashes, query and hash', () => {
  for (const variant of ['/courses/', '/courses?sort=free', '/courses#top', '/courses/?a=1#b']) {
    eq(getNavigationDepth(variant), 'root', `${variant} is still the courses tab`);
  }
  for (const variant of ['/company/amazon/', '/company/amazon?m=3', '/company/amazon?q=7&m=2']) {
    eq(getNavigationDepth(variant), 'detail', `${variant} is still inside a vault`);
  }
});

check('a course lesson query does not drag a root route off the tab bar', () => {
  // The plan writes drill-downs as `/courses/[slug]?lesson=…`. The path already
  // decides, so the query must not be able to escalate a root route.
  eq(getNavigationDepth('/?lesson=3'), 'root');
  eq(getNavigationDepth('/compare?lesson=3'), 'root');
});

check('the longest matching item wins over the home route', () => {
  // `/` is a prefix of everything. If `vaults` won the match, every route on
  // the site would resolve as a drill-down out of the home tab.
  eq(getNavigationDepth('/courses'), 'root');
  eq(getNavigationDepth('/study-plan'), 'root');
  eq(getNavigationDepth('/account'), 'root');
});

check('an unknown route falls back to root so the user is never stranded', () => {
  eq(getNavigationDepth('/some-page-we-have-not-built'), 'root');
  eq(getNavigationDepth('/coursesxyz'), 'root');
});

check('every detail prefix is genuinely unreachable as a tab', () => {
  // If someone ever gave `/company` a `tab: true` item, the tab bar and the
  // depth resolver would disagree.
  for (const prefix of NAV_DETAIL_PREFIXES) {
    const clashing = ALL_NAV_ITEMS.filter((i) => i.tab && i.href === prefix);
    eq(clashing.length, 0, `${prefix} must not be a tab`);
  }
});

// ---------------------------------------------------------------------------
// §1.3 — the title and back target a pushed screen shows
// ---------------------------------------------------------------------------

check('a pushed screen is titled from the nav item that owns it', () => {
  eq(resolveNavTitle('/interview-course'), 'Free Course');
  eq(resolveNavTitle('/courses'), 'Courses');
  eq(resolveNavTitle('/courses/python-basics'), 'Courses', 'a nested route inherits its section title');
  eq(resolveNavTitle('/my-courses'), 'My Courses');
});

check('an untitled pushed screen still gets a non-empty title', () => {
  // A vault and a certificate are reached by drilling in, so they have no nav
  // item of their own. A blank title collapses the bar to an unlabelled chevron
  // — and on these routes that chevron is the only way out.
  for (const route of ['/company/amazon', '/company/amazon/m/3', '/verify/ABC-123', '/verify']) {
    ok(resolveNavTitle(route).length > 0, `${route} must not render an empty title`);
  }
});

check('back falls back to the parent section, not the current page', () => {
  eq(resolveBackHref('/courses/python-basics'), '/courses');
  eq(resolveBackHref('/my-courses/python-basics'), '/my-courses');
});

check('a route that is a detail at its own href uses its declared parent', () => {
  // `/interview-course` is a detail with nothing nested below it, so there is no
  // parent to strip from the path — it has to be declared.
  eq(getNavigationDepth('/interview-course'), 'detail');
  eq(resolveBackHref('/interview-course'), '/');
  ok(NAV_ITEMS.freeCourse.parent, 'freeCourse must declare a parent, or its chevron dead-ends');
});

check('drops opens as a full-screen detail feed with a way back', () => {
  // The tab bar *opens* /drops, but the feed itself is a pushed screen: the bar
  // slides away and the header collapses to a chevron + title. A wrong 'root'
  // here puts a tab bar under a full-screen swipe feed.
  eq(getNavigationDepth('/drops'), 'detail');
  eq(getNavigationDepth('/drops/drop-123'), 'detail');
  eq(resolveBackHref('/drops'), '/');
  eq(resolveNavTitle('/drops'), 'Drops');
  ok(NAV_ITEMS.drops.parent, 'drops must declare a parent, or its chevron dead-ends');
  eq(isNavActive('/drops/drop-123', '/drops'), true, 'a drop detail still lights up the tab');
});

check('back never targets the page it is already on', () => {
  // The failure mode of §1.3: a chevron that renders, looks native, and
  // navigates nowhere. Scoped to routes that actually get a chevron — the
  // property is about the detail stack, and asserting it on `/` would only be
  // asserting that a value nothing reads is unused.
  const routes = [
    '/courses/python-basics',
    '/my-courses/c-programming/lesson-3',
    '/company/amazon',
    '/company/amazon/m/3',
    '/verify/ABC-123',
    '/interview-course',
    '/interview-course/lesson/2',
  ];
  for (const route of routes) {
    ok(!isRootDepth(route), `${route} should be a detail route in this list — if it is not, the back-chevron scoping changed`);
    const target = resolveBackHref(route);
    const strip = (p: string) => p.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
    ok(target !== strip(route), `back from ${route} resolved to itself (${target})`);
    ok(target.startsWith('/'), `back from ${route} must be an internal path, got ${target}`);
  }
});

check('the title and back target ignore trailing slashes, query and hash', () => {
  for (const variant of ['/courses/python-basics/', '/courses/python-basics?lesson=2', '/courses/python-basics#q3']) {
    eq(resolveNavTitle(variant), 'Courses', `${variant} is still a course`);
    eq(resolveBackHref(variant), '/courses', `${variant} still backs out to the catalog`);
  }
  eq(resolveNavTitle('/interview-course?lesson=2'), 'Free Course');
  eq(resolveBackHref('/interview-course/'), '/');
});

check('resolveNavItem is the shared match, so depth and title cannot disagree', () => {
  // depth and title are both driven by the same longest-match. If a route has a
  // `NavItem` at all, the title must be that item's label.
  //
  // Hash targets are excluded on purpose. `/#pricing` is a jump *within* the
  // homepage, not a page of its own, so it must never claim to own a route — if
  // it did, every path would resolve against the two-character href and the
  // title would read "Pricing" site-wide.
  const routable = ALL_NAV_ITEMS.filter((i) => !i.href.includes('#'));
  const hashTargets = ALL_NAV_ITEMS.filter((i) => i.href.includes('#'));
  ok(hashTargets.length > 0, 'expected at least one hash target to be excluded');

  for (const item of routable) {
    const owned = resolveNavItem(item.href);
    ok(owned, `${item.href} must resolve to an item`);
    eq(owned!.id, item.id, `${item.href} should resolve to itself`);
    eq(resolveNavTitle(item.href), item.label);
  }
  for (const item of hashTargets) {
    /*
      A hash target does not own its href — `/#pricing` normalises to `/`, which
      the homepage genuinely is, so the *page* item owns it. What must never
      happen is the hash entry claiming the route, or winning the match by
      virtue of its href being short.
    */
    const owner = resolveNavItem(item.href);
    ok(owner, `${item.href} should still resolve to the page it lives on`);
    ok(owner!.id !== item.id, `a hash target must not own a route: ${item.href}`);
    eq(isNavActive('/', item.href), false, `a hash target must never be active: ${item.href}`);
  }
});

console.log(`\nnav-config: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
