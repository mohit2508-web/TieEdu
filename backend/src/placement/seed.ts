import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { loadDb, saveDb, User } from '../data/db';
import { getPool } from '../db/client';
import { invalidatePlacementCache } from './access';
import { PlacementRole, PLACEMENT_ROLE_LABELS } from './permissions';

/**
 * Placement boot tasks.
 *
 * Two jobs, deliberately separable because they have very different risk:
 *
 * 1. `bootstrapSuperAdmin()` — runs on every boot. The platform owner needs a
 *    placement `super_admin` grant the first time the portal exists, or the
 *    portal would be a door with nobody holding a key. It is idempotent
 *    (find-or-create by user id) and only ever touches the super-admin row.
 *
 * 2. `seedDemoData()` — runs ONLY when `PLACEMENT_SEED=1`. It creates a demo
 *    college and role accounts with passwords from `PLACEMENT_SEED_PASSWORD`
 *    (falling back to a generated value printed once). An empty database
 *    cannot be photographed for a demo or exercised by tests, but seeding a
 *    real deployment by default would put `tpo@demo.test` on production data,
 *    so it is opt-in, loud, and refuses to run without an explicit password
 *    or a non-production NODE_ENV.
 */

const SEED_COLLEGE_SLUG = 'demo-college';

export async function bootstrapSuperAdmin(): Promise<void> {
  const db = loadDb();
  const admin = (db.users || []).find((u: User) => u.role === 'admin' && !u.disabled);
  if (!admin) return; // no platform admin account yet — nothing to grant

  const existing = await getPool().query(
    `SELECT access_id, status FROM placement_access
      WHERE user_id = $1 AND placement_role = 'super_admin' AND college_id IS NULL`,
    [admin.id]
  );
  if (existing.rows?.length) {
    if (existing.rows[0].status !== 'active') {
      await getPool().query(`UPDATE placement_access SET status = 'active', updated_at = NOW() WHERE access_id = $1`, [
        existing.rows[0].access_id,
      ]);
      invalidatePlacementCache(admin.id);
      console.log('🔑 [Placement] Reactivated super_admin grant for the platform admin account.');
    }
    return;
  }

  await getPool().query(
    `INSERT INTO placement_access (user_id, college_id, email, name, placement_role, status)
     VALUES ($1, NULL, $2, $3, 'super_admin', 'active')`,
    [admin.id, admin.email, admin.name || 'Platform admin']
  );
  invalidatePlacementCache(admin.id);
  console.log(`🔑 [Placement] Bootstrapped super_admin portal grant for ${admin.email}.`);
}

interface SeedAccount {
  email: string;
  name: string;
  role: PlacementRole;
}

const DEMO_ACCOUNTS: SeedAccount[] = [
  { email: 'tpo@demo.test', name: 'Demo T&P Head', role: 'tpo_head' },
  { email: 'officer@demo.test', name: 'Demo T&P Officer', role: 'tpo_officer' },
  { email: 'data@demo.test', name: 'Demo Data Officer', role: 'data_officer' },
  { email: 'trainer@demo.test', name: 'Demo Master Trainer', role: 'master_trainer' },
  { email: 'mentor@demo.test', name: 'Demo Faculty Mentor', role: 'faculty_mentor' },
  { email: 'hod@demo.test', name: 'Demo HoD', role: 'hod' },
  { email: 'management@demo.test', name: 'Demo VC', role: 'management' },
];

/**
 * Creates a JSON-ledger user if missing. Same fields a real signup writes —
 * a seeded account that is missing a field would behave differently from a
 * real one and hide exactly the bugs the demo is meant to show.
 */
