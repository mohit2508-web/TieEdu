// ============================================================================
// Peer mock interviews (lib/peerMock). Code pairing, what each role can see,
// rubric validation, the note filter, and the XP rules: idempotent awards,
// a minimum duration, a per-student daily cap and once a day per pair.
// ============================================================================

import {
  cancelSession, createSession, deleteNote, getSession, joinByCode, MIN_MINUTES, mySessions, PEER_XP, PeerError,
  submitRatings, XP_SESSIONS_PER_DAY, type PeerSession,
} from '../src/lib/peerMock';

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
    check(name, e instanceof PeerError && (status === undefined || (e as PeerError).status === status), true);
  }
}

const T0 = new Date('2026-10-28T06:00:00Z');
const at = (min: number) => new Date(T0.getTime() + min * 60_000);
const mkDb = (): any => ({ users: ['Asha Verma', 'Ravi Kumar', 'Meena Iyer', 'Kabir Shah'].map((name, i) => ({ id: `u${i}`, name, xp: 0 })) });
const fullRatings = (s: PeerSession, v = 2) => Object.fromEntries(s.question_ids.map((id) => [id, { content: v, clarity: v, confidence: v }]));
const xpOf = (db: any, u: string) => db.users.find((x: any) => x.id === u).xp;

/** Interviewer `a` interviews candidate `b`, joining at `start` and submitting `len` minutes later. */
function interview(db: any, a: string, b: string, start: number, len = MIN_MINUTES + 1) {
  const s = createSession(db, a, { kind: 'hr' }, at(start));
  joinByCode(db, b, s.code, at(start));
  return submitRatings(db, a, s.id, { ratings: fullRatings(s) }, at(start + len));
}

// --- pairing ---------------------------------------------------------------------------
{
  const db = mkDb();
  rejects('kind required', () => createSession(db, 'u0', { kind: 'gd' }, T0), 400);
  const s = createSession(db, 'u0', { kind: 'technical' }, T0);
  check('code: 6 unambiguous characters', /^[A-HJKMNP-Z2-9]{6}$/.test(s.code), true);
  check('three questions', s.question_ids.length, 3);
  rejects('own code refused', () => joinByCode(db, 'u0', s.code, T0), 400);
  rejects('unknown code', () => joinByCode(db, 'u1', 'ZZZZZZ', T0), 404);
  const again = createSession(db, 'u0', { kind: 'hr' }, T0);
  check('a new code cancels the unused one', s.status, 'cancelled');
  rejects('cancelled code no longer joins', () => joinByCode(db, 'u1', s.code, T0), 404);
  rejects('expired code', () => joinByCode(db, 'u1', again.code, new Date(T0.getTime() + 3 * 3_600_000)), 404);
  const fresh = createSession(db, 'u0', { kind: 'hr' }, T0);
  check('code is case- and space-insensitive', joinByCode(db, 'u1', ` ${fresh.code.toLowerCase().slice(0, 3)} ${fresh.code.toLowerCase().slice(3)} `, T0).candidate_id, 'u1');
  rejects('a joined code cannot be reused', () => joinByCode(db, 'u2', fresh.code, T0), 404);
  rejects('outsider cannot read the session', () => getSession(db, 'u2', fresh.id, T0), 404);
}

