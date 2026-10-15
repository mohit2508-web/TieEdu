# Course Expansion, Quality & Perks Plan

> Goal: turn TieEdu's course section into a **branch-aware, certificate-driven,
> mobile-first learning marketplace** — every branch ke bachon ke liye courses,
> industry-tool paid courses, tiered premium certificates, perks on completion,
> aur home page pe strong CTAs jo bachon ko courses ki taraf capture karein.

**Adoption-first framing (locked):** bache 5 wajah se courses lete hain —
(1) semester exam pass karna, (2) placement, (3) internship/projects,
(4) GATE, (5) industry tools. Poori catalogue in 5 buckets mein restructure ki
gayi hai (Part A).

Scope decisions locked with the user:

- **Content depth:** every new course gets full deep content (30–45 lessons, blocks + quizzes), same shape as the existing C / Python courses.
- **Catalogue size (Phase 1):** ~24–30 flagship courses, broad branch coverage; micro-courses (Bucket E) additional entry funnels.
- **Pricing mix:** ~70% free + ~30% paid premium.
- **Quality bar (Part C):** fixed 9-block lesson structure, hands-on practice, module tests + proctored-style final exam gating the certificate, plus a per-course **completeness checklist** (full detailed content).
- **Landing CTAs & offers (Part F):** hero course CTA, branch/goal selector, and a live **offers strip driven by real active coupons** — every offer is a working CTA.
- **Mobile content experience (Part G):** **no long pages** — content is chunked into swipeable steps/segments with a reading-progress model; smooth, thumb-first, 60fps.
- **Admin covers (Part H.4):** per-course thumbnail upload/management from the admin portal (already seeded; expand to crop, presets, bulk, auto-generated fallbacks).

---

## 1. What already exists (baseline)

The course engine is already strong — this plan extends it, it does not rebuild it.

| Concern | File(s) |
|---|---|
| Course / module / lesson / quiz / progress / certificate types | `backend/src/data/db.ts` (Course L347, CourseLesson L323, CourseProgress L554, Certificate L603, ContentBlockType L439) |
| Block vocabulary (13 types, exhaustiveness-guarded) | `backend/src/data/db.ts` `ALL_BLOCK_TYPES` L470 |
| Completion, gating, grading, serial rules | `backend/src/lib/courses.ts` |
| Catalogue filter/sort/facet/pagination | `backend/src/lib/catalog.ts` |
| Seed content (only 4 courses today) | `backend/src/data/seedCourses.ts`, `backend/src/data/{cCourse,pythonCourse,adsCourse}/` |
| Student API | `backend/src/routes/courses.routes.ts` (`/api/courses`) |
| Admin API | `backend/src/routes/courseAdmin.routes.ts` (`/api/course-admin`) |
| Certificate signing + PDF | `backend/src/lib/certificate.ts` (Ed25519, A4 landscape + QR, `SIGNING_VERSION = 3`) |
| XP ledger + levels | `backend/src/lib/xp.ts` (`Rookie → Alumni Core`) |
| Coupons (admin + checkout) | `backend/src/routes/admin.routes.ts`, `backend/src/routes/checkout.routes.ts` (`computeDiscount`) |
| Per-course cover upload | `frontend/src/components/courses/CourseThumbnailEditor.tsx` (single image, ≤4 MB, jpg/png/webp/avif); backend `POST /api/course-admin/courses/:id/thumbnail` (multer) + `GET /thumbnails/:name` |
| Frontend pages | `frontend/src/pages/courses/index.tsx`, `courses/[slug].tsx`, `my-courses.tsx`, `verify/[serial].tsx` |
| Frontend components | `frontend/src/components/courses/*`, `home/CourseRail.tsx`, `home/FreeCourseBanner.tsx` |
| Home page order | `frontend/src/pages/index.tsx` (CourseRail L160, FreeCourseBanner L163) |
| Mobile nav/PWA | `frontend/src/lib/navConfig.ts` (`MOBILE_TAB_SLOTS` L412), `frontend/public/manifest.json` |
| Tests | `backend/src/scripts/smokeCourses.ts`, `backend/scripts/*.test.ts`, `frontend/scripts/course-*.test.ts` |

**Current catalogue: 4 courses, 100% "Computer Science".**

### Real gaps this plan closes

1. **No `branch` dimension** on courses (facets are only `category | tag | type | level`).
2. **Catalogue isn't mapped to student motivation** (exam / placement / tools).
3. **No perks concept anywhere.** Only certificate + XP exist.
4. **One certificate visual style** — no tiering, and no final exam so tiers are meaningless.
5. **No branch/category landing pages.**
6. **No "My Certificates" gallery** (`fetchMyCertificates` is dead code).
7. **Home hero has no `/courses` CTA**; banners push `/interview-course`.
8. **JSON store** (`backend/data/db.json`, ~5 MB) holds all content — needs a scaling answer.
9. **No hands-on practice** (code runner / circuit sim / randomized numericals) and **no module/final exam** — the biggest quality gaps (Part C).
10. **No working "offers"** on the landing page — coupons exist in checkout but nothing advertises them; no offer CTA.
11. **Mobile shows content as long pages** — no chunked/stepped reading model; long scroll on phones.
12. **Covers are upload-only** — no crop/presets/bulk, no auto-generated fallback thumbnail, and cover quality isn't part of the publish gate.

---

## 2. Part A — Branch model + adoption-first catalogue

### 2.1 Add `branch` as a first-class dimension

Add to the `Course` record (`backend/src/data/db.ts`):

```ts
branch: string;                 // 'year1' | 'cse' | 'ai-ds' | 'ece' | 'eee' | 'mech' | 'civil' | 'career' | 'tools'
branch_label?: string;
bucket?: 'A' | 'B' | 'C' | 'D' | 'E';   // which adoption bucket
track_id?: string | null;       // learning path / combo
certificate_tier?: CertTier;    // override; else derived from level
estimated_hours?: number;
perks?: CoursePerk[];           // per-course "what you get" (Part E)
exam?: CourseExam;              // final exam config (Part C.3)
project?: CourseProject;        // capstone (Part C.2)
exam_prep?: ExamPrepData;       // "Semester Exam Mode" payload (Part B.2)
```

