import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  AuthServiceError,
  findUserByVerifiedPhone,
  loginWithPassword,
  loginWithRollAndPin,
  touchLastLogin,
} from '@/server/auth-service';
import { verifyOtp } from '@/lib/otp';
import { recordAudit } from '@/lib/audit';
import { establishSession } from '@/server/session-cookies';
import { fail, ok, requestMeta } from '@/server/http';

/**
 * One endpoint for all three login modes (spec §4). The `mode` field selects
 * which credentials are read; zod rejects anything that does not match.
 */
const schema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('password'), email: z.string().email(), password: z.string().min(1) }),
  z.object({
    mode: z.literal('pin'),
    schoolCode: z.string().min(3),
    rollNo: z.string().min(1),
    pin: z.string().regex(/^\d{4,6}$/),
  }),
  z.object({
    mode: z.literal('otp'),
    phone: z.string().min(10),
    code: z.string().min(4),
  }),
]);

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || 'Invalid input');

  try {
    let user;
    if (parsed.data.mode === 'password') {
      user = await loginWithPassword(parsed.data.email, parsed.data.password);
    } else if (parsed.data.mode === 'pin') {
      user = await loginWithRollAndPin(parsed.data);
    } else {
      const verified = await verifyOtp(parsed.data.phone, parsed.data.code, 'LOGIN');
      if (!verified.ok) {
        const messages: Record<string, string> = {
          not_found: 'No code was requested for this number',
          expired: 'That code has expired — request a new one',
          too_many_attempts: 'Too many attempts — request a new code',
          invalid: 'Incorrect code',
        };
        return fail(401, messages[verified.reason] || 'Verification failed');
      }
      user = await findUserByVerifiedPhone(parsed.data.phone);
    }

    await touchLastLogin(user.id);
    await recordAudit({ actorUserId: user.id, action: `auth.login.${parsed.data.mode}` });
    await establishSession(user.id, user.role, requestMeta(req));

    return ok({ user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    if (err instanceof AuthServiceError) return fail(401, err.message);
    console.error('[auth/login]', err);
    return fail(500, 'Could not sign you in right now');
  }
}
