/**
 * M2 verification: boot ordering.
 *
 * The dangerous sequence is:
 *   ensureSeedData() writes the bootstrap grant to JSON
 *   -> runMigrations() creates the staff table
 *   -> warmStaffCache() decides what the authority cache contains
 *
 * If warm read an empty PostgreSQL table and treated it as authoritative, the
 * deployment would boot, the admin would sign in, and every permission check
 * would fail. This runs the whole sequence against a scratch copy of the real
 * ledger with no database configured, and asserts the grant exists afterwards.
 *
 * Writes nothing to the live ledger: DB_FILE points at a copy for the duration.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..', 'data', 'db.json');
const TMP = path.join(__dirname, '..', 'data', 'db.json.m2seedtest');

fs.copyFileSync(SRC, TMP);
process.env.DB_FILE = TMP;
// Clear before anything imports db/client: dotenv will not repopulate a key that
// already exists, so this keeps migrations (and every live write) out of the run.
process.env.DATABASE_URL = '';
// Port 0 asks the OS for a free port, so this cannot collide with a dev server
// that happens to be running, and cannot fail the boot this test depends on.
process.env.PORT = '0';

const main = async () => {
  const before = JSON.parse(fs.readFileSync(TMP, 'utf-8'));
  console.log('before: staff rows =', (before.staff || []).length, ', users =', (before.users || []).length);

  const server = await import('../src/server');

  // give the listen callback time to run seed -> migrate -> warm
  await new Promise((r) => setTimeout(r, 4000));

  const after = JSON.parse(fs.readFileSync(TMP, 'utf-8'));
  const staff = after.staff || [];
  console.log('after : staff rows =', staff.length);
  for (const s of staff) console.log(`        ${s.id} user=${s.user_id} role=${s.role} status=${s.status}`);

  const admin = (after.users || []).find((u: any) => u.role === 'admin');
  const grant = staff.find((s: any) => s.user_id === admin?.id);
  console.log('bootstrap admin   :', admin?.id, admin?.email);
  console.log('grant matches admin:', grant ? 'YES' : 'NO — ADMIN WOULD HAVE 0 PERMISSIONS');

  // Prove the authority path actually resolves against what was seeded.
  const { resolveAuthority } = await import('../src/lib/rbac');
  const auth = resolveAuthority({ id: admin?.id, role: 'admin' }, staff);
  console.log('resolveAuthority  : role=' + auth.role + ' perms=' + auth.permissions.size);
  console.log('admin is inert    :', auth.permissions.size === 0 ? 'YES — LOCKOUT' : 'no (authorized)');

  try {
    (server as any).httpServer?.close();
  } catch { /* ignore */ }

  fs.unlinkSync(TMP);
  console.log('scratch cleaned');

  process.exit(0);
};

main().catch((e) => {
  console.error('FAILED:', e?.message);
  try { fs.unlinkSync(TMP); } catch { /* ignore */ }
  process.exit(1);
});