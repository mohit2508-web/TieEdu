// Module 2 — Text, Pipes & Filters
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Text, Pipes & Filters',
  summary:
    'cat, less, head, tail, grep, sed, awk, sort, uniq, wc — the Unix text pipeline that beats any GUI for logs.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'lnx-2-1',
      1,
      'Reading and Searching Text',
      'cat/head/tail/less, grep patterns, and chaining tools with pipes.',
      12,
      nineBlocks({
        objectives: [
          'Inspect large files without opening a GUI editor',
          'Use grep with flags and basic regex to find what matters',
          'Compose multi-stage pipelines and redirect stdout/stderr',
        ],
        hook: 'A production log is 2 GB. You need every 500 error from last hour. GUI editors choke; grep and tail do it in seconds. This is the highest-ROI Linux skill for placement and on-call.',
        concept: `**Reading:**
- cat whole file (bad for huge files)
- less file — scroll; G end; /pattern search; q quit
- head -n 20 / tail -n 50; tail -f live-follow
- wc -l lines; file path type detection

**Pipes and redirects:**
- cmd | next — stdout of left becomes stdin of right
- > overwrite file; >> append; 2> errors; 2>&1 merge errors into stdout
- cmd | tee out.txt — print and save

**grep:**
- grep "ERROR" app.log
- grep -i case-insensitive; -n line numbers; -r recursive; -v invert; -E extended regex
- grep -c count matches
- Combined: grep -in 'timeout' /var/log/*.log

**Other filters:** sort, uniq -c (sort first), cut -d: -f1, tr, paste.

**Composition:** grep ERROR app.log | tail -n 20 | cut -d' ' -f1-4`,
        extras: [
          table('grep flag', ['Use'], [
            ['-i', 'Ignore case'],
            ['-n', 'Show line numbers'],
            ['-r', 'Search directories recursively'],
            ['-v', 'Invert: lines that do NOT match'],
            ['-E', 'Extended regex | + ?'],
            ['-c', 'Count matching lines only'],
          ]),
          tip(
            'tail -f for live logs',
            'The default on-call move: follow the file while you reproduce the bug.',
          ),
          warn(
            'cat on a huge file',
            'Can freeze your terminal; use less or head/tail.',
          ),
        ],
        worked: {
          title: 'Find recent 5xx lines in a service log',
          problem: 'Extract the last 30 HTTP 500+ lines with line numbers.',
          steps: [
            { title: 'Step 1 - size check', desc: 'ls -lh /var/log/app.log to see size.' },
            {
              title: 'Step 2 - extract 5xx',
              desc: "grep -nE ' 5[0-9]{2} ' /var/log/app.log | tail -n 30.",
            },
            {
              title: 'Step 3 - optional live',
              desc: "Optional live: grep --line-buffered ' 5[0-9][0-9] ' | tail -f.",
            },
            { title: 'Step 4 - save', desc: 'Save: ... | tee recent-5xx.txt.' },
          ],
          solution: 'Short actionable slice of the log, with numbers for reference.',
        },
        practice: {
          title: 'Pipeline composition',
          prompt: 'Count how many lines contain ERROR vs WARN (two greps + wc -l).',
          hint: "grep -c ERROR file and grep -c WARN file.",
        },
        mistakes: [
          {
            mistake: 'Using cat | grep instead of just grep pattern file',
            fix: 'Unnecessary process; grep takes files directly.',
          },
          {
            mistake: 'Forgetting -r when the path is a directory',
            fix: 'grep needs -r (or -R) to recurse.',
          },
        ],
        exam: {
          question: 'What does 2>&1 do?',
          answer: 'Redirects stderr into the same place stdout currently goes.',
          source: 'Shell redirection question.',
        },
        summary: [
          'less for browsing; tail -f for live; grep for search.',
          'Pipes chain filters; redirects control files and stderr.',
          'Small pipelines beat one giant command you cannot debug.',
        ],
      }),
      [
        [
          'tail -f file:',
          ['Copies the file', 'Prints new lines as they arrive', 'Deletes the file', 'Compresses it'],
          1,
          'Follow mode.',
        ],
        [
          'grep -v pattern prints:',
          ['Only matches', 'Lines that do not match', 'Filenames only', 'Line counts'],
          1,
          'Invert match.',
        ],
        [
          'cmd > out.txt 2>&1 means:',
          ['Errors only to out.txt', 'Both stdout and stderr into out.txt', 'Append stdout', 'Delete out.txt'],
          1,
          'Order matters: stdout then stderr onto it.',
        ],
      ]
    ),
    lesson(
      M2,
      'lnx-2-2',
      2,
      'sed, awk and Sorting Data',
      'Edit streams with sed; columns with awk; transform messy CSV-ish text without Excel.',
      11,
      nineBlocks({
        objectives: [
          'Use sed for in-place substitution and line editing',
          'Use awk for field splitting, printing columns and simple aggregation',
          'Sort, unique and join text for quick reports',
        ],
        hook: 'You have a 50k-line CSV of student emails with a typo domain. sed fixes it in one command. awk can print every user who failed a threshold. These are not ancient curiosities — they are daily ops tools.',
        concept: `**sed:**
- sed 's/old/new/' file — first match per line
- sed 's/old/new/g' — all matches
- sed -i 's/…/…/' file — in-place (GNU); backup with sed -i.bak
- sed -n '10,20p' file — print a range
- sed '5d' — delete line 5

**awk:**
- Fields default split on whitespace: $1 first column, $0 whole line
- awk '{print $1, $3}' file
- awk -F: '{print $1}' /etc/passwd — custom field separator
- awk '/ERROR/ {print $0}' — pattern-action
- awk '{sum+=$2} END {print sum}' — aggregate

**sort / uniq:**
- sort file; sort -n numeric; sort -k2 sort by column 2
- sort file | uniq -c — counts; sort -nr for top offenders
- cut -d, -f1-3 csv — cut fields

**tr** for character translate/delete: tr -d '\\r' (strip CR).`,
        extras: [
          table('Tool', ['Tool', 'Best at', 'Example'], [
            ['sed', 'Global replace / line edit', "sed 's/foo/bar/g' f"],
            ['awk', 'Columns + aggregation', "awk '{print $1,$3}'"],
            ['sort/uniq -c', 'Frequency reports', "sort f | uniq -c | sort -nr"],
            ['cut', 'Stable field slices', 'cut -d: -f1'],
          ]),
          tip(
            'Always test sed without -i first',
            'Pipe to head to preview, then add -i.bak.',
          ),
          warn(
            'sed -i on a live config without a backup',
            'One typo can break a service; use -i.bak or edit via a copy.',
          ),
        ],
        worked: {
          title: 'Count top error types',
          problem: 'From a log, list the top 5 most frequent ERROR substrings.',
          steps: [
            {
              title: 'Step 1 - pipeline',
              desc: "grep ERROR app.log | awk '{print $3}' | sort | uniq -c | sort -nr | head -n 5.",
            },
            {
              title: 'Step 2 - find the right column',
              desc: 'Adjust $N after looking at one raw line with cut/awk to find the right column.',
            },
            {
              title: 'Step 3 - normalize if needed',
              desc: 'Optionally sed to normalize IDs out of the message before counting.',
            },
          ],
          solution: 'Ranked error types for a standup or ticket.',
        },
        practice: {
          title: 'One-line report',
          prompt: "Using only the shell, print user names (field 1) from /etc/passwd sorted alphabetically.",
          hint: "cut -d: -f1 /etc/passwd | sort",
        },
        mistakes: [
          {
            mistake: 'awk field number guessed wrong',
            fix: "Run awk '{print $1,$2,$3,$4,$5}' on one line to see the columns first.",
          },
          {
            mistake: 'uniq without sort',
            fix: 'uniq only collapses adjacent duplicates; always sort first for global counts.',
          },
        ],
        exam: {
          question: 'How do you count frequency of each unique line?',
          answer: 'sort file | uniq -c (optionally | sort -nr).',
          source: 'Classic Unix filter question.',
        },
        summary: [
          'sed edits streams; preview before -i.',
          'awk is field-split + action in one tool.',
          'sort | uniq -c is the frequency report.',
        ],
      }),
      [
        [
          'uniq -c without sort:',
          ['Always correct', 'Only collapses adjacent duplicates', 'Fails', 'Deletes the file'],
          1,
          'Must sort first for global counts.',
        ],
        [
          "sed 's/a/b/g' differs from 's/a/b' by:",
          ['Nothing', 'g replaces all matches on the line', 'g is in-place', 'g is case-sensitive'],
          1,
          'Without g: first match per line only.',
        ],
        [
          'In awk, $0 means:',
          ['First field', 'Whole line', 'Line number', 'Empty'],
          1,
          'All fields concatenated as the record.',
        ],
      ]
    ),
  ],
};
