// ============================================================================
// Recruiter skill search (lib/talentSearch), to the platform owner's rules:
// admin-verified recruiters, opt-in students shown anonymously, contact only
// when the student accepts, weekly caps and a cooldown after a decline, and
// the whole thing off until an admin switches it on.
// ============================================================================

import {
  adminRecruiters, applyAsRecruiter, decideInterest, DECLINE_COOLDOWN_DAYS, INTEREST_PER_WEEK, recruiterView, reviewRecruiter,
  searchCandidates, searchEnabled, sendInterest, setTalentProfile, studentTalentView, TalentError, withdrawInterest,
} from '../src/lib/talentSearch';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function rejects(name: string, fn: () => unknown, status?: number) {
  try { fn(); fail++; console.log(`FAIL ${name}: accepted`); } catch (e) {
    check(name, e instanceof TalentError && (status === undefined || (e as TalentError).status === status), true);
  }
}

const NOW = new Date('2026-10-28T06:00:00Z');
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);
const mkDb = (): any => ({
  settings: { recruiter_search_enabled: true },
  users: [
    { id: 'rec1', name: 'Hiring Manager', email: 'hm@personal.test' },
    { id: 'priya', name: 'Priya Singh', email: 'priya@student.test', college: 'GLA University' },
    { id: 'amit', name: 'Amit Rao', email: 'amit@student.test' },
    { id: 'nobody', name: 'No Scores', email: 'n@student.test' },
    ...Array.from({ length: INTEREST_PER_WEEK + 2 }, (_, i) => ({ id: `bulk${i}`, name: `Bulk ${i}`, email: `b${i}@s.test` })),
  ],
  skills: [{ id: 'sk-java', name: 'Java', slug: 'java' }, { id: 'sk-sql', name: 'SQL', slug: 'sql' }],
  attempts: [
    { userId: 'priya', skillId: 'sk-java', status: 'submitted', percentage: 86, skillLevel: 'Advanced' },
    { userId: 'priya', skillId: 'sk-sql', status: 'submitted', percentage: 61 },
    { userId: 'amit', skillId: 'sk-java', status: 'submitted', percentage: 55 },
    ...Array.from({ length: INTEREST_PER_WEEK + 2 }, (_, i) => ({ userId: `bulk${i}`, skillId: 'sk-sql', status: 'submitted', percentage: 50 })),
  ],
  certificates: [{ user_id: 'priya', status: 'active', course_title: 'Python Basics', serial: 'TE-123', issued_at: '2026-09-01T00:00:00Z' }],
});
const goodApp = { company: 'Acme Labs', website: 'acmelabs.in', work_email: 'hr@acmelabs.in' };
const offer = { role: 'Junior Java Developer', location: 'Noida', pay_range: '4–5 LPA', note: 'Small product team.' };

// --- recruiters ---------------------------------------------------------------------------------
{
  const db = mkDb();
  rejects('personal email refused', () => applyAsRecruiter(db, 'rec1', { ...goodApp, work_email: 'hr@gmail.com' }), 400);
  rejects('website required', () => applyAsRecruiter(db, 'rec1', { ...goodApp, website: 'not a site' }), 400);
  const r = applyAsRecruiter(db, 'rec1', goodApp, NOW);
  check('application pending, website normalised', [r.status, r.website], ['pending', 'https://acmelabs.in']);
  rejects('pending recruiter cannot search', () => searchCandidates(db, 'rec1', {}), 403);
  rejects('applying twice', () => applyAsRecruiter(db, 'rec1', goodApp), 409);
  rejects('a student cannot search', () => searchCandidates(db, 'priya', {}), 403);
  reviewRecruiter(db, 'admin1', r.id, { status: 'approved' }, NOW);
  db.settings.recruiter_search_enabled = false;
  rejects('approved but search switched off', () => searchCandidates(db, 'rec1', {}), 503);
  check('off by default', searchEnabled({}), false);
  check('admin list shows pending first, with counts', adminRecruiters(db).recruiters[0].status, 'approved');
}

