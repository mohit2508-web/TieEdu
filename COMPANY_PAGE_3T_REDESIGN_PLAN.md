# Company Page — "3T" (Train · Test · Track) Redesign Plan

> Source: `Accenture company page — 3T redesign.pdf` (3 pages, hi-fi mock with placeholder data).
> Target: replace the current company "vault" page (`frontend/src/pages/company/[slug].tsx`) with a
> per-company **preparation loop** — first for Accenture, then the mass recruiters
> (TCS, Infosys, Wipro, Cognizant, Capgemini).

---

## 1. What the design is really asking for

The current page is a **content store**: hero → free module → premium module grid → experiences → related
vaults, with a sticky "Unlock Now" bar. It sells questions.

The redesign is a **campaign page for one hiring drive**. It answers a fresher's questions in the order
they actually have them:

| # | Student's question | Design section |
|---|---|---|
| 1 | "What should I do right now?" | Hero: **Your next step** + **Free readiness check** |
| 2 | "Is it worth it?" | Stat strip: ASE ₹4.5 LPA · AASE ₹6.5 LPA · 4 rounds · batch · drive open/closed |
| 3 | "Can I even apply? How?" | **Eligibility** table + **How to apply** (4 steps) |
| 4 | "What are the rounds and am I ready for each?" | **4 rounds** stepper, each with a Train → Test → Track loop |
| 5 | "My test is on X — what do I do each day?" | **Countdown plan** (test date → day split) + **Today's Drop** (10 Qs, streak) |
| 6 | "Which role should I aim for?" | **ASE vs Advanced ASE** picker + comparison |
| 7 | "What do I pay?" | **Free vs ₹99 Accenture Pack** + "share your experience, get it free" |
| 8 | "Is the drive live? Did invites go out?" | **Drive Radar** (crowd-reported, crowd-confirmed) + Notify me |
| 9 | "I got selected — now what?" | **Onboarding tracker** (x of 5 done) |
| 10 | "I failed — now what?" | **Comeback plan** |
| 11 | Leftover doubts / next company | **FAQ** · **Also preparing for** + Compare · legal footer |

This is a **product change, not a reskin**. Roughly 40% of the page is new backend behaviour.

### Strategic shifts baked into the design
1. **Audience shift.** The current data is product companies (Google, Zscaler, Razorpay…). The design
   targets **mass service recruiters**: high-volume, low-ticket, fixed test patterns.
2. **Pricing shift.** The current per-company ladder is ₹99 / ₹169 / ₹219 / ₹249 (`backend/src/lib/pricing.ts`).
   The design shows **one ₹99 one-time pack** per company. These conflict, so pick one (see §6, D1).
3. **Free-first funnel.** A free readiness check, one free mock, a free countdown plan and daily practice
   come first; payment comes after the student has a score.
4. **Retention loop.** Daily Drop + streak + Drive Radar notifications bring students back for
   the 2–8 weeks before their test.
5. **Community supply.** "Share your experience → pack free" and "Report an update" turn students into
   the content and freshness engine.

---

## 2. Design review: issues to resolve before building

Gaps in the mock itself. Each needs a decision or a spec addition.

| # | Issue | Recommendation |
|---|---|---|
| R1 | **No visible H1 / company name** in the hero. Only the chips and "Accenture · 2026–27 freshers". | Add H1 "Accenture placement preparation 2026–27". Needed for SEO and clarity. |
| R2 | Several containers render **empty**: the hero "Your next step" body, the readiness card body, the round loop panel, the countdown right panel, the ASE/AASE table, the FAQ list. | Spec three states for each: **guest**, **logged-in with no data**, **logged-in with data**. |
| R3 | The ASE/AASE and EN/Hinglish toggles look like **unstyled browser buttons**. | Use the segmented-control pattern from the existing chips. |
| R4 | **Placeholders everywhere** (`[N] questions`, `[Policy]`, `[date]`, `[Open / Closed]`). | Each becomes an admin field with an honest empty state ("Being verified"). Never ship invented numbers (matches the existing "no invented credibility" rule in `admin.routes.ts`). |
| R5 | **Refund policy** is a placeholder. | Write it before launch. Payments are manual UPI verification today, so "full refund within 7 days if bank not opened" needs a server-side "opened" flag. |
| R6 | "**Today's Drop**" collides with the existing **Drops** feature (`/drops`, news/offer cards). | Rename this one **"Daily 10"**, or make Daily 10 a new Drop type. Don't overload the word. |
| R7 | "**Get the pack free**" for sharing an experience invites fake reports. | Grant only after admin verification. Limit one per user per company. Require the test date and round details. |
| R8 | **Drive Radar** "confirmed by n students" can be gamed. | One confirmation per user, signed-in only. Show the update only after it reaches a confirmation threshold or an admin approves it. |
| R9 | Page is very long on mobile (11 sections). | Sticky section-nav chips (already in the design as "Your Accenture loop") plus a sticky bottom CTA that changes by state. |
| R10 | Legal: company name and logo use. | Keep the footer disclaimer. Use the text name, not the Accenture logo, unless licensed. Say "Accenture-**pattern**", never "actual Accenture questions". |
| R11 | "2026–27 freshers": batch labels go stale. | Make `cohort_label` an admin field. Never hardcode it. |

