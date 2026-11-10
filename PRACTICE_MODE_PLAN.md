# Practice Mode Plan: DSA, company sets, company tests, IDE, design fixes

Status: **plan, waiting for the owner's decisions (§12)**. Nothing in this plan is built yet.
Date: 2026-11-10.

This plan replaces the quick `/code` pages (commit 8328907). It keeps their engine: the Piston runner, `/api/code` and the 65 verified problems.

---

## 1. What is wrong today (owner's review + audit)

### 1.1 Structure and navigation

| Problem | Where | Effect |
|---|---|---|
| Coding sits on an orphan `/code` page | No menu links to it | Students cannot find it |
| 65 problems in one long sidebar list, each prefixed "Coding: …" | Company page reader (`/company/tcs-nqt`) | A wall of items with no path and no grouping |
| Company tests run inside **Skill Test** (`/skill-test/<slug>/assessment`) | Prep page, Train, result links | Company mocks look like skill certificates. Two different products are mixed up |
| "Practise" menu = Skill Test, Daily, Mock interview, Peer mock, English coach, Drives | `navConfig.ts` | No DSA, no company sets, no company tests |
| Problems are stored per company (`TCS_NQT_CODING`) | `data/companyTests/tcsNqtCoding*.ts` | A second company means duplicating common problems (reverse array, Kadane…) |
| The lock is a small padlock icon, with no reason and no action | `/code` list | The student does not know what is locked or how to unlock it |
| No overall progress or path | Everywhere | "Where do I start, what next?" has no answer |
| The admin cannot see who practises what | Admin | No per-student or per-problem view of practice |

### 1.2 The editor (`/code/[id]`)

- **Not full screen.** It is a page with the site header, festival garland and footer, with the problem and editor squeezed into `max-w-[1400px]`.
- **No resizable panes, no console panel, no test-case tabs.** The result is dumped below the editor.
- **Editor features are missing:**
  - compile errors are not marked on the line where they happen;
  - no font-size, theme or tab-size settings;
  - no format button;
  - no keyboard shortcuts;
  - no fullscreen toggle;
  - no list of the student's own submissions.
- **On a phone** the Problem/Code tabs work, but the editor height is fixed at 420 px, there is no sticky Run/Submit bar, and the on-screen keyboard covers the result.

### 1.3 Typography and visual audit (whole frontend, measured)

| Finding | Count | Why it matters |
|---|---|---|
| `text-xs` (12 px) | **1,875** uses | Most labels, meta lines and chips are 12 px, which reads as "tiny" on laptops |
| UPPERCASE + letter-spaced micro-labels (`text-xs`/`11px` + `uppercase`) | **408** | Chips like "EASY · DIGITAL / PRIME · ASKED OFTEN · FREE PREVIEW", and eyebrows like "TCS — NQT / TOPICS": shouty, low-contrast, hard to scan |
| `text-[10px]` / `text-[11px]` / `text-[13px]` / `text-[12.5px]` | 12 | Below or off the type scale (the tailwind config says "nothing below 12px") |
| `font-extrabold` / `font-black` on the **body font (Mukta, which ships only 400–700)** | **298** class strings | The browser fakes the extra weight: smeared, heavier-than-designed text |
| `font-black` (900), which no loaded font has | 35 | Faked everywhere it is used |
| Weight inflation: semibold 1,032 + bold 1,481 + extrabold 345, against normal 32 + medium 124 | — | When everything is bold, nothing stands out. There is no hierarchy |
| Hard-coded greys and whites: `text-gray-*` 951, `bg-white` 485, `bg-gray-*` 230, `border-gray-*` 401 | ~2,070 | These ignore the theme tokens (`text-heading`/`body`/`muted`, `bg-card`/`surface`), so dark mode and Warm Paper drift apart. The new code screens use them too |
| Two display systems: h1/h2 in Poppins, h3+ in Mukta, and `font-display` used ad hoc | — | Section titles inside one page switch typeface |
| Tabs (e.g. "Solution / Discussion (0)") | Company reader | 14 px tab label with a thin underline and a low-contrast inactive state; the tab bar touches the content |

**Worst screens to fix first:** the company reader (chips, sidebar, tabs), the `/code` list, the skill-test result pages, the admin tabs (DrivesTab has 96 × `text-xs`, EmailTab 70, SettingsTab 50) and the course animation blocks.

---

## 2. Goals

