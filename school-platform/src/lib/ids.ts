import { randomInt, randomBytes } from 'node:crypto';

/**
 * School sign-up code, e.g. "GVTA-4821".
 *
 * Derived from the school name (so it is recognisable to the school) plus a
 * random 4-digit suffix so two "Green Valley" schools cannot collide. Callers
 * retry on the rare unique-constraint clash.
 */
export function generateSchoolCode(name: string): string {
  const letters = name
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X');
  return `${letters}-${randomInt(1000, 10000)}`;
}

/** Short opaque referral code. */
export function generateReferralCode(): string {
  return randomBytes(5).toString('hex').toUpperCase();
}

export function randomToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}
