import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createLesson } from '@/server/catalog-service';
import { requirePermission } from '@/server/auth';
import { fail, handleError, ok } from '@/server/http';

const lessonInput = z.object({
  title: z.string().min(2).max(160),
  summary: z.string().max(400).optional(),
  kind: z.enum(['VIDEO', 'TEXT', 'QUIZ', 'ACTIVITY', 'PROJECT']).optional(),
  durationMins: z.number().int().min(0).max(600).optional(),
  contentUrl: z.string().url().optional(),
  contentBody: z.string().max(20000).optional(),
  isPreview: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requirePermission('content.manage');
    const parsed = lessonInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || 'Invalid input');

    const lesson = await createLesson(params.id, parsed.data, session.userId);
    return ok({ lesson }, 201);
  } catch (err) {
    return handleError(err, 'admin/modules/[id]/lessons POST');
  }
}
