/**
 * TieEdu Schools — tenancy & isolation source tests.
 *
 * Runs entirely on the source tree (no server, no ledger, no PostgreSQL), like
 * placement-auth.test.ts, so it stays inside the normal `npm test` chain.
 * These are the rules that must never regress silently, because each one is a
 * cross-tenant or cross-segment security bug if it does:
 *
 *  1. No client-supplied tenant: `x-school-id` must not exist anywhere in the
 *     school segment. The school id is resolved server-side from a membership.
 *  2. Every data-access function requires the owning `schoolId` as its first
 *     parameter — there is no "give me everything" loader.
 *  3. Every `school_*` table is tenanted: `school_id` NOT NULL in the schema,
 *     and no table that belongs to the school schema lives without it.
 *  4. The school segment never imports from the placement/college segment or
 *     the college router: a bug there cannot take the school route down, and
 *     the school catalog can never grow a dependency on the college engine.
 *  5. The seed refuses to run in production without an explicit password, and
 *     only runs when SCHOOL_SEED=1.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', 'src', p), 'utf8');
const readServer = () => fs.readFileSync(path.join(__dirname, '..', 'src', 'server.ts'), 'utf8');

const SCHOOL_FILES = [
  'school/tenant.ts',
  'school/seed.ts',
  'middleware/schoolAuth.ts',
  'routes/school.routes.ts',
  'db/schoolMigrate.ts',
];

test('no client-supplied tenant: x-school-id is never passed or read', () => {
  for (const file of SCHOOL_FILES) {
    const src = read(file);
    assert.ok(
      !src.match(/['"]x-school-id['"]|header\(['"]x-school-id['"]\)|query\?\.?school/),
      `cross-tenant header leak in ${file}: the school id must come from the membership, never the client`
    );
  }
});

test('every school data-access function takes schoolId as its first parameter', () => {
  const src = read('school/tenant.ts');
  const fnRe = /export async function (\w+)\(([^)]*)\)/g;
  // The school id is unknown until the very first lookup, so the three
  // identity accessors are exempt; every data accessor is not.
  const EXEMPT = new Set(['findSchoolByCode', 'findSchoolById', 'findMemberships']);
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = fnRe.exec(src)) !== null) {
    seen.add(m[1]);
    if (EXEMPT.has(m[1])) continue;
    const firstParam = m[2].trim().split(',')[0].trim();
    assert.ok(
      /^schoolId\s*:/.test(firstParam),
      `tenant-unaware accessor: ${m[1]} must take schoolId as its first parameter`
    );
  }
  assert.ok(seen.has('findMemberByRollNo'), 'login path (findMemberByRollNo) missing from tenant repo');
  assert.ok(seen.has('recordProgress'), 'write path (recordProgress) missing from tenant repo');
});

test('every school_* table is tenanted with NOT NULL school_id', () => {
  const src = read('db/schoolMigrate.ts');
  const tableRe = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\)\s*;/g;
  let m: RegExpExecArray | null;
  let schoolTables = 0;
  while ((m = tableRe.exec(src)) !== null) {
    const name = m[1];
    const body = m[2];
    assert.ok(name === 'school' || name.startsWith('school_'), `foreign table leaked into school schema: ${name}`);
    assert.ok(/school_id\s+TEXT\s+(PRIMARY KEY|NOT NULL)/.test(body), `${name} must carry NOT NULL school_id`);
    schoolTables += 1;
  }
  assert.ok(schoolTables >= 5, `expected at least 5 school tables, found ${schoolTables}`);
});

test('the school segment never imports the placement/college segment', () => {
  for (const file of SCHOOL_FILES) {
    const src = read(file);
    for (const drop of ['placement', 'college', 'campus', 'tpo']) {
      assert.ok(
        !src.match(new RegExp(`from ['"].*\\b${drop}\\b`)) && !src.includes(`'../${drop}`) && !src.includes(`"./${drop}`),
        `${file} imports the college segment (${drop}) — must stay fully decoupled`
      );
    }
  }
});

test('secure-by-default seed contract is intact', () => {
  const seed = read('school/seed.ts');
  assert.ok(seed.includes("process.env.SCHOOL_SEED === '1'"), 'seed must be opt-in via SCHOOL_SEED=1');
  assert.ok(
    seed.includes('SCHOOL_SEED=1 in production without SCHOOL_SEED_PASSWORD'),
    'prod-without-password guard missing'
  );
  assert.ok(seed.includes('bcrypt.hashSync'), 'demo accounts must go through real password hashing');
});

test('school API is mounted independently of the college portal', () => {
  const server = readServer();
  assert.ok(server.includes("app.use('/api/school', schoolRouter)"), 'school router not mounted');
  assert.ok(server.includes("import { schoolRouter } from './routes/school.routes'"), 'school router import missing');
  assert.ok(server.includes('await runSchoolBoot()'), 'school boot not started');
});

test('protected school routes never trust a client school id body field', () => {
  for (const file of ['routes/school.routes.ts']) {
    const src = read(file);
    // The login resolves the school from the code; data routes take it from
    // req.school (set by requireSchoolAuth), never from req.body.schoolId.
    assert.ok(
      !src.includes('req.body.schoolId'),
      `${file} reads a school id from the request body — server-side tenant resolution only`
    );
  }
});