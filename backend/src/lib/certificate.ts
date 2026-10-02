// ============================================================================
// CERTIFICATES — real, signed, verifiable PDF documents.
//
// What makes one of these genuine, rather than a picture of a certificate:
//
//  1. It is only ever issued by POST /api/courses/:slug/certificate, and that
//     handler re-derives completion from the learner's stored progress. A
//     client cannot ask for a certificate it has not earned.
//  2. It is a persisted row, not a number generated on the fly. The serial is
//     unique and stored, so a given serial always resolves to the same record.
//  3. It carries an Ed25519 signature over its own canonical fields, made with
//     a PRIVATE key that never leaves this process. Verification needs only the
//     matching PUBLIC key, which is not secret and is published by
//     GET /api/courses/verify/key.
//
//     This is the whole reason for signing asymmetrically rather than with an
//     HMAC. Under HMAC the same shared secret both signs and verifies, so anyone
//     who could read it could forge a certificate AND forge the "genuine" answer
//     to a verifier. Asymmetric signing collapses that to a single capability:
//     reading the public key lets you check a certificate and nothing else.
//  4. Every certificate records the id of the key that signed it, and the
//     verifier holds a set of trusted public keys — the active one plus any
//     retired ones. That is what makes rotation survivable: swapping the private
//     key stops new forgeries without invalidating a single certificate a
//     learner has already printed.
//  5. The PDF is generated here, on the server, from the stored record. What
//     the learner downloads is exactly what the verifier reads back.
//  6. Revocation is a status change on the stored row, so a revoked certificate
//     stops verifying immediately — a PDF sitting in someone's inbox cannot help
//     them, because verification never trusts the PDF.
// ============================================================================

import crypto from 'crypto';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import dotenv from 'dotenv';
import { Certificate, Course, User } from '../data/db';
import { orderedLessons } from './courses';

// This module reads its key material and the public site URL at import time, and
// it has to do that *after* the .env is loaded. `server.ts` cannot arrange it:
// ES imports are evaluated before the importing module's body runs, so the
// `dotenv.config()` on the next line of server.ts happens strictly later than
// this file's top-level `readKeyMaterial()`. It used to work only by luck -
// `middleware/auth.ts` also calls dotenv.config(), and the route files happen to
// import auth before they import this module, so the environment happened to be
// populated in time. Reorder one import, or require this module from a script
// that has not loaded .env, and the key silently reads as empty: signing then
// throws a bare "Failed to read private key" and every issue endpoint answers
// 503 "Certificates are temporarily unavailable" on an install whose .env is
// perfectly correct. The same applies to NEXT_PUBLIC_SITE_URL below.
//
// Loading here makes the order irrelevant, which is the same fix auth.ts needed
// for JWT_SECRET. dotenv never overrides a variable that is already set, so this
// cannot override a real environment - it only fills in what is absent.
dotenv.config();

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

/**
 * Keys are Ed25519, loaded from base64 DER so a private key can live on one
 * line of an env file. A PEM would need real newlines, which every dotenv
 * parser and hosting dashboard mangles differently — a truncated key is a
 * server that will not start, and the fix is not obvious from the error.
 *
 * `CERT_SIGNING_PRIVATE_KEY_FILE` is checked first and preferred: a secret
 * manager that mounts a file (Docker/Kubernetes secrets, systemd
 * LoadCredential) can then hand over the key without it ever appearing in the
 * process environment, where it is visible to anything that can read /proc.
 */

/**
 * A bare DER buffer is ambiguous — the same bytes could be PKCS#8, SEC1 or
 * SPKI — so node will not guess and throws a bare "unsupported" DECODER error.
 * The type and format are always stated explicitly.
 */
function privateKeyFromDer(der: Buffer): crypto.KeyObject {
  return crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
}

function publicKeyFromDer(der: Buffer): crypto.KeyObject {
  return crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
}

