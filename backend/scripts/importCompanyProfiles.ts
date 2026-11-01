/**
 * Upserts the 2026–27 program profiles (src/data/companyProfiles2026.ts).
 * The server also adds missing ones on start (src/lib/seed3T.ts); this CLI
 * re-applies the data file over existing companies too.
 *
 *   npx ts-node --transpile-only scripts/importCompanyProfiles.ts
 */
import { loadDb, safeSaveDb } from '../src/data/db';
import { seedCompanyProfiles } from '../src/lib/seed3T';

const db: any = loadDb();
const r = seedCompanyProfiles(db);
console.log(`${r.created} created, ${r.updated} updated`);
safeSaveDb(db);
