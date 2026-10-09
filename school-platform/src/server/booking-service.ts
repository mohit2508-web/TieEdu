import 'server-only';
import type { BookingStatus, BookingType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { forSchool } from '@/lib/tenant';
import { recordAudit } from '@/lib/audit';
import { bookingErrorMessage, canTransition } from '@/lib/bookings';
import { DomainError } from './errors';

/**
 * Bookings & seminars (Phase 6, spec §9). School requests are tenant-scoped.
 */

export async function listBookings(schoolId: string) {
  const db = forSchool(schoolId);
  return db.booking.findMany({ orderBy: { preferredAt: 'desc' } });
}

export interface CreateBookingInput {
  type: BookingType;
  title: string;
  preferredAt: Date;
  mode?: string;
  participants?: number;
  notes?: string | null;
}

export async function createBooking(
  schoolId: string,
  input: CreateBookingInput,
  actorUserId: string
) {
  if (input.preferredAt.getTime() < Date.now()) {
    throw new DomainError('INVALID', bookingErrorMessage('PAST_DATE'));
  }
  const participants = input.participants ?? 0;
  if (participants < 0 || participants > 100_000) {
    throw new DomainError('INVALID', bookingErrorMessage('BAD_PARTICIPANTS'));
  }

  const db = forSchool(schoolId);
  const booking = await db.booking.create({
    data: {
      schoolId,
      type: input.type,
      title: input.title,
      preferredAt: input.preferredAt,
      mode: input.mode ?? 'ONLINE',
      participants,
      notes: input.notes ?? null,
      requestedById: actorUserId,
    },
  });
  await recordAudit({
    actorUserId,
    schoolId,
    action: 'booking.create',
    targetType: 'Booking',
    targetId: booking.id,
  });
  return booking;
}

export async function updateBookingStatus(
  schoolId: string,
  bookingId: string,
  status: BookingStatus,
  actorUserId: string
) {
  const db = forSchool(schoolId);
  const booking = await db.booking.findFirst({ where: { id: bookingId } });
  if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
  if (!canTransition(booking.status, status)) {
    throw new DomainError('INVALID', bookingErrorMessage('BAD_TRANSITION'));
  }

  const updated = await db.booking.update({ where: { id: bookingId }, data: { status } });
  await recordAudit({
    actorUserId,
    schoolId,
    action: `booking.${status.toLowerCase()}`,
    targetType: 'Booking',
    targetId: bookingId,
  });
  return updated;
}

/** Platform-wide view for the bookings console. */
export async function listAllBookings() {
  const rows = await prisma.booking.findMany({
    orderBy: { preferredAt: 'desc' },
    include: { school: { select: { id: true, name: true } } },
  });
  return rows.map((b) => ({
    id: b.id,
    schoolId: b.schoolId,
    schoolName: b.school.name,
    type: b.type,
    title: b.title,
    preferredAt: b.preferredAt,
    mode: b.mode,
    participants: b.participants,
    status: b.status,
  }));
}

export async function updateBookingStatusGlobal(
  bookingId: string,
  status: BookingStatus,
  actorUserId: string
) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
  if (!canTransition(booking.status, status)) {
    throw new DomainError('INVALID', bookingErrorMessage('BAD_TRANSITION'));
  }
  const updated = await prisma.booking.update({ where: { id: bookingId }, data: { status } });
  await recordAudit({
    actorUserId,
    schoolId: booking.schoolId,
    action: `booking.${status.toLowerCase()}`,
    targetType: 'Booking',
    targetId: bookingId,
  });
  return updated;
}