Catalogue gets a new filter group `branch` (see `backend/src/lib/catalog.ts` `CATALOG_FILTER_GROUPS` L51) and a matching facet.

### 2.2 The five adoption buckets

#### Bucket A — Year-1 Common (sabse bada audience, **sab free**)

| Course | Kyun | Format |
|---|---|---|
| Engineering Mathematics I & II | Har branch, har university | Concept + solved PYQs + unit tests |
| Engineering Physics essentials | Year 1 common | Short, exam-focused |
| Basic Electrical Engineering (BEE) | Har branch ka first-year subject | Simulator-based |
| Programming for Problem Solving (C) | First-year common | **Existing C course remap karo** |
| Engineering Graphics | Mech/Civil/sab | Visual-heavy |

#### Bucket B — Branch Core (semester-mapped, mostly free) + **Semester Exam Mode**

Existing/planned core courses land here. **Every Bucket B course ships with "Semester Exam Mode"**: unit-wise summary, important questions, PYQs, aur ek **"one-night revision"** view (Part B.2). This is what drives daily free usage.

| Branch | Core courses |
|---|---|
| CSE | Coding Foundations ★, Python ★, Advanced Data Structures ★, Java & OOP, OS, Computer Networks, DBMS |
| ECE | Digital Electronics, Microprocessors & Microcontrollers, Signals & Systems |
| EEE | Electrical Machines & Drives |
| Mech | Engineering Mechanics, Thermodynamics, Strength of Materials |
| Civil | Structural Analysis |

#### Bucket C — Industry Tools & Skills (**yahi paid conversion ka engine hai**)

| Branch | Courses add karo | Price idea |
|---|---|---|
| CSE / IT | Git & GitHub (free), Linux & Shell (free), Android/Flutter, Cloud (AWS basics), Cybersecurity fundamentals, DevOps basics | Git/Linux free, baaki ₹499–999 |
| AI-DS | Generative AI & Prompt Engineering, SQL for Analytics, ML projects | GenAI **₹799** (high demand); ML/DL ₹1,499–2,499 |
| ECE | VLSI & Verilog, IoT with ESP32, PCB Design | ₹999–1,499 |
| EEE | PLC & SCADA, MATLAB/Simulink, EV Technology basics | ₹999–1,499 (EV trending) |
| Mech | SolidWorks/Fusion 360, ANSYS basics, EV powertrain | ₹999–1,299 |
| Civil | AutoCAD Civil, STAAD Pro, Revit/BIM basics, Estimation & Costing | ₹999–1,299 |

Core subjects YouTube pe free mil jaate hain, lekin **structured tool courses with project + certificate** ke liye students paisa dete hain. Existing paid courses (Advanced Data Structures, Full-Stack, System Design, Embedded, CAD, Construction PM) bhi isi bucket ki tarah behave karte hain.

#### Bucket D — Career (all branches)

| Course | Price | Note |
|---|---|---|
| Aptitude & Reasoning Mastery | Free | Sab branches, placement demand |
| DSA Interview Prep | Paid (₹1,999) | Placement |
| Communication & Soft Skills | Free | — |
| Resume + LinkedIn Building | Free, 2h | **Instant certificate** (fastest first win) |
| Internship Hunting Guide | Free | Internship bucket |
| GD & HR Interview | Free | Placement |
| GATE Foundation (branch-wise) | Paid track | GATE bucket |

#### Bucket E — Micro-courses (2–4 ghante)

"Pehla certificate ek weekend mein" hook sirf tab kaam karta hai jab chhote courses exist karein. Ye **funnel ke entry point** hain, certificate tier **Foundation**.

| Micro-course | Duration |
|---|---|
| Resume Masterclass | 2h |
| Git in 2 hours | 2h |
| Excel in 3 hours | 3h |
| ChatGPT / AI for Students | 2h |
| SQL in 3 hours | 3h |

### 2.3 Launch priority — pehle 12 flagship

| Priority | Course | Reason |
|---|---|---|
| 1 | Resume + LinkedIn (micro) | Fastest first certificate |
| 2 | Aptitude & Reasoning | Sab branches, placement demand |
| 3 | Engineering Maths I | Year-1 pool |
| 4 | Python (existing, polish) | Already hai |
| 5 | C / PPS (existing, remap) | Already hai |
| 6 | SQL & Databases | Har branch useful |
| 7 | Web Dev Bootcamp | High interest |
| 8 | GenAI for Students (paid, low price) | Trending, conversion test |
| 9 | DSA Interview Prep (paid) | Placement |
| 10 | Digital Electronics | ECE entry |
| 11 | Basic Electrical (BEE) | EEE + Year 1 |
| 12 | AutoCAD / CAD (paid) | Mech + Civil tool |

Yeh 12 courses 6 branches ko touch karte hain. Inka data (enrolment, completion, paid conversion) dekh ke baaki 20 courses ki priority decide karo.

### 2.4 Learning tracks (combos) — cross-cutting

- **Placement-Ready CSE** (Coding Foundations → C → ADS → DSA Interview Prep)
- **Full-Stack Developer** (Web Bootcamp → SQL → Full-Stack → System Design)
- **AI/ML Engineer** (Python → Python for Data Science → ML → DL)
- **Core ECE** (Digital → Microprocessors → Signals → Embedded)
- **Core Mechanical** (Engg Mechanics → Thermo → Strength → CAD)
- **Placement Pack (all branches)** (Aptitude → Communication → Resume → GD/HR)

Track completion unlocks a **Career Track certificate** (Part D). Aligns with `MULTI_MODULE_COMBO_PLAN.md`.

---

## 3. Part B — Course section UX

### 3.1 Catalogue (`/courses`)

Keep the strong bones (SSR, URL-as-state, facet counts, infinite scroll, mobile filter sheet) and add:

- **Branch/bucket as the top filter** — horizontal chip row on mobile; first fieldset on desktop.
- **"Find your course" wizard** (first-visit, dismissible): `Kis saal mein ho? → branch → kis liye (exam/placement/tool) →` filtered results. Pure client state feeding the same URL query.
- **Certificate + perks visible on every card** (pip + perks line).
- **Intent sections:** "Exam prep (free)", "Placement", "Industry tools", "Start here in a weekend".
- **Bucket-aware empty state** with a fallback suggestion.

