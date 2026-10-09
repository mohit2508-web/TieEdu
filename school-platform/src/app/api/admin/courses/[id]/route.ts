import { NextRequest } from 'next/server';
import { z } from 'zod';
import { updateCourse } from '@/server/catalog-service';
import { requirePermission } from '@/server/auth';
import { fail, handleError, ok } from '@/server/http';

const patchInput = z.object({
  title: z.string().min(3).max(160).optional(),
  summary: z.string().max(400).optional().nullable(),
  description: z.string().max(8000).optional().nullable(),
  skillTrackId: z.string().min(1).optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  gradeMin: z.number().int().min(3).max(12).optional(),
  gradeMax: z.number().int().min(3).max(12).optional(),
  outcomes: z.array(z.string().max(300)).max(30).optional(),
  tags: z.array(z.string().max(40)).max(30).optional(),
  heroImageUrl: z.string().url().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requirePermission('content.manage');
    const parsed = patchInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || 'Invalid input');

    const course = await updateCourse(params.id, parsed.data, session.userId);
    return ok({ course });
  } catch (err) {
    return handleError(err, 'admin/courses/[id] PATCH');
  }
}
