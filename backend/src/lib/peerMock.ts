/**
 * Peer mock interviews (C4). Two students interview each other with a rubric
 * TieEdu provides, and both earn XP.
 *
 * How it works: the interviewer starts a session and gets a short code, shares
 * it with a friend (in person, WhatsApp, a study group), and they talk however
 * they like — in the same room or on a call. TieEdu supplies the questions,
 * shows the interviewer the points a strong answer covers, and collects a
 * three-part rating per question. The candidate sees the questions and the
 * key points only once the interviewer submits.
 *
 * Rules:
 *  - Pairing is by code only. There is no matching of strangers and no
 *    directory of students, so nobody can be contacted who did not hand out
 *    or accept a code.
 *  - The interviewer's note is optional, short, and refused if it carries a
 *    link or a phone number. It is shown only to the candidate, who can
 *    delete it.
 *  - XP is append-only and keyed per session and role (lib/xp), and guarded
 *    against farming: at least MIN_MINUTES between joining and submitting, XP
 *    from at most XP_SESSIONS_PER_DAY sessions a day per student, and once a
 *    day per pair. A session past those limits still completes; it just earns
 *    nothing, and says so.
 */
import crypto from 'crypto';
import { istDate } from './streak';
import { awardXp, syncUserXp } from './xp';
import { displayName } from './offerWall';
import { QUESTION_BANK, questionById, type InterviewKind } from './mockInterview';

export const PEER_XP = { INTERVIEWER: 30, CANDIDATE: 20 } as const;
export const QUESTIONS_PER_PEER_SESSION = 3;
export const MIN_MINUTES = 5;
export const XP_SESSIONS_PER_DAY = 2;
export const CODE_TTL_HOURS = 2;
export const NOTE_MAX = 400;
export const SESSIONS_LISTED = 20;

export const DIMENSIONS = ['content', 'clarity', 'confidence'] as const;
export type Dimension = (typeof DIMENSIONS)[number];
export const DIMENSION_LABEL: Record<Dimension, string> = {
  content: 'Covered the key points',
  clarity: 'Clear and well structured',
  confidence: 'Calm and confident',
};
export const LEVEL_LABEL = { 1: 'Needs work', 2: 'Good', 3: 'Strong' } as const;
export type Rating = Record<Dimension, 1 | 2 | 3>;

export type PeerStatus = 'open' | 'live' | 'done' | 'cancelled';
export interface PeerSession {
  id: string;
  code: string;
  kind: InterviewKind;
  interviewer_id: string;
  candidate_id: string | null;
  question_ids: string[];
  status: PeerStatus;
  created_at: string;
  joined_at: string | null;
  done_at: string | null;
  ratings: Record<string, Rating>;
  note: string;
  /** XP granted at completion, per role (0 when a limit applied). */
  xp: { interviewer: number; candidate: number };
  xp_note: string | null;
}

export class PeerError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function peerSessionsOf(db: any): PeerSession[] {
  if (!Array.isArray(db.peer_mocks)) db.peer_mocks = [];
  return db.peer_mocks;
}

