import { disableCourseForSchool } from '@/server/catalog-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export async function DELETE(_req: Request, { params }: { params: { courseId: string } }) {
  try {
    const session = await requireSchool();
    assertPermission(session, 'course.assign');
    const row = await disableCourseForSchool(session.schoolId, params.courseId, session.userId);
    return ok({ schoolCourse: row });
  } catch (err) {
    return handleError(err, 'school/courses/[courseId] DELETE');
  }
}
