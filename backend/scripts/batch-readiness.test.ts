// ============================================================================
// Batch readiness (TPO) — segments, privacy and company selection.
// ============================================================================

import { buildBatchReadiness, segmentFor } from '../src/lib/batchReadiness';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

const today = '2026-10-26';
check('no activity: not started', segmentFor(null, 0, null, today), 'not_started');
check('active but low: at risk', segmentFor(42, 3, '2026-10-25', today), 'at_risk');
check('inactive for over two weeks: at risk', segmentFor(80, 3, '2026-10-01', today), 'at_risk');
check('high and recent: ready', segmentFor(76, 5, '2026-10-24', today), 'ready');
check('between the bands: in progress', segmentFor(60, 2, '2026-10-24', today), 'in_progress');
check('active without any company score: in progress', segmentFor(null, 2, '2026-10-24', today), 'in_progress');

const db: any = {
  users: [{ id: 'u1', name: 'Asha Rao', email: 'asha@example.com' }, { id: 'u2', name: 'Ravi K' }, { id: 'u9', name: 'Other College' }],
  skills: [{ id: 's1', slug: 'dsa', name: 'DSA', status: 'active' }],
  companies: [
    { id: 'c1', slug: 'acme', name: 'Acme', status: 'published', unlock_count: 1,
      rounds_pipeline: [{ step_number: 1, title: 'OA', round_type: 'OA' }],
      modules: [{ id: 'm1', title: 'OA', round_type: 'OA', module_type: 'dsa_question', is_premium: false }] },
    { id: 'c2', slug: 'beta', name: 'Beta', status: 'published', unlock_count: 9, modules: [] },
    { id: 'c3', slug: 'draft', name: 'Draft', status: 'draft', modules: [] },
  ],
  company_prep_profiles: [
    { user_id: 'u1', company_id: 'c1' }, { user_id: 'u2', company_id: 'c1' }, { user_id: 'u9', company_id: 'c2' },
  ],
  attempts: [{ userId: 'u1', skillId: 's1', status: 'submitted', percentage: 80, submittedAt: '2026-10-24T08:00:00Z' }],
  courses: [],
  unlocks: [],
};
const roster = [
  { user_id: 'u1', roll_no: 'CS-001', branch: 'CSE', batch: '2027' },
  { user_id: 'u2', roll_no: 'CS-002', branch: 'CSE', batch: '2027' },
];
const now = new Date(`${today}T06:30:00Z`);
const anon = buildBatchReadiness(db, roster, { withNames: false }, now);
check('without the PII scope, students are roll numbers', anon.students.map((s) => s.label), ['CS-001', 'CS-002']);
check('never an email', JSON.stringify(anon).includes('@'), false);
check('the batch’s own targets come first', anon.companies[0].slug, 'acme');
check('targets count only this college’s students', anon.companies[0].targeted_by, 2);
check('drafts are never listed', anon.companies.some((c) => c.slug === 'draft'), false);
check('readiness comes from the round’s skill tests', anon.students[0].readiness.c1, 80);
check('no score is null, not 0', anon.students[1].readiness.c1, null);
check('segments', anon.segments, { not_started: 1, at_risk: 0, in_progress: 0, ready: 1 });
const named = buildBatchReadiness(db, roster, { withNames: true }, now);
check('with the PII scope, names', named.students.map((s) => s.label), ['Asha Rao', 'Ravi K']);

console.log(`\nbatch-readiness: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

// --- campus page aggregates ----------------------------------------------------
import { buildCampusAggregate, MIN_STUDENTS } from '../src/lib/campusPage';
{
  const small = buildCampusAggregate(db, roster, now);
  check('below the threshold: no aggregates at all', [small.segments, small.companies], [null, []]);
  check('…but the linked count is shown', small.students_linked, 2);

  const big: any = { ...db, users: [...db.users], company_prep_profiles: [...db.company_prep_profiles], attempts: [...db.attempts] };
  const many = Array.from({ length: MIN_STUDENTS }, (_, i) => ({ user_id: `b${i}`, roll_no: `R${i}`, branch: 'CSE', batch: '2027' }));
  for (const r of many) {
    big.users.push({ id: r.user_id, name: `Student ${r.user_id}` });
    big.company_prep_profiles.push({ user_id: r.user_id, company_id: 'c1' });
  }
  // only four students have an Acme score: below MIN_PER_COMPANY
  for (const r of many.slice(0, 4)) big.attempts.push({ userId: r.user_id, skillId: 's1', status: 'submitted', percentage: 60, submittedAt: '2026-10-24T08:00:00Z' });
  const agg = buildCampusAggregate(big, many, now);
  check('segments are percentages', Object.values(agg.segments!).reduce((a: number, b: any) => a + b, 0), 100);
  check('a company with too few scores is not averaged', agg.companies, []);
  big.attempts.push({ userId: many[4].user_id, skillId: 's1', status: 'submitted', percentage: 80, submittedAt: '2026-10-24T08:00:00Z' });
  const agg2 = buildCampusAggregate(big, many, now);
  check('with enough scores, the company average appears', agg2.companies.map((c) => [c.slug, c.average]), [['acme', 64]]);
  check('never a name or roll number', /Student|R\d/.test(JSON.stringify(agg2)), false);
}
console.log(`\nbatch-readiness+campus: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
