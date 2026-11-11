# Wipro iOS Lab Report — Plan

Owner request (2026-11-11): a complete report on everything students have done in the
Wipro iOS program (labs first, plus lessons and tests), with full analysis.
Three formats: **Excel (.xlsx)**, **CSV**, and **PDF with charts**.

## 1. Where the data is

| Data | Store key | What it tells us |
|---|---|---|
| Lab classes, roster | `db.pulse.classes` (pack `wipro-ios`), `db.pulse.roster` | Who was invited, who joined, and when |
| Lab tasks (33 labs, assessments, capstone) | `db.pulse.tasks` ← `data/wiproIOS/labs.ts` | Lab code, module, milestone, due date |
| Linked repos + commits | `db.pulse.repos[].snap` | Repo linked/verified, commits per lab folder, lines added, last push |
| Teacher marks | `db.pulse.results[].reqs` | Each requirement: met / partial / missing / unreviewed, plus the score |
| Status / score / flags | `statusFor`, `scoreFor`, `buildFlags` (lib/pulse/store.ts) | Same numbers the teacher sees on screen |
| Lessons | `db.prep_progress` (slug `wipro-ios-swift`) | Lessons done of 42, active days |
| Milestone tests + full mock | `db.attempts` → `db.assessments` → `db.skills` | Best and latest score for M1–M4, Final and the mock |

The report reuses the existing Pulse functions, so its numbers always match the teacher's screens.

## 2. Report contents

**A. Summary (one page):** students invited, joined and active; repos linked and verified;
labs submitted, reviewed and not started; average lab score; lessons done; test averages.

**B. Per student (one row each):** roll no, name, email, class, joined date, repo, labs
submitted out of 33, labs reviewed, average lab score, commits, last activity, lessons done
out of 42, M1/M2/M3/M4/Final/mock scores, readiness band, flags, and a status label:
*On track*, *Behind* or *Not started*.

**C. Per lab (one row each):** code, title, milestone, due date, how many submitted, on time,
late, not started, reviewed, average score, and the requirement students miss most often.

**D. Student × lab matrix:** a status or score in every cell, colour-coded in Excel.

**E. Requirement detail:** one row per student × lab × requirement, with the verdict and the teacher's reason.

**F. Lists to act on:** students who have not started, students past due, labs never reviewed, and integrity flags.

**G. Activity over time:** commits per day and lessons per day.

## 3. Outputs

- **Excel `wipro-lab-report-<date>.xlsx`**: sheets Summary, Students, Labs, Matrix,
  Requirements, Tests, Action list, Activity. It has a header row, frozen panes, filters
  and status colours.
- **CSV**: a zip with one CSV per sheet (Students.csv, Labs.csv, Matrix.csv, Requirements.csv,
  Tests.csv, Activity.csv), so each opens directly in Excel or Google Sheets.
- **PDF `wipro-lab-report-<date>.pdf`** (A4):
  1. Cover page with key numbers
  2. Funnel: invited → joined → repo linked → first lab → all M1 labs
  3. Bar chart: submissions per lab
  4. Stacked bar: status per milestone
  5. Histogram: average lab scores
  6. Line chart: daily activity
  7. Scatter plot: test score vs lab score
  8. Top 10 students and students who need help
  9. Findings in plain English (for example "Lab 2D: 60% missed requirement R3")

## 4. Build

1. **`backend/src/lib/pulse/wiproReport.ts`**: `buildWiproReport(db, filter)` returns the
   data model described above. It is a pure function, so it can be unit-tested.
2. **Writers:** `toXlsx` (adds the `exceljs` package), `toCsvZip` (reuses `toCsv`, plus a
   zip package), and `toPdf` (pdf-lib, already installed, with charts drawn as vector
   shapes so no browser is needed).
3. **Routes (admin, plus teachers of a Wipro lab class):**
   `GET /api/pulse/reports/wipro?format=xlsx|csv|pdf&class=<id|all>`. Each download is written to the audit log.
4. **UI:** a "Download report" menu (Excel / CSV / PDF) on the teacher Lab page and in the admin Pulse area.
5. **CLI:** `npm run report:wipro -- --out <dir>` lets the owner create the files on the server.
6. **Tests:** fixture store → fixed numbers, files open without errors, and an empty class is handled.
   Live scripts keep `DATABASE_URL` blank.

## 5. Privacy

- Student names and emails appear only in admin and teacher downloads, and teachers only get their own classes.
- Teacher private notes are left out unless the owner asks for them.
- Files are created on request and not kept on the server.

## 6. Open questions for the owner

- Should the report cover all Wipro lab classes together, or one file per class?
- Should lessons and tests be included, or labs only?

## 7. Built (2026-11-11)

The owner chose: build it in the app, cover labs plus lessons plus tests, and produce one report for all classes with a class filter.

| Piece | File |
|---|---|
| Report model and analysis | `backend/src/lib/pulse/wiproReport.ts` (`buildWiproReport`) |
| Excel, CSV zip and PDF | `backend/src/lib/pulse/wiproReportFiles.ts` |
| xlsx and zip writers (Node zlib, no new package) | `backend/src/lib/report/xlsx.ts`, `zip.ts` |
| API | `GET /api/pulse/reports/wipro?format=xlsx\|csv\|pdf&class=<id\|all>`, `GET /api/pulse/reports/wipro/classes` |
| UI | `frontend/src/components/pulse/WiproReportDownload.tsx`, shown on the teacher portal or Lab tab when a Wipro lab class exists |
| CLI | `npm run report:wipro -- --out ./reports [--class <id>]` (run on the server) |
| Tests | `npm run test:wipro-report` (29 checks), also part of `npm test` |

How each status is worked out:
- **On time:** some commit in the lab folder was pushed before the deadline.
- **Late:** pushed only after the deadline.
- **Overdue:** past the deadline with nothing pushed.
- **Lab score:** the average score over labs that are due or pushed; a due lab with nothing pushed counts as 0.

Student status:
- **Not joined:** invite not accepted.
- **Not started:** no lab, lesson or test.
- **Behind:** 2 or more overdue labs, or a lab score under 40.
- **On track:** everything else.

The Excel file has these sheets: Summary (with findings), Students, Labs, Matrix, Requirements, Tests, Milestones, Action list and Activity.
The PDF has these pages: cover with key numbers, funnel and findings; submissions per lab; milestones and score spread; activity charts; lab score vs readiness; top 10 and students who need help; every lab; every student.
