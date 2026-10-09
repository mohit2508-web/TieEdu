import { revokeCertificate } from '@/server/certificate-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSchool();
    assertPermission(session, 'school.manage');
    const certificate = await revokeCertificate(session.schoolId, params.id, session.userId);
    return ok({ certificate });
  } catch (err) {
    return handleError(err, 'school/certificates/[id]/revoke POST');
  }
}
