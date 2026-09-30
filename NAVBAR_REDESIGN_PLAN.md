# Navbar Redesign Plan — "One Shell, Every Route: Desktop Command Bar + Real Mobile Nav"

> **Decisions locked (30 Sep 2026):**
> 1. **AppShell + Header split** — `Header` lifts out of all 12 pages into `_app.tsx`; the Search / Leaderboard / Cart modals move with it, plus a `CartProvider` + `ShellProvider`.
> 2. **Mobile = improved drawer + 5-slot bottom tab bar** (safe-area aware), not a drawer-only nav.
> 3. **In scope extras:** active-route highlighting, notification bell (derived from real existing APIs — no new backend table). **Out of scope:** scroll-aware shrink/hide, mega-menu.
> 4. **Token-ise inside the nav scope only** — every raw hex in the header/drawer/tab bar maps to a `globals.css` var. Pages outside the nav are untouched.

Target: every `frontend/src/pages/**` route. The bar is the only chrome the user touches on all 20 pages, and right now it is the least finished surface in the product.

---

## 1. Current navbar diagnosis (verified against the repo)

| # | Problem | Where (code) | Why it's wrong |
|---|---------|--------------|----------------|
| P1 | **Nav is dead on 8 of 12 pages.** Search / Leaderboard / Cart render as real buttons wired to `() => {}`. | `<Header cartCount={0} onOpenCart={() => {}} onOpenSearch={() => {}} onOpenLeaderboard={() => {}} />` at `account.tsx:323`, `campus.tsx:18`, `my-courses.tsx:75`, `study-plan.tsx:248`, `courses/index.tsx:261`, `courses/[slug].tsx:480`, `verify/index.tsx:50`, `verify/[serial].tsx:92` | A student on `/study-plan` taps Search and literally nothing happens. Reads as a broken product, not an unfinished feature. |
| P2 | **⌘K is a lie on 11 of 12 pages.** The `⌘K` hint chip is in the header everywhere; the keydown binding exists on one page. | hint chip `Header.tsx:103-105`; the only binding `pages/index.tsx:92-101` | The bar advertises a shortcut that silently does nothing outside `/`. |
| P3 | **No active-route state at all.** `NAV_LINKS` has no matcher, no `aria-current`, no active class. | `Header.tsx:16-23`, `78-82` | On a 20-page site the user cannot tell where they are. `useRouter` is imported at `Header.tsx:32` but used only for `router.push('/')` on logout. |
| P4 | **Two bars stack on top of each other.** Site header and the module-reader header are both `sticky top-0 z-40`, reader comes later in DOM so it paints over the nav. | `Header.tsx:70` vs `CompanyModuleReader.tsx:134` **and** `:199` | Opening any module on a company vault hides the entire site nav. |
| P5 | **Three more sub-headers slide under the nav** (all `sticky top-0` with z < 40). | `study-plan.tsx:255` (z-30), `CompareCompanyCards.tsx:44` (z-30), `CompareMatrixTable.tsx:150` (z-20) | The study-plan progress bar and the compare metric header become invisible after one scroll. |
| P6 | **Cart is per-page state — the badge is a lie across navigation.** | `pages/index.tsx:51`, `pages/compare.tsx:43`, `pages/company/[slug].tsx:76` — three independent `useState` arrays, never persisted | Add 3 rounds on a company page → click Vaults → badge is back to 0 and the cart is gone. The purchase funnel leaks at the first navigation. |
| P7 | **No sign-in CTA between 640px and 768px.** `Sign in` is `hidden md:inline-flex`; the hamburger is `md:hidden`, so a tablet-width logged-out visitor has no visible sign-in anywhere except inside the drawer. | `Header.tsx:209` vs `217` | The single highest-value conversion action is hidden for a whole breakpoint band. |
| P8 | **Nav config is duplicated and has already drifted.** | `Header.tsx:16-23` (6 items, no Pricing in footer) vs `Footer.tsx:56-65` (adds My Courses / Campus / Admin, **no Pricing**) | Two lists, two truths. Every future nav change needs two edits and a diff check. |
| P9 | **Two nav items share one icon** — `Study Plan` and `Pricing` both use `Tag`. | `Header.tsx:21-22` | The drawer shows the same glyph twice; `CalendarRange` on "Free Course" and `Tag` on "Study Plan" are both semantically wrong. |
| P10 | **Admin is a top-level chip *and* a dropdown item.** | `Header.tsx:86-96` and `171-179` | Duplicate. The chip is the only nav item hidden below `sm`, so it is invisible on phones anyway. |
| P11 | **Logo renders in a letterbox with an opaque matte.** `size` sets `style width/height` (100×65) but `max-h-10` (40px) overrides the height, so `object-contain` paints the mark at ~62px centred inside a 100px box — ~19px of dead space each side. The SVG's first path is a full-canvas `#FEFEFD` rect, so the header logo is an off-white box, glaring on `/interview-course` (`bg-slate-950`). | `TieEduLogo.tsx:14-23`; `public/logo.svg` path 1 of 1028; `interview-course.tsx:98` | The brand mark is visually small, off-centre, and opaque on a dark page. `showTagline` is destructured at `:6,:12` and never used — a vestigial prop on 5 call sites. |
| P12 | **Micro-typography below the portal floor.** Same bar carries 13px nav, 11px email, 10px cart badge, 10px role chip. | `Header.tsx:78` (13px), `161` (11px), `131` (10px), `163` (10px) | `COMPANY_PAGE_POLISH_PLAN.md` §4 bans `text-[9/10/11px]`. The nav is the most-read text on the site. |
| P13 | **Drawer has no focus trap, no `Escape`, no `aria-labelledby`; avatar menu has no `Escape` and children lack `role="menuitem"`.** | `Header.tsx:227-350` (drawer), `137-204` (menu); trigger declares `aria-haspopup="menu"` at `:142` but items are bare `<Link>` | Keyboard and screen-reader users can tab straight out of an open overlay into the page behind it. |
| P14 | **Nav colors are 3 different palettes at once** — `#3E4754`/`#10151C`/`#E9E7E1` (`--text-body`/`--text-heading`/`--border-subtle`), plus `#0284C7`/`#E8A33D`/`#0E2A44` (raw), plus `#1F3A5F`/`#EDEDEB`/`#FAFAF9` in the search modal. | `Header.tsx` throughout; `SearchModal.tsx:51,54-55,62,66`; `MASTER_SYSTEM_DESIGN_AND_SCALE_PLAN.md:105-107` names a third palette | Any brand-colour change is a find-and-replace across 40+ literals in the chrome. |