function readKeyMaterial(): { privateKeyB64: string; publicKeyB64: string } {
  const file = (process.env.CERT_SIGNING_PRIVATE_KEY_FILE || '').trim();
  if (file) {
    try {
      // Imported lazily: a deployment that only ever verifies never needs fs.
      const fs = require('fs') as typeof import('fs');
      // PEM is self-describing, so the file form needs no type/format hint.
      const key = crypto.createPrivateKey(fs.readFileSync(file, 'utf8'));
      return {
        privateKeyB64: key.export({ type: 'pkcs8', format: 'der' }).toString('base64'),
        publicKeyB64: crypto
          .createPublicKey(key)
          .export({ type: 'spki', format: 'der' })
          .toString('base64'),
      };
    } catch (e: any) {
      throw configError(
        `Certificate signing key could not be read from CERT_SIGNING_PRIVATE_KEY_FILE: ${e?.message || e}`
      );
    }
  }

  const privateKeyB64 = (process.env.CERT_SIGNING_PRIVATE_KEY || '').trim();
  if (!privateKeyB64) return { privateKeyB64: '', publicKeyB64: '' };

  // The public half is always derived from the private half, never configured
  // separately. An operator-supplied public key is a trap: if it does not match
  // the private key, signing still succeeds and every certificate issued is
  // silently unverifiable — the worst possible failure, because it looks fine
  // until someone holds the PDF. There is also nothing to gain, since the
  // public key is a pure function of the private one.
  let publicKeyB64 = '';
  try {
    publicKeyB64 = crypto
      .createPublicKey(privateKeyFromDer(Buffer.from(privateKeyB64, 'base64')))
      .export({ type: 'spki', format: 'der' })
      .toString('base64');
  } catch (e: any) {
    throw configError(
      `CERT_SIGNING_PRIVATE_KEY is not a valid Ed25519 PKCS#8 key (base64 DER): ${e?.message || e}`
    );
  }
  return { privateKeyB64, publicKeyB64 };
}

const KEYS = readKeyMaterial();

/** Active signing key. Empty when unconfigured, which `assertSigningConfigured` treats as fatal. */
export const CERT_SIGNING_PRIVATE_KEY = KEYS.privateKeyB64;
export const CERT_SIGNING_PUBLIC_KEY = KEYS.publicKeyB64;

/**
 * Key id = fingerprint of the public key, truncated to 64 bits.
 *
 * Derived rather than hand-written so it can never drift out of sync with the
 * key it names — the classic failure being a certificate pointing at key "v2"
 * while "v2" is actually some other key, which silently breaks verification.
 * 64 bits is far past any realistic collision count for a handful of keys.
 */
function fingerprintKey(publicKeyB64: string): string {
  return crypto.createHash('sha256').update(Buffer.from(publicKeyB64, 'base64')).digest('hex').slice(0, 16);
}

export const ACTIVE_KEY_ID = KEYS.publicKeyB64 ? fingerprintKey(KEYS.publicKeyB64) : '';

/**
 * Public keys this deployment will accept signatures from: the active key plus
 * any retired ones, so a rotation does not retroactively void old certificates.
 *
 * `CERT_RETIRED_PUBLIC_KEYS` is `keyid:base64spki` pairs, comma-separated.
 */
function trustedKeys(): Map<string, string> {
  const map = new Map<string, string>();
  if (KEYS.publicKeyB64 && ACTIVE_KEY_ID) map.set(ACTIVE_KEY_ID, KEYS.publicKeyB64);
  const raw = (process.env.CERT_RETIRED_PUBLIC_KEYS || '').trim();
  if (raw) {
    for (const pair of raw.split(',')) {
      const entry = pair.trim();
      if (!entry) continue;
      const idx = entry.indexOf(':');
      if (idx <= 0) continue;
      const id = entry.slice(0, idx).trim();
      const key = entry.slice(idx + 1).trim();
      if (!id || !key) continue;
      // The id is recomputed rather than trusted, so a typo in the env cannot
      // register a key under an id its fingerprint does not match.
      map.set(fingerprintKey(key), key);
    }
  }
  return map;
}

/**
 * Operational misconfiguration: a 503 carrying the fix.
 *
 * `expose: true` tells the API error handler this text is safe to hand to the
 * caller — it names a variable and a remedy, never a key. See server.ts.
 */
function configError(message: string): Error {
  return Object.assign(new Error(message), { status: 503, expose: true });
}

/**
 * Refuses to issue a certificate that nobody can ever verify.
 *
 * A certificate signed with a missing key is not a signed certificate, and in
 * production an unconfigured key is a hard failure rather than a silent
 * downgrade — otherwise the first person to find out is a graduate whose
 * certificate does not verify.
 */
