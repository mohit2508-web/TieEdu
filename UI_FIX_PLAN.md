# UI Fix Plan: one navigation, full-width desktop, nothing broken

Status: **plan, waiting for the owner's decisions (§9)**. Date: 2026-11-11.

The owner's complaint (screenshots, 2026-11-11), in their words: "kuch bhi sahi nahi aa raha". Tabs show on top even where a side rail exists. Pages feel like a phone app opened on a laptop. Several pages show "could not be loaded" or "Session expired". Some button text spills out of its button.

The rule for this plan: **UI first, 100% correct on desktop and phone**. Feature work comes after.

---

## 1. How this was checked

A crawler opened every student route as a signed-in student, and the admin and TPO consoles as an admin: **74 routes × desktop 1440 px and phone 390 px = 148 pages**. The run used a production build. For each page it recorded:

- failed API calls (4xx / 5xx);
- JS errors;
- a page wider than the screen;
- controls whose text spills out of them;
- how wide the content is on desktop;
- whether the page shows the header's tab row, the Practice rail, or both;
- a screenshot.

The crawler is kept as a tool (phase 6), so this check can be re-run before every release.

**Limits of that run.** The local backend ran without Postgres. Every Postgres feature therefore answered 503: Mock Drives, notifications, `/api/me`, resumes, college board, campus intel and TPO. Those pages still have to be checked against the live site (decision U5).

---

## 2. What is wrong (findings)

### F1 · Two navigation systems, used inconsistently (the owner's main point)

- **Under `/practice/*`:** a left rail (built last week), with the header's tab row hidden.
- **Every other Practise page** (Skill Test, Daily challenge, Mock interview, Peer mock, English coach, Mock Drives, Talent) still shows the header's row of **10 text tabs**. These pages have no rail.

Moving from DSA sheet to Daily challenge therefore swaps the whole navigation. The other sections behave differently again:

| Section | Pages | What a student sees |
|---|---|---|
| Learn | 6 | A tab row |
| Companies | 3 | A tab row |
| Practise | 10 | A rail on four pages, tabs on six |

**On a phone,** the 10 tabs become a strip that scrolls sideways. Six of them sit off screen (the crawler found "Mock Drives" 779 px past the right edge), so students never know they exist.

**Mock Drives** adds a third navigation level: its own pill tabs (Overview · Drives · Interviews · Assessments · More), under the header and under the 10 tabs.

### F2 · Desktop does not use the screen

There are **nine different page widths**: 672, 712, 720, 760, 768, 832, 1112, 1152 and 1200 px. Most task pages are a 712–768 px column centred on a 1440 px screen, which leaves about half the screen empty. Examples:

- Daily challenge, Mock interview, Peer mock and English coach;
- Debrief, Drive day, Study groups, Offer check;
- Calendar, Talent, Recruiters, My courses, My certificates.

The owner's screenshots show exactly this.

### F3 · Pages that break or hang

| Page | What happens | Cause |
|---|---|---|
| Today (home, signed in) | A grey box stays forever at the top | The new TiE Coins strip shows its skeleton until data arrives. If the first request fails (e.g. right after sign-in, before the token is ready), it never retries and never hides. |
| `/prep/tcs-nqt` | Desktop: "Building your plan" spins forever. Phone: "No prep plan for this company yet". | The API answers 404 because the TCS plan is not switched on until its question bank is complete. Yet the company practice page links to it ("Your TCS NQT plan and readiness →"). |
| `/talent` | A large empty grey box | The skeleton never resolves when its request fails |
| Mock Drives (all 9 pages) | Owner sees "Session expired — sign in again"; here, "temporarily unavailable" | Postgres-backed. The owner's message is an auth/session problem, still to confirm on live. |
| Mock interview, Peer mock | Owner sees "could not be loaded" | Works locally against the JSON store, so this is environment-specific (backend version or session). Confirm on live. |
| `/courses/branch/<slug>` | One wrong slug made it call `/api/courses/<slug>` (404) | To verify with real branch slugs |

**Pattern:** loading states with no failure path. A skeleton or spinner should always end, in data or in an error with a Try again button.

### F4 · Broken layouts on phone

| Page | Problem |
|---|---|
| Practice home | The daily-problem card squeezes its text into a one-word-per-line column ("Chocolate / Factory: / Empty / Packets"), because the button does not drop below on narrow screens |
| Rewards | The hero heading and the coins card are cut off at the right edge ("Get the hoodie" clipped; the week row cut) |
| Streak | The header squeezes "1-day streak" into a narrow column beside the Share button |
| Company page | Six controls run off screen (round chips row) |

### F5 · Text spilling and over-long copy

- **Header:** the "Drops 9+" badge spills 4 px out of the nav pill on every page.
- **Button and chip copy is too long** in places, for example:
  - "Sign up to start earning";
  - "Opens when stock arrives";
  - "Solve today's problem to keep it going →";
  - "Unlock 32 more · ₹…".

  Buttons should say the action in 1–3 words, and the explanation belongs in a line under it.