---

## 3. Gap analysis: design vs current codebase

✅ = exists and reusable · 🟡 = partially exists, needs extension · ❌ = new build

| Design element | Status | What exists today | What's needed |
|---|---|---|---|
| Breadcrumb, footer | ✅ | `company/[slug].tsx`, `layout/Footer` | Add the "Not affiliated" disclaimer per company |
| 3T chips + cohort label | ❌ | — | `cohort_label` field; static chips |
| Stat strip with "Being verified" badges | 🟡 | `ctc_min/max`, `avg_rounds`, `metric_sources` (`ProvenanceMap`), `TrustBadgeBar` | **Per-role packages** (ASE / AASE), `eligible_batches`, `drive_status`. Badge = provenance null → "Being verified" |
| Eligibility table | ❌ | — | `eligibility` object + `eligibility_checked_at` + source URL |
| How to apply (steps) | ❌ | — | `apply_steps[]` (title, body) |
| Rounds stepper | 🟡 | `rounds_pipeline: RoundStep[]` (only Zscaler has data), modules by `round_type` | Extend `RoundStep` with pattern (sections, Q count, minutes, elimination, topics), `pattern_verified_at`; Accenture rounds = Cognitive & Technical / Coding / Communication / Interview, which aren't in the `RoundType` enum |
| Round **Train** | ✅ | Modules + items + `CompanyModuleReader` | Link modules to a round id |
| Round **Test** | 🟡 | Skill-test engine (`Assessment` with `topicBlueprint`, timer, tab-switch limit, `Attempt.topicPerformance`) | Add `company_id` + `round_key` to Assessment; company question banks |
| Round **Track** | 🟡 | `Attempt.topicPerformance`, `skillLevel` | Per-company aggregation endpoint: best score per round, weakest topics |
| Free readiness check | 🟡 | Skill-test engine | A short mixed assessment per company (≈20 Qs / 25 min), guest-startable or login-gated (decision D4) |
| 1 full mock drive | ✅ | `mock_drive` table has `company_id` (Postgres) | Surface it from the company page |
| Countdown plan | 🟡 | `/api/study-plan/generate` + enrolment phases | Company-scoped generator: test date → days left → day-wise blocks per round, weighted by weak topics |
| Daily 10 + streak | 🟡 | `users.streak`, XP ledger | Daily deterministic 10-question set per company; streak per company or global (decision) |
| ASE vs AASE picker | ❌ | — | `roles[]` per company (title, CTC, extra round, eligibility diff); user's target stored in preferences |
| Free vs ₹99 pack | 🟡 | Cart / checkout / unlocks, pack ladder | Per-company `pack_price` override. Pack grants **question bank + sectional mocks + analytics**, not only modules |
| Preview 3 questions | 🟡 | `ModulePreviewModal`, `/courses/:slug/sample` pattern | Company sample endpoint |
| Share experience → pack free | 🟡 | `SubmitReportModal`, `reports` (pending_review → published), `perks` / `reward_grants` | On admin publish → issue a reward grant that unlocks the company pack |
| Drive Radar | ❌ | Push (`store/push.ts`), notifications, email | New `drive_updates` + `drive_update_confirmations` + `drive_watchers` (Postgres) |
| Notify me | 🟡 | Push subscriptions + notification prefs + email queue | Topic `company:<slug>` subscription |
| Onboarding tracker | ❌ | — | Per-company `onboarding_steps[]` (admin) + per-user progress |
| Comeback plan | ❌ | — | Uses Track weakest round + open mock drives + "also preparing for" |
| FAQ | ❌ | — | `faqs[]` + `FAQPage` JSON-LD |
| Also preparing for + Compare | ✅ | `RelatedVaults`, `/compare` | Restyle as chips; "readiness carries over" needs shared topics (aptitude) between companies |
| EN / Hinglish toggle | ❌ | No i18n in frontend (only `school-platform` uses next-intl) | Page-scoped copy dictionary first (§5, Phase 7) |
| Section nav chips | ❌ | — | Scroll-spy nav, sticky on scroll |
| Accenture itself | ❌ | **Accenture doesn't exist in the data.** The 10 companies have 1–12 questions each | Content work is the long pole (§7) |

