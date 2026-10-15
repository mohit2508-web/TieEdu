// Module 4 — Data Cleanup & Real Workflows
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Data Cleanup & Real Workflows',
  summary:
    'The repeatable clean-up sequence for pasted data, Flash Fill, and a capstone attendance tracker you can defend line by line.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'xl-4-1',
      1,
      'The Clean-Up Sequence for Pasted Data',
      'A repeatable five-step pass — TRIM/CLEAN, Text to Columns, Flash Fill, remove duplicates, validation — for any CSV you did not create.',
      17,
      nineBlocks({
        objectives: [
          'Apply the standard clean-up pass to a pasted dataset in a fixed order',
          'Use TRIM, CLEAN and SUBSTITUTE to kill invisible whitespace and control characters',
          'Use Flash Fill to split or join patterns without writing formulas',
        ],
        hook:
          'Every real Excel session starts the same way: paste something someone else exported, then spend twenty minutes finding out what is wrong with it. Learn the pass once and that twenty minutes becomes four.',
        concept: `**The five-step pass, in this order:**
1. **TRIM + CLEAN the text columns.** TRIM removes leading/trailing spaces and collapses doubles (the most common invisible defect). CLEAN removes non-printing control characters pasted from web pages. =TRIM(CLEAN(A2)) is the standard combo. Fill down, paste-values over the original.
2. **Text to Columns where a column holds two things.** "Ananya Rao" → Name + Surname, or "12-10-2026" split on the hyphen. Data → Text to Columns, Delimited or Fixed width.
3. **Flash Fill for patterned joins/splits.** Type the first result you want in the adjacent column (e.g. first name from full name, or 10-digit mobile from "91 98765 43210"), then Ctrl+E — Excel detects the pattern and fills the rest. Works for case changes, id extraction, and reformatting dates into one shape.
4. **Remove duplicates.** Data → Remove Duplicates, tick the key columns. ALWAYS read the dialog\'s report: "12 duplicates removed, 88 unique remain" — if it says 80 removed from 100 you selected the wrong keys.
5. **Data validation to keep it clean.** Data → Data Validation: whole numbers between bounds, list dropdowns for branch/year, date ranges. An invalid entry is stopped (or warned) at typing time instead of discovered at analysis time.

**Invisible defects worth naming:** non-breaking spaces (Alt+160 / CHAR(160)) look like spaces but TRIM does not remove them — =SUBSTITUTE(A2,CHAR(160),"") does. Numbers stored as text (Module 1). Dates in two formats in one column (12/10/2026 vs 12-Oct-26) — Flash Fill or TEXT() normalises them.`,
        extras: [
          table('Defect', ['Fix'], [
            ['Leading/trailing spaces', 'TRIM'],
            ['Non-breaking spaces', 'SUBSTITUTE(x,CHAR(160),"")'],
            ['Control characters', 'CLEAN'],
            ['Two values in one column', 'Text to Columns'],
            ['Patterned reformat', 'Flash Fill (Ctrl+E)'],
            ['Repeated rows', 'Remove Duplicates'],
          ]),
          tip(
            'Clean on a helper column first',
            'Run TRIM/CLEAN into a NEW column, verify with COUNTA, then paste-values over the original. Cleaning in place with no undo trail is how a dataset gets destroyed mid-cleanup.',
          ),
          warn(
            'Read the Remove Duplicates report',
            'The dialog tells you exactly how many rows it deleted. Read it. If the number is far larger than the repeats you expected, Ctrl+Z immediately — you probably keyed on the wrong column.',
          ),
        ],
        worked: {
          title: 'Clean a pasted attendance export',
          problem:
            'A pasted column has full names with trailing spaces and non-breaking spaces, plus a few exact-duplicate rows. Produce a clean unique name list with a first-name helper.',
          steps: [
            { title: 'Whitespace pass', desc: '=TRIM(CLEAN(SUBSTITUTE(A2,CHAR(160),""))) in B2, fill down — handles regular, control and non-breaking spaces in one shot.' },
            { title: 'Verify the pass', desc: 'COUNTA(A) vs COUNTA(B) should match (no rows lost); spot-check a name that had a trailing space.' },
            { title: 'Flash Fill first names', desc: 'Type the first name of row 1 in C2, then Ctrl+E — Excel fills the pattern down the column.' },
            { title: 'De-duplicate', desc: 'Select B (or A:C), Data → Remove Duplicates on the name column; read the removed/remaining report.' },
          ],
          solution:
            'TRIM+CLEAN+SUBSTITUTE normalises whitespace, Flash Fill extracts first names, Remove Duplicates leaves a unique list — each step verified before the next destructive one.',
        },
        practice: {
          title: 'Clean your own export',
          prompt:
            'Export any 30-row list you have (contacts, marks, fees) to CSV, re-import it, run the five-step pass, and write down which defects each step actually found. Note anything the pass missed.',
          hint: 'Common surprises: non-breaking spaces from web pastes, numbers stored as text, dates in two shapes.',
        },
        mistakes: [
          {
            mistake: 'Running Remove Duplicates before checking which column is the key',
            fix: 'Duplicates are relative to the selected key columns. Tick only the true identity columns; read the removed-count report before moving on.',
          },
          {
            mistake: 'Assuming TRIM removes all whitespace',
            fix: 'TRIM handles spaces only — non-breaking spaces (CHAR(160)) survive it. Wrap with SUBSTITUTE(x,CHAR(160),"") for web-pasted data.',
          },
        ],
        exam: {
          question:
            'A pasted name column still shows "double spaces" after TRIM. Explain and give the full fix.',
          answer:
            'The gaps are non-breaking spaces (CHAR(160)), commonly pasted from web pages; TRIM only collapses regular spaces. Fix: =TRIM(CLEAN(SUBSTITUTE(A2,CHAR(160),""))) — SUBSTITUTE removes the non-breaking characters, CLEAN strips control characters, TRIM normalises the regular spaces.',
          source: 'The invisible-character question — a recurring favourite because it looks like a TRIM bug and is not.',
        },
        summary: [
          'Clean-up order: TRIM/CLEAN → Text to Columns → Flash Fill → Remove Duplicates → Validation.',
          'TRIM misses CHAR(160); pair it with SUBSTITUTE for web-pasted data.',
          'Ctrl+E Flash Fill learns a pattern you demonstrate in the first row.',
          'Always read the Remove Duplicates report; validate inputs to keep data clean permanently.',
        ],
      }),
      [
        [
          'Which function removes non-breaking spaces that TRIM leaves behind?',
          ['CLEAN', 'SUBSTITUTE with CHAR(160)', 'UPPER', 'LEN'],
          1,
          'CHAR(160) is the non-breaking space; SUBSTITUTE removes it before TRIM normalises the rest.',
        ],
        [
          'Flash Fill is triggered with:',
          ['Ctrl+F', 'Ctrl+E', 'Alt+E', 'Ctrl+Shift+F'],
          1,
          'Type one example of the pattern in the adjacent cell, then Ctrl+E fills the column.',
        ],
        [
          'Before clicking OK in Remove Duplicates you should:',
          ['Sort the data', 'Tick only the true key columns and plan to read the report', 'Filter to visible rows', 'Save a pivot'],
          1,
          'Duplicates are relative to the selected keys; the report then tells you exactly how many rows were deleted.',
        ],
        [
          'The safest way to apply a cleanup formula over a raw column is:',
          ['Overwrite the original in place', 'Fill a helper column, verify, then paste-values over', 'Never use helpers', 'Use a macro only'],
          1,
          'Helper column first keeps an undo trail and a verification step before the raw data is replaced.',
        ],
      ]
    ),
    lesson(
      M4,
      'xl-4-2',
      2,
      'Capstone: Build a Attendance & Fees Tracker',
      'Apply the full course — types, formulas, IF, tables, charts, clean-up — to one small tracker you can defend in an interview.',
      18,
      nineBlocks({
        objectives: [
          'Assemble a two-sheet tracker (records + summary) using every tool from Modules 1–3',
          'Wire summary formulas (SUM/COUNTIF/AVERAGE, IF status, a chart) that stay correct as rows are added',
          'Present the tracker: what each sheet answers, and why the formulas are trustworthy',
        ],
        hook:
          'This is the artefact the certificate is issued for. Not notes about Excel — a working file with live formulas, a chart that answers a real question, and a clean-up pass you can narrate. If you can defend every formula in it, you can defend yourself in the interview.',
        concept: `**The tracker, two sheets:**
- **Records** — one row per student per month: ID, Name, Class, Month, Attendance %, Fees Paid (Y/N), Fees Amount. Built as a Ctrl+T Table so it expands safely and the filter dropdowns come free.
- **Summary** — the questions anyone actually asks: total fees collected, count pending, average attendance per class, a pass/fail or dues-status column via IF, and one chart.

**Formulas that stay correct when rows are added:**
- =SUMIFS(Fees[Amount],Fees[Paid],"N") — outstanding fees (structured references follow the table as it grows).
- =COUNTIF(Fees[Class],"CSE") — headcount per class.
- =AVERAGEIFS(Fees[Attendance],Fees[Class],"C2") — average attendance per class.
- Status column inside the table: =IF([@Paid]="Y","Clear","Dues") — row-relative, copies itself on expansion.
- Chart: column chart of average attendance per class, y-axis from zero, titled with the finding.

**The clean-up pass you will narrate:** the Records sheet starts as a pasted export — you apply TRIM/CLEAN, Flash Fill a first-name column if asked, Remove Duplicates on ID+Month, and add Data Validation (Class from a list; Attendance 0–1). Say this out loud in the interview; it is the whole course in sixty seconds.

**Defence questions to rehearse:** Why SUMIFS not SUM? (Conditional — matches Paid=N.) Why a Table? (Auto-expansion + structured refs keep formulas valid as data grows.) Why does the chart y-axis start at zero? (Columns must — honest comparison.) What if attendance is pasted as text? (COUNTA>COUNT audit catches it; Text to Columns fixes.)`,
        extras: [
          table('Sheet', ['Answers'], [
            ['Records', 'What happened — one row per student-month'],
            ['Summary', 'What to do — totals, dues, per-class averages, chart'],
          ]),
          tip(
            'Structured references are the interview answer',
            'Fees[Amount] names the column inside the table — the formula keeps working when the table grows, unlike a fixed B2:B500. Use them in the Summary sheet and mention why.',
          ),
          warn(
            'Validation is not retroactive',
            'Data Validation stops NEW bad entries; it does not fix rows already pasted. Run the clean-up pass first, then add validation to keep the sheet clean from now on.',
          ),
        ],
        worked: {
          title: 'The outstanding-fees formula, end to end',
          problem:
            'Fees table has columns Paid (Y/N) and Amount. Summary must show total outstanding.',
          steps: [
            { title: 'Conditional sum', desc: '=SUMIFS(Fees[Amount],Fees[Paid],"N") — adds Amount only where Paid is N.' },
            { title: 'Cross-check', desc: '=SUM(Fees[Amount])-SUMIFS(Fees[Amount],Fees[Paid],"Y") must equal the same number; if not, some Paid cell is neither Y nor N.' },
            { title: 'Count the cases', desc: '=COUNTIF(Fees[Paid],"N") — the number of students with dues; pair it with the total for the summary tile.' },
            { title: 'Chart it', desc: 'A small column chart: outstanding by Class (SUMIFS with class criteria per class row). Y-axis zero-based, titled with the largest-dues finding.' },
          ],
          solution:
            'SUMIFS on the table columns gives outstanding fees; the subtraction cross-check validates every Paid cell is exactly Y or N; COUNTIF gives the headcount behind the rupee figure.',
        },
        practice: {
          title: 'Ship the tracker',
          prompt:
            'Build the full two-sheet tracker from scratch with at least 12 Records rows across two classes. Include: SUMIFS outstanding, per-class AVERAGEIFS, an IF status column inside the table, and one honest chart. Save it as YourName-Excel-Capstone.xlsx.',
          hint: 'Build Records as a Table FIRST; write Summary formulas with structured references after.',
        },
        mistakes: [
          {
            mistake: 'Fixed ranges (B2:B500) in Summary formulas',
            fix: 'New rows fall outside the range and silently drop out of totals. Use Table structured references (Fees[Amount]) so the range follows the data.',
          },
          {
            mistake: 'Adding Data Validation before cleaning pasted rows',
            fix: 'Validation does not touch existing values. Clean first (the five-step pass), then validate to keep future entries honest.',
          },
        ],
        exam: {
          question:
            'Your Summary shows SUM(Fees[Amount]) = 84,000 but outstanding SUMIFS(...,"N") = 31,000 while adding the Paid="Y" side gives 45,000. What is wrong?',
          answer:
            '31,000 + 45,000 = 76,000 ≠ 84,000 — some Paid cells are neither exactly "Y" nor exactly "N" (trailing spaces, lowercase, or blanks). Audit with =COUNTA(Fees[Paid]) vs COUNTIF Y + COUNTIF N; TRIM/clean the Paid column and re-validate with a Y/N dropdown.',
          source: 'Cross-check reasoning — the capstone defence question.',
        },
        summary: [
          'Two sheets: Records (raw rows, a Table) and Summary (SUMIFS/COUNTIF/AVERAGEIFS + one chart).',
          'Table structured references keep formulas valid as rows are added.',
          'Cross-check conditional totals against the unconditional total; the gap exposes dirty keys.',
          'Narrate the clean-up pass in the interview — it proves the whole course in one minute.',
        ],
      }),
      [
        [
          'Why use Fees[Amount] instead of B2:B500 in the Summary?',
          ['It is shorter', 'It follows the table as rows are added', 'It is faster to calculate', 'It locks the range'],
          1,
          'Structured references auto-expand with the table; fixed ranges silently miss new rows.',
        ],
        [
          'SUMIFS(Fees[Amount],Fees[Paid],"N") computes:',
          ['All fees', 'Fees where Paid is N (outstanding)', 'Fees where Paid is Y', 'The count of rows'],
          1,
          'SUMIFS adds the sum range only where every criteria range matches — here, unpaid rows.',
        ],
        [
          'Data Validation on a column:',
          ['Fixes already-pasted invalid values', 'Stops new invalid entries', 'Deletes duplicates', 'Converts text to numbers'],
          1,
          'Validation is preventive, not retroactive — clean existing data first, then validate.',
        ],
        [
          'Outstanding (31,000) + Paid-side (45,000) does not equal the SUM total (84,000). Most likely cause:',
          ['A chart is wrong', 'Some Paid cells are not exactly Y or N', 'SUMIFS is broken', 'The table has filters applied'],
          1,
          'Trailing spaces, case or blanks make rows match neither criteria; the arithmetic gap is the audit signal.',
        ],
      ]
    ),
  ],
};
