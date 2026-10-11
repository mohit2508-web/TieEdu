#!/usr/bin/env node
/**
 * Ensure the Capgemini drive has exactly ONE round (the original test; its
 * content covers the four question types). Also removes any stray per-section
 * round rows from an earlier 4-round attempt.
 *
 * Run:  node scripts/setup-capgemini-rounds.cjs [driveId]
 * Default drive: the seeded 2027 mock drive (found by title if the id moved).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const { setupCapgeminiRound } = require('./lib/capgemini-rounds.cjs');

const DEFAULT_DRIVE_ID = '11353a51-b438-4472-8bf8-94a9c77145d9';
const TITLE = 'Capgemini Mock Drive (New Format 2027)';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const argId = process.argv[2];
    const found = await client.query(
      `SELECT drive_id FROM mock_drive WHERE drive_id=$1 OR title=$2 ORDER BY created_at DESC LIMIT 1`,
      [argId || DEFAULT_DRIVE_ID, TITLE]
    );
    if (!found.rows.length) {
      console.error('ABORT: drive not found.');
      process.exit(1);
    }
    const driveId = found.rows[0].drive_id;
    const round = await setupCapgeminiRound(client, driveId);
    console.log(`Drive ${driveId} — round set: ${round.round} (${round.test_id})`);

    const check = await client.query(
      `SELECT mdt.sort_order, mdt.round_name, mdt.kind, mdt.unlock_rule, t.name, t.duration_minutes, t.total_questions
         FROM mock_drive_test mdt JOIN drive_test t ON t.test_id=mdt.test_id
        WHERE mdt.drive_id=$1 ORDER BY mdt.sort_order`,
      [driveId]
    );
    console.log('Rounds on drive:', check.rows.length);
    console.log(JSON.stringify(check.rows, null, 2));
    const stray = await client.query(`SELECT count(*) FROM drive_test WHERE slug LIKE 'capgemini-2027-%'`);
    console.log('Stray section tests remaining:', stray.rows[0].count);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