---

## 2. Target architecture

```
_app.tsx
└── <AuthProvider>                              (existing)
    ├── <TieEduLoader />                        (existing, z-[100])
    ├── <CartProvider>                          NEW  — items + count + open state, localStorage-persisted
    ├── <ShellProvider>                         NEW  — searchOpen / leaderboardOpen / notificationsOpen / drawerOpen + global ⌘K & Escape
    └── <AppShell>                              NEW  — the only place the chrome is mounted
        ├── <Header />                          REWRITE — desktop command bar, 64px
        ├── <Component {...pageProps} />        pages keep their own <main> + bg wrapper
        ├── <MobileTabBar />                    NEW  — 5 slots, fixed bottom, md:hidden
        └── <GlobalOverlays />  → createPortal(document.body)
            ├── <SearchModal />                 REWRITE — ⌘K command palette (grouped + arrow keys)
            ├── <LeaderboardModal />            keep, restyled
            ├── <CartModal />                   keep, now bound to CartProvider
            ├── <NotificationPanel />           NEW  — derived from /auth/me + /reports/mine + /courses/xp
            └── <MobileNavDrawer />             NEW  — replaces the inline portal block
```

**Route opt-out.** `AppShell` renders nothing for `/login`, `/signup`, `/admin`, `/admin/login` — those four own their own centred logo / CMS header today. The list lives in `navConfig.ts` as `SHELL_EXCLUDED_ROUTES` and is unit-tested, so adding an auth page later cannot accidentally get the site nav.

**Why no layout wrapper in `AppShell`.** Pages already own `min-h-screen flex flex-col` (`index.tsx:117`, `compare.tsx:138`, `study-plan.tsx:247`, `account.tsx:322`, `campus.tsx:17`, `company/[slug].tsx:156,327`). `AppShell` emits the header as a **sibling** above the page, exactly as it renders today, so `position: sticky` keeps working and no page needs its height model rewritten. `body { overflow-x: clip }` (`globals.css:90`) is not a scroll container, so sticky and `position: fixed` are both unaffected.

---

## 3. File map

### NEW
| Path | Purpose |
|------|---------|
| `frontend/src/lib/navConfig.ts` | `NAV_GROUPS`, `NAV_ITEMS`, `PRIMARY_NAV`, `resolveNavGroups(role)`, `isNavActive(pathname, href)`, `SHELL_EXCLUDED_ROUTES`, `MOBILE_TABS`. Pure, no React. |
| `frontend/scripts/nav-config.test.ts` | Unit suite for the above (active matching, href↔page existence, exclusion list). |
| `frontend/src/lib/cn.ts` | `clsx` + `twMerge` wrapper — both are already dependencies (`package.json:24,27`) and neither is used anywhere yet. |
| `frontend/src/context/CartContext.tsx` | `items`, `addItem`, `removeItem`, `clear`, `count`, `isOpen`/`open`/`close`, `scope` (page-registered company context). |
| `frontend/src/context/ShellContext.tsx` | Overlay booleans + the single global `⌘K` / `Escape` listener. |
| `frontend/src/components/layout/AppShell.tsx` | Mounts header + tab bar + overlays; applies `SHELL_EXCLUDED_ROUTES`. |
| `frontend/src/components/layout/MobileNavDrawer.tsx` | The drawer, extracted and rebuilt. |
| `frontend/src/components/layout/MobileTabBar.tsx` | 5-slot bottom bar. |
| `frontend/src/components/layout/NotificationBell.tsx` | Trigger + unread dot. |
| `frontend/src/components/layout/NotificationPanel.tsx` | The dropdown list. |
| `frontend/src/lib/notifications.ts` | Pure derivation of notification items from account/reports/xp payloads + read-cursor logic. |
| `frontend/scripts/notifications.test.ts` | Unit suite for the derivation. |

### REWRITE
| Path | Change |
|------|--------|
| `frontend/src/components/layout/Header.tsx` | 353 lines → ~150. Desktop command bar only. No drawer, no portal, no modal wiring, no props. |
| `frontend/src/components/modals/SearchModal.tsx` | 118 lines → ~230. Substring filter → grouped command palette with arrow-key navigation and page actions. |
| `frontend/src/components/common/TieEduLogo.tsx` | 27 lines → ~30. Fix letterbox, drop the dead `showTagline` prop, add `viewBox` to the SVG. |
| `frontend/src/pages/_app.tsx` | 34 lines → ~50. Wrap in providers, mount `AppShell`. |

### EDIT
| Path | Change |
|------|--------|
| `frontend/src/pages/{index,compare,interview-course,account,campus,my-courses,study-plan}.tsx` | Delete the `<Header …>` block and its now-unused props/state. |
| `frontend/src/pages/{courses/index,courses/[slug],verify/index,verify/[serial],company/[slug]}.tsx` | Same, plus move cart state to `useCart()`. |
| `frontend/src/components/layout/Footer.tsx` | Import `NAV_ITEMS` instead of the hardcoded list; keep the admin-only Campus link. |
| `frontend/src/components/company/CompanyModuleReader.tsx` | `:134`, `:199` → `top-[var(--header-h)] z-30`; `:253` `md:top-24` → `md:top-[calc(var(--header-h)+1.5rem)]`. |
| `frontend/src/components/compare/CompareCompanyCards.tsx` | `:44` → `top-[var(--header-h)] z-30`. |
| `frontend/src/components/compare/CompareMatrixTable.tsx` | `:150` → `top-[var(--header-h)] z-20`. |
| `frontend/src/pages/study-plan.tsx` | `:255` → `top-[var(--header-h)] z-30`. |
| `frontend/src/styles/globals.css` | New vars in `:root` + a nav component layer (see §12). |

