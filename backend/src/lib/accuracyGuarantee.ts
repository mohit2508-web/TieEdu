/**
 * The accuracy guarantee (D4): "If a round's pattern was different from what
 * we showed, get your money back."
 *
 * Off until an admin turns it on (settings.accuracy_guarantee_enabled). It is
 * a claim-and-review flow, never an automatic payout: a student who paid for a
 * company's content and sat its interview files a claim within the window,
 * saying what differed; an admin approves or rejects it, and marks it
 * "refunded" only after returning the money through the payment provider.
 * Approved claims double as content corrections: they say what to fix.
 */
import crypto from 'crypto';

export const CLAIM_WINDOW_DAYS = 30;
export const DIFF_MIN = 40;
export const DIFF_MAX = 1500;
export const DEFAULT_AMOUNT = 99;

export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'refunded';
export interface AccuracyClaim {
  id: string;
  user_id: string;
  company_id: string;
  round: string;
  interview_date: string;
  what_differed: string;
  amount: number;
  status: ClaimStatus;
  admin_note: string;
  created_at: string;
  updated_at: string;
}

export class ClaimError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function guaranteeSettings(db: any) {
  const s = db.settings || {};
  const amount = Number(s.accuracy_guarantee_amount);
  return {
    enabled: s.accuracy_guarantee_enabled === true,
    amount: Number.isInteger(amount) && amount > 0 ? amount : DEFAULT_AMOUNT,
    window_days: CLAIM_WINDOW_DAYS,
  };
}

export function claimsOf(db: any): AccuracyClaim[] {
  if (!Array.isArray(db.accuracy_claims)) db.accuracy_claims = [];
  return db.accuracy_claims;
}

const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);

/** A paid, active unlock of this company's content. */
export function ownsCompany(db: any, userId: string, companyId: string): boolean {
  return (db.unlocks || []).some((u: any) => u.user_id === userId && u.company_id === companyId && (u.status === 'active' || !u.status));
}

export function fileClaim(db: any, userId: string, input: any, now = new Date()): AccuracyClaim {
  const g = guaranteeSettings(db);
  if (!g.enabled) throw new ClaimError(403, 'The accuracy guarantee is not available right now.');
  const company = (db.companies || []).find((c: any) => c.slug === String(input?.company_slug || '') && c.status === 'published');
  if (!company) throw new ClaimError(400, 'Choose the company.');
  if (!ownsCompany(db, userId, company.id)) throw new ClaimError(403, 'The guarantee covers content you bought. This company is not in your purchases.');
  const round = String(input?.round || '').trim().slice(0, 80);
  if (!round) throw new ClaimError(400, 'Which round was different?');
  const date = String(input?.interview_date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(dayMs(date))) throw new ClaimError(400, 'Enter the date of your interview.');
  const today = now.toISOString().slice(0, 10);
  if (dayMs(date) > dayMs(today)) throw new ClaimError(400, 'The interview date is in the future.');
  if ((dayMs(today) - dayMs(date)) / 86_400_000 > CLAIM_WINDOW_DAYS) throw new ClaimError(400, `Claims are open for ${CLAIM_WINDOW_DAYS} days after the interview.`);
  const diff = String(input?.what_differed || '').trim();
  if (diff.length < DIFF_MIN) throw new ClaimError(400, `Tell us what was different — at least ${DIFF_MIN} characters, so we can fix it.`);
  if (diff.length > DIFF_MAX) throw new ClaimError(400, `Keep it under ${DIFF_MAX} characters.`);
  if (claimsOf(db).some((c) => c.user_id === userId && c.company_id === company.id)) throw new ClaimError(409, 'You have already made a claim for this company.');
  const at = now.toISOString();
  const claim: AccuracyClaim = {
    id: `ac-${crypto.randomBytes(6).toString('hex')}`,
    user_id: userId,
    company_id: company.id,
    round,
    interview_date: date,
    what_differed: diff,
    amount: g.amount,
    status: 'pending',
    admin_note: '',
    created_at: at,
    updated_at: at,
  };
  claimsOf(db).push(claim);
  return claim;
}

const NEXT: Record<ClaimStatus, ClaimStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['refunded', 'rejected'],
  rejected: ['approved'],
  refunded: [],
};

export function reviewClaim(db: any, id: string, patch: any, now = new Date()): AccuracyClaim {
  const c = claimsOf(db).find((x) => x.id === id);
  if (!c) throw new ClaimError(404, 'Not found.');
  if (patch?.status !== undefined) {
    if (!NEXT[c.status].includes(patch.status)) throw new ClaimError(400, `A ${c.status} claim cannot become ${String(patch.status)}.`);
    c.status = patch.status;
  }
  if (typeof patch?.admin_note === 'string') c.admin_note = patch.admin_note.trim().slice(0, 500);
  c.updated_at = now.toISOString();
  return c;
}

const companyOf = (db: any, id: string) => (db.companies || []).find((c: any) => c.id === id);

export function myClaims(db: any, userId: string) {
  return claimsOf(db)
    .filter((c) => c.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((c) => ({ id: c.id, company: companyOf(db, c.company_id)?.name || 'Company', round: c.round, amount: c.amount, status: c.status, admin_note: c.admin_note, created_at: c.created_at }));
}

/** Companies a student can claim for: bought, published, not yet claimed. */
export function claimableCompanies(db: any, userId: string) {
  const claimed = new Set(claimsOf(db).filter((c) => c.user_id === userId).map((c) => c.company_id));
  return (db.companies || [])
    .filter((c: any) => c.status === 'published' && ownsCompany(db, userId, c.id) && !claimed.has(c.id))
    .map((c: any) => ({ slug: c.slug, name: c.name }));
}

export function adminClaims(db: any) {
  const users = new Map<string, any>((db.users || []).map((u: any) => [u.id, u]));
  return claimsOf(db)
    .slice()
    .sort((a, b) => Number(a.status !== 'pending') - Number(b.status !== 'pending') || b.created_at.localeCompare(a.created_at))
    .map((c) => ({ ...c, company: companyOf(db, c.company_id)?.name || c.company_id, student: users.get(c.user_id)?.name || 'Unknown', student_email: users.get(c.user_id)?.email || '' }));
}
