/**
 * Certificate signing tests: Ed25519, key identity, and key rotation.
 *
 *   npx ts-node --transpile-only scripts/certificate-keys.test.ts
 *
 * These exist because of what the signature scheme has to survive:
 *
 *  - A leaked PUBLIC key must be useless for forging. Under HMAC the signing
 *    secret and the verification secret were the same string, so anyone who
 *    could read it could both mint certificates and rubber-stamp forgeries.
 *    The regression guard for that is below: swap in a different private key and
 *    the old signature must stop verifying.
 *  - Rotation must not invalidate certificates people already hold. Replacing
 *    the private key has to keep old serials verifiable against the retired
 *    public key, or every graduation becomes a reissue queue.
 *  - Rotation must not be a back door. If a retired key is dropped from the
 *    trusted set, its certificates must fail closed — reported as an invalid
 *    signature on a record that still exists, never quietly accepted.
 *
 * The module reads its key material once at import, so each phase re-imports it
 * against a fresh env. That is also what a real deployment restart looks like,
 * which is exactly the moment a rotation mistake would show up.
 */
import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { stubDotenv } from './dotenvStub';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tieedu.test';

let pass = 0;
let fail = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
  } catch (err: any) {
    fail += 1;
    console.error(`FAIL  ${name}\n      ${err?.message}`);
  }
}

const MODULE_PATH = require.resolve('../src/lib/certificate');

function newKey(): { priv: string; pub: string; id: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const pub = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  return {
    priv: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'),
    pub,
    id: crypto.createHash('sha256').update(Buffer.from(pub, 'base64')).digest('hex').slice(0, 16),
  };
}

/**
 * Point the process at a key (plus optional retired keys) and re-import the module.
 *
 * `certificate.ts` calls `dotenv.config()` itself - it has to, because it reads
 * its key at import time and `server.ts` cannot load .env before that (see the
 * note there). That makes this helper responsible for the whole environment:
 * dotenv is stubbed out below so the developer's real `backend/.env` cannot
 * refill the variables these phases are deliberately deleting. Without the stub,
 * every "no key configured" phase on a machine that has a working .env would
 * quietly load the real key and assert nothing.
 */
function loadWith(env: Record<string, string>): typeof import('../src/lib/certificate') {
  stubDotenv();
  delete process.env.CERT_SIGNING_PRIVATE_KEY;
  delete process.env.CERT_SIGNING_PUBLIC_KEY;
  delete process.env.CERT_SIGNING_PRIVATE_KEY_FILE;
  delete process.env.CERT_RETIRED_PUBLIC_KEYS;
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  delete require.cache[MODULE_PATH];
  return require(MODULE_PATH);
}

const FIELDS = {
  serial: 'TIEEDU-2026-ALPHA001',
  user_id: 'u-1',
  recipient_email: 'learner@example.com',
  recipient_name: 'Test Learner',
  course_id: 'c-1',
  course_title: 'Fundamentals',
  issued_at: '2026-01-02T03:04:05.000Z',
  lessons_completed: 10,
  lessons_required: 10,
  xp_at_issue: 500,
};

/** A store holding one certificate row, shaped the way lib/certificate reads it. */
function storeWith(signed: { signature: string; keyId: string }, over: Record<string, any> = {}) {
  return {
    certificates: [
      {
        id: 'cert-1',
        ...FIELDS,
        signature: signed.signature,
        signing_key_id: signed.keyId,
        status: 'active',
        revoked_reason: '',
        revoked_at: null,
        ...over,
      },
    ],
    courses: [{ id: 'c-1', title: 'Fundamentals' }],
    users: [{ id: 'u-1', name: 'Test Learner', college: 'NIT Trichy' }],
  };
}

// --- baseline: sign, verify, tamper -----------------------------------------

const A = newKey();
const modA = loadWith({ CERT_SIGNING_PRIVATE_KEY: A.priv });
const signedA = modA.signCertificate(FIELDS);

check('signing returns a base64 Ed25519 signature', () => {
  assert.strictEqual(Buffer.from(signedA.signature, 'base64').length, 64);
});

check('the signature is not the old hex HMAC shape', () => {
  assert.ok(!/^[0-9a-f]{64}$/.test(signedA.signature), 'looks like an HMAC digest');
});

check('the recorded key id is the fingerprint of the signing public key', () => {
  assert.strictEqual(signedA.keyId, A.id);
});

