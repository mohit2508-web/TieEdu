/**
 * Repairs encoding corruption ("Ã¢â‚¬â€" instead of "—") across the whole store.
 *
 *   ts-node --transpile-only scripts/repair-mojibake.ts            # dry run
 *   ts-node --transpile-only scripts/repair-mojibake.ts --apply    # backup, then write
 *
 * - The dry run counts every changed string and object key, prints samples, and
 *   writes nothing.
 * - --apply copies db.json to db.json.bak-<timestamp> first, so a bad run is
 *   always recoverable, then writes atomically (temp file + rename).
 * - Idempotent: a second run finds nothing to do.
 *
 * Uses `repairMojibakeGenericDeep`, which repairs keys as well as values — quiz
 * answer maps are keyed by option text and must stay in step with the options.
 * `DB_FILE` points it at a scratch copy for testing.
 */
import fs from 'fs';
import path from 'path';
import { repairMojibakeGeneric, repairMojibakeGenericDeep } from '../src/lib/textEncoding';

const DB_FILE = process.env.DB_FILE
  ? path.resolve(process.env.DB_FILE)
  : path.resolve(__dirname, '../data/db.json');

const SUSPECT = /Ã[\u0080-¿ -⃿]|â€|Â[\u0080-¿]/g;

function samples(before: any, after: any, limit = 8): string[] {
  const out: string[] = [];
  const walk = (a: any, b: any, p: string) => {
    if (out.length >= limit) return;
    if (typeof a === 'string') {
      if (a !== b) {
        const i = Array.from(a).findIndex((ch, k) => ch !== Array.from(String(b))[k]);
        out.push(`${p}\n    before: ${JSON.stringify(a.slice(Math.max(0, i - 30), i + 30))}\n    after:  ${JSON.stringify(String(b).slice(Math.max(0, i - 30), i + 25))}`);
      }
      return;
    }
    if (Array.isArray(a)) return a.forEach((x, i) => walk(x, b?.[i], `${p}[${i}]`));
    if (a && typeof a === 'object') {
      for (const k of Object.keys(a)) walk(a[k], b?.[repairMojibakeGeneric(k)], `${p}.${k}`);
    }
  };
  walk(before, after, '');
  return out;
}

function main() {
  const apply = process.argv.includes('--apply');
  if (!fs.existsSync(DB_FILE)) {
    console.error(`No database at ${DB_FILE}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(DB_FILE, 'utf-8').replace(/^﻿/, '');
  const before = JSON.parse(raw);
  const { value: after, changed } = repairMojibakeGenericDeep(JSON.parse(raw));
  const nextText = `${JSON.stringify(after, null, 2)}\n`;

  console.log('Encoding repair — ' + (apply ? 'APPLY' : 'dry run'));
  console.log(`  database:            ${DB_FILE}`);
  console.log(`  strings/keys fixed:  ${changed}`);
  console.log(`  suspect runs before: ${(raw.match(SUSPECT) || []).length}`);
  console.log(`  suspect runs after:  ${(nextText.match(SUSPECT) || []).length}`);

  if (changed === 0) {
    console.log('\nNothing to repair.');
    return;
  }
  for (const line of samples(before, after)) console.log(`\n  ${line}`);

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to write these changes.');
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${DB_FILE}.bak-${stamp}`;
  fs.copyFileSync(DB_FILE, backup);
  console.log(`\nBackup written: ${backup}`);

  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, nextText, 'utf-8');
  fs.renameSync(tmp, DB_FILE);
  console.log(`Applied: ${changed} string(s)/key(s) repaired.`);
}

if (require.main === module) main();

export { DB_FILE };
