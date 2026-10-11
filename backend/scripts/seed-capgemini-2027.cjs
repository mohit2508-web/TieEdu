#!/usr/bin/env node
/**
 * Rebuild the live Capgemini mock drive: "Capgemini Mock Drive (New Format 2027)".
 *
 * What it does, in order:
 *   1. Safety audit — every FK pointing at mock_drive must CASCADE, and the old
 *      drive must have zero attempts (money/integrity: never drop attempts).
 *   2. Backup — old drive row + registrations + payments + bookings + rounds
 *      land in scripts/backups/ before anything is deleted.
 *   3. Delete the old drive (CASCADE removes registrations, slots, payments;
 *      plain-text drive_id rows in launch/attempt/notification are cleared here).
 *   4. Create the new drive: ₹99 fee, registration open now → 15 Oct IST,
 *      CTC 4.5–16 LPA, the new-format description, status=published.
 *   5. Attach the one existing ContestOS test as round 1 (open unlock).
 *   6. Generate slots: 7 per day × 11–15 Oct 2026 IST (10:00, 12:00, 14:00,
 *      16:00, 18:00, 20:00, 22:00), 1 hour each, 50 seats = 35 slots.
 *
 * Run:  node scripts/seed-capgemini-2027.cjs [--dry-run]
 * Re-runnable: an existing published copy with zero attempts is backed up and
 * replaced too; one with attempts aborts (close it from the admin instead).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry-run');
const OLD_DRIVE_ID = '67185299-ba79-4443-98ed-554c38f8e831';
const NEW_TITLE = 'Capgemini Mock Drive (New Format 2027)';
const TEST_ID = '14185012-855e-419c-b671-014a81353dbb';

const SLOT_TIMES_IST = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
const SLOT_DAYS = ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'];
const CAPACITY = 50;
const DURATION_MIN = 60;
const FEE_PAISE = 9900;

const DESCRIPTION_MD = [
  '**Capgemini Mock Drive — New Format 2027** · Package **₹4.5 LPA – 16 LPA**',
  '',
  'Actual Capgemini drives run on **16–17 Oct**. This mock mirrors that new format. The test contains:',
  '',
  '1. AI-assisted Coding',
  '2. Debugging Coding',
  '3. Pseudo Code',
  '4. Hands-on DSA practice',
  '…and the rest of the real drive pattern.',
  '',
  '**Fee ₹99** — upload your UPI proof, get approval, then book your slot.',
  '',
  'Slots: **7 daily (11–15 Oct)** — 10:00 AM, 12:00 PM, 2:00 PM, 4:00 PM, 6:00 PM, 8:00 PM, 10:00 PM IST. One hour each, **50 seats per slot**. Your test link goes live in your portal when the admin releases it.',
].join('\n');

/** 'YYYY-MM-DD' + 'HH:MM' (IST) → ISO instant + the matching slot_date. */
function istStart(dayStr, timeStr) {
  const [y, m, d] = dayStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const ms = Date.UTC(y, m - 1, d, hh, mm) - 330 * 60000; // IST = UTC+5:30
  return new Date(ms);
}

