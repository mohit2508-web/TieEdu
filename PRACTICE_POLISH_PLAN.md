# Practice Polish Plan: loaders, error pages, layout, IDE themes, company sets

Status: **plan, waiting for the owner's choices (§9)**. Date: 2026-11-11.

Follows PRACTICE_MODE_PLAN.md (phases 1–5 and 7 are built). The loader options can be seen live in the artifact "TiEEdu Loading States".

---

## 1. What the owner saw, and why

| What the owner saw | Cause in the code |
|---|---|
| Loading looks lazy: plain "Loading…" text | **27 places** print the word "Loading…" (6 of them in the new Practice/IDE screens). The only global loader is a 1 px top bar (`TieEduLoader`). |
| 404 / error pages look default | There is **no `404.tsx`, `500.tsx` or `_error.tsx`**, so Next.js shows its bare default page. |
| A crash turns the screen white | **No React Error Boundary anywhere**, so one thrown error blanks the whole app. A student mid-test or mid-code can lose the screen. |
| Practice pages don't fill the screen | `PracticeLayout` caps content at `max-w-6xl` (1152 px), centred, with empty sides on large screens. Only the IDE is full screen. |
| Too many plain tabs on top | The site header nav sits above a second row of 5 text tabs (Overview · DSA sheet · Company sets · Company tests · Skill tests). Company pages add a third row (Coding set / Tests). These are three stacked navigation rows with the same look. |
| No dark/light switch in the editor | The theme exists but is hidden inside ⚙ Settings, and it changes only the code area. The IDE frame, panels and console stay in the site theme. |
| Company sets look simple | Cards hold a name, three numbers and a bar. There is no logo, no company colour, no difficulty mix, no "continue" action and no sense of a route. |

---

## 2. Branded loader (owner picks A or B)

A new component `components/common/BrandLoader.tsx`, with three sizes:

| Variant | Size | Used for |
|---|---|---|
| `fullscreen` | full logo, about 480 px wide | First open of the site/app, opening the IDE, starting a test |
| `panel` | the brain alone, about 92 px | Inside a panel: the editor while CodeMirror loads, the console while tests run |
| `inline` | the brain alone, 24 px | Buttons (Run, Submit, Buy), small cards |

### The thinking brain (owner's direction, 2026-11-11)

There is no box behind the logo and nothing spins. The brain above the "i" is a clean vector group in `public/logo.svg`: an outline, 44 connections and 10 nodes. That lets it "think" while things load. The letters are inlined once and reused, and the brain is animated on its own.

**A · Synapse ignite**
- From the centre node, the connections draw out in amber one after another.
- Each node lights as its line arrives.
- The outline glows, then everything settles. About 3.2 s a cycle.

**B · Thought pulse**
- Sparks race from the glowing centre along each connection.
- Each node flashes on arrival, and the outline breathes. About 1.6 s a cycle, more electric.

**Both**
- A soft amber aura behind the brain grows and fades. It does not spin.
- On dark grounds the brain's white inner fill takes the ground colour, so there is no white patch.
- The letters, the tagline and the brain's lines keep their colours.

### v3 (owner feedback 2026-11-11): clean logo + intro