### 3.2 Branch landing pages (new) — `/courses/branch/[slug]`

Server-rendered per branch: hero ("Courses for ECE students"), sub-branch chips, tracks, courses, and "Don't know where to start? → 60-second quiz". Add to `sitemap.xml`.

### 3.3 Semester Exam Mode (new, per Bucket B course)

A dedicated tab/sheet on the course page and inside the player:

- **Unit-wise summary** — one screen per unit.
- **Important questions** — curated, checkable.
- **PYQs** — previous-year questions with solutions.
- **One-night revision view** — condensed, printable, all units in one scroll.

Data comes from `course.exam_prep` (Part H). This makes free courses *sticky* — the child returns before every exam.

### 3.4 Course detail (`/courses/[slug]`)

Add to today's layout:

- **"What you'll get" perks panel** (Part E) under the hero — certificate preview, XP, credits, badge.
- **Certificate preview thumbnail** — lightweight SVG mock of the tiered certificate.
- **Sample free lesson** — first lesson of a paid course previewable while signed out (today `CoursePreviewShell` blocks the whole page).
- **Capstone project card** — what the learner will build (Part C.2).
- **Reviews list (read-only)** fed by `db.course_feedback`.
- **Share / save** buttons.

### 3.5 `/my-courses` upgrade & new `/my-certificates`

- Level + certificate tier chip per course; **perks earned** strip; last-activity; "You're 2 lessons + final exam from a Premium certificate" nudge.
- `/my-certificates` gallery: wire the dead `fetchMyCertificates()` into tier-colored cards with preview, PDF, verify, share. Mirror `/skill-test/my-certificates`.

---

## 4. Part C — Course quality & assessment (the biggest lever)

### 4.1 Standard lesson structure (every lesson, 8–12 min)

Fixed 9-block pattern so authoring is consistent and learners know what's coming:

| Block | Kaam | Block type |
|---|---|---|
| Learning objective | "Is lesson ke baad aap ___ kar paoge" (measurable) | `objective` **(new)** |
| Hook | Real-world example / interview question se shuruaat | `callout` / `markdown` |
| Concept | Simple explanation + diagram | `markdown` + `diagram` |
| Worked example | Step-by-step solved problem | `worked_example` **(new)** |
| Try it | Interactive check (code run / simulator / numerical) | `try_it` **(new)** |
| Common mistakes | Galtiyan jahan students phashte hain | `mistakes` **(new)** |
| Exam / interview angle | PYQ ya interview question | `exam_angle` **(new)** |
| Quick quiz | 3–5 questions + explanation | `quiz` (exists) |
| Summary card | One-screen revision | `summary` **(new)** |

**Data model:** extend `ContentBlockType` (`db.ts:439`) + `ALL_BLOCK_TYPES` (`db.ts:470`) with `objective`, `worked_example`, `try_it`, `mistakes`, `exam_angle`, `summary`. The exhaustiveness guard (`MissingBlockTypes` L487) *forces* both to be updated together — the admin allowed-list must derive from `ALL_BLOCK_TYPES`, never be retyped.

Also enforce the standard in the **validator** (`backend/scripts/course-validate.ts`): warn when a lesson is missing `objective`/`summary`, or exceeds a duration band.

### 4.2 Hands-on practice (sabse bada quality jump)

| Branch | Practice | How |
|---|---|---|
| CSE / AI-DS | In-browser code runner + auto-graded problems (test cases) | **Pyodide** (browser Python, zero backend cost) as phase 1; **Judge0** (server sandbox) for multi-language hardening. New `code` block grading + endpoint |
| ECE / EEE | Embedded circuit simulator | **Wokwi** (Arduino/ESP32) + **Falstad** (analog/digital) via `sim` **(new block type)** iframe embeds |
| Mech / Civil | Parameterized numerical problems | New `numerical` block: `{ template, variables, answer_expr }`; server generates **randomized values per attempt**, student's answer graded server-side. Unlimited, copy-proof practice |

**Randomized numerical block** is a generic reusable block type across all core courses.

**Capstone project** at the end of each course (programme-agnostic):

- CSE: GitHub repo link · Mech: CAD model · Civil: estimation sheet · ECE: working circuit/IoT build.
- `course.project` config + a submission link stored on `CourseProgress`.
- Project link appears **on the certificate PDF and the public profile** — this is what gives the certificate real value.

### 4.3 Assessment system (certificate ko meaningful banana)

| Level | Gate | Rule |
|---|---|---|
| Lesson | Quick quiz | 3–5 questions, explanations |
| Module end | **Module test** | Question bank se randomized questions |
| Course end | **Final exam** | Randomised from a bank, **timer**, **pass mark 60%**; **retake after 24h**; **Distinction sirf first attempt 85%+** |
| Course end | Capstone project | Submission link required for Premium/track certificates |

**Certificate gating changes.** Today `POST /api/courses/:slug/certificate` requires 100% lesson completion + `certificate_eligible` + paid access. New rule: **also require a passed final exam** (and project for Premium/track). This is what makes Premium genuinely hard and Distinction meaningful.

**Attempt tracking.** Extend `CourseProgress` (or a new `db.course_attempts`) with `exam_attempts`, `best_exam_percent`, `exam_passed`, `first_attempt_percent`, `last_attempt_at`. Distinction checks `first_attempt_percent >= 85` — retakes can pass but cannot earn distinction.

Security rules unchanged: answers never leave the server before submit (`sanitizeQuizForLearner` pattern), XP/certs stay server-authoritative + idempotent.

### 4.4 Course completeness & content-quality standard ("sab kuch cover kare")

Every published course must pass a **definition-of-done** before an admin can publish it. This is what makes the content genuinely helpful rather than a thin page.

**Per-course blueprint (target):**

- **8–15 modules**, mapped to syllabus units (Bucket B courses map 1:1 to university units).
- **3–5 lessons per module**, each **8–12 min**, following the mandatory 9-block structure (C.1).
- **1 quick quiz per lesson** (3–5 Q) + **1 module test**.
- **≥ 25 questions** in the final-exam bank (+ ≥ 60 in a "one-night revision"/PYQ bank).
- **≥ 1 worked example** and **≥ 1 practice item** (`try_it`) per lesson.
- **≥ 1 capstone project** per course (C.2).

