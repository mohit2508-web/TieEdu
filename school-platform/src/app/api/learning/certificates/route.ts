import { listMyCertificates } from '@/server/certificate-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSchool();
    assertPermission(session, 'course.learn');
    return ok({ certificates: await listMyCertificates(session.schoolId, session.userId) });
  } catch (err) {
    return handleError(err, 'learning/certificates GET');
  }
}