/** No 0/O or 1/I/L, so a code read out over a call is not misheard. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newCode(db: any): string {
  const live = new Set(peerSessionsOf(db).filter((s) => s.status === 'open').map((s) => s.code));
  for (;;) {
    const bytes = crypto.randomBytes(6);
    const code = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
    if (!live.has(code)) return code;
  }
}

const expired = (s: PeerSession, now: Date) => s.status === 'open' && now.getTime() - Date.parse(s.created_at) > CODE_TTL_HOURS * 3_600_000;
const firstName = (db: any, userId: string | null) => (userId ? displayName((db.users || []).find((u: any) => u.id === userId)?.name || '', 'first_name') : null);

function pickQuestions(kind: InterviewKind, rand: () => number): string[] {
  const pool = QUESTION_BANK.filter((q) => q.kind === kind).map((q) => q.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, QUESTIONS_PER_PEER_SESSION);
}

export function createSession(db: any, userId: string, input: any, now = new Date(), rand: () => number = Math.random): PeerSession {
  const kind = String(input?.kind || '') as InterviewKind;
  if (kind !== 'hr' && kind !== 'technical') throw new PeerError(400, 'Choose HR or technical.');
  // One open code at a time: starting again replaces the unused one.
  for (const s of peerSessionsOf(db)) if (s.interviewer_id === userId && s.status === 'open') s.status = 'cancelled';
  const s: PeerSession = {
    id: `pm-${crypto.randomBytes(6).toString('hex')}`,
    code: newCode(db),
    kind,
    interviewer_id: userId,
    candidate_id: null,
    question_ids: pickQuestions(kind, rand),
    status: 'open',
    created_at: now.toISOString(),
    joined_at: null,
    done_at: null,
    ratings: {},
    note: '',
    xp: { interviewer: 0, candidate: 0 },
    xp_note: null,
  };
  peerSessionsOf(db).push(s);
  return s;
}

export function joinByCode(db: any, userId: string, rawCode: string, now = new Date()): PeerSession {
  const code = String(rawCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const s = peerSessionsOf(db).find((x) => x.code === code && x.status === 'open');
  if (!s || expired(s, now)) throw new PeerError(404, 'That code is not valid any more. Ask your friend for a new one.');
  if (s.interviewer_id === userId) throw new PeerError(400, 'This is your own code. Share it with the friend you will interview.');
  s.candidate_id = userId;
  s.status = 'live';
  s.joined_at = now.toISOString();
  return s;
}

const own = (db: any, userId: string, id: string) => {
  const s = peerSessionsOf(db).find((x) => x.id === id && (x.interviewer_id === userId || x.candidate_id === userId));
  if (!s) throw new PeerError(404, 'That session was not found.');
  return s;
};

export function cancelSession(db: any, userId: string, id: string): PeerSession {
  const s = own(db, userId, id);
  if (s.status === 'done') throw new PeerError(409, 'A finished interview cannot be cancelled.');
  s.status = 'cancelled';
  return s;
}

/** The candidate can remove the interviewer's note; the ratings stay. */
export function deleteNote(db: any, userId: string, id: string): PeerSession {
  const s = own(db, userId, id);
  if (s.candidate_id !== userId) throw new PeerError(403, 'Only the student who was interviewed can remove the note.');
  s.note = '';
  return s;
}

function parseRatings(s: PeerSession, raw: any): Record<string, Rating> {
  const out: Record<string, Rating> = {};
  for (const qid of s.question_ids) {
    const r = raw?.[qid];
    const rating: Partial<Rating> = {};
    for (const d of DIMENSIONS) {
      const v = Number(r?.[d]);
      if (v !== 1 && v !== 2 && v !== 3) throw new PeerError(400, 'Rate every question on all three points before you submit.');
      rating[d] = v;
    }
    out[qid] = rating as Rating;
  }
  return out;
}

const xpEarnedToday = (db: any, userId: string, day: string, except: string) =>
  peerSessionsOf(db).filter((x) => x.id !== except && x.status === 'done' && x.done_at && istDate(new Date(x.done_at)) === day && (
    (x.interviewer_id === userId && x.xp.interviewer > 0) || (x.candidate_id === userId && x.xp.candidate > 0)));

