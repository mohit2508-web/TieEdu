import { NextRequest } from 'next/server';
import { getClassRoster } from '@/server/analytics-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { fail, handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSchool();
    assertPermission(session, 'analytics.view');
    const classLevel = req.nextUrl.searchParams.get('classLevel');
    const section = req.nextUrl.searchParams.get('section');
    if (!classLevel) return fail(400, 'classLevel is required');
    return ok({ roster: await getClassRoster(session.schoolId, classLevel, section) });
  } catch (err) {
    return handleError(err, 'school/roster GET');
  }
}
