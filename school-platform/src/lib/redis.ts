import IORedis, { type Redis } from 'ioredis';
import { env } from './env';

/**
 * Redis connection, lazily created. Used for OTP rate limiting now and BullMQ
 * queues later. `maxRetriesPerRequest: null` is required by BullMQ; the lazy
 * connect means unit tests and `next build` never open a socket.
 */
const globalForRedis = globalThis as unknown as { redis?: Redis };

export function getRedis(): Redis | null {
  if (!env.redisUrl) return null;
  if (!globalForRedis.redis) {
    globalForRedis.redis = new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
    globalForRedis.redis.on('error', (err) => console.error('[redis]', err.message));
  }
  return globalForRedis.redis;
}
