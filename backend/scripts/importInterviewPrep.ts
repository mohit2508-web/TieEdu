/**
 * Re-applies the interview prep and topic lessons (src/data/interviewPrep/*)
 * to their company pages, replacing those modules' items.
 *
 *   npx ts-node --transpile-only scripts/importInterviewPrep.ts
 */
import { loadDb, safeSaveDb } from '../src/data/db';
import { seedInterviewPrep } from '../src/lib/seed3T';

const db: any = loadDb();
console.log(`${seedInterviewPrep(db)} modules written`);
safeSaveDb(db);
