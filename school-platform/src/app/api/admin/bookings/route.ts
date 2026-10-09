import { listAllBookings } from '@/server/booking-service';
import { requirePermission } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requirePermission('booking.create');
    return ok({ bookings: await listAllBookings() });
  } catch (err) {
    return handleError(err, 'admin/bookings GET');
  }
}
