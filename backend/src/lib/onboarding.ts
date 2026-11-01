/**
 * Onboarding answers (PROFESSIONAL_PLATFORM_PLAN §1.3): year, branch,
 * interests and how the student wants to hear from us. Pure validation so the
 * route stays thin and the rules are testable.
 */
export const BRANCHES = ['cse', 'it', 'ece', 'eee', 'mech', 'civil', 'other'] as const;
export const INTERESTS = ['placements', 'coding', 'dsa', 'aptitude', 'company', 'semester', 'ai', 'interview', 'english'] as const;

export class OnboardingError extends Error {}

export interface OnboardingPatch {
  grad_year?: number;
  branch?: string;
  interests?: string[];
  notify?: { email: boolean; push: boolean; whatsapp: boolean };
  whatsapp?: { number: string; verified: boolean } | null;
}

/** Indian mobile numbers only for now: 10 digits starting 6-9, with or without +91. */
export function normaliseIndianMobile(raw: unknown): string | null {
  const digits = String(raw ?? '').replace(/[^\d]/g, '');
  const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;
  return /^[6-9]\d{9}$/.test(ten) ? `+91${ten}` : null;
}

export function parseOnboarding(body: any, now = new Date(), current?: { number: string; verified: boolean } | null): OnboardingPatch {
  const out: OnboardingPatch = {};
  if (body?.grad_year !== undefined && body.grad_year !== null) {
    const y = Number(body.grad_year);
    const t = now.getUTCFullYear();
    if (!Number.isInteger(y) || y < t - 6 || y > t + 6) throw new OnboardingError('Pick your graduation year.');
    out.grad_year = y;
  }
  if (body?.branch !== undefined && body.branch !== null) {
    if (!(BRANCHES as readonly string[]).includes(body.branch)) throw new OnboardingError('Pick your branch.');
    out.branch = body.branch;
  }
  if (Array.isArray(body?.interests)) {
    out.interests = [...new Set(body.interests.filter((i: unknown) => (INTERESTS as readonly string[]).includes(String(i))))] as string[];
  }
  if (body?.notify && typeof body.notify === 'object') {
    out.notify = { email: !!body.notify.email, push: !!body.notify.push, whatsapp: !!body.notify.whatsapp };
    if (out.notify.whatsapp) {
      const number = normaliseIndianMobile(body.whatsapp_number);
      if (!number) throw new OnboardingError('Enter a 10-digit Indian mobile number for WhatsApp.');
      // Keep "verified" only if the number did not change.
      out.whatsapp = { number, verified: !!(current && current.number === number && current.verified) };
    } else {
      out.whatsapp = null;
    }
  }
  return out;
}
