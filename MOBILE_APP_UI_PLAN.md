# Mobile App UI Plan — TieEdu

Turn the whole portal from "a responsive website" into "an app that happens to use the web".
Covers courses, company vaults, study plan, compare, account, checkout, leaderboard, search and
every overlay between them.

Status: plan only. Nothing in this document is implemented yet.

---

## 0. The problem, stated precisely

A user can tell a web page from an app without thinking about it. The tells are not
subjective — they are a finite, checkable list. Every one of them is currently present:

| # | Web tell | Where it is today |
|---|----------|-------------------|
| 1 | Page scrolls under a permanently pinned header | `Header.tsx:80` — `sticky top-0`, never hides |
| 2 | Centered modals on a scrim | `AuthRequiredModal.tsx:56`, `FeedbackAdModal.tsx:20`, `LeaderboardModal.tsx:63`, `BlockEditorModal.tsx:138` |
| 3 | Right side panel sliding in | `CartModal.tsx:332` — `w-full sm:w-[480px] animate-slide-in-right` |
| 4 | Spotlight / command-palette card floating at 12vh | `SearchModal.tsx:146` — `pt-[12vh] max-h-[70vh]` |
| 5 | Horizontally scrolling chip carousel as navigation | `CompanyModuleReader.tsx:308` — `overflow-x-auto` module strip; `interview-course.tsx:310` |
| 6 | Blue/grey tap flash on every press | no `-webkit-tap-highlight-color` anywhere in `globals.css` |
| 7 | Whole page rubber-bands on drag | no `overscroll-behavior` |
| 8 | Nav bar never gets out of the way | `MobileTabBar` renders on **every** route, including deep reader/question views |
| 9 | No home-screen icon, no standalone display, no splash | no `public/manifest.json`, no service worker, no `apple-mobile-web-app-capable` |
| 10 | Keyboard is wrong for the input | no `inputMode` anywhere; OTP has no `autocomplete="one-time-code"` |
| 11 | Article web typography | `body { line-height: 1.75 }` in `globals.css` |
| 12 | Spinner + `animate-pulse` text as loading | e.g. `company/[slug].tsx:171` "Loading vault..." |
| 13 | `:hover` used for affordance | 40 `hover:` variants in `src/` |
| 14 | No screen transitions at all | no animation library; route changes are instant swaps |

**Definition of done:** on a 390px device, none of rows 1–14 are observable.

---

## 1. Non-goals

- Desktop is **not** being redesigned. Every mobile rule below is `md:`-scoped so the desktop
  experience stays exactly as it is now.
- No native app, no React Native rewrite, no App Store submission. This is a PWA that is
  installed and behaves like an app.
- No offline purchasing. Checkout always requires the network.

---

## 2. Architecture decision (settle this first, everything else depends on it)

**Recommendation: add `framer-motion`.** Cost is ~35 kB gzipped on a 142 kB shared bundle.
It buys, in one dependency:

- spring physics for sheets (CSS easings look like a website)
- **drag-to-dismiss** on sheets, which is the single most "app" gesture there is
- layout animations for the compare matrix and course grids
- shared-element transitions (vault card → vault header)
- reduced-motion respected per-component, not per-CSS-rule

**Free alternative:** pure CSS. Viable, but drag-to-dismiss and shared elements become
hand-rolled pointer maths, and sheet snapping will feel wrong. If we go CSS-only, phases
2 and 4 lose their two best moments and we should say so up front rather than ship
something that reads as "a website with rounded corners".

Everything below is written to be independent of that choice except where marked **[FM]**.

---

## 3. Phase 0 — Foundations

Nothing else is worth doing first. These are the platform-level tells.

### 0.1 Safe areas (fixes #9 partially, and every notched iPhone)

`viewport-fit=cover` is **not** in the viewport meta today (Next's default is
`width=device-width` only), and `env(safe-area-inset-top)` is used nowhere. On a notched
device the header currently sits under the status bar.

- `src/pages/_document.tsx` — explicit viewport:
  `width=device-width, initial-scale=1, viewport-fit=cover`.
  Add `<meta name="apple-mobile-web-app-capable" content="yes">`,
  `apple-mobile-web-app-status-bar-style=black-translucent`, `format-detection=telephone=no`.
