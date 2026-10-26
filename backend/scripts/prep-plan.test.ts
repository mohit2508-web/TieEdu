// ============================================================================
// Countdown calendar + day-by-day plan (lib/prepPlan).
//
// The plan must be a pure function of today, the test date, the rounds and the
// scores: never-tested rounds first, then weakest; revision the day before;
// drive-day on the day; nothing for a date in the past.
// ============================================================================

import { buildPlan, workOrder, PLAN_HORIZON } from '../src/lib/prepPlan';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

const round = (id: string, score: number | null, extra: any = {}) => ({
  id, title: `Round ${id}`, moduleIds: [`m-${id}`], testHref: `/skill-test/${id}`, score, weakTopics: [] as string[], ...extra,
});

// --- work order --------------------------------------------------------------
check('never-tested rounds first, then weakest score first',
  workOrder([round('a', 80), round('b', null), round('c', 40), round('d', null)]).map((r) => r.id),
  ['b', 'd', 'c', 'a']);

// --- plan shape ---------------------------------------------------------------
{
  const rounds = [round('oa', 70), round('tech', null, { weakTopics: ['Graphs'] })];
  const plan = buildPlan('acme', 'Acme', rounds, '2026-10-26', '2026-10-31'); // 5 days out
  check('one entry per day from today to the test day', plan.map((d) => d.date), ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']);
  check('days_left counts down to 0', plan.map((d) => d.days_left), [5, 4, 3, 2, 1, 0]);
  check('an untested round starts with its baseline test, then its reading',
    plan.slice(0, 2).map((d) => d.tasks[0].kind + ':' + d.tasks[0].href),
    ['test:/skill-test/tech', 'train:/company/acme?m=m-tech']);
  check('then the weakest tested round, read before test',
    plan.slice(2, 4).map((d) => d.tasks[0].kind), ['train', 'test']);
  check('every working day also carries the daily challenge', plan.slice(0, 4).every((d) => d.tasks.some((t) => t.kind === 'daily')), true);
  check('the day before is revision of the weak topics', plan[4].tasks[0].title.includes('Graphs'), true);
  check('the test day is drive-day mode', plan[5].tasks.map((t) => t.kind), ['drive']);
  check('drive-day link names the company', plan[5].tasks[0].href, '/drive-day?company=acme');
}

// --- edges -------------------------------------------------------------------------
check('a past date has no plan', buildPlan('acme', 'Acme', [round('a', 50)], '2026-10-26', '2026-10-20'), []);
check('test today: just drive day', buildPlan('acme', 'Acme', [], '2026-10-26', '2026-10-26').map((d) => d.tasks[0].kind), ['drive']);
{
  const plan = buildPlan('acme', 'Acme', [], '2026-10-26', '2026-10-29');
  check('no rounds recorded: the company page is the plan', plan[0].tasks[0].href, '/company/acme');
}
{
  const plan = buildPlan('acme', 'Acme', [round('a', 10)], '2026-10-26', '2027-03-01');
  check('far-off dates are written out only to the horizon', plan.length, PLAN_HORIZON + 1);
}

console.log(`\nprep-plan: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