async function auditFk(client) {
  const r = await client.query(`
    SELECT con.conrelid::regclass::text AS tbl, con.confdeltype
      FROM pg_constraint con
     WHERE con.contype = 'f' AND con.confrelid = 'mock_drive'::regclass`);
  const bad = r.rows.filter((x) => x.confdeltype !== 'c');
  if (bad.length) {
    console.error('ABORT: FKs without ON DELETE CASCADE on mock_drive:', bad);
    process.exit(1);
  }
  console.log(`FK audit ok — ${r.rows.length} cascade references.`);
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await auditFk(client);

    // Existing copy: the original live drive, or a previous run of this script.
    const existing = await client.query(
      `SELECT * FROM mock_drive WHERE drive_id=$1 OR title=$2 ORDER BY created_at DESC LIMIT 1`,
      [OLD_DRIVE_ID, NEW_TITLE]
    );
    const old = existing.rows[0];
    let removed = 0;

    if (old) {
      const attempts = await client.query(
        `SELECT COUNT(*)::INT AS n FROM drive_attempt WHERE drive_id=$1`, [old.drive_id]
      );
      if (attempts.rows[0].n > 0) {
        console.error(`ABORT: drive ${old.drive_id} has ${attempts.rows[0].n} attempts — close it from the admin instead of deleting.`);
        process.exit(1);
      }

      // Sequential on purpose — one pg client must not run queries concurrently.
      const regs = await client.query(`SELECT * FROM drive_registration WHERE drive_id=$1`, [old.drive_id]);
      const payments = await client.query(`SELECT * FROM drive_payment WHERE drive_id=$1`, [old.drive_id]);
      const bookings = await client.query(`SELECT * FROM drive_slot_booking WHERE drive_id=$1`, [old.drive_id]);
      const rounds = await client.query(
        `SELECT mdt.*, t.name AS test_name FROM mock_drive_test mdt JOIN drive_test t ON t.test_id=mdt.test_id WHERE mdt.drive_id=$1`,
        [old.drive_id]
      );

      const backups = path.join(__dirname, 'backups');
      fs.mkdirSync(backups, { recursive: true });
      const file = path.join(backups, `capgemini-drive-${old.drive_id}-${Date.now()}.json`);
      fs.writeFileSync(file, JSON.stringify({
        drive: old,
        registrations: regs.rows,
        payments: payments.rows,
        bookings: bookings.rows,
        rounds: rounds.rows,
      }, null, 2));
      console.log(`Backed up old drive → ${file}`);

      if (!DRY) {
        // Plain-text drive_id columns (no FK): clear them before the CASCADE delete.
        await client.query(`DELETE FROM drive_launch WHERE drive_id=$1`, [old.drive_id]);
        await client.query(`DELETE FROM drive_attempt WHERE drive_id=$1`, [old.drive_id]);
        await client.query(`DELETE FROM drive_notification WHERE drive_id=$1`, [old.drive_id]);
        const del = await client.query(`DELETE FROM mock_drive WHERE drive_id=$1`, [old.drive_id]);
        removed = del.rowCount;
        console.log(`Deleted old drive (${removed} row, children cascaded).`);
      }
    } else {
      console.log('No previous Capgemini drive found — creating fresh.');
    }

    if (DRY) {
      console.log('DRY RUN — nothing written.');
      return;
    }

    const createdBy = old?.created_by || 'user-1790320272370-241ffb';
    const ins = await client.query(
      `INSERT INTO mock_drive (company_name, title, description, drive_type,
                               starts_at, ends_at, eligibility, registration_mode,
                               results_visibility, status, created_by,
                               location, job_type, category, ctc_min, ctc_max,
                               description_md, other_info, documents, tpo_contact,
                               registration_opens_at, registration_closes_at,
                               fee_amount_paise)
       VALUES ($1,$2,$3,'mock',$4,$5,'{}','open','manual','published',$6,
               $7,$8,'IT Services',450000,1600000,$9,'{}','[]','{}',$10,$11,$12)
       RETURNING drive_id`,
      [
        'Capgemini',
        NEW_TITLE,
        'Capgemini New Format 2027 mock — ₹4.5–16 LPA, AI-assisted coding, debugging, pseudo code, DSA.',
        '2026-10-11T00:00:00+05:30',
        '2026-10-15T23:59:59+05:30',
        createdBy,
        'Remote / as per drive',
        'Full Time',
        DESCRIPTION_MD,
        new Date().toISOString(),
        '2026-10-15T23:59:00+05:30',
        FEE_PAISE,
      ]
    );
    const driveId = ins.rows[0].drive_id;
    console.log(`Created drive ${driveId} (published, ₹${FEE_PAISE / 100}, registration → 15 Oct IST).`);

    const testOk = await client.query(`SELECT test_id FROM drive_test WHERE test_id=$1`, [TEST_ID]);
    if (!testOk.rows.length) {
      console.warn(`WARN: test ${TEST_ID} not found — skipping round attach.`);
    } else {
      await client.query(
        `INSERT INTO mock_drive_test (drive_id, test_id, sort_order, mandatory, weight,
                                      max_attempts, window_hard_close, unlock_rule, round_name, kind)
         VALUES ($1,$2,1,TRUE,1,1,TRUE,'{"kind":"open"}',$3,'coding')
         ON CONFLICT (drive_id, test_id) DO NOTHING`,
        [driveId, TEST_ID, 'Capgemini Mock Test (New Format 2027)']
      );
      console.log('Attached round 1: Capgemini Mock Test (New Format 2027).');
    }

    let slots = 0;
    for (const day of SLOT_DAYS) {
      for (const time of SLOT_TIMES_IST) {
        const starts = istStart(day, time);
        const ends = new Date(starts.getTime() + DURATION_MIN * 60000);
        const r = await client.query(
          `INSERT INTO drive_slot (drive_id, slot_date, starts_at, ends_at, capacity, status)
           VALUES ($1,$2,$3,$4,$5,'open')
           ON CONFLICT (drive_id, starts_at) DO NOTHING`,
          [driveId, day, starts.toISOString(), ends.toISOString(), CAPACITY]
        );
        slots += r.rowCount;
      }
    }
    console.log(`Slots created: ${slots} (${SLOT_DAYS.length} days × ${SLOT_TIMES_IST.length}/day, ${CAPACITY} seats, ${DURATION_MIN}min).`);
    console.log(`DONE. Drive: /mock-drive/drives/${driveId}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('SEED FAILED:', e.message);
  process.exit(1);
});