check('a freshly signed certificate verifies', () => {
  const r = modA.verifyCertificate(storeWith(signedA), FIELDS.serial);
  assert.strictEqual(r.check.signature_valid, true);
  assert.strictEqual(r.check.record_exists, true);
  assert.strictEqual(r.check.status, 'active');
  assert.strictEqual(r.check.signing_key_id, A.id);
});

check('editing any signed field invalidates the signature', () => {
  for (const field of ['recipient_name', 'course_title', 'xp_at_issue', 'lessons_completed', 'issued_at']) {
    const r = modA.verifyCertificate(storeWith(signedA, { [field]: 'tampered' }), FIELDS.serial);
    assert.strictEqual(r.check.signature_valid, false, `${field} was not covered by the signature`);
  }
});

check('flipping a byte in the signature invalidates it', () => {
  const bytes = Buffer.from(signedA.signature, 'base64');
  bytes[10] ^= 0x01;
  const r = modA.verifyCertificate(storeWith({ ...signedA, signature: bytes.toString('base64') }), FIELDS.serial);
  assert.strictEqual(r.check.signature_valid, false);
});

check('a signature from a different certificate does not transfer', () => {
  // The whole point of signing the serial: one valid signature cannot be
  // lifted onto another record to make it look issued.
  const other = modA.signCertificate({ ...FIELDS, serial: 'TIEEDU-2026-BETA0002', recipient_name: 'Someone Else' });
  const r = modA.verifyCertificate(
    { ...storeWith(other), certificates: [{ ...storeWith(other).certificates[0], serial: FIELDS.serial }] },
    FIELDS.serial
  );
  assert.strictEqual(r.check.signature_valid, false);
});

check('a serial we never issued reports no record', () => {
  const r = modA.verifyCertificate(storeWith(signedA), 'TIEEDU-2026-NOPE999');
  assert.strictEqual(r.found, false);
  assert.strictEqual(r.check.record_exists, false);
  assert.strictEqual(r.check.signature_valid, false);
});

check('a record with no key id is still checked against the trusted key', () => {
  // Pre-key-id rows carry ''. They must not become unverifiable by default.
  const r = modA.verifyCertificate(storeWith(signedA, { signing_key_id: '' }), FIELDS.serial);
  assert.strictEqual(r.check.signature_valid, true);
});

check('a record claiming an unknown key id is still checked', () => {
  // Otherwise an attacker could defeat rotation by writing a bogus key id.
  const r = modA.verifyCertificate(storeWith(signedA, { signing_key_id: 'deadbeefdeadbeef' }), FIELDS.serial);
  assert.strictEqual(r.check.signature_valid, true);
});

// --- the public key is not a secret ------------------------------------------

check('the public key is published and matches the key that signed', () => {
  const bundle = modA.publicKeyBundle()!;
  assert.strictEqual(bundle.algorithm, 'ed25519');
  assert.strictEqual(bundle.key_id, A.id);
  assert.strictEqual(bundle.public_key, A.pub);
});

check('the published key verifies the signature without the private key', () => {
  // A third party holding only the published key must be able to check it. If
  // this ever needs the private half, verification has quietly become
  // symmetric again and the whole rotation story is theatre.
  const ok = crypto.verify(
    null,
    Buffer.from(canonical(FIELDS), 'utf8'),
    crypto.createPublicKey({ key: Buffer.from(A.pub, 'base64'), format: 'der', type: 'spki' }),
    Buffer.from(signedA.signature, 'base64')
  );
  assert.strictEqual(ok, true);
});

// --- rotation ----------------------------------------------------------------

const B = newKey();
const modB = loadWith({
  CERT_SIGNING_PRIVATE_KEY: B.priv,
  CERT_RETIRED_PUBLIC_KEYS: `${A.id}:${A.pub}`,
});

check('after rotation, a certificate signed by the retired key still verifies', () => {
  const r = modB.verifyCertificate(storeWith(signedA), FIELDS.serial);
  assert.strictEqual(r.check.signature_valid, true);
  assert.strictEqual(r.check.signing_key_id, A.id);
});

check('after rotation, the new key signs and verifies', () => {
  const signedB = modB.signCertificate({ ...FIELDS, serial: 'TIEEDU-2026-GAMMA003' });
  assert.strictEqual(signedB.keyId, B.id);
  const r = modB.verifyCertificate(storeWith(signedB, { serial: 'TIEEDU-2026-GAMMA003' }), 'TIEEDU-2026-GAMMA003');
  assert.strictEqual(r.check.signature_valid, true);
});

