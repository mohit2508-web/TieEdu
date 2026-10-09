import { getSchoolOverview } from '@/server/analytics-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSchool();
    assertPermission(session, 'analytics.view');
    return ok({ overview: await getSchoolOverview(session.schoolId) });
  } catch (err) {
    return handleError(err, 'school/analytics/overview GET');
  }
}
