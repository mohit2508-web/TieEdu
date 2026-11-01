# TieEdu — Plan · Train · Test · Track (3T) Master Plan

> Owner request, 2026-11-01. The goal is that a final-year student who opens TieEdu
> picks a company and a drive date, and the site takes them **Train → Test → Track**
> for that company until the drive. Everything else is secondary.
> Builds on: `COMPANY_PAGE_3T_REDESIGN_PLAN.md` (company page only) and the
> Warm Paper UI (`UI_REDESIGN_PLAN_V3.md`). The UI stays as it is now; this plan
> changes the product, not the look.

---

## 0. The agenda in one line

**For every mapped company: we Train the student for each round, Test them in a
secure, content-based test, and Track a readiness score until the drive, with a
daily countdown that keeps them coming back.**

Every route, button and admin screen must serve one of these four verbs:
**Plan** (pick company + date), **Train**, **Test**, **Track**. Anything that
serves none of them gets hidden or removed (§10).

---

## 1. What already exists (audit, 2026-11-01)

| Area | Exists today | Gap for 3T |
|---|---|---|
| Today screen (`/` signed in, `TodayScreen.tsx`, `GET /me/today`) | Grad year, stage, next step, streak, **test dates with `days_left`**, **per-company readiness (`targets.overall`)** | No countdown moment, no 3T layout, readiness not explained |
| Study plan (`/study-plan`, `studyPlan.routes.ts`) | Student picks company + role + interview date → phased plan; admin authors plans with phases and blocks | Not tied to rounds; no daily task; no "journey" view; not shown after purchase |
| Company page (`CompanyPageV2`, admin `CompanyPageStudio`) | Section-based page, readiness-check CTA, A/B test on main button, `me.track.attempted`, test date | Not organised as Train / Test / Track per round |
| Tests (`/skill-test/*`, `/mock-drive/assessments/*`) | Skill tests with results + certificates; mock drive assessments | **No secure mode**: no fullscreen lock, no tab-switch detection, no copy block; not mapped per company round |
| Readiness | A per-company number exists on Today | No published formula, no bands ("You're ready for…"), no weak-topic list |
| Push notifications | VAPID web push, notifications tab in admin | No daily countdown push |
| Admin (`/admin`) | Company hub, content builder, module PDFs, skill tests, study plans + phase editor, drives, drops, coupons, posters, experiments… | No single "company 3T setup" checklist; round ↔ content ↔ test mapping not enforced |
| Pricing | Home now shows only the pack card (E13) | Ladder logic still in backend; extra pricing surfaces elsewhere |

Routes today: **~95 pages** (full list and verdicts in §10).

---

## 2. The final-year student's journey (the target experience)

```
Sign up / log in
   │
   ▼
① Onboarding (once, 3 screens, skippable fields marked)
   Grad year → "Final year" detected
   Which company? (search, multi-pick up to 3)
   When is the drive / test? (date, or "not announced" → we estimate)
   │
   ▼
② Countdown moment (once per day, first open)
   "40" → red hand-drawn cross strikes it → flips to "39 days left · Infosys"
   │
   ▼
③ Today = the 3T cockpit
   ┌────────────────────────────────────────────────────────┐
   │ 39 days · Infosys      Readiness 62%  "Getting there"  │
   ├──────────────┬──────────────────┬──────────────────────┤
   │ TRAIN today  │ TEST today       │ TRACK                │
   │ Aptitude:    │ 10-Q round quiz  │ Round bars, trend,   │
   │ Time & Work  │ (secure mode)    │ 3 weakest topics     │
   │ [Start 25m]  │ [Start 12m]      │ [See full report]    │
   └──────────────┴──────────────────┴──────────────────────┘
   │
   ▼
④ Company page = same 3T, per round, in full detail
   │
   ▼
⑤ Drive day → result → "Selected" (onboarding checklist) or "Comeback plan"
```

Rules:
- A final-year student **with a target company** always lands on the cockpit.
  No posters, no rails, no marketing above it.
- A student **without** a target company sees one question: "Which company are
  you preparing for?" Nothing else competes with it.
