import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://Jadon_Mohit:UCIha_uvrNoHW0yt93xWpA@senior-tamarin-33886.j77.aws-ap-south-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full';

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000, // Fast 5-second connection check
  keepAlive: true
});

pool.on('connect', () => {
  console.log('⚡ [CockroachDB Cloud] Connected to senior-tamarin-33886.j77 cluster!');
});

pool.on('error', (err) => {
  // Silent fallback handling
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

// Fast honest reachability probe — used by storage.init() and migration boot.
export async function isDbReachable(timeoutMs: number = 4000): Promise<boolean> {
  try {
    await Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('probe timeout')), timeoutMs)),
    ]);
    return true;
  } catch {
    return false;
  }
}
