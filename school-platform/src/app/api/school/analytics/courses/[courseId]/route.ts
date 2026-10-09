import { getCourseAnalytics } from '@/server/analytics-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  try {
    const session = await requireSchool();
    assertPermission(session, 'analytics.view');
    return ok({ analytics: await getCourseAnalytics(session.schoolId, params.courseId) });
  } catch (err) {
    return handleError(err, 'school/analytics/courses/[courseId] GET');
  }
}