export function assertSigningConfigured(): void {
  if (ACTIVE_KEY_ID && CERT_SIGNING_PRIVATE_KEY) return;
  // `test` keeps the old lenient behaviour: suites run without a key to assert
  // that a signature check fails closed, which needs no key rather than a throw.
  if (process.env.NODE_ENV === 'test') return;
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      '[certificates] CERT_SIGNING_PRIVATE_KEY is unset - no keypair loaded. ' +
        'Certificates cannot be signed or verified until it is set.'
    );
  }
  // Thrown in every environment, not just production. Previously a missing key in
  // development only warned and then fell through to `crypto.sign`, which threw
  // a bare "Failed to read private key" with no mention of the variable to set -
  // so an operator staring at a 503 had nothing to act on. Signing without a key
  // is wrong everywhere; how loudly we refuse is a separate question.
  throw configError(
    'Certificate signing is not configured. Generate an Ed25519 keypair and set ' +
      'CERT_SIGNING_PRIVATE_KEY (base64 PKCS#8 DER) before issuing or verifying certificates. ' +
      'Keep the public half too - it is what verifiers check against.'
  );
}

/**
 * The public key half, for publication.
 *
 * Safe to expose unauthenticated: it is the point of asymmetric signing. A
 * verifier that trusts this value can check certificates without trusting — or
 * even reaching — this server.
 */
export function publicKeyBundle(): { key_id: string; public_key: string; algorithm: string } | null {
  if (!ACTIVE_KEY_ID || !CERT_SIGNING_PUBLIC_KEY) return null;
  return { key_id: ACTIVE_KEY_ID, public_key: CERT_SIGNING_PUBLIC_KEY, algorithm: 'ed25519' };
}


/**
 * Public base used to build the verification link printed on the PDF.
 *
 * This value is baked into every certificate a student keeps forever: it is the
 * QR code on the PDF and the URL their employer scans. An unset value therefore
 * does not fail loudly on its own — it produces a certificate that looks
 * perfect and is permanently unverifiable, because the QR points at
 * `http://localhost:3000/verify/<serial>`. `assertSiteUrlConfigured` turns that
 * silent, permanent failure into a startup-time error instead.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/** True when the site URL is still a local dev address, i.e. unusable in public. */
export function siteUrlIsLocalhost(): boolean {
  try {
    const host = new URL(SITE_URL).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0';
  } catch {
    // An unparseable URL is worse than a localhost one — there is nothing to fix
    // it with on a printed certificate.
    return true;
  }
}

/**
 * Refuses to issue a certificate that nobody can ever verify.
 *
 * Called wherever `signCertificate` is, so the failure happens at issue time —
 * while there is still a human watching — rather than the first time a graduate
 * tries to use the certificate.
 */
export function assertSiteUrlConfigured(): void {
  if (!siteUrlIsLocalhost()) return;
  if (process.env.NODE_ENV === 'production') {
    // 503 + `expose` for the same reason as `assertSigningConfigured`.
    throw Object.assign(
      new Error(
        'Certificate verification URL is not configured. Set NEXT_PUBLIC_SITE_URL to the public ' +
          'origin (e.g. https://tieedu.com) before issuing certificates in production — otherwise ' +
          'every PDF printed will carry a QR code that cannot be scanned by anyone.'
      ),
      { status: 503, expose: true }
    );
  }
  if (process.env.NODE_ENV === 'test') return;
  // eslint-disable-next-line no-console
  console.warn(
    `[certificates] NEXT_PUBLIC_SITE_URL is unset — verification links will point at ${SITE_URL}. ` +
      'Set it to the public origin before issuing anything a real person will keep.'
  );
}

export function verificationUrlFor(serial: string): string {
  return `${SITE_URL}/verify/${encodeURIComponent(serial)}`;
}

/**
 * Bumped whenever the signed field set or the signing algorithm changes, so old
 * signatures are never mistaken for current ones.
 *
 * v3 is the move from HMAC-SHA256 to Ed25519. The payload is byte-identical in
 * shape, but the signature is a completely different construction, so a v2
 * record could never be validated by a v3 verifier even by accident. There were
 * no certificates in circulation at this bump, so nothing needed reissuing.
 */
export const SIGNING_VERSION = 3;

