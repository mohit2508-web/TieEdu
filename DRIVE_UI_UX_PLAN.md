# Mock Drives — Apple-touch UI/UX + TPO Analytics Plan

Status: **PLAN (approved build order)** · Backend contract source: `DRIVE_ASSESSMENT_BRIDGE_PLAN.md`

This plan wraps the (already built) drive-bridge backend with a **first-class, Apple-quality product surface** and a **Superset-like analytics console for TPO**, for both desktop and mobile. The goal is one sentence: *TPO maps a test → student registers in one tap → plays the mock test → TPO instantly sees who registered, who wrote, who passed, and who is shortlisted — anywhere, on any screen, on a UI that feels like iOS.*

---

## 1. Design language — the "Apple touch"

Everything below is a component recipe, not pixel-perfect specs. The current frontend already uses a blue-tinted token system (`--brand-sky`, `--ink`, `--bg-surface`); we **extend it**, never fight it.

### 1.1 Type
- System stack, SF-Pro-like appearance, zero web fonts (faster + truest on Apple devices):
  `-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, sans-serif`
- Type scale (tokens): `display 34/41`, `title1 28/34`, `title2 22/28`, `title3 20/25`, `headline 17/22`, `body 17/22`, `subhead 15/20`, `footnote 13/18`, `caption 12/16`.
- Weights: 700 / 600 / 500 / 400 only (Apple rarely uses 800+ for body).

### 1.2 Color
- Primary action: iOS blue `#0A84FF` (light) / `#0A84FF` (dark) — **one blue for one action per screen**.
- System grays (light): `#F2F2F7` group bg, `#FFFFFF` cards, `#E5E5EA` separators, `2A2A2A` primary text / `#8E8E93` secondary / `#C7C7CC` tertiary.
- Semantic: green `#34C759` (pass/complete), red `#FF3B30` (fail/reject), amber `#FF9F0A` (shortlist/pending), teal `#64D2FF` (info).
- Both themes via `prefers-color-scheme: dark` using the existing CSS-var layer; **dark mode is a first-class target**, not an afterthought.

### 1.3 Shapes, depth, motion
- Cards: `border-radius: 16–20px` (rounded-2xl/3xl), hairline `1px` border + `0 1px 2px` soft shadow; hover = translateY(-1px) + larger shadow.
- Sheets / modals: iOS bottom-sheet on mobile (`backdrop-blur`, rounded top 24px, drag handle), centered dialog on desktop.
- Buttons: capsules (`pill`), 44px+ touch targets, `press state` = scale(0.97).
- Segmented control: iOS style (sliding highlight) for Drive type / status filters.
- Motion: 200–300ms `spring` from framer-motion (already a dependency); list items stagger 30ms.
- Icons: lucide (already used) with 2px stroke — closest available to SF Symbols.

### 1.4 Shell (navigation)
- **Desktop:** top bar (nav pills + pill search + avatar) + sidebar for TPO/Admin consoles; content `max-w-5xl/7xl`.
- **Mobile:** existing bottom tab bar (native feel) + pushed detail screens with a native-style collapsed header (back chevron + title) — already how `/drops` and `/interview-course` work via `navConfig`.
- **TPO/Admin:** mobile gets an iOS-style segmented top tab or bottom tab; desktop gets a fixed sidebar group nav.

---

## 2. Student surface (Apple-touch)

### 2.1 `/drives` — list
- **Desktop:** hero header + search pill + filter capsules (All / Mock / Assessment / Quiz / Open for my college) + responsive card grid.
- **Mobile:** single-column list with iOS-style group headers ("Open for you", "Registered", "Ended") — borrow the `drops` feed rhythm but with cards.
- Each card: company glyph avatar (initials tile), title, company row, round count ("3 rounds"), window date, and a **status chip** (Open / Registered / In progress / Completed).
- Empty + error + loading skeletons in the Apple style.

### 2.2 `/drives/[driveId]` — detail
- Hero: gradient tile with company initials, title, company, window, drive type + status chips.
- "Register" → capsule blue button (or "Registered ✓" state; or eligibility blockers shown as a clean red alert card with reason + "Update profile" action).
- **Rounds timeline**: iOS-style grouped list — Locked (gray, lock icon) / Unlocked / Start / Resume / Retake; per-test meta (duration, questions, attempts used of max).
- Launch = same-tab redirect to `launch_url` (already implemented) — button label "Start", "Resume" or "Retake".
- Results section (when visible): per-round **score ring (SVG progress ring)** + % + pass/fail chip + section breakdown.
- Sticky bottom action bar on mobile (safe-area padded) so Register/Start is always reachable.

### 2.3 Profile completion sheet (`/account` integration)
- "Add your college profile" opens an iOS sheet: roll no, branch, batch, CGPA, backlogs. Addresses the `profile_missing` eligibility blocker. Auto-saves via `/api/me/student-profile`.

### 2.4 States that must look native
skeleton loading · empty ("No drives right now") · offline/503 (bridge is PG-only) · locked/not-shortlisted · results-not-published yet · invite-only (paste/read invite link).

---

## 3. TPO Portal — the Superset-like analytics console

New TPO area `/tpo/drives` becomes a full app with a sidebar (desktop) / segmented top tabs (mobile).

### 3.1 Tabs
1. **Overview (analytics dashboard)**
2. **Drives** (map + publish + rounds)
3. **Registrations** (roster + import + shortlist)
4. **Results** (scores, pass/fail, export)