1. **One home for practice.** Practise → DSA, company sets, aptitude practice and company tests. Skill Test stays separate (certificates).
2. **A path, never a pile.** Every list is grouped, ordered and shows "start here / next".
3. **A professional IDE**, close to LeetCode or HackerRank, that also works on a phone.
4. **One problem bank, many companies.** A problem is written once and tagged to every company that asks it.
5. **A clear lock.** Locked items are visible with a lock and a reason. Clicking one opens the company-pack sheet with the real price.
6. **Company tests are their own product.** They get their own runner, result report and readiness link, not the skill-test shell.
7. **The admin sees everything:** who practises, what, how well, and where content is thin.
8. **One typography system**, applied everywhere, and enforced by a test.

---

## 3. Information architecture

```
Practise (top nav)
└── /practice                      Practice home: continue, streak, today's set, readiness by company
    ├── /practice/dsa              DSA sheet: topics in study order, progress per topic
    │   └── /practice/dsa/[topic]  Topic page: lesson card + problems easy→hard + "common in" company badges
    ├── /practice/companies        Company sets grid (TCS NQT, Infosys, Accenture, …), each with progress and lock state
    │   └── /practice/companies/[slug]   Company practice: Coding set · Aptitude sets · Sectional tests · Full mocks
    ├── /practice/aptitude         Topic-wise MCQ practice (Numerical, Reasoning, Verbal, Advanced)
    ├── /practice/tests            Every company test: full mocks, sectional tests, coding rounds; past results
    │   └── /practice/test/[slug]  NEW test runner (MCQ sections + coding with the IDE), then its own result report
    ├── /practice/problem/[id]     The IDE (full screen, own layout, no site header)
    └── /practice/progress         My submissions, solved by topic and company, heatmap, test history
Skill Test (stays under Practise in the menu, but separate) → certificates only
```

- `/code` and `/code/[id]` redirect to `/practice/dsa` and `/practice/problem/[id]`.
- The company page's Train tab links to `/practice/companies/[slug]` instead of listing 65 items in the reader sidebar.
- The company reader keeps only lessons and interview answers.
- Prep (`/prep/[slug]`) Test tab buttons point to `/practice/test/...` instead of `/skill-test/...`.

### 3.1 Practice home (`/practice`)

- **Continue:** the last problem or test, with one button.
- **Today:** 1 aptitude set + 2 coding problems, picked from the student's target company and weakest topic.
- **Readiness by company:** the existing readiness score, with links into that company's practice.
- **Streak and a 12-week activity heatmap**, fed by the existing streak lib.

### 3.2 DSA sheet (`/practice/dsa`)

- **Topics in study order:** Basics & math, Arrays, Strings, Hashing, Two pointers, Sliding window, Prefix sums, Sorting & searching, Recursion & backtracking, Bits, Stack & queue, Linked list, Trees, Graphs, Greedy, Dynamic programming.
- **Each topic card shows:** solved/total, difficulty mix, the topic's lesson (the coding lessons we already have), and "Asked by: TCS · Infosys · …".
- **Filters:** difficulty, company, status (todo / attempted / solved), and "reported" (PYQ) only. Search by title.
- **Pattern view** (optional toggle): the same problems grouped by the trick they use.

### 3.3 Company practice (`/practice/companies/[slug]`)

Tabs:

- **Coding:** the company set, in levels, with the reported questions marked.
- **Aptitude:** topic sets from that company's bank.
- **Tests:** sectional tests and full mocks, with best score and attempts.
- **Readiness:** the existing score and the fix list.

The header shows pack status: owned, or "N items locked · Unlock for ₹X", with a button that opens the buy sheet.

---

## 4. Data model: one bank, many companies

**Problem** (global, `db.coding_problems`, seeded from data files and editable by the admin later):

```
id, slug, title, statement, input_format, output_format, constraints[], samples[], hints[], approach, complexity,
solutions{c,cpp,java,python}, tests[] (server only), difficulty, topics[] (DSA sheet), pattern,
companies: [{ slug, kind: 'reported' | 'practice', note, year? }], status: draft | published, version
```

**Company set** (`db.company_sets` or in the company record):

```
company_slug, levels: [{ name, problem_ids[] }], free_ids[] (always open), mock: { count, minutes, pool_ids[] }
```

**Adding a company:**

1. Tag the existing problems the company also asks with `companies: [{slug}]`.
2. Add any new problems.
3. Create the set (levels plus free ids).

