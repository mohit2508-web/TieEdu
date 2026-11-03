# AI.FIRST — Future-Ready Intelligence, Skills & Technology

Owner brief (2026-11-03): one flagship paid course, **₹99**, professional enough that people buy it,
every aspect covered, proper diagrams. A **readiness test before the course** (fullscreen, secure
mode) verifies what the learner really knows; strong modules are **tested out** (no need to study
them) and the learner may choose a **cheaper personalised path** that skips them.

Headline (from the owner): *Don't just use AI. Understand it, verify it, build with it and answer
for it. Twelve modules, twelve proofs of work, one credential you have to defend.*
12 modules · 48 lessons · ~34 hours · 12 proofs of work · 3 pathways · 3 credentials.

## Course shape

dir `backend/src/data/aiFirstCourse` · slug `ai-first` · id `crs-ai-first` · prefix `aif`
paid (`is_free: false`, `price_inr: 99`), published, branch `ai-ds`, tier `premium`, level `beginner`→ all.

Four pillars × three modules, four lessons each, every lesson the nine blocks + a mermaid
`diagram()` block + a 4-question quiz. Lesson 4 of every module carries that module's
**Proof of work** (three variants, one per pathway).

| Pillar | Module |
|---|---|
| UNDERSTAND | M1 What AI actually is · M2 Inside a large language model · M3 The 2026 model landscape |
| VERIFY | M4 Prompting & context engineering · M5 Verifying AI output · M6 AI for research, study & analysis |
| BUILD | M7 No-code AI workflows · M8 Building with AI APIs · M9 Agents, tools & MCP |
| ANSWER FOR IT | M10 Responsible AI · M11 AI security & trust · M12 AI at work + capstone defence |

**3 pathways** (same 12 modules, different proof-of-work variant): Explorer (no code), Builder
(code), Leader (policy/strategy). **3 credentials**: AI.FIRST Certified (exam ≥ pass + defended
capstone), with Distinction (first attempt ≥ 85), and the verified proof-of-work portfolio link.

## Readiness test (new engine — `backend/src/lib/readiness.ts`)

- Bank tagged by module (6 per testable module, M1–M11; M12 is the defence and cannot be tested out).
- Draw 4 per module = 44 questions, 50 min, server-timed with grace, fullscreen secure mode.
- Per module: 4/4 → **tested out** (credited); 3/4 → review; ≤ 2 → learn.
- Overall < 35% → "start with foundations" (free AI Literacy course recommended; full course still buyable).
- Integrity: 2+ secure-mode strikes → result stands but **no modules are credited**.
- Retake after 24 h, max 3 attempts; the latest attempt governs the offer.
- Offer (personalised path, learner's choice): 3–4 tested out → ₹79, 5–7 → ₹69, 8+ → ₹49. Full course stays ₹99.
- Credits are written into course progress (lessons count complete, no XP), so lesson order, % and
  certificate gates keep working. Final exam + capstone are still required — credentials stay defended.
- Personalised path: the credited modules are frozen onto the order line at purchase and their
  lessons stay closed for that learner (they paid for the rest).

## Status

- [x] Plan
- [x] Readiness engine (`lib/readiness.ts`) + routes + checkout price + personalised lesson gate
- [x] Content: 48 lessons, 48 mermaid diagrams (all parse on mermaid 11), 192 quiz Qs, 48-Q exam bank, 66-Q readiness bank; answer positions shuffled per question id
- [x] Flagship cover (`/api/covers/course/ai-first.svg`)
- [x] Frontend: `/courses/[slug]/readiness` (fullscreen secure test + report + path choice), ReadinessCard on the course page, learner price everywhere
- [x] Backend typecheck, `test:readiness` 31/31, courses/catalog/coupons/perks/mojibake green; smoke 356/357 (1 live-Vimeo failure, unrelated); next lint clean; HTTP flow checked on a scratch DB
- [ ] Browser check of the pages (local frontend dev server had a stale .next cache)
- [ ] Commit + deploy (owner's call)

Notes: "Trending" is earned, not set — Popular needs ≥ 5 real enrolments and top-quartile enrolment; the course shows "New" for 45 days. Per-question answers are never returned after the readiness test (small bank → memorising would beat the test-out rule).
