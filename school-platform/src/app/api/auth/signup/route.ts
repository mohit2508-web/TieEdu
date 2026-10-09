import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AuthServiceError, signupStudent } from '@/server/auth-service';
import { establishSession } from '@/server/session-cookies';
import { fail, ok, requestMeta } from '@/server/http';

const schema = z.object({
  schoolCode: z.string().min(3),
  name: z.string().min(2),
  classLevel: z.string().min(1),
  section: z.string().min(1),
  rollNo: z.string().min(1),
  pin: z.string().regex(/^\d{4,6}$/),
  parentPhone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || 'Invalid input');

  try {
    const { user, school } = await signupStudent(parsed.data);
    await establishSession(user.id, user.role, requestMeta(req));
    return ok({ user: { id: user.id, name: user.name }, school: { code: school.code, name: school.name } }, 201);
  } catch (err) {
    if (err instanceof AuthServiceError) return fail(400, err.message);
    console.error('[auth/signup]', err);
    return fail(500, 'Could not complete sign-up');
  }
}