**Completeness checklist (enforced by validator + human review):**

| # | Check |
|---|---|
| 1 | Every lesson has all 9 blocks, in order, and none empty. |
| 2 | Learning objective is measurable ("is lesson ke baad aap ___ kar paoge"). |
| 3 | Every concept has a diagram/image or code sample — no wall-of-text lesson. |
| 4 | ≥ 1 worked example + ≥ 1 `try_it` per lesson. |
| 5 | Quick quiz + module test present; every quiz has an `explanation`. |
| 6 | Exam bank ≥ 25 Q; difficulty mix tagged (easy/medium/hard). |
| 7 | Outcomes / prerequisites / audience / instructor all filled (no placeholders). |
| 8 | Cover thumbnail set and passes quality bar (see H.4). |
| 9 | Course `exam` + `project` config resolved; certificate tier valid. |
| 10 | Media: captions/transcript for video, alt text for images, safe fonts. |
| 11 | Language: simple, student-friendly; jargon explained on first use; light Hinglish allowed in asides. |
| 12 | Links `resources` checked (no dead links). |

**Admin "Course health" panel** surfaces this checklist with pass/fail per item and **blocks Publish** until every required item passes (warnings allowed for optional items). The same checks run headless in `backend/scripts/course-validate.ts` for CI.

**Example of a "good" lesson (reference for authors):**

> Objective → hook (ek real interview question) → concept + diagram → step-by-step worked example → "Try it" (code run / numerical) → 3 common mistakes → exam/interview angle (PYQ) → 4-question quiz → one-screen summary card.

This checklist is the acceptance test for every course in Part A and gates the phases in Part J.

---

## 5. Part D — Tiered premium certificates

Today one navy/amber A4 landscape PDF (`buildCertificatePdf`, `certificate.ts:554`). Add tiers **driven by level/bucket/exam**:

| Tier | Source | Look |
|---|---|---|
| **Foundation** | beginner / micro-courses | Sky/blue frame, simple seal |
| **Professional** | intermediate / Bucket B | Navy frame + silver medallion |
| **Premium** | advanced / paid Bucket C | Navy + **gold foil** frame, embossed gold seal, holographic corner accent |
| **Career Track** | track completion | Premium + track ribbon + "PATH COMPLETED" |
| **with Distinction** | any tier, **first-attempt exam ≥ 85%** | Gold ribbon overlay + "DISTINCTION" |

Certificate body additions: **skills list** (from tags/track), **score/grade** ("Completed with 92% · Distinction"), **capstone project name/link**, and the exam pass date. Keep Ed25519 fingerprint, `signing_key_id`, QR, verify URL exactly as-is.

### Data + signature changes (important)

- Extend `Certificate` (`db.ts:603`): add `tier`, `score_percent`, `skills: string[]`, `project_title?`, `project_url?`, `exam_passed_at`.
- `signedFieldsOf` (`certificate.ts:475`) — adding fields means **bump `SIGNING_VERSION` 3 → 4**, and `verifyCertificate` must accept **both v3 and v4** payloads so old certificates keep verifying. Needs dedicated tests.
- Tier + score computed server-side at issue time; never trusted from the client. Admin override via `course.certificate_tier`.

---

## 6. Part E — Perks & rewards

Perks = tangible rewards surfaced as "yeh sab milega", server-defined + idempotent.

| Perk | Trigger | Reuse |
|---|---|---|
| Tiered verified certificate | course complete + exam pass | certificate engine |
| XP + level-up | lesson/quiz/course | `lib/xp.ts` (already) |
| Skill badge | course complete | new `db.user_badges` |
| Branch badge ("CSE Explorer") | N courses in a branch | new (derived) |
| Next-course credit | complete a free course | **reuse `db.coupons`** + `db.reward_grants` |
| Streak multiplier | daily streak | new (small) |
| Leaderboard rank (branch + global) | XP | existing leaderboard |
| "Skills verified" on profile | any cert | profile/resume |
| Distinction ribbon | first-attempt exam 85%+ | certificate tier |
| Track completion unlock | track done | tracks + prereq |
| Capstone showcase | project submitted | profile |

### Data model

- `db.reward_grants` — append-only (mirrors the XP ledger discipline): `{ id, user_id, perk_key, course_id, coupon_code, created_at }`, unique on `(user_id, perk_key, course_id)`.
- `db.user_badges` — `{ user_id, badge_key, earned_at }`.
- **Coupon reuse:** grants create a single-use `db.coupons` row (`max_uses: 1`, `label: "Certificate reward for <course>"`). No new payment code.
- `Course.perks: CoursePerk[]` drives copy so a course only claims rewards it issues.
- Award inside the same commit path as `settleCompletion` (`courses.routes.ts:294`) so grants can never half-apply.

---

## 7. Part F — Landing page CTA & offers system

Landing page pe sirf link nahi — **working, motivating CTAs** hone chahiye jo bache ko course ki taraf le jaayein, aur **offers** jo actually redeem ho sakein.

### 7.1 Current state

Home order (`frontend/src/pages/index.tsx`): `QuickActions → CourseRail → MockDriveRail → SkillRail → FreeCourseBanner → VaultRail → DropsStrip → PricingSection → FinalCta`. Hero primary CTA = "Explore vaults"; the Two strongest banners point at `/interview-course`, **not `/courses`**.

### 7.2 CTA hierarchy (every CTA is functional, not decorative)

| Slot | CTA | Target | Notes |
|---|---|---|---|
| Hero (primary) | "Explore vaults" (keep) | `#companies` | — |
| Hero (secondary) | **"Start a free course → get a certificate"** | `/courses` | Currently missing |
| Below hero | **Branch / goal selector band** | `/courses/branch/[slug]` | Best capture lever |
| After QuickActions | **Live offers strip** | coupon-armed course CTA | See 7.3 |
| CourseRail | "See all courses" + per-card CTA | `/courses`, `/courses/[slug]` | SSR first paint |
| First-win strip | "Get your first certificate this weekend" | Bucket E micro-courses | Funnel entry |
| FinalCta | add **"Browse free courses"** | `/courses` | Currently only `/interview-course` + `/drops` |
| Mobile | sticky "Start learning free" bar | `/courses` | Below-fold threshold |

