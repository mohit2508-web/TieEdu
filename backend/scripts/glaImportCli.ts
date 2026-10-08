/**
 * GLA University placement-data import — database half.
 *
 * Reads `backend/seed-data/gla-drives.csv` and `gla-students.csv` (the exports
 * a T&P office pastes from its drive log and student masterfile), parses them
 * with `src/placement/glaImport.ts`, and writes the result into the placement
 * schema for one college (slug `gla` by default).
 *
 * Safety:
 *  - Requires `PLACEMENT_IMPORT=1` in production, mirroring `PLACEMENT_SEED`.
 *  - Runs in a single transaction — a bad row rolls the whole import back.
 *  - Wipe-and-load, scoped to the target college + the seasons present in the
 *    file: offers and drives are deleted before re-insertion so re-running the
 *    import is deterministic instead of stacking duplicate rows.
 *  - Company rows are never deleted. The drive log defines the drive-linked
 *    company set; offer companies that do not normalize onto it are created as
 *    offer-only company rows (no drive_id on their offers) rather than being
 *    alias-guessed — for this file fuzzy candidates were verified false
 *    positives (e.g. "Twinverse Technology" vs "Twin Mind").
 *  - The raw files carry real PII and belong to `backend/seed-data/`, which is
 *    git-ignored; this script never writes them anywhere but the database.
 *
 * Usage: `npm run import:gla [slug]`
 */

import fs from 'fs';
import path from 'path';
import { getPool, isDbReachable } from '../src/db/client';
import {
  detectDelimiter,
  driveRowIssues,
  normalizeCompanyName,
  parseCsv,
  parseDriveLog,
  parseStudentMaster,
  summarize,
} from '../src/placement/glaImport';

const SEED_DIR = path.join(__dirname, '..', 'seed-data');
const BACKEND_ROOT = path.join(__dirname, '..');

