# Placement Prep Path (PPP) — 2-Year One-Time Purchase, Full Deep Plan

> **Product in one line:** 2nd-year B.Tech student ek baar ₹X kharidta hai → next 2 saal (placement tak) uska poora preparation system — courses, skill tests, contests, assignments, mock drives, mentor touchpoints, report cards — sab ek structured path me, ek hi platform pe, live with us.
>
> **Vision (owner's words):** *"bacha ek baar buy kare, placement tak uska access ho, use 100% prepare kar de. Skill tests, contest, assignments dete rahein, full track dikhe kaha chal rha hai, each and everything professional. 2nd year B.Tech target. 2 saal humare saath live kare."*

---

## Table of Contents

1. [Product Framing & Positioning](#1-product-framing--positioning)
2. [Why Now — What TieEdu Already Has (as-is inventory)](#2-why-now--what-tieedu-already-has-as-is-inventory)
3. [The Gap — What Must Be Built Net-New](#3-the-gap--what-must-be-built-net-new)
4. [The 2-Year Student Journey (the core product)](#4-the-2-year-student-journey-the-core-product)
5. [Product Pillars — Deep Design](#5-product-pillars--deep-design)
6. [Access & Entitlement Model (one-time purchase → placement)](#6-access--entitlement-model-one-time-purchase--placement)
7. [Engagement & Retention System ("humare saath live kaise rahega")](#7-engagement--retention-system-humare-saath-live-kaise-rahega)
8. [Progress Tracking — "Kaha chal rha hai" Dashboard](#8-progress-tracking--kaha-chal-rha-hai-dashboard)
9. [Tech Architecture — Grounded in Existing Code](#9-tech-architecture--grounded-in-existing-code)
10. [Backend Data Models (net-new)](#10-backend-data-models-net-new)
11. [Backend APIs](#11-backend-apis)
12. [Frontend Surfaces](#12-frontend-surfaces)
13. [Admin & Ops Surfaces](#13-admin--ops-surfaces)
14. [Pricing, Packaging & Business Model](#14-pricing-packaging--business-model)
15. [Content Production Plan (2 saal ka content engine)](#15-content-production-plan-2-saal-ka-content-engine)
16. [Team & Support Model](#16-team--support-model)
17. [Phased Roadmap (MVP → Full)](#17-phased-roadmap-mvp--full)
18. [Success Metrics & North Stars](#18-success-metrics--north-stars)
19. [Risks & Mitigations](#19-risks--mitigations)
20. [Open Decisions (owner lock chahiye)](#20-open-decisions-owner-lock-chahiye)

---

## 1. Product Framing & Positioning

### 1.1 The problem we solve

| Pain (student side) | Pain (market side) | TieEdu answer |
|---|---|---|
| "DSA shuru toh kar diya, but kaha tak pahunca, koi idea nahi" | Course-selling platforms sell content, not a **journey** | Path = 96-week structured phases with visible progress |
| 10 alag subscriptions (DSA + aptitude + mock + resume) | Har cheez alag, koi整合 nahi | **One purchase, one home** for everything placement |
| 2nd year me kuch nahi pata karna kya hai | Coaching centers ka batch 4-6 month ka, phir chhod dete hain | **2 saal ka saath** — 2nd se 4th year tak |
| Self-paced = 3 month me drop | Cohort loneliness | Cohort + streaks + contests + report cards |
| Resume interview me hi banta hai | — | Resume-first design from Month 1 |

### 1.2 Positioning statement

> **"TieEdu Placement Prep Path — 2nd year se placement tak, ek purchase, poora system."**
> Not a course. Not a test series. A **2-year preparation operating system** for B.Tech students, with visible proof of progress every single week.

### 1.3 What the student actually buys

```
PLACEMENT PREP PATH (one-time, e.g. ₹5,999–₹7,999)
│
├── Access: 24 months ya placement confirm hone tak (jo pehle ho)
├── Curriculum: 4 phases, 96 weeks, auto-personalized (branch, college, grad year, target role)
├── Courses: N flagship courses included (DSA, OS, DBMS, CN, Aptitude, Projects, Resume...)
├── Skill Tests: monthly skill tests + topic diagnostics + Skill Passport
├── Contests: weekly coding contests + monthly mock-OA contests + leaderboard
├── Assignments: weekly graded assignments (code + written + project artifacts)
├── Mock Drives: company-simulation drives (existing engine) — included quota
├── Company Packs: vault access discount (e.g. 40% off) — upsell, not included
├── Mentor touch: cohort mentor + monthly check-in + resume reviews (quota)
├── Report Card: monthly automated performance report (email + in-app)
├── Certificates: phase certificates + final "Placement Ready" certificate (Ed25519 signed)
└── Community: grad-year cohort batch, Drops feed, wall of fame
```

### 1.4 Anti-goals (kya NAHI hai product)

1. **Not unlimited 1:1 human mentorship** — that's a premium add-on (₹X/quarter). Path me structured automation + cohort mentorship hai.
2. **Not a job guarantee** — no money-back "guarantee" claims (legal + delivery risk). Promise = system + effort + visibility, not outcome.
3. **Not lifetime access** — 24 months hard cap (placement confirm karne pe early close; extension add-on).
4. **Not content dump** — har week ke liye "do this, submit this, test this" defined hai. Content without cadence = YouTube.

---

## 2. Why Now — What TieEdu Already Has (as-is inventory)

Research-verified inventory (file:line references are live):

| Pillar | Status | Where |
|---|---|---|
| **Courses engine** | ✅ Mature — enroll, lessons, video gates, quizzes, module tests, final exam, capstone, certificates, XP, prerequisites chaining | `backend/src/routes/courses.routes.ts`, `lib/courses.ts:536` (`courseAccessState`, `courseLockReason`) |
| **Seeded content** | ✅ ~25 full courses (C, Python, DSA, OS, CN, DBMS, ML, GenAI, Aptitude, Resume, Excel...) | `backend/src/data/*Course/` |
| **Skill tests** | ✅ Full engine — blueprints, attempts, topic analytics, certificates, **Skill Passport** | `skill-test.routes.ts`, `data/skillTestTypes.ts` |
| **Mock drives** | ✅ Full bridge — register, SSO launch, attempts, results, shortlist, slots, resumes | `drives.routes.ts`, `driveAdmin.routes.ts`, PG `drive_*` tables |
| **Study plan** | ✅ Admin-authored phases + per-student enrollment + phase progress — **BUT day-window capped at 365** | `studyPlan.routes.ts`, `gamification.routes.ts:76-78` |
| **Tracks** | ✅ Ordered multi-course paths + track certificate — **BUT not purchasable** | `db.ts:608` (`LearningTrack`), `tracks.routes.ts:158` |
| **XP + levels + leaderboard** | ✅ Append-only idempotent ledger; levels Rookie→Grinder→Learner→**Placement Ready**→Alumni Core | `lib/xp.ts:22-46`, `gamification.routes.ts:21` |
| **Auth** | ✅ JWT + rotating refresh sessions, students + admins | `auth.routes.ts` |
| **Checkout** | ✅ Orders, coupons, Razorpay + manual UPI + admin verify, server-authoritative pricing | `checkout.routes.ts`, `payments/orders.ts` |
| **Company vaults** | ✅ Interview intelligence packs, ladder pricing ₹99/₹169/₹219/₹249 | `lib/pricing.ts` |
| **Notifications** | ✅ In-app + web push + email + reminders + Drops feed + email campaigns | `notifications.routes.ts`, `lib/notify.ts`, `lib/reminders.ts` |
| **Certificates** | ✅ 3 signed systems (course, skill, track) — Ed25519 + public verify | `lib/certificate.ts`, `skillCertPdf.ts` |
| **Admin** | ✅ Extensive CMS + RBAC (`lib/rbac.ts`) | `admin.routes.ts`, `courseAdmin.routes.ts`, etc. |
| **Cohort analytics (TPO)** | ✅ B2B side — placement_season, programme_member | `placement.routes.ts`, PG `placement_*` |
| **Drops targeting** | ✅ by college/batch/branch — ready-made announcement channel | `db.ts:982-993` |

**Conclusion:** ~65% of the platform substrate already exists. The Path is a **productization + orchestration layer** on top — not a rebuild.

---

## 3. The Gap — What Must Be Built Net-New

| # | Gap | Severity | Notes |
|---|---|---|---|
| 1 | **Time-bound entitlement** (expiry + placement-close) | 🔴 Critical | Every existing unlock is permanent, no expiry field anywhere (`payments/orders.ts:71`) |
| 2 | **Path product + enrollment + phase orchestration** | 🔴 Critical | Tracks are free; study-plan is generic; no sellable "path" |
| 3 | **Contest engine** | 🔴 Critical | Only a Drops feed card type (`db.ts:951`) — no problems, submissions, per-contest leaderboard |
| 4 | **Assignment engine** | 🔴 Critical | Nothing exists. Closest = capstone `project_url` |
| 5 | **Lift study-plan 365-day cap → 730+** | 🟠 High | One-line domain fix, blocks the 2-year timeline |
| 6 | **Streaks** | 🟠 High | `User.streak` field exists, never computed (`gamification.routes.ts:49-51` returns null) |
| 7 | **Cohort/batch (student-facing)** | 🟠 High | Only TPO-side programmes; no student batch concept |
| 8 | **Path dashboard page** | 🟠 High | No student home today; `my-courses`/`study-plan` are closest |
| 9 | **Monthly report card engine** | 🟡 Medium | Email stack exists; aggregation job doesn't |
| 10 | **Nudge/churn automation** | 🟡 Medium | Reminders table exists (`notification_reminders`); inactivity escalation doesn't |
| 11 | **Mock interview booking (1:1)** | 🟡 Medium | Can start as calendar + credits; integrate later |
| 12 | **Placement confirmation flow** | 🟡 Medium | Self-report + offer upload + verify → closes entitlement |

---

## 4. The 2-Year Student Journey (the core product)

Student 2nd year (sem 3) me buy karta hai. Grad year typically = buy year + 2 (e.g., 2026 buy → 2028 grad). Indian campus placements = 4th year start (Aug–Dec of grad year). So:

```
TIMELINE (months from purchase)
0          6          12         18         24         26–30
|─ PHASE 1 ─|─ PHASE 2 ─|─ PHASE 3 ─|─ PHASE 4 ─|─ (extension window)
 Foundations   Core Depth   Specialize   War Mode     Placement runs
 2nd Yr S3-4   3rd Yr S1    3rd Yr S2    4th Yr S1    offers rolling
```

### Phase 1 — FOUNDATION (Month 1–6, 2nd Year)

**Goal:** programming + DSA basics solid + CS core shuru + *habit banao*.

| Week block | Curriculum | Assessments |
|---|---|---|
| W1–2 | Onboarding: baseline skill test, profile, resume v0, GitHub/LinkedIn setup, path personalization | Diagnostic test + Resume v0 assignment |
| W3–10 | Programming (C/Python deep), complexity, basic DSA (arrays→recursion) | Weekly contest (easy), weekly assignment, skill test #1 |
| W11–18 | DSA mid (trees, hashing, two-pointer, sliding window), OS basics | Contest × weekly, assignment × weekly, skill test #2 |
| W19–24 | DBMS + CN basics, aptitude foundation (numbers, %, T&W) | Mock OA #1, skill test #3, **Phase 1 gate exam** |

**Habit engine (daily):** 1 daily quiz question (60s), streak, XP. **Weekly:** contest Saturday 8PM, assignment due Sunday 11:59PM. **Monthly:** skill test + report card.

**Gate to Phase 2:** Phase 1 gate exam ≥ 60% OR auto-unlock with warning (soft gate — rukna nahi chahiye, but weak students ko Phase 2 me bridging modules milte hain).

### Phase 2 — CORE DEPTH (Month 7–12, 3rd Year Sem 1)

**Goal:** DSA advanced + CS core mastery + aptitude placement-level + **first resume-worthy project**.

| Week block | Curriculum | Assessments |
|---|---|---|
| W25–32 | Advanced DSA: graphs, DP, greedy, tries, segment trees (frequent patterns) | Weekly contest (medium), assignment, skill test #4 |
| W33–40 | CS core deep (OS/DBMS/CN interview-level), System Design **intro** (L1) | Company OA simulation ×2, skill test #5 |
| W41–48 | Aptitude + logical + verbal (company OA banks), **Capstone Project 1** (full-stack / data / core per track) | Project review assignment (human + rubric), mock OA #2 |
| W49–52 | Resume v1 finalization, GitHub portfolio audit, internship application prep | Resume review (mentor quota), **Phase 2 gate** |

### Phase 3 — SPECIALIZE & INTERVIEW READY (Month 13–18, 3rd Year Sem 2)

**Goal:** target-role specialization + mock interviews + internship placement + company-wise practice.

| Week block | Curriculum | Assessments |
|---|---|---|
| W53–60 | Track specialization (SDE-Backend / SDE-Fullstack / Data / Core-Elective), System Design L2, DB design | Skill test #6, contest continues, assignment = design docs |
| W61–68 | **Company-wise sprints** (top 10 target companies — vault packs discounted 40%), mock interview #1 & #2 (1:1, credits) | Mock drives (2 included), interview rubric scores |
| W69–76 | Internship season war-room: OA grind, interview experiences deep-dive, HR stories (STAR) | Mock OA weekly, contest (hard), **Phase 3 gate** |
| W77–78 | Buffer + catch-up week + mid-path retreat (community event) | Report card deep-dive |

**Internship milestone:** stipend internship offer → auto badge + XP jackpot + optional "fast lane" (skip to Phase 4 intensives while maintaining weekly minimum).

### Phase 4 — PLACEMENT WAR MODE (Month 19–24+, 4th Year)

**Goal:** convert internship/interviews into offer. Maximum intensity, maximum support.

| Week block | Curriculum | Assessments |
|---|---|---|
| W79–86 | Company-specific grind (per-company PYQ modules from vaults — included 3 packs + discount rest), last-minute revision packs, system design rapid-fire | Mock drives × weekly slot, mock interviews ×4 (credits), contests continue |
| W87–92 | HR + behavioral mastery, offer negotiation basics, relocation/role clarity | HR mock, resume final v2, LinkedIn optimization assignment |
| W93–96 | Peak placement weeks: on-call doubt support, daily micro-revision drops, on-demand last-minute vaults | Post-interview debrief forms (feed next year's content) |

### Phase 5 — GRADUATION (offer aane pe)

- Student reports offer (self-report + offer letter upload → verify)
- **Entitlement closes early** → converts to **Alumni status**
- Alumni gets: read-only access 6 months, referral network, "wall of fame", affiliate program (refer juniors → commission/credits)
- Final certificate: **"Placement Ready — TieEdu Path Graduate"** (Ed25519 signed, public verify)
- NPS + interview experience contribution (rewards XP) → content flywheel

### If placement nahi hui by Month 24

- **Extension pack** (e.g., ₹1,499 / 6 months) — same path, Phase 4 continues + gap-year resources (GATE, off-campus, startups)
- Honest positioning: extension = choice, not trap

---

## 5. Product Pillars — Deep Design

### 5.1 Courses (reuse, remap)

- Existing 25 courses = backbone. Map into path phases via **PathWeekItem** (link type: course | lesson-module | contest | assignment | skill_test | drive | milestone).
- **Prerequisite chaining** (`courseLockReason`, `lib/courses.ts:507`) already enforces order — reuse as-is.
- Path-owned students: courses auto-enrolled at phase start (server-side grant, no payment friction).
- New micro-content: "Path Primers" (10-min videos) per week — low-cost production, high cadence feel.

### 5.2 Skill Tests (reuse + schedule)

- Existing engine (blueprints, attempts, topic analytics, certificates, Skill Passport) — schedule **monthly official path skill test** via path orchestrator.
- Diagnostic at Week 2 → generates **weak-topic list** → feeds assignment recommendations + report cards.
- Skill Passport becomes a Path sub-dashboard: "your skills radar over 24 months".

### 5.3 Contests (NEW — build engine)

**MVP contest types:**
1. **Weekly Coding Contest** — 3 problems (easy/med/hard), 2 hours, Saturday 8PM IST, auto-judge (existing code-execution infra? verify — else offline-judge with test files, or "submit code + hidden tests run server-side later" for MVP).
2. **Monthly Mock-OA Contest** — company-style OA (aptitude + MCQ + 1-2 coding), 90 min.
3. **Phase Gate Exams** — proctored-style (webcam optional Phase 1; timer + tab-switch detection baseline).

**Contest model fields:** id, title, slug, starts_at, ends_at, duration_min, problems[], registration_cutoff, visibility (cohort-scoped), leaderboard_scope (cohort | global | path-only), prize_xp[], certificate_threshold.

**Leaderboard:** per-contest (rank by score, tie-break by time) + rolling season leaderboard (best 8 of 12 monthly contests) → cohort + global tabs. Reuse XP ledger for awarding; contest standings stored separately (XP is not a ranking system).

**Anti-cheat (MVP-level):** plagiarism similarity check (simple token-overlap across submissions), minimum solve time floor, per-problem attempt logs. Honest about limits; Phase 2 adds similarity service.

### 5.4 Assignments (NEW — build engine)

Types:
| Type | Grading | Example |
|---|---|---|
| **Code assignment** | Auto tests + optional human review flag | "Implement LRU cache + unit tests" |
| **Written assignment** | Rubric checklist (self-check + mentor sample audit) | "Explain CAP theorem with 2 real systems" |
| **Artifact assignment** | Human/rubric review (mentor quota) | Resume v0/v1/v2, GitHub portfolio, design doc |
| **Project milestone** | Rubric + peer option later | Capstone week 4/8/12 checkpoints |

**Model:** Assignment {id, path_phase, week, type, title, prompt_blocks (reuse ContentBlockRecord!), rubric[], due_at, max_score, auto_test_config?, review_mode}. Submission {id, user, url/code/text, submitted_at, score, feedback, status: pending|graded|late|resubmitted}.

**Late policy:** auto-accept with −10%/day (cap 30%), streak unaffected, but "assignment streak" badge broken. Perfectionism se dropout hota hai — flexibility wala strictness.

**Reuse:** prompt rendering = existing `ContentBlockRenderer` + markdown+GFM (per STUDY_PLAN plan's renderer). Rubric UI = checkbox list (task lists already styled in globals.css).

### 5.5 Mock Drives (reuse)

- Existing drive engine (register → SSO launch → attempt → result → shortlist) = perfect exam plane.
- Path includes **quota**: e.g., 6 mock drives over 24 months; extra at ₹99.
- Schedule drives on path calendar ("Drive Day: TCS-style OA — Mar 15").

### 5.6 Company Vaults (upsell, not included)

- Path discount: **40% off any vault** via path-scoped coupon auto-granted at purchase.
- Phase 3–4 path weeks *link* to vault packs (deep practice) — but vault purchase separate. (Decision #20.1: alternatively include 2–3 vaults in premium path tier.)

### 5.7 Mentorship & Human Touch (quota-based)

| Touch | Cadence | Who |
|---|---|---|
| Cohort kick-off live session | Month 0 | Founder/lead mentor |
| Weekly live doubt/session | Weekly (recorded) | Rotating mentor |
| 1:1 mock interview | Phase 3–4, 4–6 credits | Interviewer panel |
| Resume review | v0, v1, v2 (3 credits) | Mentor |
| Monthly cohort office-hours | Monthly | Mentor |

1:1 beyond quota = paid add-on. Automation carries daily load; humans carry milestone load.

---

## 6. Access & Entitlement Model (one-time purchase → placement)

### 6.1 New concept: `PathEntitlement`

```ts
PathEntitlement {
  id, user_id, path_product_id,
  order_id,                    // the purchase
  status: 'active' | 'expired' | 'placement_confirmed' | 'revoked' | 'extended',
  starts_at,                   // purchase/activation
  expires_at,                  // starts_at + duration_months (default 24)
  placement_confirmed_at?,     // early close
  extension_ids?: string[],    // extension packs
  cohort_id?,                  // assigned batch
  personalization: { branch, grad_year, target_roles[], college, weak_topics[] }
}
```

### 6.2 Access check (middleware)

`requirePathAccess(pathProductId?)`:
1. Entitlement exists + status active
2. `now < expires_at` (extensions bump expires_at)
3. Placement confirm does NOT kill learning immediately → grace mode (see 6.4)

**Storage:** entitlements in JSON ledger initially (like unlocks/orders at `db.ts:2083-2088`), PG migration later if multi-tenant scale demands. Mirror pattern already exists.

**Grant flow (checkout):** revive legacy `kind:'plan'` cart line (`checkout.routes.ts:311`, `payments/orders.ts:103` — escape hatch exists!) → rename/extend to `kind: 'path'` → `completePaidOrder` grants `PathEntitlement` + auto cohort assignment + welcome notification sequence.

### 6.3 What entitlement unlocks (fan-out)

| Resource | Mechanism |
|---|---|
| Path dashboard + phases | PathEnrollment created from PathProduct template |
| Included courses | Auto-enroll grants (server-side, not payment orders) |
| Skill tests (monthly) | Path-scoped scheduling flag |
| Contests | Cohort-scoped visibility |
| Assignments | Week release schedule |
| Mock drive quota | Credit balance on entitlement |
| Vault discount | Auto-coupon to user |
| Mentor credits | Credit balance (mock interviews, resume reviews) |

### 6.4 Placement confirmation & grace

1. Student self-reports: company, role, CTC band, date + offer letter upload (PII-safe storage).
2. Optional verify: admin/TPO glance (not blocking — trust-based, audit-logged).
3. **Grace mode:** learning access continues 60 days post-confirm (finish Phase 4 loose ends, capture interview experience) → then Alumni conversion.
4. Benefits: final certificate, alumni status, referral program, wall of fame, 6-month read-only.

### 6.5 Extension

- Anytime before expiry: buy Extension Pack (6 months) → `expires_at` bumps, Phase 4 intensives + extra resources unlock.
- Post-expiry grace: 15 days read-only (download certificates, view history) → then content lock (account remains).

---

## 7. Engagement & Retention System ("humare saath live kaise rahega")

Retention = the actual product. Curriculum is table stakes. Cadence design:

### 7.1 Cadence ladder (every layer must have a reason to return)

| Layer | Frequency | Hook | System |
|---|---|---|---|
| Daily quiz | Daily (60s) | Streak + XP + league | NEW daily_quiz engine (reuse question banks) |
| Streak | Daily | Frozen streaks (2/month), streak league | Fix vestigial `User.streak` |
| Weekly contest | Weekly (Sat 8PM) | Rank + XP + cohort bragging rights | Contest engine |
| Weekly assignment | Weekly (Sun due) | Score + feedback + streak | Assignment engine |
| Live session | Weekly | Recording + notes drop | Ops calendar → Drops |
| Skill test | Monthly | Skill radar movement + cert thresholds | Existing engine + scheduler |
| Report card | Monthly | "Am I improving?" clarity | NEW aggregation job |
| Mock drive | Monthly–bi-monthly | Real exam feel + results | Existing drives |
| Phase gate | Quarterly-ish | Certificate + phase unlock | Path orchestrator |
| Mentor 1:1 | Phase milestones | Human connection | Credits + booking |

### 7.2 Nudge automation (churn defense)

| Signal | Action |
|---|---|
| No login 3 days | Push + email: "Streak at risk — 60s daily quiz" |
| No login 7 days | Push from cohort mentor voice + "your cohort rank slipped from #12 → #41" |
| No login 14 days | Personal email + re-onboarding call task (ops queue) |
| Assignment skipped 2 weeks | "Catch-up pack" (condensed) + flexible due date offer |
| Contest not registered | 1-hour-before reminder |
| Phase gate failed twice | Mentor alert + bridging plan auto-generated |
| Strong student (top 10%) | Fast-lane challenges + early mock interview + "wall of fame" |

All driven by **weekly digest job** (cron) writing into existing notification system (`lib/notify.ts`, push, email campaigns).

### 7.3 Cohort psychology

- Student joins **grad-year cohort** (e.g., `PPP-2028-Batch-3`), auto-assigned at purchase (or college-specific cohort if bought via college drive).
- Cohort page: members (opt-in), collective stats ("batch solved 4,231 problems this month"), upcoming events, mentor announcements.
- **Season leagues:** monthly XP leagues within cohort (Bronze/Silver/Gold/Champion) → reset monthly (hope preservation — eternal leaderboards demotivate the bottom).
- Wall of fame: internships, offers (voluntary), contest winners.

### 7.4 Gamification upgrades

| Feature | Spec |
|---|---|
| Streak | Daily activity = quiz OR lesson OR assignment submit OR contest attempt. Freeze tokens ×2/month. Milestones: 7/30/100/365 days → badges + XP |
| Levels | Existing 5 levels kept; add **sub-badges per phase** ("Foundation Complete", "Graph Master" from topic mastery) |
| XP economy | Existing ledger untouched; contest/assignment/streak reasons added to enum. Optional later: XP → mentor credit micro-redemptions |
| Leagues | Monthly cohort leagues (separate standings table; XP ledger stays source of truth for totals) |

### 7.5 Yearly rhythm (per owner: "haar year ki hisab se")

**Academic-year overlay** on top of 24-month phases (Indian college calendar):

| Academic period | Path overlay |
|---|---|
| Sem exams (Nov–Dec, May–Jun) | "Exam Week" mode: reduced path load, semester-subject resources, streak protected, contests paused |
| Summer (May–Jul) | **Intensive mode**: 2× contest frequency, project bootcamp, internship grind (Phase 2/3 timing dependent) |
| Placement season (Aug–Dec, yr 4) | **War mode**: daily drops, drive-heavy schedule, on-call support |
| Semester start | Reset momentum email + weekly plan re-confirm |

---

## 8. Progress Tracking — "Kaha chal rha hai" Dashboard

**Single screen answer to: am I on track?**

### 8.1 Path Home (`/path`)

```
┌─────────────────────────────────────────────────────────────┐
│  FOUNDATION ▓▓▓▓▓▓░░░░  PHASE 2 of 4 · Week 31/96          │
│  On track for Aug 2028 placements  ·  Streak 23 🔥          │
├─────────────────────────────────────────────────────────────┤
│  THIS WEEK                                                  │
│  [ ] Lesson: Graph BFS (1.5h) — 40% done                    │
│  [ ] Assignment #31 due Sun 11:59PM — Not started ⚠️         │
│  [x] Contest #30 — Rank 14/312 (Gold league)                │
│  [ ] Daily quiz — today pending (streak risk!)               │
├─────────────────────────────────────────────────────────────┤
│  SKILL RADAR          COHORT LEAGUE       METRICS           │
│  DSA 68 ▲5            Gold · Rank 14       Problems 312     │
│  Aptitude 42 ▲12      Batch percentile 87  Contests 12/30   │
│  DBMS 71 ▲3           Upcoming: Sat 8PM    Assignments 24/30│
├─────────────────────────────────────────────────────────────┤
│  NEXT MILESTONE: Phase 2 Gate (in 3 weeks) — mock exam ready │
│  REPORT CARD: March → +11% overall · weak: Graphs, %        │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Components

1. **Phase progress bar** — phase + week + % + ETA to placement season.
2. **Weekly mission checklist** — lessons, assignment, contest, daily quiz (auto-generated from path week).
3. **Skill radar chart** — from skill-test attempts (exists data; new viz).
4. **Cohort league card** — rank + league + movement.
5. **Metric tiles** — problems solved, contests attended, assignments submitted, mock drives given, streak.
6. **Milestone timeline** — vertical: past milestones (certs, gates) + next 3 upcoming.
7. **Report card entry** — latest monthly report + archive.
8. **Risk banner** — if behind: "You're 2 weeks behind Phase 2 pace — catch-up plan ready" (CTA generates condensed week).

### 8.3 Monthly report card (automated)

Job runs 1st of month per user:
- XP earned, delta vs last month
- Skill test deltas per topic (up/down arrows)
- Contest best rank + trend
- Assignment completion %
- Weak topics (from skill tests + assignment scores)
- Cohort percentile
- **One personalized focus block** ("Next 4 weeks: graphs + % — here are 3 resources")
- Delivered in-app + email (existing email stack `lib/email/*`).

### 8.4 Admin/ops side of tracking

- **Cohort health dashboard:** DAU/WAU, streak distribution, assignment submission rate, contest participation, at-risk counts (14-day inactive), phase distribution histogram.
- Per-student drill-down for mentors (assign tasks, nudge, extend due dates, grant credits).

---

## 9. Tech Architecture — Grounded in Existing Code

### 9.1 Principles

1. **Orchestrate, don't rebuild.** Path = scheduler + entitlement + dashboard over existing engines (courses, skill tests, drives, XP, notifications, content blocks).
2. **Server-authoritative everything** (matches existing checkout/xp/courses philosophy).
3. **Reuse ContentBlockRecord + ContentBlockRenderer** for assignment prompts, path week descriptions, contest statements (per STUDY_PLAN renderer findings — GFM wired, 8 block types live).
4. **JSON ledger first, PG where PG already lives** (drives/placement are PG-only; path core starts in ledger like orders/unlocks; migrate only hot tables if scale demands — matches PLATFORM_SCALE thinking).
5. **Cohort-scoped visibility** over global flags (Drops audience targeting pattern reused: `db.ts:982-993`).

### 9.2 New backend modules (file map)

```
backend/src/
  data/
    pathTypes.ts              // PathProduct, PathPhase, PathWeek, PathWeekItem,
                              // PathEnrollment, PathEntitlement, Cohort, LeagueStanding...
    seedPath.ts               // seed flagship path product + 4 phases + 96 weeks skeleton
  lib/
    pathAccess.ts             // entitlement check (mirror courseAccessState pattern)
    pathOrchestrator.ts       // phase/week release, auto-enroll, gate logic
    streaks.ts                // daily activity → streak compute (fix vestigial field)
    reportCard.ts             // monthly aggregation
    contestJudge.ts           // scoring, leaderboards, plagiarism baseline
    nudge.ts                  // churn signals → notification dispatch
  routes/
    path.routes.ts            // student: home, week, mark-done, enrollment, placement-report
    pathAdmin.routes.ts       // admin: product/phase/week CRUD, cohorts, entitlements, gates
    contests.routes.ts        // student: list, register, submit, standings
    contestAdmin.routes.ts    // CRUD + problems + results publish
    assignments.routes.ts     // student: list, submit, my-scores
    assignmentAdmin.routes.ts // CRUD + grading queue + rubric scoring
    cohorts.routes.ts         // cohort page data, leagues, wall of fame
```

### 9.3 Checkout integration (minimal, reuses everything)

1. Cart line `kind: 'path'` (extend `CartItem` in `checkout.routes.ts:387-402`; legacy `kind:'plan'` already passes through `payments/orders.ts:103` — rename carefully with backward compat).
2. Server computes price from `PathProduct.price_inr` (no client trust — existing pattern).
3. `completePaidOrder` (`payments/orders.ts`) gains a path branch: create entitlement → enroll → cohort assign → welcome sequence (notify + email campaign "Day 0").
4. Coupons: path-scoped coupons work via existing `lib/coupons.ts` scoping (extend scope: `path_product_ids`).

### 9.4 Study-plan relationship

Existing StudyPlan (templates, phases, enrollment, 365 cap) is the **closest ancestor**. Decision:
- **Option A (recommended):** StudyPlan becomes the *rendering engine* for a path phase; Path orchestrator generates/drives a StudyPlanEnrollment per phase with day windows remapped (lift cap to 730 in `gamification.routes.ts:76-78` — one-line domain fix).
- **Option B:** fork a PathPhaseProgress. Rejected — duplicates phase UX already built (`study-plan.tsx`).

Assignment/contest links = new block type or week-item links rendered beside study-plan phases. Path Home aggregates both.

### 9.5 Cron/background

Existing pattern: `lib/reminders.ts` (notification_reminders PG). Add node-cron (or existing scheduler if present) jobs:
- Daily: streak compute, daily-quiz release, nudge scan (3/7/14-day), contest upcoming reminders
- Weekly: cohort digest, league standings recompute, at-risk ops queue
- Monthly: report card generation + email campaign trigger
- Contests: start/end windows, auto-score finalize

### 9.6 Auth, PII, security

- Reuse `requireAuth`; add `requirePathAccess` for path routes.
- Offer letters (placement confirm): store in private bucket/dir, serve via signed short-lived URLs (not public `/thumbnails` pattern).
- Cohort PII: opt-in display names only; no email/phone exposure in cohort pages.
- Contest anti-cheat logs retained 90 days.

---

## 10. Backend Data Models (net-new)

```ts
// ── Product definition (admin-authored) ──────────────────────────
PathProduct {
  id, slug, title, tagline,
  price_inr, mrp_inr?, currency 'INR',
  duration_months: 24,
  status: 'draft' | 'published' | 'archived',
  includes: { course_ids[], drive_quota, mentor_credits, mock_interviews, vault_discount_percent },
  cohort_size_target?, audience: { branches[], grad_years[] },
  phases: PathPhase[]
}

PathPhase {
  id, path_product_id, order, key: 'foundation'|'core'|'specialize'|'war',
  title, goal, day_from, day_to,          // e.g. 1–180, 181–365...
  gate: { exam_skill_test_id?, min_percent, soft: true },
  certificate: { title, tier }
}

PathWeek {
  id, phase_id, week_no (1..96 globally), title, focus,
  released_at_rule: 'enrollment_day + (week_no-1)*7'   // personal timeline
}

PathWeekItem {
  id, week_id,
  link_type: 'course' | 'course_module' | 'lesson' | 'contest' | 'assignment'
           | 'skill_test' | 'drive' | 'milestone' | 'resource',
  link_id?, title, est_minutes, required: boolean, order
}

// ── Runtime (per student) ────────────────────────────────────────
PathEntitlement { /* §6.1 */ }

PathEnrollment {
  id, user_id, entitlement_id, path_product_id,
  current_phase_id, current_week_no, status: 'active'|'paused'|'graduated'|'lapsed',
  personalization, started_at,
  gate_results: { phase_id, score, passed_at }[]
}

Cohort {
  id, key: 'PPP-2028-B03', label, grad_year, college_scope?,
  mentor_staff_id, starts_at, status
}
CohortMember { cohort_id, user_id, joined_at, role: 'student' }

LeagueStanding {                 // monthly, cohort-scoped
  cohort_id, month: '2026-10', user_id, xp, solves, rank, league: 'bronze'|'silver'|'gold'|'champion'
}

// ── Contests ─────────────────────────────────────────────────────
Contest {
  id, slug, title, type: 'weekly'|'monthly_oa'|'phase_gate'|'special',
  cohort_scope: 'all_path' | cohort_id | 'global_public',
  starts_at, ends_at, duration_min, registration_cutoff,
  problems: ContestProblem[],
  xp_awards: { participation, top10, top25, winner_bonus },
  certificate_cutoff_percent?, leaderboard_visibility: 'cohort'|'global'
}
ContestProblem { id, contest_id, title, difficulty, points, time_limit_ms, memory_mb,
                 statement_blocks: ContentBlockRecord[], test_config, order }
ContestRegistration { contest_id, user_id, registered_at }
ContestSubmission { id, contest_id, user_id, problem_id, language, code,
                    verdict: 'pending'|'accepted'|'wrong_answer'|'tle'|'runtime_error',
                    score, submitted_at, judged_at, similarity_group_id? }
ContestStanding { contest_id, user_id, rank, score, solve_count, tiebreak_seconds }

// ── Assignments ──────────────────────────────────────────────────
Assignment {
  id, week_id, type: 'code'|'written'|'artifact'|'project_milestone',
  title, prompt_blocks: ContentBlockRecord[],
  rubric: { criterion, max_score, weight }[],
  due_at, late_policy: { per_day_percent: 10, max_percent: 30 },
  auto_test_config?, review_mode: 'auto'|'rubric_self'|'human'|'sample_audit',
  max_score
}
AssignmentSubmission {
  id, assignment_id, user_id,
  code?, repo_url?, artifact_urls[], text?,
  submitted_at, is_late, status: 'pending'|'graded'|'resubmitted',
  score, feedback_blocks, graded_by, graded_at
}

// ── Engagement ───────────────────────────────────────────────────
DailyQuiz { id, date, question_ref, path_product_id? }
DailyQuizAttempt { user_id, date, correct, seconds, xp_awarded }

StreakState { user_id, current, longest, freezes_left_month, last_active_date }

ReportCard { id, user_id, month, payload_json, created_at }

PlacementReport {
  id, user_id, entitlement_id, company, role, ctc_band, offered_at,
  offer_letter_file_id?, verify_status: 'self'|'verified'|'rejected', verified_by
}

// ── Entitlement ledger additions (untyped rows, like unlocks) ────
// entitlement_credit: { entitlement_id, kind: 'mock_interview'|'resume_review'|'drive',
//                       granted, used, source }
```

**Migration note:** StudyPlan 365 cap lift (`gamification.routes.ts:76-78`) + `User.streak` revival + checkout `kind:'path'` are the three surgical edits to existing files; everything else is additive.

---

## 11. Backend APIs

### 11.1 Student (`path.routes.ts` + siblings, all `requireAuth`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/path/me` | Entitlement + enrollment + cohort + credits summary |
| GET | `/api/path/home` | Dashboard payload (phase, week, checklist, metrics, league, risk flags) |
| GET | `/api/path/weeks/:weekNo` | Week detail: items + due state + resources |
| POST | `/api/path/items/:itemId/complete` | Mark lesson/milestone done (idempotent, XP) |
| GET | `/api/path/timeline` | Full 96-week map with states |
| POST | `/api/path/pause` \| `/resume` | Life happens (max 2 pauses, 30 days each) |
| POST | `/api/path/placement-report` | Self-report + offer upload |
| GET | `/api/path/report-cards` | Monthly archive |

**Contests:** `GET /api/contests?scope=path`, `POST /api/contests/:id/register`, `POST /api/contests/:id/submit`, `GET /api/contests/:id/standings`, `GET /api/contests/me`.

**Assignments:** `GET /api/assignments?week=`, `GET /api/assignments/:id`, `POST /api/assignments/:id/submit`, `GET /api/assignments/me`.

**Cohorts:** `GET /api/cohorts/:id` (page data), `GET /api/cohorts/:id/league?month=`, `GET /api/cohorts/:id/feed`.

### 11.2 Admin (`pathAdmin` / `contestAdmin` / `assignmentAdmin`, `requireAdmin` + RBAC strings)

- Full CRUD: PathProduct → Phases → Weeks → WeekItems (reorder).
- Contest CRUD + problem authoring (block editor reuse) + results publish + plagiarism report.
- Assignment CRUD + **grading queue** (submissions by status) + rubric scoring + feedback (block editor).
- Cohort management: create, assign mentor, move student, view health.
- Entitlement admin: grant/revoke/extend, credit adjustments, placement verification queue.
- Ops: at-risk list, pause approvals, catch-up plan overrides.

---

## 12. Frontend Surfaces

```
frontend/src/pages/
  path/
    index.tsx              // sales landing (see 12.1)
    home.tsx               // Path Home dashboard (8.1) — THE student home
    timeline.tsx           // 96-week map
    weeks/[weekNo].tsx     // week detail + items
    contests/index.tsx     // contest list + standings entry
    contests/[id].tsx      // contest room (problems, timer, submit, leaderboard)
    assignments/index.tsx  // my assignments + due states
    assignments/[id].tsx   // prompt (blocks) + submit + feedback
    cohort/[key].x         // cohort page + league + wall of fame
    report-cards.tsx       // monthly archive
    checkout.tsx           // path purchase (or reuse global cart)
  my-path/ → alias of home for nav simplicity
```

**Nav (`navConfig.ts`):** path enrolled students get **"My Path" as first mobile tab** (replace/augment current home); desktop navbar primary item. Non-enrolled: "Placement Path" marketing item in Explore.

**Shared components:** `path/PhaseProgressRing`, `WeeklyMissionChecklist`, `SkillRadarChart`, `LeagueCard`, `StreakFlame`, `ContestRoom`, `AssignmentSubmitPanel` (code editor reuse from course player / Monaco if present), `ReportCardView`.

**Design standard:** per DEEP_EXECUTION_PLAN — Calibre stack, 18px prose, sky `#0284C7` accents, amber `#E8A33D` CTAs, `ContentBlockRenderer` everywhere for authored content, mobile-first (chunked steps for week content per COURSE_EXPANSION mobile model).

### 12.1 Path sales landing page (conversion-critical)

Sections: hero ("2nd year se placement tak — ek purchase"), 4-phase journey visual, what's included (accordion), sample week (live embed), cohort proof (testimonials/badges), price + EMI + guarantee-fairness copy, FAQ, sticky buy CTA. Uses existing poster/banner components + real coupon-driven offers strip (per COURSE_EXPANSION offers pattern).

---

## 13. Admin & Ops Surfaces

New admin tabs (extend `frontend/src/components/admin/`):

1. **Path CMS** — product → phases → weeks → items builder (drag reorder like existing module reorder).
2. **Contests Manager** — schedule, problems, results, standings, plagiarism flags.
3. **Assignments Manager** — authoring + **grading queue** (daily ops surface — most-used human screen).
4. **Cohorts & Mentors** — health dashboard, at-risk, league summaries, announcement composer (posts to Drops with path audience).
5. **Entitlements** — search user, grant/extend/revoke, credits, placement verify queue.

**Ops runbooks (SOP docs, not code):** weekly contest ops, grading SLA (72h), nudge escalation, pause handling, placement verify.

---

## 14. Pricing, Packaging & Business Model

### 14.1 Anchor pricing (India, 2nd-year B.Tech, one-time)

| Tier | Price (launch) | Includes |
|---|---|---|
| **Path Core** | **₹5,999** | 24-month path, included courses, monthly skill tests, weekly contests+assignments, 4 mock drives, 3 mock interviews, 3 resume reviews, cohort, report cards, vault 40% coupon |
| **Path Pro** | **₹8,999** | Core + 8 mock interviews + priority grading + 2 vault packs included + 6 drives + phone support window |
| **Early Bird / College Batch** | ₹4,999 (first 100 per cohort) | Core at discount — cohort-fill psychology |
| **Extension** | ₹1,499 / 6 months | Post-24-month continuation |
| **Add-ons** | mock interview ₹499, extra drive ₹99, 1:1 mentor hour ₹999 | À la carte via credits |

**EMI:** Razorpay EMI/Pay-later on ₹5,999+ (conversion lever for 2nd years). Manual UPI + admin verify flow already exists for non-card students.

**Refund policy (fair, bounded):** 7-day, ≤10% content consumed → full refund; beyond that pro-rata not offered (positioning: system access starts Day 0). Clear copy pre-purchase.

### 14.2 Unit economics sketch (validate with real ops costs)

```
Revenue per Core student:     ₹5,999
Content cost (amortized):     ~₹500–800   (25 courses already sunk; path weeks + contests incremental)
Mentor/review human cost:     ~₹600–1,000 (quota-based, batched)
Infra + tools:                ~₹100–200
Support + ops:                ~₹200–300
─────────────────────────────────────
Gross margin (steady state):  ~60–75%     ← healthy; scale cohorts to cut human share
```

Break-even driver = cohort size per mentor (target 80–120 students per full-time mentor with grading assist).

### 14.3 Growth loops

1. **Wall of fame + verify page** → social proof → juniors buy (affiliate: senior gets credits/cash).
2. **College batch sales** (B2B2C): TPO portal already exists (`placement.routes.ts`) — sell cohorts to colleges at ₹3,499–4,499/head volume.
3. **Free diagnostic funnel:** free Week-0 baseline skill test + sample week → email campaign (stack exists) → conversion.
4. **Interview experience flywheel:** graduates contribute experiences → vault content improves → product value up.

---

## 15. Content Production Plan (2 saal ka content engine)

Orchestration is worthless without cadence content. Production pipeline:

### 15.1 Content types & volume (per 96-week path)

| Type | Volume | Effort each | Source strategy |
|---|---|---|---|
| Week briefs (focus + goals) | 96 | 30 min | Template + mentor write |
| Path primers (micro videos) | ~50 | 1–2 h | Record in batches monthly |
| Weekly contests | ~70 | 2–3 h (curate+test) | Curate from pattern banks, re-skin, rotate |
| Assignments | ~70 | 1–2 h | Rubric templates per topic; reuse across cohorts |
| Monthly skill tests | 24 | 2–3 h | Existing blueprints + new sets |
| Report card copy variants | templated | engine | `lib/reportCard.ts` |
| Live session deck + recording | ~80 | 2 h | Weekly ops calendar |

### 15.2 Production timeline (before first cohort)

| Before launch (T−6 wks) | T−4 | T−2 | T0 | Ongoing |
|---|---|---|---|---|
| Path skeleton (4 phases, 96 weeks) | Phase 1 fully authored | Phase 2 authored | Phase 1 cohort live | Roll Phase 3/4 as cohort reaches (just-in-time, 8-week buffer) |
| First 8 contests banked | First 8 assignments banked | Report card engine tested | Ops runbooks live | Weekly content standup |

**Buffer rule:** never ship a cohort a week with <8 weeks of authored buffer. Just-in-time Phase 3/4 keeps early ops light while ensuring no gaps.

### 15.3 Reuse leverage

- 25 existing courses → link, don't recreate.
- Vault interview Qs → contest problem inspiration + Phase 4 sprint references.
- Interview Course (free 50 modules) → Phase 3 supplementary track.
- PYQ vaults → company sprint weeks.

---

## 16. Team & Support Model

| Role | Responsibility | Ratio / load |
|---|---|---|
| Path Lead (owner initially) | Curriculum authority, gate standards, weekly standup | — |
| Content mentors ×2 | Week briefs, assignment authoring, grading queue | 1 mentor : ~60 graded artifacts/wk combined |
| Interview panel (part-time) | Mock interviews Phase 3–4 | 4–6 credits/student total |
| Ops/support (1) | Doubts, pauses, entitlement issues, nudge follow-ups | 1 : 200 active students |
| Engineering (existing) | Engines per roadmap §17 | — |

**Support SLAs:** doubts <24h (community + mentor office hours), grading <72h, mock interview scheduling <5 days, entitlement issues <4h.

---

## 17. Phased Roadmap (MVP → Full)

### Phase A — MVP (8–10 weeks) — *"Path exists, sellable, trackable"*

1. Data models: PathProduct/Phase/Week/Item, Entitlement, Enrollment, Cohort (ledger).
2. Checkout `kind:'path'` + entitlement grant + auto cohort assign.
3. Study-plan 365 cap lift + path orchestrator generating phase study-plans.
4. Path Home MVP: phase bar, weekly checklist (lessons+skill tests only), streak (fixed), metrics tiles.
5. Admin: Path CMS skeleton (seed 1 path, Phase 1 authored fully), entitlement admin.
6. Sales landing page + path checkout UX.
7. Daily quiz engine + streak + basic league (global first, cohort pages later).
8. **Sell pilot cohort: 30–50 students** (validation before more build).

**Exit criteria:** 30 paid pilot students completing Week 4 with ≥60% weekly active; support load sane; payment + entitlement + dashboard e2e clean.

### Phase B — Contests + Assignments (+6 weeks)

1. Contest engine (weekly + standings + XP awards + cohort league).
2. Assignment engine (submit, rubric, grading queue, late policy).
3. Nudge automation (3/7/14-day + assignment risk).
4. Admin grading queue + contest manager.
5. Phase 2 content authoring (parallel track).

### Phase C — Cohort + Report Cards (+4 weeks)

1. Cohort pages + leagues + wall of fame.
2. Monthly report card engine + email.
3. At-risk ops dashboard.
4. Phase gate exams (skill-test reuse as gate).
5. Mock drive quota integration.

### Phase D — War Mode Features (+4 weeks, as cohort reaches Phase 3–4 timing)

1. Mock interview booking + credits + rubric.
2. Resume review workflow.
3. Vault discount coupon automation + company sprint week links.
4. Placement report + grace mode + alumni conversion + final certificate.

### Phase E — Scale & B2B (+ongoing)

1. College/cohort sales via TPO portal; SSO-style cohort codes.
2. Affiliate/referral program.
3. Multi-cohort leagues, seasons, hackathons.
4. Plagiarism service hardening; proctoring options.
5. Mobile PWA push campaigns per path week (navConfig already PWA-aware).
6. Content: Phase 3/4 just-in-time authoring at scale; guest mentor sessions.

---

## 18. Success Metrics & North Stars

### North star
**Weekly Engaged Path Students (WEPS)** = unique students with ≥1 meaningful action (lesson/quiz/contest/assignment/skill-test) in last 7 days.

### Layered metrics

| Layer | Metric | Target (pilot → steady) |
|---|---|---|
| Activation | Purchase → Week 1 complete | ≥80% → ≥90% |
| Habit | Daily quiz DAU / path MAU | ≥35% → ≥50% |
| Cadence | Contest participation rate/week | ≥50% → ≥65% |
| Cadence | Assignment submission rate/week | ≥60% → ≥75% |
| Progress | Phase gate pass rate (soft gate, first attempt) | ≥50% → ≥65% |
| Retention | Month-6 retention (active) | ≥55% → ≥70% |
| Retention | Month-12 retention | ≥40% → ≥55% |
| Outcome | Internship offer by end of Phase 3 (self-report) | track, no hard claim |
| Outcome | Placement offer within 30 months | track honestly |
| Business | Cohort fill rate (per launch) | ≥70% of target |
| Business | Refund rate | <8% |
| Business | Extension + add-on attach | ≥20% of expiring |
| NPS | Monthly survey (in report card email) | ≥40 |
| Ops | Grading SLA hit | ≥95% <72h |

**Guardrail metric:** at-risk count (14-day inactive) trending — ops must keep <15% of active base.

---

## 19. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Student churn month 3 (novelty death) | High | Streak+league psychology, cohort FOMO, report cards, contest cadence, personal nudge at day 14 |
| Content buffer breaks (just-in-time fail) | High | Hard 8-week buffer rule; Week briefs are light; pause new cohort sales if buffer <4 wks |
| Grading queue explodes | High | Rubric-self grading default, sample audit (20%), auto-tests for code; scale mentors before cohort size |
| Contest plagiarism | Medium | Similarity flags, rotate problems, time-floor, honest MVP scope |
| "No job guarantee" backlash | Medium | Honest copy pre-sale; show system proof (report cards, alumni stories), never outcome claims |
| Legal (refund, claims, data) | Medium | 7-day clear refund, no guarantee language, PII handling for offer letters, T&Cs |
| Entitlement abuse (share account) | Medium | Device registry exists (Devices admin) — path entitlement = 2 active devices max |
| Mentor key-person risk | Medium | Runbooks + recorded sessions + rubric templates as institutional memory |
| Plateau strong students | Medium | Fast-lane challenges, wall of fame, interview panel early access, referral rewards |
| College semester exams clash | Low | Exam Week mode (§7.5) — protected streak, reduced load |
| Payment failures (2nd-year cards) | Medium | Manual UPI + admin verify (exists), EMI, college-batch B2B path |

---

## 20. Open Decisions (owner lock chahiye)

1. **Vaults included or discounted?** Recommended: Core = 40% coupon; Pro = 2 vaults included. (Revenue vs value perception.)
2. **Pilot price:** ₹4,999 vs ₹5,999 for first cohort (recommendation: ₹4,999 early-bird cap 50, anchor ₹7,999 strike).
3. **Hard gate or soft gate** between phases: recommendation = soft (auto-advance + bridging warnings) to protect retention; hard only for certificate claim.
4. **Contest judge:** in-house test-runner (build/extend) vs offline manual judge for MVP (recommendation: offline-judge MVP with delayed verdicts for Week 1–8 contests; auto-judge by Phase B end if execution infra ready).
5. **Cohort granularity:** global grad-year cohorts vs college-specific (recommendation: grad-year global for pilot; college-specific from B2B).
6. **Placement confirm trust level:** pure self-report (fast) vs verify queue (recommended: self-report + optional verify; certificate marked "self-reported" until verified).
7. **Pause policy:** 2×30 days recommended — lock or negotiate.
8. **Daily quiz source bank:** reuse skill-test questions (fast) vs dedicated 365-question bank (better quality — recommend dedicated small bank, 150 questions rotating).
9. **Brand name:** "Placement Prep Path" vs shorter (e.g., "TieEdu Path", "Placement OS") — decide before landing page copy freeze.
10. **Who is the pilot cohort source?** Warm audience / college partnership / paid ads — determines onboarding load.

---

## Appendix A — Surgical edits to existing files (checklist)

- [ ] `backend/src/data/db.ts` — register new record types + ledger buckets (`path_products`, `path_enrollments`, `path_entitlements`, `cohorts`, `contests`, `assignments`, ...)
- [ ] `backend/src/routes/checkout.routes.ts` + `payments/orders.ts` — `kind: 'path'` grant branch (keep `kind:'plan'` compat)
- [ ] `backend/src/routes/gamification.routes.ts:76-78` — lift study-plan 365 cap → 730+
- [ ] `backend/src/routes/gamification.routes.ts:49-51` — wire real streak into leaderboard
- [ ] `backend/src/lib/xp.ts` — extend reason enum: contest, assignment, streak, daily_quiz, gate_pass, phase_complete
- [ ] `frontend/src/lib/navConfig.ts` — "My Path" primary slot for enrolled users
- [ ] `frontend/src/types/index.ts` — cart `kind` + path types
- [ ] `lib/coupons.ts` — scope type `path_product_ids`
- [ ] Seed: `backend/src/data/seedPath.ts` (1 product, 4 phases, 96 weeks skeleton, Phase 1 fully authored)

## Appendix B — Pilot cohort runbook (Week 0–4 excerpt)

| Day | Action |
|---|---|
| D−7 | Welcome email + community invite + "prepare your desk" checklist |
| D0 | Purchase → entitlement + cohort assign + kickoff live session (replay by D+2) |
| D+1 | Baseline skill test deadline push; resume v0 assignment opens |
| D+3 | Nudge non-starters (personal voice) |
| D+7 | First weekly contest (sat) + assignment 1 due; league table live |
| D+14 | First report card pre-check (ops: any <50% checklist → mentor ping) |
| D+30 | Month-1 report card #1 + NPS micro-survey + office hours |
| D+31 | Ops retro: fix top 3 friction points before next cohort launch |

---

*Plan status: Proposed — owner decisions §20 pending. Engineering estimate Phase A MVP: 8–10 weeks with existing team velocity assumptions from DEEP_EXECUTION_PLAN style delivery.*
