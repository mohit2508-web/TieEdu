/**
 * Parent view (UI_REDESIGN_PLAN_V2 §8: "opt-in by the student: a read-only
 * summary … Builds trust with the payer without surveilling the student").
 *
 * The student creates a private link and can revoke or replace it at any time.
 * The summary is effort and results — what they did each week, certificates,
 * readiness — not answers, not attempt-by-attempt scores, not when they logged
 * in. A parent sees roughly what the student would show them at dinner.
 */
import crypto from 'crypto';
import { addDays, istDate } from './streak';
import { buildToday } from './today';
import { buildPassport } from './passport';

export interface ParentLink {
  token: string;
  created_at: string;
}

export const newParentToken = () => crypto.randomBytes(18).toString('base64url');

export interface ParentView {
  first_name: string;
  year: string | null;
  streak: { current: number; best: number };
  weeks: Array<{ from: string; to: string; lessons: number; tests: number }>;
  certificates: Array<{ title: string; issued_at: string; verify_url: string }>;
  companies: Array<{ name: string; readiness: number; cleared: number; rounds: number }>;
  next_step: string;
}

export function buildParentView(db: any, user: any, now = new Date()): ParentView {
  const today = istDate(now);
  const t = buildToday(db, user.id, now);
  const p = buildPassport(db, { ...user, passport: { handle: '' } }, now);

  const finished = (db.attempts || []).filter((a: any) => a.userId === user.id && (a.status === 'submitted' || a.status === 'timed_out'));
  const ledger = (db.xp_ledger || []).filter((e: any) => e.user_id === user.id && e.reason === 'lesson_complete');
  const inRange = (iso: string | undefined, from: string, to: string) => {
    if (!iso) return false;
    const d = istDate(new Date(iso));
    return d >= from && d <= to;
  };
  const weeks = [3, 2, 1, 0].map((k) => {
    const to = addDays(today, -7 * k);
    const from = addDays(to, -6);
    return {
      from,
      to,
      lessons: ledger.filter((e: any) => inRange(e.created_at, from, to)).length,
      tests: finished.filter((a: any) => inRange(a.submittedAt || a.updated_at, from, to)).length,
    };
  });

  return {
    first_name: t.first_name,
    year: p.year,
    streak: { current: t.this_week.streak.current, best: t.this_week.streak.best },
    weeks,
    certificates: [
      ...p.certificates.map((c) => ({ title: c.title, issued_at: c.issued_at, verify_url: c.verify_url })),
      ...p.skills.filter((s) => s.certificate).map((s) => ({ title: `${s.name} skill test`, issued_at: '', verify_url: s.certificate!.verify_url })),
    ],
    companies: p.companies.map((c) => ({ name: c.name, readiness: c.readiness, cleared: c.cleared, rounds: c.rounds })),
    next_step: t.next_step.title,
  };
}
