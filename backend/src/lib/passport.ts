/**
 * Placement Passport — one public page per student (UI_REDESIGN_PLAN_V2 §6.2).
 *
 * Privacy is the design constraint, not an afterthought:
 *  - Off by default. Nothing is public until the student turns it on and picks
 *    a handle; turning it off makes the URL 404 immediately.
 *  - Only results are published: name, year, best score per skill, verified
 *    certificates, company readiness and totals. Never the email, never the
 *    college (not ours to publish), never attempt-by-attempt history.
 *  - Every certificate links to its own verification page, so the passport
 *    claims nothing a viewer cannot check.
 */
import { completionState } from './courses';
import { computeTrack, profilesOf } from './companyPageStudent';
import { studentPage } from './companyPageDerive';
import { streakView } from './streak';
import { totalXpForUser } from './xp';
import { yearLabel } from './today';

export interface PassportSettings {
  public: boolean;
  handle: string | null;
}

export const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

/** Words that read as official pages or that other routes may want. */
const RESERVED = new Set([
  'admin', 'api', 'tieedu', 'support', 'help', 'login', 'signup', 'settings', 'me', 'official', 'team', 'staff',
  'about', 'privacy', 'terms', 'verify', 'certificate', 'certificates', 'passport', 'campus', 'tpo', 'college',
]);

export function passportOf(user: any): PassportSettings {
  return { public: user?.passport?.public === true, handle: user?.passport?.handle || null };
}

export function handleError(db: any, userId: string, raw: unknown): string | null {
  const h = String(raw || '').trim().toLowerCase();
  if (!HANDLE_RE.test(h)) return 'Use 3–30 lowercase letters, numbers or hyphens, starting and ending with a letter or number.';
  if (RESERVED.has(h)) return 'That handle is reserved. Try another.';
  const taken = (db.users || []).some((u: any) => u.id !== userId && u.passport?.handle === h);
  return taken ? 'That handle is taken. Try another.' : null;
}

/** A first suggestion: first name, made unique with a number when needed. */
export function suggestHandle(db: any, user: any): string {
  const base =
    String(user?.name || 'student')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 20) || 'student';
  const padded = base.length < 3 ? `${base}-tie` : base;
  for (let i = 0; i < 1000; i++) {
    const candidate = i === 0 ? padded : `${padded}-${i + 1}`;
    if (!handleError(db, user.id, candidate)) return candidate;
  }
  return `${padded}-${Date.now().toString(36)}`;
}

export interface PassportView {
  handle: string;
  name: string;
  year: string | null;
  xp: number;
  best_streak: number;
  skills: Array<{ name: string; slug: string; score: number; level: string | null; certificate: { number: string; verify_url: string } | null }>;
  certificates: Array<{ title: string; serial: string; issued_at: string; verify_url: string }>;
  companies: Array<{ name: string; slug: string; readiness: number; cleared: number; rounds: number }>;
  courses_completed: number;
}

/** The public view. Callers must check `passportOf(user).public` first. */
export function buildPassport(db: any, user: any, now = new Date()): PassportView {
  const userId = user.id;

  // Best finished attempt per skill.
  const skills = new Map<string, any>((db.skills || []).map((s: any) => [s.id, s]));
  const best = new Map<string, any>();
  for (const a of db.attempts || []) {
    if (a.userId !== userId || (a.status !== 'submitted' && a.status !== 'timed_out')) continue;
    const cur = best.get(a.skillId);
    if (!cur || (Number(a.percentage) || 0) > (Number(cur.percentage) || 0)) best.set(a.skillId, a);
  }
  const certBySkill = new Map<string, any>();
  for (const c of db.skillCertificates || []) {
    if (c.userId !== userId || c.status === 'revoked') continue;
    const cur = certBySkill.get(c.skillId);
    if (!cur || (Number(c.score) || 0) > (Number(cur.score) || 0)) certBySkill.set(c.skillId, c);
  }
  const skillRows = [...best.entries()]
    .map(([skillId, a]) => {
      const s = skills.get(skillId);
      if (!s) return null;
      const cert = certBySkill.get(skillId);
      return {
        name: String(s.name),
        slug: String(s.slug),
        score: Number(a.percentage) || 0,
        level: a.skillLevel || null,
        certificate: cert ? { number: String(cert.certificateNumber || cert.certificateId), verify_url: `/skill-test/certificates/${cert.certificateId}` } : null,
      };
    })
    .filter(Boolean)
    .sort((x: any, y: any) => y.score - x.score) as PassportView['skills'];

  const certificates = (db.certificates || [])
    .filter((c: any) => c.user_id === userId && c.status === 'active')
    .map((c: any) => ({ title: String(c.course_title), serial: String(c.serial), issued_at: String(c.issued_at), verify_url: `/verify/${encodeURIComponent(c.serial)}` }))
    .sort((a: any, b: any) => b.issued_at.localeCompare(a.issued_at));

  // Readiness only where there is a score: a ring at 0% for an untouched
  // company would publish a number the student never earned.
  const targetIds = new Set<string>();
  for (const p of profilesOf(db)) if (p.user_id === userId) targetIds.add(p.company_id);
  for (const u of db.unlocks || []) if (u.user_id === userId && u.status !== 'revoked') targetIds.add(u.company_id);
  const companies = [...targetIds]
    .map((id) => (db.companies || []).find((c: any) => c.id === id && c.status === 'published'))
    .filter(Boolean)
    .map((company: any) => {
      const hit = studentPage(db, company);
      if (!hit) return null;
      const track = computeTrack(db, userId, hit.page);
      if (track.overall === null) return null;
      const route = hit.page.sections.find((x) => x.type === 'rounds_route');
      const passMark = Number(route?.data.pass_mark) || 70;
      return {
        name: String(company.name),
        slug: String(company.slug),
        readiness: track.overall,
        cleared: track.stations.filter((s) => (s.score ?? -1) >= passMark).length,
        rounds: ((route?.data.stations as any[]) || []).length,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.readiness - a.readiness) as PassportView['companies'];

  const coursesCompleted = (db.courses || []).filter((c: any) => c.published && completionState(db, userId, c).is_complete).length;

  return {
    handle: String(user.passport?.handle),
    name: String(user.name || 'TieEdu student'),
    year: Number.isFinite(user.grad_year) ? yearLabel(user.grad_year, now) : null,
    xp: totalXpForUser(db, userId),
    best_streak: streakView(db, userId, now).best,
    skills: skillRows,
    certificates,
    companies,
    courses_completed: coursesCompleted,
  };
}
