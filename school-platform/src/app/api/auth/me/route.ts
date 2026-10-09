import { getSession } from '@/server/auth';
import { fail, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return fail(401, 'Not authenticated');
  return ok({
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      platformRole: session.platformRole,
    },
    membership: session.schoolId
      ? {
          schoolId: session.schoolId,
          role: session.memberRole,
          classLevel: session.classLevel,
          section: session.section,
          rollNo: session.rollNo,
        }
      : null,
  });
}