// --- opt-in and anonymous results ------------------------------------------------------------------
{
  const db = mkDb();
  const r = applyAsRecruiter(db, 'rec1', goodApp, NOW);
  reviewRecruiter(db, 'admin1', r.id, { status: 'approved' }, NOW);
  check('nobody is searchable before opting in', searchCandidates(db, 'rec1', {}).length, 0);
  setTalentProfile(db, 'priya', { visible: true, branch: 'CSE', grad_year: 2027, city: 'Noida' }, NOW);
  setTalentProfile(db, 'amit', { visible: true, branch: 'IT', grad_year: 2027 }, NOW);
  setTalentProfile(db, 'nobody', { visible: true }, NOW);
  const all = searchCandidates(db, 'rec1', {});
  check('students without any verified score are left out', all.length, 2);
  check('best first', all[0].skills[0].score, 86);
  const json = JSON.stringify(all);
  check('no names, emails, college or user ids', /Priya|Singh|priya@|GLA|"priya"|"amit"/.test(json), false);
  check('no verify links before contact', /verify|TE-123/.test(json), false);
  check('certificate shown as verified', all[0].certificates, [{ title: 'Python Basics', verified: true }]);
  check('candidate handle', /^Candidate #[0-9A-F]{6}$/.test(all[0].handle), true);
  check('filter by skill and minimum score', searchCandidates(db, 'rec1', { skill: 'java', min_score: 60 }).length, 1);
  check('filter by branch', searchCandidates(db, 'rec1', { branch: 'it' }).length, 1);
  check('filter by graduation year', searchCandidates(db, 'rec1', { grad_year: 2026 }).length, 0);
  check('implausible graduation year dropped', setTalentProfile(db, 'amit', { visible: true, grad_year: 1999 }, NOW)!.grad_year, null);
  const handle = db.users.find((u: any) => u.id === 'priya').talent.handle;
  setTalentProfile(db, 'priya', { visible: false }, NOW);
  check('opting out hides at once', searchCandidates(db, 'rec1', {}).length, 1);
  setTalentProfile(db, 'priya', { visible: true, branch: 'CSE' }, NOW);
  check('handle kept across opt-out', db.users.find((u: any) => u.id === 'priya').talent.handle, handle);
}

// --- interest and contact ---------------------------------------------------------------------------
{
  const db = mkDb();
  const r = applyAsRecruiter(db, 'rec1', goodApp, NOW);
  reviewRecruiter(db, 'admin1', r.id, { status: 'approved' }, NOW);
  setTalentProfile(db, 'priya', { visible: true, branch: 'CSE' }, NOW);
  const cand = searchCandidates(db, 'rec1', {})[0].handle;

  rejects('role, location and pay required', () => sendInterest(db, 'rec1', { candidate: cand, role: 'Dev' }, NOW), 400);
  rejects('no contact details in the request', () => sendInterest(db, 'rec1', { candidate: cand, ...offer, note: 'WhatsApp 9876543210' }, NOW), 400);
  rejects('unknown candidate', () => sendInterest(db, 'rec1', { candidate: 'Candidate #000000', ...offer }, NOW), 404);
  const sent = sendInterest(db, 'rec1', { candidate: cand, ...offer }, NOW);
  check('push to the student', [sent.push.userId, sent.push.title], ['priya', 'Acme Labs is interested in you']);
  rejects('one open request per pair', () => sendInterest(db, 'rec1', { candidate: cand, ...offer }, NOW), 409);
  check('student sees company, role, pay', studentTalentView(db, 'priya').requests[0], { id: sent.interest.id, status: 'pending', company: 'Acme Labs', website: 'https://acmelabs.in', role: offer.role, location: 'Noida', pay_range: '4–5 LPA', note: 'Small product team.', created_at: NOW.toISOString() });
  check('recruiter sees no contact while pending', recruiterView(db, 'rec1').requests[0].contact, null);
  rejects('another student cannot answer it', () => decideInterest(db, 'amit', sent.interest.id, true, NOW), 404);

  decideInterest(db, 'priya', sent.interest.id, true, days(1));
  const contact = recruiterView(db, 'rec1').requests[0].contact;
  check('accepted: name, email and verify links shared', [contact?.name, contact?.email, contact?.certificates[0].verify_url], ['Priya Singh', 'priya@student.test', '/verify/TE-123']);
  rejects('cannot re-request an accepted candidate', () => sendInterest(db, 'rec1', { candidate: cand, ...offer }, days(2)), 409);
  rejects('answer is final', () => decideInterest(db, 'priya', sent.interest.id, false, days(2)), 409);

  // Decline + cooldown, with a second student.
  setTalentProfile(db, 'amit', { visible: true }, NOW);
  const amit = searchCandidates(db, 'rec1', { skill: 'java', min_score: 50 }).find((c: any) => c.skills[0].score === 55)!.handle;
  const second = sendInterest(db, 'rec1', { candidate: amit, ...offer }, NOW);
  decideInterest(db, 'amit', second.interest.id, false, NOW);
  check('declined: no contact', recruiterView(db, 'rec1').requests.find((x: any) => x.id === second.interest.id)!.contact, null);
  rejects('cooldown after a decline', () => sendInterest(db, 'rec1', { candidate: amit, ...offer }, days(DECLINE_COOLDOWN_DAYS - 1)), 409);
  check('allowed after the cooldown', !!sendInterest(db, 'rec1', { candidate: amit, ...offer }, days(DECLINE_COOLDOWN_DAYS + 1)), true);

  // Withdraw.
  const open = recruiterView(db, 'rec1').requests.find((x: any) => x.status === 'pending')!;
  check('recruiter withdraws a waiting request', withdrawInterest(db, 'rec1', open.id, days(40)).status, 'withdrawn');
}

// --- weekly cap and suspension --------------------------------------------------------------------------
{
  const db = mkDb();
  const r = applyAsRecruiter(db, 'rec1', goodApp, NOW);
  reviewRecruiter(db, 'admin1', r.id, { status: 'approved' }, NOW);
  for (let i = 0; i < INTEREST_PER_WEEK + 2; i++) setTalentProfile(db, `bulk${i}`, { visible: true }, NOW);
  const cands = searchCandidates(db, 'rec1', { skill: 'sql' }).map((c: any) => c.handle);
  for (const c of cands.slice(0, INTEREST_PER_WEEK)) sendInterest(db, 'rec1', { candidate: c, ...offer }, NOW);
  rejects('weekly cap', () => sendInterest(db, 'rec1', { candidate: cands[INTEREST_PER_WEEK], ...offer }, NOW), 429);
  check('a week later the cap resets', !!sendInterest(db, 'rec1', { candidate: cands[INTEREST_PER_WEEK], ...offer }, days(8)), true);
  reviewRecruiter(db, 'admin1', r.id, { status: 'suspended', admin_note: 'Complaints' }, days(8));
  rejects('suspended recruiter cannot search', () => searchCandidates(db, 'rec1', {}), 403);
  check('suspension withdraws open requests', studentTalentView(db, 'bulk0').requests.length, 0);
  rejects('suspended recruiter cannot re-apply', () => applyAsRecruiter(db, 'rec1', goodApp), 403);
}

console.log(`talent-search: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
