# Mobile App UI Plan — TieEdu

Turn the whole portal from "a responsive website" into "an app that happens to use the web".
Covers courses, company vaults, study plan, compare, account, checkout, leaderboard, search and
every overlay between them.

Status: **Phases 0-8 shipped, plus image delivery (§15).** All 27 frontend suites and the full
backend suite pass; frontend `tsc --noEmit`, `npm run lint` and `npm run build` are clean, as is
backend `npm run typecheck`. The only remaining lint output is 3 pre-existing
`react-hooks/exhaustive-deps` warnings; all 12 `@next/next/no-img-element` warnings are resolved
(6 migrated, 13 plain `<img>` sites kept, each with a written reason enforced by a test).

Updated as work lands, not written once up front:

| Phase | State | Notes |
| --- | --- | --- |
| 0 — Foundations | done | Safe areas, touch behaviour, motion tokens, density, installability. Verified against a real build. |
| 1 — Shell and chrome | done | 1.1 hide-on-scroll header, 1.2 depth-aware tab bar, 1.3 drill-down header + progress line, 1.4 route transitions. Browser-verified with DOM-level checks. |
| 2 — Bottom sheets | done | `components/common/Sheet.tsx` plus every planned conversion. `ShellContext` owns Escape/scroll locking for `cart`, `search`, `leaderboard` and `drawer`; standalone sheets use `Sheet` defaults. |
| 3 — Vault | done | Reader contents sheet, progress line, mobile action bar, device-local solved/bookmark state, scrollable code blocks, stacked tables, mobile reader controls. |
| 4 — Courses | done | Mobile CTA bars, syllabus sheet, full-bleed tracked video, previous/next navigation, hero covers, provider embed parameters. |
| 5 — Press feedback | done | `components/common/Pressable.tsx`. Haptics are Android-only; see the note in that file. |
| 6 — Performance | done | Skeletons, reduced-motion handling, shared `EmptyState`, adopted discussion empty state, lazy/dimensioned avatars, optimistic completion/progress. |
| 7 — Forms | done | Coarse-pointer 16px floor, semantic `inputMode`/`autocomplete`/`enterKeyHint`, auth/search/catalogue/coupon improvements. |
| 8 — Sweep | done | `mobile-shell`, `anti-web`, `sheet-conversion`, `vault-reader`, `lessonProgress`, `perceived-speed`, `session-restore` and `sw-cache-policy`, `next-config-shape` and `image-policy` suites — 27 suites, all passing. |

### Bugs found by verification, not by reading code

Four of these were silent and only surfaced because a check was run against the running app.
They are listed because the pattern matters more than the individual fixes:

- **A signed-in student was silently signed out on every reload.** The refresh token
  is single-use, and `AuthContext` called `apiRefresh()` directly instead of the
  single-flight guard `api.ts` already had for the 401 path. A second refresh
  presented an already-consumed cookie, got a 401, and signed the user out. The
  network trace was `/auth/me` 401 → `/auth/refresh` 200 → `/auth/me` 401 →
  `/auth/refresh` 401. `tryRefreshSession` and `getSessionUser` are now exported and
  the boot path goes through them. This mattered far more after Phase 0: an
  installable app gets reloaded constantly. Guarded by `scripts/session-restore.test.ts`.
- **The global route loader announced "Loading Vault..." on every route.** It is
  mounted once in `_app`, so opening a course claimed to be loading a vault, from a
  spinner card floating over page content in the bottom-right corner — under the
  thumb on a phone. Reduced to the thin top progress bar, which is the app pattern.
- **The vault skeleton was gated on a flag that raced.** `loading` was set by the
  *company-list* request as well as the vault request, and the list usually resolves
  first, so anything gated on it would tear the skeleton down while the vault was
  still in flight. The skeleton is now keyed on `!company` — absence of data has no
  race — and the dead flag is gone rather than left as a trap.
- **The Phase 4 embed parameters broke an exact-match backend assertion.** Adding
  `dnt=1` and `playsinline=1` to the Vimeo URL failed a whole-string equality test.
  The test now asserts each parameter individually, because the fix at the time would
  have been to paste the new string in — which would not notice a *dropped* parameter,
  the failure that would actually matter.