/** Interviewer submits the rubric. Completes the session and grants XP within the limits. */
export function submitRatings(db: any, userId: string, id: string, input: any, now = new Date()): PeerSession {
  const s = own(db, userId, id);
  if (s.interviewer_id !== userId) throw new PeerError(403, 'Only the interviewer submits the ratings.');
  if (s.status !== 'live' || !s.candidate_id || !s.joined_at) throw new PeerError(409, s.status === 'done' ? 'These ratings are already in.' : 'Your friend has not joined with the code yet.');
  const minutes = (now.getTime() - Date.parse(s.joined_at)) / 60_000;
  if (minutes < MIN_MINUTES) throw new PeerError(409, `Give the interview at least ${MIN_MINUTES} minutes — ask each question and let them answer fully.`);
  const note = String(input?.note || '').trim().slice(0, NOTE_MAX);
  if (/(https?:\/\/|www\.|\b\d{10}\b|\+91)/i.test(note)) throw new PeerError(400, 'Leave out links and phone numbers.');
  s.ratings = parseRatings(s, input?.ratings);
  s.note = note;
  s.status = 'done';
  s.done_at = now.toISOString();

  const day = istDate(now);
  const pairDone = peerSessionsOf(db).some((x) => x.id !== s.id && x.status === 'done' && x.done_at && istDate(new Date(x.done_at)) === day && (x.xp.interviewer > 0 || x.xp.candidate > 0)
    && [x.interviewer_id, x.candidate_id].sort().join() === [s.interviewer_id, s.candidate_id].sort().join());
  const grant = (uid: string, role: 'interviewer' | 'candidate', amount: number): string | null => {
    if (pairDone) return 'You two already earned points together today, so this one is for practice.';
    if (xpEarnedToday(db, uid, day, s.id).length >= XP_SESSIONS_PER_DAY) return `Points count for ${XP_SESSIONS_PER_DAY} peer interviews a day; this one is for practice.`;
    const a = awardXp(db, { userId: uid, key: `peer-mock:${s.id}:${role}`, reason: 'peer_mock', xp: amount, note: `Peer mock interview (${role})` });
    if (a.awarded) s.xp[role] = a.event.xp;
    syncUserXp(db, uid);
    return null;
  };
  const a = grant(s.interviewer_id, 'interviewer', PEER_XP.INTERVIEWER);
  const b = grant(s.candidate_id, 'candidate', PEER_XP.CANDIDATE);
  s.xp_note = a || b;
  return s;
}

// --- views ------------------------------------------------------------------------------

/**
 * What one participant sees. The interviewer gets the questions with key
 * points throughout; the candidate gets them only once the session is done.
 */
export function sessionView(db: any, userId: string, s: PeerSession, now = new Date()) {
  const role = s.interviewer_id === userId ? 'interviewer' : 'candidate';
  const status: PeerStatus = expired(s, now) ? 'cancelled' : s.status;
  const reveal = role === 'interviewer' || status === 'done';
  const questions = s.question_ids.map((id) => {
    const q = questionById(id)!;
    return {
      id,
      topic: q.topic,
      question: reveal ? q.question : null,
      key_points: reveal ? q.points.map((p) => p.label) : null,
      tip: reveal ? q.tip : null,
      rating: status === 'done' ? s.ratings[id] || null : null,
    };
  });
  const averages = status === 'done'
    ? Object.fromEntries(DIMENSIONS.map((d) => [d, Math.round((s.question_ids.reduce((n, id) => n + (s.ratings[id]?.[d] || 0), 0) / s.question_ids.length) * 10) / 10]))
    : null;
  return {
    id: s.id,
    role,
    kind: s.kind,
    status,
    code: role === 'interviewer' && status === 'open' ? s.code : null,
    partner: firstName(db, role === 'interviewer' ? s.candidate_id : s.interviewer_id),
    created_at: s.created_at,
    joined_at: s.joined_at,
    done_at: s.done_at,
    /** When the interviewer may submit (ISO), so the page can count down. */
    submit_after: s.joined_at ? new Date(Date.parse(s.joined_at) + MIN_MINUTES * 60_000).toISOString() : null,
    questions,
    averages,
    // The note goes to the candidate; the interviewer sees what they wrote.
    note: status === 'done' ? s.note || null : null,
    xp: status === 'done' ? s.xp[role] : 0,
    xp_note: status === 'done' ? s.xp_note : null,
  };
}

export function mySessions(db: any, userId: string, now = new Date()) {
  return peerSessionsOf(db)
    .filter((s) => s.interviewer_id === userId || s.candidate_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, SESSIONS_LISTED)
    .map((s) => sessionView(db, userId, s, now));
}

export function getSession(db: any, userId: string, id: string, now = new Date()) {
  return sessionView(db, userId, own(db, userId, id), now);
}

export const rubric = () => ({
  dimensions: DIMENSIONS.map((d) => ({ id: d, label: DIMENSION_LABEL[d] })),
  levels: [1, 2, 3].map((n) => ({ value: n, label: LEVEL_LABEL[n as 1 | 2 | 3] })),
  xp: PEER_XP,
  min_minutes: MIN_MINUTES,
});