- Not final year → the current Today screen (foundation / internship stage) stays.

---

## 3. Plan: "Plan my placement" (home CTA → `/study-plan`)

Rebuild `/study-plan` as a 3-step wizard that **shows the whole journey before
asking for money**:

1. **Pick company** → immediately show that company's journey card: eligibility,
   rounds in order (OA → Technical → HR …), what each round tests, CTC, typical
   process days. Data: company `rounds_pipeline` + company page sections.
2. **Pick date** (drive / test date, or "not announced" → default 45 days).
3. **Your plan**: days split across rounds, weighted by round weight and the
   student's first readiness check. Week-by-week timeline; each day = one Train
   task + one Test task. Free plan for everyone.

Then the honest upsell: "Your plan uses N free lessons and M pack lessons.
Unlock the {Company} pack to follow it 100%." Single price per company (D1).

**After purchase** (any company pack):
1. A "What you got" screen listing **100% of the contents**: every round, every
   module, lesson count, test count, PDFs, mock tests. No vague "premium access".
2. One big CTA: **"Start Day 1: {first task}"** → straight into Train.
3. The plan, Today cockpit and company page all switch to "owned" state.

Acceptance: a student can go home → Plan my placement → company → date → plan
→ buy → Day 1 lesson in **≤ 6 clicks**, with no dead ends.

---

## 4. Train

Per company, per round, the admin maps content (§9):

| Round type | Train content |
|---|---|
| OA / Aptitude | Topic lessons (quant, logical, verbal), worked examples, timed drills |
| Technical / Coding | Concept lessons, company-tagged problems, solution walkthroughs |
| System design (where present) | Short case lessons |
| HR / Managerial | Answer frameworks, company-specific questions, mock interview link |
| Communication | English coach (exists) |

Daily Train task = next unfinished block from the plan, biased toward the
**weakest round** from Track. Sizes: 15–30 min. Completing it marks the day.

CTA style (attention capture, per your note): every Train block ends with a
clear next action: "Done? Take the 10-question check →". Progress ring on each
round. Streak protects the habit.

---

## 5. Test (content-based, secure mode)

### 5.1 What gets tested
- **Round quiz**: 10–15 questions drawn from the questions mapped to that round's
  Train content (so a test always matches what was taught).
- **Full mock**: all rounds, real timing and pattern of the company's test.
- **Readiness check** (free, first visit): short mixed test that seeds the score.
- Question bank per company round with topic tags + difficulty; the server draws
  a fresh mix each attempt (no fixed paper to memorise).

### 5.2 Secure mode (all graded tests)
| Control | How |
|---|---|
| Fullscreen | Required to start; leaving fullscreen pauses and warns |
| Tab / window switch | `visibilitychange` + `blur` detection; warning 1, warning 2, **3rd → auto-submit** |
| Copy / paste / right-click / text select | Blocked inside the test |
| Question order + option order | Shuffled per attempt from the pool |
| Timer | **Server-side** start/end; client timer is display only |
| Scoring | Server-side only; answers never sent to the browser |
| One question at a time | Fetched one by one; no full paper in the page source |
| One live attempt | One active session per account per test |
| Integrity report | Every flag is logged and shown on the result: "2 tab switches" |
| Later (optional) | Webcam snapshots, only with clear consent (privacy rules apply) |

Honest limit: a browser test can be made hard to cheat, not impossible. We say
"integrity flags" on results, never "proctored".

### 5.3 Result screen
Score, per-topic accuracy, time per question, integrity flags, and the
**"What to do next"** list (the 3 weakest topics → their Train blocks). Low
performance is shown plainly with the fix next to it, never hidden.

---

## 6. Track: the Placement Readiness Score

Visible on: Today cockpit, company page hero, plan page, test results.

**Per round score (0–100)** =
`0.6 × test accuracy (recent attempts weighted higher)`
`+ 0.25 × Train coverage (blocks done / blocks mapped)`
`+ 0.15 × consistency (practice days in the last 14)`.
A round with no test attempt shows "Not tested yet" instead of a made-up number.

**Overall** = rounds weighted by the company's round weights (admin-set,
default equal).