/** The exact set of fields covered by the signature. Nothing else is protected. */
export interface SignedCertificateFields {
  serial: string;
  user_id: string;
  recipient_email: string;
  recipient_name: string;
  course_id: string;
  /** Frozen at issue time — the live course title may be edited later. */
  course_title: string;
  issued_at: string;
  lessons_completed: number;
  lessons_required: number;
  xp_at_issue: number;
}

/**
 * Canonical form of the signed fields. Field order is fixed and separators are
 * unambiguous, so the same record always produces the same signature.
 *
 * Everything the verifier or the PDF shows the outside world must appear here.
 * `status` and `revoked_*` are deliberately excluded: revocation has to be
 * able to change without re-signing, and it is enforced by the stored row
 * rather than by the signature.
 */
function canonicalPayload(c: SignedCertificateFields): string {
  return [
    `v${SIGNING_VERSION}`,
    c.serial,
    c.user_id,
    c.recipient_email,
    c.recipient_name,
    c.course_id,
    c.course_title,
    c.issued_at,
    String(c.lessons_completed),
    String(c.lessons_required),
    String(c.xp_at_issue),
  ].join('|');
}

/**
 * Signs the canonical payload with the active PRIVATE key.
 *
 * Returns the signature and the id of the key that produced it; the id is
 * stored alongside the certificate so a later rotation knows which public key
 * has to check it.
 */
export function signCertificate(fields: SignedCertificateFields): { signature: string; keyId: string } {
  assertSigningConfigured();
  assertSiteUrlConfigured();
  const signature = crypto.sign(
    null,
    Buffer.from(canonicalPayload(fields), 'utf8'),
    privateKeyFromDer(Buffer.from(CERT_SIGNING_PRIVATE_KEY, 'base64'))
  );
  return { signature: signature.toString('base64'), keyId: ACTIVE_KEY_ID };
}

/**
 * Checks a signature against whichever trusted public key signed it.
 *
 * Ed25519 verification is constant-time inside node, so there is no
 * `timingSafeEqual` here — that is the right tool for comparing two secrets you
 * already hold, not for an asymmetric check whose comparison work node does.
 */
function verifySignature(fields: SignedCertificateFields, signatureB64: string, keyId: string): boolean {
  const keys = trustedKeys();
  const candidates: string[] = [];
  if (keyId && keys.has(keyId)) candidates.push(keys.get(keyId)!);
  // A certificate with no recorded key id (or one this build has never heard
  // of) is still checked against every trusted key, so a record is never
  // reported as forged just because it was signed under a rotated key.
  if (candidates.length === 0) candidates.push(...keys.values());
  if (candidates.length === 0) return false;

  let sig: Buffer;
  try {
    sig = Buffer.from(signatureB64, 'base64');
  } catch {
    return false;
  }
  if (sig.length !== 64) return false;

  const payload = Buffer.from(canonicalPayload(fields), 'utf8');
  return candidates.some((pub) => {
    try {
      return crypto.verify(null, payload, publicKeyFromDer(Buffer.from(pub, 'base64')), sig);
    } catch {
      return false;
    }
  });
}

export interface SignatureCheck {
  signature_valid: boolean;
  record_exists: boolean;
  status: 'active' | 'revoked' | 'unknown';
  revoked_reason: string;
  revoked_at: string | null;
  /** Which public key must be used to check this certificate. */
  signing_key_id: string;
}

/**
 * Full authenticity check for a serial. Both halves matter:
 *  - `record_exists` proves the serial was really issued by us.
 *  - `signature_valid` proves the stored record has not been edited, because
 *    editing any signed field invalidates the signature.
 * A verifier must report BOTH; reporting only the record would let a forged
 * row pass.
 */
