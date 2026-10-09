import { listMyEnrollments } from '@/server/learning-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSchool();
    assertPermission(session, 'course.learn');
    return ok({ enrollments: await listMyEnrollments(session.schoolId, session.userId) });
  } catch (err) {
    return handleError(err, 'learning/courses GET');
  }
}
