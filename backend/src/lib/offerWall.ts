/**
 * Offer wall (C1): "Placed at TCS — here is the route that got me there."
 *
 * A student shares their offer and how they prepared. Nothing is public until
 * an admin approves it. "Verified" is a separate flag an admin sets after
 * confirming the offer out of band (an email exchange); TieEdu never asks for
 * or stores an offer letter, which is a personal document.
 *
 * The student chooses how they appear: first name, initials, or anonymous.
 * College and package are optional. The public view never carries a user id.
 */
import crypto from 'crypto';

export type OfferStatus = 'pending' | 'approved' | 'rejected';
export type NameMode = 'first_name' | 'initials' | 'anonymous';
export const NAME_MODES: NameMode[] = ['first_name', 'initials', 'anonymous'];
export const STORY_MIN = 80;
export const STORY_MAX = 1500;

export interface OfferStory {
  id: string;
  user_id: string;
  company_slug: string;
  role: string;
  ctc_lpa: number | null;
  story: string;
  name_mode: NameMode;
  college: string;
  status: OfferStatus;
  verified: boolean;
  created_at: string;
  moderated_at: string | null;
}

export class OfferError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function offersOf(db: any): OfferStory[] {
  if (!Array.isArray(db.offer_stories)) db.offer_stories = [];
  return db.offer_stories;
}

export function submitOffer(db: any, userId: string, input: any, now = new Date()): OfferStory {
  const slug = String(input?.company_slug || '');
  if (!(db.companies || []).some((c: any) => c.slug === slug && c.status === 'published')) throw new OfferError(400, 'Choose the company.');
  const role = String(input?.role || '').trim().slice(0, 80);
  if (role.length < 2) throw new OfferError(400, 'Add the role you were offered.');
  const story = String(input?.story || '').trim();
  if (story.length < STORY_MIN) throw new OfferError(400, `Tell juniors how you prepared — at least ${STORY_MIN} characters.`);
  if (story.length > STORY_MAX) throw new OfferError(400, `Keep it under ${STORY_MAX} characters.`);
  if (/(https?:\/\/|www\.|\b\d{10}\b)/i.test(story)) throw new OfferError(400, 'Leave out links and phone numbers.');
  const nameMode = (NAME_MODES as string[]).includes(input?.name_mode) ? (input.name_mode as NameMode) : 'first_name';
  let ctc: number | null = null;
  if (input?.ctc_lpa !== undefined && input?.ctc_lpa !== null && input?.ctc_lpa !== '') {
    ctc = Number(input.ctc_lpa);
    if (!Number.isFinite(ctc) || ctc <= 0 || ctc > 200) throw new OfferError(400, 'Enter the package in lakhs per year, or leave it blank.');
    ctc = Math.round(ctc * 10) / 10;
  }
  if (offersOf(db).some((o) => o.user_id === userId && o.status === 'pending')) {
    throw new OfferError(409, 'Your last story is still being reviewed. You can share another once it is checked.');
  }
  const o: OfferStory = {
    id: `of-${crypto.randomBytes(6).toString('hex')}`,
    user_id: userId,
    company_slug: slug,
    role,
    ctc_lpa: ctc,
    story,
    name_mode: nameMode,
    college: String(input?.college || '').trim().slice(0, 80),
    status: 'pending',
    verified: false,
    created_at: now.toISOString(),
    moderated_at: null,
  };
  offersOf(db).push(o);
  return o;
}

/** How the author appears publicly, from their account name and their choice. */
export function displayName(fullName: string, mode: NameMode): string {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (mode === 'anonymous' || parts.length === 0) return 'A TieEdu student';
  if (mode === 'initials') return parts.map((p) => p[0].toUpperCase() + '.').join(' ');
  return parts[0];
}

const companyName = (db: any, slug: string) => (db.companies || []).find((c: any) => c.slug === slug)?.name || slug;

/** The public wall: approved stories only, newest first, never a user id. */
export function publicWall(db: any, opts: { company?: string; limit?: number } = {}) {
  const users = new Map<string, any>((db.users || []).map((u: any) => [u.id, u]));
  const items = offersOf(db)
    .filter((o) => o.status === 'approved' && (!opts.company || o.company_slug === opts.company))
    .sort((a, b) => Number(b.verified) - Number(a.verified) || b.created_at.localeCompare(a.created_at))
    .slice(0, Math.min(opts.limit ?? 60, 100))
    .map((o) => ({
      id: o.id,
      company: companyName(db, o.company_slug),
      company_slug: o.company_slug,
      role: o.role,
      ctc_lpa: o.ctc_lpa,
      story: o.story,
      name: displayName(users.get(o.user_id)?.name || '', o.name_mode),
      college: o.college,
      verified: o.verified,
      created_at: o.created_at,
    }));
  const companies = Array.from(new Set(offersOf(db).filter((o) => o.status === 'approved').map((o) => o.company_slug)))
    .map((slug) => ({ slug, name: companyName(db, slug) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { items, companies };
}

export function myOffers(db: any, userId: string) {
  return offersOf(db)
    .filter((o) => o.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((o) => ({ id: o.id, company: companyName(db, o.company_slug), role: o.role, status: o.status, verified: o.verified, created_at: o.created_at }));
}

export function deleteMyOffer(db: any, userId: string, id: string): boolean {
  const list = offersOf(db);
  const i = list.findIndex((o) => o.id === id && o.user_id === userId);
  if (i === -1) return false;
  list.splice(i, 1);
  return true;
}

/** Admin: the queue (pending first) with the author's account name for context. */
export function adminQueue(db: any) {
  const users = new Map<string, any>((db.users || []).map((u: any) => [u.id, u]));
  return offersOf(db)
    .slice()
    .sort((a, b) => Number(a.status !== 'pending') - Number(b.status !== 'pending') || b.created_at.localeCompare(a.created_at))
    .map((o) => ({ ...o, company: companyName(db, o.company_slug), author: users.get(o.user_id)?.name || 'Unknown', author_email: users.get(o.user_id)?.email || '' }));
}

export function moderateOffer(db: any, id: string, patch: any, now = new Date()): OfferStory {
  const o = offersOf(db).find((x) => x.id === id);
  if (!o) throw new OfferError(404, 'Not found.');
  if (patch?.status !== undefined) {
    if (!['approved', 'rejected', 'pending'].includes(patch.status)) throw new OfferError(400, 'Unknown status.');
    o.status = patch.status;
    o.moderated_at = now.toISOString();
  }
  if (patch?.verified !== undefined) {
    if (typeof patch.verified !== 'boolean') throw new OfferError(400, 'verified must be true or false.');
    if (patch.verified && o.status !== 'approved') throw new OfferError(400, 'Approve a story before verifying it.');
    o.verified = patch.verified;
  }
  return o;
}
