# TCS NQT: content to send

The TCS NQT structure is built. Each part below switches on by itself as soon as its content is in. Nothing half-empty is ever shown to students.

Pattern used (2026 TCS NQT hiring drive, from the 2027 guide):

| Part | Section | Questions | Time |
|---|---|---|---|
| A · Foundation | Numerical Ability | 20 | 25 min |
| A · Foundation | Verbal Ability | 25 | 25 min |
| A · Foundation | Reasoning Ability | 20 | 25 min |
| B · Advanced | Advanced Quant & Reasoning | 15 | 25 min |
| B · Advanced | Advanced Coding | 2 problems | 90 min |
| | **Total** | | **190 min** |

---

## 1. MCQ question bank (Part A + Part B MCQs)

File: `backend/src/data/companyTests/tcsNqt.ts`

| Section key | Needed to switch on the full mock | Recommended (fresh paper each attempt) |
|---|---|---|
| `numerical` | 20 | 50–60 |
| `verbal` | 25 | 60–75 |
| `reasoning` | 20 | 50–60 |
| `advanced` | 15 | 40–45 |

Sectional tests turn on at 10 / 10 / 10 / 8. The prep plan (Plan tab, readiness score) turns on with 80+ MCQs and at least one lesson.

For each question, send:
- **Section**: numerical, verbal, reasoning or advanced
- **Difficulty**: beginner, intermediate or advanced
- **Question** (for RC, include the passage)
- **4 options**, and which one is correct
- **Explanation**: 1–3 lines on how to solve it
- **Source**: for example, "Practice set 2 Q14". Only call a question a PYQ if it really is one.
- **Lesson** (optional): the lesson title it belongs to

A Word, PDF or Excel file in any clean layout works. I convert it.

## 2. Coding problems (Part B coding + DSA practice)

File: `backend/src/data/companyTests/tcsNqtCoding.ts`

Problems show up in two places:
- **Train**: a "Coding round: problems and solutions" module. Each problem has its statement, samples, hints, approach and model solutions. The first 3 problems are free; the rest are in the pack.
- **Test**: the last section of the full mock. Each attempt draws 2 problems, with 90 minutes on the clock. Secure mode pauses during this section, so students can run their code in their own compiler. Afterwards they mark each problem as solved, partly solved or not solved, and that mark becomes the coding score in Track.

The mock's coding section switches on once there are at least **6 problems**. The recommended number is **30–40**: easy, medium and hard, covering arrays, strings, hashing, sorting, math, recursion and basic DP.

For each problem, send:
- **Title**, **difficulty** (easy, medium or hard) and **topic**
- **Statement**, written TCS-style: a short story, then the task
- **Input format** and **output format**
- **Constraints**
- **2 or more samples**: input, output and an optional explanation
- **Hints**: 1–3 short nudges
- **Approach**: the idea in plain words, plus the time and space complexity
- **Solution** in at least one of C, C++, Java or Python. All four is best. Each must be a full program that reads from stdin and prints to stdout.

## 3. Topic lessons (Train)

File: `backend/src/data/interviewPrep/tcsNqtLessons.ts`

Lessons are grouped into the sections **Numerical, Verbal, Reasoning, Advanced and Coding**. The Coding section holds the DSA lessons: two pointers, hashing, recursion and so on.

For each lesson, send:
- Section and title
- Key rules or formulas, 3–6 bullets
- One worked example
- One common trap
- Optional: a "what it is" line and 1–2 more examples

Each MCQ lesson automatically gets 3–5 practice questions from the bank.

## 4. Interview rounds

File: `backend/src/data/interviewPrep/tcsNqt.ts`. Each round becomes a paid module. The first 3 questions in each module are free previews.

| Round | Suggested count |
|---|---|
| Technical (your language, OOP, DBMS/SQL, OS, networks, DSA, project) | 25–30 |
| Managerial (situations, teamwork, conflict, relocation) | 10–15 |
| HR (introduction, relocation, shifts, documents, service agreement) | 12–15 |

For each question, send:
- The question
- Difficulty
- How often it is asked (high, medium or low)
- What a good answer covers (bullets)
- A sample answer
- A likely follow-up question

## Price

The pack price comes from the checkout ladder. TCS has 3 paid modules (Technical, Managerial and HR), so the pack is **₹219**. Lessons and coding problems sit outside the ladder, the same way Infosys lessons do. If you want TCS at ₹169 like Infosys, I can merge Managerial and HR into one module.