**Bands** (shown as words, not just a number):
| Score | Band | Message |
|---|---|---|
| < 40 | Not ready yet | "Start with {weakest round}." |
| 40–69 | Getting there | "Fix {topic} and {topic} to cross 70." |
| 70–84 | Ready | "You're ready for {Company} {round}. Keep testing." |
| 85+ | Drive-ready | "You're drive-ready for {Company}." |

Track view: round bars, a 14-day trend line, 3 weakest topics, tests taken,
days left. The formula is published on a "How readiness works" sheet: no
black box.

---

## 7. The daily countdown moment

- Trigger: first app open of the day for a student with a target date.
  Stored per day in localStorage (and server, so it shows once across devices).
- Animation (≈1.6 s, skippable by tap):
  1. Yesterday's number (e.g. **40**) appears large, centre, in display font.
  2. A **red hand-drawn cross** strokes over it (SVG `stroke-dashoffset`, 2
     strokes, 250 ms each, slight wobble).
  3. The number flips down to **39** (vertical card flip, 400 ms).
  4. Caption fades in: "39 days left · Infosys drive. Today: {Train task}".
  5. CTA: **Start today's plan**.
- `prefers-reduced-motion`: show "39 days left" statically, no cross animation.
- Last 7 days: amber; last 3: red caption; drive day: "Today's the day" + checklist.
- Same number in a small header chip on every page ("39d").
- **Web push** at 9:00 local (opt-in, uses the existing VAPID setup):
  "39 days left for Infosys. Today: Time & Work, 25 min."
- Email: later (out of scope now, as you said).

---

## 8. Company page in 3T (waiting for your reference page)

You will send the company page design to follow. Until then the structure is:

1. Hero: company, countdown, readiness score + band, "Your next step".
2. Journey: rounds in order; each round is a card with three tabs:
   **Train** (modules, progress) · **Test** (round quiz, last score) ·
   **Track** (round score, weak topics).
3. Full mock test.
4. Plan: days left split by round (links to `/study-plan`).
5. One pack, one price (D1), with the "What you got" list.
6. Eligibility, how to apply, FAQ.

Reuse `CompanyPageV2` sections where they fit; the old 3T plan's phases 2–4 cover
most of this. Final layout follows your reference once it arrives.

---

## 9. Admin: everything per company must be doable from the panel

A new **"Company 3T setup"** screen per company with a completeness checklist
(the company only goes "3T live" when every item is green):

| # | Item | Today | Needed |
|---|---|---|---|
| 1 | Profile: name, logo, CTC, eligibility, process days | Company hub ✅ | Verify all fields edit + save |
| 2 | Rounds pipeline (order, type, weight) | Partly | Add round weight |
| 3 | Train content mapped to each round | Content builder / modules (not per round) | Round ↔ module mapping |
| 4 | Question bank per round (tags, difficulty) | Skill-test admin (not per company round) | Per-round bank, CSV import |
| 5 | Test config per round (count, time, secure mode on) | — | New |
| 6 | Full mock config | Mock drive (separate) | Link to company |
| 7 | Study plan template | Study plans + phase editor ✅ | Generate from rounds automatically |
| 8 | Drive date / window | Drives tab | Feed the countdown |
| 9 | Pack price + contents list | Pricing / coupons | Single price per company (D1) |
| 10 | Page content | Company page studio ✅ | 3T sections |

**Verification task (Phase 0):** for each of the 10 companies in the data, try
every item end to end in the admin panel and record pass/fail. Output: a table
of company × item. "100% achieved" = every cell green for every live company.

---

## 10. Route audit: keep, merge, hide

Verdicts are **proposals**: removing features is your call (D4). Nothing is
deleted until you say yes.

