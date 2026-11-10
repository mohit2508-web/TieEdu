import fs from 'fs';
import path from 'path';

// Write freeze for a database cutover.
//
// Moving the relational tables to a new cluster is copy -> verify -> repoint.
// Anything written to the OLD cluster after the copy started would be silently
// lost on repoint, so for the minute the copy runs every write is refused.
//
// Two layers, on purpose:
//   - The pool guard (db/client.ts) refuses write SQL at the driver. This is the
//     guarantee: no code path, scheduler or webhook can reach the old cluster.
//   - The route guard below answers PG-only write routes with a clear 503 before
//     they run, so a student sees "try again in a minute", not a generic error.
//
// Reads keep working throughout, and so does everything stored in db.json —
// login, sessions, courses, progress. Devices, push, audit and staff dual-write
// to db.json and are backfilled into PostgreSQL at boot, so a write the guard
// refuses there lands in the ledger and reaches the new cluster on restart.
//
// Toggled by a flag file so it needs no restart:
//   touch backend/data/.pg-write-freeze   # on
//   rm backend/data/.pg-write-freeze      # off
// PG_WRITE_FREEZE=1 forces it on regardless.

const FLAG_FILE = process.env.PG_WRITE_FREEZE_FILE
  ? path.resolve(process.env.PG_WRITE_FREEZE_FILE)
  : path.join(__dirname, '../../data/.pg-write-freeze');

/** Checked on every write, uncached: a stat is cheap, and a cache would let a
 *  write through in the window right after the flag is created. */
export function isPgWriteFrozen(): boolean {
  if (process.env.PG_WRITE_FREEZE === '1') return true;
  return fs.existsSync(FLAG_FILE);
}

export const PG_WRITE_FROZEN = 'PG_WRITE_FROZEN';

export class PgWriteFrozenError extends Error {
  readonly code = PG_WRITE_FROZEN;
  constructor() {
    super('Database maintenance in progress - writes are paused for about a minute.');
  }
}

/** True for statements that change data or schema. Leading comments and
 *  whitespace are skipped; a CTE counts as a write when its body writes. */
export function isWriteSql(text: unknown): boolean {
  if (typeof text !== 'string') return false;
  const sql = text.replace(/^(\s+|--[^\n]*\n|\/\*[\s\S]*?\*\/)+/, '');
  if (/^(INSERT|UPDATE|DELETE|UPSERT|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COMMENT)\b/i.test(sql)) return true;
  return /^WITH\b/i.test(sql) && /\b(INSERT|UPDATE|DELETE|UPSERT)\b/i.test(sql);
}

// Route prefixes whose writes go only to PostgreSQL (no db.json fallback).
// Matched against the path, non-GET only.
const PG_ONLY_WRITE_PREFIXES = [
  '/api/placement',
  '/api/admin/placement',
  '/api/drives',
  '/api/admin/drives',
  '/api/bridge',
  '/api/school',
  '/api/campus-pages',
];

// studentProfileRouter shares /api/me with meRouter, whose writes are db.json;
// only these /api/me paths are PostgreSQL.
const PG_ONLY_ME_PATHS = /^\/api\/me(\/?$|\/(resumes|notifications\/read-all|settings|corrections)(\/|$))/;

export function isPgOnlyWriteRoute(method: string, pathname: string): boolean {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
  if (PG_ONLY_ME_PATHS.test(pathname)) return true;
  return PG_ONLY_WRITE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function writeFreezeMiddleware(req: any, res: any, next: any) {
  if (isPgOnlyWriteRoute(req.method, req.path) && isPgWriteFrozen()) {
    res.setHeader('Retry-After', '60');
    return res.status(503).json({ error: 'We are doing a quick upgrade. Please try again in a minute.', code: PG_WRITE_FROZEN });
  }
  next();
}