check('a retired key cannot invent a certificate that verifies', () => {
  // Worth being precise about what "retired" buys. The old key stays TRUSTED, so
  // anything it signs still verifies — that is unavoidable if old certificates
  // are to keep working, and it is the price of a survivable rotation. What
  // stops a leaked retired key is that verification is anchored to a stored
  // record: a signature over a serial we never issued resolves to nothing.
  const forged = modA.signCertificate({ ...FIELDS, serial: 'TIEEDU-2026-FORGED1', recipient_name: 'Mallory' });
  const r = modB.verifyCertificate(storeWith(forged), 'TIEEDU-2026-FORGED1');
  assert.strictEqual(r.found, false, 'a serial with no stored record must not resolve');
  assert.strictEqual(r.check.record_exists, false);
  assert.strictEqual(r.check.signature_valid, false);
});

check('but a retired key still cannot edit a certificate in place', () => {
  // The attack that actually matters: rewrite a real, existing record. The
  // signature was made over the old field values, so the edit invalidates it
  // whether or not the signing key is still trusted.
  const stored = storeWith(signedA, { recipient_name: 'Mallory' });
  const r = modB.verifyCertificate(stored, FIELDS.serial);
  assert.strictEqual(r.check.record_exists, true);
  assert.strictEqual(r.check.signature_valid, false);
});

check('a mismatched id/key pair in the retired list registers nothing useful', () => {
  // Env lists key A's id against key C's material. A cert signed by A must not
  // verify: the entry is filed under C's true fingerprint, not under the id
  // that was written next to it.
  const C = newKey();
  const mod = loadWith({ CERT_SIGNING_PRIVATE_KEY: C.priv, CERT_RETIRED_PUBLIC_KEYS: `${A.id}:${C.pub}` });
  assert.strictEqual(mod.verifyCertificate(storeWith(signedA), FIELDS.serial).check.signature_valid, false);
  const signedC = mod.signCertificate({ ...FIELDS, serial: 'TIEEDU-2026-DELTA004' });
  assert.strictEqual(mod.verifyCertificate(storeWith(signedC, { serial: 'TIEEDU-2026-DELTA004' }), 'TIEEDU-2026-DELTA004').check.signature_valid, true);
});

// --- rotation must fail closed ------------------------------------------------

const modDropped = loadWith({ CERT_SIGNING_PRIVATE_KEY: B.priv });

check('dropping a retired key invalidates its certificates but keeps the record', () => {
  const r = modDropped.verifyCertificate(storeWith(signedA), FIELDS.serial);
  assert.strictEqual(r.check.record_exists, true, 'the row should still be found');
  assert.strictEqual(r.check.signature_valid, false, 'an untrusted key must not be able to validate anything');
});

check('a certificate signed by an unknown key is never genuine', () => {
  const rogue = newKey();
  const r = modDropped.verifyCertificate(
    storeWith({ signature: signWith(rogue.priv, FIELDS), keyId: rogue.id }),
    FIELDS.serial
  );
  assert.strictEqual(r.check.signature_valid, false);
  assert.strictEqual(r.check.record_exists, true);
});

/** The module's canonical payload, reconstructed from the published fields. */
function canonical(f: typeof FIELDS): string {
  return ['v3', f.serial, f.user_id, f.recipient_email, f.recipient_name, f.course_id, f.course_title, f.issued_at, String(f.lessons_completed), String(f.lessons_required), String(f.xp_at_issue)].join('|');
}

function signWith(privB64: string, fields: typeof FIELDS): string {
  return crypto
    .sign(
      null,
      Buffer.from(canonical(fields), 'utf8'),
      crypto.createPrivateKey({ key: Buffer.from(privB64, 'base64'), format: 'der', type: 'pkcs8' })
    )
    .toString('base64');
}

// --- misconfiguration is loud, not silent -------------------------------------