- **Tables** (Cookies, Compare) are wider than a phone. They scroll inside their box, which is correct, but nothing shows that they scroll.

### F6 · Two visual systems

Mock Drives, drives, TPO and payment sheets (**37 files**) use a different style, with `--apple-*` colours. That means:

- different greens;
- pill tabs;
- a "Hi Coin 👋" hero.

The rest of the site uses Warm Paper tokens. Skill Test has a full-width teal hero; the next page has a plain heading. The page heading style changes from page to page, so the site does not feel like one product.

### F7 · Not yet checked (included in this plan)

- Dark mode on every page (this run was light only)
- Colour contrast of text on tinted chips and buttons
- Tablet width (768–1023 px)

---

## 3. The navigation model (fixes F1)

### 3.1 Desktop (≥ 1024 px)

- **The header stays as it is**: logo · Today · Learn · Practise · Companies · Drops · Leaderboard / coins / account.
- **The header's tab row goes away on desktop**, on every page.
- **Every section with more than one page gets the same left rail.** It is one shared component (`SectionShell`), mounted by the app shell, not by each page. Pages cannot then get it wrong.

The rail contents, grouped so 10 items are easy to scan (decision U2):

| Section | Rail |
|---|---|
| Learn | Courses · Tracks · Free course · Test dates — **Mine:** My courses · My certificates |
| Practise | **Coding:** Overview · DSA sheet · Company sets · Company tests — **Tests & interviews:** Skill tests · Daily challenge · Mock interview · Peer mock · Mock drives — **Skills:** English coach — **Rewards:** Streak · Store |
| Companies | All companies · Compare · Get found by recruiters |

- **Rail behaviour:**
  - same look as the Practice rail today: icon, label, count, an amber edge on the active item;
  - collapses to icons, and the choice is remembered;
  - sticky while scrolling.
- **The right rail** (streak, goal bar, next problem) shows on every Practise page from 1280 px, not only on `/practice/*`.
- **Mock Drives' own pill tabs become rail sub-items** (Drives · Interviews · Assessments · Notifications · Profile), so there is one navigation level.

### 3.2 Phone (< 1024 px)

- **No sideways-scrolling tab strip anywhere.**
- At the top of every section page: one **"Practise · Daily challenge ▾" switcher**, opening a sheet with the same grouped list as the rail.
- The bottom tab bar (Today · Learn · Practise · Companies · Drops) stays.

### 3.3 Full-screen pages stay full screen

These keep no header and no rail:

- the IDE;
- a test in progress;
- a test result;
- the Drops reel;
- Project Pulse teacher review.

---

## 4. Page templates (fixes F2)

Every route gets exactly one template. Widths come from the template, never from the page.

| Template | Desktop layout | Used by |
|---|---|---|
| **A · Workspace** | Rail + fluid main (up to 1200 px of content) + right rail from 1280 px | Practice pages, Skill tests list, Courses, Tracks, Companies, Store, Admin, TPO |
| **B · Task + context** | Rail + **two columns**: the task (~720 px) and a context panel (~380 px) beside it | Daily challenge, Mock interview, Peer mock, English coach, Debrief, Drive day, Offer check, Study groups, Calendar |
| **C · Reading** | Rail (where in a section) + text at 72 characters + an "On this page" contents column | Privacy, Terms, Cookies, Refunds, About, Guarantee, guides |
| **D · Full screen** | No chrome | IDE, test in progress, Drops reel |
| **E · Single card** | Centred card ~480 px | Sign in, Sign up, Forgot / reset password, Verify |

What the template B context panel holds, so the extra space is useful:

| Page | Context panel |
|---|---|
| Daily challenge | Your streak and coins for today; yesterday's three answers explained; "+5 coins when you finish" |
| Mock interview | Your past interviews with scores (now under the form); what the feedback checks |
| Peer mock | How a session works in 3 steps; your recent sessions; the code to share |
| English coach | The prompt list beside the recorder (the list is now above it) |
| Debrief | Your past debriefs and the plan they produced |
| Drive day | Today's checklist progress and the reporting-time countdown |
| Offer check | The 6 signs of a fake offer we check; an example |

On a phone, template B stacks: the task first, then the context below.

---

## 5. Fixes, page by page (F3–F5)

### 5.1 Broken / hanging

1. **No loader without a way out.**
   - Every skeleton or spinner resolves to data, to an `ErrorState` with Try again, or to nothing.
   - The CoinsStrip, Talent and Prep loaders get this first.
   - Requests made right after sign-in wait for the token before they fire.
2. **TCS NQT prep:**
   - Link to the plan only when the API says the plan is available.
   - The prep page shows a proper "This plan opens when its question bank is ready — practise the coding set meanwhile" state, with a link, instead of spinning.
3. **Postgres-backed pages** (Mock Drives, notifications, profile, resumes, college board, campus intel, TPO):
   - When the database is unreachable, one calm full-page state: "Mock drives are offline for a few minutes. Your data is safe." Plus Try again.
   - Never "Session expired" unless the session really expired.
   - The session check is fixed so a database outage is not reported as a sign-out.