function ensureSeedUser(account: SeedAccount, passwordHash: string): User {
  const db = loadDb();
  db.users = db.users || [];
  const existing = (db.users || []).find((u: User) => u.email === account.email);
  if (existing) return existing;

  const user: User = {
    id: `user-seed-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    name: account.name,
    email: account.email,
    password_hash: passwordHash,
    role: 'user',
    xp: 0,
    streak: 0,
    created_at: new Date().toISOString(),
  };
  db.users.push(user);
  saveDb(db);
  return user;
}

export async function seedDemoData(): Promise<void> {
  const enabled = process.env.PLACEMENT_SEED === '1';
  if (!enabled) return;

  const password = process.env.PLACEMENT_SEED_PASSWORD || '';
  if (!password && process.env.NODE_ENV === 'production') {
    console.log(
      '⚠️  [Placement] PLACEMENT_SEED=1 in production without PLACEMENT_SEED_PASSWORD — refusing to seed. Set the password explicitly or unset PLACEMENT_SEED.'
    );
    return;
  }

  // Dev convenience: a deterministic default so `npm run dev` just works, but
  // never the same default in production (guarded above).
  const effectivePassword = password || 'PlacementDemo#2026';
  if (!password) {
    console.log('⚠️  [Placement] PLACEMENT_SEED_PASSWORD unset — using the dev default for demo accounts.');
  }
  const passwordHash = bcrypt.hashSync(effectivePassword, 12);

  // --- College -------------------------------------------------------------
  let collegeRes = await getPool().query(`SELECT college_id FROM placement_college WHERE slug = $1`, [
    SEED_COLLEGE_SLUG,
  ]);
  let collegeId = collegeRes.rows?.[0]?.college_id;
  if (!collegeId) {
    const created = await getPool().query(
      `INSERT INTO placement_college (slug, name, short_name, theme_color, created_by)
       VALUES ($1, $2, $3, $4, NULL)
       RETURNING college_id`,
      [SEED_COLLEGE_SLUG, 'Demo College of Engineering', 'DCE', '#1F3A5F']
    );
    collegeId = created.rows?.[0]?.college_id;
    console.log(`🌱 [Placement] Seeded demo college "Demo College of Engineering".`);
  }

  // --- Seasons (2026-27 is the analysis season in the plan; 2025-26 stays
  // open for the prior-year comparisons the analytics screens render). ------
  for (const [seasonId, status] of [
    ['2026-27', 'open'],
    ['2025-26', 'locked'],
  ] as const) {
    await getPool().query(
      `INSERT INTO placement_season (college_id, season_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (college_id, season_id) DO NOTHING`,
      [collegeId, seasonId, status]
    );
  }

  // --- Accounts + grants ---------------------------------------------------
  for (const account of DEMO_ACCOUNTS) {
    const user = ensureSeedUser(account, passwordHash);
    const existing = await getPool().query(
      `SELECT access_id FROM placement_access WHERE user_id = $1 AND college_id = $2`,
      [user.id, collegeId]
    );
    if (existing.rows?.length) continue;

    await getPool().query(
      `INSERT INTO placement_access (user_id, college_id, email, name, placement_role, status)
       VALUES ($1,$2,$3,$4,$5,'active')`,
      [user.id, collegeId, account.email, account.name, account.role]
    );
    invalidatePlacementCache(user.id);
    console.log(
      `🌱 [Placement] Seeded ${account.email} as ${PLACEMENT_ROLE_LABELS[account.role]} (password from env / dev default).`
    );
  }

  // --- One active company + one completed drive so the dashboard is not a
  // wall of zeros on first open (empty-but-valid ≠ useful demo). -----------
  const company = await getPool().query(
    `INSERT INTO placement_company (college_id, canonical_name, aliases, sector, type)
     VALUES ($1, 'Acme Technologies Pvt Ltd', '["Acme Tech","Acme Technologies"]', 'IT Services', 'Product')
     ON CONFLICT DO NOTHING
     RETURNING company_id`,
    [collegeId]
  );
  const companyId =
    company.rows?.[0]?.company_id ||
    (await getPool().query(`SELECT company_id FROM placement_company WHERE college_id = $1 LIMIT 1`, [collegeId]))
      .rows?.[0]?.company_id;

  if (companyId) {
    const drive = await getPool().query(
      `INSERT INTO placement_drive (college_id, season_id, company_id, date, mode, status, package_ctc)
       VALUES ($1, '2026-27', $2, CURRENT_DATE, 'On Campus', 'completed', 6.5)
       ON CONFLICT DO NOTHING
       RETURNING drive_id`,
      [collegeId, companyId]
    );
    console.log('🌱 [Placement] Seeded one demo company + drive for the dashboard.');
    void drive;
  }

  console.log(
    `✅ [Placement] Demo seed complete. Sign in with one of: ${DEMO_ACCOUNTS.map((a) => a.email).join(', ')}`
  );
}

/** Boot sequence: migrations → bootstrap → optional demo seed. */
export async function runPlacementBoot(): Promise<boolean> {
  const { runPlacementMigrations } = await import('../db/placementMigrate');
  const ok = await runPlacementMigrations();
  if (!ok) return false;
  try {
    await bootstrapSuperAdmin();
    await seedDemoData();
    return true;
  } catch (err: any) {
    console.log(`💡 [Placement] Boot tasks failed after migrations: ${err?.message}`);
    return false;
  }
}