check('the published key is derived, never configured', () => {
  // Last, because it rewrites the key environment. A separate
  // CERT_SIGNING_PUBLIC_KEY used to be honoured, and it is a footgun: if it
  // disagrees with the private key, signing keeps working and every certificate
  // is silently unverifiable. It must not be able to reintroduce that.
  const D = newKey();
  const mod = loadWith({ CERT_SIGNING_PRIVATE_KEY: D.priv, CERT_SIGNING_PUBLIC_KEY: A.pub });
  assert.strictEqual(mod.CERT_SIGNING_PUBLIC_KEY, D.pub);
  assert.strictEqual(mod.ACTIVE_KEY_ID, D.id);
  const signed = mod.signCertificate({ ...FIELDS, serial: 'TIEEDU-2026-OMEGA005' });
  const r = mod.verifyCertificate(storeWith(signed, { serial: 'TIEEDU-2026-OMEGA005' }), 'TIEEDU-2026-OMEGA005');
  assert.strictEqual(r.check.signature_valid, true);
});

check('an unusable private key is reported as a fixable 503, not a crash', () => {
  let err: any = null;
  try {
    loadWith({ CERT_SIGNING_PRIVATE_KEY: 'this-is-not-a-key' });
  } catch (e: any) {
    err = e;
  }
  assert.ok(err, 'a malformed key should be rejected at load');
  assert.strictEqual(err.status, 503);
  assert.strictEqual(err.expose, true);
  assert.ok(/CERT_SIGNING_PRIVATE_KEY/.test(err.message), `message should name the variable: ${err?.message}`);
  assert.ok(!/this-is-not-a-key/.test(err.message), 'the offending value must not be echoed back');
});

check('a missing key never produces a signature', () => {
  // Whatever the environment, the failure mode must be "refuse to sign", never
  // "sign with a built-in default that anyone can also use".
  const mod = loadWith({});
  assert.strictEqual(mod.ACTIVE_KEY_ID, '');
  assert.strictEqual(mod.publicKeyBundle(), null);
  assert.throws(() => mod.signCertificate(FIELDS));
});

check('in production a missing key names the variable to set', () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const mod = loadWith({});
    let err: any = null;
    try {
      mod.signCertificate(FIELDS);
    } catch (e: any) {
      err = e;
    }
    assert.ok(err, 'production must refuse to sign');
    assert.strictEqual(err.status, 503);
    assert.strictEqual(err.expose, true);
    assert.ok(/CERT_SIGNING_PRIVATE_KEY/.test(err.message), `message should name the variable: ${err?.message}`);
  } finally {
    process.env.NODE_ENV = prev;
  }
});

check('a key can be restored from a file, as the docs instruct', () => {
  // The restore path in KEY-INFO.txt. If this breaks, a disaster recovery
  // cannot be performed, and nobody finds out until they need it.
  const E = newKey();
  const file = path.join(os.tmpdir(), `tieedu-cert-${process.pid}-${Date.now()}.pem`);
  fs.writeFileSync(
    file,
    crypto.createPrivateKey({ key: Buffer.from(E.priv, 'base64'), format: 'der', type: 'pkcs8' })
      .export({ type: 'pkcs8', format: 'pem' })
      .toString('utf8')
  );
  try {
    // A stale inline value alongside the file, to prove which one is used.
    const mod = loadWith({ CERT_SIGNING_PRIVATE_KEY_FILE: file, CERT_SIGNING_PRIVATE_KEY: A.priv });
    assert.strictEqual(mod.ACTIVE_KEY_ID, E.id, 'the file must win over the inline value');
    const signed = mod.signCertificate({ ...FIELDS, serial: 'TIEEDU-2026-FILE0006' });
    const r = mod.verifyCertificate(storeWith(signed, { serial: 'TIEEDU-2026-FILE0006' }), 'TIEEDU-2026-FILE0006');
    assert.strictEqual(r.check.signature_valid, true);
  } finally {
    fs.rmSync(file, { force: true });
  }
});

check('an unreadable key file is a fixable 503, not a crash', () => {
  let err: any = null;
  try {
    loadWith({ CERT_SIGNING_PRIVATE_KEY_FILE: path.join(os.tmpdir(), 'tieedu-no-such-key.pem') });
  } catch (e: any) {
    err = e;
  }
  assert.ok(err, 'a missing key file should be reported, not ignored');
  assert.strictEqual(err.status, 503);
  assert.strictEqual(err.expose, true);
  assert.ok(/CERT_SIGNING_PRIVATE_KEY_FILE/.test(err.message), `message should name the variable: ${err?.message}`);
});

console.log(`\ncertificate-keys: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
