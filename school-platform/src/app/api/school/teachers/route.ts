import { listTeachers } from '@/server/teacher-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSchool();
    assertPermission(session, 'course.assign');
    return ok({ teachers: await listTeachers(session.schoolId) });
  } catch (err) {
    return handleError(err, 'school/teachers GET');
  }
}
