# Daily Briefing Plan — "App khola, saara baaki kaam chat ki tarah pop ho gaya"

> **Decisions locked (07 Oct 2026):**
> 1. **Once per day** — `localStorage` date-key (`tieedu_briefing_v1`); roz sirf ek baar, CTA/dismiss ke baad din bhar band.
> 2. **Chat-bubble stack** — cards bottom-right corner me 420ms stagger se ek-ek karke spring-pop hote hain (iMessage feel), newest sabse niche.
> 3. **Non-blocking** — koi scroll-lock nahi, koi backdrop nahi, `pointer-events` sirf cards pe; page hamesha chalta hai.
> 4. **Six sources, frontend-only v1** — study plan, in-progress courses, unattempted skill tests, free course (Interview Masterclass), unlocked vaults, unseen drops. **Zero backend changes.**
> 5. **Not a ShellContext overlay** — overlay stack (`ShellContext.tsx:21`) blocking sheets ka hai (`BLOCKS_SCROLL`, `closeTop()`). Briefing locally stateful hai, apna Escape handler ke saath.

Target: logged-in student jab `/` (home) khole — sirf wahan, sirf tab jab aaj ka briefing pending ho aur kam se kam ek item ho.

---

## 1. Anti-irritation contract (ye feature ka dil — isko todna nahi)

| # | Rule | Enforced at |
|---|------|-------------|
| A1 | **Once per day** — din badalne pe hi reset | `briefingStore.ts` date-key rollover |
| A2 | **Max 6 rows** — greeting + 5 content (per-source caps §4) | `briefingLogic.ts` `MAX_BRIEFING_ITEMS` |
| A3 | **420ms stagger** — pura sequence ≈ 2.5s | `BriefingCard.tsx` enter `delay: i * 0.42` |
| A4 | **Non-blocking** — scroll/tap chalta rahe | `.briefing-dock { pointer-events: none }`, cards `auto`; no scroll lock, no backdrop |
| A5 | **Har card dismissible** — swipe-left, X, Escape, pill ka X | `BriefingStack.tsx` + `BriefingCard.tsx` |
| A6 | **0 items → 0 popup** — khaali briefing kabhi nahi | `DailyBriefing.tsx` `built.length <= 1` → mark shown, render nothing |
| A7 | **CTA → poori briefing band + aaj dobara nahi** | `handleCta` → `dismissBriefingAll()` |
| A8 | **12s idle → chhota pill** (`☰ 5`) me collapse | `BriefingStack.tsx` idle timer |
| A9 | **`prefers-reduced-motion`** → sirf 150ms fade, no stagger, no haptic | `useReducedMotion()` branches + `haptic()` ka apna guard |
| A10 | **4s fetch timeout** — slow API = din bhar skip, page kabhi block nahi | `useBriefingData.ts` `softTimeout` race |
| A11 | **Sequence start hote hi `shown=true`** — beech me navigate karne pe dobara pop nahi hota | `DailyBriefing.tsx` `markBriefingShown()` on start |
| A12 | **Har card ka real deep link** | `briefingLogic.ts` href table §4 |

---

## 2. Trigger state machine

```
idle
 └─ gate: auth settled ∧ user ∧ router.pathname==='/' ∧ !hasShownToday()
     └─ fetching (8 parallel calls, each raced at 4s → null)
         ├─ content items = 0 ─→ markShown() → idle (aaj ke liye khatam)
         └─ content items ≥ 1 ─→ wait until mount+700ms
             └─ START: markShown() + markDropsSeen() + haptic('light') + setItems
                 └─ stack (420ms stagger pops)
                     ├─ CTA        → dismissAll + navigate → unmount
                     ├─ X / swipe  → item exit; last item pe unmount
                     ├─ Escape     → dismissAll → unmount
                     ├─ route away → visual unmount (shown already true)
                     └─ 12s idle   → collapsed (pill ☰ n)
                          ├─ pill tap → re-expand (fast 160ms stagger)
                          └─ pill X   → dismissAll → unmount
```

Guest, `/login|/signup|/admin/*` (AppShell early-return `AppShell.tsx:52`), aur already-shown-today: zero render, **zero fetch**.

---

## 3. Data sources (sab `Promise.all` me, har ek `softTimeout(4s)` se protected)

