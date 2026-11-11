// ============================================================================
// In-memory store (STORE_3D_SHOWCASE_AND_SPEED_PLAN.md Part A). Scratch DB_FILE only.
// loadDb() keeps the parsed store, re-reads only when the file changes on disk,
// saveDb() refreshes it and writes compact JSON, invalidateDbCache() drops it.
//   npm run test:dbcache
// ============================================================================
import fs from 'fs';
import os from 'os';
import path from 'path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tieedu-dbcache-'));
process.env.DB_FILE = path.join(dir, 'db.json');
delete process.env.DB_CACHE;

let pass = 0, fail = 0;
const check = (name: string, ok: boolean) => { if (ok) pass++; else { fail++; console.log(`FAIL ${name}`); } };

// eslint-disable-next-line @typescript-eslint/no-var-requires
const store = require('../src/data/db') as typeof import('../src/data/db');
const a = store.loadDb();
check('first load creates the store', Array.isArray(a.companies));
const b = store.loadDb();
check('second load is the same object (no re-parse)', a === b);
const loads = store.dbStats.diskLoads;
for (let i = 0; i < 50; i++) store.loadDb();
check('50 more loads, no disk reads', store.dbStats.diskLoads === loads);

a.users.push({ id: 'u-cache', name: 'Cache' });
store.saveDb(a);
const raw = fs.readFileSync(process.env.DB_FILE!, 'utf8');
check('saved file is compact JSON', !raw.includes('\n  "'));
check('save keeps the same object in memory', store.loadDb() === a);
check('saved data on disk', JSON.parse(raw).users.some((u: any) => u.id === 'u-cache'));

// Another process (or a test) writes the file: the next load sees it.
const ext = JSON.parse(raw);
ext.users.push({ id: 'u-ext', name: 'External' });
fs.writeFileSync(process.env.DB_FILE!, JSON.stringify(ext));
const c = store.loadDb();
check('external write is picked up', c !== a && c.users.some((u: any) => u.id === 'u-ext'));

// A failed request's unsaved edit is dropped.
c.users.push({ id: 'u-partial' });
store.invalidateDbCache();
check('invalidate drops unsaved edits', !store.loadDb().users.some((u: any) => u.id === 'u-partial'));

// Timings are collected per request.
const t = { load: 0, save: 0, disk: 0 };
store.dbTimings.run(t, () => { store.loadDb(); store.saveDb(store.loadDb()); });
check('timings recorded inside a request', t.load >= 0 && t.save > 0);

fs.rmSync(dir, { recursive: true, force: true });
console.log(`\ndb cache: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