- `globals.css` `:root` — `--safe-top: env(safe-area-inset-top, 0px)`,
  `--safe-bottom: env(safe-area-inset-bottom, 0px)`,
  `--safe-left/right` for landscape notch.
- `AppShell.tsx` — wrap in a padding box that applies safe areas **once**, at the shell, so
  no individual component has to think about it.
- `--header-h` must become `calc(64px + var(--safe-top))` on mobile, otherwise every
  `top-[var(--header-h)]` sticky bar we already fixed (reader ×2, compare, study-plan)
  misaligns on a notched phone. `--header-h-sm: 56px` is currently declared and unused —
  use it below `sm`.

### 0.2 Touch behaviour (fixes #6, #7, and the 300ms delay)

`globals.css`:
```
html { -webkit-tap-highlight-color: transparent; }
body { overscroll-behavior-y: none; touch-action: manipulation; }
.scroller { -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.scroller::-webkit-scrollbar { display: none; }
```
`overscroll-behavior-y: none` must be re-enabled on the exact elements that should
pull-to-refresh (root scrolls only — see 7.4), or drag-to-refresh fights the browser.

### 0.3 Motion tokens

```css
--dur-fast: 120ms;  --dur-base: 220ms;  --dur-slow: 320ms;  --dur-sheet: 420ms;
--ease-out: cubic-bezier(0.32, 0.72, 0, 1);      /* iOS-ish decelerate */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--spring: linear(0, 0.006, 0.025, 0.101, 0.539, 0.726, 0.807, 0.878, 0.935, 0.968, ...);
```
Existing `@media (prefers-reduced-motion)` blocks are good and already cover
`.tab-bar`, `.nav-drawer`, `.sidebar-drawer`. Centralise so new components inherit the
rule instead of re-declaring it.

### 0.4 Density

`body { line-height: 1.75 }` reads as a blog. Below `md`, set `1.55` and reduce the
type scale one step. Native apps are denser than the web; this single change does more for
"app" feel than any animation.

### 0.5 Installability (fixes #9)

- `public/manifest.json` — `display: standalone`, `start_url: "/"`, themed
  `background_color`/`theme_color` matching `--bg-app`, icons at 192/512 plus
  `maskable`.
- Real PNG icons; `apple-touch-icon` must be PNG (the current `.svg` will not install on
  iOS).
- `next.config.mjs` — service-worker headers must be `no-store`, and add
  `Content-Security-Policy` compatible with the Google Fonts CDN already in `_document`.
- Minimal service worker: **network-first for HTML, stale-while-revalidate for GET JSON,
  never cache anything under `/api/orders`, `/api/payments`, `/api/auth`, or any
  non-GET.** Cache-first is a trap here — a cached "is_unlocked" would show a student paid
  content they do not own.

---

## 4. Phase 1 — Shell and chrome (fixes #1, #8)

### 1.1 Hide-on-scroll header

Native bars react to the scroll direction.

- `Header.tsx`: translate the header off-canvas on scroll-down past 8px, snap it back on
  any scroll-up. Threshold the shadow separately (`box-shadow` only after ~6px).
- Never hide while an overlay is open, and never on the reader routes (see 1.3).
- Respects reduced-motion: direction changes become instant, not animated.
- **This is a `position: fixed` + transform change**, not `sticky` — a `sticky` element
  cannot be translated out of view without leaving a gap.

### 1.2 Tab bar only at root depth (fixes #8)

The bottom bar currently shows on every route, including an open question inside a vault.
In a native app the tab bar belongs to the **root** stack; pushing a detail screen covers it.

- Add a `navigationDepth` notion: root routes (`/`, `/courses`, `/study-plan`, `/compare`,
  `/account`) = tab bar visible. Drill-down routes (`/company/[slug]?m=…?q=…`,
  `/courses/[slug]?lesson=…`, `/verify/[serial]`) = tab bar slides out, header collapses to
  a native nav bar.
- Drive it from `navConfig`, not from per-page opt-in, so a new page cannot forget.
- Keep it mounted (avoid the layout jump) and animate height/opacity.

### 1.3 Drill-down header

Below `md`, a detail route gets: back chevron, current item title, 1–2 actions, and a 2px
progress line. Not the full desktop bar with logo + 6 links.

### 1.4 Route transitions (fixes #14)

