import { getTeacherDashboard } from '@/server/analytics-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSchool();
    assertPermission(session, 'analytics.view');
    return ok({ dashboard: await getTeacherDashboard(session.schoolId, session.userId) });
  } catch (err) {
    return handleError(err, 'school/analytics/me GET');
  }
}