### 3.2 Overview — Superset-style KPIs & charts
- **KPI cards row** (per selected drive, or all drives of the college):
  - Registered
  - Launched / Started
  - Completed
  - Attendance % = started ÷ registered
  - Completion % = completed ÷ registered
  - Pass %
  - Shortlisted (per current round)
  - Avg score / best score
- **Charts** (pure SVG, no chart lib — light + deterministic):
  - Bar: registrations per day over the window
  - Horizontal bars: per-round completion % (each round vs its target registered base)
  - Distribution: score histogram (buckets 0–100)
  - Donut: registered / started / completed status mix
- **Recent rows**: latest registrations with status chips + a "view" affordance.

### 3.3 Data the TPO must see (completeness requirement)
> Per drive: for every student → registered?, started?, per-round status (locked/unlocked/launched/in_progress/completed/not_shortlisted), attempts used, best %, best attempt id, score/pass/fail, submitted timestamp, disqualified flag. Plus an "unmatched webhook" count so the TPO can audit integrity. All filterable by branch / batch / status, searchable by roll no / name, paginated.

### 3.4 Drives tab (mapping)
- Create drive (Apple form sheet), edit window, set eligibility (min CGPA, max backlogs, branches, batches), attach rounds (choose provider test, set attempts, open/close, unlock rule), **publish** (guarded: attach at least one round), **close**.
- Drive cards with status chips + quick actions (Dashboard / Rounds / Roster / Results).

### 3.5 Registrations tab
- Table (desktop) / card list (mobile) with search + filters.
- Import roster (roll numbers, one per line → or CSV file), claims via `placement_student_link`.
- Manual add by user id.
- **Shortlist**: per-round toggle ("Mark not-shortlisted / Unlock") — drives `drt.status` and hides the round from the student.
- CSV export (admin-scoped endpoint already exists).

### 3.6 Results tab
- Live table of attempts: roll no, round, status, score/max, %, pass/fail chip, submitted at, violations flag.
- Filters: round, pass/fail, disqualified.
- **Publish results** button (flips `results_published`) with the student-visibility rule honoured server-side.
- **CSV export** + per-student detail drawer.

---

## 4. Admin console polish
- Existing **Mock Drives** tab restyled to the same language: providers, tests, drives, plus an admin-level **analytics view across all colleges** (same KPI charts, segmented by college).
- Providers/tests become grouped list cards, not bare tables.

---

## 5. Backend additions required (small, additive)

Analytics + filtering are the only missing data service. Add to `driveAdmin.routes.ts` (reused by the TPO mount):

```
GET  /api/placement/drives/:driveId/stats
  → { registered, started, completed, absent, disqualified,
      attendance_pct, completion_pct, pass_pct, avg_score, best_score,
      per_round: [ { test_id, name, unlocked, launched, completed,
                     not_shortlisted, attempts, avg_pct } ],
      daily_registrations: [ { day, count } ],
      score_histogram: [ { bucket, count } ] }

GET  /api/placement/drives/:driveId/registrations?search=&branch=&batch=&status=&page=&limit=
GET  /api/placement/drives/:driveId/attempts?test_id=&result=&page=&limit=
GET  /api/placement/drives?status=            (already exists)
```

- Aggregate queries in PostgreSQL; **no new schema**.
- Keep 503-on-PG-down contract; keep per-college scoping (`loadScopedDrive`).
- `posted → launch → completed` funnel uses existing `drive_launch`/`drive_attempt`/`drive_registration_test` rows.

---

## 6. Implementation phases (build order, each ends on `tsc` + app build green)

**Phase 1 — Design system + student Apple-touch**
- tokens: type scale, semantic colors incl. dark; shared `Card`, `Pill`, `SegmentedControl`, `ScoreRing`, `BottomSheet`, `ListRow`, `KpiCard`, skeletons.
- Restyle `/drives` + `/drives/[driveId]` + profile sheet + account entry.
- Verify: `npm run typecheck` (frontend), manual on iPhone-width + desktop.

**Phase 2 — Backend analytics endpoints**
- add `/stats`, filtered registrations, filtered attempts; extend the existing CSV endpoint filters.
- Lock with a test in `scripts/drive-bridge.test.ts` (stats shape + scoping) where DB is available; typecheck gate otherwise.

**Phase 3 — TPO console (Superset-like)**
- `/tpo/drives` rebuilt as the 4-tab app: Overview (KPIs + 4 charts), Drives (mapping + publish), Registrations (import/shortlist/export), Results (table/export/publish).
- Mobile segmented tabs; desktop sidebar. Fully scoped by `x-college-id`.

**Phase 4 — Admin polish + cross-college analytics**
- restyle Mock Drives tab; add all-colleges Overview; providers/tests grouped cards.

**Phase 5 — Hardening + E2E pass**
- Full happy + edge flows against a live PG (mock-provider): register → launch → start → finish → result visible → shortlist → publish results.
- 503 path, unmatched events, pagination, dark mode audit, build both apps.

---

## 7. Definition of "Done / like Superset"
- TPO logs in from any college → sees their drive analytics with zero config-per-drive.
- Mapping a drive takes ≤ 3 actions (create → attach rounds → publish).
- A student registers in ≤ 2 taps; the mock test opens in the same tab; results appear when published.
- Every number on the dashboard is provable against the DB (add a "data pulled at HH:MM" caption).
- Same quality on ~390px and ~1440px widths, light + dark.