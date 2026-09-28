/**
 * One-time backfill: convert pasted HTML in existing company packs to markdown.
 *
 * This is the only thing that fixes content that is already in the database. The
 * editor and the save route normalise from now on, but every pack authored before
 * that change still holds literal `<br>` and `<p>` in the database, and the
 * student reader renders markdown without `rehype-raw` — so students see tag soup
 * until this runs.
 *
 *   ts-node --transpile-only scripts/repair-pack-content.ts            # dry run
 *   ts-node --transpile-only scripts/repair-pack-content.ts --apply    # write
 *
 * Safety properties, all covered by `scripts/repair.test.ts`:
 *   - refuses to write without `--apply`;
 *   - dry run reports a per-module diff and writes nothing at all;
 *   - writes a timestamped copy of db.json before the first change;
 *   - the preformatted fields (`cheatsheets[].content`, `interview_questions[].code`)
 *     are skipped, because their column alignment is the entire point;
 *   - idempotent: running it on clean data changes nothing and reports zero.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  RICH_TEXT_PATHS, clampRichFields, changedRichTextPaths, resolveRichTextValues,
} from '../src/lib/richText';

/**
 * Same resolution as `src/data/db.ts`: `backend/data/db.json`, overridable with
 * `DB_FILE` so a test can point this at a scratch copy.
 */
const DB_FILE = process.env.DB_FILE
  ? path.resolve(process.env.DB_FILE)
  : path.resolve(__dirname, '../data/db.json');

/** Fields that must keep their bytes: monospace, rendered in a <pre>. */
const SKIPPED_FIELDS = ['cheatsheets.[].content', 'interview_questions.[].code'];

export interface ModuleRepair {
  companyId: string;
  companyName: string;
  moduleId: string;
  moduleTitle: string;
  changedPaths: string[];
  /** How many literal <br> occurrences the repair removed. */
  brRemoved: number;
  before: unknown;
  after: unknown;
}

const countBrTags = (section: unknown): number =>
  RICH_TEXT_PATHS.reduce(
    (sum, p) =>
      sum + resolveRichTextValues(section, p).reduce(
        (n, v) => n + ((v.match(/<br\b/gi) || []).length),
        0
      ),
    0
  );

/** Repair one module's section_data. Returns null when there is nothing to fix. */
export function repairSection(section: unknown): ModuleRepair['after'] | null {
  if (!section || typeof section !== 'object' || Array.isArray(section)) return null;
  const repaired = clampRichFields(section);
  // `changedRichTextPaths` compares before/after, so an unchanged pack returns an
  // empty list and the caller can skip it.
  return changedRichTextPaths(section, repaired).length > 0 ? repaired : null;
}

/** Walk every module in a db object and collect the repairs needed. */
export function planRepairs(db: any): ModuleRepair[] {
  const repairs: ModuleRepair[] = [];
  for (const company of db?.companies || []) {
    for (const mod of company?.modules || []) {
      if (!mod?.section_data) continue;
      const after = repairSection(mod.section_data);
      if (after === null) continue;
      repairs.push({
        companyId: company.id ?? company.company_id ?? 'unknown',
        companyName: company.name ?? company.company_name ?? 'unknown',
        moduleId: mod.id ?? 'unknown',
        moduleTitle: mod.title ?? '(untitled)',
        changedPaths: changedRichTextPaths(mod.section_data, after),
        brRemoved: countBrTags(mod.section_data) - countBrTags(after),
        before: mod.section_data,
        after,
      });
    }
  }
  return repairs;
}

/** Apply a plan to a db object in memory. Does not touch the filesystem. */
export function applyRepairs(db: any, repairs: ModuleRepair[]): any {
  const byId = new Map(repairs.map((r) => [`${r.companyId}::${r.moduleId}`, r]));
  const next = { ...db, companies: (db?.companies || []).map((company: any) => ({
    ...company,
    modules: (company?.modules || []).map((mod: any) => {
      const hit = byId.get(`${company.id ?? 'unknown'}::${mod.id ?? 'unknown'}`);
      return hit ? { ...mod, section_data: hit.after } : mod;
    }),
  })) };
  return next;
}

/** A one-line preview of what changed in a field, for the dry-run report. */
export function fieldDiff(before: unknown, after: unknown, maxLen = 90): string | null {
  // A path can change length as well as content (an item added or removed), so
  // one side may be missing entirely. JSON.stringify returns undefined for
  // undefined, which would then blow up on `.length`.
  const show = (v: unknown) => (v === undefined ? '(absent)' : typeof v === 'string' ? v : JSON.stringify(v));
  const a = show(before);
  const b = show(after);
  if (a === b) return null;
  const cut = (s: string) => (s.length > maxLen ? `${s.slice(0, maxLen)}…` : s);
  return `- ${cut(a)}\n+ ${cut(b)}`;
}

function main() {
  const apply = process.argv.includes('--apply');
  if (!fs.existsSync(DB_FILE)) {
    console.error(`No database at ${DB_FILE}`);
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  const repairs = planRepairs(db);

  const modulesScanned = (db?.companies || []).reduce(
    (n: number, c: any) => n + (c?.modules || []).filter((m: any) => m?.section_data).length,
    0
  );
  const brTotal = repairs.reduce((n, r) => n + r.brRemoved, 0);
  const fieldsTotal = repairs.reduce((n, r) => n + r.changedPaths.length, 0);

  console.log('Pack content repair — dry run');
  console.log(`  database:        ${DB_FILE}`);
  console.log(`  modules scanned: ${modulesScanned}`);
  console.log(`  modules needing repair: ${repairs.length}`);
  console.log(`  fields changed:  ${fieldsTotal}`);
  console.log(`  <br> removed:    ${brTotal}`);
  console.log(`  skipped (preformatted): ${SKIPPED_FIELDS.join(', ')}`);

  if (repairs.length === 0) {
    console.log('\nNothing to repair. This is the idempotent no-op case.');
    return;
  }

  for (const r of repairs) {
    console.log(`\n  ${r.companyName} / ${r.moduleTitle} (${r.moduleId})`);
    for (const p of r.changedPaths) {
      const beforeVals = resolveRichTextValues(r.before, p);
      const afterVals = resolveRichTextValues(r.after, p);
      for (let i = 0; i < Math.max(beforeVals.length, afterVals.length); i += 1) {
        const line = fieldDiff(beforeVals[i], afterVals[i]);
        if (line) console.log(`    ${p}[${i}]\n    ${line.replace(/\n/g, '\n    ')}`);
      }
    }
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to write these changes.');
    return;
  }

  // Back up before the first write, so a bad run is always recoverable.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${DB_FILE}.bak-${stamp}`;
  fs.copyFileSync(DB_FILE, backup);
  console.log(`\nBackup written: ${backup}`);

  const next = applyRepairs(db, repairs);
  fs.writeFileSync(DB_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf-8');
  console.log(
    `\nApplied: ${repairs.length} module(s), ${fieldsTotal} field(s), ${brTotal} <br> occurrence(s) removed.`
  );
}

if (require.main === module) main();

export { DB_FILE };