### DELETE
None. Every file above is reused. `TieEduLogo`'s `showTagline` prop is removed from 5 call sites, not the component.

---

## 4. Part A — Nav data layer

### 4.1 NEW `frontend/src/lib/navConfig.ts`

```ts
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Pages under this prefix also count as "here". */
  match?: 'exact' | 'prefix';
  description: string;      // drawer subtitle + palette secondary line
  badge?: 'free';           // the acquisition hook gets a chip, not a louder colour
  primary: boolean;         // appears in the desktop bar
  adminOnly?: boolean;
}

/** Drawer grouping. Desktop renders PRIMARY_NAV flat, in this order. */
export const NAV_GROUPS = [
  { id: 'explore',  label: 'Explore',      items: ['vaults', 'compare', 'courses', 'free-course'] },
  { id: 'plan',     label: 'Plan & learn', items: ['study-plan', 'my-courses'] },
] as const;

export const NAV_ITEMS: Record<string, NavItem> = { … };
export const PRIMARY_NAV: NavItem[];               // desktop bar order
export const SHELL_EXCLUDED_ROUTES: string[];      // ['/login','/signup','/admin']
export const MOBILE_TABS: (NavItem | { action: 'search' | 'cart' })[];

/** `/#pricing` is a hash, never a route — it can never be the active page. */
export const isNavActive = (pathname: string, href: string): boolean => { … };

/** `isNavActive` + role filter, grouped for the drawer. */
export const resolveNavGroups = (role: 'user' | 'admin' | null): NavGroup[] => { … };
```

Rules encoded in the data, not in the markup:
- Every `href` has a real page behind it — `vaults '/'`, `compare '/compare'`, `courses '/courses'`, `free-course '/interview-course'`, `study-plan '/study-plan'`, `my-courses '/my-courses'`, `account '/account'`, `campus '/campus'`, `admin '/admin'`, `pricing '/#pricing'`. All verified to exist under `frontend/src/pages/`.
- `campus` and `admin` are `adminOnly: true` — one flag replaces the hand-rolled `isAdmin &&` in three places.
- Distinct icons: `LayoutGrid` vaults, `GraduationCap` compare, `BookOpen` courses, `Sparkles` free-course, `CalendarCheck` study-plan, `Award` my-courses, `UserRound` account, `Building2` campus, `ShieldCheck` admin, `IndianRupee` pricing. **Fixes P9.**
- `free-course` carries `badge: 'free'`; the only amber-free signal in the nav.

### 4.2 NEW `frontend/scripts/nav-config.test.ts`

The repo already runs pure-function suites through `scripts/run-tests.mjs` (tsc-compiled, node-executed, alias-rewritten) — `catalog-state.test.ts` is the model. Cases:

- `isNavActive('/courses', '/courses')` → true; `isNavActive('/courses/python', '/courses')` → true; `isNavActive('/coursesxyz', '/courses')` → **false** (prefix match must respect segment boundaries, not `startsWith`).
- `isNavActive('/', '/')` → true; `isNavActive('/compare', '/')` → false.
- `isNavActive('/anything', '/#pricing')` → **always false** (hash is not a route).
- Trailing slash and query string are stripped before matching: `'/courses/?page=2'` → true.
- `resolveNavGroups('user')` contains no `adminOnly` item; `resolveNavGroups('admin')` does.
- **Every `NAV_ITEMS[*].href` maps to a file that exists** under `src/pages/` (anchors excepted). This is the test that stops P8 from ever recurring.
- `SHELL_EXCLUDED_ROUTES` actually contains `/login`, `/signup`, `/admin`.
- No duplicate `href` across `NAV_ITEMS`; `PRIMARY_NAV` length ≥ 5.

---

## 5. Part B — Providers + `_app.tsx` lift (kills P1, P2, P6, P7)

### 5.1 NEW `frontend/src/context/CartContext.tsx`

```ts
interface CartContextValue {
  items: CartItem[];
  count: number;
  add: (item: CartItem) => void;
  remove: (index: number) => void;
  clear: () => void;
  isOpen: boolean; open(): void; close(): void;
  /** Page-registered context for the drawer (company name, missing rounds, cross-sell). */
  scope: CartScope;
  setScope(scope: CartScope): void;
}
```

- Persist `items` to `localStorage['tieedu_cart_v1']` on change, hydrate on mount. Safe because **the server is authoritative** — `createOrderApi` recomputes every line with its own `packPrice()` (`packPricing.ts:4-12` says so explicitly). Persisting is a display/UX concern only; it cannot change what a student is charged.
- `add` de-dupes on `kind:id:module_id` so the compare page's guard (`compare.tsx:106`) becomes a provider invariant instead of page-local.
- `setScope` is how `company/[slug].tsx` supplies `companyName` / `missingModules` / `onAddCompletePack` / `suggestedCompanies` to the single globally-mounted `CartModal` — one modal, no double-mount, no prop explosion.
- `courses/[slug].tsx:784-797` keeps its own `CartModal` **only** if it cannot express itself through `scope`; otherwise it drops it and lets the global one render. Prefer the latter.

### 5.2 NEW `frontend/src/context/ShellContext.tsx`

One `keydown` listener for the whole app: `⌘K`/`Ctrl+K` toggles search, `Escape` closes the topmost overlay (drawer → notifications → user menu → search → leaderboard → cart). Deletes the per-page binding at `index.tsx:92-101` and the per-modal one at `SearchModal.tsx:30-38`. **Fixes P2.**

### 5.3 NEW `frontend/src/components/layout/AppShell.tsx`

```tsx
const excluded = SHELL_EXCLUDED_ROUTES.some(p => router.pathname === p || router.pathname.startsWith(`${p}/`));
if (excluded) return <>{children}</>;
return (<>
  <Header />
  {children}
  <MobileTabBar />
  <GlobalOverlays />   {/* all createPortal(document.body) */}
</>);
```

`CartModal` and `SearchModal` stay `dynamic(..., { ssr: false })` (as `compare.tsx:22` already does) so neither enters the initial bundle.

### 5.4 EDIT `frontend/src/pages/_app.tsx`

```
<AuthProvider><CartProvider><ShellProvider><AppShell>
  <TieEduLoader />
  <Component {...pageProps} />
