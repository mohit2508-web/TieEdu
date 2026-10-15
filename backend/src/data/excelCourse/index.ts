// Excel for Students — a Bucket E micro-course (3h, foundation tier).
//
// The fastest-path-to-a-certificate funnel entry after Resume: every engineering
// submission, internship report and placement spreadsheet eventually lands in
// Excel, and almost none of them were taught properly. Four modules, eight
// lessons, one capstone tracker.
import type { Course, CourseModule, ExamQuestion } from '../db';
import { module1 } from './module1';
import { module2 } from './module2';
import { module3 } from './module3';
import { module4 } from './module4';

const modules: CourseModule[] = [module1, module2, module3, module4];

// A 30-question bank, mixed difficulty, tagged by topic so the exam engine can
// draw a balanced paper per attempt. Answer keys never leave the server
// pre-submission — sanitizeExamQuestions strips them on the public payload.
const examBank: ExamQuestion[] = [
  // Foundations (Module 1)
  {
    id: 'xl-bank-01',
    prompt: 'In A1 notation, what does the range C3:C10 represent?',
    options: ['A row of 8 cells', 'A column of 8 cells', 'A block of 8×3 cells', 'Two separate cells'],
    correct_index: 1,
    explanation: 'C3:C10 is one column (C) spanning rows 3 to 10 — eight cells.',
    difficulty: 'easy',
    topic: 'foundations',
  },
  {
    id: 'xl-bank-02',
    prompt: 'A cell displaying 45% is left-aligned. What does SUM do with it?',
    options: ['Adds 0.45', 'Adds 45', 'Ignores it', 'Raises #VALUE!'],
    correct_index: 2,
    explanation:
      'Left-alignment indicates text storage. SUM silently ignores text even when it looks numeric.',
    difficulty: 'easy',
    topic: 'foundations',
  },
  {
    id: 'xl-bank-03',
    prompt: 'How are dates stored inside Excel?',
    options: ['As text strings', 'As serial numbers with a date format', 'As special date objects', 'As weekday codes'],
    correct_index: 1,
    explanation: '1 Jan 1900 is serial 1; every date is that number wearing a date display format.',
    difficulty: 'easy',
    topic: 'foundations',
  },
  {
    id: 'xl-bank-04',
    prompt: 'Which shortcut fills every cell in the current selection with what you just typed?',
    options: ['Shift+Enter', 'Ctrl+Enter', 'Alt+Enter', 'Ctrl+D'],
    correct_index: 1,
    explanation: 'Ctrl+Enter commits the entry into all selected cells at once.',
    difficulty: 'easy',
    topic: 'foundations',
  },
  {
    id: 'xl-bank-05',
    prompt: "A number typed with a leading apostrophe ('92) is stored as:",
    options: ['A number', 'Text', 'A formula', 'A comment'],
    correct_index: 1,
    explanation: 'The apostrophe forces text storage; the cell displays 92 but SUM ignores it.',
    difficulty: 'easy',
    topic: 'foundations',
  },
  {
    id: 'xl-bank-06',
    prompt: 'The Name Box (top-left, beside the formula bar) shows:',
    options: ['The file name', 'The active cell reference', 'The sum of the selection', 'The sheet password'],
    correct_index: 1,
    explanation: 'It always names the active cell or range; typing a reference there jumps to it.',
    difficulty: 'easy',
    topic: 'foundations',
  },
  {
    id: 'xl-bank-07',
    prompt: 'Which feature keeps the header row visible while scrolling a long table?',
    options: ['Protect Sheet', 'Freeze Panes', 'Filter', 'Group'],
    correct_index: 1,
    explanation: 'View → Freeze Panes pins the chosen rows/columns in the viewport.',
    difficulty: 'easy',
    topic: 'formatting',
  },
  {
    id: 'xl-bank-08',
    prompt: 'A cell with Currency format shows ₹1,250. What do formulas see?',
    options: ['₹1,250', '1250', '1,250', 'A text string'],
    correct_index: 1,
    explanation: 'Currency is a display lens; the stored value the formulas use is the number 1250.',
    difficulty: 'medium',
    topic: 'formatting',
  },
  {
    id: 'xl-bank-09',
    prompt: 'Which of these survives a save-as-CSV round-trip?',
    options: ['Column widths', 'Conditional formatting', 'Cell values', 'Freeze panes'],
    correct_index: 2,
    explanation: 'CSV stores raw values only — every visual format is stripped on export.',
    difficulty: 'medium',
    topic: 'formatting',
  },
  {
    id: 'xl-bank-10',
    prompt: 'To flag cells below 75% in a percent-formatted column, the Less Than rule threshold is:',
    options: ['75', '0.75', '75%', 'Either 75 or 75%'],
    correct_index: 1,
    explanation: 'Stored percent values are decimals (82% = 0.82), so the rule compares against 0.75.',
    difficulty: 'medium',
    topic: 'formatting',
  },
  // Formulas (Module 2)
  {
    id: 'xl-bank-11',
    prompt: '=B2*$C$1 is filled from row 2 to row 6. The row-5 formula is:',
    options: ['=B5*$C$1', '=B5*C5', '=B2*$C$1', '=B5*$C$5'],
    correct_index: 0,
    explanation: 'B2 is relative and advances to B5; $C$1 is fully absolute and stays put.',
    difficulty: 'easy',
    topic: 'formulas',
  },
  {
    id: 'xl-bank-12',
    prompt: 'COUNT returns 8 and COUNTA returns 10 on the same range. This means:',
    options: ['Two cells are empty', 'Two cells hold text, not numbers', 'The range is invalid', 'A circular reference exists'],
    correct_index: 1,
    explanation: 'COUNT counts numbers only; COUNTA counts non-empty. The gap of 2 is text cells.',
    difficulty: 'easy',
    topic: 'formulas',
  },
  {
    id: 'xl-bank-13',
    prompt: 'AVERAGE over ten cells where two hold text returns a mean based on:',
    options: ['10', '8', '2', 'An error'],
    correct_index: 1,
    explanation: 'Text and blanks are skipped entirely — the divisor is the numeric count, 8.',
    difficulty: 'medium',
    topic: 'formulas',
  },
  {
    id: 'xl-bank-14',
    prompt: 'Which key cycles absolute/relative reference styles while editing a formula?',
    options: ['Ctrl+3', 'F4', 'F2', 'Shift+F4'],
    correct_index: 1,
    explanation: 'F4 cycles B1 → $B$1 → B$1 → $B1 on the reference under the cursor.',
    difficulty: 'easy',
    topic: 'formulas',
  },
  {
    id: 'xl-bank-15',
    prompt: 'Which formula locks the COLUMN but lets the row of C1 shift when copied down?',
    options: ['C$1', '$C1', '$C$1', 'CC1'],
    correct_index: 0,
    explanation: 'C$1 locks the row number (1) while the column stays relative; $C1 locks the column instead.',
    difficulty: 'medium',
    topic: 'formulas',
  },
  {
    id: 'xl-bank-16',
    prompt: 'Which function returns the count of non-empty cells including text?',
    options: ['COUNT', 'COUNTA', 'COUNTIF', 'COUNTBLANK'],
    correct_index: 1,
    explanation: 'COUNTA counts any non-empty cell; COUNT counts numeric-typed cells only.',
    difficulty: 'easy',
    topic: 'formulas',
  },
  {
    id: 'xl-bank-17',
    prompt: '=IF(A2>=85,"D",IF(A2>=40,"P","F")) with A2=92 returns:',
    options: ['D', 'P', 'F', '#VALUE!'],
    correct_index: 0,
    explanation: 'The first TRUE branch wins — 92 matches the >=85 test first.',
    difficulty: 'easy',
    topic: 'formulas',
  },
  {
    id: 'xl-bank-18',
    prompt: 'A formula ultimately depending on itself produces:',
    options: ['#REF!', 'A circular reference warning', '#N/A', '#NAME?'],
    correct_index: 1,
    explanation: 'Excel cannot resolve a self-dependent calculation and raises the circular-reference warning.',
    difficulty: 'easy',
    topic: 'formulas',
  },
  {
    id: 'xl-bank-19',
    prompt: '#VALUE! inside a SUM formula most likely indicates:',
    options: ['The range is empty', 'Text is present where numbers are expected', 'The formula is too long', 'The sheet is protected'],
    correct_index: 1,
    explanation: 'Text (including apostrophe-forced numbers) in a numeric operation is the classic #VALUE! cause.',
    difficulty: 'medium',
    topic: 'formulas',
  },
  {
    id: 'xl-bank-20',
    prompt: 'Blank cells in a numeric test like =IF(A2>0,"yes","no") are treated as:',
    options: ['Errors', 'Zero', 'Text', 'Ignored'],
    correct_index: 1,
    explanation: 'Blank compares as 0, so an empty A2 fails >0 and returns the false branch.',
    difficulty: 'medium',
    topic: 'formulas',
  },
  {
    id: 'xl-bank-21',
    prompt: 'Which error code means a formula name was misspelled?',
    options: ['#REF!', '#DIV/0!', '#NAME?', '#N/A'],
    correct_index: 2,
    explanation: '#NAME? signals an unrecognised function or defined name — usually a typo.',
    difficulty: 'easy',
    topic: 'formulas',
  },
  {
    id: 'xl-bank-22',
    prompt: 'IFERROR(A2/B2,0) is best described as:',
    options: ['Hiding every problem in the sheet', 'Returning a fallback when the main expression errors', 'Forcing B2 to be non-zero', 'A lookup function'],
    correct_index: 1,
    explanation:
      'It substitutes the fallback (0) only when the inner expression raises an error — useful for display cells, dangerous when overused.',
    difficulty: 'medium',
    topic: 'formulas',
  },
  // Tables & charts (Module 3)
  {
    id: 'xl-bank-23',
    prompt: 'Safest way to sort a column inside a data block?',
    options: ['Select the whole column', 'Select one cell inside the column', 'Select the header only', 'Select the entire sheet'],
    correct_index: 1,
    explanation: 'One cell inside the block lets Excel expand to the contiguous range and move whole rows.',
    difficulty: 'easy',
    topic: 'tables-charts',
  },
  {
    id: 'xl-bank-24',
    prompt: 'In a two-level Sort dialog, the top level is:',
    options: ['The tiebreaker', 'The primary key', 'Ignored', 'Applied last'],
    correct_index: 1,
    explanation: 'Levels apply top-down; the first listed level is the primary sort key.',
    difficulty: 'easy',
    topic: 'tables-charts',
  },
  {
    id: 'xl-bank-25',
    prompt: 'A Ctrl+T Table automatically adds:',
    options: ['Charts', 'Filter dropdowns on headers', 'Password protection', 'Macros'],
    correct_index: 1,
    explanation: 'Tables ship with header dropdowns; totals rows and styles are optional toggles.',
    difficulty: 'easy',
    topic: 'tables-charts',
  },
  {
    id: 'xl-bank-26',
    prompt: 'Which chart best shows one student\'s attendance across six months?',
    options: ['Pie', 'Column', 'Line', '3D Surface'],
    correct_index: 2,
    explanation: 'A time series reads as shape — a line chart is the honest choice.',
    difficulty: 'easy',
    topic: 'tables-charts',
  },
  {
    id: 'xl-bank-27',
    prompt: 'A column chart\'s y-axis should normally:',
    options: ['Start at zero', 'Start just below the minimum value', 'Be hidden', 'Use a log scale'],
    correct_index: 0,
    explanation: 'Truncated axes exaggerate bar differences; columns and bars must start at zero.',
    difficulty: 'medium',
    topic: 'tables-charts',
  },
  {
    id: 'xl-bank-28',
    prompt: 'A pie chart is honest only when its slices are:',
    options: ['Any categories at all', 'Positive parts of one whole', 'Sorted alphabetically', 'More than six'],
    correct_index: 1,
    explanation: 'Pie represents parts of a single whole — all positive, few enough to read.',
    difficulty: 'medium',
    topic: 'tables-charts',
  },
  // Cleanup & workflows (Module 4)
  {
    id: 'xl-bank-29',
    prompt: 'TRIM does not remove a pasted gap that looks like a space. The gap is most likely:',
    options: ['A tab character', 'A non-breaking space, CHAR(160)', 'A merged cell', 'A full-width space from a formula'],
    correct_index: 1,
    explanation:
      'Non-breaking spaces (CHAR(160)) survive TRIM; remove them with SUBSTITUTE(x,CHAR(160),"") before TRIM.',
    difficulty: 'hard',
    topic: 'cleanup',
  },
  {
    id: 'xl-bank-30',
    prompt: 'Outstanding SUMIFS (31,000) + Paid-side SUMIFS (45,000) = 76,000, but SUM total = 84,000. Most likely cause?',
    options: ['SUMIFS is broken', 'Some Paid cells are neither exactly Y nor N', 'A chart is filtering rows', 'The table is sorted'],
    correct_index: 1,
    explanation:
      'Rows whose Paid cell has trailing spaces, wrong case or blanks match neither criterion — the arithmetic gap is the audit signal; clean the column and re-validate.',
    difficulty: 'hard',
    topic: 'cleanup',
  },
];