4. **Owner's three errors** (Mock interview, Peer mock, Mock Drives "Session expired"):
   - reproduced and fixed on the live site, or on the owner's setup, before this plan is called done (decision U5).

### 5.2 Phone layouts

- **Practice daily card:** stack (text, then a full-width button) below 640 px.
- **Rewards hero and coins card:** no clipping. The heading scales down; the week row fits 7 cells.
- **Streak header:** the number on its own line; Share below on phones.
- **Company page round chips:** wrap to two lines instead of running off.
- **Every page passes the crawler's checks at 360, 390 and 430 px:**
  - no sideways scroll;
  - no control text cut off;
  - every tap target at least 44 px.

### 5.3 Copy and controls

- **Buttons:**
  - 1–3 words, verb first ("Claim", "Start test", "Unlock pack");
  - the explanation goes in a line under the button, not inside it;
  - buttons never wrap to two lines on desktop.
- **Chips:**
  - at most 3 words;
  - a count badge never spills out (the "Drops 9+" fix);
  - "9+" becomes a dot on narrow screens.
- **Tables** wider than the screen show a fade at the right edge and "Scroll →", or become stacked cards on phones (Cookies, Compare).
- **One page header** everywhere: section eyebrow · H1 · one-line intro · primary action on the right. It replaces the mix of full-bleed teal hero, plain heading and greeting card. The teal band is kept only for landing pages (Home, Skill Test landing).

---

## 6. One visual system (F6, F7)

- **Mock Drives / drives / TPO / payment sheets:** the 37 files move from `--apple-*` colours to Warm Paper tokens and shared components (Card, Chip, Segmented, ErrorState, BrandLoader):
  - the pill tabs become rail items (§3.1);
  - the "Hi Coin 👋" hero becomes the standard page header with the four counts as stat tiles.
- **Dark mode:** every route checked in dark; any hard-coded light colour replaced with a token.
- **Contrast:**
  - text on chips, tinted cards and amber buttons checked at 4.5:1 (body) and 3:1 (large);
  - failures fixed in the tokens, never per page.
- **The design guard test** (`scripts/design-system.test.ts`) gains rules:
  - no new `--apple-*` use;
  - no page-level `max-w-*` on `<main>` (widths come from templates);
  - no button text over 24 characters.

---

## 7. A permanent check (so it stays fixed)

`frontend/scripts/ui-audit` holds the crawler from §1:
- it runs against a local production build with a seeded test account, at 360 / 390 / 768 / 1024 / 1440 / 1920 px, light and dark;
- it writes a report plus a screenshot gallery.

**It fails when:**
- a page scrolls sideways;
- a control's text is cut off;
- a loader is still showing after 10 s;
- a page-load API call returns 5xx (except a known offline service);
- a desktop page uses less than 70% of the width beside the rail.

It runs before every release, next to lint and build.

---

## 8. Phases

| # | Phase | Delivers | Done when |
|---|---|---|---|
| 1 | **Shell + navigation** | `SectionShell` (rail for Learn / Practise / Companies, grouped), the phone section switcher, the header tab row removed, Mock Drives tabs into the rail, Practise right rail everywhere, "Drops 9+" fix | One navigation level on every page at every width; nothing off screen |
| 2 | **Templates + widths** | Templates A–E, every route assigned, the template B context panels (§4) | No page under 70% of the usable desktop width; no `max-w` on pages |
| 3 | **Broken states** | No endless loaders, the TCS prep state, the Postgres-offline state and honest session errors, the owner's three errors fixed on live | Crawler: 0 stuck loaders, 0 unexplained errors |
| 4 | **Phone + copy** | The F4 fixes, the button/chip copy pass, table scroll cues, one page header | Crawler clean at 360 / 390 / 430 |
| 5 | **Visual unification** | Mock Drives / drives / TPO / payment sheets on Warm Paper, dark-mode pass, contrast fixes, design-guard rules | Design guard passes with the new rules; dark screenshots reviewed |
| 6 | **Audit gate** | `scripts/ui-audit` in the repo, the report and gallery, and a final screenshot gallery for the owner (artifact) | Owner signs off on the gallery |

Each phase:
- is committed separately;
- runs lint, tsc, build and the backend suites;
- is checked in the browser at desktop and phone width in both themes.

---

## 9. Decisions for the owner

| # | Question | Suggested |
|---|---|---|
| U1 | Desktop navigation: **left rail for every section** (as on Practice now) or tabs on top everywhere? | Left rail everywhere; no tab row on desktop |
| U2 | The Practise rail groups (Coding · Tests & interviews · Skills · Rewards) as in §3.1? | Yes |
| U3 | Mock Drives: re-skin to the Warm Paper look and move its tabs into the rail? | Yes |
| U4 | Template B: a context panel beside task pages (Daily, Mock interview, …) instead of one narrow column? | Yes |
| U5 | The owner's "could not be loaded" / "Session expired" errors: deploy current `main` so they can be reproduced on live, or tell me how the site was run when the screenshots were taken | Deploy current main, then I check live |