</AppShell></ShellProvider></CartProvider></AuthProvider>
```

The existing `routeChangeComplete` scroll-to-top (`_app.tsx:19-26`) is untouched.

### 5.5 Page edits

For each of the 12 pages: delete the `<Header … />` element, its import, and every prop/callback it existed only to feed (`onOpenCart`, `onOpenSearch`, `onOpenLeaderboard`, `isCartOpen`, `isSearchOpen`, `isLeaderboardOpen`, and the `CartModal`/`SearchModal`/`LeaderboardModal` mounts on `index.tsx:310-326`, `compare.tsx:347-356`, `company/[slug].tsx:700-723`, `interview-course.tsx:540`, `courses/[slug].tsx:785`). Replace `const [cartItems, setCartItems] = useState(…)` with `const { items, add, remove, clear } = useCart()` on the three pages that had it. **Fixes P1.**

---

## 6. Part C — Desktop header (≥1024px)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  [TieEdu] │ Vaults  Compare  Courses  Free·FREE  Study Plan        ⌕ Search vaults ⌘K  │
│           │  ▲ active = sky-soft pill + 2px sky underline            🔥  🔔  🛒²  (KM) ▾│
└──────────────────────────────────────────────────────────────────────────────────────┘
   64px · glass-surface · max-w-[1700px] · px-3 sm:px-8 lg:px-12
```

### 6.1 Left cluster
- Logo at `h-8 w-auto` (letterbox fixed — §10), then a `1px` `var(--border-subtle)` vertical divider at `mx-5`, then nav. The divider is what makes the bar read as two zones instead of a row of loose words.
- Nav items: `text-sm font-semibold text-[var(--text-body)]`, `px-3.5 py-2 rounded-lg`, hover `bg-[var(--bg-surface-hover)]`.
- **Active:** `bg-[var(--brand-sky-soft)] text-[var(--brand-sky)]` + a `2px` `var(--brand-sky)` bar on the bottom edge, plus `aria-current="page"`. One treatment, not two competing ones.
- `Free Course` gets a `FREE` micro-badge — `text-[10px]` is banned, so this is `text-xs font-bold` in a `bg-emerald-50 text-emerald-700` pill, or 11px is simply not used. Emerald, not amber — amber is reserved for money (cart badge, leaderboard).
- **Admin chip removed from the top level** (P10). It already exists in the avatar menu at `Header.tsx:171-179`; the drawer keeps a `campus` entry. One admin entry, in the place a signed-in admin looks for it.

### 6.2 Right cluster — order is deliberate
`⌕ Search` → `🔥 Leaderboard` → `🔔 Notifications` → `🛒 Cart` → `Avatar`.

- **Search** is a real search field, not a button: `w-56` idle → `w-80` on hover/focus, `Search` icon + placeholder "Search vaults…" + `<kbd>⌘K</kbd>`. Widening on focus (not on hover alone) is the pattern that reads as "field" to keyboard users.
- **Leaderboard** keeps its flame but drops the word at `<1280px` (icon-only, `title` + `aria-label` retained). Amber `--brand-accent`, hover `--color-warning`.
- **Notifications** only when `user` is set (see §8).
- **Cart** icon + amber badge. Badge `text-xs` (was `text-[10px]`), `min-w-5 h-5`, `bg-[var(--brand-accent)] text-[var(--accent-ink)]`, `.stat-num`.
- **Avatar** `w-8 h-8 rounded-lg`, name `hidden lg:block text-sm font-bold max-w-[120px] truncate`, `ChevronDown` rotates. Menu gains `Escape`, `role="menuitem"` on children, and an XP line (the data exists — `AuthUser.xp` at `lib/auth.ts:11`) instead of the dead 10px role chip.
- **Sign in** is `btn btn-primary text-sm`, visible from `sm` up — **not** `md`. **Fixes P7.**

### 6.3 Tokens
Every colour in this section is a `var(--…)`. See §12 for the full mapping.

---

## 7. Part D — Mobile UI (the part that needs the most work)

### 7.1 Top bar (<768px), 56px
`[TieEdu]  ·  [⌕]  [🛒²]` + a 44px hamburger at the right.
- `Sign in` is **not** here — at 390px there is no room for it, and a 44px avatar is a worse target than a 44px hamburger. Auth lives in the drawer (below).
- The hamburger is the **only** right-edge control cluster; search and cart also appear as tab-bar slots, but keeping them in the top bar is what lets a user reach them without scrolling to the bottom of a long company page.

### 7.2 Bottom tab bar — NEW `<MobileTabBar />`

```
┌──────────────────────────────────┐
│  ▦        ▤        ▦        ⌕    🛒²│
│ Vaults  Courses  Study   Search Cart│
│           Plan                  │
└──────────────────────────────────┘
   fixed bottom-0, md:hidden, z-40
   h-14 + env(safe-area-inset-bottom)
   bg white/85 + backdrop-blur + hairline top border
```

- 5 slots: `Vaults · Courses · Study Plan · Search · Cart`. Compare / Free Course / My Courses / Account / Admin stay in the drawer — cramming them in makes every target un-tappable.
- Each slot: `min-h-[56px]`, icon `20px`, label `text-xs font-semibold`. **Active** = `--brand-sky` icon + label + a `2px` sky bar on the **top** edge of the slot. Actions (Search/Cart) open overlays instead of navigating; they still show an active state while their overlay is open.
- The cart badge moves onto the tab icon so the count is visible without scrolling back up.
- Bottom padding via `env(safe-area-inset-bottom)` so the bar clears the iPhone home indicator. `globals.css:607-609` already has `.safe-bottom` — the bar extends it to the top edge too.
- **`z-40`, and every page-level sticky bar must clear it.** Only `MobileTabBar` itself and the drawer sit above; `AppShell` adds `pb-20 md:pb-0` to nothing (pages own their layout) — instead the bar is `pointer-events-none` on its container with `pointer-events-auto` on the slots, so it never eats a tap meant for content underneath near the edges.
- Pages that render their own bottom-fixed CTAs must be audited: `company/[slug].tsx:674-692` (the sticky unlock bar) and `courses/index.tsx` (`pb-28` on `main`) already reserve bottom space; `courses/[slug].tsx` and `account.tsx` need a check.

