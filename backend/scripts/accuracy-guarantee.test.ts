// ============================================================================
// Accuracy guarantee (lib/accuracyGuarantee). It promises money, so: off by
// default; only buyers can claim; a claim window; one claim per company; and
// a review path in which "refunded" is reachable only from "approved".
// ============================================================================

import { claimableCompanies, ClaimError, fileClaim, guaranteeSettings, myClaims, reviewClaim } from '../src/lib/accuracyGuarantee';

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
  try { fn(); fail++; console.log(`FAIL ${name}: accepted`); } catch (e: any) { check(name, e instanceof ClaimError ? e.status : e?.message, expected); }
}

const now = new Date('2026-10-27T06:30:00Z');
const diff = 'The technical round had no DSA at all — it was a 45-minute system design discussion on caching.';
const mkDb = (enabled: boolean): any => ({
  settings: enabled ? { accuracy_guarantee_enabled: true, accuracy_guarantee_amount: 149 } : {},
  users: [{ id: 'buyer', name: 'B' }, { id: 'browser', name: 'C' }],
  companies: [{ id: 'c1', slug: 'acme', name: 'Acme', status: 'published' }, { id: 'c2', slug: 'beta', name: 'Beta', status: 'published' }],
  unlocks: [{ id: 'u1', user_id: 'buyer', company_id: 'c1', status: 'active' }],
});
const claim = { company_slug: 'acme', round: 'Technical', interview_date: '2026-10-20', what_differed: diff };

check('off by default', guaranteeSettings(mkDb(false)), { enabled: false, amount: 99, window_days: 30 });
status('no claims while it is off', () => fileClaim(mkDb(false), 'buyer', claim, now), 403);

{
  const db = mkDb(true);
  check('the admin amount is used', guaranteeSettings(db).amount, 149);
  status('only for content the student bought', () => fileClaim(db, 'browser', claim, now), 403);
  status('only for a company they bought', () => fileClaim(db, 'buyer', { ...claim, company_slug: 'beta' }, now), 403);
  status('no future interview dates', () => fileClaim(db, 'buyer', { ...claim, interview_date: '2026-11-02' }, now), 400);
  status('closed after the window', () => fileClaim(db, 'buyer', { ...claim, interview_date: '2026-09-01' }, now), 400);
  status('must say what differed', () => fileClaim(db, 'buyer', { ...claim, what_differed: 'wrong' }, now), 400);
  check('claimable before claiming', claimableCompanies(db, 'buyer').map((c) => c.slug), ['acme']);
  const c = fileClaim(db, 'buyer', claim, now);
  check('a claim starts pending at the current amount', [c.status, c.amount], ['pending', 149]);
  status('one claim per company', () => fileClaim(db, 'buyer', claim, now), 409);
  check('no longer claimable', claimableCompanies(db, 'buyer').length, 0);

  status('cannot mark refunded before approving', () => reviewClaim(db, c.id, { status: 'refunded' }, now), 400);
  reviewClaim(db, c.id, { status: 'approved', admin_note: 'Confirmed by two other students; round updated.' }, now);
  reviewClaim(db, c.id, { status: 'refunded' }, now);
  status('a refunded claim is final', () => reviewClaim(db, c.id, { status: 'rejected' }, now), 400);
  check('the student sees the status and the note', myClaims(db, 'buyer').map((x) => [x.status, x.admin_note.slice(0, 9)]), [['refunded', 'Confirmed']]);
}

console.log(`\naccuracy-guarantee: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
