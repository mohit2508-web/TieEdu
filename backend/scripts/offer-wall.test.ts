// ============================================================================
// Offer wall (lib/offerWall): nothing public before approval, verified only
// after approval, the author's name shown exactly as they chose, and no user
// id on the public wall.
// ============================================================================

import { adminQueue, deleteMyOffer, displayName, moderateOffer, myOffers, OfferError, publicWall, submitOffer } from '../src/lib/offerWall';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function status(name: string, fn: () => unknown, expected: number) {
  try { fn(); fail++; console.log(`FAIL ${name}: accepted`); } catch (e: any) { check(name, e instanceof OfferError ? e.status : e?.message, expected); }
}

const story = 'Six weeks of the TieEdu DSA track, one mock drive a week, and I practised my project explanation out loud every day before the interview.';
const mkDb = (): any => ({
  users: [{ id: 'u1', name: 'Asha Verma', email: 'asha@example.test' }, { id: 'u2', name: 'Rahul Kumar Singh' }],
  companies: [{ id: 'c1', slug: 'acme', name: 'Acme', status: 'published' }],
});

// --- names ----------------------------------------------------------------------
check('first name', displayName('Asha Verma', 'first_name'), 'Asha');
check('initials', displayName('Rahul Kumar Singh', 'initials'), 'R. K. S.');
check('anonymous', displayName('Asha Verma', 'anonymous'), 'A TieEdu student');
check('no name on file falls back to anonymous', displayName('', 'first_name'), 'A TieEdu student');

// --- submit ----------------------------------------------------------------------
{
  const db = mkDb();
  status('unknown company', () => submitOffer(db, 'u1', { company_slug: 'nope', role: 'SDE', story }), 400);
  status('story too short', () => submitOffer(db, 'u1', { company_slug: 'acme', role: 'SDE', story: 'Got it!' }), 400);
  status('no links', () => submitOffer(db, 'u1', { company_slug: 'acme', role: 'SDE', story: story + ' see www.mysite.com' }), 400);
  status('package out of range', () => submitOffer(db, 'u1', { company_slug: 'acme', role: 'SDE', story, ctc_lpa: 900 }), 400);
  const o = submitOffer(db, 'u1', { company_slug: 'acme', role: 'SDE', story, ctc_lpa: '6.53', name_mode: 'nonsense' });
  check('package rounded to one decimal', o.ctc_lpa, 6.5);
  check('an unknown name mode falls back to first name', o.name_mode, 'first_name');
  status('one pending story at a time', () => submitOffer(db, 'u1', { company_slug: 'acme', role: 'SDE 2', story }), 409);
  check('not public while pending', publicWall(db).items.length, 0);
  check('my list shows it as pending', myOffers(db, 'u1').map((x) => x.status), ['pending']);

  // --- moderation ----------------------------------------------------------------
  status('cannot verify before approving', () => moderateOffer(db, o.id, { verified: true }), 400);
  moderateOffer(db, o.id, { status: 'approved' });
  const wall = publicWall(db);
  check('approved: on the wall', wall.items.map((x) => [x.company, x.role, x.name]), [['Acme', 'SDE', 'Asha']]);
  check('the wall carries no user id or email', JSON.stringify(wall).includes('u1') || JSON.stringify(wall).includes('asha@'), false);
  check('companies filter lists only companies with stories', wall.companies, [{ slug: 'acme', name: 'Acme' }]);
  moderateOffer(db, o.id, { verified: true });
  check('verified once approved', publicWall(db).items[0].verified, true);
  check('admin queue shows the author for context', adminQueue(db)[0].author, 'Asha Verma');

  const o2 = submitOffer(db, 'u2', { company_slug: 'acme', role: 'Analyst', story, name_mode: 'initials' });
  moderateOffer(db, o2.id, { status: 'approved' });
  check('verified stories come first', publicWall(db).items.map((x) => x.name), ['Asha', 'R. K. S.']);
  check('a company filter narrows the wall', publicWall(db, { company: 'other' }).items.length, 0);
  moderateOffer(db, o2.id, { status: 'rejected' });
  check('rejected: off the wall', publicWall(db).items.length, 1);
  check('only the author can withdraw', [deleteMyOffer(db, 'u2', o.id), deleteMyOffer(db, 'u1', o.id)], [false, true]);
}

console.log(`\noffer-wall: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