- 180ms opacity + 8px rise on route change, forward; the reverse on back.
- Drill-downs get a horizontal push (the new screen enters from the right ~24px, the old one
  shifts left 24px and dims) — the iOS navigation-controller feel. **[FM]**
- Do **not** animate on the very first load, and do not animate shell-excluded routes.
- Respect `prefers-reduced-motion`: cross-fade only.

---

## 5. Phase 2 — Bottom sheets (fixes #2, #3, #4) — biggest single win

This is where "website" most loudly says itself. On mobile, a modal is a **sheet that rises
from the bottom**, not a box floating in the middle of a dimmed page.

### 2.1 One `Sheet` primitive

`src/components/overlays/Sheet.tsx`, built on the existing `ShellContext` stack so
Escape, focus, scroll-lock and stacking stay in one place.

Must have:
- `rounded-t-3xl`, drag handle, `max-h-[92dvh]`, slide-up spring
- **drag-to-dismiss** with velocity threshold; release past ~35% or 0.5px/ms dismisses
- bottom padding = `var(--safe-bottom)`
- scrim that fades proportionally to drag progress
- `role="dialog" aria-modal`, focus trap, return focus to the trigger
- the sticky primary action pinned to the sheet's bottom edge, always reachable one-handed

### 2.2 Conversion table

| Component | Today | Mobile target |
|---|---|---|
| `CartModal.tsx` | right panel, full height | bottom sheet, sticky "Pay ₹X" bar, drag to dismiss |
| `SearchModal.tsx` | Spotlight card at 12vh | **full-screen search page** with back bar on mobile; keep Spotlight on `lg+` |
| `LeaderboardModal.tsx` | centered modal | sheet, rank rows 56px tall |
| `AuthRequiredModal.tsx` | centered modal | sheet rising from bottom, email field focused |
| `SubmitReportModal.tsx` | centered modal | sheet with segmented control |
| `FeedbackAdModal.tsx` | centered modal | sheet, dismissible by swipe |
| `MobileNavDrawer.tsx` | right drawer | keep the iOS right-push (it is native), but add drag-to-close + safe area |
| `BlockEditorModal.tsx` | centered modal | low priority (admin, desktop-only in practice) |

Rule of thumb to enforce in review: **below `md`, no `items-center` modals.** If it is not
a sheet, it is a page.

---

## 6. Phase 3 — Vault (company) app-ification (fixes #5)

### 3.1 Kill the chip carousel

`CompanyModuleReader.tsx:308` — the module tree is a horizontal scroller on mobile. A
carousel as *primary navigation* is a website pattern and it hides options off-screen with
no affordance.

Replace with: a full-screen **module list sheet** opened from a "Modules" button in the
reader header. Rows show round name, item count, and a lock/owned state. Tapping a row
pushes into the reader.

### 3.2 Reader

- Sticky bottom action bar (one-handed): Bookmark · Mark solved · Next/Prev. Remove the
  header action cluster on mobile.
- Reading-progress line under the nav bar.
- Code blocks: horizontal scroll container, always with a copy button and a "expand"
  affordance — currently they just overflow.
- Tables → stacked definition rows (same treatment as `CompareMatrixTable` already got).
- Kill `:hover`-dependent affordances (question action row at 178+ is hover-only).

### 3.3 Question view

Push transition, back returns to the exact scroll offset, tab bar stays hidden, and
swipe-left/right moves between questions (horizontal paging) — `[FM]`, only if it does not
fight the code-block scroller.

---

## 7. Phase 4 — Courses app-ification

- **Lesson player**: full-bleed video, `playsInline`, no web page chrome, sticky bottom
  "Next lesson", completion writes immediately and advances.
- **Chapter list**: bottom sheet from a header button, progress per lesson.
- **Course detail**: sticky bottom "Enroll ₹X / Continue" bar; hero image with fixed aspect
  so nothing shifts on load; sections as a sheet-driven accordion on mobile.
- **Downloads**: explicit download state per lesson, tied to the service worker cache, with
  a "Downloaded" badge in the chapter sheet.

---

## 8. Phase 5 — Press feedback and haptics (fixes #6, #13)

`src/components/common/Pressable.tsx`:

