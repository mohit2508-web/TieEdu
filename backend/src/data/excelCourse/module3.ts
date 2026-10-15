// Module 3 — Tables, Sorting, Filtering & Charts
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Tables, Sorting, Filtering & Charts',
  summary:
    'Excel Tables, sort vs filter, and the two chart types that answer the two questions data usually asks.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'xl-3-1',
      1,
      'Tables, Sort & Filter',
      'Ctrl+T tables, structured references, single vs multi-key sort, and filter without destroying neighbouring data.',
      15,
      nineBlocks({
        objectives: [
          'Convert a range into an Excel Table and use its auto-expanding totals',
          'Sort by one and two keys without scrambling the rows',
          'Filter to a subset and know when SORT/FILTER formulas beat the buttons',
        ],
        hook:
          'Sort a names column without selecting the whole table and you have just detached every student from their marks — silently, with no warning dialog. Data integrity in Excel is mostly about selecting the right rectangle before you press the button.',
        concept: `**Ctrl+T makes a Table.** A Table is a structured object, not just bold headers: it auto-expands when you type in the row below, its headers get filter dropdowns, and a Totals Row (Table Design → Totals Row) can show SUM/AVERAGE per column that updates as rows are added. Formulas inside a table can use structured references — =[@Cost]*$C$1 reads as "this row's Cost column times the rate cell" and is far more readable than =B4*$C$1.

**Sort vs filter:**
- Sort rearranges ROWS. Select any single cell in the column, Data → Sort A to Z / Z to A — Excel auto-expands to the contiguous block. NEVER select just the one column: that is the scramble.
- Multi-key sort: Data → Sort, Add Level — e.g. Class ascending, then Marks descending. Order of levels is priority, top to bottom.
- Filter hides rows. Data → Filter (or Ctrl+T gives it free) — dropdown per column: text filters, number filters, colour filters. Hidden ≠ deleted; Clear Filter restores.

**Sort-safe rules:** every column of the table must be selected (or use a Table object, which sorts correctly from one cell). No blank header cells. No merged cells inside the data range — merged cells make "the row" ambiguous and are the fastest route to scrambled data.

**FILTER (365/2021) vs the buttons:** =FILTER(A2:D100,C2:C100="CSE","none") spills a live view of matching rows — it updates when source data changes, which a static filtered copy does not. Use buttons for a one-off look; use FILTER for a view someone else will refresh.`,
        extras: [
          table('Action', ['Safe selection'], [
            ['Single-column sort', 'One cell INSIDE the column (Excel expands)'],
            ['Multi-key sort', 'One cell inside; set levels in the dialog'],
            ['Filter', 'One cell inside; Ctrl+T adds dropdowns free'],
            ['Sort a non-table block', 'Select the FULL block including headers'],
          ]),
          tip(
            'Sort by a helper, not the display text',
            'Sorting a "10th, 9th, 12th" class label alphabetically gives nonsense. Add a numeric helper column (10, 9, 12) and sort on that instead.',
          ),
          warn(
            'One column selected = scrambled table',
            'If you select ONLY the marks column and sort, the marks detach from their names permanently (Ctrl+Z immediately if caught). Select a single cell inside the column, or the whole table.',
          ),
        ],
        worked: {
          title: 'Top 3 scorers per class, two-key sort',
          problem:
            'A1:D100 holds Name, Class, Marks, Result. Rank the sheet by Class A→Z, then Marks highest-first within each class.',
          steps: [
            { title: 'Enter the dialog', desc: 'Click one cell inside the data; Data → Sort.' },
            { title: 'Level 1', desc: 'Sort by Class, A to Z.' },
            { title: 'Level 2', desc: 'Add Level — then by Marks, Largest to Smallest. Level order = priority.' },
            { title: 'Verify', desc: 'Within each class block the marks now descend; names still match their marks (headers travelled with their rows).' },
          ],
          solution:
            'Two-level sort: Class ascending, Marks descending. Every row moved whole, so Name/Result stayed attached.',
        },
        practice: {
          title: 'Filter and total a fee sheet',
          prompt:
            'Build a 30-row Name/Class/Fee table, Ctrl+T it, enable the Totals Row showing SUM of Fee. Filter Class = "CSE" and watch the total change. Clear the filter and confirm it restores.',
          hint: 'The Totals Row recalculates against visible (filtered) rows — that is the point.',
        },
        mistakes: [
          {
            mistake: 'Sorting one column while the rest of the row stays put',
            fix: 'Select a single cell inside the column (Excel expands) or the whole table. Never highlight just the one column.',
          },
          {
            mistake: 'Merged cells inside a data range',
            fix: 'Unmerge first (Home → Merge & Center → Unmerge). Merged cells make row boundaries ambiguous; sort and filter become unsafe.',
          },
        ],
        exam: {
          question:
            'Why can sorting a single selected column corrupt a dataset, and how do you sort safely?',
          answer:
            'Excel moves only the selected cells, so values detach from their row\'s other columns — names no longer match marks. Sort safely by selecting one cell inside the column (Excel auto-expands to the contiguous block) or by using a Ctrl+T Table, which always moves whole rows.',
          source: 'Data-integrity classic — almost every Excel aptitude test includes it.',
        },
        summary: [
          'Ctrl+T: auto-expanding Table with filter dropdowns and optional totals row.',
          'Sort moves rows; filter hides rows; both start from one cell inside the data.',
          'Multi-key sort: Add Level; the top level is the primary key.',
          'Never sort a single highlighted column; never merge cells inside data.',
        ],
      }),
      [
        [
          'Safest way to sort a column of a data block?',
          ['Select the whole column in the grid', 'Select one cell inside the column', 'Select the header only', 'Select the entire sheet'],
          1,
          'One cell inside the block lets Excel expand to the contiguous range and move whole rows.',
        ],
        [
          'In a two-level Sort dialog, the top level is:',
          ['The tiebreaker', 'The primary key', 'Ignored', 'Applied last'],
          1,
          'Levels apply top-down; the first listed level is the primary sort key.',
        ],
        [
          'A Ctrl+T Table automatically adds:',
          ['Charts', 'Filter dropdowns on headers', 'Password protection', 'Macros'],
          1,
          'Tables ship with header dropdowns; totals and styles are optional toggles.',
        ],
        [
          'Filtering a table with the Totals Row enabled changes the total to show:',
          ['All rows always', 'Only visible (filtered) rows', 'An error', 'The median'],
          1,
          'Subtotals/totals respond to visibility — that is how per-class views are produced without copying data.',
        ],
      ]
    ),
    lesson(
      M3,
      'xl-3-2',
      2,
      'Charts That Answer a Question',
      'Column vs line vs pie (when each is honest), chart essentials, and the anti-chart-lie checklist.',
      14,
      nineBlocks({
        objectives: [
          'Pick the chart type that matches the question being asked',
          'Build a clean chart: right data orientation, titled axes, honest scale',
          'Recognise the misleading-chart tricks every interviewer tests for',
        ],
        hook:
          'A column chart with a truncated y-axis can make a 2% dip look like a collapse. Interviewers know this — "what is wrong with this chart?" is a standard question — and so should you, whether you are building the slide or auditing someone else\'s.',
        concept: `**Match chart to question:**
- Column (bar) — compare categories at one moment: marks per class, fee per branch. Discrete items.
- Line — change over TIME: attendance across months, XP over a semester. The x-axis must be a continuous time or ordered sequence.
- Pie — parts of ONE whole, ≤ 5 slices, all positive. If your pie has nine slices or negative values, it is a column chart wearing a costume.
- Bar (horizontal) — same as column but for long category names (company names, role titles) that would collide on a horizontal axis.

**Build it right:** select the data WITH headers (labels travel with values), Insert → recommended chart or pick the type. Then fix the defaults:
- Chart title states the finding ("CSE attendance trails ECE by 9 points"), not just the topic ("Attendance").
- Axis titles on both axes. A bare number axis is a puzzle, not a chart.
- Data labels only when the reader needs exact values — otherwise they are ink.
- Legend only when there are ≥ 2 series.

**The honesty checklist (interview bait):**
- Y-axis starts at zero for columns and bars. A column chart from 380 to 420 exaggerates a small gap.
- Line charts MAY zoom the y-range — time trends are read as shape — but say so if the range is truncated.
- Pie slices sum to 100% of ONE thing; "other" beyond ~15% should be investigated, not swept up.
- Same data, same scale, when comparing two charts side by side.

**Switching type later:** right-click the chart → Change Chart Type. Data selection stays; only the rendering changes — safe to experiment.`,
        extras: [
          table('Question', ['Honest chart'], [
            ['Compare categories', 'Column / bar'],
            ['Change over time', 'Line'],
            ['Parts of one whole (few)', 'Pie'],
            ['Distribution of one variable', 'Histogram (column, no gaps)'],
          ]),
          tip(
            'Select with headers, always',
            'Include the header row and first column in your selection before Insert → Chart: Excel then auto-names the series and axis labels correctly. Chart without labels is a puzzle you force the reader to solve.',
          ),
          warn(
            'The truncated-axis lie',
            'A column chart whose y-axis starts at 380 turns a 5% gap into a visual chasm. Columns and bars must start at zero; only line charts may zoom, and even then state the range.',
          ),
        ],
        worked: {
          title: 'Attendance trend across six months',
          problem:
            'Monthly attendance percentages for one student, Jan–Jun. Show the trend honestly.',
          steps: [
            { title: 'Orientation', desc: 'Time on the x-axis — months in a column, percentages beside them; select both with headers.' },
            { title: 'Chart type', desc: 'Insert → Line Chart (with markers). One series, one question: is attendance rising or falling?' },
            { title: 'Label it', desc: 'Title: "Attendance dips each March and recovers by June". Y-axis title "Attendance %", x-axis "Month".' },
            { title: 'Scale check', desc: 'A percentage line may zoom (e.g. 70–100%) for shape — acceptable for a trend line; never do this for columns.' },
          ],
          solution:
            'A labelled line chart with month axis and % axis; the title states the finding, and the zoomed y-range is legitimate for a single trend line.',
        },
        practice: {
          title: 'Fix a lying chart',
          prompt:
            'Chart five branch averages as columns with the y-axis manually set to 60–85. Observe the exaggerated gaps. Reset the axis to start at 0 and compare the visual story.',
          hint: 'Right-click the y-axis → Format Axis → Bounds → Minimum = 0.',
        },
        mistakes: [
          {
            mistake: 'Pie chart with 8+ slices or negative values',
            fix: 'Pie needs a small set of positive parts of one whole. Use a bar chart for many categories; negatives cannot be a "slice" at all.',
          },
          {
            mistake: 'Column chart with a truncated y-axis',
            fix: 'Set the axis minimum to 0. If the differences then look small, that is because they ARE small — report the number, not a manufactured visual gap.',
          },
        ],
        exam: {
          question:
            'A colleague shows a column chart of two department budgets, y-axis from ₹9.5L to ₹10.5L, claiming a "massive" gap. What is wrong and how do you fix it?',
          answer:
            'Column charts must start the y-axis at zero; a truncated axis visually amplifies a small difference. Reset the axis minimum to 0 — the real gap is around 5%, which the honest chart will show as modest. Report the numeric difference alongside.',
        },
        summary: [
          'Column/bar compare categories; line shows time; pie is a small set of positive parts.',
          'Select data WITH headers; title the chart with the finding, label both axes.',
          'Columns and bars start at zero; only trend lines may zoom the y-range.',
          '"What is wrong with this chart?" = check axis start, labels, slice count, scale consistency.',
        ],
      }),
      [
        [
          'Which chart best shows one student\'s attendance across six months?',
          ['Pie', 'Column', 'Line', 'Scatter'],
          2,
          'Time series reads as shape — line is the honest choice.',
        ],
        [
          'A column chart\'s y-axis should normally:',
          ['Start at zero', 'Start just below the minimum value', 'Be hidden', 'Use a log scale by default'],
          0,
          'Truncated axes exaggerate bar differences — columns must start at zero.',
        ],
        [
          'A pie chart is honest only when slices are:',
          ['Any number of categories', 'Positive parts of one whole', 'Sorted alphabetically', 'More than 6'],
          1,
          'Parts of a single whole, all positive, few enough to read — otherwise use bars.',
        ],
        [
          'The best chart title states:',
          ['The dataset name', 'The finding or takeaway', 'The creation date', 'The chart type'],
          1,
          'A title that names the insight ("X leads by 9 points") beats a topic label ("Attendance").',
        ],
      ]
    ),
  ],
};
