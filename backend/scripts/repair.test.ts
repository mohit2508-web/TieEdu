/**
 * Backfill correctness for `scripts/repair-pack-content.ts`.
 *
 * The live database is already clean, so the repair is a genuine no-op there.
 * These tests therefore drive the script against a scratch db.json containing
 * real HTML, both in-process (for the pure functions) and as a subprocess (to
 * prove the CLI refuses to write without --apply and writes nothing on a dry
 * run, which is the property that actually protects the data).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import {
  planRepairs, applyRepairs, repairSection, fieldDiff, DB_FILE,
} from './repair-pack-content';
import { containsHtmlTag, resolveRichTextValues } from '../src/lib/richText';

let pass = 0;
let fail = 0;

function check(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    pass++;
  } else {
    fail++;
    console.log(
      `FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`
    );
  }
}

const SCRIPT = path.resolve(__dirname, 'repair-pack-content.ts');
// Run the CLI through node with ts-node registered rather than shelling out to
// ts-node.cmd: a .cmd shim cannot be spawned with execFileSync on Windows
// (EINVAL), which would make these CLI tests silently untestable on dev machines.
const TS_NODE_REGISTER = path.resolve(__dirname, '../node_modules/ts-node/register');

const DIRTY_DB = {
  companies: [
    {
      id: 'comp-cap',
      name: 'Capgemini',
      modules: [
        {
          id: 'mod-ctc',
          title: 'CTC Package',
          section_data: {
            overview: {
              companyInfo: '<p>Capgemini <b>Exceller</b>.</p>',
              eligibility: '<ul><li>60% and above</li><li>No backlogs</li></ul>',
              salaryBreakdown: 'Tier 1<br><br>Base 12L<br>Bonus 2L',
              reviews: [{ name: 'A', role: 'SDE', rating: 5, text: '<p>Good.</p>' }],
            },
            core_subjects: [
              {
                subject: 'DBMS',
                topics: [
                  { title: 'NF', content: '<h4>Why</h4><p>Redundancy.</p>', pyqs: [] },
                ],
              },
            ],
            interview_questions: [
              {
                category: 'Coding',
                title: 'Reverse',
                question: 'In place?',
                solution: '<p>Three pointers.</p>',
                code: 'ListNode* rev(ListNode* h) {\n  return NULL;\n}',
                language: 'cpp',
              },
            ],
            cheatsheets: [
              {
                title: 'Ports',
                // `.summary` is markdown and is repaired; `.content` alongside it
                // is preformatted and must come through byte-for-byte.
                summary: '<b>Common</b> ports',
                content: 'Port 22   SSH\nPort 80   HTTP',
              },
            ],
            never_skip_topics: [{ topic: 'B-Tree', priority: 'High', notes: '<p>Every year.</p>' }],
            last_minute_revision: [{ title: 'OS', points: ['Paging'] }],
            hr_round: [{ question: 'Why?', answer: '<p>Because <b>growth</b>.</p>', tips: ['Be specific'] }],
          },
        },
        // A clean module: must never be reported.
        { id: 'mod-clean', title: 'Clean', section_data: { overview: { companyInfo: 'Already **markdown**.' } } },
        // A module with no pack at all.
        { id: 'mod-empty', title: 'Empty', section_data: null },
      ],
    },
  ],
};

// --- in-process planning ------------------------------------------------------
const plan = planRepairs(DIRTY_DB);
check('exactly one module needs repair', plan.length, 1);
check('the right module is selected', plan[0]?.moduleId, 'mod-ctc');
check('clean modules are left alone', plan.some((r) => r.moduleId === 'mod-clean'), false);
check('modules with no pack are left alone', plan.some((r) => r.moduleId === 'mod-empty'), false);
check('br occurrences are counted', plan[0]?.brRemoved, 3);
check('salaryBreakdown is in the plan', plan[0]?.changedPaths.includes('overview.salaryBreakdown'), true);
check('eligibility is in the plan', plan[0]?.changedPaths.includes('overview.eligibility'), true);
check('nested topic content is in the plan', plan[0]?.changedPaths.includes('core_subjects.[].topics.[].content'), true);
// `.summary` is a markdown field and is fair game; `.content` is preformatted and
// is not even in RICH_TEXT_PATHS, so it can never appear.
check('cheatsheet summary is a rich field and may be repaired', plan[0]?.changedPaths.includes('cheatsheets.[].summary'), true);
check('preformatted cheatsheet content is never in the plan', plan[0]?.changedPaths.includes('cheatsheets.[].content' as any), false);
check('preformatted code is never in the plan', plan[0]?.changedPaths.includes('interview_questions.[].code' as any), false);

// --- what the repair actually produces ----------------------------------------
const after: any = (plan[0] as any).after;
check('eligibility becomes a bullet list', after.overview.eligibility, '- 60% and above\n- No backlogs');
check('companyInfo becomes markdown', after.overview.companyInfo, 'Capgemini **Exceller**.');
check('salaryBreakdown breaks lines', after.overview.salaryBreakdown, 'Tier 1\n\nBase 12L\nBonus 2L');
check('topic heading survives', after.core_subjects[0].topics[0].content, '#### Why\n\nRedundancy.');
check('hr answer is markdown', after.hr_round[0].answer, 'Because **growth**.');
check('plain strings are untouched', after.last_minute_revision[0].points[0], 'Paging');

check('cheatsheet summary is a rich field and is repaired', after.cheatsheets[0].summary, '**Common** ports');
// Preformatted content must survive byte-for-byte.
check(
  'cheatsheet alignment is preserved',
  after.cheatsheets[0].content,
  'Port 22   SSH\nPort 80   HTTP'
);
check(
  'code indentation is preserved',
  after.interview_questions[0].code,
  'ListNode* rev(ListNode* h) {\n  return NULL;\n}'
);

// No known HTML tag may remain anywhere in the repaired pack.
for (const p of [
  'overview.companyInfo', 'overview.eligibility', 'overview.salaryBreakdown',
  'overview.reviews.[].text', 'core_subjects.[].topics.[].content',
  'interview_questions.[].question', 'interview_questions.[].solution',
  'cheatsheets.[].summary', 'never_skip_topics.[].notes',
  'hr_round.[].question', 'hr_round.[].answer',
]) {
  check(`no raw tags left in ${p}`, resolveRichTextValues(after, p).some((v) => containsHtmlTag(v)), false);
}

// --- idempotence ---------------------------------------------------------------
check('a second pass finds nothing', planRepairs(applyRepairs(DIRTY_DB, plan)).length, 0);
check('repairSection returns null for clean data', repairSection(after), null);
check(
  'repairSection does not mutate its input',
  (DIRTY_DB as any).companies[0].modules[0].section_data.overview.eligibility,
  '<ul><li>60% and above</li><li>No backlogs</li></ul>'
);

// --- applyRepairs --------------------------------------------------------------
const applied: any = applyRepairs(DIRTY_DB, plan);
check('the repaired module is replaced', applied.companies[0].modules[0].section_data.overview.eligibility, '- 60% and above\n- No backlogs');
check('a clean module is carried over untouched', applied.companies[0].modules[1].section_data.overview.companyInfo, 'Already **markdown**.');
check('a module with no pack keeps its null', applied.companies[0].modules[2].section_data, null);
check('the input db is not mutated', (DIRTY_DB as any).companies[0].modules[0].section_data.overview.eligibility, '<ul><li>60% and above</li><li>No backlogs</li></ul>');
check('company count is preserved', applied.companies.length, 1);
check('module count is preserved', applied.companies[0].modules.length, 3);

// --- diff helper ---------------------------------------------------------------
check('fieldDiff is null when nothing changed', fieldDiff('same', 'same'), null);
check('fieldDiff shows both sides', (fieldDiff('<p>a</p>', 'a') || '').includes('- <p>a</p>') && (fieldDiff('<p>a</p>', 'a') || '').includes('+ a'), true);
check('fieldDiff truncates', (fieldDiff('x'.repeat(200), 'y') || '').includes('…'), true);

// --- the CLI, against a scratch database --------------------------------------
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'pack-repair-'));
const dbPath = path.join(scratch, 'db.json');
const writeDb = () => fs.writeFileSync(dbPath, JSON.stringify(DIRTY_DB, null, 2), 'utf-8');
const readDb = () => fs.readFileSync(dbPath, 'utf-8');
const run = (args: string[]) =>
  execFileSync(process.execPath, ['-r', TS_NODE_REGISTER, SCRIPT, ...args], {
    env: { ...process.env, DB_FILE: dbPath, TS_NODE_TRANSPILE_ONLY: 'true' },
    encoding: 'utf-8',
  });

try {
  // A dry run must not touch the file at all.
  writeDb();
  const before = readDb();
  const dry = run([]);
  check('dry run reports the module count', dry.includes('modules needing repair: 1'), true);
  check('dry run reports br removals', dry.includes('<br> removed:    3'), true);
  check('dry run says it will not write', dry.includes('Dry run only'), true);
  check('dry run leaves the file byte-identical', readDb(), before);
  check('dry run creates no backup', fs.readdirSync(scratch).filter((f) => f.includes('.bak-')).length, 0);

  // --apply must write, and must back the file up first.
  const appliedOut = run(['--apply']);
  check('apply reports the backup', appliedOut.includes('Backup written:'), true);
  const backups = fs.readdirSync(scratch).filter((f) => f.includes('.bak-'));
  check('exactly one backup was written', backups.length, 1);
  check('the backup holds the original dirty content', fs.readFileSync(path.join(scratch, backups[0]), 'utf-8').includes('<ul><li>60% and above</li>'), true);

  const written = JSON.parse(readDb());
  check('the written pack is markdown', written.companies[0].modules[0].section_data.overview.eligibility, '- 60% and above\n- No backlogs');
  check('the written pack has no raw br', /<br/i.test(readDb()), false);

  // Running --apply again must be a no-op: no new backup, identical file.
  const afterFirst = readDb();
  const second = run(['--apply']);
  check('a second apply reports nothing to do', second.includes('Nothing to repair'), true);
  check('a second apply changes nothing', readDb(), afterFirst);
  check('a second apply writes no new backup', fs.readdirSync(scratch).filter((f) => f.includes('.bak-')).length, 1);

  // The real database must be untouched by any of this.
  check('the repair script targets the real db path by default', DB_FILE.endsWith(path.join('backend', 'data', 'db.json')), true);
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
