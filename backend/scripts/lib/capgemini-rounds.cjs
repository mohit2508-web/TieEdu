/**
 * The Capgemini "New Format 2027" drive has ONE round — the single test
 * contains all four question types (AI-assisted Coding, Debugging Coding,
 * Pseudo Code, Hands-on DSA practice; they are listed in the drive
 * description). Do not split it into multiple rounds.
 *
 * Idempotent: cleans up any stray per-section round rows from an earlier
 * 4-round attempt, then attaches the original test as round 1 (open unlock).
 *
 * `client` must be a single pg client (queries run sequentially).
 */
const TEST_ID = '14185012-855e-419c-b671-014a81353dbb';
const ROUND_NAME = 'Capgemini Mock Test (New Format 2027)';
/** The four question types — shown to students on the round card. */
const ROUND_DESCRIPTION =
  'AI-assisted Coding — 2 questions\nDebugging Coding — 2 questions\nPseudo Code — 15 questions\nHands-on DSA — 1 question';
/** Stray per-section rows this script is allowed to remove (never attached elsewhere). */
const STRAY_SLUGS = [
  'capgemini-2027-ai-coding',
  'capgemini-2027-debugging',
  'capgemini-2027-pseudo-code',
  'capgemini-2027-hands-on-dsa',
];

async function setupCapgeminiRound(client, driveId) {
  await client.query(
    `DELETE FROM mock_drive_test WHERE drive_id=$1 AND test_id IN (SELECT test_id FROM drive_test WHERE slug = ANY($2))`,
    [driveId, STRAY_SLUGS]
  );
  await client.query(`DELETE FROM drive_test WHERE slug = ANY($1)`, [STRAY_SLUGS]);

  const testOk = await client.query(`SELECT test_id FROM drive_test WHERE test_id=$1`, [TEST_ID]);
  if (!testOk.rows.length) throw new Error(`drive_test ${TEST_ID} not found`);
  // One round, no misleading per-round duration/question count (the real
  // structure lives in round_description).
  await client.query(
    `UPDATE drive_test SET duration_minutes=NULL, total_questions=NULL WHERE test_id=$1`,
    [TEST_ID]
  );

  await client.query(
    `INSERT INTO mock_drive_test (drive_id, test_id, sort_order, mandatory, weight,
                                  max_attempts, window_hard_close, unlock_rule, round_name, kind, round_description)
     VALUES ($1,$2,1,TRUE,1,1,TRUE,'{"kind":"open"}',$3,'coding',$4)
     ON CONFLICT (drive_id, test_id) DO UPDATE SET
       sort_order=1, unlock_rule='{"kind":"open"}', round_name=EXCLUDED.round_name,
       kind=EXCLUDED.kind, round_description=EXCLUDED.round_description,
       mandatory=TRUE, max_attempts=1`,
    [driveId, TEST_ID, ROUND_NAME, ROUND_DESCRIPTION]
  );
  return { round: ROUND_NAME, test_id: TEST_ID };
}

module.exports = { setupCapgeminiRound, TEST_ID, ROUND_NAME, ROUND_DESCRIPTION };