- **The service worker's never-cache list missed `/api/unlocks` by one character.**
  It named `/api/unlock` while the router mounts `/api/unlocks`, and the matcher only
  honoured an exact match or a `prefix + '/'` continuation — so unlock state was
  cached like catalogue data. `/api/progress`, `/api/gamification`, `/api/study-plan`,
  `/api/reports`, `/api/analytics` and `/api/checkout` were not mentioned at all.
  A denylist has to be right about every route that exists, which is the wrong way to
  fail, so the decision is now an **allowlist** of three whole-collection endpoints
  (`/api/companies`, `/api/courses`, `/api/pricing`), matched exactly, plus a refusal
  to store any response that arrived with an `Authorization` header. Detail routes are
  excluded deliberately: `/api/companies/:slug` carries `is_unlocked` and
  `/api/courses/:slug` carries per-lesson `state` and `locked`, which are the user's
  and not the catalogue's. Guarded by `scripts/sw-cache-policy.test.ts`.

Two notes on the plan itself, so the deviations are on the record rather than
discovered later:

- **`SearchModal` is `md`, not `lg`.** The plan asked for a full-screen sheet at
  `lg`. The codebase draws the mobile/spotlight line at `md`, and a tablet held in
  portrait is a single-column layout, so full-screen at `md` is the correct behaviour
  there. Deliberate, not an oversight.
- **Sketons are only observable signed in.** Both pages are server-rendered and
  `loading` is initialised from the SSR payload, so an anonymous visit correctly
  never enters the loading branch. The skeleton exists for the authed refetch that
  supersedes the anonymous snapshot. A browser probe that stubs the API cannot see it
  at all, because with the API down it is the *SSR* call that fails.

Two bugs found while building Phase 0 are worth knowing about, because both were silent:

- **The tab bar was 30px tall on a notched iPhone.** With the global
  `box-sizing: border-box`, sizing it `height: var(--tabbar-h)` and padding the
  bottom with `env(safe-area-inset-bottom)` spent the 34px home-indicator inset
  *inside* the 64px of bar. It is now sized by `--tabbar-total`.
- **`tailwind.config.js` had no `colors` key at all.** 47 usages of
  `bg-brand-orange` / `text-brand-orange` / `shadow-brand-orange/20` and friends
  across the interview feature compiled to no rule at all, so those accents
  simply never rendered. The theme now carries the full token set, and
  `scripts/design-tokens.test.ts` keeps the config honest against `globals.css`.

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

### Status

**Shipped.** Verified in-browser at 390×844 and 1280×900 (`probe-phase4.mjs`, 19/19).

| Item | Outcome |
| --- | --- |
| `playsInline` | Shipped in **both** places it is needed: `playsinline=1` on the YouTube/Vimeo embed URL in `backend/src/lib/courses.ts`, and the `playsInline` **attribute** on the bare `<video>` in `ContentBlockRenderer.tsx`. An iframe needs the URL param; a `<video>` needs the attribute, and neither can fix the other. Also added `preload="metadata"` — the default `auto` downloads the whole file before a phone can play it. |
| Full-bleed video | Shipped. `TrackedVideoPlayer` breaks out of the page gutter below `md`; `md:` restores the framed card. |
| Sticky "Next lesson" | Shipped in `LessonPlayer`, mobile-only. Disabled with a stated reason while the watch gate is unmet, rather than a button that does nothing. |
| Chapter sheet | Shipped. The mobile outline was an **inline collapse panel**, so opening it reflowed the page and pushed the video off-screen — the exact reason you open an outline. Now a real `Sheet` that overlays. Per-lesson progress was already correct in `LessonRow`; the sheet now also carries a course progress bar. |
| Sticky "Enroll / Continue" | Shipped, and it was genuinely missing: the sticky card is `hidden min-[1440px]:block`, so below 1440px the page's most valuable control was only reachable by scrolling to the top. The bar now also covers the **signed-out preview view** (`CoursePreviewShell`), which is the entire page a non-buyer sees and whose only CTA sat below the sales copy. |
| Bar ownership | The course bar and the player bar cannot both be mounted. Enrolled → the player's "Next lesson" owns the slot; not enrolled → the course bar owns it. This is a product decision, not a layout detail. |
| Hero image | Shipped. `CourseCover` takes `priority`, which the two hero renders pass; every other cover stays lazy. `fetchpriority="high"` matters as much as `loading="eager"` here, since a lazy hero also reports a late LCP. |

