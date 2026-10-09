import type { Plan } from '@prisma/client';

/**
 * Commerce plans (Phase 5, spec §8). Pure pricing/seat maths, unit-testable.
 */

export interface PlanSpec {
  plan: Plan;
  label: string;
  seatLimit: number;
  /** Price per active seat, per billing period, in paise. */
  pricePerSeatPaise: number;
}

export const PLANS: Record<Plan, PlanSpec> = {
  STARTER: { plan: 'STARTER', label: 'Starter', seatLimit: 50, pricePerSeatPaise: 0 },
  BASIC: { plan: 'BASIC', label: 'Basic', seatLimit: 200, pricePerSeatPaise: 9_900 },
  PRO: { plan: 'PRO', label: 'Pro', seatLimit: 600, pricePerSeatPaise: 14_900 },
  PREMIUM: { plan: 'PREMIUM', label: 'Premium', seatLimit: 2000, pricePerSeatPaise: 19_900 },
};

export function getPlan(plan: Plan): PlanSpec {
  return PLANS[plan] ?? PLANS.STARTER;
}

export interface SeatUsage {
  used: number;
  limit: number;
  remaining: number;
  overLimit: boolean;
}

export function seatUsage(plan: Plan, activeMembers: number): SeatUsage {
  const { seatLimit } = getPlan(plan);
  const used = Math.max(0, activeMembers);
  return {
    used,
    limit: seatLimit,
    remaining: Math.max(0, seatLimit - used),
    overLimit: used > seatLimit,
  };
}

/** Amount for a period = seats billed × per-seat price (never negative). */
export function computeInvoiceAmount(seats: number, pricePerSeatPaise: number): number {
  return Math.max(0, Math.round(seats)) * Math.max(0, Math.round(pricePerSeatPaise));
}

export function formatMoney(paise: number, currency = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : currency + ' ';
  return `${symbol}${(paise / 100).toLocaleString('en-IN')}`;
}