### 7.3 Offers system (offers jo actually chalein)

Coupons already exist (`db.coupons` + `GET /api/checkout/coupons` returns active codes, `POST /api/checkout/validate-coupon`). Turn them into a **landing offers surface**:

- **Offers strip / banner** fed by **real active coupons** (`GET /api/checkout/coupons`): shows code, discount, `label`, and remaining uses when `max_uses > 0`. Renders `null` when there are no active offers — never a fake discount.
- **Every offer is a working CTA** — clicking an offer deep-links to `/courses?...` (or the specific paid course) with the coupon code pre-applied, so the same `computeDiscount` path at checkout redeems it. No orphan banners.
- **Offer → course mapping:** `db.coupons` gains optional `applies_to_course_ids` / `applies_to_branch` so an offer can target "GenAI ₹799 → ₹599". Admin sets it in the existing coupon editor.
- **Countdown / urgency** only when the coupon has a real expiry (`expires_at`); never a fake timer.
- **Certificate reward offers** (Part E) surface here too: "Free course complete kiye? ₹200 off advanced" — the granted single-use coupon appears in the strip for that user.
- **A/B-free rule:** the strip reflects stored state; counts, expiry, and remaining uses are computed server-side (consistent with the "no invented numbers" rule in `catalog.ts`).

### 7.4 Branch / goal selector band ("capture the kid")

A horizontal, thumb-scrollable band of cards:

`Apna branch → CSE / ECE / EEE / Mech / Civil / Non-tech` and `Kya chahiye → Exam pass / Placement / Internship / GATE / Tool skill`.

Both route to filtered `/courses` (or `/courses/branch/[slug]`) and set the URL query so the selection is shareable and SSR-able. On first visit, remember the pick locally to personalise later rails.

### 7.5 First-win strip (micro-courses)

A compact row of Bucket E micro-courses ("Resume Masterclass 2h · Git 2h · Excel 3h") with an "instant certificate" badge — the fastest path to a first certificate, which is the strongest retention hook.

### 7.6 CTA copy & design specs

- Copy: simple + motivating, action-first ("Start free", "Get certificate", "Claim 25% off"). Light Hinglish in asides is fine.
- One primary CTA per screen section; never two competing primaries.
- Offer code shown as a copyable chip; tap copies + applies.
- Respect `prefers-reduced-motion`; CTAs use existing `Pressable` + `focus-ring` primitives.
- No dark patterns: no fake scarcity, no pre-checked paid add-ons.

### 7.7 Mobile

- Sticky "Start learning free" bar on `/` once the hero scrolls out (same pattern as `CourseMobileActionBar`).
- Offers strip is swipeable; tap → `/courses` with coupon applied.
- Branch/goal band is swipe cards, 44px+ targets, safe-area insets.

### 7.8 Measurement

Track offer-click → course-detail → enroll → purchase funnel events (reuse existing analytics routes) so "offers chal rahe hain ya nahi" is provable, not assumed.

---

## 8. Part G — Mobile content experience ("no long pages")

PWA today (`manifest.json` `display: standalone`; `courses` already a bottom-tab slot `navConfig.ts:412`). Rule for this part: **content acha se dikhe, ek lambi page na bane — har cheez mobile-friendly aur smooth ho.**

### 8.1 Principle — chunk, don't dump

A lesson is **never one long scroll**. It is a sequence of **segments** matching the 9-block structure (C.1). Mobile presents one segment (or a small group) at a time with a clear **Next / Prev**, so the learner always sees a digestible card:

```
[ Objective ] → [ Hook ] → [ Concept + diagram ] → [ Worked example ]
→ [ Try it ] → [ Common mistakes ] → [ Exam angle ] → [ Quiz ] → [ Summary ]
```

- **Segment header** shows position ("Step 3 of 9") + a thin progress bar.
- **Swipe left/right** between segments; **Next** button is the primary action; keyboard arrows on desktop.
- Each segment is its own scroll container (no full-page jump); diagrams fit width; code blocks scroll horizontally, not the page.
- Desktop keeps the existing continuous layout; the segment model is the **mobile** presentation of the same data — one source of truth, no duplicate content.

### 8.2 Reading model & resume

- **Reading progress** stored per lesson (which segment reached) so reopening resumes exactly where the learner left off (extends the existing `video_position_seconds` idea to segments).
- **"Minute left"** estimate per lesson (honest, from `duration_minutes`), shown at the top.
- **Summary card** is always reachable via a "Jump to summary ✨" affordance — for revision.
- **Semester Exam Mode** opens as a bottom sheet with unit tabs + a printable one-night revision view (Part B.2).

### 8.3 Course player (mobile)

- Video/reading/try-it share one shell; the fixed bottom action bar (already in `LessonPlayer.tsx`, `md:hidden`) becomes **segment-aware** (Next segment / Next lesson).
- Quiz appears as a focused full-height segment with one question at a time on phones (all-at-once on desktop).
- Try-it (code / numerical / simulator) renders in a card; code editor is a proper mobile input (keyboard-safe, resizable), simulator embeds are responsive iframes with a fallback link.

### 8.4 Catalog & discovery (mobile)

- **Branch/bucket chip row** horizontally scrollable, sticky under the search bar.
- **Sticky search**; filter bottom sheet keeps a reset in its header.
- **Toolkit/include facts** summarised as 3–4 chips on the card (level, hours, certificate, price) — no truncation-driven layout shift.
- **Certificate-preview card** and **/my-certificates** gallery with swipe-to-preview.
- **Perks strip** as a horizontal rail.

### 8.5 Smoothness / performance budget

- **60fps targets:** swipe/segment transitions use `transform`/`opacity` only (no layout thrash); respect `prefers-reduced-motion`.
- **Instant navigation:** prefetch the next course/lesson; skeleton (`CourseDetailSkeleton`, `Skeleton`) already exists — reuse.
- **Images:** `next/image` with correct sizes; cover aspect-ratio boxed to avoid CLS; lazy-load below-fold.
- **Bundle:** lazy-load heavyweight bits (code runner, simulator, certificate preview) only when their segment is opened.
- **SSR** the catalogue, branch pages, and CourseRail first paint.
- Keep the established 44px+ targets, `--safe-bottom` insets, and 16px input font rule (`MOBILE_APP_UI_PLAN.md`).

