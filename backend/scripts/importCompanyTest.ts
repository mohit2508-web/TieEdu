/**
 * Loads a company mock test (e.g. infosys-se) from src/lib/seed3T.ts CONFIGS.
 * Re-running replaces that test's questions; old attempts keep their snapshot.
 *
 *   npx ts-node --transpile-only scripts/importCompanyTest.ts infosys-se
 */
import { loadDb, safeSaveDb } from '../src/data/db';
import { seedCompanyTest, COMPANY_TESTS } from '../src/lib/seed3T';

const key = process.argv[2];
if (!COMPANY_TESTS.includes(key)) throw new Error(`Unknown test "${key}". Known: ${COMPANY_TESTS.join(', ')}`);
const db: any = loadDb();
console.log(`${key}: ${seedCompanyTest(db, key)} questions`);
safeSaveDb(db);
