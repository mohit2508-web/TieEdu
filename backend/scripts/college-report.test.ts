// ============================================================================
// Management / NAAC report (lib/collegeReport): aggregates only, small
// branches folded so no student can be singled out, period filtering, and a
// PDF that renders (including names outside Latin-1).
// ============================================================================

import { buildCollegeReport, MIN_GROUP, parsePeriod, renderCollegeReportPdf } from '../src/lib/collegeReport';
import type { BatchReadiness } from '../src/lib/batchReadiness';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

const NOW = new Date('2026-10-28T06:00:00Z');
const st = (i: number, branch: string, segment: any, average: number | null, batch = '2027') =>
  ({ user_id: `u${i}`, label: `Student Name ${i}`, roll_no: `ROLL${i}`, branch, batch, readiness: {}, average, tests: 0, lessons: 0, last_active: null, segment });
// CSE: 6 students, ECE: 3 (too small alone), ME: 2 (too small alone) → "Other branches" = 5.
const students = [
  ...Array.from({ length: 6 }, (_, i) => st(i, 'CSE', i < 3 ? 'ready' : 'at_risk', i < 3 ? 80 : 40)),
  ...Array.from({ length: 3 }, (_, i) => st(10 + i, 'ECE', 'in_progress', 60)),
  ...Array.from({ length: 2 }, (_, i) => st(20 + i, 'ME', 'not_started', null, '2028')),
];
const batch: BatchReadiness = { generated_at: NOW.toISOString(), companies: [], students, segments: { not_started: 2, at_risk: 3, in_progress: 3, ready: 3 } };
const db: any = {
  companies: [{ slug: 'infosys', name: 'Infosys' }, { slug: 'tcs', name: 'TCS' }],
  attempts: [
    { userId: 'u0', status: 'submitted', submittedAt: '2026-09-01T10:00:00Z' },
    { userId: 'u1', status: 'timed_out', submittedAt: '2026-09-02T10:00:00Z' },
    { userId: 'u1', status: 'in_progress', submittedAt: '2026-09-02T10:00:00Z' },
    { userId: 'u0', status: 'submitted', submittedAt: '2024-01-01T10:00:00Z' },
    { userId: 'outsider', status: 'submitted', submittedAt: '2026-09-01T10:00:00Z' },
  ],
  xp_ledger: [{ user_id: 'u10', reason: 'lesson_complete', created_at: '2026-08-01T10:00:00Z' }, { user_id: 'u10', reason: 'quiz_pass', created_at: '2026-08-01T10:00:00Z' }],
  certificates: [{ user_id: 'u0', status: 'active', issued_at: '2026-07-01T00:00:00Z' }, { user_id: 'u0', status: 'revoked', issued_at: '2026-07-01T00:00:00Z' }],
  skillCertificates: [{ userId: 'u2', status: 'issued', issuedAt: '2026-07-02T00:00:00Z' }],
  user_streaks: [{ user_id: 'u3', days: ['2026-10-01', '2026-10-02', '2020-01-01'] }],
  campus_history: [
    { college_id: 'col1', company_slug: 'infosys', year: 2025, selected: 12 },
    { college_id: 'col1', company_slug: 'tcs', year: 2025, selected: 30 },
    { college_id: 'col1', company_slug: 'infosys', year: 2024, selected: 9 },
    { college_id: 'col2', company_slug: 'tcs', year: 2025, selected: 99 },
  ],
};
const period = parsePeriod('2025-11-01', '2026-10-28', NOW);
const r = buildCollegeReport(db, batch, { collegeId: 'col1', collegeName: 'GLA University', ...period, batch: null }, NOW);

check('student total', r.students, 11);
check('segments', r.segments, { not_started: 2, at_risk: 3, in_progress: 3, ready: 3 });
check('branches: CSE shown, ECE + ME folded into Other', r.branches.map((b) => [b.branch, b.students]), [['CSE', 6], ['Other branches', 5]]);
check('average readiness per branch', r.branches[0].avg_readiness, 60);
check('practice counts only this college’s students in the period', r.practice, { tests: 2, lessons: 1, course_certificates: 1, skill_certificates: 1, practice_days: 2 });
check('active in period', r.active_in_period, 4);
check('results by year, this college only', r.results.map((x) => [x.year, x.companies, x.selected]), [[2025, 2, 42], [2024, 1, 9]]);
check('company names, most selected first', r.results[0].detail.map((d) => d.company), ['TCS', 'Infosys']);
const json = JSON.stringify(r);
check('no names, roll numbers or user ids anywhere', /Student Name|ROLL\d|"u\d+"/.test(json), false);

const only2028 = buildCollegeReport(db, batch, { collegeId: 'col1', collegeName: 'GLA', ...period, batch: '2028' }, NOW);
check('batch filter', only2028.students, 2);
check(`a batch under ${MIN_GROUP} shows no branch rows`, only2028.branches.length, 0);

check('default period is the last year', parsePeriod(undefined, undefined, NOW), { from: '2025-10-29', to: '2026-10-28' });
let threw = false;
try { parsePeriod('2026-10-01', '2026-01-01', NOW); } catch { threw = true; }
check('start after end refused', threw, true);

(async () => {
  const bytes = await renderCollegeReportPdf({ ...r, college: 'Śrī GLA University – Mathura' });
  check('a PDF', Buffer.from(bytes.slice(0, 5)).toString(), '%PDF-');
  check('non-trivial size', bytes.length > 2000, true);
  const empty = await renderCollegeReportPdf({ ...only2028, results: [], branches: [] });
  check('renders with empty sections', Buffer.from(empty.slice(0, 5)).toString(), '%PDF-');
  // Many companies force a second page; the renderer must paginate, not overflow.
  const long = { ...r, results: [{ year: 2025, companies: 80, selected: 400, detail: Array.from({ length: 80 }, (_, i) => ({ company: `Company ${i}`, selected: i })) }] };
  const { PDFDocument } = await import('pdf-lib');
  check('long reports paginate', (await PDFDocument.load(await renderCollegeReportPdf(long))).getPageCount() > 1, true);

  console.log(`college-report: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
})();
