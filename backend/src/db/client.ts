import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Fail closed. A credential baked into source is a credential that leaks with the
// repo, lands in every clone and every CI log, and cannot be rotated without a
// code change. There is deliberately no fallback string here.
//
// The Pool is built LAZILY rather than at module load. `store/index.ts:16`
// imports this file statically and `isDbReachable()` is how it decides to fall
// back to the local JSON store — so throwing here would break boot for every
// deployment that legitimately runs replica-less. An operator who meant to
// configure this gets a named error from the one call that needs it.
const connectionString = process.env.DATABASE_URL;

const MISSING_URL_MESSAGE =
  'DATABASE_URL is not set. The PostgreSQL/CockroachDB replica cannot be used. ' +
  'Set DATABASE_URL in backend/.env, or leave it unset — the replica is opt-in ' +
  '(ENABLE_PG_REPLICA=1) and the app runs on the local JSON store without it.';

let pool: Pool | null = null;
let poolError: string | null = null;

const getPoolInternal = (): Pool => {
  if (!connectionString) throw new Error(MISSING_URL_MESSAGE);
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      max: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000, // Fast 5-second connection check
      keepAlive: true
    });

    // The host is redacted deliberately: connection logs are routinely shipped to
    // aggregators, and a cluster hostname is an unguessable identifier for a live
    // database. Host prefix + port only, never user, password, or database name.
    const safeHost = (() => {
      try {
        const u = new URL(connectionString);
        return `${u.hostname.split('.')[0]}.…:${u.port || '5432'}`;
      } catch {
        return 'unknown-host';
      }
    })();

    pool.on('connect', () => {
      console.log(`⚡ [PostgreSQL] Connected to ${safeHost}`);
    });

    pool.on('error', () => {
      // Silent fallback handling
    });
  }
  return pool;
};

/** True only when a connection string is configured. Cheap, synchronous. */
export const isConfigured = (): boolean => Boolean(connectionString);

/**
 * The pool accessor. Throws a named error rather than silently handing back a
 * dead client. Call sites that can tolerate absence must call
 * `isDbReachable()` FIRST and only then take the pool — probing before binding
 * is what keeps a replica-less deployment on the JSON store instead of crashing.
 */
export function getPool(): Pool {
  return getPoolInternal();
}

export const query = (text: string, params?: any[]): Promise<any> => getPoolInternal().query(text, params);

// Fast honest reachability probe — used by storage.init() and migration boot.
// Returns false when the replica is simply not configured, which is the normal
// case, so callers need no special-case branch for it.
export async function isDbReachable(timeoutMs: number = 4000): Promise<boolean> {
  if (!connectionString) {
    poolError = MISSING_URL_MESSAGE;
    return false;
  }
  try {
    await Promise.race([
      getPoolInternal().query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('probe timeout')), timeoutMs)),
    ]);
    return true;
  } catch (err: any) {
    poolError = err?.message || String(err);
    return false;
  }
}

/** Why the last probe failed, for logging. Never contains a credential. */
export const lastPoolError = (): string | null => poolError;