| # | Source | Endpoint (existing) | Derivation | Max |
|---|--------|--------------------|------------|-----|
| 1 | Study plan | `GET /api/study-plan/enrollment` (`fetchMyStudyPlanApi`) | `plan.phases[]` pehla `completed:false`; `enrollment:null` = normal skip | 1 + 1 progress card |
| 2 | Courses | `GET /api/courses/my` (`fetchMyCourses`) | `in_progress[]` latest `last_activity_at`, `progress.next_lesson_id` se exact resume pointer | 1 |
| 3 | Skill tests | `GET /api/skill-test/skills` + `/my-attempts` | pending = active skills minus `attempts[].skillId`; best = `isPopular` ya `displayOrder` | 1 |
| 4 | Free course | `GET /api/interview-course/modules` + `/progress/:userId` | `completed_module_ids` ka pehla missing module — sirf jab `completed.length > 0` (shuru kiya ho, kabhi na-khola ad nahi) aur sab complete nahi hona chahiye | 1 |
| 5 | Vault material | `GET /api/companies` | `is_unlocked && !vaultSeen.has(id)` → "kabhi nahi khola" pack, sabse bade module count wala | 1 |
| 6 | Drops | `GET /api/drops?limit=5` | `!dropsSeen.has(id)` (sponsored excluded); count + newest headline | 1 |

**Read-state (per-device, `localStorage`, notifications.ts ke cursor pattern jaisa):**

| Key | Meaning | Written when |
|-----|---------|--------------|
| `tieedu_briefing_v1` | `{ date, shown }` | sequence start pe (aur empty result pe bhi); date rollover pe auto-reset. Per-item dismissal in-session state hai (component), persist nahi hota |
| `tieedu_drops_seen_v1` | drop ids briefing me dikhe | sequence start (card ne count banaya, use dekh liya) |
| `tieedu_vault_seen_v1` | company ids student ne kholi | briefing CTA click **and** `company/[slug]` page mount (truthful: normally bhi khola to card khatam) |

Known v1 limitation (honest trade, notifications.ts ke read-cursor jaisa): drops seedhe `/drops` se khole to un-seen reh sakte hain — briefing unhe kal phir dikhayega. Per-device, per-account nahi.

---

## 4. Card spec + priority (pop order = list order, cap 6 rows total)

| Pri | Kind | Title | Body | CTA → href | Tone |
|-----|------|-------|------|-----------|------|
| 0 | `greeting` | `Good morning/afternoon/evening, {name}` | `{n} things to catch up on` — `n` = **cap ke baad jo cards actually dikh rahe** (greeting pe count jo dikhta hai wahi sahi), streak v1 me nahi | — | `#B45309` |
| 1 | `study_plan` | `{phase.title}` | `{phase.dayLabel} · plan {done}/{total} phases` | `Continue` → `/study-plan#phase-{order}` (hash support `study-plan.tsx:61-76`) | `#0369A1` |
| 2 | `course` | `Continue: {title}` | `{completed}/{total} lessons · {percent}%` | `Resume` → `/courses/{slug}?lesson={next_lesson_id}` (`[slug].tsx:81` query support) | `#0E7C66` |
| 3 | `skill_test` | `{name} test is waiting` | `{totalQuestions} questions · ~{avg} min · not attempted` | `Start test` → `/skill-test/{slug}` | `#7C3AED` |
| 4 | `free_course` | `{module.title}` | `Module {id} of 50 · Interview Masterclass` | `Open` → `/interview-course` | `#15803D` |
| 5 | `vault` | `New material: {name}` | `{n} modules in your unlocked pack — none opened yet` | `Open pack` → `/company/{slug}` | `#4F46E5` |
| 6 | `drops` | `{n} new drops today` | newest headline (80 char truncate) | `See what's new` → `/drops` | `#BE185D` |
| 7 | `plan_progress` | `Your plan is {percent}% done` | `{done} of {total} phases · target {company} {role}` | `View plan` → `/study-plan` | `#C77B12` |

Per-source caps enforce A2; agar 6 se zyada sources ne answer diya to priority order me pehle 5 content + greeting dikhte hain (`plan_progress` deliberately last — woh summary hai, naya kaam nahi). Empty-source = card skip, kabhi filler nahi.

---

## 5. File map

