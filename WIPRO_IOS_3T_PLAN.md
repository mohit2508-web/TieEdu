# Wipro iOS Developer Training (Swift): free Plan · Train · Test · Track

Owner's ask (2026-11-04): add Wipro with the owner's iOS curriculum (12 modules,
4 assessment milestones, official doc link per topic), **free for every student**.
Assessments should be a good level, with a full mock test, and Train, Test and Track
should all work properly. **Milestone 1 is on 15 Nov 2026.**

Today is 4 Nov, so there are 11 days to M1. M1 content ships first and is complete;
everything else follows the curriculum dates.

---

## 1. What the student gets (all free)

| 3T | What it is |
|---|---|
| **Plan** | The curriculum itself, day by day (30 Oct to 13 Dec). The Today card shows the lessons scheduled for today, plus any lessons from earlier days that are still unread, as "Catch up". Each milestone day has its milestone test. The countdown always counts to the **next milestone** (M1 is 15 Nov). |
| **Train** | One lesson per topic (42 topics on the sheet). Each lesson has: what it is, key rules, worked Swift examples (code), the common trap, the official doc link from the owner's sheet, and 3–5 practice questions with explanations. |
| **Test** | One test per milestone (M1–M4 plus the Final, Modules 11–12) and one **full course mock** across all milestones. Every attempt draws fresh questions, runs in secure mode with section timing, and shows explanations after you submit. Retakes are unlimited. |
| **Track** | A readiness score (tests 60%, lessons 25%, consistency 15%), a score trend for each milestone, a list of every attempt with a review link, and "Fix next", which points to the weakest milestone and its unread lessons. |
| **Viva** | Technical viva questions with model answers (Swift/iOS), all readable. |

Nothing is locked. There is no pack, no price and no Buy button for this program.

## 2. Structure

Slug **`wipro-ios-swift`** · name *Wipro iOS Developer Training (Swift)* · group *Wipro*.
This is separate from `wipro-elite-nth`, the hiring test, which stays as it is.

Sections (the prep engine's "sections" are the milestones):

| Key | Section | Modules | Topics | Test | Weight |
|---|---|---|---|---|---|
| `m1` | Milestone 1: Swift foundations | 1–4 | 20 | 40 Qs · 50 min (on **15 Nov**) | 30 |
| `m2` | Milestone 2: Architecture & concurrency | 5–6 | 8 | 25 Qs · 30 min (25 Nov) | 20 |
| `m3` | Milestone 3: Networking & UIKit | 7–8 | 6 | 25 Qs · 30 min (4 Dec) | 20 |
| `m4` | Milestone 4: SwiftUI & project setup | 9–10 | 6 | 25 Qs · 30 min (10 Dec) | 20 |
| `final` | Final: testing & Instruments | 11–12 | 2 | 15 Qs · 20 min (13 Dec) | 10 |

**Full course mock**: 60 Qs · 75 min, with one timed section per milestone
(m1 20 · m2 10 · m3 10 · m4 12 · final 8). The mock switches on by itself once
every bank is full.

**Question bank targets**: m1 ≥ 100, m2 ≥ 45, m3 ≥ 40, m4 ≥ 40, final ≥ 20.
A milestone test turns on only when its bank holds at least its question count
(no half-empty papers, as for Mphasis).

**Question style**, aimed at a good milestone level, not trivia:
- about 40% **code-output / "what happens"** questions: value vs reference copies, optional chaining, closure capture, `defer`, protocol-extension dispatch, ARC retain cycles, `async let`, actor isolation
- about 35% concept checks: which keyword, which lifecycle method, which queue
- about 25% applied scenarios: pick the fix, spot the bug
- difficulty mix per milestone: about 30% beginner · 50% intermediate · 20% advanced
- every question has an explanation; code questions keep their line breaks

All questions are practice questions written to the syllabus and labelled as practice.
They are never presented as real Wipro papers.

## 3. Build steps

### P1: today (before M1) · DONE 2026-11-04
1. Profile: one round per milestone, the syllabus table, and `is_free`. It is published
   on start for live databases (ensureWiproIOSV1, run once).
2. Free access: `company.is_free`, checked in ownsCompanyPack, the skill-test gate and the
   company route, so every lesson and test is open with no attempt limit.
3. Prep engine: a schedule-based plan (curriculum dates, catch-up, milestone days), a
   countdown to the next milestone, and config-driven labels and counts. No Infosys text
   in the shared screens.
4. Lesson reader: the official doc link, Swift code blocks in examples, and monospaced
   code in questions.
5. **M1 content**: 20 lessons and 125 questions, plus the M1 milestone test.
8. Answer review after every test: your pick, the right answer and the explanation (all company tests).
6. Target picker: Wipro iOS added as a ready program.
7. Checks: tsc, `next lint`, a guard test (`scripts/wiproIOS.test.ts`: bank shape,
   answer index in range, no duplicate questions, every lesson has a doc link and
   ≥ 3 practice questions), and a live run of the prep API.

### P2: before 20 Nov (M2 starts 16 Nov)
- M2 content: 8 lessons and 45+ questions (MVC, MVVM, app/scene life cycle, view life
  cycle, GCD, async/await, tasks and task groups, actors and @MainActor).

### P3: before 27 Nov
- M3 (URLSession, Codable, UIView hierarchy, storyboards, Auto Layout, UITableView),
  M4 (SwiftUI app structure, layouts, state, navigation, targets and build settings,
  Info.plist) and Final (XCTest and mocks, Instruments).
- Full course mock switches on.
- Viva module: about 25 technical questions with model answers.

## 4. Decisions taken (owner can change)
- **Separate program, not a change to Wipro Elite NTH.** The training curriculum and the
  hiring test are different audiences.
- **The official milestone pattern is unknown**, so each milestone test is MCQ (concepts
  plus code output) under time pressure. If the owner learns the real pattern (count,
  minutes, any hands-on coding), only the numbers in §2 change.
- **No coding editor.** The owner said to skip the coding engine (2026-11-01). Hands-on
  practice is a "Try in a Playground" task at the end of each lesson.
- Wipro's CTC and bond are not shown for this program (it is training, not a hiring
  route).

