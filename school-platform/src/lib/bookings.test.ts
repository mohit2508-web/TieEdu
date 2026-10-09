import { describe, expect, it } from 'vitest';
import { canTransition, isUpcoming } from './bookings';

describe('canTransition', () => {
  it('allows requested → confirmed/cancelled', () => {
    expect(canTransition('REQUESTED', 'CONFIRMED')).toBe(true);
    expect(canTransition('REQUESTED', 'CANCELLED')).toBe(true);
  });

  it('allows confirmed → completed/cancelled', () => {
    expect(canTransition('CONFIRMED', 'COMPLETED')).toBe(true);
    expect(canTransition('CONFIRMED', 'CANCELLED')).toBe(true);
  });

  it('rejects transitions out of terminal states', () => {
    expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false);
    expect(canTransition('CANCELLED', 'CONFIRMED')).toBe(false);
    expect(canTransition('REQUESTED', 'COMPLETED')).toBe(false);
  });
});

describe('isUpcoming', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  it('true for future open bookings', () => {
    expect(isUpcoming('CONFIRMED', new Date('2026-02-01T00:00:00Z'), now)).toBe(true);
  });
  it('false for past or terminal bookings', () => {
    expect(isUpcoming('REQUESTED', new Date('2025-12-01T00:00:00Z'), now)).toBe(false);
    expect(isUpcoming('COMPLETED', new Date('2026-02-01T00:00:00Z'), now)).toBe(false);
  });
});
