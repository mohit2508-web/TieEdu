/**
 * Must be the FIRST import in a test file: ES module imports are hoisted and
 * evaluated before any top-level statement, so db.ts and auth.ts would
 * otherwise capture the real DB path and an unset JWT secret.
 */
import os from 'os';
import path from 'path';
import fs from 'fs';

const scratch = path.join(os.tmpdir(), `tieedu-sp-test-${process.pid}-${Date.now()}.json`);

export const SCRATCH_DB = scratch;
export const TEST_JWT_SECRET = 'test-secret-for-study-plan-api';

process.env.DB_FILE = scratch;
process.env.JWT_SECRET = TEST_JWT_SECRET;

export const removeScratchDb = () => {
  try { fs.rmSync(scratch, { force: true }); } catch { /* ignore */ }
};