export function verifyCertificate(db: any, serialInput: string): {
  found: boolean;
  check: SignatureCheck;
  certificate: Certificate | null;
  course: Course | null;
  recipient: { name: string; college: string | null } | null;
} {
  const serial = (serialInput || '').trim().toUpperCase();
  const certificate: Certificate | undefined = (db.certificates || []).find(
    (c: Certificate) => c.serial === serial
  );

  if (!certificate) {
    return {
      found: false,
      check: {
        signature_valid: false,
        record_exists: false,
        status: 'unknown',
        revoked_reason: '',
        revoked_at: null,
        signing_key_id: '',
      },
      certificate: null,
      course: null,
      recipient: null,
    };
  }

  assertSigningConfigured();

  const fields = signedFieldsOf(certificate);
  const signatureValid = verifySignature(fields, certificate.signature || '', certificate.signing_key_id || '');

  const course = (db.courses || []).find((c: Course) => c.id === certificate.course_id) || null;
  const user: User | undefined = (db.users || []).find((u: User) => u.id === certificate.user_id);

  return {
    found: true,
    check: {
      signature_valid: signatureValid,
      record_exists: true,
      status: certificate.status === 'revoked' ? 'revoked' : 'active',
      revoked_reason: certificate.revoked_reason || '',
      revoked_at: certificate.revoked_at || null,
      signing_key_id: certificate.signing_key_id || '',
    },
    certificate,
    course,
    recipient: {
      name: certificate.recipient_name,
      college: user?.college || null,
    },
  };
}

/**
 * The signed projection of a stored record.
 *
 * One definition, used by the signer and the verifier, so the two cannot drift
 * into disagreeing about what is covered — which would make every freshly
 * issued certificate fail its own signature check.
 */
export function signedFieldsOf(c: Certificate): SignedCertificateFields {
  return {
    serial: c.serial,
    user_id: c.user_id,
    recipient_email: c.recipient_email,
    recipient_name: c.recipient_name,
    course_id: c.course_id,
    course_title: c.course_title,
    issued_at: c.issued_at,
    lessons_completed: c.lessons_completed,
    lessons_required: c.lessons_required,
    xp_at_issue: c.xp_at_issue,
  };
}

// ---------------------------------------------------------------------------
// PDF rendering
// ---------------------------------------------------------------------------

/**
 * pdf-lib's standard fonts are WinAnsi-encoded, so anything outside Latin-1
 * (curly quotes, em dashes, rupee signs) throws. The same normalisation the
 * module-PDF watermarker uses, kept in one place.
 */
function ascii(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022\u25CF\u25AA]/g, '|')
    .replace(/[\u20B9]/g, 'INR ')
    .replace(/[\u00A0]/g, ' ')
    .replace(/[^\x20-\x7E]/g, '');
}

