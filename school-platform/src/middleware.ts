import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

/**
 * Locale routing. API routes and static assets are excluded so the auth
 * endpoints stay un-prefixed (`/api/auth/...`).
 */
export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
