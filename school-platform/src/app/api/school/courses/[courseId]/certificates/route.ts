import { listCourseCertificates } from '@/server/certificate-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  try {
    const session = await requireSchool();
    assertPermission(session, 'analytics.view');
    return ok({ certificates: await listCourseCertificates(session.schoolId, params.courseId) });
  } catch (err) {
    return handleError(err, 'school/courses/[courseId]/certificates GET');
  }
}