---

## 4. Data model changes

### 4.1 Company (JSON doc, `backend/src/data/db.ts` + `frontend/src/types/index.ts`)
Editorial, low-write data, so it stays on the company record:

```ts
interface Company {
  // …existing fields…
  page_layout?: 'vault' | '3t';            // feature flag per company — old page stays for others
  cohort_label?: string | null;            // "2026–27 freshers"
  drive_status?: 'open' | 'closed' | 'unknown';
  eligible_batches?: number[];             // [2026, 2027]
  roles?: CompanyRole[];                   // ASE, AASE
  eligibility?: {
    degrees: string[]; passing_years: number[];
    min_marks: { tenth?: number; twelfth?: number; graduation?: number } | null;
    backlogs_policy: string | null; gap_policy: string | null;
    source_url: string | null; checked_at: string | null;
  };
  apply_steps?: { title: string; body: string }[];
  rounds_v2?: CompanyRound[];
  faqs?: { q: string; a: string }[];
  onboarding_steps?: { key: string; title: string; hint?: string }[];
  pack?: { price_inr: number; question_count: number | null; refund_policy: string | null; updated_label?: string };
  also_preparing_slugs?: string[];
}

interface CompanyRole {
  key: string;            // 'ase' | 'aase'
  title: string;          // 'Associate Software Engineer'
  ctc_lpa: number | null; // 4.5
  extra_rounds?: string[];// AASE: advanced coding
  notes?: string;
}

interface CompanyRound {
  key: string;            // 'cognitive-technical' | 'coding' | 'communication' | 'interview'
  title: string;
  sections: { name: string; questions: number | null; minutes: number | null }[];
  elimination: boolean | null;
  topics: string[];
  module_ids: string[];        // TRAIN
  assessment_ids: string[];    // TEST (sectional mocks)
  pattern_verified_at: string | null;
  last_drive_date: string | null;
}
```

Provenance: reuse `metric_sources` with keys `role_ase_ctc`, `role_aase_ctc`, `eligibility`, `round_<key>`.
No source means the "Being verified" badge.

### 4.2 Write-heavy user data → **PostgreSQL tables, not db.json**
The analysis found the JSON store re-parses 7.7 MB per request and has 38 lost-update windows.
Streaks, confirmations and checklists are high-frequency writes, so put them in Postgres like `mock_drive`:

| Table | Purpose |
|---|---|
| `company_prep_profile` (user_id, company_id, target_role, test_date, created_at, updated_at) | Target role + countdown anchor |
| `daily_set_completion` (user_id, company_id, day, score, completed_at) — unique (user, company, day) | Daily 10 + streak |
| `drive_update` (id, company_id, kind, body, reported_by, status, created_at) | Drive Radar entries |
| `drive_update_confirmation` (update_id, user_id, created_at) — unique pair | Crowd confirmations |
| `company_watch` (user_id, company_id, channels) | Notify me |
| `onboarding_progress` (user_id, company_id, step_key, done_at) | Onboarding tracker |

### 4.3 Skill-test linkage
Add optional `companyId` and `roundKey` to `Assessment` (`backend/src/data/skillTestTypes.ts`).
The readiness check and sectional mocks are ordinary assessments filtered by company.

---

## 5. Phased build plan

Each phase ships on its own behind `page_layout: '3t'`, so the existing vault page keeps working for other companies.

### Phase 0: Prerequisites and decisions (2–3 days)
- [ ] Decide D1–D6 (§6).
- [ ] **Fix the data-safety bugs first**: the `loadDb` catch that rewrites the seed (`db.ts:2412`), and the
      client-priced `plan` items in checkout (`checkout.routes.ts:267, 344`). The new ₹99 pack goes through
      that same checkout.
- [ ] Gather Accenture source material: official eligibility, round pattern, CTCs with dates and sources.
- [ ] Write the refund policy.

