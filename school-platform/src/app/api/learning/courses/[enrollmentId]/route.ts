import { findOwnedEnrollment, getPlayerData } from '@/server/learning-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { enrollmentId: string } }) {
  try {
    const session = await requireSchool();
    assertPermission(session, 'course.learn');
    await findOwnedEnrollment(session.schoolId, params.enrollmentId, session.userId);
    return ok(await getPlayerData(session.schoolId, params.enrollmentId));
  } catch (err) {
    return handleError(err, 'learning/courses/[enrollmentId] GET');
  }
}
