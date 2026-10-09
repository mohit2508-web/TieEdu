import { NextRequest } from 'next/server';
import { parseCatalogQuery } from '@/lib/catalog';
import { listCourses } from '@/server/catalog-service';
import { handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const query = parseCatalogQuery(req.nextUrl.searchParams);
    const result = await listCourses(query, true);
    return ok(result);
  } catch (err) {
    return handleError(err, 'catalog/courses');
  }
}
