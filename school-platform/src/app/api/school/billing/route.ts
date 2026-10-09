import { getSchoolBilling } from '@/server/billing-service';
import { assertPermission, requireSchool } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSchool();
    assertPermission(session, 'billing.pay');
    return ok({ billing: await getSchoolBilling(session.schoolId) });
  } catch (err) {
    return handleError(err, 'school/billing GET');
  }
}
