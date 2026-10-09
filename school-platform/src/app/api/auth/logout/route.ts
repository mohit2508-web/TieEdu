import { NextRequest } from 'next/server';
import { REFRESH_COOKIE, revokeSession } from '@/lib/session';
import { clearSessionCookies } from '@/server/session-cookies';
import { ok } from '@/server/http';

export async function POST(req: NextRequest) {
  await revokeSession(req.cookies.get(REFRESH_COOKIE)?.value);
  clearSessionCookies();
  return ok({});
}