// --- what each role sees ----------------------------------------------------------------
{
  const db = mkDb();
  const s = createSession(db, 'u0', { kind: 'hr' }, T0);
  joinByCode(db, 'u1', s.code, T0);
  const iv: any = getSession(db, 'u0', s.id, T0);
  const cv: any = getSession(db, 'u1', s.id, T0);
  check('interviewer sees questions and key points', [!!iv.questions[0].question, !!iv.questions[0].key_points?.length], [true, true]);
  check('candidate sees neither while live', [cv.questions[0].question, cv.questions[0].key_points], [null, null]);
  check('partner by first name', [iv.partner, cv.partner], ['Ravi', 'Asha']);
  check('roles', [iv.role, cv.role], ['interviewer', 'candidate']);
  check('code hidden once joined', iv.code, null);
  check('no user ids in the view', /"u\d"/.test(JSON.stringify(cv)), false);

  rejects('candidate cannot submit ratings', () => submitRatings(db, 'u1', s.id, { ratings: fullRatings(s) }, at(10)), 403);
  rejects('too early', () => submitRatings(db, 'u0', s.id, { ratings: fullRatings(s) }, at(MIN_MINUTES - 1)), 409);
  rejects('every question rated', () => submitRatings(db, 'u0', s.id, { ratings: { [s.question_ids[0]]: { content: 3, clarity: 3, confidence: 3 } } }, at(10)), 400);
  rejects('ratings must be 1–3', () => submitRatings(db, 'u0', s.id, { ratings: fullRatings(s, 5) }, at(10)), 400);
  rejects('no phone numbers in the note', () => submitRatings(db, 'u0', s.id, { ratings: fullRatings(s), note: 'call me 9876543210' }, at(10)), 400);
  rejects('no links in the note', () => submitRatings(db, 'u0', s.id, { ratings: fullRatings(s), note: 'see https://x.test' }, at(10)), 400);

  submitRatings(db, 'u0', s.id, { ratings: fullRatings(s, 3), note: 'Great eye contact. Slow down on the project story.' }, at(10));
  const done: any = getSession(db, 'u1', s.id, at(11));
  check('candidate sees everything once done', [!!done.questions[0].question, !!done.questions[0].key_points?.length, done.questions[0].rating?.content], [true, true, 3]);
  check('averages', done.averages, { content: 3, clarity: 3, confidence: 3 });
  check('note shown to candidate', done.note, 'Great eye contact. Slow down on the project story.');
  rejects('ratings cannot be resubmitted', () => submitRatings(db, 'u0', s.id, { ratings: fullRatings(s, 1) }, at(12)), 409);
  rejects('interviewer cannot delete the note', () => deleteNote(db, 'u0', s.id), 403);
  deleteNote(db, 'u1', s.id);
  check('candidate deleted the note; ratings stay', [(getSession(db, 'u1', s.id) as any).note, (getSession(db, 'u1', s.id) as any).averages.content], [null, 3]);
  rejects('finished interview cannot be cancelled', () => cancelSession(db, 'u1', s.id), 409);
  check('both see it in their list', [mySessions(db, 'u0').length, mySessions(db, 'u1').length, mySessions(db, 'u2').length], [1, 1, 0]);
}

// --- XP ---------------------------------------------------------------------------------
{
  const db = mkDb();
  const s1 = interview(db, 'u0', 'u1', 0);
  check('both earn XP', [s1.xp, xpOf(db, 'u0'), xpOf(db, 'u1')], [{ interviewer: PEER_XP.INTERVIEWER, candidate: PEER_XP.CANDIDATE }, PEER_XP.INTERVIEWER, PEER_XP.CANDIDATE]);
  check('ledger rows keyed per session and role', db.xp_ledger.map((e: any) => e.key).sort(), [`peer-mock:${s1.id}:candidate`, `peer-mock:${s1.id}:interviewer`]);

  const swap = interview(db, 'u1', 'u0', 20);
  check('same pair again the same day: practice only', [swap.xp, !!swap.xp_note], [{ interviewer: 0, candidate: 0 }, true]);
  check('totals unchanged', [xpOf(db, 'u0'), xpOf(db, 'u1')], [PEER_XP.INTERVIEWER, PEER_XP.CANDIDATE]);

  interview(db, 'u0', 'u2', 40);
  check(`u0 has now earned on ${XP_SESSIONS_PER_DAY} sessions`, xpOf(db, 'u0'), PEER_XP.INTERVIEWER * 2);
  const third = interview(db, 'u3', 'u0', 60);
  check('daily cap: u0 earns nothing on a third', third.xp.candidate, 0);
  check('the other student still earns', third.xp.interviewer, PEER_XP.INTERVIEWER);

  const tomorrow = createSession(db, 'u1', { kind: 'hr' }, new Date('2026-10-29T06:00:00Z'));
  joinByCode(db, 'u0', tomorrow.code, new Date('2026-10-29T06:00:00Z'));
  const t = submitRatings(db, 'u1', tomorrow.id, { ratings: fullRatings(tomorrow) }, new Date('2026-10-29T06:10:00Z'));
  check('next day the pair earns again', [t.xp.interviewer, t.xp.candidate], [PEER_XP.INTERVIEWER, PEER_XP.CANDIDATE]);
  check('ledger and cache agree', db.xp_ledger.filter((e: any) => e.user_id === 'u0').reduce((n: number, e: any) => n + e.xp, 0), xpOf(db, 'u0'));
}

console.log(`peer-mock: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
