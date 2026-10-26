// ============================================================================
// Placement Passport — the public page publishes results and nothing else.
// ============================================================================

import { buildPassport, handleError, passportOf, suggestHandle } from '../src/lib/passport';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

const db: any = {
  users: [
    { id: 'u1', name: 'Asha Rao', email: 'asha@example.com', grad_year: 2027, college: 'Some College' },
    { id: 'u2', name: 'Ravi K', email: 'ravi@example.com', passport: { public: true, handle: 'ravi' } },
  ],
  skills: [{ id: 's1', slug: 'dsa', name: 'DSA', status: 'active' }, { id: 's2', slug: 'sql', name: 'SQL', status: 'active' }],
  attempts: [
    { userId: 'u1', skillId: 's1', status: 'submitted', percentage: 55, skillLevel: 'Intermediate', studentEmail: 'asha@example.com' },
    { userId: 'u1', skillId: 's1', status: 'submitted', percentage: 80, skillLevel: 'Advanced' },
    { userId: 'u1', skillId: 's2', status: 'in_progress', percentage: 0 },
  ],
  skillCertificates: [
    { userId: 'u1', skillId: 's1', certificateId: 'SC1', certificateNumber: 'TE-SK-1', score: 80, status: 'active', studentEmail: 'asha@example.com' },
  ],
  certificates: [
    { user_id: 'u1', course_title: 'Python', serial: 'TIE-1', issued_at: '2026-10-01T00:00:00Z', status: 'active', recipient_email: 'asha@example.com' },
    { user_id: 'u1', course_title: 'Old', serial: 'TIE-0', issued_at: '2026-01-01T00:00:00Z', status: 'revoked' },
  ],
  companies: [{ id: 'c1', slug: 'acme', name: 'Acme', status: 'published', modules: [] }],
  company_prep_profiles: [{ user_id: 'u1', company_id: 'c1', test_date: '', target_role: null, daily_last: '', daily_streak: 0, onboarding_done: [], updated_at: '' }],
  courses: [],
  xp_ledger: [],
};

// --- settings ------------------------------------------------------------------
check('off by default', passportOf(db.users[0]), { public: false, handle: null });
check('a valid handle', handleError(db, 'u1', 'asha-rao'), null);
check('too short', typeof handleError(db, 'u1', 'ab'), 'string');
check('no leading hyphen', typeof handleError(db, 'u1', '-asha'), 'string');
check('no uppercase or spaces', typeof handleError(db, 'u1', 'Asha Rao'), 'string');
check('reserved words refused', handleError(db, 'u1', 'admin'), 'That handle is reserved. Try another.');
check('someone else’s handle refused', handleError(db, 'u1', 'ravi'), 'That handle is taken. Try another.');
check('your own handle is fine', handleError(db, 'u2', 'ravi'), null);
check('suggestion from the first name', suggestHandle(db, db.users[0]), 'asha-rao');
check('suggestion avoids a taken handle', suggestHandle(db, { id: 'u9', name: 'Ravi' }), 'ravi-2');

// --- the public view -------------------------------------------------------------
const view = buildPassport(db, { ...db.users[0], passport: { public: true, handle: 'asha-rao' } }, new Date('2026-10-26T06:30:00Z'));
const json = JSON.stringify(view);
check('never publishes an email', /@/.test(json), false);
check('never publishes the college', json.includes('Some College'), false);
check('best attempt per skill, finished attempts only', view.skills.map((s) => [s.name, s.score]), [['DSA', 80]]);
check('the skill links its certificate for verification', view.skills[0].certificate, { number: 'TE-SK-1', verify_url: '/skill-test/certificates/SC1' });
check('only active course certificates', view.certificates.map((c) => c.serial), ['TIE-1']);
check('each certificate links to verification', view.certificates[0].verify_url, '/verify/TIE-1');
check('year label', view.year, 'Final year');
check('a company with no score is left out, not shown at 0%', view.companies, []);

console.log(`\npassport: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

// --- parent view ---------------------------------------------------------------
import { buildParentView, newParentToken } from '../src/lib/parentView';
{
  const t1 = newParentToken();
  const t2 = newParentToken();
  check('tokens are long and unguessable', t1.length >= 24 && t1 !== t2, true);

  const pdb: any = JSON.parse(JSON.stringify(db));
  pdb.attempts[0].submittedAt = '2026-10-18T08:00:00Z'; // previous week (13th–19th)
  pdb.attempts[1].submittedAt = '2026-10-25T08:00:00Z';
  pdb.attempts[0].answers = [{ q: 'secret answer' }];
  pdb.xp_ledger = [{ user_id: 'u1', reason: 'lesson_complete', xp: 10, created_at: '2026-10-24T08:00:00Z' }];
  const v = buildParentView(pdb, pdb.users[0], new Date('2026-10-26T06:30:00Z'));
  const json = JSON.stringify(v);
  check('parent view: first name only', v.first_name, 'Asha');
  check('parent view: four weeks, oldest first', v.weeks.length, 4);
  check('parent view: this week counts the tests', v.weeks[3].tests, 1);
  check('parent view: last week too', v.weeks[2].tests, 1);
  check('parent view: lessons from the ledger', v.weeks[3].lessons, 1);
  check('parent view: never an email', json.includes('@'), false);
  check('parent view: never an answer', json.includes('secret answer'), false);
  check('parent view: certificates link to verification', v.certificates.every((c) => c.verify_url.startsWith('/')), true);
}
console.log(`\npassport+parent: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
