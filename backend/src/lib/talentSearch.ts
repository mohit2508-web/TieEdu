/**
 * Verified skill search for small recruiters (E4).
 *
 * The rules (set by the platform owner):
 *  - Recruiters: anyone signed in may apply with company, website and work
 *    email; a TieEdu admin approves each one before they can search. Admins
 *    can also reject or suspend.
 *  - Students opt in to being searchable, and can stop at any time.
 *  - Results are anonymous: "Candidate #A7F2C9", verified skill scores and
 *    levels, certificate titles marked verified, and the branch, graduation
 *    year and city the student chose to list. No name, college, photo or
 *    contact — and no certificate verify links either, since those pages show
 *    the holder's name. Links come with the contact once the student accepts.
 *  - Contact: the recruiter sends an interest request (role, location, pay
 *    range, a short note). The student accepts, which shares their name and
 *    email with that recruiter only, or declines. INTEREST_PER_WEEK requests
 *    per recruiter in any rolling week; one open request per pair; after a
 *    decline, the same recruiter waits DECLINE_COOLDOWN_DAYS.
 *  - Free for now, behind settings.recruiter_search_enabled (off by default).
 */
import crypto from 'crypto';
import { buildPassport } from './passport';

export const INTEREST_PER_WEEK = 20;
export const DECLINE_COOLDOWN_DAYS = 30;
export const RESULTS_MAX = 50;
export const NOTE_MAX = 300;
const DAY = 86_400_000;

/** Personal mail providers: a work email has to be on the company's own domain. */
const FREE_MAIL = new Set(['gmail.com', 'yahoo.com', 'yahoo.in', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'rediffmail.com', 'aol.com', 'proton.me', 'protonmail.com', 'zoho.com', 'gmx.com', 'yandex.com', 'mail.com']);

export type RecruiterStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export interface Recruiter {
  id: string;
  user_id: string;
  company: string;
  website: string;
  work_email: string;
  status: RecruiterStatus;
  applied_at: string;
  decided_by: string | null;
  decided_at: string | null;
  admin_note: string | null;
}
export interface TalentProfile { visible: boolean; handle: string; branch: string | null; grad_year: number | null; city: string | null; opted_in_at: string }
export type InterestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';
export interface Interest {
  id: string;
  recruiter_id: string;
  student_id: string;
  role: string;
  location: string;
  pay_range: string;
  note: string;
  status: InterestStatus;
  created_at: string;
  decided_at: string | null;
}

export class TalentError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function recruitersOf(db: any): Recruiter[] {
  if (!Array.isArray(db.recruiters)) db.recruiters = [];
  return db.recruiters;
}
export function interestsOf(db: any): Interest[] {
  if (!Array.isArray(db.recruiter_interests)) db.recruiter_interests = [];
  return db.recruiter_interests;
}
export const searchEnabled = (db: any) => db.settings?.recruiter_search_enabled === true;
const userOf = (db: any, id: string) => (db.users || []).find((u: any) => u.id === id) || null;
const clean = (v: unknown, max: number) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
const hasContact = (s: string) => /(https?:\/\/|www\.|\b\d{10}\b|\+91|[^\s@]+@[^\s@]+\.)/i.test(s);

// --- recruiters ----------------------------------------------------------------------------