/** Greedy wrap on word boundaries, so long course titles never run off the page. */
function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = ascii(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      // A single word longer than the line gets hard-split rather than overflowing.
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let chunk = '';
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        line = chunk;
      } else {
        line = word;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Build the certificate PDF. Everything drawn here comes from the stored
 * record — there is no path where the request body supplies certificate text.
 */
export async function buildCertificatePdf(
  certificate: Certificate,
  course: Course | null
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([841.89, 595.28]); // A4 landscape
  const { width: W, height: H } = page.getSize();

  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const NAVY = rgb(0.055, 0.165, 0.267);
  const SKY = rgb(0.012, 0.412, 0.624);
  const AMBER = rgb(0.910, 0.639, 0.239);
  const INK = rgb(0.063, 0.082, 0.110);
  const BODY = rgb(0.243, 0.278, 0.329);
  const MUTED = rgb(0.478, 0.522, 0.560);
  const HAIRLINE = rgb(0.855, 0.851, 0.816);

  // --- Paper -----------------------------------------------------------
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.988, 0.984, 0.973) });

  // --- Outer frame + inner hairline -------------------------------------
  page.drawRectangle({
    x: 22, y: 22, width: W - 44, height: H - 44,
    borderColor: NAVY, borderWidth: 2.2,
  });
  page.drawRectangle({
    x: 31, y: 31, width: W - 62, height: H - 62,
    borderColor: AMBER, borderWidth: 0.7,
  });

  // Corner ticks
  const tick = 22;
  for (const [cx, cy, sx, sy] of [
    [22, H - 22, 1, -1], [W - 22, H - 22, -1, -1],
    [22, 22, 1, 1], [W - 22, 22, -1, 1],
  ] as const) {
    page.drawRectangle({ x: cx - (sx < 0 ? tick : 0), y: cy - (sy < 0 ? tick : 0), width: tick, height: 3, color: AMBER });
    page.drawRectangle({ x: cx - (sx < 0 ? 3 : 0), y: cy - (sy < 0 ? tick : 0), width: 3, height: tick, color: AMBER });
  }

  // --- Brand header -----------------------------------------------------
  page.drawRectangle({ x: 22, y: H - 96, width: W - 44, height: 52, color: NAVY });
  page.drawText('TieEdu', {
    x: 44, y: H - 68, size: 25, font: serifBold, color: rgb(1, 1, 1),
  });
  page.drawText('Learn   Evolve   Develop', {
    x: 140, y: H - 66, size: 9.5, font: sans, color: AMBER,
  });
  const headerRight = 'CERTIFICATE OF COURSE COMPLETION';
  page.drawText(headerRight, {
    x: W - 44 - sansBold.widthOfTextAtSize(headerRight, 11),
    y: H - 66, size: 11, font: sansBold, color: rgb(0.87, 0.92, 0.96),
  });

  // --- Title block ------------------------------------------------------
  const title = 'Certificate of Completion';
  page.drawText(title, {
    x: (W - serifBold.widthOfTextAtSize(title, 40)) / 2,
    y: H - 168, size: 40, font: serifBold, color: INK,
  });

  const subtitle = 'This certifies that';
  page.drawText(subtitle, {
    x: (W - sans.widthOfTextAtSize(subtitle, 13)) / 2,
    y: H - 202, size: 13, font: sans, color: MUTED,
  });

  // --- Recipient -------------------------------------------------------
  const recipient = ascii(certificate.recipient_name) || 'TieEdu Learner';
  const recipientSize = recipient.length > 34 ? 30 : 36;
  page.drawText(recipient, {
    x: (W - serifBold.widthOfTextAtSize(recipient, recipientSize)) / 2,
    y: H - 250, size: recipientSize, font: serifBold, color: SKY,
  });

  const ruleY = H - 266;
  const ruleW = Math.min(430, serifBold.widthOfTextAtSize(recipient, recipientSize) + 60);
  page.drawLine({
    start: { x: (W - ruleW) / 2, y: ruleY },
    end: { x: (W + ruleW) / 2, y: ruleY },
    thickness: 1.1, color: AMBER,
  });

  // --- Body ------------------------------------------------------------
  const hasSuccessfully = 'has successfully completed all lessons of';
  page.drawText(hasSuccessfully, {
    x: (W - sans.widthOfTextAtSize(hasSuccessfully, 12)) / 2,
    y: H - 296, size: 12, font: sans, color: MUTED,
  });

  // The signed, frozen title — not the live course title. An admin renaming the
  // course tomorrow must not be able to change what an already-issued
  // certificate says, and using the live value would let the PDF disagree with
  // the signature that covers it.
  const courseTitle = ascii(certificate.course_title);
  const courseLines = wrap(courseTitle, serifBold, 21, W - 300).slice(0, 2);
  courseLines.forEach((line, i) => {
    page.drawText(line, {
      x: (W - serifBold.widthOfTextAtSize(line, 21)) / 2,
      y: H - 330 - i * 27, size: 21, font: serifBold, color: INK,
    });
  });

  const statsY = H - 330 - courseLines.length * 27 - 26;
  const stats: [string, string][] = [
    ['Lessons completed', `${certificate.lessons_completed} of ${certificate.lessons_required}`],
    ['XP earned', `${certificate.xp_at_issue} XP`],
    ['Date of issue', formatDate(certificate.issued_at)],
  ];
  const colW = 168;
  const tableW = colW * stats.length;
  stats.forEach(([label, value], i) => {
    const cx = (W - tableW) / 2 + i * colW + colW / 2;
    page.drawText(ascii(value), {
      x: cx - sansBold.widthOfTextAtSize(ascii(value), 15) / 2,
      y: statsY, size: 15, font: sansBold, color: SKY,
    });
    page.drawText(ascii(label), {
      x: cx - sans.widthOfTextAtSize(ascii(label), 8.5) / 2,
      y: statsY - 15, size: 8.5, font: sans, color: MUTED,
    });
  });

  // Divider under the stats row
  page.drawLine({
    start: { x: (W - tableW) / 2 - 14, y: statsY - 30 },
    end: { x: (W + tableW) / 2 + 14, y: statsY - 30 },
    thickness: 0.6, color: HAIRLINE,
  });

  // --- Footer: issuer, QR, verification -------------------------------
  const footerY = 62;

  // Issuer (left)
  page.drawText('ISSUED BY', {
    x: 60, y: footerY + 44, size: 8, font: sansBold, color: MUTED,
  });
  page.drawText('TieEdu Placement Intelligence', {
    x: 60, y: footerY + 27, size: 12.5, font: serifBold, color: INK,
  });
  page.drawLine({
    start: { x: 60, y: footerY + 20 }, end: { x: 250, y: footerY + 20 },
    thickness: 0.8, color: INK,
  });
  page.drawText('Authorised signing authority', {
    x: 60, y: footerY + 8, size: 8.5, font: sans, color: MUTED,
  });

  // Serial + signature fingerprint (left column, below issuer)
  page.drawText(ascii(`Serial: ${certificate.serial}`), {
    x: 300, y: footerY + 44, size: 9.5, font: sansBold, color: INK,
  });
  page.drawText('Ed25519 signature', {
    x: 300, y: footerY + 32, size: 7.5, font: sans, color: MUTED,
  });
  const fingerprint = `${(certificate.signature || '').slice(0, 32)}...`;
  page.drawText(fingerprint, {
    x: 300, y: footerY + 19, size: 8, font: sans, color: BODY,
  });
  // The key id travels with the certificate so a holder can check it against
  // the published public key without trusting this server to pick the right one.
  page.drawText(
    ascii(`Key: ${(certificate.signing_key_id || '').slice(0, 16) || 'n/a'} - verifiable with the public key`),
    {
      x: 300, y: footerY + 8, size: 7.5, font: sans, color: MUTED,
    }
  );

  // QR (right)
  const qrUrl = verificationUrlFor(certificate.serial);
  const qrSize = 86;
  const qrX = W - 60 - qrSize;
  const qrY = footerY - 4;
  let qrEmbedded = false;
  try {
    const png = await QRCode.toBuffer(qrUrl, {
      type: 'png',
      margin: 0,
      width: 320,
      errorCorrectionLevel: 'M',
      color: { dark: '#10151C', light: '#FCFBF8' },
    });
    const qrImage = await pdf.embedPng(png);
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    qrEmbedded = true;
  } catch {
    // A missing QR must never block a real certificate download.
    page.drawRectangle({
      x: qrX, y: qrY, width: qrSize, height: qrSize,
      borderColor: HAIRLINE, borderWidth: 1, color: rgb(1, 1, 1),
    });
    page.drawText('QR', { x: qrX + 34, y: qrY + 40, size: 14, font: sansBold, color: MUTED });
  }

  page.drawText('SCAN TO VERIFY', {
    x: qrX + (qrSize - sansBold.widthOfTextAtSize('SCAN TO VERIFY', 7.5)) / 2,
    y: qrY - 12, size: 7.5, font: sansBold, color: SKY,
  });

  // Verification URL text under the QR
  const urlText = ascii(qrUrl);
  page.drawText(urlText, {
    x: W - 300 - (W - 60 - 300 > 0 ? 0 : 0) - sans.widthOfTextAtSize(urlText, 7.5) - 20,
    y: qrY - 24, size: 7.5, font: sans, color: MUTED,
  });

  // --- Watermark when revoked -----------------------------------------
  if (certificate.status === 'revoked') {
    page.drawText('REVOKED', {
      x: (W - sansBold.widthOfTextAtSize('REVOKED', 64)) / 2,
      y: H / 2 - 22, size: 64, font: sansBold, color: rgb(0.757, 0.267, 0.176),
      opacity: 0.16, rotate: degrees(28),
    });
  }

  // --- PDF metadata ----------------------------------------------------
  pdf.setTitle(`TieEdu Certificate ${certificate.serial}`);
  pdf.setSubject(`Course completion: ${courseTitle}`);
  pdf.setAuthor('TieEdu');
  pdf.setProducer('TieEdu Certificate Service');
  pdf.setKeywords([certificate.serial, 'tieedu', 'certificate']);
  pdf.setCreationDate(new Date(certificate.issued_at));

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

/** Short, readable lesson count for the certificate body copy. */
export function describeCourseScope(course: Course | null, lessonsCompleted: number): string {
  const total = course ? orderedLessons(course).length : lessonsCompleted;
  return `${lessonsCompleted} of ${total} lessons`;
}
