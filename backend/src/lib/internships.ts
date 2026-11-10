/**
 * Internship board (Diwali 2026 plan §5).
 *
 * Listings are entered by an admin and nothing is invented: a listing is a real
 * opening with a real way to apply. Public readers see only `open` listings
 * whose deadline has not passed. Applying in-app needs a signed-in TiEEdu
 * member; a listing with an external `apply_url` sends the student there.
 */
import crypto from 'crypto';
import { isMember } from './festival';

export type InternshipStatus = 'draft' | 'open' | 'closed';
export type WorkMode = 'remote' | 'onsite' | 'hybrid';

export interface Internship {
  id: string;
  title: string;
  company: string;
  /** True for roles at TiEEdu itself — shown as "at TiEEdu". */
  is_tieedu: boolean;
  mode: WorkMode;
  location: string;
  stipend: string;
  duration: string;
  eligibility: string;
  description: string;
  apply_url: string;
  deadline: string | null;
  status: InternshipStatus;
  created_at: string;
  updated_at: string;
}

export interface InternshipApplication {
  id: string;
  internship_id: string;
  user_id: string;
  note: string;
  status: 'applied' | 'shortlisted' | 'rejected';
  created_at: string;
}

export class InternshipError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

function deadlinePassed(i: Internship, nowMs: number): boolean {
  if (!i.deadline) return false;
  const t = new Date(`${i.deadline}T23:59:59+05:30`).getTime();
  return Number.isFinite(t) && t < nowMs;
}

export function listOf(db: any): Internship[] {
  if (!Array.isArray(db.internships)) db.internships = [];
  return db.internships;
}

function appsOf(db: any): InternshipApplication[] {
  if (!Array.isArray(db.internship_applications)) db.internship_applications = [];
  return db.internship_applications;
}

export function publicInternships(db: any, userId: string | null, nowMs = Date.now()) {
  const applied = new Set(
    userId ? appsOf(db).filter((a) => a.user_id === userId).map((a) => a.internship_id) : []
  );
  return {
    member: isMember(db, userId, nowMs),
    internships: listOf(db)
      .filter((i) => i.status === 'open' && !deadlinePassed(i, nowMs))
      .map((i) => ({
        id: i.id, title: i.title, company: i.company, is_tieedu: i.is_tieedu, mode: i.mode,
        location: i.location, stipend: i.stipend, duration: i.duration, eligibility: i.eligibility,
        description: i.description, deadline: i.deadline, external: !!i.apply_url,
        apply_url: i.apply_url || null, applied: applied.has(i.id),
      })),
  };
}

export function applyToInternship(db: any, userId: string, id: string, note: unknown, nowMs = Date.now()): InternshipApplication {
  const i = listOf(db).find((x) => x.id === id);
  if (!i || i.status !== 'open' || deadlinePassed(i, nowMs)) throw new InternshipError(404, 'This internship is no longer open.');
  if (!isMember(db, userId, nowMs)) throw new InternshipError(403, 'Claim your free TiEEdu membership to apply.');
  if (i.apply_url) throw new InternshipError(400, 'Apply on the company page for this one.');
  const existing = appsOf(db).find((a) => a.internship_id === id && a.user_id === userId);
  if (existing) return existing;
  const app: InternshipApplication = {
    id: `iapp_${crypto.randomBytes(6).toString('hex')}`,
    internship_id: id,
    user_id: userId,
    note: str(note, 1000),
    status: 'applied',
    created_at: new Date(nowMs).toISOString(),
  };
  appsOf(db).push(app);
  return app;
}

/** Admin create/update. Unknown fields are dropped; required fields are checked. */
export function upsertInternship(db: any, input: any, id?: string): Internship {
  const now = new Date().toISOString();
  const existing = id ? listOf(db).find((x) => x.id === id) : undefined;
  if (id && !existing) throw new InternshipError(404, 'Internship not found');
  const mode: WorkMode = ['remote', 'onsite', 'hybrid'].includes(input?.mode) ? input.mode : existing?.mode || 'remote';
  const status: InternshipStatus = ['draft', 'open', 'closed'].includes(input?.status) ? input.status : existing?.status || 'draft';
  const deadlineRaw = str(input?.deadline ?? existing?.deadline, 10);
  const applyUrl = str(input?.apply_url ?? existing?.apply_url, 500);
  if (applyUrl && !/^https:\/\//i.test(applyUrl)) throw new InternshipError(400, 'Apply link must start with https://');
  const row: Internship = {
    id: existing?.id || `intern_${crypto.randomBytes(6).toString('hex')}`,
    title: str(input?.title ?? existing?.title, 120),
    company: str(input?.company ?? existing?.company, 120),
    is_tieedu: input?.is_tieedu !== undefined ? input.is_tieedu === true : existing?.is_tieedu === true,
    mode,
    location: str(input?.location ?? existing?.location, 120),
    stipend: str(input?.stipend ?? existing?.stipend, 80),
    duration: str(input?.duration ?? existing?.duration, 80),
    eligibility: str(input?.eligibility ?? existing?.eligibility, 300),
    description: str(input?.description ?? existing?.description, 3000),
    apply_url: applyUrl,
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadlineRaw) ? deadlineRaw : null,
    status,
    created_at: existing?.created_at || now,
    updated_at: now,
  };
  if (!row.title || !row.company) throw new InternshipError(400, 'Title and company are required');
  if (existing) Object.assign(existing, row);
  else listOf(db).push(row);
  return existing || row;
}

export function adminInternships(db: any) {
  const apps = appsOf(db);
  const users = db.users || [];
  return listOf(db).map((i) => ({
    ...i,
    applications: apps
      .filter((a) => a.internship_id === i.id)
      .map((a) => {
        const u = users.find((x: any) => x.id === a.user_id);
        return { ...a, name: u?.name || '', email: u?.email || '' };
      }),
  }));
}

/**
 * Drafts for TiEEdu's own roles, seeded once so the owner only has to review
 * and open them. They are never public until an admin sets status 'open'.
 */
export function seedTieEduInternshipDrafts(db: any): boolean {
  if (db.internships_seeded_diwali_2026) return false;
  const base = { company: 'TiEEdu', is_tieedu: true, mode: 'remote' as WorkMode, location: 'Remote (India)', apply_url: '', deadline: '2026-11-30', status: 'draft' as InternshipStatus };
  const drafts = [
    { title: 'Campus Ambassador', duration: '3 months', stipend: 'Owner to fill', eligibility: 'Any college student in India', description: 'Bring TiEEdu to your campus: run prep sessions, share drives and help classmates plan for placements.' },
    { title: 'Content Intern — Placement Prep', duration: '2–3 months', stipend: 'Owner to fill', eligibility: 'Final or pre-final year, strong aptitude and writing', description: 'Write and review company-wise prep lessons and practice questions with the TiEEdu team.' },
    { title: 'Community Intern', duration: '2 months', stipend: 'Owner to fill', eligibility: 'Any year, active on student communities', description: 'Help run the TiEEdu student community, answer doubts and host weekly prep check-ins.' },
  ];
  for (const d of drafts) upsertInternship(db, { ...base, ...d });
  db.internships_seeded_diwali_2026 = true;
  return true;
}
