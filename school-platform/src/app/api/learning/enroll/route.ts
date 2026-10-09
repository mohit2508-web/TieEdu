import { NextRequest } from 'next/server';
import { z } from 'zod';
import { enrollInCourse } from '@/server/learning-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { fail, handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await requireSchool();
    assertPermission(session, 'course.learn');
    const parsed = z.object({ courseId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(400, 'A courseId is required');

    const enrollment = await enrollInCourse(session.schoolId, parsed.data.courseId, session.userId);
    return ok({ enrollment }, 201);
  } catch (err) {
    return handleError(err, 'learning/enroll');
  }
}