### 8.6 Offline & PWA

- **PWA shortcuts:** add "Browse courses" + "My certificates" to `manifest.json`.
- **Offline:** cache last-viewed outline + Semester Exam Mode revision view (SW exists); certificate PDFs stay online-only.
- Course covers cached for instant catalog paint.

### 8.7 Accessibility

- Every segment has a heading; swipe has an equivalent Next/Prev button; focus is managed on segment change.
- Alt text for images/diagrams, transcript for video, captions when available.
- Tap targets, contrast, and reduced-motion all covered.

---

## 9. Part H — Backend API & data model

### New/changed endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/branch` | branches + counts |
| GET | `/branch/:slug` | branch landing payload |
| GET | `/tracks`, `/tracks/:id` | learning paths |
| GET | `/rewards` | perks/badges earned |
| GET | `/certificates/mine` | exists — wire frontend gallery |
| GET | `/courses/:slug/exam-prep` | Semester Exam Mode payload |
| POST | `/courses/:slug/exam/start` | randomised questions (no answers), timer, `attempt_id` |
| POST | `/courses/:slug/exam/submit` | server grade, store attempt, award |
| POST | `/courses/:slug/module/:id/test` | module test start/submit |
| POST | `/lessons/:lessonId/numerical` | randomised-values numerical grading |
| POST | `/lessons/:lessonId/code` | code-runner test-case grading (Judge0) |
| POST | `/courses/:slug/project` | capstone submission |
| POST | `/:slug/certificate` | extend: require exam pass (+ project for Premium/track), compute tier/score |
| — | catalog | add `branch` / `bucket` filters + facets |

### Data model summary

- `Course`: `branch`, `bucket`, `track_id`, `certificate_tier`, `perks`, `exam`, `project`, `exam_prep`.
- `CourseProgress`: `exam_attempts`, `best_exam_percent`, `exam_passed`, `first_attempt_percent`, `last_attempt_at`, `project_url`.
- `Certificate`: `tier`, `score_percent`, `skills[]`, `project_title`, `project_url`, `exam_passed_at`.
- `ContentBlockType` + `ALL_BLOCK_TYPES`: add `objective`, `worked_example`, `try_it`, `mistakes`, `exam_angle`, `summary`, `numerical`, `sim`.
- New: `db.reward_grants`, `db.user_badges`, `db.exam_banks` (or per-course question bank on `Course.exam`).

### Admin portal — course, cover & content management (H.4)

Admin ko **har course ka thumbnail** aur content seedha portal se manage karna chahiye. Cover upload already exists — ise full management tak expand karo:

- **Existing:** `CourseThumbnailEditor.tsx` (single image, ≤4 MB, jpg/png/webp/avif) ↔ `POST /api/course-admin/courses/:id/thumbnail` (multer) + `GET /thumbnails/:name`; a cover-less course falls back to a generated gradient.
- **Expand to:**
  - **Crop + aspect presets** (16:9 primary, 4:3, 1:1) before save, so every card looks right at every size.
  - **Upload ⇄ generate:** "auto cover" from title (gradient + monogram, deterministic like `courseCover` in `frontend/src/lib/courseFormat.ts`) with a one-tap regenerate; admin can override any time.
  - **Per-lesson / per-module thumbnails** (optional) for a richer syllabus grid.
  - **Bulk upload** (CSV/zip → match by slug) and **drag-and-drop**.
  - **Alt text** field per cover (accessibility) and a **quality gate**: min resolution, allowed formats, max bytes — the same limits the client checks.
  - **Offer badge overlay** toggle (e.g. "25% OFF") driven by an active coupon (Part F.3), never hard-coded.
  - **Live preview** across card sizes (catalog row card, rail card, certificate page).
- **Course health panel (from C.4):** per-item pass/fail checklist with a **Publish** button that stays disabled until required items pass.
- **Content editors:** 9-block lesson editor (reorder, per-block validation), module-test editor, **final-exam bank** editor (questions + difficulty tags), **Semester Exam Mode** editor (units / important Qs / PYQs), perks editor, and branch/bucket/tier selectors.

### Trust rules to preserve

- No invented numbers (`catalog.ts` header): branch counts, ratings, enrolment counted from stored state.
- Certificate issuance server-gated on genuine 100% completion + **exam pass** + eligibility + paid access.
- Quiz/exam answers never sent before submit; XP/perks append-only + idempotent.

---

## 10. Part I — Content authoring pipeline + scaling

Existing deep courses use one data dir per course with per-module files (`backend/src/data/cCourse/modules/m01.ts … m15.ts`, ~30–77 KB each). The 9-block standard (Part C.1) makes authoring consistent.

1. **One directory per course:** `backend/src/data/<courseSlug>/index.ts` + `modules/mNN.ts`, registered in `seedCourses.ts` (`getSeedCourses()` L41).
2. **Extend the validator** `backend/scripts/course-validate.ts`: slug uniqueness, sequential `sort_order`, quiz `correct_index` in range, prereq ids exist, branch/bucket/tier valid, no empty blocks, **lesson 9-block completeness**, exam bank size ≥ threshold, each numerical block has an `answer_expr`.
3. **Content lint test** walking all seeds (mirror `course-*.test.ts`).
4. **JSON-store scaling (must address):**
   - `db.json` ~5 MB with 4 courses; 30+ deep courses + exam banks could push it to tens of MB, and `saveDb()` rewrites the whole file on every write.
   - Recommended: keep **course content + exam banks as versioned seed modules** (source of truth for definitions) and keep `db.json` for mutable state (progress, attempts, certificates, grants). On boot, seed/refresh definitions; persist only admin overrides.
   - If kept fully in `db.json`, enable the Postgres mirror (`ENABLE_PG_REPLICA=1`, `backend/src/store/`) for courses, or split content per-course loaded on demand.

---

