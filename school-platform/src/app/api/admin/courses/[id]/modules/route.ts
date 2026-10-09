import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createModule } from '@/server/catalog-service';
import { requirePermission } from '@/server/auth';
import { fail, handleError, ok } from '@/server/http';

const moduleInput = z.object({
  title: z.string().min(2).max(160),
  summary: z.string().max(400).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requirePermission('content.manage');
    const parsed = moduleInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || 'Invalid input');

    const created = await createModule(params.id, parsed.data, session.userId);
    return ok({ module: created }, 201);
  } catch (err) {
    return handleError(err, 'admin/courses/[id]/modules POST');
  }
}