### Phase 1: Data model + admin editor (4–5 days)
- [ ] Extend `Company` types (backend and frontend) per §4.1. Sanitizers in `admin.routes.ts` (whitelist, like `EDITORIAL_FIELDS`).
- [ ] Admin UI in `CompanyHubManager.tsx`: tabs for Roles, Eligibility, Apply steps, Rounds, FAQ, Onboarding, Pack.
- [ ] Public `GET /api/companies/:slug` returns the new fields. Provenance-null fields come back as `null`, never defaults.
- [ ] Create Accenture with real, sourced data. Everything unsourced stays `null`.
- [ ] Tests: sanitizer rejects unknown fields; null provenance gives "being verified".

### Phase 2: Static page shell, the MVP (5–7 days)
New components in `frontend/src/components/company3t/`:
- [ ] `Hero3T`: H1, chips, cohort, NextStep card (guest: "Take the free readiness check"), Readiness card.
- [ ] `StatStrip`: per-role CTC, rounds, batch, drive status, verification badges.
- [ ] `SectionNav`: sticky scroll-spy chips (Readiness · Eligibility · Rounds · Prep plan · ASE vs AASE · Prep pack · Drive Radar · FAQ).
- [ ] `EligibilityCard` + `HowToApply`.
- [ ] `RoundsStepper`: round tabs, pattern table, Train list (existing modules → opens existing reader).
- [ ] `RoleCompare`: ASE vs AASE table + "Aim for" segmented control (stored locally until Phase 4).
- [ ] `PrepPackPricing`: Free vs ₹99 cards, "Preview 3 questions", "Share experience → free" banner (opens the existing `SubmitReportModal`).
- [ ] `FaqList` + `FAQPage` JSON-LD (escape `<` in the JSON-LD; see the analysis XSS note).
- [ ] `AlsoPreparing` chips + Compare CTA.
- [ ] Page switch in `company/[slug].tsx`: `company.page_layout === '3t' ? <Company3TPage/> : <existing/>`. Keep reader mode (`?m=` / `?q=`) working.
- [ ] Mobile: one sticky bottom CTA whose label follows state (Start readiness check → Continue plan → Get pack).
- [ ] SEO: title/description from data, canonical, OG image.

**After Phase 2 the page is live and useful, but Test, Track, Countdown and Radar show "coming soon"/guest states.**

### Phase 3: Test + Track loop (6–8 days)
- [ ] `companyId` / `roundKey` on assessments; admin can create company assessments.
- [ ] Accenture **readiness check** (≈20 Qs, 25 min, mixed rounds) + **sectional mocks** per round.
- [ ] Pack gating: free = readiness check + 1 mock per round; pack = all sectional mocks + full bank.
- [ ] `GET /api/companies/:slug/readiness`: best attempt per round, overall score, 3 weakest topics.
- [ ] Hero NextStep becomes personalised ("Your weakest round is Coding → practise loops & strings").
- [ ] Link the existing Mock Drive for this company (`mock_drive.company_id`).

### Phase 4: Countdown plan + Daily 10 (5–6 days)
- [ ] `company_prep_profile` table; "My test date" input + target role persisted.
- [ ] Plan generator: days left × rounds × weakness weights → day cards (reuse study-plan block shapes).
- [ ] Daily 10: deterministic seed (company + date), from the bank, free tier gets the set too.
- [ ] Streak per company in `daily_set_completion`; XP via existing `awardXp`.
- [ ] Push/email reminder on missed day (existing reminders + push infra).

### Phase 5: Drive Radar + community rewards (5–6 days)
- [ ] Tables `drive_update`, `drive_update_confirmation`, `company_watch`.
- [ ] Report an update (signed-in, rate-limited), confirm (one per user), admin moderation queue.
- [ ] Display rule: shown when admin-approved OR ≥ N confirmations; show "confirmed by n students" + date.
- [ ] Notify me → push + email to watchers when an update goes live.
- [ ] `drive_status` auto-suggest from radar (admin confirms).
- [ ] Experience-for-pack: on report publish → reward grant unlocks pack (one per user per company, audited).

### Phase 6: Onboarding tracker + Comeback plan (3–4 days)
- [ ] Admin-authored `onboarding_steps` (e.g. offer letter, BGV docs, joining letter, pre-joining training, day one).
- [ ] Per-user checklist (`onboarding_progress`), "x of 5 done".
- [ ] Comeback plan: from Track → weakest round → targeted 7-day plan + list of open drives (mock drives + radar "open" companies).

### Phase 7: Hinglish + roll-out (4–6 days + content)
- [ ] Page-scoped copy dictionary (`company3t/copy.ts` with `en` / `hi-Latn`), toggle stored in preferences. No full i18n framework yet.
- [ ] Admin fields optionally carry `_hinglish` variants for FAQ / apply steps.
- [ ] Roll out to TCS, Infosys, Wipro, Cognizant, Capgemini (data entry + question banks).
- [ ] "Readiness carries over": map shared topics (quant, logical, verbal) across companies so an aptitude score seeds every company's Track.