**Downloads — deliberately not implemented, and it cannot be as specified.** Lesson video is a
third-party cross-origin iframe (`youtube-nocookie.com` / `player.vimeo.com`). A service worker
cannot cache it: it cannot intercept a cross-origin subresource at all, and `public/sw.js`
already refuses cross-origin requests by design. Making it work would mean proxying video
through our own backend — a bandwidth bill, a YouTube/Vimeo terms-of-service problem, and a
range-request implementation. A "Downloaded" badge that was not backed by a real cached file
would be a lie told to students on a paid course, so no such state is faked.

What *is* genuinely downloadable — certificates and admin PDFs — already works and is unchanged.
If offline lessons are wanted later, it is a native-app or DRM decision, not a PWA one.

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

### 11.1 Every `hover:` variant is now gated — 349 of them were live on touch

The sweep above was verified by reading `globals.css`, and `globals.css` is only the
hand-written half. The other half was missed: **`src/` contained 349 `hover:` variants and
Tailwind emits them ungated by default**, so all of them applied on touch. iOS latches `:hover`
on the first tap and does not release it until the tap lands somewhere else, so a
`hover:bg-*` left a card in its hover colour with the finger already lifted, and the five
`hover:scale`/`hover:-translate` usages in `ContentBlockRenderer`, `CompanyCard`,
`ModulePreviewModal`, `RelatedVaults` and `my-courses` kept a card visibly raised with nothing
under the finger. The `anti-web` suite passed throughout, because it only ever read the
stylesheet and never the compiled Tailwind output.

Fixed with `future.hoverOnlyWhenSupported: true` in `tailwind.config.js`, which wraps each
variant in `@media (hover:hover) and (pointer:fine)`. The compiled stylesheet now has **120
gated hover utility rules and 0 ungated**.

The gate is deliberately **not** `(pointer: coarse)`, which is the other way this is usually
solved and which would break touch laptops: `pointer` describes the *primary* input, so a
trackpad is `fine` even on a touchscreen, and keying off `coarse` would strip hover from the
mouse a user is actually driving. The `'media-hover-none'` variant is stricter still and is
wrong for the same reason.

Two assertions guard this, and the second one is the point:

- the config sets the boolean `true` variant — an *intent*;
- **the compiled stylesheet has no ungated `hover:` rule** — the *output*, checked with
  `postcss` by walking `rule.parent`, since a regex or a hand-rolled brace walker cannot
  separate gated from ungated (the `}` closing a leaf rule inside a gated block is
  indistinguishable from the `}` closing the block, which is exactly the false positive a
  first attempt at this produced).

The output check reads a build artefact, so it is opt-in via `VERIFY_BUILD=1`. It is not
unconditional: it reads `.next`, so leaving it on would make the suite depend on a *fresh*
build and fail for a stale one, which is not a property of the current source. It did exactly
that once, on a `.next` left over from before the flag was set. The mutation was verified
too — setting the flag to `false` and rebuilding fails both assertions.

### 11.2 Four more overlays that were never `Sheet`

Gating the hover variants is only half of it. `Sheet` already provided `role="dialog"`,
focus trap and restore, Escape, and a body scroll lock, and the sweep read the *utility
classes* while looking for hand-rolled modals, so it did not notice that four student-facing
overlays were still built by hand:

| Overlay | What it was missing |
| --- | --- |
| `ContentBlockRenderer` image lightbox | no `role="dialog"`, no focus trap, no Escape, no scroll lock |
| `IntelligenceTreeSidebar` mobile drawer | same, and it duplicated the drawer animation `Sheet` already has |
| `ModulePreviewModal` | same, **and it carries the paywall CTA** — the surface where a student decides to pay was the one a screen reader was never told was a dialog |
| `MockInterviewModal` | same, and it runs a countdown timer, so the page scrolling behind it made the timer look like it was ticking against a moving background |