### 7.3 Drawer — NEW `<MobileNavDrawer />` (replaces `Header.tsx:226-350`)

```
┌──────────────────────────────┐
│ [TieEdu]                 ✕  │  ← drag handle, 56px
├──────────────────────────────┤
│ (KM)  Karan Mehra           │  ← identity card (signed in)
│       karan@college.edu     │
│       [PLATFORM ADMIN]      │
├──────────────────────────────┤
│ EXPLORE                      │
│  ▦  Vaults                   │  ← 48px rows
│  ⌂  Compare                  │
│  ▤  Courses                  │
│  ✨ Free Course        FREE  │
│                              │
│ PLAN & LEARN                 │
│  ▦  Study Plan               │
│  ◎  My Courses               │
├──────────────────────────────┤
│  ⌕  Search vaults            │  ← actions
│  🔥 Leaderboard              │
│  🛒 Cart                 2   │
├──────────────────────────────┤
│  👤 My account               │
│  🛡 Admin console            │  ← role-gated
│  ⌂  Sign out                 │
└──────────────────────────────┘
```

- Width `w-[86%] max-w-[360px]`, `animate-slide-in-right` (already in `globals.css:716-720`, already exempted from `prefers-reduced-motion`).
- **Every row ≥ 48px tall**, label `text-[15px] font-semibold`, `description` line `text-[13px] text-[var(--text-muted)]` where the item has one. This is the single biggest legibility win over the current 44px / no-description rows (`Header.tsx:249`).
- **Active row:** `--brand-sky-soft` fill, `3px` left sky bar, `aria-current="page"`.
- Group headers: `text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]` — `text-xs`, not `text-[10px]`.
- **Signed out:** the action row is followed by a full-width `btn btn-primary` **"Sign in"** plus a `btn btn-ghost` **"Create free account"**, both 48px, pinned to the bottom of the scroll area (not the panel footer) so a short screen still shows them.
- **Accessibility (fixes P13):** `role="dialog" aria-modal="true" aria-labelledby={titleId}`, focus moves to the close button on open, `Tab` is trapped inside, `Escape` closes and **returns focus to the hamburger**, `document.body.style.overflow='hidden'` (existing pattern, `Header.tsx:50-53`) with a guaranteed restore on unmount, `overscroll-contain` on the scroll area so an over-scroll doesn't chain to the page behind.
- **Swipe-to-close:** pointerdown/move/up on the header strip; translateX follows the finger, release past `35%` width or `>0.6 px/ms` velocity closes. `setPointerCapture` so a fast flick that leaves the element still tracks. All inside a `prefers-reduced-motion` guard — no transform animation, just open/closed.

---

## 8. Part E — Active-route highlighting

`isNavActive(pathname, href)` in `navConfig.ts` (tested in §4.2):

```ts
const [path, hash] = href.split('#');
if (hash) return false;                       // '/#pricing' is a jump, not a page
const clean = (p: string) => p.replace(/\/+$/, '') || '/';
const target = clean(path);
const current = clean(pathname);
if (item.match === 'exact') return current === target;
return current === target || current.startsWith(`${target}/`);
```

- Segment-boundary `startsWith` is the whole point — `/coursesxyz` must not light up "Courses".
- Consumed by desktop nav, drawer rows and tab slots from the same `useRouter().pathname`, so the three surfaces can never disagree.
- `aria-current="page"` on the active link in all three.
- **Pricing** gets no active state by design; the palette and drawer can still open it. Keep the `/#pricing` jump (target exists at `PricingSection.tsx:72`) and scroll it into view after navigation rather than leaving Next to land at the top of `/`.

---

## 9. Part F — Notification bell

**No backend table is added.** Every notification is derived from payloads the API already returns, so the bell can only ever say something true:

| Source (already exists) | Condition | Notification |
|---|---|---|
| `GET /auth/me` → `orders[]` (`auth.routes.ts:103-110`) | `status === 'awaiting_verification'` | "Payment awaiting verification" · tone `warning` |
| same | `status === 'paid'` | "Vault unlocked — {items}" · tone `success` |
| same | `status === 'rejected' \| 'failed'` | "Payment could not be verified" · tone `error` |
| `GET /reports/mine` (`reports.routes.ts:28-33`) | `status === 'pending_review'` | "Your {company} report is under moderation" |
| same | `status === 'published'` | "Report published — +50 XP awarded" · tone `success` |
| same | `status === 'rejected'` | "Report not approved — edit and resubmit" · tone `error` |
| `GET /courses/xp` history | a new `id` since the cursor | "You earned {xp} XP in {course}" |

- `frontend/src/lib/notifications.ts` exports `deriveNotifications({ account, reports, xp }): Notification[]`, sorted newest-first, each with a stable `id` (e.g. `order:<id>`, `report:<id>`, `xp:<id>`) and a `href`.
- **Read state** = a localStorage cursor `tieedu_notifications_v1` holding the highest `created_at` seen. Unread = `created_at > cursor`. "Mark all read" writes `now`. Honest trade-off, called out in §16: read state is per-device, not per-account. The follow-up (a real `notifications` collection with a `read_at`) is out of scope.
- Fetch on mount, on `routeChangeComplete` (throttled to 1/30s), and on `visibilitychange` → visible. **No polling interval and no fetch while the tab is hidden.**
- **Never render an empty list as a fake count.** Zero derived notifications → no dot, and the panel shows the honest empty state ("Nothing new — payments and report reviews will show up here").
- All three sources fail → the panel shows an error row, not a silent zero.
- Tones reuse the existing status tokens: `--color-success` / `--color-warning` / `--color-error` / `--color-info`. A left `3px` tone bar on each row, not a coloured background wash.

---

## 10. Part G — ⌘K command palette (`SearchModal.tsx`)

The shortcut is global the moment `ShellProvider` exists, so the surface has to earn it. Current version is a 3-field substring filter with no keyboard navigation (`SearchModal.tsx:43-47, 83-111`) and off-theme colours (`:51, 54-55, 62, 66`).