- `:active` scale 0.97 + background tint, 120ms
- respects reduced-motion (tint only, no scale)
- 44px minimum hit area enforced by the primitive, not by each caller
- wraps `:hover` styling in `@media (hover: hover)` so touch devices never get a stuck
  hover state — the 40 existing `hover:` variants get audited, not mass-edited

Haptics: `navigator.vibrate` is Android-only. Be honest in the plan — iOS Safari exposes no
haptics API, so a vibration on Android must degrade to visual-only on iOS rather than
pretending to be consistent. Use it for: add-to-cart, tab change, sheet dismiss, purchase
success.

---

## 9. Phase 6 — Perceived speed (fixes #12)

- Replace every spinner and "Loading..." text with **skeletons** matching the final layout.
  Start with the vault (`company/[slug].tsx:171`) and course detail — they are the two the
  student sees most.
- Fixed `aspect-ratio` boxes for all vault/course images.
- Optimistic bookmark, solve, and progress.
- Real empty states: icon, one line, one CTA — not an empty div.

---

## 10. Phase 7 — Forms and keyboard (fixes #10)

- `inputMode`: `numeric` for OTP, `email` for email, `tel` for phone, `url` for links.
- `autocomplete`: add `one-time-code` to the OTP field (iOS SMS autofill works only with
  this), `username`/`current-password`/`new-password` to `AuthRequiredModal`, which
  currently has only `type="email"` and therefore no autofill at all.
- `enterKeyHint="next"` / `"go"` / `"done"`, correct field order so Return advances.
- `font-size: 16px` minimum on all inputs — below that iOS zooms the page on focus, which
  is itself a dead giveaway.
- Errors under the field, never as a toast.

---

## 11. Phase 8 — The anti-web sweep (fixes #11, #13, and the long tail)

A final pass to delete remaining tells:

- no `:hover`-only information
- no `cursor:` affordances on touch
- no dotted focus rings on touch (`:focus-visible` only)
- no `alert()`/`confirm()` — use the sheet
- no `window.print` styling
- remove `hover:scale` from touch surfaces
- every `<img>` in the mobile-critical path reviewed for `loading="lazy"` + dimensions

---

## 12. Sequencing and effort

| Phase | Contents | Rough size |
|---|---|---|
| 0 | Safe areas, touch behaviour, motion tokens, density, PWA | M |
| 1 | Hide-on-scroll header, tab-bar depth, drill-down header, transitions | L |
| 2 | `Sheet` primitive + convert 7 overlays | **XL** |
| 3 | Vault: module sheet, reader, question view | L |
| 4 | Courses: player, chapters, detail | L |
| 5 | Pressable + haptics | S |
| 6 | Skeletons, images, empty states | M |
| 7 | Forms/keyboard | S |
| 8 | Anti-web sweep | S |

**Suggested order:** 0 → 5 → 2 → 1 → 3 → 4 → 6 → 7 → 8.
Phase 2 is the headline; everything else supports it. Phases 0, 5 and 7 are cheap and can
land first to de-risk the rest.

---

## 13. Verification

- Real devices, not DevTools: iPhone SE (320px, the tightest case), a 390px iPhone, and one
  mid-range Android. DevTools cannot show safe-area insets, rubber-banding, haptics or
  install prompts.
- **Landscape + notch** pass — that is where the safe-area bugs live.
- iOS Safari: verify the address bar collapse, standalone mode, and that the tab bar clears
  the home indicator.
- Add a scripted "web-tell" check to `frontend/scripts/`: assert no `items-center` overlay
  container below `md`, no `fixed` element wider than the viewport, and that every
  `fixed`/`sticky` surface accounts for a safe-area inset. Cheap, and it stops regressions.
- Screenshot diffs at 320 / 390 / 768 / 1280 for the vault, a course lesson, checkout and
  the study plan.
- Lighthouse PWA category and a real install on iOS Safari (Add to Home Screen).

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| Desktop regressions from mobile CSS leaking upward | Every rule `md:`-scoped; screenshot-diff all four widths |
| `framer-motion` bundle cost on a 142 kB base | Lazy-load per route; it is only needed where sheets/pushes exist |
| Sheets fighting the existing `ShellContext` scroll-lock | Extend the existing lock rather than adding a second one |
| Service worker serving stale entitlement data | Explicit never-cache list for auth/orders; default to network-first |
| Overreach into the desktop product | Non-goals are fixed; desktop is a verification gate, not a design target |