There is no copying: Kadane is one problem that shows up in every company that asks it. "Common questions" is just the problems tagged with 2 or more companies, shown as a row on `/practice/dsa`.

**Migration:**

- The 65 TCS problems move into the global bank with `companies: [{slug: 'tcs-nqt', kind}]` and `topics[]` mapped from their current topic.
- `tcsNqtCoding.data.ts` becomes the seed.
- The `/api/code` routes stay, plus `?company=`, `?topic=` and `?status=` filters.

**Submissions:** `db.code_submissions` already exists. Add `ms_total`, `source: 'practice' | 'test'`, and a per-user rollup (`db.practice_progress`: solved ids, attempted ids, last activity, per-topic counts) so lists load fast.

---

## 5. Access and locking

The rule is one function, `accessFor(user, problem | test)`. It returns `open` or `locked` with a reason and the company to buy.

- **Free for everyone** (decision D1 sets the size):
  - the DSA core sheet (suggested: about 40 basic problems across topics);
  - each company's `free_ids` (the first 3 per company today);
  - lessons' first item;
  - 1 demo mock attempt.
- **Locked:** everything else in a company set or company test, unless the student owns that company's pack or is a TieEdu member.
- **A problem in several companies** is open if any of the student's packs covers it.
- **UI:**
  - Locked rows stay visible, with a lock chip that says "In TCS NQT pack".
  - The statement is readable (it is good for SEO and for selling); Run and Submit, the approach and the solutions are locked.
  - Clicking a locked action opens the company's buy sheet with the real ladder price and what the pack contains, then returns the student to the same problem after purchase.
- **Server:** every gated route checks `accessFor` (as `/api/code` does today). The UI never decides access alone.

---

## 6. The IDE (`/practice/problem/[id]`)

### 6.1 Desktop layout (full screen, own minimal header)

```
┌ ← Back · TCS NQT › Arrays · ◀ Prev  [≡ Problem list]  Next ▶ ·  ⏱ (tests only) ·  Run (Ctrl+')  Submit (Ctrl+Enter) ┐
├──────────── Left pane (resizable) ─────────────┬──────────── Right pane ────────────────────────┤
│ Tabs: Description · Hints · Solution · Submissions │ Toolbar: Language ▾ · Reset · Format · ⚙ · ⛶  │
│  title, difficulty, tags (topic, companies,    │  Editor (CodeMirror 6)                          │
│  reported), statement, formats, constraints,   │   line numbers, autocomplete, bracket close,    │
│  samples with copy buttons                     │   error underline + gutter markers              │
│                                                ├─────────── Console (resizable, collapsible) ────┤
│                                                │ Tabs: Testcases (Case 1, 2, + custom) · Result  │
└────────────────────────────────────────────────┴────────────────────────────────────────────────┘
```

**Panes**

- Both splits (left/right and editor/console) are draggable. Sizes are remembered per user.
- Fullscreen (⛶) hides the toolbar chrome.

**Description tab**

- Statement at 16 px with 1.6 line height. Samples are in monospace boxes with copy buttons.
- Tags are sentence-case chips at 13–14 px: Easy, Arrays · Two pointers, Asked by TCS, Reported.

**Hints tab**

- Hint 1, then Hint 2 (one at a time), then the approach. This is the help ladder.

**Solution tab**

- Locked unless the student has access. It warns "You have not solved this yet — open anyway?"
- Shows the solution in every language, with complexity.

**Submissions tab**

- The student's past submissions: verdict, tests passed, language, time.
- Clicking one loads that code into the editor.

**Editor**

- CodeMirror 6, already installed and mobile-friendly. Decision D3 asks whether to use Monaco on desktop instead.
- Language templates (starter code).
- Settings: font size 13–20, tab size 2/4, light/dark/high-contrast theme, word wrap, vim keys optional.
- Autosave per problem and language. A "Restore last submission" option.

**Error markers (the "linting")**

- Compile errors from gcc, javac and Python tracebacks are parsed into line/column.
- They are shown as red squiggles plus gutter markers, and clicking one jumps to the line.
- Python also gets a quick syntax check before Run.
- A real language server (full IntelliSense) is out of scope; it needs a server per language (D3).

**Format**

- clang-format (C/C++), google-java-format and black can run on the runner box as one more Piston-style job.
- For phase 1, the button only re-indents.

**Console**