New behaviour, all grouped, all keyboard-first:
- Empty query → **Actions** group: Search vaults, Open leaderboard, Open cart, Go to Study Plan, Go to Free Course, (admin) Open admin console. Then **Recent** (last 5, localStorage `tieedu_recent_searches`).
- Non-empty query → **Vaults** group (existing `BrandTile` rows, now `text-sm` + `text-xs`, `--text-heading`/`--border-subtle` tokens) and, if the string matches a nav label or alias, a **Navigate** group on top.
- `↑`/`↓` move, `Enter` runs, `Esc` closes, `Tab` cycles. `aria-activedescendant` on the input, `role="listbox"`/`option` on the rows — a combobox, not a div soup.
- Rows ≥ 44px, `role="option"`, active row `--brand-sky-soft` + `aria-selected`.
- Panel `max-w-2xl`, `max-h-[70vh]`, results `overflow-y-auto overscroll-contain`.
- Keep the `useEffect` that self-fetches companies when no `companies` prop is given (`SearchModal.tsx:18-28`) — the global mount has no props, so that path becomes the only path. Cache the list in a module-level promise so reopening is instant.
- Alias map so "dSA", "plan", "price", "compare companies" all land somewhere sensible.

---

## 11. Part H — Sticky offsets & z-index (fixes P4, P5)

New tokens in `:root`:
```css
--header-h: 64px;
--header-h-sm: 56px;
--tabbar-h: 56px;
```

| Element | Now | After |
|---|---|---|
| `Header.tsx:70` | `sticky top-0 z-40` | `sticky top-0 z-40 h-[var(--header-h)] sm:h-[var(--header-h-sm)]` |
| `CompanyModuleReader.tsx:134, :199` | `sticky top-0 z-40` | `sticky top-[var(--header-h)] z-30` |
| `CompanyModuleReader.tsx:253` | `md:sticky md:top-24` | `md:top-[calc(var(--header-h)+1.5rem)]` |
| `study-plan.tsx:255` | `lg:hidden sticky top-0 z-30` | `… sticky top-[var(--header-h)] z-30 lg:hidden` |
| `CompareCompanyCards.tsx:44` | `sticky top-0 z-30` | `sticky top-[var(--header-h)] z-30` |
| `CompareMatrixTable.tsx:150` | `sticky top-0 z-20` | `sticky top-[var(--header-h)] z-20` |
| `MobileTabBar` (new) | — | `fixed bottom-0 z-40 md:hidden` |
| Drawer / bell / modals (new) | — | `z-50` (portal) |
| `TieEduLoader.tsx:53` | `z-[100]` | unchanged — route bar must stay on top |

Header height is 64px desktop / **56px mobile** (down from a flat `h-16` at `Header.tsx:71`); 56px is the correct thumb-bar height and buys ~40px of vertical space on a phone.

---

## 12. Part I — Token consolidation (nav scope only)

New vars in `globals.css:10-62`:

```css
/* Chrome geometry */
--header-h: 64px;  --header-h-sm: 56px;  --tabbar-h: 56px;
/* Amber text-on-fill and amber-on-white had no token but were used raw */
--accent-ink: #241A06;      /* text on --brand-accent fill (cart badge, drawer badge) */
--amber-deep: #B45309;      /* amber text on white (leaderboard hover, badges) */
```

Nav-scope mapping — every literal below disappears from the chrome:

| Raw literal in the nav | Token |
|---|---|
| `#10151C` | `var(--text-heading)` |
| `#3E4754` | `var(--text-body)` |
| `#5A6470` | `var(--text-muted)` |
| `#E9E7E1` | `var(--border-subtle)` |
| `#D6D2C8` | `var(--border-strong)` |
| `#F3F2EE` | `var(--bg-surface-hover)` |
| `#E8F4FB` | `var(--brand-sky-soft)` |
| `#0284C7` / `#0271B5` | `var(--color-info)` / `var(--brand-sky)` |
| `#0E2A44` | `var(--brand-ink)` |
| `#E8A33D` | `var(--brand-accent)` |
| `#D4902C` | `var(--brand-accent-hover)` |
| `#C77B12` | `var(--color-warning)` |
| `#C1442D` | `var(--color-error)` |
| `#241A06`, `#B45309` | `var(--accent-ink)`, `var(--amber-deep)` **(new)** |
| `#EDEDEB`, `#FAFAF9` (from `SearchModal`) | `var(--border-subtle)`, `var(--bg-app-warm)` |

New component classes (nav layer only, appended after the existing `.chip` at `globals.css:168-180`):

```css
.nav-link        /* base pill, active + hover states, aria-current variant */
.icon-btn        /* 40×40 control, 44×44 on touch, focus-ring baked in */
.tab-slot        /* bottom-bar slot + active top-bar treatment */
.chrome-badge    /* cart/notification count, text-xs, min-w-5 h-5, .stat-num */
```

Pages outside the nav keep their current hexes — this pass is contained on purpose.

---

## 13. Part J — Logo fix (P11)

1. `public/logo.svg` — add `viewBox="0 0 2590 1664"` (it has `width`/`height` but no `viewBox`, so intrinsic-ratio maths is guesswork) and **delete path #1**, the full-canvas `fill="#FEFEFD"` rect that traces back to a raster matte. That is the only `#FEFEFD` in the file. Verify visually after the edit: VTracer can bake near-white into glyph fills, and if the mark goes patchy the fix is to re-trace against a transparent source rather than to restore the box.
2. `TieEduLogo.tsx` — replace the `style={{width, height}}` + `max-h-10` combination (which letterboxes) with `className="h-8 sm:h-9 w-auto"` and drop the inline sizing. `size` prop becomes `'sm' | 'md' | 'lg'` → `h-6 / h-8 / h-12`.
3. **Delete the `showTagline` prop** (destructured at `:6,:12`, never read) and drop it from all 5 call sites: `Header.tsx:75`, `Header.tsx:232`, `Footer.tsx:52`, `login.tsx:49`, `signup.tsx:52`. The traced lockup already bakes the tagline in (2590×1664 ≈ 1.556 aspect, matching the 100×65 box), so the prop was always a no-op.
4. `loading="eager"` + `decoding="async"` — it is the first paint of a `position: sticky` bar, so it should not be lazy.

