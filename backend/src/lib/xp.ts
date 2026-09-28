// ============================================================================
// XP LEDGER — the single source of truth for every point a learner holds.
//
// Design rules, in order of importance:
//
//  1. APPEND ONLY. Nothing is ever edited or deleted. If a point was granted in
//     error, the correction is a new negative row with reason 'reversal'. A
//     mutable counter cannot be audited and cannot be proven to a third party.
//  2. IDEMPOTENT. Every award carries a deterministic `key` (e.g.
//     "lesson:cfl-1-2"). The key is unique across the ledger, so replaying a
//     request, double-clicking a button or refreshing mid-request can never
//     mint a second grant for the same achievement.
//  3. SERVER AUTHORITATIVE. XP values come from the lesson record or the fixed
//     table below. No request body value is ever trusted as an amount.
//  4. USER.XP IS A CACHE. `user.xp` is recomputed by summing the ledger, so the
//     leaderboard can never drift from the audit trail.
// ============================================================================

import crypto from 'crypto';
import { loadDb, saveDb, XpEvent, User } from '../data/db';

export const XP = {
  /** Finishing a lesson's required content. */
  LESSON_COMPLETE: 25,
  /** Passing a lesson quiz. Granted once per quiz, on the first pass. */
  QUIZ_PASS: 40,
  /** Completing every lesson in a course. */
  COURSE_COMPLETE: 150,
  /** Submitting course feedback after finishing. */
  FEEDBACK: 25,
} as const;

/** Thresholds for the leaderboard level label. Derived, never stored. */
export const LEVELS = [
  { min: 0, label: 'Rookie' },
  { min: 300, label: 'Grinder' },
  { min: 900, label: 'Learner' },
  { min: 2000, label: 'Placement Ready' },
  { min: 5000, label: 'Alumni Core' },
] as const;

export function levelFor(xp: number): string {
  let label: string = LEVELS[0].label;
  for (const l of LEVELS) if (xp >= l.min) label = l.label;
  return label;
}

export function totalXpForUser(db: any, userId: string): number {
  return (db.xp_ledger || [])
    .filter((e: XpEvent) => e.user_id === userId)
    .reduce((sum: number, e: XpEvent) => sum + (Number(e.xp) || 0), 0);
}

/**
 * Append one XP grant. Returns the ledger row plus whether it was newly
 * created — callers use `awarded` to decide between "you earned 25 XP" and
 * "already recorded", so a refresh can never claim a false award.
 */
export function awardXp(
  db: any,
  opts: {
    userId: string;
    key: string;
    reason: XpEvent['reason'];
    xp: number;
    courseId?: string | null;
    lessonId?: string | null;
    note?: string;
  }
): { event: XpEvent; awarded: boolean } {
  db.xp_ledger = db.xp_ledger || [];

  const existing = db.xp_ledger.find((e: XpEvent) => e.key === opts.key);
  if (existing) return { event: existing, awarded: false };

  const event: XpEvent = {
    id: `xp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    user_id: opts.userId,
    course_id: opts.courseId ?? null,
    lesson_id: opts.lessonId ?? null,
    key: opts.key,
    reason: opts.reason,
    xp: Math.round(opts.xp),
    created_at: new Date().toISOString(),
    note: opts.note || '',
  };

  db.xp_ledger.push(event);
  return { event, awarded: true };
}

/**
 * Recompute user.xp from the ledger and persist. Called after every award and
 * after every revocation so the cached total can never disagree with the rows.
 */
export function syncUserXp(db: any, userId: string) {
  const user: User | undefined = (db.users || []).find((u: User) => u.id === userId);
  if (!user) return 0;
  const total = totalXpForUser(db, userId);
  user.xp = total;
  return total;
}

export interface XpHistoryItem {
  id: string;
  reason: XpEvent['reason'];
  xp: number;
  course_id: string | null;
  course_title: string | null;
  lesson_id: string | null;
  lesson_title: string | null;
  created_at: string;
  note: string;
}

/** Human-readable XP timeline, newest first, with course/lesson titles resolved. */
export function xpHistory(db: any, userId: string, limit = 100): XpHistoryItem[] {
  const rows: XpEvent[] = (db.xp_ledger || []).filter((e: XpEvent) => e.user_id === userId);
  const titles = courseTitleIndex(db);

  return rows
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map((e) => ({
      id: e.id,
      reason: e.reason,
      xp: e.xp,
      course_id: e.course_id,
      course_title: e.course_id ? titles.courses.get(e.course_id) || null : null,
      lesson_id: e.lesson_id,
      lesson_title: e.lesson_id ? titles.lessons.get(e.lesson_id) || null : null,
      created_at: e.created_at,
      note: e.note,
    }));
}

function courseTitleIndex(db: any) {
  const courses = new Map<string, string>();
  const lessons = new Map<string, string>();
  for (const c of db.courses || []) {
    courses.set(c.id, c.title);
    for (const m of c.modules || []) {
      for (const l of m.lessons || []) lessons.set(l.id, l.title);
    }
  }
  return { courses, lessons };
}

/**
 * Award XP and commit in one shot. This is the only entry point the route
 * handlers use, so there is no path that mutates XP without leaving an audit
 * row behind.
 */
export function awardAndCommit(
  db: any,
  opts: Parameters<typeof awardXp>[1]
): { event: XpEvent; awarded: boolean; total_xp: number } {
  const { event, awarded } = awardXp(db, opts);
  const total = syncUserXp(db, opts.userId);
  saveDb(db);
  return { event, awarded, total_xp: total };
}