- **Testcases:** sample cases as tabs, editable, plus "+ Add case". Run uses these cases.
- **Result:** the verdict banner (Accepted, Wrong answer, …) with passed/total and runtime.
- Each case shows input / expected / your output, with a line diff highlight.
- Hidden tests are shown as a pass/fail strip only.
- Compile errors appear here too, with clickable lines.

**Shortcuts**

- Ctrl+' Run, Ctrl+Enter Submit, Ctrl+S save (no-op notice), Ctrl+/ comment, Alt+↑/↓ previous/next problem.

### 6.2 Phone

- **Tabs:** Problem · Code · Console.
- **A sticky bottom bar** with Run and Submit (48 px targets).
- The editor fills the screen minus the bar. A symbol row above the keyboard offers ; { } ( ) [ ] < > = " ' Tab.
- The result opens as a bottom sheet, so the keyboard never hides it.

### 6.3 In a test

The same IDE with:

- a timer;
- the problem switcher limited to the test's problems;
- no Hints, Solution or Submissions tabs.

Leaving fullscreen counts towards the secure-mode strikes. Unlike the fallback, we keep secure mode on, because the student no longer needs their own compiler.

---

## 7. Company tests, separate from Skill Test

- **New route:** `/practice/test/[slug]`, with its own shell.
  - Start screen: pattern table, rules, attempts left, pack status.
  - MCQ sections reuse the existing sectional engine (`useSections`, secure mode).
  - Coding sections use the IDE (§6.3).
- **Its own result report**, at `/practice/test/[slug]/result/[attemptId]`:
  - overall and section scores;
  - the coding section per problem: tests passed, language, time;
  - comparison with the previous attempt;
  - answer review;
  - "what to fix", with links to the exact topic sets and lessons;
  - the readiness change (was → now).
- **Data:** keep the existing skill/assessment records (no data migration), marked `kind: 'company_test'`.
  - The skill-test pages, catalogue and certificates skip company tests.
  - The new routes serve them.
  - The old `/skill-test/<company-mock>` URLs redirect.