### NEW
| Path | Purpose |
|------|---------|
| `frontend/src/lib/briefingStore.ts` | Date-rollover store, dismiss state, drops/vault seen-sets. Pure, no React. |
| `frontend/src/lib/briefing/briefingLogic.ts` | **Pure** `buildBriefingItems(sources, ctx)` — response → capped `BriefingItem[]`. Zero fetch, zero React (testable). |
| `frontend/src/components/briefing/useBriefingData.ts` | 8 parallel fetches, har ek 4s `softTimeout` me raced → null. |
| `frontend/src/components/briefing/BriefingCard.tsx` | Ek card: icon chip, title/body, CTA, swipe-left dismiss, spring pop-in. |
| `frontend/src/components/briefing/BriefingStack.tsx` | `AnimatePresence` stack + 420ms stagger + 12s idle pill + Escape. |
| `frontend/src/components/briefing/DailyBriefing.tsx` | Orchestrator: gate → fetch → build → sequence → side-effects. |

### EDIT
| Path | Change |
|------|--------|
| `frontend/src/components/layout/AppShell.tsx` | `<DailyBriefing />` mount (overlays ke block me, line ~127) |
| `frontend/src/styles/globals.css` | `.briefing-dock` (fixed anchor, safe-area, max-height, md se bottom-24px) |
| `frontend/src/pages/company/[slug].tsx` | `markVaultSeen(company.id)` on unlocked load (3-line effect) |

**No backend, no new dependencies** — framer-motion `^13.4.6` + lucide-react already in `package.json`.

---

## 6. Animation spec (the "Apple touch")

| Moment | Value |
|--------|-------|
| Pop-in | `opacity 0→1, y 18→0, scale 0.94→1`, `spring(stiffness 380, damping 26, mass 0.9)` — Sheet (`460/42`) se thoda softer |
| Stagger | enter me hi embedded `transition.delay = i * 0.42`; reduced-motion = 0 |
| Swipe dismiss | `drag="x"` (elastic 0.35, `pan-y` touch-action — vertical scroll unaffected); release pe `projected = offset.x + velocity.x*0.15 < -60` ya `velocity.x < -500` → exit |
| Item exit | `x -140, opacity 0`, 180ms iOS `--ease-out` curve `(0.32,0.72,0,1)` |
| Sibling reflow | `layout` prop (top-level spring, **no delay** — enter delay embedded rahe, warna dismiss ke baad 420ms wait) |
| Collapse pill | stack `scale 0.92 + fade` 200ms → pill spring in |
| Re-expand | cards dobara mount, fast stagger `i * 0.16` |
| Reduced motion | sab kuch sirf `opacity`, `duration 0.15` |
| First-card haptic | `haptic('light')` ek hi baar (`Pressable.tsx:40`, reduced-motion pe apne aap no-op) |

Layout tokens: `.briefing-dock` = `position: fixed; z-index: 50` (tabbar/header 40 ke upar, Sheet 60 ke neeche — cart khule to briefing upar nahi aayega), `width: min(360px, 100vw - 32px)`, `bottom: calc(var(--tabbar-total) + 12px)` / `md: 24px`, `right: max(16px, safe-right + 12px)`.

---

## 7. Edge cases

| Case | Behaviour |
|------|-----------|
| Guest / loading | Gate fail → zero render, zero fetch |
| No plan (`plan:null`) | Sirf wo card skip — error nahi |
| Sab sources empty | `built.length <= 1` → mark shown, nothing rendered (A6) |
| Kuch sources fail / slow | `softTimeout` → null → skip that card; total wait ≤ 4s |
| Date rollover app chalne waqt | Check mount pe hi; session ke beech me re-trigger nahi (A11) |
| Route change mid-sequence | Visual unmount; `shown` already true → wapas nahi |
| Logout mid-sequence | `user=null` → unmount |
| Short viewport | Dock `max-height` + `overflow-y auto` (scrollbar hidden), auto scroll-to-bottom naye card pe |
| Data pehle se home page se mil raha? | Same endpoints — HTTP cheap, briefing once/day only; cross-component promise-memo = future optimisation |

---

## 8. Verification

1. `npm run lint` && `npm run typecheck` (frontend)
2. Manual matrix: fresh day sequence (420ms rhythm) · same day dobara → nothing · date change → reset · guest → nothing · reduced-motion → fade only · swipe/X/Escape/CTA sab state save karte hain · 12s idle → pill → expand · mobile (tabbar offset) + desktop (bottom-right) · page scroll during sequence chalta rahe · network off → ≤4s me skip

---

## 9. Future (v2+, abhi nahi)

- Backend `GET /api/briefing/today` — 8 calls → 1, server-side priority
- Admin announcement card (`notifications.broadcast` se)
- `interviewDate` countdown card, XP/streak summary card
- Cross-component promise-memo (home page ke fetch se share)
- Per-card "don't show tomorrow" preference