export function getExcelStudentsCourse(): Course {
  return {
    id: 'crs-excel-students',
    slug: 'excel-for-students',
    title: 'Excel for Students',
    subtitle: 'Three hours from pasted data to a defensible tracker — formulas, charts and the clean-up pass that fixes other people\'s exports',
    description: `Every internship report, placement spreadsheet and lab record eventually lands in Excel — and almost nobody was actually taught it. This is the three-hour version: the grid and the data types that silently break totals, the formulas that cover most real work, tables and charts that answer questions honestly, and the five-step clean-up pass for any CSV you did not create.

It ends with a capstone you can defend in an interview: a two-sheet attendance-and-fees tracker with live SUMIFS, an IF status column inside a real Excel Table, and one honest chart. The certificate is issued for that file, not for notes about it.

**Who this is for:** any student, any branch, who has ever pasted data into Excel, squinted at a total that was slightly wrong, or been handed a "report template" with no idea which formulas to trust.

**What you need:** Excel, LibreOffice Calc or Google Sheets (the formulas and shortcuts are identical). No prior spreadsheet knowledge.`,
    category: 'Career',
    level: 'beginner',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    thumbnail_alt: 'Excel for Students course cover',
    tags: ['excel', 'spreadsheet', 'productivity', 'placement', 'career', 'micro-course', 'data'],
    outcomes: [
      'Spot and fix numbers stored as text before they corrupt a total',
      'Write formulas with correct relative and absolute references',
      'Use SUM/COUNT/AVERAGE and audit them with COUNT vs COUNTA',
      'Build IF conditionals and decode #DIV/0!, #VALUE!, #REF! and #NAME?',
      'Turn a raw range into a Ctrl+T Table with safe sorting and filtering',
      'Build honest charts — and recognise a misleading one',
      'Run the five-step clean-up pass on any pasted or CSV data',
      'Ship a two-sheet SUMIFS tracker you can defend line by line',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-10-15T09:00:00.000Z',
    updated_at: '2026-10-15T09:00:00.000Z',
    instructor_id: null,
    about_course: `This course is built around one idea: Excel is not taught anywhere properly, and everybody is assumed to already know it. Four modules, eight lessons, three hours — each lesson the same nine steps (objective, hook, concept, worked example, practice task, common mistakes, interview angle, quiz, summary), every worked example a real spreadsheet problem rather than a synthetic one.

Module 1 fixes the foundation most people never got: what Excel actually stores in a cell, and why a total can be wrong while looking right. Module 2 is the formula toolkit — references, the four aggregates, IF logic and error decoding. Module 3 covers tables, sorting safely and charts that do not lie. Module 4 is the cleanup pass for other people's data, ending in the capstone tracker.

The interview angle runs through every lesson: "why is my SUM wrong", "what is wrong with this chart", "relative vs absolute" — these are the Excel questions placement tests actually ask, and by the end you will have answered all of them on your own file.`,
    prerequisites: [
      'Excel, LibreOffice Calc or Google Sheets installed (any version from the last eight years)',
      'No prior spreadsheet formulas required',
    ],
    audience: [
      'First- and second-year students who were never taught Excel properly',
      'Anyone who has pasted data and distrusted the total',
      'Internship and placement prep — Excel tests are common in aptitude rounds',
      'Any branch: lab records, fee sheets and project reports all land in Excel',
    ],
    audio_language: 'English',
    caption_language: 'English',
    // Bucket E micro-course, all branches, foundation tier — the second
    // fastest first-certificate on the platform after the resume course.
    branch: 'career',
    branch_label: 'All branches · Career',
    bucket: 'E',
    certificate_tier: 'foundation',
    estimated_hours: 3,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    // Semester Exam Mode payload — the one-night revision sheet.
    exam_prep: {
      target: 'Placement aptitude / computer proficiency — Excel, all branches',
      units: [
        {
          title: 'Cells, types & references',
          summary:
            'A1 notation; ranges first:last; numbers vs text vs dates (dates are serial numbers). Apostrophe forces text; left-alignment is the tell. $ locks: $C$1 fixed, C$1 row, $C1 column; F4 cycles.',
          questions: [
            'Why does a number typed with a leading apostrophe never sum?',
            'What is the difference between C$1 and $C1 when copied down?',
            'How are dates stored underneath the display format?',
          ],
          pyqs: [],
        },
        {
          title: 'Aggregates & auditing',
          summary:
            'SUM/AVERAGE/COUNT use numeric cells only; COUNTA counts anything non-empty. COUNT < COUNTA = text hiding in a numeric column. AVERAGE silently divides by the numeric count — audit before trusting.',
          questions: [
            'COUNT is 8, COUNTA is 10 — what is wrong and how do you fix it?',
            'Why can AVERAGE return a plausible-looking wrong number?',
            'Which function counts cells containing text?',
          ],
          pyqs: [],
        },
        {
          title: 'IF logic & errors',
          summary:
            'IF(test, true, false); test tiers highest-first so a 92 is not caught by >=40. IFS replaces deep nesting. Errors: #DIV/0! zero divisor, #VALUE! text-as-number, #REF! deleted cells, #NAME? typo, #N/A lookup miss, circular = self-dependent.',
          questions: [
            'Why must the highest tier be tested first in nested IFs?',
            'What does #REF! tell you that #NAME? does not?',
            'Blank cells compare as what in a numeric test?',
          ],
          pyqs: [],
        },
        {
          title: 'Tables, sort & filter',
          summary:
            'Ctrl+T: auto-expansion, filter dropdowns, optional totals. Sort moves rows; filter hides rows. One cell inside the block = safe sort; one highlighted column = scrambled data. Multi-key: Add Level, top level is primary.',
          questions: [
            'Why does sorting a single selected column corrupt the dataset?',
            'What does the Totals Row show when a filter is applied?',
            'What is the safe first click before any sort?',
          ],
          pyqs: [],
        },
        {
          title: 'Honest charts',
          summary:
            'Column/bar = categories; line = time; pie = few positive parts of one whole. Columns start at zero — truncated axes are the classic lie. Titles state the finding; label both axes; data labels only when exact values matter.',
          questions: [
            'Why must a column chart\'s y-axis start at zero?',
            'Which chart type suits a six-month attendance trend?',
            'What is wrong with a 9-slice pie of negative and positive values?',
          ],
          pyqs: [],
        },
        {
          title: 'Cleanup & capstone',
          summary:
            'Five-step pass: TRIM/CLEAN (+SUBSTITUTE for CHAR(160)) → Text to Columns → Flash Fill (Ctrl+E) → Remove Duplicates (read the report) → Data Validation (preventive only). Capstone: Records table + Summary with SUMIFS structured refs, IF status column, one honest chart.',
          questions: [
            'Why does TRIM miss a pasted space that looks normal?',
            'Why are structured references (Table[Column]) safer than B2:B500?',
            'Data Validation on existing bad rows — does it fix them?',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Your SUM is slightly under the hand-added total. Diagnose it in three steps.',
        'Explain relative vs absolute references and give a formula that needs the $ lock.',
        'What is wrong with a column chart whose y-axis runs 380–420?',
        'Walk through your five-step clean-up pass on a pasted CSV.',
        'Why does COUNTA exceed COUNT in a column that "looks like all numbers"?',
        'Build a three-tier grading formula and defend the order of the tests.',
      ],
      previous_year_questions: [
        {
          year: '2024',
          question:
            'A colleague\'s dashboard shows marks pasted from a portal. The average is visibly too high. What do you check first, and which two functions prove the diagnosis?',
          solution:
            'Check alignment and run COUNT vs COUNTA on the column — COUNTA > COUNT proves some cells are text. AVERAGE silently skips them (dividing by fewer cells), which shifts the mean. Fix with Text to Columns or VALUE(), then re-average.',
        },
        {
          year: '2024',
          question:
            '=VLOOKUP is not needed here — explain why =IF(A2>=60,"Pass","Fail") returns Fail for a visible 75, and how to repair the sheet.',
          solution:
            'The cell holds text (e.g. "75" with a leading apostrophe), so >=60 is false. Prove with =ISNUMBER(A2) → FALSE. Repair via Data → Text to Columns → Finish (converts text-numbers in place), or a =VALUE(A2) helper pasted as values.',
        },
        {
          year: '2025',
          question:
            'You must show monthly expense trends to a supervisor in one chart. Which type, and what two labelling rules make it honest?',
          solution:
            'A line chart — months are a time sequence, and trends read as shape. Label both axes (month, amount) and title the chart with the finding, not the topic. A trend line may zoom the y-range for shape; a column comparison of the same data must start at zero.',
        },
      ],
    },
    // Final exam: 15 drawn from the 30-question bank, mixed difficulty and
    // topic-tagged. Pass 60, distinction 85 on the first attempt, 24h retake.
    exam: {
      question_count: 15,
      duration_minutes: 25,
      passing_percent: 60,
      retake_cooldown_hours: 24,
      distinction_percent: 85,
      bank: examBank,
    },
    // Capstone: the two-sheet tracker. Required for the certificate — the
    // course's claim is that you finish with a working file, not notes.
    project: {
      title: 'Build your attendance & fees tracker',
      brief:
        'Produce one Excel file with two sheets. Records: a Ctrl+T table of at least 12 rows (ID, Name, Class, Month, Attendance %, Fees Paid Y/N, Fees Amount), cleaned with the five-step pass and with Data Validation on Class and Attendance. Summary: total fees (SUM), outstanding via SUMIFS on Paid="N", a per-class AVERAGEIFS, an IF dues-status column inside the table, and one honest column chart (zero-based axis) of average attendance per class. Every formula must use table structured references where the data lives in a table.',
      submission_hint: 'Link to the .xlsx file on a public drive (anyone-with-link can view).',
      required_for_certificate: true,
    },
    modules,
  };
}
