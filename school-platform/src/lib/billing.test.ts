import { describe, expect, it } from 'vitest';
import { computeInvoiceAmount, formatMoney, getPlan, seatUsage } from './billing';

describe('getPlan', () => {
  it('returns the plan spec', () => {
    expect(getPlan('PREMIUM').seatLimit).toBe(2000);
  });
});

describe('seatUsage', () => {
  it('reports remaining seats', () => {
    expect(seatUsage('BASIC', 50)).toEqual({ used: 50, limit: 200, remaining: 150, overLimit: false });
  });

  it('flags over-limit', () => {
    const u = seatUsage('STARTER', 60);
    expect(u.overLimit).toBe(true);
    expect(u.remaining).toBe(0);
  });
});

describe('computeInvoiceAmount', () => {
  it('multiplies seats by price', () => {
    expect(computeInvoiceAmount(100, 14_900)).toBe(1_490_000);
  });

  it('never returns a negative amount', () => {
    expect(computeInvoiceAmount(-5, 100)).toBe(0);
  });
});

describe('formatMoney', () => {
  it('formats paise into rupees', () => {
    expect(formatMoney(1_490_000)).toBe('₹14,900');
    expect(formatMoney(0)).toBe('₹0');
  });
});