## 11. Part J — Phased rollout

| Phase | Deliverable | Key files |
|---|---|---|
| **0. Groundwork** | `branch`/`bucket`/`track_id`/`certificate_tier`/`perks`/`exam`/`project` fields; new block types; `SIGNING_VERSION` v4 + v3 compat; backfill 4 courses; catalog `branch`/`bucket` facets | `db.ts`, `certificate.ts`, `catalog.ts`, `seedCourses.ts` | ✅ DONE
| **1. Assessment + certs** | Module tests + final exam (randomised, timer, retake, distinction); certificate gating on exam; tiered premium PDFs; perks/badges/coupon grants; `/my-certificates` | `courses.ts`, `courses.routes.ts`, `certificate.ts`, `xp.ts`, frontend | ✅ DONE (module tests: `POST /courses/:slug/module/:id/test`, `ModuleTestCard`, `ModuleTestEditor`; smoke section [20], 276/276) |
| **2. Practice engines** | ~~`code` (Pyodide→Judge0), `sim` (Wokwi/Falstad), `numerical` randomized blocks; capstone submission~~ **SKIPPED (user decision):** assessment stays MCQ-based — quizzes, module tests, and the final exam judge every course; no coding compiler or simulator. | — | ⛔ SKIPPED |
| **3. Discovery UX** | Branch landing pages, wizard, catalogue upgrades, Semester Exam Mode, CourseRail SSR | `frontend/src/pages/courses/*`, `home/*` | ✅ DONE (3.1 CatalogHelpers: IntentSections/CourseWizard/MobileFilterChips, bucket-aware empty state; 3.2 `/courses/branch/[slug]` SSR + sitemap; 3.3 Semester Exam Mode: `exam_prep` per-unit summary/PYQ-solution payload, `ExamPrepEditor`, `ExamPrepPanel` (Units/Important/PYQs/Revision tabs) + in-player Sheet, smoke [22]; 3.4 detail: CertificatePreview SVG, CourseReviews (`GET /:slug/reviews`), ShareSaveButtons, capstone card, free sample lesson via `GET /:slug/sample`; 3.5 `/my-courses`: level+tier chips (shared `tierStyle` from CertificatePreview), perks line, last-activity (`formatRelative`), certificate nudge using new `/my` row flags `exam_required`/`project_required` + `certificate_tier`, gallery link — smoke [22]+[23], 319/319) |
| **3b. Landing CTA & offers** | Hero course CTA, branch/goal band, live offers strip (active coupons), offer→course mapping, FinalCta, funnel analytics | `frontend/src/pages/index.tsx`, `home/*`, `lib/coursesApi.ts`, `admin.routes.ts` | ✅ DONE (BranchGoalBand, OffersStrip, FirstWinStrip, HomeMobileCtaBar, CouponBanner, `?coupon=` pre-apply, coupon expiry+scope, smoke [21], 291/291; funnel via `src=` link markers) |
| **3c. Mobile content model** | Segment/swipe lesson reading + resume, mobile player, smoothness budget, PWA shortcuts | `components/courses/*`, `LessonPlayer.tsx`, `manifest.json` | ✅ DONE (`MobileSegmentReader`: one-step-at-a-time cards (video → blocks → quiz), swipe + 44px Next/Prev, opacity-only `segment-fade` (reduced-motion off), per-device resume via `lessonSegments.ts`, "Jump to summary" to the authored summary block, "About N min"; bottom bar segment-aware (Next step · N of M → Next lesson); quiz one-question-at-a-time on phones (`oneAtATime={isMobile}`); `useMediaQuery` hook (SSR-safe, desktop-first paint); PWA shortcuts + Browse courses + My certificates; outline/revision offline already covered by SW stale-while-revalidate on `/api/courses`; mobile-shell tests 24/24) |
| **3d. Admin covers & authoring** | Crop/presets/auto-cover/bulk, alt text, offer badge, course-health publish 
gate, exam/prep editors | `courseAdmin.routes.ts`, `AdminCourseEditor.tsx`, `CourseThumbnailEditor.tsx` | ✅. 
DONE (`courseHealthFor` shared by PUT publish gate + admin `CourseHealthPanel`; `thumbnail_alt` + 
`offer_badge_enabled` round-trip; `CourseThumbnailEditor` DnD + crop with 16:9/4:3/1:1 + auto-cover via 
`courseCover()` palette + min-res gate 640×360; `BulkCoverUploader` in AdminCoursesTab list; `active_offer` badge + 
`thumbnail_alt` on `CourseCover`/`CourseRowCard`; smoke [24]: draft→fill→publish gate, alt/toggle round-trip, live 
scoped coupon badge on paid course only; backend 337/337, frontend 2/30 baseline) |
| **4. Content — flagship 12** | Ship the launch-priority 12 with 9-block lessons + exams + practice | `backend/src/data/<slug>/` | ✅ CONTENT SHIPPED — 10 flagship + 2 free tools: Resume+LinkedIn ✅ (E), Aptitude ✅ (D), Engg Maths I ✅ (A), SQL ✅ (C), Web Dev ✅ (C), Digital Electronics ✅ (B), BEE ✅ (A), GenAI ✅ (D ₹799 unpublished), DSA ✅ (D ₹1499 unpublished), AutoCAD ✅ (C ₹999 unpublished), **Git & GitHub ✅ (C free)**, **Linux & Shell ✅ (C free)**. All: 4×2 lessons, 30-q bank, green 337/337 + frontend 2/30 baseline. Paid three stay `published:false` until payment infra. Next: branch depth (row 5) or payment wiring |
| **5. Content — branches** | Remaining Bucket B/C courses (ECE/EEE/Mech/Civil/AI) | same | ✅ SHIPPED (scope cut by user) — **Operating Systems ✅ (B cse core free)**: `osCourse/`; **Computer Networks ✅ (B cse core free)**: `cnCourse/`; **DBMS ✅ (B cse core free)**: `dbCourse/`; **Signals & Systems ✅ (B ece core free)**: `ssCourse/`; **Thermodynamics ✅ (B mech core free)**: `thCourse/`; **Fluid Mechanics ✅ (B mech/CE core free)**: `fmCourse/` — all 4×2 lessons, 30-q bank (difficulty+topic), exam_prep 4 units + 3 PYQs, project required; backend 337/337, frontend 2/30. **Remaining ECE/EEE/Mech/Civil/AI courses SKIPPED per user decision — move to row 6** |
| **6. Micro-courses + tracks** | Bucket E micro-courses, learning tracks, Career Track certificate, PWA shortcuts | seeds, frontend, `manifest.json` | ✅ SHIPPED — **Excel for Students ✅ (E career, foundation, 3h, free)**: `excelCourse/` 4×2 lessons, 30-q bank (difficulty+topic), exam_prep 4 units + 3 PYQs, capstone project required, `certificate_tier: 'foundation'` — registered in seedCourses. **5 learning tracks** seeded in `seedTracks.ts` (placement-ready-cse, cs-core, web-foundations, core-ece, placement-pack): `LearningTrack` in db.ts, merge-by-slug in loadDb, `lib/tracks.ts` progress helpers, `routes/tracks.routes.ts` (`GET /`, `GET /:slug`, `POST /:slug/certificate` — readiness-gated, idempotent, signed `career_track` cert reusing v4 payload + course cert download/verify). Frontend: `LearningTrack`/`TrackCourseState`/`TrackListResponse`/`TrackDetailResponse` in `types/index.ts`, `tracksApi.ts` (fetchTracks/fetchTrack/claimTrackCertificate), `/tracks` list page, `/tracks/[slug]` detail with per-course progress + claim CTA + cert download, catalogue entry link (Route icon). **PWA shortcuts + browse-courses + my-certificates already done in Phase 3d** — no new work needed. Backend 337/337, frontend tsc clean, 2/30 baseline. |
| **7. Hardening** | Tests, JSON-store scaling, analytics (per-branch conversion) | `smokeCourses.ts`, test scripts | ✅ DONE — **Tests:** backend full suite green (smoke 348/348 after new [25] section), 30 frontend suites at 2/30 known baseline, validators (`course-validate`, assessment, perks, coupons, health gate). **JSON-store scaling:** addressed per Part I.4 — course content + exam banks + tracks live as versioned seed modules (merge-by-slug on boot = definitions refresh, `db.json` holds mutable state only), Postgres mirror available via `ENABLE_PG_REPLICA=1`. **Per-branch conversion analytics:** `buildAnalyticsSnapshot` (`lib/stats.ts`) now emits a `courses` slice — totals + `by_branch` + `by_bucket`, each row with courses/published/enrolments/completions/completion_rate/paid_conversions/revenue_inr, attributed from `course_progress` + paid order lines (`kind:'course'`), unbranded courses counted as `unlisted` so slices always sum to totals; smoke [25] pins the reconciliation + derived-rate invariants + admin-only guard |