- `public/logo.svg` is a VTracer trace with 265 pieces, including white and pink fragments inside "e" and "d". It looks pasted on dark grounds.
- Redraw it as one clean orange (#F84109) shape per letter, with real holes. Same shapes and colours, 182 KB → 23 KB. Add it as `public/brand/tieedu-wordmark.svg` plus the brain as a separate group.
- Full-screen intro, once per session: the brain draws itself and fires its synapses → T, i and E rise from their baseline → u, d, e slide in → the tagline settles → a light sweeps over the letters (2.0 s) → the thinking loop (sparks plus breathing aura) until ready → on finish every synapse lights and the logo lifts away.
- Later loads and small places use the brain alone.

### Rules for both

- **The logo letters are never recoloured.** No tile or box behind the logo. Only the brain lights up, and it returns to its normal look between cycles.
- **Show only after 400 ms.** Quick loads never flash the loader; until 400 ms the page shows its skeleton.
- **Always say what is loading.** "Opening the code editor…", "Running hidden tests 4 / 12". Never just "Loading".
- **Normal page changes keep the thin top bar and skeletons.** An earlier session removed a corner spinner for good reasons: it fired on every navigation, said the wrong thing, and covered content. We keep that decision.
- **`prefers-reduced-motion`:** the brain shows lit and still; only the caption changes.
- **Accessibility:** `role="status"`, `aria-live="polite"`, and the caption read out.

### Skeletons replace "Loading…"

- **Practice pages:** row skeletons for the DSA sheet, company sets and tests.
- **Company card skeleton.**
- **IDE:** a pane skeleton.
- **Test report:** a skeleton too.
- **Admin coding tab:** table skeletons.

All 27 "Loading…" texts are replaced, the 6 practice ones first.

---

## 3. Error system

### 3.1 Pages

**`pages/404.tsx`**
- "This page took a wrong turn", with the logo tilted.
- A **search box** across companies, problems and courses, using the existing search palette.
- Three buttons: Practice, Companies, Home.
- **"Did you mean …?"** built from the route list plus fuzzy matching on the slug. For example, `/practice/problm/tcs-a06` → `/practice/problem/tcs-a06`.
- Unknown problem or company slugs get their own message: "No problem called X — see all TCS problems".

**`pages/500.tsx` and `pages/_error.tsx`**
- "Something broke on our side".
- **Try again** and **Report it** (opens support with the error ref filled in).
- A short error ref code, plus a timestamp.

### 3.2 Error Boundary

`components/common/ErrorBoundary.tsx` wraps:

| Area | Fallback | Protects |
|---|---|---|
| Whole app (`_app`) | The 500-style screen | The page never turns white |
| IDE | "The editor crashed. Your code is saved in this browser." + Reload editor | Draft code (already in localStorage) |
| Test runner | "The test screen crashed. Your answers are saved." + Resume | Answers (autosaved every 20 s) |
| Admin tabs | An inline error card per tab | One broken tab does not kill the console |

Errors are logged to the backend (`POST /api/client-errors`: ref, route, message, stack line, user id) so admins can see them.

### 3.3 One inline `ErrorState` component

This replaces the scattered red text. Each state has an icon, a plain message and one action:

| Situation | Message | Action |
|---|---|---|
| API failed | Could not load this. Check your connection. | Try again |
| Offline | You are offline. Your code is saved here. | Retry when online (auto) |
| Runner down | The code runner is offline. Your code is saved. | Try again · Status |
| Not found (problem, test, report) | This problem does not exist or was moved. | All problems |
| Locked | In the TCS NQT pack | Unlock (opens buy sheet) |
| Not signed in | Sign in to run your code | Sign in |

---

## 4. Practice layout: full width, one navigation

### 4.1 Desktop (≥ 1024 px): a left rail instead of a tab row

```
┌ Site header (unchanged) ───────────────────────────────────────────────────────┐
├──────────────┬─────────────────────────────────────────────┬───────────────────┤
│ PRACTICE     │ Page header: title · one-line intro · action│ Right rail        │
│ ◉ Overview   │                                             │ 🔥 Streak 6 days  │
│ ⌘ DSA sheet  │ Main content (fluid, up to ~1100 px)        │ Next: Kadane →    │
│ ▣ Companies  │                                             │ TCS readiness 62% │
│   · TCS NQT  │                                             │ Today: 2 problems │
│   · Infosys  │                                             │                   │
│ ✓ Tests      │                                             │                   │
│ ◎ My progress│                                             │                   │
│ ───────────  │                                             │                   │
│ Skill tests ↗│                                             │                   │
└──────────────┴─────────────────────────────────────────────┴───────────────────┘
```

- The page uses the **full width** (rail 240 px + fluid main + right rail 300 px; the right rail hides below 1280 px).
- The rail replaces the 5-tab row. Companies expand into their sets, so the company page no longer needs its own "Coding set / Tests" tab row. That leaves **one** navigation level instead of three.
- Rail items have an icon, a label and a count badge ("12 / 65"). The active item has a tinted background and a 3 px amber edge.
- The rail can collapse to icons only, and the choice is remembered.

### 4.2 Phone

- No rail. A **single "Practice ▾" switcher** in the page header opens a sheet with the same items.
- A sticky bottom summary (streak, next problem) replaces the right rail.

### 4.3 Header and tabs inside pages

- Page headers get a quiet background band with an icon. The title is h1 (28–32 px), the intro is 16 px, and the primary action sits on the right.
- Where tabs remain (company page: Coding / Tests), use a **segmented control**: a pill group with a sliding highlight. This replaces the underlined text tabs, which looked "normal".

---

## 5. IDE upgrades

### 5.1 Themes (owner's request)

- **A visible ☀ / ☾ toggle** in the editor toolbar, next to the language picker. No more hunting in ⚙.
- **The whole IDE follows the theme**: problem panel, console, header and editor, not only the code area. The IDE gets its own `data-ide-theme` scope, so the student can code in dark while the site stays light.
- **Five editor themes** in ⚙:
  - Warm Paper (light, matches the site)
  - One Dark
  - GitHub Light
  - High Contrast (accessibility)
  - Dracula
- The theme is remembered per student (in localStorage now; synced to the account later).
- **Default:** follow the site. **Decision D3:** default the IDE to dark?

### 5.2 Feel and finish

- **Accepted moment:**
  - a short check-burst on the Submit button;
  - "Solved in 3 tries · faster than 70% of students";
  - a "Next problem →" button, which goes to the next unsolved problem in the same list.
- **Header:**
  - The problem's position in the list ("Arrays · 4 of 13") with a mini progress bar.
  - A **timer** students can start for practice ("Practise against the clock: 20 min").
- **Editor:**
  - a font choice (JetBrains Mono / Fira Code);
  - a ligatures toggle;
  - a format button (clang-format / google-java-format / black on the runner box, or re-indent for now);
  - **Zen mode** (hides the problem panel; Esc brings it back).
- **Layout presets:** 50/50, wide editor, wide problem. Stacked console or side console on ultra-wide screens.
- **Console:**
  - a diff view (your output vs expected, with the first differing character highlighted);
  - runtime and memory per case.
- **Shortcuts sheet** (press `?`).
- **The IDE loader** (BrandLoader `panel`) replaces the plain "Loading editor…".

---

## 6. Company sets, more advanced

### 6.1 Company sets grid (`/practice/companies`)

Each card has:

- **The company logo** (from `logo_url`; a monogram tile as fallback) and a **company colour band** (a new `brand_color` field on companies; neutral when missing).
- **A progress ring** (solved / total) instead of the flat bar.
- **A difficulty mix bar**: easy / medium / hard counts, coloured.
- **Chips**:
  - "34 reported questions";
  - "190-min NQT";
  - pack state: "Pack active" or "18 locked".
- **Tests**: count and best mock score.
- **Readiness** for this company (when the plan exists).
- **Primary action:** "Continue: Kadane (Arrays)" or "Start with Level 1". A secondary link opens the set.

Sorting:

- The student's **target company is pinned first**, with a "Your target" ribbon.
- Filters: target · in progress · has tests · free to start.
- **"Coming soon" cards** with a "Notify me" toggle for Infosys, Accenture, Cognizant and Wipro. The toggle uses the existing push/email preference.

### 6.2 Company page (`/practice/companies/[slug]`)

**Hero band**
- Logo, name, and the exam pattern as chips (Part A 75 min · Part B 115 min · 2 coding problems).
- Progress ring and readiness gauge.
- "Continue" button, plus "Take a full mock" when the bank is ready.

**Route line**
- Levels 1–6 drawn as stations on a line (the same idea as the company page rounds).
- Each station shows solved / total; locked stations show the pack lock.
- Clicking a station scrolls to its problems.

**Level sections**
- Collapsible, with "Recommended next" pinned to the top.
- Problem rows show: status, title, difficulty, "reported", acceptance %, and "Solved by 42% of students" (from submissions).

**Tests**
- A segmented control (Coding · Tests) instead of the tab row.
- The tests list shows the pattern table and a score sparkline per test.

**Pack panel**
- Sticky on the right on desktop: what the pack has, the real price and Unlock.

---

## 7. Making it feel unique (small, tasteful)

1. **Daily problem**: one problem a day on Practice home, the same for everyone, with "312 students solved today".
2. **Streak flame** that grows by week, plus the 12-week heatmap (already built) with a tooltip per day.
3. **Milestone toasts**: first Accepted, 10 solved, every level finished. These are small toasts, not confetti everywhere.
4. **"Asked in" badges** with year/shift when known ("TCS · Apr 2024 Shift 2"), from the problem source.
5. **Empty states with a next step** ("No attempts yet → start with Digital Root"), never a blank list.
6. **Consistent icons** per section (DSA ⌘, Companies ▣, Tests ✓) used in the rail, page headers and cards.

---

## 8. Phases

| # | Phase | Delivers | Done when |
|---|---|---|---|
| 1 | Loader + skeletons | `BrandLoader` (chosen option, 3 sizes), the 400 ms rule, skeletons replacing the 6 practice "Loading…" texts, then the other 21 | No "Loading…" text left; the loader appears only on the listed moments |
| 2 | Errors | 404 (search + did-you-mean), 500, `_error`, the Error Boundary in 4 places, the `ErrorState` component, client error logging + an admin view | A thrown error in the IDE keeps the code and shows Reload editor; unknown URLs show the new 404 |
| 3 | Practice layout | Left rail + right rail, full width, the phone switcher, the segmented control, removal of the stacked tab rows | One navigation level on every practice page, at 360 / 1024 / 1440 / 1920 px |
| 4 | IDE themes + finish | ☀/☾ toggle, the whole-IDE theme scope, 5 themes, Accepted moment, next-problem flow, Zen, presets, diff view, shortcuts sheet | Theme switch in one click; the IDE fully dark while the site is light |
| 5 | Company sets v2 | Logos + brand colour, progress rings, difficulty mix, continue actions, target pinned, coming-soon cards; company hero, route line, recommended next, solve-rate per problem | Cards show what to do next without opening them |
| 6 | Unique touches | Daily problem, streak growth, milestone toasts, "Asked in" badges, designed empty states | Each appears only where it adds a next step |

Every phase runs the design guard test, lint and build, and is checked at phone and desktop widths in both themes.

---

## 9. Decisions for the owner

| # | Question | Suggested |
|---|---|---|
| L1 | Loader: **A · Synapse ignite** or **B · Thought pulse**? | A for full screen and pages (calm); B for Run/Submit and starting a test (busy work) — they share one component |
| L2 | Practice navigation: **left rail** or keep top tabs (fewer and nicer)? | Left rail |
| L3 | IDE default theme: follow the site, or **dark by default**? | Follow the site, with the toggle in view |
| L4 | Show "Solved by X% of students" and "faster than X%"? | Yes, once a problem has 20+ solvers |
| L5 | Company brand colours on cards (from each logo)? | Yes, as a thin band only; the TiEEdu logo colour never changes |
| L6 | Daily problem for everyone? | Yes, from the free core |
