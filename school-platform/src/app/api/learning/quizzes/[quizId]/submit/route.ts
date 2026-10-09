import { NextRequest } from 'next/server';
import { z } from 'zod';
import { findOwnedEnrollment, submitQuiz } from '@/server/learning-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { fail, handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

const schema = z.object({
  enrollmentId: z.string().min(1),
  answers: z.record(z.string().min(1)).default({}),
});

export async function POST(req: NextRequest, { params }: { params: { quizId: string } }) {
  try {
    const session = await requireSchool();
    assertPermission(session, 'course.learn');
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(400, 'Invalid quiz submission');

    await findOwnedEnrollment(session.schoolId, parsed.data.enrollmentId, session.userId);
    const result = await submitQuiz(
      session.schoolId,
      parsed.data.enrollmentId,
      params.quizId,
      parsed.data.answers,
      session.userId
    );
    return ok(result);
  } catch (err) {
    return handleError(err, 'learning/quizzes/[quizId]/submit');
  }
}
