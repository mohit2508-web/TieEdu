/**
 * Campus pages — a co-branded public page per college (UI_REDESIGN_PLAN_V2
 * §7.3: "aggregate (never individual) readiness").
 *
 * Off until the college's placement officer turns it on. The numbers are the
 * batch-readiness numbers (lib/batchReadiness), reduced to aggregates:
 *  - nothing per student, ever — not even a roll number;
 *  - no aggregate at all below MIN_STUDENTS linked students, because a small
 *    group's "average" identifies individuals;
 *  - a company's average only when MIN_PER_COMPANY students have a score for it.
 *
 * The on/off switch and the intro live in the JSON store (`db.campus_pages`),
 * so publishing a page needs no schema change to the placement database.
 */
import { buildBatchReadiness, RosterRow, Segment } from './batchReadiness';

export const MIN_STUDENTS = 10;
export const MIN_PER_COMPANY = 5;

export interface CampusPageSettings {
  college_id: string;
  enabled: boolean;
  intro: string;
  updated_by: string | null;
  updated_at: string | null;
}

export function campusPagesOf(db: any): CampusPageSettings[] {
  if (!Array.isArray(db.campus_pages)) db.campus_pages = [];
  return db.campus_pages;
}

export function campusSettings(db: any, collegeId: string): CampusPageSettings {
  return (
    campusPagesOf(db).find((p) => p.college_id === collegeId) || {
      college_id: collegeId,
      enabled: false,
      intro: '',
      updated_by: null,
      updated_at: null,
    }
  );
}

export interface CampusAggregate {
  students_linked: number;
  /** Null when fewer than MIN_STUDENTS students are linked. */
  segments: Record<Segment, number> | null;
  companies: Array<{ name: string; slug: string; preparing: number; average: number }>;
  min_students: number;
}

export function buildCampusAggregate(db: any, roster: RosterRow[], now = new Date()): CampusAggregate {
  const base = { students_linked: roster.length, min_students: MIN_STUDENTS };
  if (roster.length < MIN_STUDENTS) return { ...base, segments: null, companies: [] };

  const batch = buildBatchReadiness(db, roster, { withNames: false }, now);
  const pct = (n: number) => Math.round((n / roster.length) * 100);
  const segments = {
    not_started: pct(batch.segments.not_started),
    at_risk: pct(batch.segments.at_risk),
    in_progress: pct(batch.segments.in_progress),
    ready: pct(batch.segments.ready),
  };
  const companies = batch.companies
    .map((c) => {
      const scores = batch.students.map((s) => s.readiness[c.id]).filter((v): v is number => v !== null);
      if (scores.length < MIN_PER_COMPANY) return null;
      return {
        name: c.name,
        slug: c.slug,
        preparing: c.targeted_by,
        average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      };
    })
    .filter(Boolean) as CampusAggregate['companies'];
  return { ...base, segments, companies };
}
