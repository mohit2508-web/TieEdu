/**
 * Environment access.
 *
 * Deliberately lazy: nothing here throws at import time, so `next build` and
 * unit tests can load modules without a full `.env`. Secrets are asserted at
 * the point of use (`requireAuthSecret`).
 */

const str = (key: string, fallback = ''): string => process.env[key] ?? fallback;

export const env = {
  get databaseUrl() {
    return str('DATABASE_URL');
  },
  get redisUrl() {
    return str('REDIS_URL');
  },
  get appUrl() {
    return str('NEXT_PUBLIC_APP_URL', 'http://localhost:3300');
  },
  get accessTtlSeconds() {
    return Number(str('ACCESS_TOKEN_TTL', '900')) || 900;
  },
  get refreshTtlDays() {
    return Number(str('REFRESH_TTL_DAYS', '30')) || 30;
  },
  get isProd() {
    return process.env.NODE_ENV === 'production';
  },
};

const AUTH_SECRET_FALLBACK = 'dev-only-insecure-secret-change-me-please-32ch';

export function requireAuthSecret(): string {
  const secret = str('AUTH_SECRET', AUTH_SECRET_FALLBACK);
  if (env.isProd && secret === AUTH_SECRET_FALLBACK) {
    throw new Error('AUTH_SECRET must be set in production');
  }
  return secret;
}
