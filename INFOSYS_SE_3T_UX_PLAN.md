# Infosys SE: one clear Train · Test · Track path (UX fix plan)

Scope: **only Infosys Systems Engineer (SE)**. Copy it to other companies only after this one works 100%.
Goal: a final-year student opens TieEdu, picks Infosys SE once, and from then on every screen shows only that company's path:
**Free demo test → see weak areas → learn → section tests → mocks → readiness → (buy pack) → daily plan until test day.**

---

## 0. Problems found (what you reported + what the code confirms)

| # | Problem | Cause in code |
|---|---|---|
| P1 | Train content unreadable: questions in a side tree, no clear lesson, no exit | Lessons are stored as "interview question" items and open in the old interview reader (`IntelligenceTreeSidebar`) |
| P2 | Lessons too thin to teach anything | 25 short lessons (one note each), no worked examples or practice |
| P3 | Navbar shows "Accenture" / random company | `DriveChip` reads `tieedu_next_drive` from localStorage, written by the Today countdown for *whichever drive is nearest*, not the company the student chose |
| P4 | Different "days left" everywhere (28 here, 50 there) | Three sources: drive calendar (`DriveCountdown`), header chip (localStorage copy), prep plan (`prep_progress.test_date`, default 50 days) |
| P5 | Company tests open the general Skill Test pages ("Back to skill test", skill-test result, certificates) | Company mocks reuse `/skill-test/[slug]/…` pages without company context |
| P6 | Back button leaves the company entirely | Company page sub-views (module reader, item reader) use URL query, but navbar "Companies" and some back links go to `/companies` |
| P7 | No clear "what's free / what's in the pack / where to buy" | Pack card is deep in the page; no buy prompt on locked content; no list of what the pack contains |
| P8 | After buying, page still sells the pack | Company page is the same for owners and non-owners; owner should land on their dashboard |
| P9 | Portal not user-specific | No stored "target company" for the user; every screen guesses |

---

## 1. The core change: one target company per student

- New field on the user: `target_company` = `{ slug, test_date, chosen_at }` (stored server-side in `prep_progress` + user record, so it is the same on phone and laptop).
- **First visit after login (final-year students):** a full-screen sheet "Which company are you preparing for?" listing the 5 live programs (Infosys SE first), plus "Not sure yet". Then: "When is your test?" (date picker, or "I don't know: give me a 50-day plan").
- Can be changed later from: profile menu → "My target company", and the company page ("Make this my target").
- **Everything reads only this one value:**
  - Navbar chip: `Infosys SE · 50d` → links to `/prep/infosys-systems-engineer` (no more Accenture).
  - Today screen: PrepCard for the target company only; the drive-calendar countdown card is removed from Today (it moves to the Calendar page).
  - Days left: one source only (`test_date` in prep). Fixes P3, P4, P9.

## 2. The company page becomes two different pages

### 2a. Not bought yet (visitor / free student): a sales + demo page, in this order
1. Hero: name, package ₹3.6–4.2 LPA, 3 rounds, difficulty 2/5, **"Take the free demo test"** (big) + "See what's in the pack" (small).
2. **How the selection works**: 3 rounds as simple cards (Online test 54 Qs / Technical interview / HR interview) with time, sections and marks.
3. **Free demo test**: 1 full mock (54 Qs, real pattern) free, once. After it: result with section scores → "Your weak area: Verbal (40%). Read these 3 free lessons, then retest."
4. **Free lessons**: first lesson of every section is free (5 lessons), rest locked with a lock icon.
5. **What's in the pack (₹169)**, as a checklist with real counts pulled from data:
   - 25+ topic lessons with worked examples and practice
   - 5 section tests (Math, Reasoning, Verbal, Pseudocode, Puzzle), unlimited retakes
   - Unlimited full mocks (54 Qs, real pattern)
   - Day-by-day plan to your test date + readiness score + weak-area fix list
   - 20 technical + 12 HR interview answers
   - Validity: until your test date / 6 months
6. FAQ, seniors' tips, eligibility.
- **Buy prompt (popup)**: whenever a locked lesson/test/answer is clicked → sheet "Unlock Infosys SE prep pack · ₹169" with the checklist above and one "Buy pack" button. One price, one place. No price anywhere else on the site.

### 2b. Bought (pack owner): the company page **is** the dashboard
- Visiting `/company/infosys-systems-engineer` as an owner redirects to `/prep/infosys-systems-engineer` (no "Buy" anywhere; a small "Pack active ✓" badge).
- Dashboard (already started in `/prep/[slug]`, to be finished):
  1. Readiness 0–100% ring + band + "+6% this week".
  2. Test date + days left (editable).
  3. **Today's tasks** (2–3 items) with tick boxes.
  4. **Train · Test · Track tabs** on the same page:
     - **Train**: lessons grouped by section, progress bar per section, tick when finished.
     - **Test**: section tests + full mocks + revision tests, each with last score and "Retake".
     - **Track**: score trend chart per section, all attempts list, weak topics, fix list.
  5. Roadmap: all days with ticks (done / today / upcoming).
