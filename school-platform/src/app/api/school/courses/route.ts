import { NextRequest } from 'next/server';
import { z } from 'zod';
import { enableCourseForSchool, listPublishedCoursesForSchool } from '@/server/catalog-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { fail, handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSchool();
    return ok({ courses: await listPublishedCoursesForSchool(session.schoolId) });
  } catch (err) {
    return handleError(err, 'school/courses GET');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSchool();
    assertPermission(session, 'course.assign');
    const parsed = z.object({ courseId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(400, 'A courseId is required');

    const row = await enableCourseForSchool(session.schoolId, parsed.data.courseId, session.userId);
    return ok({ schoolCourse: row }, 201);
  } catch (err) {
    return handleError(err, 'school/courses POST');
  }
}
