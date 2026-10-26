/**
 * The daily 10-minute challenge: one aptitude question, one coding question
 * and one HR question, the same three for every student on a given India date.
 *
 * Why the same for everyone: "did you get today's?" is a conversation students
 * have with each other, and a shared set makes the completion count honest.
 *
 * Rules:
 *  - The set is a pure function of the date. Each pool is stepped through by a
 *    prime stride, so no question repeats until its whole pool has been used.
 *  - Correct answers never leave the server before the student has answered,
 *    and the first answer is final (no answer-shopping).
 *  - HR model answers are premium interview content; they are only revealed to
 *    a signed-in student, which answering already requires.
 *  - Finishing all three counts as a study day (`touchStreak`) and earns XP
 *    once per day, keyed in the XP ledger so a retry can never mint it twice.
 */
import { istDate } from './streak';
import { INTERVIEW_MODULES } from '../routes/interviewCourse.routes';

export type ChallengeKind = 'aptitude' | 'coding' | 'hr';
export const CHALLENGE_KINDS: ChallengeKind[] = ['aptitude', 'coding', 'hr'];

/** XP: a flat reward for finishing, plus a bonus per correct multiple-choice answer. */
export const DAILY_XP = { COMPLETE: 20, PER_CORRECT: 10 } as const;

const POOL_CATEGORY: Record<'aptitude' | 'coding', string> = {
  aptitude: 'Career & Aptitude',
  coding: 'Programming',
};

/** A prime larger than any pool, so `day * STRIDE mod n` visits every index. */
const STRIDE = 7919;

const dayNumber = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);

/** Approved single-answer questions from one skill category, in a stable order. */
export function questionPool(db: any, kind: 'aptitude' | 'coding'): any[] {
  const skills = new Map<string, any>((db.skills || []).map((s: any) => [s.id, s]));
  return (db.questions || [])
    .filter((q: any) => {
      const skill = skills.get(q.skillId);
      if (!skill || skill.category !== POOL_CATEGORY[kind]) return false;
      if (q.status !== 'approved' || q.type !== 'single_choice') return false;
      const opts = Array.isArray(q.options) ? q.options : [];
      return opts.length >= 2 && opts.filter((o: any) => o.isCorrect).length === 1;
    })
    .sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)));
}

const pick = <T>(pool: T[], day: string, salt: number): T | null =>
  pool.length ? pool[(((dayNumber(day) + salt) * STRIDE) % pool.length + pool.length) % pool.length] : null;

export interface ChallengeSet {
  day: string;
  aptitude: any | null;
  coding: any | null;
  hr: (typeof INTERVIEW_MODULES)[number] | null;
}

/** The three items for an India date. Pure: same date, same set. */
export function challengeFor(db: any, day: string): ChallengeSet {
  return {
    day,
    aptitude: pick(questionPool(db, 'aptitude'), day, 0),
    coding: pick(questionPool(db, 'coding'), day, 101),
    hr: pick(INTERVIEW_MODULES, day, 211),
  };
}

export interface ChallengeAnswer {
  choice?: number;
  correct?: boolean;
  rating?: 1 | 2 | 3;
  at: string;
}
export interface ChallengeRecord {
  answers: Partial<Record<ChallengeKind, ChallengeAnswer>>;
  completed_at?: string;
}

const recordsOf = (db: any): Record<string, Record<string, ChallengeRecord>> => {
  if (!db.daily_challenge || typeof db.daily_challenge !== 'object') db.daily_challenge = {};
  return db.daily_challenge;
};

export function recordFor(db: any, userId: string, day: string): ChallengeRecord | null {
  return recordsOf(db)[userId]?.[day] ?? null;
}

const skillName = (db: any, q: any) => (db.skills || []).find((s: any) => s.id === q?.skillId)?.name || null;
const correctIndex = (q: any) => (q?.options || []).findIndex((o: any) => o.isCorrect);

/** What a student may see of one item: the question, and the answer only once they have answered. */
function itemView(db: any, set: ChallengeSet, kind: ChallengeKind, answer: ChallengeAnswer | undefined) {
  if (kind === 'hr') {
    const m = set.hr;
    if (!m) return null;
    return {
      kind,
      id: String(m.id),
      title: m.title,
      question: m.question,
      answered: !!answer,
      rating: answer?.rating ?? null,
      reveal: answer
        ? { sample_answer: m.sample_answer, expert_tip: m.expert_tip, red_flag_trap: m.red_flag_trap, star_breakdown: m.star_breakdown ?? null }
        : null,
    };
  }
  const q = set[kind];
  if (!q) return null;
  return {
    kind,
    id: q.id,
    skill: skillName(db, q),
    difficulty: q.difficulty || null,
    question: q.question,
    options: (q.options || []).map((o: any) => String(o.text)),
    answered: !!answer,
    choice: answer?.choice ?? null,
    reveal: answer ? { correct: !!answer.correct, correct_index: correctIndex(q), explanation: q.explanation || '' } : null,
  };
}

/** How many students have finished a day's challenge — the honest social count. */
export function completedCount(db: any, day: string): number {
  return Object.values(recordsOf(db)).filter((byDay) => byDay?.[day]?.completed_at).length;
}

export function challengeView(db: any, userId: string | null, now = new Date()) {
  const day = istDate(now);
  const set = challengeFor(db, day);
  const record = userId ? recordFor(db, userId, day) : null;
  const items = CHALLENGE_KINDS.map((k) => itemView(db, set, k, record?.answers[k])).filter(Boolean);
  return {
    day,
    items,
    completed: !!record?.completed_at,
    completed_today: completedCount(db, day),
  };
}

export class ChallengeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Record one answer for today. Returns the item with its reveal, and whether
 * this answer finished the set (the caller then touches the streak and awards XP).
 */
export function answerToday(
  db: any,
  userId: string,
  input: { kind: unknown; choice?: unknown; rating?: unknown },
  now = new Date()
) {
  const kind = input.kind as ChallengeKind;
  if (!CHALLENGE_KINDS.includes(kind)) throw new ChallengeError(400, 'Unknown question.');
  const day = istDate(now);
  const set = challengeFor(db, day);
  if (!set[kind]) throw new ChallengeError(404, 'Today has no question of that kind.');

  const byUser = (recordsOf(db)[userId] = recordsOf(db)[userId] || {});
  const record: ChallengeRecord = (byUser[day] = byUser[day] || { answers: {} });
  if (record.answers[kind]) throw new ChallengeError(409, 'You have already answered this one today.');

  const at = now.toISOString();
  if (kind === 'hr') {
    const rating = Number(input.rating);
    if (![1, 2, 3].includes(rating)) throw new ChallengeError(400, 'Rate your answer from 1 to 3.');
    record.answers.hr = { rating: rating as 1 | 2 | 3, at };
  } else {
    const q = set[kind];
    const choice = Number(input.choice);
    if (!Number.isInteger(choice) || choice < 0 || choice >= (q.options || []).length) {
      throw new ChallengeError(400, 'Pick one of the options.');
    }
    record.answers[kind] = { choice, correct: choice === correctIndex(q), at };
  }

  let finished = false;
  if (!record.completed_at && CHALLENGE_KINDS.every((k) => !set[k] || record.answers[k])) {
    record.completed_at = at;
    finished = true;
  }
  const correct = (['aptitude', 'coding'] as const).filter((k) => record.answers[k]?.correct).length;
  return { day, item: itemView(db, set, kind, record.answers[kind]), finished, correct };
}