- Free students also see this dashboard (with locks) once they have taken the demo test, so the habit starts before buying.

## 3. Train: a real lesson reader (fixes P1, P2)

- New page: `/prep/infosys-systems-engineer/learn/[lessonId]` (inside the company, not the old interview reader).
- Layout: clean single column, readable (18px text, max 70 characters a line), sticky top bar with **← Exit to my plan**, section name, "Lesson 3 of 6".
- Every lesson has the same 5 parts:
  1. **What it is** (2–4 lines)
  2. **Formulas / rules** (boxed)
  3. **Worked examples** (3, solved step by step, Infosys-style)
  4. **Shortcuts & traps**
  5. **Try it** (5 practice MCQs, instant answer + explanation)
- Bottom: **Mark as done** → "Next lesson" / "Take the Math section test".
- Lesson done is ticked automatically when the student finishes the 5 practice questions (no manual tick needed).
- Admin: lessons are edited in Admin → Companies → Infosys SE → Lessons with these 5 fields (markdown + practice question picker), so you can add/replace content any time; the plan picks new lessons up automatically.

### Content I will write now (from the Infosys papers you gave + standard syllabus)
| Section | Lessons |
|---|---|
| Mathematical Ability (10 Qs) | Number system · Percentages & profit-loss · Ratio, mixture & ages · Time-work & time-speed-distance · Permutation, combination & probability · Simple/compound interest |
| Reasoning (15 Qs) | Series & analogies · Coding-decoding · Blood relations & directions · Seating arrangement · Syllogisms & statements · Data sufficiency |
| Verbal (20 Qs) | Reading comprehension · Sentence correction & grammar · Fill in the blanks / vocabulary · Para jumbles · Sentence completion · Email writing |
| Pseudocode (5 Qs) | Loops & tracing · Recursion · Arrays & strings · Bit operations & operators |
| Puzzle solving (4 Qs) | Grid/sudoku-style puzzles · Arrangement puzzles · Logic puzzles |

≈25 full lessons × 5 practice Qs = 125 new practice questions. You can replace or add your own content later from Admin.

## 4. Test: all company tests stay inside the company (fixes P5)

- Company tests open at `/prep/infosys-systems-engineer/test/[testSlug]` (same secure test engine underneath, but company header, company exit, no Skill Test links).
- Result page for company tests: section scores, time per section, wrong questions with explanation, **"Weak: Verbal → read these lessons → retest"**, and "Back to my Infosys plan". No "Back to skill test", no certificate, no skill passport.
- Test types:
  - **Demo mock** (free, 1×), **Full mocks** (pack, unlimited, questions shuffled from the bank)
  - **Section tests** (pack, 5, unlimited retakes)
  - **Revision tests** (pack, 10–15 Qs mixed from weak sections, auto-made)
- Company mocks are already hidden from the Skill Test list; also block their direct URLs under `/skill-test/…` (redirect to the company route).

## 5. Track: one place, always correct

- Readiness = 60% test scores (section weights 10/15/20/5/4) + 25% lessons done + 15% practice consistency (last 14 days). Shown identically on Today, navbar tooltip, dashboard.
- Track tab: line chart of each section's last 5 scores, full mock history, "most missed topics", streak.
- After every test: readiness recomputed and shown on the result ("Readiness 42% → 48%").

## 6. Navigation (fixes P6)

- Inside the company flow, a second sticky bar: **Infosys SE · Plan · Train · Test · Track**. Always visible on lesson, test and result pages.
- Browser Back and the Exit button always return to the previous step inside the company (dashboard tab → lesson → back to dashboard tab).
- Navbar "Companies" still opens the list; the target company's chip gives one-tap return.

## 7. Verification (I will test 100% before telling you it's done)

Automated end-to-end script against a fresh local database, run for 3 students:
1. New student → target-company sheet appears → picks Infosys SE + date → navbar chip and Today show Infosys SE with the same days left.
2. Free student: demo mock → result shows weak section + free lessons → second mock blocked with buy sheet → locked lesson shows buy sheet.
3. Buys pack (test payment) → company page opens dashboard, no buy button anywhere → section test → readiness goes up → fix list changes → lesson reader exit returns to the dashboard.
4. Check no company test page links to Skill Test; Skill Test list has no company tests.
Plus screenshots (desktop + mobile, light) of: target sheet, company page (free), buy sheet, dashboard (Train/Test/Track tabs), lesson reader, test result. I will send these to you.

## 8. Build order

1. Target company (server field + sheet + navbar chip + Today, single days-left source). 
2. Company page split: owner → dashboard; non-owner → demo-first page + buy sheet + pack checklist.
3. Lesson reader + 25 full lessons with practice questions + auto-tick.
4. Company test route + company result page + block skill-test URLs for company tests.
5. Dashboard Train/Test/Track tabs + Track chart.
6. Admin lesson editor (5 fields).
7. End-to-end tests + screenshots → send you.

## Not in this round
Other companies (after Infosys SE is approved), coding engine (skipped earlier), video lessons.
