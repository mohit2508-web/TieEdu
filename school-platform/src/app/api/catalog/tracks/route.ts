import { listTracksWithCounts } from '@/server/catalog-service';
import { handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok({ tracks: await listTracksWithCounts() });
  } catch (err) {
    return handleError(err, 'catalog/tracks');
  }
}
