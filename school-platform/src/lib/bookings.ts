import type { BookingStatus } from '@prisma/client';

/**
 * Bookings & seminars (Phase 6, spec §9). Pure status-machine + validation.
 */

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  REQUESTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function isUpcoming(status: BookingStatus, preferredAt: Date, now: Date = new Date()): boolean {
  return (status === 'REQUESTED' || status === 'CONFIRMED') && preferredAt.getTime() >= now.getTime();
}

export const BOOKING_STATUSES: BookingStatus[] = ['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export function bookingErrorMessage(code: 'PAST_DATE' | 'BAD_TRANSITION' | 'BAD_PARTICIPANTS'): string {
  switch (code) {
    case 'PAST_DATE':
      return 'Preferred date must be in the future';
    case 'BAD_TRANSITION':
      return 'That status change is not allowed';
    case 'BAD_PARTICIPANTS':
      return 'Participants must be between 1 and 100000';
  }
}
