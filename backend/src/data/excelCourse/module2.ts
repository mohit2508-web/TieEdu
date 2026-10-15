// Module 2 — Formulas & Core Functions
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Formulas & Core Functions',
  summary:
    'Relative vs absolute references, the SUM/AVERAGE/COUNT family, IF logic, and the error codes every formula reader must decode.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'xl-2-1',
      1,
      'References, SUM/COUNT/AVERAGE & Absolute Locks',
      'Writing your first formula, relative copying, $ locks, and the four aggregate functions that cover most real work.',
      17,
      nineBlocks({
        objectives: [
          'Write formulas with = and copy them correctly across rows and columns',
          'Use $ absolute references so a copied formula keeps pointing at one cell',
          'Apply SUM, AVERAGE, COUNT and COUNTA to the right kind of data',
        ],
        hook:
          'Every Excel formula starts with = and almost every broken Excel formula is a copy that moved. One missing $ on a tax-rate cell turns a correct budget into a confidently wrong one — and the total still looks plausible.',
        concept: `**Writing a formula:** select a cell, type =, then a calculation — =B2+C2, =B2*0.1, =SUM(B2:B10). The result appears in the cell; the formula shows in the formula bar. Ctrl+\` (grave accent) toggles between showing all formulas and all results.

**Relative references shift when copied.** =B2*C$1 copied down one row becomes =B3*C$2 — the row number moves with you. That is usually what you want (each row multiplies its own B value) — and exactly wrong when one input cell must stay fixed.

**The $ lock:** place $ before the part that must not move. $C$1 never shifts; C$1 keeps the column but lets the row move; $C1 locks the column only. The classic rate-cell layout: put the tax rate once in $C$1, then fill =B2*$C$1 down the column — every row multiplies by the same single rate cell.

**The four aggregates:**
- SUM(range) — adds numeric cells only.
- AVERAGE(range) — sum ÷ count of numeric cells; empty and text cells are skipped, not counted as zero.
- COUNT(range) — counts numeric cells only.
- COUNTA(range) — counts non-empty cells (numbers AND text).

The COUNT vs COUNTA pair is the audit tool: if COUNTA is 10 but COUNT is 8, two cells are text — exactly the type bug from Module 1.`,
        extras: [
          table('Function', ['Counts / returns'], [
            ['SUM', 'Adds numeric cells only'],
            ['AVERAGE', 'Mean of numeric cells (text/empty skipped)'],
            ['COUNT', 'How many numeric cells'],
            ['COUNTA', 'How many non-empty cells (any type)'],
            ['MAX / MIN', 'Largest / smallest numeric cell'],
          ]),
          tip(
            'F4 cycles lock types',
            'With the cursor on a reference inside the formula, F4 cycles B1 → $B$1 → B$1 → $B1 → B1. Faster and safer than typing dollars by hand.',
          ),
          warn(
            'AVERAGE silently skips text',
            'If two of ten marks are stored as text, AVERAGE divides by 8 — the average looks normal and is wrong. Audit with COUNT vs COUNTA before trusting any average.',
          ),
        ],
        worked: {
          title: 'Line-item budget with a locked rate cell',
          problem:
            'B2:B6 holds five item costs; $C$1 holds GST at 0.18. Column C must show 18% of each item cost.',
          steps: [
            { title: 'Formula in C2', desc: '=B2*$C$1 — B2 relative (moves per row), $C$1 absolute (stays the rate).' },
            { title: 'Fill down', desc: 'Double-click the fill handle (or drag) to C6 — each row now points at its own B row and the same $C$1.' },
            { title: 'Total row', desc: '=SUM(B2:B6) in B7 and =SUM(C2:C6) in C7.' },
            { title: 'Check', desc: 'Click C4: formula should read =B4*$C$1. If it reads =B4*C3 the lock is missing.' },
          ],
          solution:
            '=B2*$C$1 filled down gives each row the same 18% rate; the SUM row totals cost and GST separately.',
        },
        practice: {
          title: 'Audit a broken fill',
          prompt:
            'Build the budget above, then rebuild column C WITHOUT the $ on $C$1 and fill down. Click each cell and observe which rate cell each row grabs. Fix it with F4.',
          hint: 'Without the lock, C3 grabs C2, C4 grabs C3 — the rate drifts into the results column.',
        },
        mistakes: [
          {
            mistake: 'Forgetting $ on the rate cell when filling down',
            fix: 'Every formula that shares one input cell must lock it: $C$1. Verify by clicking a mid-column cell and reading the formula bar.',
          },
          {
            mistake: 'Using AVERAGE on a column with text-numbers and trusting the result',
            fix: 'Run COUNT and COUNTA first. If they differ, convert the text cells before averaging — the average divided by the wrong count is silently wrong.',
          },
        ],
        exam: {
          question:
            'In =B2*$C$1 filled from row 2 to row 6, what does the row-5 formula reference, and why?',
          answer:
            '=B5*$C$1. B2 is relative so it advances to B5; $C$1 is fully absolute so it stays pointing at the single rate cell in every row.',
          source: 'Relative vs absolute — the most frequently tested Excel reference concept.',
        },
        summary: [
          'Formulas start with =; relative references shift when copied.',
          '$ locks: $C$1 fixed entirely, C$1 row-relative, $C1 column-relative; F4 cycles.',
          'SUM/AVERAGE/COUNT use numeric cells only; COUNTA counts any non-empty.',
          'COUNT < COUNTA means text is hiding in a numeric column.',
        ],
      }),
      [
        [
          'With =B2*$C$1 in C2 filled down to C6, the row-5 formula is:',
          ['=B5*$C$1', '=B5*C5', '=B2*$C$1', '=B5*$C$5'],
          0,
          'B2 advances per row; $C$1 is locked to the one rate cell.',
        ],
        [
          'COUNT and COUNTA differ on a column. What does that indicate?',
          ['Empty rows exist', 'Some cells hold text, not numbers', 'The range is too large', 'Circular reference present'],
          1,
          'COUNT counts numbers; COUNTA counts everything non-empty — the gap is text cells.',
        ],
        [
          'AVERAGE over ten cells where two are text returns a mean based on:',
          ['10', '8', '2', 'An error'],
          1,
          'Text and blanks are skipped entirely — the divisor is the numeric count (8).',
        ],
        [
          'Which key cycles absolute/relative reference styles while editing a formula?',
          ['Ctrl+$', 'F4', 'F2', 'Shift+3'],
          1,
          'F4 cycles B1 → $B$1 → B$1 → $B1 on the reference under the cursor.',
        ],
      ]
    ),
    lesson(
      M2,
      'xl-2-2',
      2,
      'IF Logic & Decoding Errors',
      'IF conditionals, nested IFs, the IFS upgrade, and what #REF!, #VALUE!, #DIV/0! and circular references actually mean.',
      16,
      nineBlocks({
        objectives: [
          'Build IF formulas that return one of two outcomes from a test',
          'Read and repair the four most common formula errors',
          'Recognise when a nested IF should become IFS or a lookup instead',
        ],
        hook:
          'A results sheet that prints PASS/FAIL from a mark, a fee column that charges concession rates only for eligible students — branching is where a spreadsheet stops being a list and starts being a decision. And every branch you write is one more chance to meet #VALUE! at 2 a.m.',
        concept: `**IF(test, value_if_true, value_if_false):** the test is any comparison — >, <, >=, <=, <>, =. =IF(A2>=40,"PASS","FAIL") returns the word PASS when A2 is 40 or more, else FAIL. Numbers and text both work; text literals always take double quotes.

**Comparisons Excel accepts:** A2>40, A2=B3, A2<>"", ISBLANK(A2), A2>=40. Note <> means "not equal". A blank cell in a numeric comparison is treated as 0, which is why =IF(A2>0,...) on a blank cell returns the false branch — usually what you want, but know it.

**Nested IF** handles tiers: =IF(A2>=85,"Dist",IF(A2>=60,"Pass",IF(A2>=40,"Comp","Fail"))). Excel allows 64 levels deep; anything past three or four becomes unreadable — use IFS(A2>=85,"Dist",A2>=60,"Pass",A2>=40,"Comp",TRUE,"Fail") which tests in order and needs no closing parentheses stack.

**The error codes, decoded:**
- #DIV/0! — you divided by zero or by an empty cell.
- #VALUE! — a formula got text where it needed a number (the apostrophe bug, arriving late).
- #REF! — a reference points at deleted cells; the address is gone. Undo or rebuild the reference.
- #NAME? — a misspelled function name, or a name Excel does not recognise.
- #N/A — a lookup failed to find its key (Module 3's VLOOKUP home).
- Circular reference warning — a formula ultimately depends on itself (C1 = A1 + C1). Excel cannot resolve it; find it via Formulas → Error Checking, or enable Iterative Calculation only if you truly mean a self-referencing model.

Trace precedents (Formulas → Trace Precedents) draws arrows to every cell a formula reads — the fastest way to find which input is producing the error.`,
        extras: [
          table('Error', ['Meaning'], [
            ['#DIV/0!', 'Divided by zero or an empty cell'],
            ['#VALUE!', 'Text where a number was required'],
            ['#REF!', 'Reference points at deleted cells'],
            ['#NAME?', 'Unknown function name (typo)'],
            ['#N/A', 'Lookup key not found'],
            ['Circular', 'Formula depends on itself'],
          ]),
          tip(
            'IFERROR wraps the ugly away',
            '=IFERROR(A2/B2,0) returns 0 instead of #DIV/0! when B2 is empty. Use it for dashboard cells a viewer should never see broken — but do not wrap everything: an error you hide is an error you never fix.',
          ),
          warn(
            'Blank cells compare as zero',
            '=IF(A2>0,"yes","no") on an empty A2 returns "no" because blank is treated as 0. If "not yet entered" is a third state you care about, test ISBLANK(A2) first.',
          ),
        ],
        worked: {
          title: 'Grades with a three-tier IF',
          problem:
            'A2 holds a percentage. Return Distinction for ≥85, Pass for ≥40, otherwise Fail.',
          steps: [
            { title: 'Order matters', desc: 'Test from the top: =IF(A2>=85,"Distinction",IF(A2>=40,"Pass","Fail")).' },
            { title: 'Why top-down', desc: 'A 92 satisfies both >=85 and >=40 — the first TRUE branch wins, so the highest tier must be tested first.' },
            { title: 'Edge case', desc: 'A2 = 40 returns Pass (>= is inclusive). A2 blank returns Fail (blank = 0).' },
            { title: 'IFS variant', desc: '=IFS(A2>=85,"Distinction",A2>=40,"Pass",TRUE,"Fail") — same logic, no nested parentheses.' },
          ],
          solution:
            '=IF(A2>=85,"Distinction",IF(A2>=40,"Pass","Fail")) — highest tier tested first so a 92 is not caught by the >=40 branch.',
        },
        practice: {
          title: 'Fee concession formula',
          prompt:
            'B2 is annual family income. Charge fee 5000 if income < 300000, 8000 if < 600000, else 12000. Write it as a nested IF, then as IFS.',
          hint: 'Order: test the smallest threshold first with <, or the largest first with >= — pick one convention and stay consistent.',
        },
        mistakes: [
          {
            mistake: 'Testing tiers in the wrong order',
            fix: 'If A2=92 hits the >=40 branch first, it returns Pass. Always test the highest threshold first (or use IFS top-down, which enforces order visually).',
          },
          {
            mistake: 'Spreading a lookup across 6 nested IFs',
            fix: 'Three tiers is IF territory; more belongs to IFS or — better still — a VLOOKUP/lookup table (Module 3), where changing a band is editing a cell, not surgery on a formula.',
          },
        ],
        exam: {
          question:
            '=IF(A2>=60,"Pass","Fail") returns Fail for A2=75. Give the most likely cause and the check.',
          answer:
            'Most likely A2 holds text (e.g. "75" typed with a leading apostrophe), so the numeric comparison >=60 fails. Check with =ISNUMBER(A2) — FALSE confirms text storage; convert via Text to Columns or VALUE().',
          source: 'IF + the data-type bug — the two course themes combined, a favourite of placement tests.',
        },
        summary: [
          'IF(test, true_value, false_value); text values need double quotes.',
          'Test tiers highest-first so a value cannot fall into a lower band it also satisfies.',
          'IFS replaces deep nesting; TRUE as the last test is the default branch.',
          '#DIV/0!, #VALUE!, #REF!, #NAME?, #N/A each name a specific defect — read them, do not blanket-hide them.',
        ],
      }),
      [
        [
          '=IF(A2>=85,"D",IF(A2>=40,"P","F")) with A2=92 returns:',
          ['D', 'P', 'F', '#VALUE!'],
          0,
          'The first TRUE branch wins — 92 matches >=85 first.',
        ],
        [
          '#VALUE! in a SUM formula most likely means:',
          ['The range is empty', 'Text is present where numbers are expected', 'The formula is too long', 'The sheet is protected'],
          1,
          'Text (including apostrophe-forced numbers) inside a numeric operation raises #VALUE! — or is silently skipped by SUM.',
        ],
        [
          'A formula that ultimately depends on itself produces:',
          ['#REF!', 'A circular reference warning', '#N/A', '#NAME?'],
          1,
          'Excel cannot resolve a self-dependent calculation and warns at entry.',
        ],
        [
          'Blank cells in a numeric comparison like A2>0 are treated as:',
          ['Errors', 'Zero', 'Text', 'Ignored'],
          1,
          'Blank is 0 for comparison purposes — so an empty cell fails >0 and returns the IF false branch.',
        ],
      ]
    ),
  ],
};
