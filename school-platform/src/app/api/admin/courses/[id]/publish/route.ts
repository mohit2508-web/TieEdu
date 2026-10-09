import { publishCourse, unpublishCourse } from '@/server/catalog-service';
import { requirePermission } from '@/server/auth';
import { handleError, ok } from '@/server/http';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requirePermission('content.manage');
    const course = await publishCourse(params.id, session.userId);
    return ok({ course });
  } catch (err) {
    return handleError(err, 'admin/courses/[id]/publish POST');
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requirePermission('content.manage');
    const course = await unpublishCourse(params.id, session.userId);
    return ok({ course });
  } catch (err) {
    return handleError(err, 'admin/courses/[id]/publish DELETE');
  }
}
