import { getCourseRosterProgress } from '@/server/learning-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  try {
    const session = await requireSchool();
    assertPermission(session, 'analytics.view');
    return ok({ students: await getCourseRosterProgress(session.schoolId, params.courseId) });
  } catch (err) {
    return handleError(err, 'school/courses/[courseId]/progress');
  }
}
