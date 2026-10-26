// ============================================================================
// Daily 10-minute challenge (lib/dailyChallenge).
//
// The set must be a pure function of the India date, never leak an answer
// before the student has answered, accept only the first answer, and finish
// exactly once.
// ============================================================================

import { answerToday, challengeFor, challengeView, ChallengeError, completedCount, questionPool } from '../src/lib/dailyChallenge';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function throwsStatus(name: string, fn: () => unknown, status: number) {
  try {
    fn();
    fail++;
    console.log(`FAIL ${name}: did not throw`);
  } catch (e: any) {
    check(name, e instanceof ChallengeError ? e.status : `non-challenge error: ${e?.message}`, status);
  }
}

// Noon IST on a date, so the India day is unambiguous.
const at = (day: string) => new Date(`${day}T06:30:00Z`);

const q = (id: string, skillId: string, correct: number, extra: any = {}) => ({
  id, skillId, type: 'single_choice', status: 'approved', question: `Q ${id}?`, explanation: `Because ${id}.`,
  options: ['A', 'B', 'C', 'D'].map((t, i) => ({ text: t, isCorrect: i === correct })), ...extra,
});
const mkDb = (): any => ({
  users: [{ id: 'u1' }, { id: 'u2' }],
  skills: [
    { id: 'apt', name: 'Logical Reasoning', category: 'Career & Aptitude' },
    { id: 'py', name: 'Python', category: 'Programming' },
    { id: 'web', name: 'React', category: 'Web Development' },
  ],
  questions: [
    q('a1', 'apt', 0), q('a2', 'apt', 1), q('a3', 'apt', 2),
    q('c1', 'py', 3), q('c2', 'py', 0),
    q('w1', 'web', 0), // wrong category
    q('a-draft', 'apt', 0, { status: 'draft' }),
    q('a-multi', 'apt', 0, { type: 'multiple_choice' }),
    { ...q('a-two', 'apt', 0), options: [{ text: 'x', isCorrect: true }, { text: 'y', isCorrect: true }] },
  ],
});

// --- pools -----------------------------------------------------------------
{
  const db = mkDb();
  check('aptitude pool: approved single-answer questions from its category only', questionPool(db, 'aptitude').map((x) => x.id), ['a1', 'a2', 'a3']);
  check('coding pool: Programming only', questionPool(db, 'coding').map((x) => x.id), ['c1', 'c2']);
}

// --- the set is a pure function of the date ----------------------------------
{
  const db = mkDb();
  const a = challengeFor(db, '2026-10-26');
  const b = challengeFor(db, '2026-10-26');
  check('same date, same set', [a.aptitude.id, a.coding.id, a.hr?.id], [b.aptitude.id, b.coding.id, b.hr?.id]);
  const seen = new Set<string>();
  for (let i = 0; i < 3; i++) seen.add(challengeFor(db, `2026-10-${26 + i}`).aptitude.id);
  check('a pool of 3 is fully visited in 3 consecutive days (no repeats)', seen.size, 3);
}

// --- nothing is revealed before answering ------------------------------------
{
  const db = mkDb();
  const v = challengeView(db, 'u1', at('2026-10-26'));
  const json = JSON.stringify(v);
  check('three items', v.items.length, 3);
  check('no isCorrect flags ship', json.includes('isCorrect'), false);
  check('no reveal before answering', v.items.map((i: any) => i.reveal), [null, null, null]);
  const hr: any = v.items.find((i: any) => i.kind === 'hr');
  check('HR model answer not shipped before answering', 'sample_answer' in hr || json.includes(String(challengeFor(db, '2026-10-26').hr?.sample_answer)), false);
  check('options are plain text', v.items.filter((i: any) => i.options).every((i: any) => i.options.every((o: any) => typeof o === 'string')), true);
}

// --- answering ---------------------------------------------------------------------
{
  const db = mkDb();
  const now = at('2026-10-26');
  const set = challengeFor(db, '2026-10-26');
  const right = set.aptitude.options.findIndex((o: any) => o.isCorrect);
  const r1 = answerToday(db, 'u1', { kind: 'aptitude', choice: right }, now);
  check('a correct answer is marked correct', (r1.item as any).reveal.correct, true);
  check('the reveal names the right option and explains it', [(r1.item as any).reveal.correct_index, (r1.item as any).reveal.explanation.length > 0], [right, true]);
  check('not finished after one of three', r1.finished, false);
  throwsStatus('the first answer is final', () => answerToday(db, 'u1', { kind: 'aptitude', choice: (right + 1) % 4 }, now), 409);
  throwsStatus('an out-of-range option is refused', () => answerToday(db, 'u1', { kind: 'coding', choice: 9 }, now), 400);
  throwsStatus('an unknown kind is refused', () => answerToday(db, 'u1', { kind: 'essay' }, now), 400);
  throwsStatus('HR needs a 1-3 self-rating', () => answerToday(db, 'u1', { kind: 'hr', rating: 5 }, now), 400);

  const wrong = (set.coding.options.findIndex((o: any) => o.isCorrect) + 1) % set.coding.options.length;
  const r2 = answerToday(db, 'u1', { kind: 'coding', choice: wrong }, now);
  check('a wrong answer is marked wrong', (r2.item as any).reveal.correct, false);
  const r3 = answerToday(db, 'u1', { kind: 'hr', rating: 2 }, now);
  check('the third answer finishes the set', r3.finished, true);
  check('correct count over the two MCQs', r3.correct, 1);
  check('HR reveal includes the model answer once answered', typeof (r3.item as any).reveal.sample_answer, 'string');
  check('completed shows in the view', challengeView(db, 'u1', now).completed, true);
  check('the social count counts finishers only', completedCount(db, '2026-10-26'), 1);
  answerToday(db, 'u2', { kind: 'hr', rating: 3 }, now);
  check('a part-done student is not counted', completedCount(db, '2026-10-26'), 1);
  check('a new day starts fresh', challengeView(db, 'u1', at('2026-10-27')).completed, false);
}

console.log(`\ndaily-challenge: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
