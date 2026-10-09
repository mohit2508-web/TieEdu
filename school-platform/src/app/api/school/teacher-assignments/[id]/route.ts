import { unassignTeacher } from '@/server/teacher-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSchool();
    assertPermission(session, 'school.manage');
    await unassignTeacher(session.schoolId, params.id, session.userId);
    return ok({ removed: true });
  } catch (err) {
    return handleError(err, 'school/teacher-assignments/[id] DELETE');
  }
}