export function applyAsRecruiter(db: any, userId: string, input: any, now = new Date()): Recruiter {
  const company = clean(input?.company, 80);
  if (company.length < 2) throw new TalentError(400, 'Enter your company’s name.');
  let website = clean(input?.website, 120).toLowerCase();
  if (!/^https?:\/\//.test(website)) website = `https://${website}`;
  let host: string;
  try { host = new URL(website).hostname.replace(/^www\./, ''); } catch { throw new TalentError(400, 'Enter your company’s website.'); }
  if (!/\.[a-z]{2,}$/.test(host)) throw new TalentError(400, 'Enter your company’s website.');
  const work_email = clean(input?.work_email, 120).toLowerCase();
  const m = /^[^\s@]+@([^\s@]+\.[a-z]{2,})$/.exec(work_email);
  if (!m) throw new TalentError(400, 'Enter your work email.');
  if (FREE_MAIL.has(m[1])) throw new TalentError(400, 'Use your work email on your company’s domain, not a personal address.');

  const existing = recruitersOf(db).find((r) => r.user_id === userId);
  if (existing && (existing.status === 'pending' || existing.status === 'approved')) throw new TalentError(409, existing.status === 'approved' ? 'You are already a verified recruiter.' : 'Your application is being reviewed.');
  if (existing?.status === 'suspended') throw new TalentError(403, 'This recruiter account is suspended. Contact TieEdu support.');
  const r: Recruiter = { id: existing?.id || `rec-${crypto.randomBytes(6).toString('hex')}`, user_id: userId, company, website, work_email, status: 'pending', applied_at: now.toISOString(), decided_by: null, decided_at: null, admin_note: null };
  if (existing) Object.assign(existing, r);
  else recruitersOf(db).push(r);
  return existing || r;
}

export function reviewRecruiter(db: any, adminId: string, id: string, input: any, now = new Date()): Recruiter {
  const r = recruitersOf(db).find((x) => x.id === id);
  if (!r) throw new TalentError(404, 'Recruiter not found.');
  const status = String(input?.status || '') as RecruiterStatus;
  if (!['approved', 'rejected', 'suspended'].includes(status)) throw new TalentError(400, 'Choose approve, reject or suspend.');
  if (status === 'suspended' && r.status !== 'approved') throw new TalentError(409, 'Only an approved recruiter can be suspended.');
  r.status = status;
  r.decided_by = adminId;
  r.decided_at = now.toISOString();
  r.admin_note = clean(input?.admin_note, 200) || null;
  // A suspended recruiter's open requests are withdrawn so students are not left waiting.
  if (status === 'suspended') for (const i of interestsOf(db)) if (i.recruiter_id === r.id && i.status === 'pending') { i.status = 'withdrawn'; i.decided_at = now.toISOString(); }
  return r;
}

export function approvedRecruiter(db: any, userId: string): Recruiter {
  const r = recruitersOf(db).find((x) => x.user_id === userId);
  if (!r || r.status !== 'approved') throw new TalentError(403, r?.status === 'pending' ? 'Your recruiter application is still being reviewed.' : 'Only verified recruiters can search.');
  if (!searchEnabled(db)) throw new TalentError(503, 'Recruiter search is not open yet.');
  return r;
}

// --- students ------------------------------------------------------------------------------

export function setTalentProfile(db: any, userId: string, input: any, now = new Date()): TalentProfile | null {
  const user = userOf(db, userId);
  if (!user) throw new TalentError(404, 'Account not found.');
  if (input?.visible !== true) {
    if (user.talent) user.talent.visible = false;
    return user.talent || null;
  }
  const year = Number(input?.grad_year);
  const nowYear = now.getUTCFullYear();
  const t: TalentProfile = {
    visible: true,
    // Keep the handle across opt-outs so a recruiter's accepted contact still lines up.
    handle: user.talent?.handle || crypto.randomBytes(3).toString('hex').toUpperCase(),
    branch: clean(input?.branch, 40) || null,
    grad_year: Number.isInteger(year) && year >= nowYear - 5 && year <= nowYear + 6 ? year : null,
    city: clean(input?.city, 40) || null,
    opted_in_at: user.talent?.opted_in_at || now.toISOString(),
  };
  user.talent = t;
  return t;
}

/** The anonymous card a recruiter sees. Never a name, email, college or link. */
export function candidateCard(db: any, user: any) {
  const p = buildPassport(db, { ...user, passport: { handle: '' } });
  return {
    handle: `Candidate #${user.talent.handle}`,
    id: user.talent.handle,
    branch: user.talent.branch,
    grad_year: user.talent.grad_year,
    city: user.talent.city,
    skills: p.skills.map((s) => ({ name: s.name, slug: s.slug, score: Math.round(s.score), level: s.level, certified: !!s.certificate })),
    certificates: p.certificates.map((c) => ({ title: c.title, verified: true })),
  };
}

export function searchCandidates(db: any, userId: string, q: any) {
  approvedRecruiter(db, userId);
  const skill = clean(q?.skill, 60);
  const minScore = Math.max(0, Math.min(100, Number(q?.min_score) || 0));
  const year = Number(q?.grad_year) || null;
  const branch = clean(q?.branch, 40).toLowerCase();
  const city = clean(q?.city, 40).toLowerCase();
  const cards = (db.users || [])
    .filter((u: any) => u.talent?.visible === true && !u.disabled && u.role !== 'admin')
    .filter((u: any) => (!year || u.talent.grad_year === year) && (!branch || String(u.talent.branch || '').toLowerCase().includes(branch)) && (!city || String(u.talent.city || '').toLowerCase().includes(city)))
    .map((u: any) => candidateCard(db, u))
    // Only students with at least one verified score are worth a recruiter's time.
    .filter((c: any) => c.skills.length > 0);
  const scoreFor = (c: any) => (skill ? c.skills.find((s: any) => s.slug === skill)?.score ?? -1 : Math.max(...c.skills.map((s: any) => s.score)));
  return cards
    .filter((c: any) => scoreFor(c) >= minScore && (!skill || scoreFor(c) >= 0))
    .sort((a: any, b: any) => scoreFor(b) - scoreFor(a))
    .slice(0, RESULTS_MAX);
}

// --- interest -------------------------------------------------------------------------------

export interface InterestSent { interest: Interest; push: { userId: string; title: string; body: string; url: string } }

export function sendInterest(db: any, userId: string, input: any, now = new Date()): InterestSent {
  const r = approvedRecruiter(db, userId);
  const handle = String(input?.candidate || '').replace(/^Candidate #/i, '').toUpperCase();
  const student = (db.users || []).find((u: any) => u.talent?.visible === true && u.talent.handle === handle);
  if (!student) throw new TalentError(404, 'That candidate is no longer available.');
  if (student.id === userId) throw new TalentError(400, 'That is you.');
  const role = clean(input?.role, 80);
  const location = clean(input?.location, 60);
  const pay_range = clean(input?.pay_range, 40);
  const note = clean(input?.note, NOTE_MAX);
  if (!role || !location || !pay_range) throw new TalentError(400, 'Add the role, the location and the pay range — students decide on these.');
  if ([role, location, pay_range, note].some(hasContact)) throw new TalentError(400, 'Leave out links, phone numbers and emails. They are shared when the student accepts.');

  const mine = interestsOf(db).filter((i) => i.recruiter_id === r.id);
  if (mine.filter((i) => now.getTime() - Date.parse(i.created_at) < 7 * DAY).length >= INTEREST_PER_WEEK) throw new TalentError(429, `You can send ${INTEREST_PER_WEEK} requests a week. Try again in a few days.`);
  const pair = mine.filter((i) => i.student_id === student.id);
  if (pair.some((i) => i.status === 'pending')) throw new TalentError(409, 'You already have a request waiting with this candidate.');
  if (pair.some((i) => i.status === 'accepted')) throw new TalentError(409, 'This candidate already shared their contact with you.');
  const declined = pair.filter((i) => i.status === 'declined').sort((a, b) => String(b.decided_at).localeCompare(String(a.decided_at)))[0];
  if (declined && now.getTime() - Date.parse(declined.decided_at || declined.created_at) < DECLINE_COOLDOWN_DAYS * DAY) throw new TalentError(409, 'This candidate declined recently. You can ask again after 30 days.');

  const i: Interest = { id: `int-${crypto.randomBytes(6).toString('hex')}`, recruiter_id: r.id, student_id: student.id, role, location, pay_range, note, status: 'pending', created_at: now.toISOString(), decided_at: null };
  interestsOf(db).push(i);
  return { interest: i, push: { userId: student.id, title: `${r.company} is interested in you`, body: `${role} · ${location} · ${pay_range}. Open TieEdu to accept or decline.`, url: '/talent' } };
}

export function decideInterest(db: any, studentId: string, id: string, accept: boolean, now = new Date()): Interest {
  const i = interestsOf(db).find((x) => x.id === id && x.student_id === studentId);
  if (!i) throw new TalentError(404, 'That request was not found.');
  if (i.status !== 'pending') throw new TalentError(409, 'You have already answered this request.');
  i.status = accept ? 'accepted' : 'declined';
  i.decided_at = now.toISOString();
  return i;
}

export function withdrawInterest(db: any, userId: string, id: string, now = new Date()): Interest {
  const r = recruitersOf(db).find((x) => x.user_id === userId);
  const i = interestsOf(db).find((x) => x.id === id && x.recruiter_id === r?.id);
  if (!i) throw new TalentError(404, 'That request was not found.');
  if (i.status !== 'pending') throw new TalentError(409, 'Only a waiting request can be withdrawn.');
  i.status = 'withdrawn';
  i.decided_at = now.toISOString();
  return i;
}

// --- views ------------------------------------------------------------------------------------

/** The student's side: their profile, what a recruiter would see, and requests. */
export function studentTalentView(db: any, userId: string) {
  const user = userOf(db, userId);
  const recruiters = new Map(recruitersOf(db).map((r) => [r.id, r]));
  return {
    enabled: searchEnabled(db),
    profile: user?.talent || null,
    preview: user?.talent ? candidateCard(db, user) : null,
    requests: interestsOf(db)
      .filter((i) => i.student_id === userId && i.status !== 'withdrawn')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((i) => {
        const r = recruiters.get(i.recruiter_id);
        return { id: i.id, status: i.status, company: r?.company || 'A company', website: r?.website || null, role: i.role, location: i.location, pay_range: i.pay_range, note: i.note, created_at: i.created_at };
      }),
  };
}

/** The recruiter's side: status, and requests with contact only once accepted. */
export function recruiterView(db: any, userId: string) {
  const r = recruitersOf(db).find((x) => x.user_id === userId) || null;
  if (!r) return { recruiter: null, enabled: searchEnabled(db), requests: [] };
  const week = interestsOf(db).filter((i) => i.recruiter_id === r.id && Date.now() - Date.parse(i.created_at) < 7 * DAY).length;
  return {
    recruiter: { company: r.company, website: r.website, work_email: r.work_email, status: r.status, admin_note: r.status === 'rejected' ? r.admin_note : null },
    enabled: searchEnabled(db),
    limits: { per_week: INTEREST_PER_WEEK, used_this_week: week },
    requests: interestsOf(db)
      .filter((i) => i.recruiter_id === r.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((i) => {
        const s = userOf(db, i.student_id);
        const accepted = i.status === 'accepted' && s;
        return {
          id: i.id,
          status: i.status,
          candidate: s?.talent ? `Candidate #${s.talent.handle}` : 'Candidate',
          role: i.role,
          created_at: i.created_at,
          contact: accepted ? {
            name: String(s.name || ''),
            email: String(s.email || ''),
            certificates: buildPassport(db, { ...s, passport: { handle: '' } }).certificates.map((c) => ({ title: c.title, verify_url: c.verify_url })),
          } : null,
        };
      }),
  };
}

export function adminRecruiters(db: any) {
  const users = new Map<string, any>((db.users || []).map((u: any) => [u.id, u]));
  return {
    enabled: searchEnabled(db),
    searchable_students: (db.users || []).filter((u: any) => u.talent?.visible === true).length,
    recruiters: recruitersOf(db)
      .slice()
      .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || b.applied_at.localeCompare(a.applied_at))
      .map((r) => ({ ...r, account_email: users.get(r.user_id)?.email || null, requests: interestsOf(db).filter((i) => i.recruiter_id === r.id).length })),
  };
}
