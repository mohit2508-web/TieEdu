import { verifyBySerial } from '@/server/certificate-service';
import { isValidSerial } from '@/lib/certificates';
import { fail, handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { serial: string } }) {
  try {
    if (!isValidSerial(params.serial)) return fail(400, 'Invalid serial');
    const certificate = await verifyBySerial(params.serial);
    if (!certificate) return fail(404, 'Certificate not found');
    return ok({ certificate });
  } catch (err) {
    return handleError(err, 'verify/[serial] GET');
  }
}