All four are `Sheet` now. Two of them changed shape on a phone rather than just gaining the
behaviour, which is the point of the migration: `ModulePreviewModal` was a `max-w-4xl`
centred dialog, and its unlock button sat at the top of a 90vh panel — as a bottom sheet it
lands in thumb reach instead.

Three regressions were found while wiring the check up, and all three are about the check
rather than the app:

- **The reveal half, not the hiding half.** The first hover-only rule was written as
  `hover:opacity-0`, which matches nothing here — the lightbox affordance was
  `opacity-0 group-hover:opacity-100`, and the class that *reveals* it is the `opacity-100`
  one. It now matches the reveal half and requires a paired `opacity-0` on the same element,
  since a reveal only hides information if something is hidden to begin with.
- **A decorative reveal is legitimate.** `CompanyCard`'s `opacity-0 group-hover:opacity-10`
  hairline is a glow, not information, and the card is fully labelled and pressable without
  it. Exemptions are now an explicit `DECORATIVE_HOVER_REVEAL` map with a written reason
  each, matching the rule the plain-`<img>` suppressions already follow. An unlisted one
  fails.
- **The file's own stated policy was not the enforced one.** The `anti-web` docstring names
  `BlockEditorModal` as authoring-only, but `walk()` excluded authoring surfaces by
  *directory* and by `admin` in the filename. `BlockEditorModal` lives in `components/modals/`,
  so it was being held to the student standard while the file claimed otherwise. The
  filename filter now covers `editor` as well.

The one overlay still not on `Sheet` is `BlockEditorModal`, and that is the documented
exception: ~20 inputs in an authoring tool, where the check would be measuring itself rather
than the product. The `anti-web` suite and a standalone sweep now both report zero
hand-rolled overlays in student-facing code.

### 11.3 Two viewport tags, and the notch handling was a coin flip

`_document.tsx` declared `<meta name="viewport" content="...viewport-fit=cover">`, and the
emitted HTML carried **two** of them:

```html
<meta name="viewport" content="width=device-width"/>                                  <!-- Next -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/> <!-- ours -->
```

Next's Pages Router seeds every page head from `defaultHead()`
(`next/dist/shared/lib/head.js`), which pushes the first one, and `next/document`'s
`<Head>` does not dedupe the way `next/head` does — so adding a `key` changed nothing.
Next 14 also warns against viewport tags in `_document` for exactly this reason.

The old comment here claimed the last tag wins, per spec. **That was asserted, not
verified**, and the spec does not clearly settle it: which tag a browser honours is left
to implementation, and the WebKit and CSS-Device-Adaptation material disagrees about
ordering in general. So the notch handling rested on a browser's mood, and it fails
*silently* — a page without `viewport-fit=cover` renders perfectly and simply reports
`env(safe-area-inset-*)` as `0px`, so nothing looks broken. The header does not slide
under the status bar; it just quietly gets no inset, and `--safe-top` becomes `0`.

The fix is to not ask. The tag moved to `_app.tsx` inside `next/head`, which does dedupe,
and it is a real guarantee rather than a hope:

- `unique()` keys `<meta>` on the `name` prop (`METATYPES = ["name", "httpEquiv", "property"]`);
- `reduceComponents` evaluates `userHead.reverse().concat(defaultHead().reverse())`, so the
  user head is seen first and the default is the one dropped.

All 15 prerendered pages now emit exactly one tag, and the assertion is on the **count**
rather than on which tag wins — precisely because which one wins was never knowable from
the source. It runs under `VERIFY_BUILD=1` and reads the emitted HTML, since a regex over
`_document.tsx` cannot see the tag Next adds on its own.

### 11.4 `cursor-pointer` was not 17 bugs

Worth recording, because the request was "remove `cursor-pointer` from 17 places" and
removing all 17 would have made the code worse. Of the 12 in student-facing code:

| Count | What it was | Correct action |
| --- | --- | --- |
| 6 | `<label>` bound to a control (`htmlFor`, or wrapping a checkbox / hidden file input) | **keep** — a label is not natively clickable and forwards to its control; `cursor: pointer` is the recommended pattern and its absence makes the text read as a heading |
| 3 | `<summary>` inside `<details>` | removed — natively interactive, UA already paints a pointer |
| 2 | `<input type="checkbox">` | removed — the UA already paints a pointer |
| 1 | `<div onClick>` expand/collapse in `interview-course.tsx` | **the real bug** |