---

## 14. Part K — Accessibility & keyboard contract

- Landmarks: `<header>` (implicit `banner`), desktop `<nav aria-label="Primary">`, drawer `<nav aria-label="Mobile">`, tab bar `<nav aria-label="Quick">`. None of these exist today (`Header.tsx:78` is a bare `<nav>`).
- Every interactive target ≥ `40×40` on pointer, ≥ `48×48` on touch (drawer rows, tab slots).
- `.focus-ring` (`globals.css:240-243`) on every new control; `:focus-visible` only, so a mouse click never paints a ring.
- `⌘K` (and `Ctrl+K` on non-Mac — detect via `e.metaKey || e.ctrlKey`, matching `index.tsx:94`).
- Drawer: focus trap, `Escape`, focus restore to the trigger, `aria-modal="true"`, labelled by its title.
- User menu: `aria-haspopup="menu"` + `aria-expanded` + `role="menuitem"` on children (`Header.tsx:142` declares the first two; the third is missing).
- Notifications: `aria-haspopup="dialog"`, `aria-label="Notifications, N unread"`, `aria-expanded`; dot is `aria-hidden` with the count in the label.
- Cart badge: `aria-label={`Cart, ${count} items`}` — the number is visual, the state is spoken.
- Palette: combobox pattern — `role="combobox" aria-expanded aria-controls aria-activedescendant` on the input.
- Contrast: `--text-muted` `#5A6470` on `#FFFFFF` = 5.9:1 ✅; `--text-light` `#AEB6BE` is **not** used for any nav text.
- All new motion sits inside the existing `prefers-reduced-motion` blanket (`globals.css:672-689`); add the new class names to the named list at `:642-647` so the first, more specific rule agrees.

---

## 15. Typography rules for the nav

- Nav link **14px** (`text-sm`) — up from 13px.
- Drawer row label **15px**, description **13px** muted.
- Tab slot label **12px** (`text-xs`), icon 20px.
- Group headers **12px** bold uppercase, `tracking-widest`.
- Email / secondary meta **13px** — up from 11px.
- Badges **12px** (`text-xs`) — up from 10px.
- **`text-[9px]`, `text-[10px]`, `text-[11px]` are banned** in the chrome, per `COMPANY_PAGE_POLISH_PLAN.md` §4.
- Calibre/Carlito stack throughout (`tailwind.config.js:19` + `globals.css:84`). No `font-mono` in the nav — the leaderboard rows at `LeaderboardModal.tsx:170` are the only mono left in the chrome and they go too.

---

## 16. Out of scope (this pass)

- Scroll-aware header shrink/hide — rejected for now: it fights the five sticky sub-headers in §11 and adds a scroll listener on every page for a modest gain.
- Mega-menu for Courses / Vaults — 6 links do not justify one.
- A real `notifications` collection with server-side `read_at`. §9 ships a per-device cursor instead.
- Token-ising the ~40 other hex literals across pages, `CartModal`, `SearchModal`'s siblings, and the admin CMS. §12 is nav-scoped on purpose.
- Replacing `public/logo.svg` (438 KB, 1028 paths) with an optimised asset or an inline React SVG. §13 fixes the rendering; the byte weight is a separate task.
- Any change to pricing, cart maths, unlocks, or XP. `packPricing.ts` and `backend/src/lib/pricing.ts` are untouched.
- `CompanyModuleReader`'s own layout, and the compare matrix's sticky-column widths.

---

## 17. Risks

| Risk | Mitigation |
|---|---|
| Lifting the header out of 12 pages breaks a layout that assumed it was in-flow | `AppShell` emits the header as a **sibling** above the page — identical DOM position to today, so `sticky` and `min-h-screen` are unchanged. No page's height model is rewritten. |
| A global `CartModal` collides with `courses/[slug].tsx:785`'s local one | Resolve through `CartContext.scope`; only one `CartModal` exists in the tree. The test suite and a manual pass on `/courses/:slug` confirm. |
| Persisting the cart shows a stale total after a server price change | The server recomputes on `create-order` and ignores the client payload (`packPricing.ts:4-12`). The drawer also re-derives from `summarizePackItems` on every open. Nothing is charged from local state. |
| Deleting path #1 from `logo.svg` degrades the mark | That path is the only `#FEFEFD` in the file and is a full-canvas rect. Visual check on light and dark pages immediately after; revert is a one-line restore. |
| `isNavActive` prefix matching over-highlights | Covered by the `'/coursesxyz' → false` case in `nav-config.test.ts`. |
| Notification derivation is wrong about an order state | Every branch maps a literal `status` the server already writes (`checkout.routes.ts:328, 368, 397`, `admin.routes.ts:846`, `webhooks.routes.ts:55`, `reports.routes.ts:83`). Unknown status → no notification, never a guess. |
| Bottom tab bar covers existing bottom-fixed CTAs | Audited: `company/[slug].tsx:674-692` and `courses/index.tsx` (`pb-28`) already reserve space. `courses/[slug].tsx` and `account.tsx` get an explicit bottom-pad check in QA. |
| Portal + `backdrop-filter` stacking quirk truncates the drawer | The existing comment at `Header.tsx:226` documents why the drawer is portalled; the new drawer keeps `createPortal(document.body)` and the bar keeps the same treatment. |

---

## 18. Verification

**Static**
- `npx tsc --noEmit` (frontend) — clean.
- `npm run lint` — clean.
- `npm run test` — `nav-config` and `notifications` suites green alongside the 6 existing ones.
- `npm run build` — clean across all routes: `/`, `/compare`, `/interview-course`, `/study-plan`, `/my-courses`, `/account`, `/campus`, `/courses`, `/courses/[slug]`, `/company/[slug]`, `/verify`, `/verify/[serial]`, `/login`, `/signup`, `/admin/login`, `/admin`.

**Manual QA at 390px (iPhone-class), 768px (tablet), 1440px (desktop)**

