import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createBooking, listBookings } from '@/server/booking-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { fail, handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSchool();
    assertPermission(session, 'booking.create');
    return ok({ bookings: await listBookings(session.schoolId) });
  } catch (err) {
    return handleError(err, 'school/bookings GET');
  }
}

const input = z.object({
  type: z.enum(['AI_SEMINAR', 'WORKSHOP', 'TRAINER_VISIT']).default('AI_SEMINAR'),
  title: z.string().min(3).max(160),
  preferredAt: z.string().datetime(),
  mode: z.enum(['ONLINE', 'ONSITE']).optional(),
  participants: z.number().int().min(0).max(100_000).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSchool();
    assertPermission(session, 'booking.create');
    const parsed = input.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(400, 'Invalid booking input');

    const booking = await createBooking(
      session.schoolId,
      { ...parsed.data, preferredAt: new Date(parsed.data.preferredAt) },
      session.userId
    );
    return ok({ booking }, 201);
  } catch (err) {
    return handleError(err, 'school/bookings POST');
  }
}
