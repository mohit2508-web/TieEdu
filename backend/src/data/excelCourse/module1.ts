// Module 1 — Cells, Ranges & Formatting
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — Cells, Ranges & Formatting',
  summary:
    'The grid, cell types that actually matter, ranges, and the formatting that survives a CSV export.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'xl-1-1',
      1,
      'The Grid: Cells, References & Data Types',
      'Rows, columns, A1 references, ranges, and the three data types Excel treats differently — numbers, text and dates.',
      16,
      nineBlocks({
        objectives: [
          'Navigate the grid and name any cell or range with A1 notation',
          'Tell apart numbers, text and dates — and why Excel treats them differently',
          'Enter and edit data with the keyboard shortcuts that save real time',
        ],
        hook:
          'A marks sheet where 92 is stored as text sorts below 8. A budget where "1,200" is text never sums. Half of every "Excel bug" in a college submission is a data-type problem in a cell that looks fine on screen.',
        concept: `**The grid:** columns are lettered A, B, C…; rows are numbered 1, 2, 3…. A cell is its column letter + row number — B3 is column B, row 3. The Name Box (top-left, left of the formula bar) always shows the active cell's name; click it and type a reference to jump there.

**Ranges:** a rectangle of cells written first-cell:last-cell — A1:A10 is a column of ten cells, B2:D5 is a 3×4 block, 2:2 is all of row 2. Every function in this course takes ranges as input.

**Three data types Excel treats differently:**
- **Numbers** — right-aligned by default, sum in SUM(), compare numerically.
- **Text** — left-aligned, IGNORED by SUM(). A number typed with a leading apostrophe ('92) is forced to text.
- **Dates** — secretly numbers. 1 Jan 1900 is serial 1; today is a five-digit number with a date format on top. This is why date arithmetic works and why a "date" stored as text never sorts chronologically.

**Entry shortcuts worth muscle memory:** Enter moves down, Tab moves right, Enter on the last row wraps to the top of the range you were typing into. F2 edits the active cell in place. Ctrl+Enter fills the whole selection with what you typed. Escape cancels an entry mid-way.`,
        extras: [
          table('Reference', ['What it names'], [
            ['B3', 'Single cell — column B, row 3'],
            ['A1:A10', 'Column range — 10 cells'],
            ['B2:D5', 'Block — 3 columns × 4 rows'],
            ['2:2', 'Entire row 2'],
            ['$B$3', 'Absolute cell — never shifts when copied'],
          ]),
          tip(
            'Name Box as a calculator',
            'Select any range and the Name Box area shows Count and Sum instantly — no formula needed. Select cells and look bottom-left of the status bar; right-click the status bar to add Average too.',
          ),
          warn(
            "The apostrophe trap",
            "Typing '92 stores TEXT that looks like a number. It will not sum, it sorts after every real number, and SUM() silently skips it. Watch the alignment: left means text.",
          ),
        ],
        worked: {
          title: 'Spot the text-numbers in a marks column',
          problem:
            'A column C2:C11 should hold ten marks. SUM(C2:C11) returns 340 but adding the visible values by hand gives 428. Why?',
          steps: [
            { title: 'Count the cells', desc: 'COUNT(C2:C11) returns 8, not 10 — two cells are not numbers.' },
            { title: 'Find them', desc: 'ISNUMBER(C2) filled down (Ctrl+D) returns FALSE on the two text cells.' },
            { title: 'See why', desc: 'Those two were pasted from a portal export with a leading apostrophe — they are left-aligned.' },
            { title: 'Fix', desc: 'Select the column: Data → Text to Columns → Finish converts text-numbers in place. Or multiply a helper column by 1.' },
          ],
          solution:
            'Two marks were stored as text (left-aligned). Text-to-Columns or a 1× helper converts them; SUM then returns the true 428.',
        },
        practice: {
          title: 'Audit a pasted column',
          prompt:
            'Paste any ten numbers into A1:A10, then force two of them to text with a leading apostrophe. Run COUNT, SUM and AVERAGE — record how each treats the text cells, then convert them and re-run.',
          hint: 'COUNT counts numbers only; COUNTA counts everything; SUM and AVERAGE ignore text.',
        },
        mistakes: [
          {
            mistake: 'Assuming SUM ignores text silently — the total is just "a bit low"',
            fix: 'A skipped cell is not a rounding error; it is missing data. Cross-check COUNT against the expected row count every time a total surprises you.',
          },
          {
            mistake: 'Editing a cell when you meant to select a range',
            fix: 'F2 edits in place; Enter commits and moves. If you typed into a cell by accident, Esc cancels with no change.',
          },
        ],
        exam: {
          question:
            'Why does SUM ignore a cell containing a number that was typed with a leading apostrophe?',
          answer:
            "The apostrophe forces text storage. Text is never included in SUM/AVERAGE/MIN/MAX even when it looks like a number; Excel only includes numeric-typed cells.",
          source: 'Data types — the single most examined Excel concept in placement tests.',
        },
        summary: [
          'A1 notation: column letter + row number; ranges use first:last.',
          'Numbers, text and dates are three different types — dates are secretly numbers.',
          "A leading apostrophe forces text; left-alignment is the visual tell.",
          'Ctrl+Enter fills a whole selection; F2 edits in place; Esc cancels.',
        ],
      }),
      [
        [
          'In A1 notation, the range B2:D5 covers:',
          ['3 cells', '12 cells', '15 cells', '3 columns of 5 rows'],
          1,
          'B to D is 3 columns; rows 2 to 5 is 4 rows; 3 × 4 = 12 cells.',
        ],
        [
          'A cell shows 92 but is left-aligned. What does SUM do with it?',
          ['Adds 92', 'Ignores it', 'Adds 0', 'Throws an error'],
          1,
          'Left-alignment signals text storage; SUM only adds numeric-typed cells.',
        ],
        [
          'Dates in Excel are stored as:',
          ['Text strings', 'Numbers with a date format', 'Special date objects', 'Weekday codes'],
          1,
          '1 Jan 1900 is serial 1; every date is that serial number wearing a format.',
        ],
        [
          'Which shortcut fills the entire current selection with what you just typed?',
          ['Shift+Enter', 'Ctrl+Enter', 'Alt+Enter', 'Ctrl+D'],
          1,
          'Ctrl+Enter commits into every selected cell; Ctrl+D fills down only.',
        ],
      ]
    ),
    lesson(
      M1,
      'xl-1-2',
      2,
      'Formatting That Survives Export',
      'Number formats, conditional formatting, freeze panes, and the formats that vanish when the file becomes a CSV.',
      15,
      nineBlocks({
        objectives: [
          'Apply number formats (currency, percent, date) without changing the underlying value',
          'Use conditional formatting to make outliers visible at a glance',
          'Freeze panes and size a sheet so it stays readable at 200 rows',
        ],
        hook:
          'Formatting is not decoration — it is how a reader finds the three cells that matter in two hundred. But half of it is paint that a CSV export strips away: know which half is structure and which half is costume.',
        concept: `**Number formats are a lens, not a rewrite.** A cell holding 0.125 with Percent format shows 12.5% — the value underneath is still 0.125, and formulas use 0.125. Currency format adds ₹ and thousands separators; Date format displays a serial as 15/10/2026. Change the format and the value never moves.

**Conditional formatting** colours or flags cells by rule: Home → Conditional Formatting. The three rules worth knowing:
- Highlight Cell Rules → Greater Than / Between — numeric thresholds.
- Top/Bottom Rules → Top 10% — relative standout.
- Color Scales — a heatmap; good for a 200-row table, noise for a 5-row one.

**Structure that survives export:** column widths, row heights, freeze panes, number formats and cell borders are all presentation stored in the file. A CSV keeps NONE of it — CSV is raw values, comma-separated, one row per line. What survives a CSV round-trip is only the data itself and the display text of each cell. Never hand someone a formatted xlsx when they asked for CSV, and never re-import a CSV expecting your formats back.

**Freeze panes:** View → Freeze Panes locks the header row (and optionally the first column) so they stay visible while you scroll. For any table longer than one screen, this is not optional.`,
        extras: [
          table('Feature', ['Survives CSV export?'], [
            ['Cell values', 'Yes — that is all CSV is'],
            ['Number formats (₹, %, dates)', 'No — only the displayed text'],
            ['Conditional formatting colours', 'No'],
            ['Column widths, freeze panes', 'No'],
            ['Borders and fills', 'No'],
          ]),
          tip(
            'Freeze before you scroll',
            'Ctrl+Home jumps to A1 from anywhere. Freeze the header row the moment a table passes one screen — re-finding your place in 400 rows costs more time than the freeze ever will.',
          ),
          warn(
            'Percent format is not multiplication',
            'Percent format DISPLAYS 0.125 as 12.5%; it does not multiply by 100. If a formula needs the percentage as a number, use the 0.125 value directly or multiply explicitly.',
          ),
        ],
        worked: {
          title: 'Flag the attendance outliers',
          problem:
            'Column B holds attendance percentages (0.82, 0.91, 0.55…) for 120 students. Make sub-75% cells red without touching the values.',
          steps: [
            { title: 'Select the data', desc: 'Click the column-B header to select the whole column.' },
            { title: 'New rule', desc: 'Home → Conditional Formatting → Highlight Cell Rules → Less Than…' },
            { title: 'Threshold', desc: 'Type 0.75 (the stored value is a decimal, not 75) and pick the red-fill style.' },
            { title: 'Verify', desc: 'The 0.55 row lights up; 0.82 does not. The underlying values are unchanged — check with a formula on one cell.' },
          ],
          solution:
            'A Less-Than-0.75 conditional rule on column B flags every student under 75%. Values untouched; the rule is metadata that a CSV would drop.',
        },
        practice: {
          title: 'Heatmap a marks block',
          prompt:
            'Take a 10×5 block of marks. Apply a 3-colour scale conditional format, then save as CSV, re-open the CSV and note exactly what came back.',
          hint: 'Compare side by side: the xlsx keeps colours and widths; the CSV keeps only values.',
        },
        mistakes: [
          {
            mistake: 'Typing 75 instead of 0.75 in a percent-formatted column',
            fix: 'The stored value is the decimal. A cell showing 82% holds 0.82 — your rule threshold must be 0.75, not 75.',
          },
          {
            mistake: 'Sending a formatted xlsx when the receiver asked for CSV',
            fix: 'CSV cannot carry formats. If the receiver needs the ₹ symbol or colour flags, send the xlsx (or a screenshot) alongside the CSV.',
          },
        ],
        exam: {
          question:
            'A cell displays "₹1,250" with currency format. What value do formulas see, and what does a CSV export contain?',
          answer:
            'Formulas see the raw number 1250 — the ₹ and separators are display format only. A CSV export contains the displayed text as typed/stored (1250 or the formatted string depending on export settings), but never the currency formatting itself.',
          source: 'Format-vs-value, the classic "my SUM broke after export" interview question.',
        },
        summary: [
          'Number formats change display, never the stored value formulas use.',
          'Conditional formatting flags outliers by rule; thresholds use stored values (0.75, not 75).',
          'Freeze panes before scrolling any table longer than a screen.',
          'CSV keeps values only — every visual format is stripped on export.',
        ],
      }),
      [
        [
          'A cell with Percent format displays 12.5%. What value does =A1*2 return?',
          ['25', '0.25', '12.5', '25.0%'],
          1,
          'The stored value is 0.125; ×2 = 0.25, which Percent format would display as 25%.',
        ],
        [
          'Which of these survives a save-as-CSV round-trip?',
          ['Column widths', 'Conditional formatting', 'Cell values', 'Freeze panes'],
          2,
          'CSV is raw values only — every visual feature is file-format metadata that CSV does not carry.',
        ],
        [
          'To flag cells below 75% in a percent-formatted column, the Less Than rule threshold is:',
          ['75', '0.75', '75%', 'Either 75 or 0.75'],
          1,
          'Stored values are decimals — the rule compares against 0.75.',
        ],
        [
          'Freeze Panes is used to:',
          ['Lock a cell against editing', 'Keep header rows visible while scrolling', 'Protect the sheet password', 'Split the window permanently'],
          1,
          'It pins header rows/columns in view; it is presentation, not protection.',
        ],
      ]
    ),
  ],
};