That last one was the only genuine finding. `cursor-pointer` was not the problem there, it
was a band-aid: a `<div onClick>` is unreachable by keyboard and announces no state.
Deleting the class would have removed the affordance and left the control unreachable. It
is a real `<button>` with `aria-expanded` now, and the "done" checkbox is a **sibling**
rather than a descendant — a button inside a button is invalid HTML, and assistive tech
announces only the outer one, which would have made the inner control unreachable by name.
The row stays a flex line of the two, so the tap target is still full width.

The five in `admin/` were left alone, consistent with the rest of this file's scope rule.

A rule now covers it: `cursor-pointer` is allowed on a `label` or `summary` and rejected
on anything else, because on a real `<button>` it is redundant and on a `div`/`span` it is
claiming interactivity the element does not have. Two things had to be got right for the
rule to be worth anything, and both were wrong first:

- the enclosing tag is the nearest preceding `<` + letter, **not** the text back to the
  previous `>` — a JSX attribute list contains `=>` in every handler, so a `>`-delimited
  scan stops inside the attribute and reports nothing. It passed on an injected
  `<div onClick={() => undefined} cursor-pointer>`;
- comments are blanked first, preserving line numbers, because the fixes in this file are
  explained in comments that quote the markup they removed, and the scanner read its own
  explanation as a live offender.

Both are mutation-tested, as is the viewport count.

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

---

## 15. Image delivery (next/image)

Follow-on to Phase 6. Started as a lint sweep — 12 `@next/next/no-img-element` warnings —
and turned out to be sitting on top of a config bug that had disabled the whole feature.

### 15.1 The config bug: `images` and `headers` were inert

`next.config.mjs` had **both** keys nested inside `experimental`:

```js
experimental: { cpus: 4, images: { ... }, async headers() { ... } }
```

`images` and `headers` are top-level `NextConfig` keys, and `ExperimentalConfig` in Next 14
declares neither. Next does not reject config keys it does not recognise — it drops them
silently. So, with no error and no warning:

- `remotePatterns` did nothing, so any `next/image` with a remote src threw
  `hostname is not configured under images` at runtime. **This is the reason so many
  components here still use a plain `<img>`.**
- The `/sw.js` and `/manifest.json` `no-store` headers were never applied — which is the
  §0.5 "PWA pinned to a stale worker forever" failure, still broken despite being marked
  shipped.

Both are hoisted now. `scripts/next-config-shape.test.ts` (16 assertions) reads the real
exported config object and fails if either key is nested again. It was verified against a
deliberately reintroduced bug: removing the top-level keys makes 6 assertions fail.

### 15.2 Migrated (6)

Only images where the optimizer is a genuine win and the source is provably ours:

| Site | Note |
| --- | --- |
| `HeroPosterCarousel` | Full-bleed above-the-fold hero, the largest unoptimised image in the product. `fill` + `sizes="100vw"` + `priority={isActive}`. Its old comment said "next/image cannot optimise it" — true only while `remotePatterns` was inert. |
| `CourseDetailSections` | Instructor photo, 80px circle fed a full-resolution original. |
| `PricingSection` | Company logos, 44px and 32px. Tailwind class → pixel map rather than a `fill` wrapper. |
| `CartModal` | Company logo, 40px. The sibling QR is *not* migrated — see below. |
| `PostersTab` | Poster grid. Often a 1000px+ marketing PNG painted into a 112px admin thumbnail. |
| `CourseCover` | The LCP element — see §15.5 for the origin guard and the per-call-site `sizes`. |

**Why these are safe while others are not:** `POST /api/posters` and the course-thumbnail
route both accept only `.jpg/.jpeg/.png/.webp/.avif`, the stored filename is regex-anchored
to those extensions, and the serve routes only ever emit raster Content-Types. The optimizer
can never be handed an SVG it would reject.

### 15.3 Deliberately left as `<img>` (13)

Each carries a written reason and a scoped `eslint-disable-next-line`, so none is an
unexplained suppression:

- **Payment QR codes** (student cart, admin settings). `next/image` would re-encode a QR —
  and a re-encoded QR no scanner reads is an **unpaid order**. Lazy-loading also defers the
  code to exactly the wrong moment. Kept eager, with `width`/`height` added so the panel
  stops jumping.
- **`/logo.svg`.** `/_next/image` refuses SVG (`image type is not allowed`). The only way
  through is `dangerouslyAllowSVG`, a real security downgrade — SVG can carry script — traded
  for optimizing a ~2 kB vector. Not worth it.
- **Avatars** (header, account, thread). Base64 data URLs, already in the document: no request
  to save, and the optimizer refuses data URIs. Gained `width`/`height`/`decoding` instead.
- **`BrandTile`** accepts `http://`, `https://` and `data:`. `remotePatterns` is deliberately
  scoped to the API host rather than `https://**`, so migrating it would 400 every
  externally hosted company logo — in the cart and the company manager.
- **`ContentBlockRenderer`** figures and **markdown images** are author-supplied on arbitrary
  hosts, with no width or aspect ratio to declare. A broken figure in a paid vault is worse
  than an unoptimised one. The lightbox independently needs the original URL.

`sizes` is set on every migrated site. Without it `next/image` assumes `100vw`, which
downloads a *larger* file than the plain `<img>` it replaced.

`scripts/image-policy.test.ts` (38 assertions) enforces the policy rather than trusting it:
`isApiAssetUrl` is executed against every origin trap, and **every** `@next/next/no-img-element`
suppression must carry a written reason. Several bare disables predated this work, and a bare
`eslint-disable-next-line` reads as "reviewed and accepted" — the lint count alone cannot tell a
deliberate decision from an oversight.

### 15.4 Verified

Against a staged 1200×800 PNG served from `GET /api/posters/file/:name`:

| Request | Result |
| --- | --- |
| Direct from API | 200 `image/png`, 109 743 B |
| `/_next/image?w=640` | 200, **4 506 B** |
| `w=384 / 640 / 1920`, `Accept: image/avif` | 200 `image/avif`, 631 / 889 / 1 174 B |
| `url=https://example.com/...` | **400** — allowlist holds |

The staged file was deleted afterwards; `backend/uploads/posters/` is empty. Note the
absolute byte counts are flattering because a synthetic gradient compresses far better than a
photograph — the pipeline is proven, not a benchmark.

### 15.5 The course cover (LCP) — shipped

`CourseCover` in `CourseUi.tsx` was the last plain `<img>` and the largest unoptimised image
in the product: a full-resolution upload painted into a slot a fraction of its size. It is now
migrated, with the two conditions that were flagged before touching it:

**1. Runtime origin guard.** `thumbnail_url` is a DB column, not a typed upload, so nothing
forbids an arbitrary URL being written and the optimizer would 400 for it — a broken hero on
the page that sells the course. `isApiAssetUrl` (`src/lib/assetUrl.ts`) gates the branch:

```tsx
{isApiAssetUrl(src) ? <Image ... fill priority={priority} /> : <img ... />}
```

The predicate compares parsed `URL.origin` values, not a prefix. A prefix test accepts
`http://localhost:5000.evil.test/x.png`, which *does* start with the API origin — asserted in
`scripts/image-policy.test.ts` along with the port, scheme and subdomain traps.

It also rejects non-`http(s)` schemes, which is not redundant: `origin` is *inherited* for blob
URLs, so `new URL('blob:http://localhost:5000/x').origin` is `http://localhost:5000` and an
origin-only test would hand a blob URL to an optimizer that cannot fetch it. That was a real
bug in the first version of the predicate, caught by the test that was written alongside it.

**2. Explicit `sizes` from the caller.** It cannot be derived — the four call sites are 80/168px
fixed thumbnails and full-width `aspect-[4/3]`/`[16/9]` hero boxes, and the component only
receives a Tailwind class string. Getting it wrong costs in both directions, so each call site
states its width:

| Call site | `sizes` |
| --- | --- |
| Course card | `(min-width: 640px) 168px, 80px` |
| Preview shell aside | `(min-width: 1024px) 420px, 100vw` |
| Course hero (desktop) | `240px` |
| Course hero (mobile) | `calc(100vw - 32px)` |