---

## 12. Part K — Testing

- **Certificate:** `certificate-*.test.ts` — tier/palette selection, score→distinction (first-attempt only), **v3 certs still verify after v4 bump**, revoked watermark unchanged.
- **Exam:** randomised selection, timer expiry, 60% pass, retake-after-24h, distinction only on first attempt, answers never leak.
- **Numerical/code blocks:** randomised values differ per attempt; server-side grading correct; no answer in payload.
- **Catalogue:** branch/bucket facet tests (counts narrow; unknown value matches nothing).
- **Perks:** idempotent grants; coupon row created once; perks only after genuine completion + exam.
- **E2E:** extend `backend/src/scripts/smokeCourses.ts` — full flow: enroll → 9-block lesson → module test → numerical/code practice → final exam → tiered certificate (with distinction path) → reward coupon → track completion.
- **Frontend:** `frontend/scripts/course-*.test.ts` for catalog state, Semester Exam Mode, certificate preview.
- Run: `npm run test:smoke`, `test:certs`, `test:certhttp`, `test:certadmin` (backend); `node scripts/run-tests.mjs` (frontend); `tsc --noEmit`.

---

## 13. Part L — "Aur kya kar sakte hain" (beyond this plan)

- **Public shareable learner profile** — certificates + badges + capstone projects, shareable link.
- **LinkedIn "Add to profile"** one-click from the certificate page.
- **Branch leaderboards** (CSE/ECE/Mech).
- **Reviews & Q&A** on course pages (feedback already collected).
- **Bundles + combo pricing** (see `MULTI_MODULE_COMBO_PLAN.md`).
- **Streaks & daily goals** feeding XP multipliers.
- **Certificate → Resume builder / placement drive eligibility.**
- **Email drip on enrollment** (infra exists).
- **Multilingual subtitles / Hinglish captions** (`audio_language`/`caption_language` fields exist).
- **Instructor profiles & marketplace** (block + admin CRUD exist).
- **Admin analytics** — per-branch/bucket enrolment, completion, paid conversion (analytics routes exist).
- **Offline Semester Exam Mode** via service worker.
- **Peer solution sharing** for code/numerical blocks (moderated).

---

## 14. Open decisions before implementation

1. **JSON-store strategy** — seed modules + small mutable `db.json` (recommended) vs. Postgres mirror for courses.
2. **Practice engine** — start with Pyodide + Wokwi/Falstad embeds (cheap) or go straight to Judge0 (multi-language, infra cost)?
3. **Exam difficulty** — pass mark 60% and distinction 85% confirm; retake window 24h confirm.
4. **Content ownership** — who writes the flagship 12 deep courses (in-house vs. templated from existing C/Python blocks)?
5. **Paid pricing** — confirm ₹499–₹2,499 bands and per-track bundling discount.
6. ~~**Track certificates** — separate Career Track certificate vs. endorsement on the final course's certificate?~~ **RESOLVED: separate Career Track certificate** (tier `career_track`, own serial, readiness-gated on all member courses, reuses v4 signed payload + course cert download/verify endpoints). Shipped with tracks infra.
7. **Preview lessons** — allow first-lesson free preview on paid courses?
8. **Offers source** — drive the landing offers strip purely from live active coupons, or also allow curated editorial offers (or both)?
9. **Mobile content model** — segment/swipe steps within a lesson (recommended) vs. accordion sections vs. tabs?
10. **Thumbnails** — require admin upload for publish, or allow a generated auto-cover as an accepted default?