*Function*
1. `⌘K` opens the palette on **all 16 routes**; `↑ ↓ Enter Esc` work; a group action navigates; Escape returns focus to the trigger.
2. Cart icon on `/study-plan`, `/account`, `/my-courses`, `/campus`, `/courses`, `/verify` opens a real drawer (P1). Add a round on `/company/razorpay`, navigate to `/` — the badge and the items are still there (P6).
3. The current page's nav item is highlighted on desktop, in the drawer, and in the tab bar, and carries `aria-current="page"` (P3). `/courses/python-basics` highlights **Courses**, not **Vaults**. `/coursesxyz` (typed by hand) highlights nothing.
4. Tab through the whole page with the drawer open — focus never escapes it; Escape closes it and focus lands back on the hamburger (P13).
5. A logged-out visitor at 700px width sees a **Sign in** button without opening anything (P7).
6. `/login`, `/signup`, `/admin/login`, `/admin` render with **no** site header.
7. Add a round → the checkout total matches the server's `packPrice()` for the same set.

*Sticky / stacking*
8. Open a module on `/company/palo-alto-networks` — **both** the site header and the reader bar are visible and stacked, not overlapping (P4).
9. Scroll `/study-plan` — the progress bar pins directly under the header (P5). Same for `/compare`.
10. Scroll any page to the bottom on a 390px viewport — the tab bar does not cover the last card, and no page-fixed CTA sits under it.

*Visual*
11. Header at 390 / 768 / 1440 — no clipped text, no overlap, no horizontal scrollbar (`body { overflow-x: clip }` at `globals.css:90` is unchanged).
12. The logo has **no off-white box** behind it, is optically centred, and reads correctly on `/interview-course` (`bg-slate-950`).
13. `grep -nE "text-\[(9|10|11)px\]" frontend/src/components/layout frontend/src/context` returns **nothing** (P12).
14. `grep -nE "#(10151C|3E4754|E9E7E1|0284C7|E8A33D|0E2A44)" frontend/src/components/layout frontend/src/components/modals/SearchModal.tsx` returns **nothing** (P14).
15. Toggle OS "reduce motion" — the drawer and tab bar still open and close, instantly.
16. Notification bell: sign in, submit a report, approve it in admin, revisit → "Report published — +50 XP", dot appears, tapping clears it, reload does not resurrect it.
17. DevTools → axe/Lighthouse: no `aria-*` violations, all text ≥ 4.5:1, all tab slots ≥ 48×48.

---

## 19. Step order

**A. Foundations (no visual change yet)**
1. NEW `lib/cn.ts`.
2. NEW `lib/navConfig.ts` + NEW `scripts/nav-config.test.ts`. Run `npm run test`.
3. Add `--header-h` / `--header-h-sm` / `--tabbar-h` / `--accent-ink` / `--amber-deep` + the `.nav-link` / `.icon-btn` / `.tab-slot` / `.chrome-badge` classes to `globals.css`.

**B. Data + state**
4. NEW `context/CartContext.tsx` (items, localStorage, `scope`).
5. NEW `context/ShellContext.tsx` (overlay flags + global `⌘K`/`Escape`).
6. NEW `lib/notifications.ts` + NEW `scripts/notifications.test.ts`.
7. EDIT `_app.tsx` — providers mounted; `AppShell` renders a bare `<Header />` with the old markup. **Nothing else changes yet; this is the step that makes 12 pages double-render the header, so verify immediately and then continue in the same pass.**

**C. The lift (P1, P2, P6, P7)**
8. NEW `layout/AppShell.tsx` with `SHELL_EXCLUDED_ROUTES` + `GlobalOverlays`.
9. Strip `<Header />` + the three modal mounts + dead state from all 12 pages; move cart state to `useCart()` on `index` / `compare` / `company/[slug]`.
10. **Checkpoint:** `tsc` + `build` + walk all 16 routes. Search/Cart/Leaderboard must now work everywhere.

**D. Stacking (P4, P5)**
11. Apply the `top-[var(--header-h)]` offsets from §11 to the reader, study-plan, and both compare files.
12. **Checkpoint:** manual test 8 and 9.

**E. Chrome rewrite**
13. REWRITE `Header.tsx` (desktop only, no portal, no props) against `NAV_ITEMS` + `isNavActive`.
14. REWRITE `TieEduLogo.tsx`; patch `logo.svg`; drop `showTagline` from 5 call sites.
15. NEW `MobileNavDrawer.tsx`; NEW `MobileTabBar.tsx`; NEW `NotificationBell.tsx` + `NotificationPanel.tsx`.
16. **Checkpoint:** tests 11-15.

**F. Palette**
17. REWRITE `SearchModal.tsx` as the ⌘K command palette.
18. EDIT `Footer.tsx` to import `NAV_ITEMS`.

**G. Final pass**
19. Full §18 verification, including `npm run test`, `tsc`, `lint`, `build`, and the 17 manual assertions.
20. Grep sweeps for stray `text-[9-11px]` and raw hex in the chrome; fix anything the greps surface.

---

## 20. Effort

| Step | Size | Notes |
|---|---|---|
| A + B (1-6) | ~0.5 day | Pure additions, no behaviour change. |
| C (7-10) | ~1 day | 12 page edits, mostly deletions. Highest-risk step, entirely mechanical. |
| D (11-12) | ~1 hour | Six one-line class changes. |
| E (13-16) | ~1.5 days | The actual design work. |
| F (17-18) | ~1 day | Palette + footer. |
| G (19-20) | ~0.5 day | QA. |
| **Total** | **~4.5 days** | |

**If we only do three things:** (1) the `_app.tsx` lift so Search/Cart/Leaderboard stop being dead buttons on 8 pages, (2) the cart provider so the purchase funnel survives navigation, (3) the mobile tab bar. Those three are the difference between a navbar that looks unfinished and one that works.

---

## 21. If we only do one thing

**Step 7 + 8 + 9 — the `AppShell` lift.** Everything else in this document is polish on top of a bar whose Search, Leaderboard, and Cart buttons currently do nothing on two-thirds of the site, whose `⌘K` chip lies on eleven of twelve pages, and whose cart badge resets to zero the moment a student clicks a nav link. A navbar that *works* on every route is worth more than a navbar that is merely beautiful on one.
