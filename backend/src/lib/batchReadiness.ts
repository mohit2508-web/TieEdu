/**
 * Batch readiness for a college's placement officer (UI_REDESIGN_PLAN_V2 §7.2:
 * "Batch readiness heatmap: students × target companies, coloured by
 * readiness" and "Segments: Not started, At risk, Ready").
 *
 * Pure: the caller supplies the college's student roster (from Postgres
 * `student_profile`) and the JSON store; this computes from the same records
 * the student sees on Today and on each company page, so a TPO and a student
 * never see two different numbers for the same thing.
 *
 * Privacy:
 *  - names only when the officer holds `placement.students.pii`; otherwise the
 *    roll number is the label;
 *  - no answers, no attempt history, no email — readiness, counts, last active.
 */
import { completionState } from './courses';
import { computeTrack, profilesOf } from './companyPageStudent';
import { studentPage } from './companyPageDerive';
import type { PageContent } from './companyPage';
import { dayDiff, istDate } from './streak';

export interface RosterRow {
  user_id: string;
  roll_no: string;
  branch: string | null;
  batch: string | null;
}

export type Segment = 'not_started' | 'at_risk' | 'in_progress' | 'ready';

export interface BatchReadiness {
  generated_at: string;
  companies: Array<{ id: string; name: string; slug: string; targeted_by: number }>;
  students: Array<{
    user_id: string;
    label: string;
    roll_no: string;
    branch: string | null;
    batch: string | null;
    readiness: Record<string, number | null>;
    average: number | null;
    tests: number;
    lessons: number;
    last_active: string | null;
    segment: Segment;
  }>;
  segments: Record<Segment, number>;
}

const MAX_COMPANIES = 8;

/** Readiness bands used for segments and the heatmap legend. */
export const READY_AT = 70;
export const RISK_BELOW = 50;
export const INACTIVE_DAYS = 14;

export function segmentFor(average: number | null, activity: number, lastActive: string | null, today: string): Segment {
  if (activity === 0) return 'not_started';
  const stale = !lastActive || dayDiff(lastActive, today) > INACTIVE_DAYS;
  if (stale || (average !== null && average < RISK_BELOW)) return 'at_risk';
  if (average !== null && average >= READY_AT) return 'ready';
  return 'in_progress';
}

export function buildBatchReadiness(db: any, roster: RosterRow[], opts: { withNames: boolean }, now = new Date()): BatchReadiness {
  const today = istDate(now);
  const ids = new Set(roster.map((r) => r.user_id));
  const published = (db.companies || []).filter((c: any) => c.status === 'published');

  // Which companies this batch is preparing for: prep profiles and purchases.
  const targeted = new Map<string, number>();
  for (const p of profilesOf(db)) if (ids.has(p.user_id)) targeted.set(p.company_id, (targeted.get(p.company_id) || 0) + 1);
  for (const u of db.unlocks || []) if (ids.has(u.user_id) && u.status !== 'revoked') targeted.set(u.company_id, (targeted.get(u.company_id) || 0) + 1);
  const companies = published
    .map((c: any) => ({ id: c.id, name: String(c.name), slug: String(c.slug), targeted_by: targeted.get(c.id) || 0 }))
    .sort((a: any, b: any) => b.targeted_by - a.targeted_by || (Number(published.find((x: any) => x.id === b.id)?.unlock_count) || 0) - (Number(published.find((x: any) => x.id === a.id)?.unlock_count) || 0))
    .slice(0, MAX_COMPANIES);
  const pages = new Map<string, PageContent | null>(
    companies.map((c: any) => [c.id, studentPage(db, published.find((x: any) => x.id === c.id))?.page || null])
  );

  const users = new Map<string, any>((db.users || []).map((u: any) => [u.id, u]));
  const courses = (db.courses || []).filter((c: any) => c.published);
  const streaks = new Map<string, any>((db.user_streaks || []).map((s: any) => [s.user_id, s]));

  const students = roster.map((row) => {
    const readiness: Record<string, number | null> = {};
    for (const c of companies) {
      const page = pages.get(c.id);
      readiness[c.id] = page ? computeTrack(db, row.user_id, page).overall : null;
    }
    const scores = Object.values(readiness).filter((v): v is number => v !== null);
    const average = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;

    const attempts = (db.attempts || []).filter((a: any) => a.userId === row.user_id && (a.status === 'submitted' || a.status === 'timed_out'));
    const lessons = courses.reduce((n: number, c: any) => n + completionState(db, row.user_id, c).completed, 0);
    const dates = [
      streaks.get(row.user_id)?.last_day || null,
      ...attempts.map((a: any) => (a.submittedAt || a.updated_at ? istDate(new Date(a.submittedAt || a.updated_at)) : null)),
    ].filter(Boolean) as string[];
    const lastActive = dates.length ? dates.sort().slice(-1)[0] : null;

    const user = users.get(row.user_id);
    return {
      user_id: row.user_id,
      label: opts.withNames && user?.name ? String(user.name) : row.roll_no,
      roll_no: row.roll_no,
      branch: row.branch,
      batch: row.batch,
      readiness,
      average,
      tests: attempts.length,
      lessons,
      last_active: lastActive,
      segment: segmentFor(average, attempts.length + lessons, lastActive, today),
    };
  });

  const segments: Record<Segment, number> = { not_started: 0, at_risk: 0, in_progress: 0, ready: 0 };
  for (const s of students) segments[s.segment]++;

  return { generated_at: now.toISOString(), companies, students, segments };
}
