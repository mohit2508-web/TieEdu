/**
 * Phase 3 — MOBILE_APP_UI_PLAN.md §3. Vault reader.
 *
 * Covers the three pieces of the reader that were extracted out of an 836-line
 * component precisely so they could be tested: the reading progress arithmetic,
 * the per-section scroll memory, the client-side bookmark/solved store, and the
 * markdown table labelling that makes the CSS-only stacked table possible.
 */
import * as fs from 'fs';
import * as path from 'path';

import { readingProgress, progressWidth, nextSectionScrollTop, shouldRememberOffset, MIN_MEMORISED_OFFSET } from '../src/lib/readingProgress';
import { emptyReaderState, parseReaderState, serializeReaderState, toggleSolved, readerStateKey } from '../src/lib/readerState';
import { headerLabels, labelAllTables, type HastNode } from '../src/lib/markdownTables';
import { describeItemCount, isRoundLocked } from '../src/lib/moduleLabel';
import type { ContentModule } from '../src/types';

let pass = 0;
let fail = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
  } catch (err: any) {
    fail += 1;
    console.error(`FAIL  ${name}\n      ${err?.message}`);
  }
}
function ok(value: unknown, note: string) {
  if (!value) throw new Error(note);
}
function eq(actual: unknown, expected: unknown, note: string) {
  if (actual !== expected) {
    throw new Error(`${note}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
function near(actual: number, expected: number, note: string) {
  if (Math.abs(actual - expected) > 1e-6) {
    throw new Error(`${note}: expected ~${expected}, got ${actual}`);
  }
}

// ---------------------------------------------------------------- progress --

check('progress is measured against the scrollable range, not the document', () => {
  // The classic bug: dividing by `scrollHeight` reports 100% while the last
  // screenful is still below the fold.
  near(readingProgress(500, 2000, 1000), 0.5, 'halfway through a 1000px range');
  near(readingProgress(1000, 2000, 1000), 1, 'range exhausted is 1, not 0.5');
});

check('progress is clamped at both ends', () => {
  eq(readingProgress(-40, 2000, 1000), 0, 'negative offset (iOS overscroll)');
  eq(readingProgress(5000, 2000, 1000), 1, 'past the end');
});

check('a document with nothing to scroll reads 0, not NaN', () => {
  // `NaN` in a `width` renders as the literal text "NaN" — a blank stripe.
  eq(readingProgress(0, 600, 600), 0, 'shorter than the viewport');
  eq(readingProgress(0, 600, 700), 0, 'viewport taller than the document');
  eq(readingProgress(120, 600, 600), 0, 'equal heights have no range');
});

check('progress width is quantised to whole percent', () => {
  eq(progressWidth(0.4367), '44%', 'sub-pixel churn avoided');
  eq(progressWidth(0), '0%', 'zero');
  eq(progressWidth(1), '100%', 'full');
});

check('width never renders a non-numeric value', () => {
  for (const f of [0, 0.5, 1]) ok(/^\d+%$/.test(progressWidth(f)), `width for ${f} must be a percent`);
});

// ------------------------------------------------------------- scroll memory --

check('a section is only sent to the top the first time', () => {
  eq(nextSectionScrollTop({}, 'overview'), 0, 'first visit starts at the top');
  eq(nextSectionScrollTop({ cheatsheets: 2400 }, 'cheatsheets'), 2400, 'returning resumes in place');
});

check('an offset of zero is not remembered as a position', () => {
  eq(nextSectionScrollTop({ cheatsheets: 0 }, 'cheatsheets'), 0, 'zero falls through to the top');
});

check('a nudge is not remembered as a reading position', () => {
  // 12px apart means the student scrolled a little, not that they want to resume
  // 12px down a section.
  eq(shouldRememberOffset(0), false, 'at the top');
  eq(shouldRememberOffset(MIN_MEMORISED_OFFSET - 1), false, 'a nudge');
  eq(shouldRememberOffset(MIN_MEMORISED_OFFSET), true, 'at the threshold');
  eq(shouldRememberOffset(3000), true, 'deep into a section');
});

check('scroll memory is keyed per section, not shared', () => {
  const remembered = { overview: 500, never_skip: 1800 };
  eq(nextSectionScrollTop(remembered, 'overview'), 500, 'overview');
  eq(nextSectionScrollTop(remembered, 'never_skip'), 1800, 'never_skip');
  eq(nextSectionScrollTop(remembered, 'hr_round'), 0, 'unvisited section');
});

check('a remembered offset is dropped when the guide changes', () => {
  /*
   * The structural half of the fix. `nextSectionScrollTop` is correct given a
   * map that belongs to one guide, so the leak was upstream of it: the map was
   * keyed by section id and never cleared, and section ids repeat across
   * modules. Scrolling deep into module A's `overview` and opening module B's
   * much shorter `overview` scrolled past the end of B.
   *
   * The reducer below is the component's own clear-on-module-change, written
   * out as a function so the invariant is testable without a DOM.
   */
  const offsets: Record<string, number> = { overview: 4200, never_skip: 900 };

  const onModuleChange = (
    current: Record<string, number>,
    prevModule: string | null,
    nextModule: string
  ) => (prevModule !== null && prevModule !== nextModule ? {} : current);

  // Within one guide, memory survives.
  eq(Object.keys(onModuleChange(offsets, 'm1', 'm1')).length, 2, 'same guide keeps its offsets');
  // Across guides, the ids are reused and mean different text, so they go.
  eq(Object.keys(onModuleChange(offsets, 'm1', 'm2')).length, 0, 'a new guide starts at the top');
  eq(nextSectionScrollTop(onModuleChange(offsets, 'm1', 'm2'), 'overview'), 0, 'and the reused id reads as unvisited');
  // The very first guide must not clear: there is nothing to clear yet, and the
  // initial section should still restore if the reader is re-mounted deep in it.
  eq(Object.keys(onModuleChange(offsets, null, 'm1')).length, 2, 'the first guide is left alone');
});

check('a round states its size, in the noun the round uses', () => {
  const base = { id: 'x', company_id: 'c', sort_order: 0, is_premium: false } as unknown as ContentModule;
  eq(
    describeItemCount({ ...base, module_type: 'technical_question', items: [1, 2, 3] as never }),
    '3 questions',
    'a question round counts questions'
  );
  eq(
    describeItemCount({ ...base, module_type: 'hr_question', items: [1] as never }),
    '1 question',
    'and singularises'
  );
  eq(
    describeItemCount({ ...base, module_type: 'preparation_guide', items: [1, 2, 3, 4, 5, 6, 7] as never }),
    '7 items',
    'a prep guide counts items - calling them questions would read as a bug'
  );
  eq(
    describeItemCount({ ...base, module_type: 'system_design', items: [1, 2] as never }),
    '2 questions',
    'system design is question-shaped despite not ending in _question'
  );
});

check('an uncounted round is silent rather than claiming to be empty', () => {
  /*
   * A locked round is commonly counted server-side only *after* the unlock, so
   * a missing `items` array usually means "not told", not "empty". Printing
   * "0 items" would tell a student the round they are about to buy is worthless.
   */
  const base = {
    id: 'x', company_id: 'c', sort_order: 0, is_premium: true, module_type: 'technical_question',
  } as unknown as ContentModule;
  eq(describeItemCount({ ...base, items: [] as never }), null, 'empty array');
  eq(describeItemCount(base), null, 'items absent entirely');
});

check('a locked round cannot be navigated into', () => {
  /*
   * The row said "Locked" and carried a padlock, but its onClick still ran
   * `onSelectModule`, so tapping it walked the student into the paywall for a
   * round they had not bought. The tap contradicted the label.
   */
  const premium = { id: 'p', is_premium: true } as unknown as ContentModule;
  const free = { id: 'f', is_premium: false } as unknown as ContentModule;
  eq(isRoundLocked(premium, false), true, 'premium, student has not unlocked');
  eq(isRoundLocked(premium, true), false, 'premium, student has unlocked');
  eq(isRoundLocked(free, false), false, 'a free round is never locked, and stays tappable');
  eq(isRoundLocked(free, true), false, 'a free round is never locked');
});

// ------------------------------------------------------------- reader state --

check('reader state survives a round trip', () => {
  const state = { bookmark: 'interview_questions', solved: [0, 2, 5] };
  eq(parseReaderState(serializeReaderState(state)).bookmark, 'interview_questions', 'bookmark');
  eq(parseReaderState(serializeReaderState(state)).solved.length, 3, 'solved count');
});

check('a corrupt or hostile entry cannot break the reader', () => {
  eq(parseReaderState(null).bookmark, null, 'absent');
  eq(parseReaderState('not json').solved.length, 0, 'not JSON');
  eq(parseReaderState('"a string"').bookmark, null, 'wrong type entirely');
  eq(parseReaderState('[]').bookmark, null, 'array');
  eq(parseReaderState('{"solved":"nope"}').solved.length, 0, 'solved not an array');
  eq(parseReaderState('{"solved":[1,"x",null,3]}').solved.join(','), '1,3', 'non-numbers filtered out');
});

check('marking solved toggles and keeps the list ordered', () => {
  let s = emptyReaderState;
  s = toggleSolved(s, 3);
  eq(s.solved.join(','), '3', 'first mark');
  s = toggleSolved(s, 1);
  eq(s.solved.join(','), '1,3', 'stays sorted, so the stored value is stable');
  s = toggleSolved(s, 3);
  eq(s.solved.join(','), '1', 'second mark unmarks');
});

check('bookmark and solved are independent', () => {
  const marked = toggleSolved({ bookmark: 'overview', solved: [] }, 0);
  eq(marked.bookmark, 'overview', 'marking a question must not clear the bookmark');
});

check('reader state is keyed by company as well as module', () => {
  // Module ids are only unique within a company. Keying on the id alone lets a
  // bookmark in one vault land on a same-numbered section of another.
  ok(
    readerStateKey('google', 3) !== readerStateKey('amazon', 3),
    'the company must be part of the key'
  );
});

// ------------------------------------------------------------ markdown tables --

const mdTable: HastNode = {
  type: 'root',
  children: [
    {
      type: 'element',
      tagName: 'table',
      children: [
        {
          type: 'element',
          tagName: 'thead',
          children: [
            {
              type: 'element',
              tagName: 'tr',
              children: [
                { type: 'element', tagName: 'th', children: [{ type: 'text', value: 'Round' }] },
                { type: 'element', tagName: 'th', children: [{ type: 'text', value: 'Rounds' }] },
              ],
            },
          ],
        },
        {
          type: 'element',
          tagName: 'tbody',
          children: [
            {
              type: 'element',
              tagName: 'tr',
              children: [
                { type: 'element', tagName: 'td', children: [{ type: 'text', value: 'OA' }] },
                { type: 'element', tagName: 'td', children: [{ type: 'text', value: '2' }] },
              ],
            },
          ],
        },
      ],
    },
  ],
};

check('every cell is tagged with its column header', () => {
  const labels = headerLabels(mdTable.children![0]);
  eq(labels.join(','), 'Round,Rounds', 'headers read from the first all-th row');
  labelAllTables(mdTable);
  const cells = mdTable.children![0].children![1].children![0].children!;
  eq((cells[0].properties as any)['data-label'], 'Round', 'first column');
  eq((cells[1].properties as any)['data-label'], 'Rounds', 'second column');
});

check('a headerless table gets no labels rather than wrong ones', () => {
  // Admins will eventually paste a table with no header row. Inventing labels
  // from the first data row would attach "OA" as a column name.
  const headerless: HastNode = {
    type: 'element',
    tagName: 'table',
    children: [
      {
        type: 'element',
        tagName: 'tbody',
        children: [
          {
            type: 'element',
            tagName: 'tr',
            children: [
              { type: 'element', tagName: 'td', children: [] },
              { type: 'element', tagName: 'td', children: [] },
            ],
          },
        ],
      },
    ],
  };
  eq(headerLabels(headerless).length, 0, 'no header, no labels');
  labelAllTables(headerless);
  const cell = headerless.children![0].children![0].children![0];
  eq((cell.properties as any)?.['data-label'], undefined, 'and none written');
});

check('a short header row labels only the columns it covers', () => {
  const ragged: HastNode = {
    type: 'element',
    tagName: 'table',
    children: [
      {
        type: 'element',
        tagName: 'tbody',
        children: [
          {
            type: 'element',
            tagName: 'tr',
            children: [
              { type: 'element', tagName: 'th', children: [{ type: 'text', value: 'Only' }] },
            ],
          },
          {
            type: 'element',
            tagName: 'tr',
            children: [
              { type: 'element', tagName: 'td', children: [] },
              { type: 'element', tagName: 'td', children: [] },
            ],
          },
        ],
      },
    ],
  };
  labelAllTables(ragged);
  const cells = ragged.children![0].children![1].children!;
  eq((cells[0].properties as any)['data-label'], 'Only', 'covered column');
  eq((cells[1].properties as any)['data-label'], '', 'uncovered column is empty, not wrong');
});

check('nested markup inside a header is flattened to its text', () => {
  const bold: HastNode = {
    type: 'element',
    tagName: 'table',
    children: [
      {
        type: 'element',
        tagName: 'tbody',
        children: [
          {
            type: 'element',
            tagName: 'tr',
            children: [
              {
                type: 'element',
                tagName: 'th',
                children: [
                  { type: 'element', tagName: 'strong', children: [{ type: 'text', value: 'Round' }] },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  eq(headerLabels(bold).join(''), 'Round', 'the <strong> wrapper is not part of the label');
});

// --------------------------------------------------------------- wiring ----

function findRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('could not locate package root from ' + __dirname);
}
const ROOT = findRoot();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

check('the reader no longer offers a horizontal chip carousel', () => {
  // §3.1 names this the thing to fix first: eight sections in a strip, with the
  // last four past the right edge and nothing to indicate it.
  const src = read('src/components/company/CompanyModuleReader.tsx');
  ok(!/overflow-x-auto[^"]*"[^"]*\n?[^"]*navItems/.test(src.replace(/\{[^}]*navItems\.map\(/g, '')), 'no chip rail over navItems');
  ok(
    /ReaderContentsSheet/.test(src),
    'the contents sheet must be what replaced it'
  );
});

check('the reader action bar is one-handed and mobile-only', () => {
  const bar = read('src/components/company/ReaderActionBar.tsx');
  ok(/md:hidden/.test(bar), 'desktop keeps the sidebar navigator, not the bar');
  ok(/Bookmark/.test(bar), 'bookmark action');
  ok(/Mark solved|onMarkSolved/.test(bar), 'mark-solved action');
  ok(/Next section/.test(bar), 'next action');
  ok(/Prev|Previous section/.test(bar), 'prev action');
  // 44px is the platform minimum and the reason this bar exists at all.
  ok(/h-12 w-12|min-h-\[48px\]/.test(bar), 'touch targets must be at least 44px');
  ok(/safe-bottom/.test(bar), 'the home indicator must not sit under the bar');
});

check('the reading progress line is a real progressbar', () => {
  const src = read('src/components/company/CompanyModuleReader.tsx');
  ok(/role="progressbar"/.test(src), 'screen readers need the role');
  ok(/aria-valuenow/.test(src), 'and the current value');
  ok(/progressWidth\(progress\)/.test(src), 'the width must come from the tested helper');
});

check('a locked round is disabled in the list, not merely labelled', () => {
  // The behavioural half of the lock, in the place that has `read()`. A row that
  // says "Locked" but still calls `onSelectModule` sends the student into the
  // paywall for a round they have not bought.
  const sheet = read('src/components/company/ReaderContentsSheet.tsx');
  ok(/disabled=\{locked\}/.test(sheet), 'the locked row must be disabled, not given a no-op handler');
  ok(/isRoundLocked\(/.test(sheet), 'and the lock must come from the tested helper');
});

check('code blocks get a copy control that is not hover-only', () => {  const block = read('src/components/blocks/CodeBlock.tsx');
  ok(!/opacity-0[^"]*group-hover/.test(block), 'no hover-revealed controls');
  ok(/Copy/.test(block), 'copy action present');
  ok(/overflow-x-auto/.test(block), 'horizontal scroll container');
  ok(/sheet-grabber|Sheet/.test(block), 'expand affordance');
  ok(/min-h-\[36px\]/.test(block), 'controls are tappable');
});

if (fail > 0) {
  console.error(`\nvault-reader: ${pass} passed, ${fail} failed`);
  process.exit(1);
}
console.log(`vault-reader: ${pass} passed, ${fail} failed`);
