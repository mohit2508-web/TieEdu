import { NextRequest } from 'next/server';
import { z } from 'zod';
import { assignTeacher, listAssignments } from '@/server/teacher-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { fail, handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSchool();
    assertPermission(session, 'analytics.view');
    return ok({ assignments: await listAssignments(session.schoolId) });
  } catch (err) {
    return handleError(err, 'school/teacher-assignments GET');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSchool();
    assertPermission(session, 'school.manage');
    const parsed = z
      .object({ courseId: z.string().min(1), teacherUserId: z.string().min(1) })
      .safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(400, 'courseId and teacherUserId are required');

    const row = await assignTeacher(
      session.schoolId,
      parsed.data.courseId,
      parsed.data.teacherUserId,
      session.userId
    );
    return ok({ assignment: row }, 201);
  } catch (err) {
    return handleError(err, 'school/teacher-assignments POST');
  }
}
