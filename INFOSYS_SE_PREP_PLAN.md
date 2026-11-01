# Infosys SE: the complete Train · Test · Track loop (after purchase)

> Owner request, 2026-11-01. Focus on ONE company until it is 100%: Infosys
> Systems Engineer. A student who buys the pack gets a day-by-day plan to the
> test date, learns, tests, sees exactly what is weak, relearns, retests, and
> watches a readiness score climb to 100%. Then the same template is copied to
> other companies.

## 1. What the student sees

### Before buying (company page)
Free: topic lessons, 1 full mock, 3 sample answers per interview round, the plan preview. Pack ₹169.

### After buying: "My Infosys SE prep" (`/prep/infosys-systems-engineer`)
1. **Readiness score 0–100%** (big ring) with the band and one line: what to do next.
2. **Countdown**: days left to the test date (student sets it; default 50 days).
3. **Today**: 2–3 tasks for today from the plan (a lesson, a sectional test, or a full mock).
4. **Roadmap**: every day of the plan, ticked when done.
5. **Section scores**: Math, Reasoning, Verbal, Pseudocode, Puzzles: latest score, trend, weak or strong.
6. **Fix list**: the weakest section's lessons + its sectional test, in order.

The Today page shows the same readiness, countdown and today's tasks (no parent card).

## 2. The loop
```
Train (lessons of a section) → Test (sectional test, 10 Qs) → Track (section score)
        ↑                                                         │
        └──── weak section? → relearn its lessons → retest ←──────┘
Every 7th day: full mock (54 Qs, real pattern) → updates all section scores
Last 3 days: revision tests on weak sections + final full mock
```

## 3. The plan (generated from the test date)
For N days (default 50), split into phases:
| Phase | Share | What happens each day |
|---|---|---|
| Learn | 60% | One section at a time: its lessons (2–3 a day), then that section's test |
| Strengthen | 25% | Weakest section first: relearn + sectional retest; full mock every 7 days |
| Final | 15% | Mixed revision tests, 2 full mocks, interview prep (technical + HR answers) |
Days with nothing new become revision days. The plan re-reads progress every visit, so a missed day moves forward instead of piling up.

## 4. Readiness score (published to the student)
`readiness = 0.6 × test score + 0.25 × lessons done + 0.15 × practice consistency`
- test score: per section, the latest sectional or full-mock score, weighted by the paper (Math 10, Reasoning 15, Verbal 20, Pseudocode 5, Puzzles 4 of 54).
- lessons done: lessons marked done ÷ all lessons.
- consistency: days with any activity in the last 14 ÷ 14.
Bands: < 40 Not ready · 40–69 Getting there · 70–84 Ready · 85+ Drive-ready.

## 5. Tests
- **Full mock** (exists): 54 Qs, 100 min, section timers, secure mode, fresh draw each attempt.
- **Sectional tests** (new): one per section, 10 Qs from that section's bank, timed, secure mode, unlimited for pack owners.
- **Revision tests**: sectional tests repeated; the plan schedules them on weak sections.
- **Analysis after every test**: score, per-section accuracy, weakest section, the lessons to read, a button to retest.

## 6. Where content lives (admin can keep adding)
| Content | Where it is managed | Appears in the plan automatically |
|---|---|---|
| Topic lessons | Admin → Content Builder (Infosys SE "Online assessment: topic lessons") | Yes, by section prefix |
| Test questions | Admin → Skill Test (Infosys SE tests) | Yes, next attempt draws them |
| New tests | Admin → Skill Test, company set to infosys-systems-engineer | Yes, listed in the hub |
| Interview answers | Content Builder | Yes, final phase |

## 7. Site changes in this round
- Skills page: company mocks removed (they live inside the company).
- Home: pricing section removed (pricing only inside a company).
- Companies: only 5 programs shown for now (Infosys SE, TCS NQT, Accenture, Wipro, Cognizant); others hidden as drafts, not deleted; new card design.
- Today: Infosys SE readiness + today's tasks; parent card removed.

## 8. Build order
1. Site changes (§7).
2. Sectional tests (5) from the existing bank.
3. Prep API: plan, progress, readiness, lesson done, test date.
4. Prep hub page + Today card + analysis links.
5. Gate: hub full for pack owners, preview for others.
6. Verify end to end with a test student who owns the pack.