| Verdict | Routes |
|---|---|
| **Core 3T (keep, polish)** | `/` (Today), `/study-plan`, `/companies`, `/company/[slug]`, `/skill-test/*`, `/mock-drive/assessments/*`, `/daily`, `/drive-day`, `/debrief`, `/calendar`, `/account`, `/login`, `/signup` |
| **Train support (keep)** | `/courses/*`, `/my-courses`, `/interview-course`, `/english-coach`, `/mock-interview`, `/peer-mock`, `/tracks/*` |
| **B2B (keep, separate area)** | `/tpo/*`, `/colleges`, `/campus/*`, `/recruiters`, `/talent`, `/admin/*`, `/school/*` |
| **Trust / legal (keep)** | `/verify/*`, `/my-certificates`, `/skill-test/certificates/*`, `/p/[handle]`, `/parent/*`, `/parent-email/*`, `/sitemap.xml` |
| **Merge into 3T** | `/drives` + `/drives/[id]` → company page "Drive" block; `/compare` → companies page; `/drops/*` → Daily; `/mock-drive/*` extras (`more`, `profile`, `resume`, `settings`, `notifications`) → main account |
| **Hide from nav (review)** | `/offers`, `/offer-check`, `/guarantee`, `/college-leaderboard`, `/study-groups`, `/skill-test/skill-passport`, `/design` (admin only) |
| **Remove** | Pricing ladder logic and any page/section that sells outside the per-company pack; leftover home rails (already unused) |

Each kept route gets the same check: loads with real data, no console errors,
empty state, error state, phone 360px, dark mode, Hinglish, guard tests.

---

## 11. UI consistency sweep (the "nothing looks odd" pass)

- One font system: Poppins (display) + body font from tokens; no stray fonts.
- Colours only from tokens (hex guard test already exists; extend to all pages).
- `companyPage.module.css` and any page CSS module: move to global tokens.
- Spacing scale and radius tokens only; no arbitrary `px` values in new code.
- Every page: same header, same section rhythm, same button styles, same empty
  and error components.
- Screenshot every route at 390 / 768 / 1280, light + dark, and fix anything off.

---

## 12. Phases

| Phase | What | Est. | Done when |
|---|---|---|---|
| 0 | Admin audit (§9 table), route audit (§10 sign-off), your decisions (§13), your company page reference | 2–3 days | Tables filled, decisions made |
| 1 | Data model: round weights, round ↔ content map, per-round question bank, test config, readiness tables (Postgres) | 4–5 days | Admin can set all 10 checklist items for one company |
| 2 | Secure test engine (§5) + result screen | 6–8 days | All graded tests run in secure mode; flags logged |
| 3 | Readiness score service + Track view (§6) | 4–5 days | Score + band + weak topics on Today, company page and results |
| 4 | Onboarding + Today 3T cockpit + countdown moment + push (§2, §7) | 5–6 days | Final-year login lands on cockpit; countdown plays once per day |
| 5 | Plan my placement wizard + "What you got" + Day 1 CTA (§3) | 4–5 days | ≤ 6 clicks home → Day 1 lesson |
| 6 | Company page 3T (§8) to your reference | 6–8 days | Matches reference; Train/Test/Track per round |
| 7 | Route cleanup (§10) + pricing removal + UI sweep (§11) | 4–6 days | Every kept route passes the route check |
| 8 | Content fill: every live company completes the admin checklist | ongoing | Every live company "3T live" |

Total build ≈ 6–8 weeks, plus content time (the long pole: question banks).

---

## 13. Decisions needed from you

| # | Decision | Recommendation |
|---|---|---|
| D1 | Pricing: one price per company pack, or keep the round ladder? | **One price per company** (e.g. ₹99–₹249), contents listed 100% |
| D2 | Which companies go 3T first? | Accenture, TCS, Infosys, Wipro, Cognizant, Capgemini (mass recruiters) |
| D3 | Secure mode: auto-submit after 3 tab switches? | **Yes**, with 2 warnings first |
| D4 | Approve the §10 hide/remove list | Review line by line |
| D5 | Webcam snapshots in tests? | **Not now**: privacy cost is high |
| D6 | Readiness formula weights (§6) | Use the defaults, tune after 2 weeks of data |
| D7 | Countdown push time | 9:00 local, opt-in |

---

## 14. Out of scope for now
Email reminders (later, as you said), webcam proctoring, mobile app changes
beyond what the web PWA gets automatically.