- **Test types:**
  - full mock (the company's real pattern);
  - sectional (one section);
  - coding round (2 problems, 90 min);
  - topic quiz (practice mode, untimed).

---

## 8. Progress and readiness

- **Per student:**
  - solved/attempted per topic and per company;
  - acceptance rate;
  - streak and heatmap;
  - test history with trend;
  - readiness per company. The existing score gains a coding component: solved share of the company set plus the mock coding score.
- **"Next best step"** on every hub page, using the existing weak-area logic plus unsolved problems in the weakest topic.

---

## 9. Admin: who practises what

A new **Practice** tab in the admin console:

- **Overview:**
  - daily active practisers;
  - problems solved and submissions per day;
  - tests taken;
  - runner health (Piston up/down, average run time, error rate).
- **Students:**
  - a searchable table: target company, problems solved, last active, tests taken, best mock, readiness;
  - a click opens a student timeline (submissions with verdicts and code, tests, lessons read).
- **Problems:**
  - per problem: attempts, acceptance rate, average tries to solve, most common wrong verdict;
  - flags for broken problems (for example 0% acceptance with many attempts).
- **Companies:** funnel per company — viewed → started practice → took the demo mock → bought the pack → full mocks → readiness ≥ 70.
- **Content coverage:**
  - per company: problems per topic, MCQs per section (against the mock's needs), lessons;
  - gaps shown in red.
- **CSV export** for every table.
- **Later (phase 6):** a problem editor (statement, samples, tests upload, solutions, run all solutions on the runner before publishing).

---

## 10. Design system fixes (portal-wide)

### 10.1 Type scale

**Body text:**
- 16 px body, 1.6 line height.
- 14 px secondary text.
- **12 px only for legal text and timestamps.**

**Headings:**

| Level | Size / line height | Font |
|---|---|---|
| h1 | 32/38 | Poppins 700 |
| h2 | 24/30 | Poppins 600 |
| h3 | 18/26 | Mukta 600 (body family) |

**Labels and chips:**
- Labels are 14 px, Mukta 500.
- Chips are 13–14 px sentence case. **No uppercase + tracking for chips.** Uppercase is kept only for one eyebrow style, at 12 px / 600 / 0.06em, used sparingly.

**Weights:**

| Font | Weights allowed |
|---|---|
| Mukta (body) | 400, 500, 600, 700 only. Remove `font-extrabold` and `font-black` from Mukta text (298 places) |
| Poppins (display) | 600, 700 for h1/h2. `font-extrabold` only on the hero number. Remove `font-black` (35) |

### 10.2 Colour tokens

- Replace `text-gray-*`, `bg-white`, `bg-gray-*` and `border-gray-*` with tokens: `text-heading`, `text-body`, `text-muted`, `bg-card`, `bg-surface`, `border-line`.
- Do this screen by screen, starting with the practice, test and company screens. (About 2,070 occurrences in total; the admin screens come last.)

### 10.3 Shared components

New components in `components/ui`:

- **`Tabs`:** 15 px / 600 labels, 2 px active underline in `signal`, 44 px height, muted inactive state with hover, a gap above the content, scrollable on phones.
- **`Chip`:** sentence case, 13 px, 28 px tall; tones neutral, success, warning, danger, info, locked.
- **`StatusIcon`:** todo / attempted / solved.
- **`LockBadge`:** shows "In TCS NQT pack" and opens the buy sheet when clicked.
- **`PageHeader`:** breadcrumb, title, actions.

### 10.4 A guard test

`scripts/design-guard.test.ts` fails the build when a changed file adds any of these:

- `text-[<12px]`;
- `font-black`;
- `font-extrabold` without `font-display`;
- `uppercase` on chips;
- new `text-gray-*` or `bg-white` in practice, test or company components.

This works like the existing `design-tokens.test.ts`.

### 10.5 Pages in the first design pass

The practice pages, the IDE, the test runner and its result, the company reader (chips, sidebar grouping, tabs), and the prep page tabs. The rest of the portal follows in phase 7.

---

## 11. Phases

| # | Phase | Main deliverables | Done when |
|---|---|---|---|
| 0 | Runner up | Azure Piston restarted with swap and auto-restart; all 65 × 3 solutions verified live (C++ included) | `verifyCodingSolutions.live.ts` shows 0 failed |
| 1 | Foundations | Global problem bank + company sets + `accessFor` + progress rollup; the 65 TCS problems migrated with topics; `/code` redirects | API tests: access matrix (free / pack / member / test), filters, rollups |
| 2 | IDE | Full-screen `/practice/problem/[id]`: resizable panes, console with testcases/result, error markers, settings, shortcuts, submissions tab, phone layout | Works on 360 px and 1440 px screens; keyboard-only flow; dark mode |
| 3 | Practice hub | `/practice`, DSA sheet, topic pages, company sets, aptitude practice, progress page; nav "Practise" updated; lock + buy flow | A new student can go home → topic → problem → solve → next without the URL bar |
| 4 | Company tests | `/practice/test/*` runner and result report; prep, company and Train links moved; skill-test excludes company tests; old URLs redirect | A full TCS mock (MCQ + coding with the IDE) end to end, with a result report and readiness update |
| 5 | Admin Practice tab | Overview, students, problems, companies funnel, coverage, CSV | The owner can answer "who studied what this week" in one screen |
| 6 | Content tools | Admin problem editor with tests upload and a run-all-solutions check; MCQ bank import from `tcs-sources/material` | A new company's DSA set can be added without code |
| 7 | Design pass | Type scale, weights, chips, tabs and tokens across the remaining portal; the design guard test | Guard test green; before/after screenshots of the 10 worst screens |

Phases 0–4 deliver the student experience the owner described. Phase 5 is the admin view; phases 6–7 are scale and polish.

---

## 12. Decisions needed from the owner

| # | Question | Suggested default |
|---|---|---|
| D1 | How much DSA is free? | A free core sheet of ~40 basic problems (all topics, easy). Company sets: first 3 free, the rest in the pack |
| D2 | Should the admin see students' submitted code? | Yes (the admin and the student's TPO only), with a privacy line in the policy |
| D3 | Editor | CodeMirror 6 everywhere (fast, mobile-friendly, error markers from the compiler). Monaco only if you want VS-Code feel on desktop (heavier; poor on phones) |
| D4 | Keep secure mode during coding in tests? | Yes, now that the IDE runs code; fall back to paused mode only if the runner is down |
| D5 | Which companies get DSA sets after TCS? | Infosys SE, Accenture, Cognizant GenC, Wipro (tag shared problems first) |
| D6 | The runner VM | Stay on the 1 GB Azure VM with swap for now; move to 2 GB (B2s) when daily submissions pass ~500 |
| D7 | Name in the menu | "Practise" (British spelling, as today) with sub-items DSA · Company sets · Aptitude · Tests · Skill Test |