**Total engineering: about 5–7 weeks for one developer**, plus content production running in parallel.

---

## 6. Decisions needed

| ID | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Pricing | (a) ₹99 flat per company pack, (b) keep the 99/169/219/249 ladder | **(a)** for mass recruiters (matches the design and the market), keep the ladder for product companies. Implement as `pack.price_inr` override |
| D2 | What the pack unlocks | Modules only vs bank + mocks + analytics | Bank + all sectional mocks + detailed Track. Free keeps readiness + 1 mock + Daily 10 |
| D3 | Rollout | Accenture only first vs all 6 | **Accenture first**, measure 2–3 weeks, then copy the template |
| D4 | Readiness check for guests | Login required vs guest attempt | Let guests start; require signup to **see the score** (best conversion point) |
| D5 | Streak scope | Per company vs global | Global streak (existing `users.streak`), per-company completion history |
| D6 | Hinglish | Now vs Phase 7 | Phase 7, since it touches every string |

---

## 7. Content needed (the long pole)

The design is only as good as its data. Current vaults have **1–12 questions each**, and the ₹99 pack
promises "[N] questions". Minimum for an Accenture launch:

| Item | Minimum |
|---|---|
| Eligibility + apply steps + roles + CTC (with sources) | 1 sourced page |
| Round patterns (sections, Q counts, minutes, elimination) | 4 rounds, dated |
| Readiness check | 20 questions |
| Sectional mocks | 4 rounds × 2 mocks × 15–25 Qs ≈ 150 Qs |
| Question bank (pack) | 300+ Accenture-pattern Qs with explanations |
| Daily 10 pool | covered by the bank (300 Qs ≈ 30 days of unique sets) |
| FAQ | 8–12 Q&As |
| Onboarding steps | 5 |

The skill-test bank already has ~1,025 questions across 101 skills. Aptitude, C, DSA and SQL questions
can be **tagged** into Accenture rounds instead of written from scratch.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| JSON store can't take new write traffic (streaks, radar) | New user-data tables in Postgres (§4.2); do the Phase 0 fixes |
| Fake experiences to get the free pack | Admin verification, one per user per company, audit log |
| Radar spam / misinformation | Signed-in only, rate limit, confirmations, admin moderation, "reported by students" label |
| Stale facts (CTC, pattern, batch) | Provenance + `checked_at` on everything; "Being verified" instead of guesses; admin staleness alert after 60 days |
| Trademark / affiliation | Text name, no logo, disclaimer, "pattern" wording |
| Page weight / long scroll on phones | Lazy-load below-fold sections, sticky nav + sticky CTA, SSR only above-the-fold data |
| Breaking existing vault buyers | `page_layout` flag; old purchases keep working; reader mode unchanged |

---

## 9. Success metrics (instrument in Phase 2)

- Readiness check start rate (visitors → started) and completion → signup rate
- Free → ₹99 pack conversion
- Countdown plan set (test date entered) %
- Daily 10 D7 retention, streak ≥ 3 days %
- Drive Radar: updates/week, confirmations/update, notify-me subscribers
- Experience submissions/week (content supply)
- SEO: impressions for "Accenture placement preparation", "Accenture ASE syllabus"

---

## 10. File map

| New / changed | Path |
|---|---|
| Types | `backend/src/data/db.ts`, `frontend/src/types/index.ts`, `backend/src/data/skillTestTypes.ts` |
| Admin API | `backend/src/routes/admin.routes.ts` (sanitizers), `admin-skill-test.routes.ts` (company assessments) |
| Public API | `backend/src/routes/companies.routes.ts` (+ `/readiness`, `/sample`, `/radar`, `/prep-profile`, `/daily`, `/onboarding`) |
| Postgres | new `backend/src/db/companyPrepMigrate.ts` (pattern: `driveBridgeMigrate.ts`) |
| Pricing | `backend/src/lib/pricing.ts`, `backend/src/routes/checkout.routes.ts`, `backend/src/payments/orders.ts` |
| Page | `frontend/src/pages/company/[slug].tsx` (layout switch) |
| Components | new `frontend/src/components/company3t/*` |
| Admin UI | `frontend/src/components/admin/CompanyHubManager.tsx` |
| Tests | `backend/scripts/company-3t.test.ts`, `frontend/scripts/*` |
