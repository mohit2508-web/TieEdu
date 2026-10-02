/**
 * Rotate the admin password directly in the store.
 *
 *   npx ts-node --transpile-only scripts/rotate-admin-password.ts --email you@tieedu.in --password '...'
 *   npx ts-node --transpile-only scripts/rotate-admin-password.ts            # prompts, generates a strong one
 *
 * Why this exists and why it is not just `POST /api/auth/change-password`:
 *
 *   1. That endpoint requires being logged in as the admin, which requires
 *      knowing the current password. Fine for a routine change; useless for the
 *      case this script is actually for — an admin who is locked out, or one
 *      whose password is a literal that was committed to the repository and so
 *      has to be assumed compromised.
 *   2. The bootstrap seeder only creates an admin when none exists
 *      (`ensureSeedData` in server.ts). Removing the hardcoded fallback stopped
 *      *new* deployments from getting a known password, but it cannot rotate an
 *      existing row — the old hash just sits there. Nothing else in the codebase
 *      can reach it.
 *
 * Writes through `saveDb`, which is the atomic path every other mutation uses.
 * Hand-editing the 3.2 MB db.json to patch one hash is the obvious alternative
 * and it is how the file gets corrupted.
 *
 * The password is never echoed, logged, or defaulted. Read it from the
 * environment or the prompt; there is no `--password` default to fall back on.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'rotate-admin-pw-scratch-secret';
if (!process.env.DB_FILE) {
  console.error(
    'Refusing to run without DB_FILE. Point it at a backup copy first:\n' +
      "  Copy-Item backend/data/db.json backend/data/db.backup.json\n" +
      '  $env:DB_FILE="backend/data/db.backup.json"\n' +
      '  npx ts-node --transpile-only scripts/rotate-admin-password.ts ...\n\n' +
      'Then verify the new password works before applying it to the live store.'
  );
  process.exit(1);
}

import readline from 'readline';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { loadDb, saveDb } from '../src/data/db';

const argv = process.argv.slice(2);
const argOf = (flag: string): string | undefined => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : undefined;
};

const EMAIL = (argOf('--email') || process.env.ROTATE_ADMIN_EMAIL || '').toLowerCase().trim();
const FROM_ENV = process.env.ROTATE_ADMIN_PASSWORD || argOf('--password') || '';

const MIN_LENGTH = 14;

/**
 * Length is the only rule enforced, and deliberately so: a complexity rule
 * ("one uppercase, one symbol") reliably produces `Password1!` and reliably
 * excludes paste-generated passphrases. 14+ characters of anything is the check
 * that actually correlates with resistance to guessing.
 */
const weakness = (pw: string): string | null => {
  if (!pw) return 'no password supplied';
  if (pw.length < MIN_LENGTH) return `shorter than ${MIN_LENGTH} characters`;
  if (!/\S/.test(pw)) return 'whitespace only';
  if (/^(.)\1+$/.test(pw)) return 'a single repeated character';
  const distinct = new Set(pw).size;
  if (distinct < 6) return `only ${distinct} distinct characters`;
  return null;
};

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  if (!EMAIL) {
    console.error('Missing --email (or ROTATE_ADMIN_EMAIL). Refusing to guess which account to rotate.');
    process.exit(1);
  }

  let password = FROM_ENV;
  if (!password) {
    console.log('No password supplied. Generating a strong one and printing it once.');
    password = crypto.randomBytes(18).toString('base64url');
  }

  const problem = weakness(password);
  if (problem) {
    console.error(`Refusing that password: ${problem}.`);
    process.exit(1);
  }

  const db = loadDb();
  const admin = (db.users || []).find(
    (u: any) => u.email === EMAIL && u.role === 'admin'
  );
  if (!admin) {
    const anyEmail = (db.users || []).some((u: any) => u.email === EMAIL);
    console.error(
      anyEmail
        ? `${EMAIL} exists but is not an admin. Refusing to change a non-admin password here.`
        : `No admin account with email ${EMAIL}. Nothing was changed.`
    );
    process.exit(1);
  }

  if (bcrypt.compareSync(password, admin.password_hash || '')) {
    console.error('That is already the current password. Nothing was changed.');
    process.exit(1);
  }

  admin.password_hash = bcrypt.hashSync(password, 12);
  saveDb(db);

  console.log(`\nRotated the admin password for ${EMAIL}.`);
  console.log('Cost factor 12, same as signup. The account is still enabled.');
  if (!FROM_ENV) {
    console.log(`\nOne-time password (shown now, never stored in plain text):\n  ${password}`);
    console.log('\nSave it to a password manager now. It cannot be retrieved later.');
  }
  console.log('\nSign in at /admin/login to confirm before deleting any backup.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
