import { NextRequest } from 'next/server';
import { z } from 'zod';
import { updateBookingStatusGlobal } from '@/server/booking-service';
import { requirePermission } from '@/server/auth';
import { fail, handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requirePermission('booking.create');
    const parsed = z
      .object({ status: z.enum(['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']) })
      .safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(400, 'A valid status is required');

    const booking = await updateBookingStatusGlobal(params.id, parsed.data.status, session.userId);
    return ok({ booking });
  } catch (err) {
    return handleError(err, 'admin/bookings/[id] PATCH');
  }
}
