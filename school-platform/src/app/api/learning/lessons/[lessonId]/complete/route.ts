import { NextRequest } from 'next/server';
import { z } from 'zod';
import { completeLesson, findOwnedEnrollment } from '@/server/learning-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { fail, handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { lessonId: string } }) {
  try {
    const session = await requireSchool();
    assertPermission(session, 'course.learn');
    const parsed = z.object({ enrollmentId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(400, 'An enrollmentId is required');

    await findOwnedEnrollment(session.schoolId, parsed.data.enrollmentId, session.userId);
    const result = await completeLesson(session.schoolId, parsed.data.enrollmentId, params.lessonId, session.userId);
    return ok(result);
  } catch (err) {
    return handleError(err, 'learning/lessons/[lessonId]/complete');
  }
}