function resolveInput(fileName: string): string | null {
  const candidates = [path.join(SEED_DIR, fileName), path.join(BACKEND_ROOT, fileName)];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

const DRIVES_FILE = resolveInput('gla-drives.csv');
const STUDENTS_FILE = resolveInput('gla-students.csv');

const COLLEGE_SLUG = process.argv[2] || 'gla';
const COLLEGE_NAME = 'GLA University';
const COLLEGE_SHORT = 'GLA';

function fail(message: string): never {
  console.error(`❌ [GLA Import] ${message}`);
  process.exit(1);
}

function readRows(file: string | null, label: string): string[][] {
  if (!file || !fs.existsSync(file)) fail(`missing ${file || path.join(SEED_DIR, label)}`);
  const text = fs.readFileSync(file, 'utf8');
  if (!text.trim()) fail(`empty ${file}`);
  const rows = parseCsv(text, detectDelimiter(text));
  console.log(`📄 [GLA Import] ${label}: ${rows.length - 1} data rows from ${path.basename(file)}`);
  return rows;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const enabled = process.env.PLACEMENT_IMPORT === '1' || dryRun;
  if (enabled && process.env.NODE_ENV === 'production' && !process.argv.includes('--yes')) {
    fail('PLACEMENT_IMPORT=1 in production needs --yes to confirm.');
  }

  const driveRows = readRows(DRIVES_FILE, 'drive log');
  const drives = parseDriveLog(driveRows);
  const students = parseStudentMaster(readRows(STUDENTS_FILE, 'student master'));
  const summary = summarize(drives, students);
  if (!drives.length) fail('no drives parsed from the drive log');
  if (!students.length) fail('no students parsed from the student master');

  console.log(
    `📊 [GLA Import] ${summary.driveCount} drives / ${summary.distinctCompanies} companies / ` +
      `seasons ${summary.seasonIds.join(', ')} / ${summary.studentCount} students / ` +
      `${summary.placedStudents} placed / ${summary.offerCount} offers`
  );
  const issues = driveRowIssues(driveRows);
  if (issues.shifted) {
    console.log(
      `⚠️  [GLA Import] ${issues.shifted} drive(s) are column-shifted in the source (missing the empty "Program" cell, so a stipend sits in the "On" slot). ` +
        `They were realigned automatically — dates come from the "Date" column and Branch/Cat/Brand/Type/Stipend/Package are read from the shifted positions. ` +
        `The source CSV is still misaligned; fix the export if you want pristine rows.`
    );
  } else {
    console.log(`✅ [GLA Import] Source drives all aligned — no shifted rows detected.`);
  }
  if (issues.dateless) {
    console.log(
      `⚠️  [GLA Import] ${issues.dateless} drive(s) had no parseable date — they will land in the fallback season '2025-26'. Check and fix those source rows before importing for real.`
    );
  }
  if (summary.datelessDriveCount) {
    console.log(
      `⚠️  [GLA Import] ${summary.datelessDriveCount} parsed drive row(s) landed in the fallback season '2025-26'.`
    );
  }

  if (dryRun) {
    const topCompanies = Object.entries(summary.perCompanyDrivePlaced)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
    console.log(`🏆 [GLA Import] Top drive-log placed companies (dry-run):`);
    for (const [name, count] of topCompanies) console.log(`  ${count.toString().padStart(4)}  ${name}`);
    if (summary.unmatchedOfferCompanies.length) {
      console.log(
        `ℹ️  [GLA Import] ${summary.unmatchedOfferCompanies.length} offer company name(s) have no drive-log row — they will be created as offer-only companies (their offers carry no drive_id):\n  ` +
          summary.unmatchedOfferCompanies.join('\n  ')
      );
    }
    console.log('✅ [GLA Import] Dry-run complete — no database was touched.');
    return;
  }

  if (!(await isDbReachable(6000))) {
    fail('PostgreSQL unreachable — set DATABASE_URL in backend/.env.');
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // --- College ----------------------------------------------------------
    let collegeRes = await client.query(`SELECT college_id FROM placement_college WHERE slug = $1`, [COLLEGE_SLUG]);
    let collegeId = collegeRes.rows?.[0]?.college_id;
    if (!collegeId) {
      const created = await client.query(
        `INSERT INTO placement_college (slug, name, short_name, theme_color, created_by)
         VALUES ($1, $2, $3, $4, NULL) RETURNING college_id`,
        [COLLEGE_SLUG, COLLEGE_NAME, COLLEGE_SHORT, '#1F3A5F']
      );
      collegeId = created.rows?.[0]?.college_id;
      console.log(`🏫 [GLA Import] Created college "${COLLEGE_NAME}" (slug ${COLLEGE_SLUG}).`);
    }

    // --- Seasons ----------------------------------------------------------
    const seasonIds = Array.from(new Set(drives.map((d) => d.seasonId)));
    for (const seasonId of seasonIds) {
      await client.query(
        `INSERT INTO placement_season (college_id, season_id, status)
         VALUES ($1, $2, 'open')
         ON CONFLICT (college_id, season_id) DO NOTHING`,
        [collegeId, seasonId]
      );
    }

    // --- Wipe-and-load scope for offers + drives --------------------------
    await client.query(`DELETE FROM placement_offer WHERE college_id = $1`, [collegeId]);
    await client.query(`DELETE FROM placement_drive WHERE college_id = $1`, [collegeId]);
    console.log(`🧹 [GLA Import] Cleared existing drives + offers for college ${COLLEGE_SLUG}.`);

    // --- Companies (drive log is the universe) -----------------------------
    const companyIdByNormalized = new Map<string, string>();
    for (const d of drives) {
      const key = normalizeCompanyName(d.companyName);
      if (companyIdByNormalized.has(key)) continue;
      const existing = await client.query(
        `SELECT company_id FROM placement_company WHERE college_id = $1 AND canonical_name = $2`,
        [collegeId, d.companyName]
      );
      let companyId = existing.rows?.[0]?.company_id;
      if (!companyId) {
        const created = await client.query(
          `INSERT INTO placement_company (college_id, canonical_name, aliases, category, type)
           VALUES ($1, $2, '[]', $3, $4) RETURNING company_id`,
          [collegeId, d.companyName, d.category || null, d.mode]
        );
        companyId = created.rows?.[0]?.company_id;
      }
      companyIdByNormalized.set(key, companyId);
    }

    // --- Offer-only companies ------------------------------------------------
    // Students sometimes get offers from companies that never appear in the
    // drive log (off-campus / unnoted drives). Create a company row for each
    // such name so the offer ledger stays complete; their offers carry no
    // drive_id. Aliases are not guessed — fuzzy matches are known to be false
    // positives for this file (e.g. "Twinverse" vs "Twin Mind").
    let offerOnlyCount = 0;
    for (const s of students) {
      for (const o of s.offers) {
        const key = normalizeCompanyName(o.companyName);
        if (companyIdByNormalized.has(key)) continue;
        const existing = await client.query(
          `SELECT company_id FROM placement_company WHERE college_id = $1 AND canonical_name = $2`,
          [collegeId, o.companyName]
        );
        let companyId = existing.rows?.[0]?.company_id;
        if (!companyId) {
          const created = await client.query(
            `INSERT INTO placement_company (college_id, canonical_name, aliases, category, type)
             VALUES ($1, $2, '[]', NULL, NULL) RETURNING company_id`,
            [collegeId, o.companyName]
          );
          companyId = created.rows?.[0]?.company_id;
          offerOnlyCount++;
        }
        companyIdByNormalized.set(key, companyId);
      }
    }

    // --- Drives ------------------------------------------------------------
    const driveByKey = new Map<string, string>();
    let driveInserted = 0;
    for (const d of drives) {
      const companyId = companyIdByNormalized.get(normalizeCompanyName(d.companyName));
      if (!companyId) continue;
      const inserted = await client.query(
        `INSERT INTO placement_drive (
           college_id, season_id, company_id, reference_no, date, mode, officer,
           courses, rounds, stipend, package_ctc, registered, appeared, selected, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'completed')
         RETURNING drive_id`,
        [
          collegeId,
          d.seasonId,
          companyId,
          d.referenceNo || null,
          d.date,
          d.mode,
          d.officer || null,
          JSON.stringify(d.courses),
          JSON.stringify(d.rounds),
          d.stipend,
          d.packageCtcLpa,
          d.registered,
          d.appeared,
          d.selected,
        ]
      );
      driveByKey.set(`${d.seasonId}|${normalizeCompanyName(d.companyName)}`, inserted.rows?.[0]?.drive_id);
      driveInserted++;
    }

    // --- Students + per-season dimensions ------------------------------------
    let studentUpserted = 0;
    for (const s of students) {
      const profile = await client.query(
        `INSERT INTO placement_student (
           college_id, roll_no, name, gender, course, admission_year, email,
           email_personal, mobile, father_mobile, state, district
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (college_id, roll_no) DO NOTHING`,
        [
          collegeId,
          s.rollNo,
          s.name,
          s.gender,
          s.course || null,
          s.admissionYear || null,
          s.email || null,
          s.emailPersonal || null,
          s.mobile || null,
          s.fatherMobile || null,
          s.state || null,
          s.district || null,
        ]
      );
      void profile;

      // Each season the file contains. Drive logs determine the season list,
      // but a student row is placed in every season that appears so a student
      // who sat in two years gets two analysis units.
      for (const seasonId of seasonIds) {
        await client.query(
          `INSERT INTO placement_student_season (
             college_id, roll_no, season_id, year_of_study, class10_pct, class12_pct,
             btech_pct, cpi, attendance_pct, backlogs, gap_year, drives_participated,
             eligible, ej_flag, ej_details
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Y',$13,$14)
           ON CONFLICT (college_id, roll_no, season_id) DO NOTHING`,
          [
            collegeId,
            s.rollNo,
            seasonId,
            s.yearOfStudy || null,
            s.class10Pct,
            s.class12Pct,
            s.btechPct,
            s.cpi,
            s.attendancePct,
            s.backlogs,
            s.gapYear,
            s.drivesParticipated,
            s.ejFlag,
            s.ejDetails || null,
          ]
        );
      }
      studentUpserted++;
    }

    // --- Offers (one row per Company Placed-k / Packages-k pair) -------------
    let offerInserted = 0;
    const unmatchedHere = new Set<string>();
    for (const s of students) {
      for (const o of s.offers) {
        const key = normalizeCompanyName(o.companyName);
        const companyId = companyIdByNormalized.get(key);
        if (!companyId) {
          unmatchedHere.add(o.companyName);
          continue;
        }
        const driveId = driveByKey.get(`${seasonIds[0]}|${key}`) || null;
        await client.query(
          `INSERT INTO placement_offer (
             college_id, roll_no, season_id, company_id, drive_id, ctc_lpa, offer_type, source, accepted
           ) VALUES ($1,$2,$3,$4,$5,$6,'FTE','campus',$7)`,
          [collegeId, s.rollNo, seasonIds[0], companyId, driveId, o.ctcLpa, s.placed === 'N' ? 'no' : 'yes']
        );
        offerInserted++;
      }
    }

    await client.query('COMMIT');

    console.log(
      `✅ [GLA Import] Wrote ${driveInserted} drives, ${studentUpserted} students, ${offerInserted} offers ` +
        `for college ${COLLEGE_SLUG} (seasons ${seasonIds.join(', ')}); ` +
        `${offerOnlyCount} offer-only compan${offerOnlyCount === 1 ? 'y' : 'ies'} created.`
    );
    if (unmatchedHere.size) {
      console.log(
        `⚠️  [GLA Import] ${unmatchedHere.size} offer company name(s) had no company row — offers skipped (should not happen now):\n  ` +
          Array.from(unmatchedHere).join('\n  ')
      );
    }
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => undefined);
    fail(`transaction rolled back — ${err?.message || err}`);
  } finally {
    client.release();
  }
}

main();