import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requestOtp, verifyOtp } from '@/lib/otp';
import { findUserByVerifiedPhone, touchLastLogin } from '@/server/auth-service';
import { establishSession } from '@/server/session-cookies';
import { fail, ok, requestMeta } from '@/server/http';

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('request'),
    phone: z.string().min(10),
    purpose: z.enum(['LOGIN', 'PARENT_CONSENT', 'PAYMENT']).default('LOGIN'),
  }),
  z.object({
    action: z.literal('verify'),
    phone: z.string().min(10),
    code: z.string().min(4),
  }),
]);

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || 'Invalid input');

  try {
    if (parsed.data.action === 'request') {
      const result = await requestOtp(parsed.data.phone, parsed.data.purpose);
      if (!result.sent) return fail(429, 'Please wait a moment before requesting another code');
      // Never echo the code back.
      return ok({ sent: true });
    }

    const verified = await verifyOtp(parsed.data.phone, parsed.data.code, 'LOGIN');
    if (!verified.ok) return fail(401, 'Verification failed');

    const user = await findUserByVerifiedPhone(parsed.data.phone);
    await touchLastLogin(user.id);
    await establishSession(user.id, user.role, requestMeta(req));
    return ok({ user: { id: user.id, name: user.name } });
  } catch (err) {
    console.error('[auth/otp]', err);
    return fail(500, 'Could not process the OTP request');
  }
}