---

## 5. Lab: hands-on labs tracked in Project Pulse (owner, 2026-11-04)

Source: the owner's *Swift iOS Lab Assignment Handbook*, which has 33 entries:
- Labs 1A–1E, 2A–2D and 3
- Milestone 1
- Labs 4A–4B and 5A–5D
- Milestone 2
- Lab 6 and Labs 7A–7C
- Milestone 3
- Labs 8A–8D and Lab 9
- Milestone 4
- Labs 10A–10B and Lab 11
- Capstone

Each entry has its objective, tasks, submission and extension. Data: `backend/src/data/wiproIOS/labs.ts`.

**Due dates** follow the course compressed to end on 15 Nov:
- Labs 1–2: 6 Nov
- Lab 3 and Milestone 1: 7 Nov
- Lab 4: 8 Nov
- Lab 5: 9 Nov
- Milestone 2 and Lab 6: 10 Nov
- Lab 7: 11 Nov
- Milestone 3 and Lab 8: 12 Nov
- Lab 9: 13 Nov
- Milestone 4 and Labs 10–11: 14 Nov
- Capstone: 15 Nov

Teachers can edit any deadline in Pulse.

**Project Pulse (teacher):**
- Class page → **Add Wipro iOS (Swift) labs**. This adds all 33 as published tasks, one folder each (`lab-1a/` … `capstone/`), with one requirement per handbook task.
- Swift labs are reviewed by hand: met, partly or not met, plus feedback. Auto-run tests are off, because Swift apps need macOS runners.
- Adding the pack again skips the labs the class already has. The API can also add it when the class is created: `POST /api/pulse/classes` with `pack: "wipro-ios"`.

**Project Pulse (student):** link the class repo once, then push each lab to its folder.

**Prep → Lab tab** (Wipro iOS only):
- Lists every lab, grouped by milestone, with its due date and full brief.
- Inside a Pulse class, each lab also shows the student's status (link repo, not pushed, waiting for review, partly done, done), the score once reviewed, the teacher's feedback, and a link to open Project Pulse.
- Students outside Pulse see the briefs and a note that their teacher tracks the labs in Pulse.
