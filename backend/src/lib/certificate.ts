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
//  3. It carries an HMAC-SHA256 signature over its own canonical fields,
//     computed with a server-only secret. Anyone can recompute it: if the
//     signature does not match the record, the certificate is a forgery,
//     regardless of what the PDF looks like.
//  4. The PDF is generated here, on the server, from the stored record. What
//     the learner downloads is exactly what the verifier reads back.
//  5. Revocation is a status change on the stored row, so a revoked certificate
//     stops verifying immediately — a PDF sitting in someone's inbox cannot help
//     them, because verification never trusts the PDF.
// ============================================================================

import crypto from 'crypto';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { Certificate, Course, User } from '../data/db';
import { orderedLessons } from './courses';

/**
 * Dedicated signing secret, so revoking the JWT secret does not silently
 * invalidate every certificate already in students' hands. In production this
 * MUST be set; falling back to the JWT secret keeps dev working.
 */
export const CERT_SIGNING_SECRET =
  process.env.CERT_SIGNING_SECRET ||
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? ''
    : 'tieedu-dev-cert-secret-change-me');

/**
 * A certificate signed with an empty key is still self-consistent: anyone who
 * reads this file can recompute the HMAC and "verify" a forged record. So in
 * production an unconfigured secret is a hard failure, not a silent downgrade.
 */
export function assertSigningConfigured(): void {
  if (CERT_SIGNING_SECRET && CERT_SIGNING_SECRET.trim().length >= 16) return;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Certificate signing is not configured. Set CERT_SIGNING_SECRET (>= 16 chars) before issuing or verifying certificates in production.'
    );
  }
  if (process.env.NODE_ENV === 'test') return;
  // eslint-disable-next-line no-console
  console.warn(
    '[certificates] CERT_SIGNING_SECRET is unset — using the development fallback. ' +
      'Certificates issued now will not verify once a real secret is configured.'
  );
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
    throw new Error(
      'Certificate verification URL is not configured. Set NEXT_PUBLIC_SITE_URL to the public ' +
        'origin (e.g. https://tieedu.com) before issuing certificates in production — otherwise ' +
        'every PDF printed will carry a QR code that cannot be scanned by anyone.'
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

/** Bumped whenever the signed field set changes, so old signatures are unambiguous. */
export const SIGNING_VERSION = 2;

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

export function signCertificate(fields: SignedCertificateFields): string {
  assertSigningConfigured();
  assertSiteUrlConfigured();
  return crypto
    .createHmac('sha256', CERT_SIGNING_SECRET)
    .update(canonicalPayload(fields))
    .digest('hex');
}

export interface SignatureCheck {
  signature_valid: boolean;
  record_exists: boolean;
  status: 'active' | 'revoked' | 'unknown';
  revoked_reason: string;
  revoked_at: string | null;
}

/**
 * Full authenticity check for a serial. Both halves matter:
 *  - `record_exists` proves the serial was really issued by us.
 *  - `signature_valid` proves the stored record has not been edited, because
 *    editing any signed field invalidates the HMAC.
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
      },
      certificate: null,
      course: null,
      recipient: null,
    };
  }

  assertSigningConfigured();

  const expected = signCertificate({
    serial: certificate.serial,
    user_id: certificate.user_id,
    recipient_email: certificate.recipient_email,
    recipient_name: certificate.recipient_name,
    course_id: certificate.course_id,
    course_title: certificate.course_title,
    issued_at: certificate.issued_at,
    lessons_completed: certificate.lessons_completed,
    lessons_required: certificate.lessons_required,
    xp_at_issue: certificate.xp_at_issue,
  });

  const course = (db.courses || []).find((c: Course) => c.id === certificate.course_id) || null;
  const user: User | undefined = (db.users || []).find((u: User) => u.id === certificate.user_id);

  return {
    found: true,
    check: {
      signature_valid: expected === certificate.signature,
      record_exists: true,
      status: certificate.status === 'revoked' ? 'revoked' : 'active',
      revoked_reason: certificate.revoked_reason || '',
      revoked_at: certificate.revoked_at || null,
    },
    certificate,
    course,
    recipient: {
      name: certificate.recipient_name,
      college: user?.college || null,
    },
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
  page.drawText('HMAC-SHA256 fingerprint', {
    x: 300, y: footerY + 32, size: 7.5, font: sans, color: MUTED,
  });
  const fingerprint = `${certificate.signature.slice(0, 32)}...`;
  page.drawText(fingerprint, {
    x: 300, y: footerY + 19, size: 8, font: sans, color: BODY,
  });
  page.drawText('Recomputable by anyone - see verification page', {
    x: 300, y: footerY + 8, size: 7.5, font: sans, color: MUTED,
  });

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