The hero cover is the **second** child of `sm:grid-cols-[1fr_240px]`, so it sits in the fixed
240px track at every viewport; the `1fr` column is the title block. It was first written up as
`(min-width: 1440px) 1272px, …`, derived from the `1fr` column of `max-w-[var(--reader-max)]`
— a 5.3x overstatement that made a 240px slot download the largest file in the srcset. The
derivation was plausible and entirely wrong: it reasoned about the grid's *first* track while
the component was a child of the *second* one, and the misleading indentation left in the file
after an earlier edit made the nesting look like the cover was a sibling of the whole grid. The
correct width is the one the `240px` track in the class name already states.

`fill` is used rather than width/height: the wrapper is already `relative` and already sized by
`className`, and the API returns no intrinsic dimensions. The LCP tuning survives — `priority`
carries the preload hint and `fetchpriority=high` that the explicit attribute existed for, and
the gradient placeholder keeps its `onLoad` transition.

**3. `sizes` the srcset can actually serve.** A `sizes` value is only half the answer: Next
builds the srcset from the union of `images.deviceSizes` and `images.imageSizes`, and if the
nearest width to what a component asks for is larger, the browser downloads that larger file.
Two gaps were real — the 420px aside had no width near it (jumping 390 → 640) and the 168px
course card pulled the 256px file — and both are now configured.
`scripts/image-policy.test.ts` asserts this for every `sizes` in the codebase, with a 15% waste
budget above 256px and a 48px slack below it.

The other half of that rule is that each configured width is *not free*. Because the two lists
are unioned for every image that declares `sizes`, an entry added for one image becomes a
candidate URL in the srcset of all of them: adding 240/168/112/80/44/40 cost **13.29KB** of
markup across the five covers on this page. Five of those six were unnecessary — 40, 44, 80, 112
and 240 were already within budget of the stock 48/96/128/256 — so trimming to 168 alone, plus
420 in `deviceSizes`, brings the same page to **10.53KB**. Only `168` earns its entry.

### 15.5a Both branches verified against rendered markup

The gap that a unit test cannot close — whether each branch produces the right *markup* — was
closed without touching the shared database, using a throwaway proxy on `:4321` that forwarded
the real API on `:5000` and rewrote **only** `thumbnail_url` in course JSON, with a dev server on
`:3200` built against it. The real `python-programming` course was rendered through its real
`getServerSideProps`, so the component, the guard, the config and the optimizer were all the real
ones.

| Case | `thumbnail_url` | Observed |
| --- | --- | --- |
| API origin | `/api/posters/file/cover-verify.png` (1400×1050 PNG) | 5 × `data-nimg="fill"`, `srcSet` on `/_next/image`, `fetchpriority="high"`, `sizes` exactly as tabled, `position:absolute` from `fill` |
| External | `https://cdn.example.com/course-cover.jpg` | `data-nimg` count **0** — the optimizer was never asked about a host it would 400 — and the plain `<img>` kept `loading="eager" fetchPriority="high" decoding="sync"` |

`GET /_next/image?url=…&w=168|256|420&q=75` each returns 200 `image/avif` at 0.5–0.7KB from a
135KB source. The stub, the raster and both build directories were removed afterwards; `:3100` and
`:5000` were never touched.

Worth noting *why* this could not have been found by reading the code. Two separate things only
showed up in rendered markup. Every seeded course has `thumbnail_url: ''`, so the origin guard is
never exercised by the data anyone can see; only an external URL — which no seeded row has
either — takes the branch that returns 400, and a green suite, a clean build and a
healthy-looking catalogue all coexist with a hero that breaks for exactly the courses that use a
CDN. And the emitted `sizes` exposed the 240px/1272px error above, which was in the source, in
review, and in a passing test that only asserted a `sizes` attribute *existed*.

### 15.6 Regression caught during the migration

Moving `PostersTab`'s thumbnail to `fill` initially collapsed it to 0px: the parent's height
came *from* the image's `h-40`, and `fill` takes the image out of flow. The height now lives
on the `relative` parent. Worth remembering for any future `fill` conversion — nothing in
typecheck, lint or the build suite catches it, and there is no runtime assertion for it.
