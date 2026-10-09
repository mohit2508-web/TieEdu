import { randomBytes } from 'node:crypto';

/**
 * Certificates (Phase 7, spec §6). Serial generation + verification helpers.
 */

/** A short, URL-safe, unguessable certificate serial, e.g. "TIE-9F3A2C7D18". */
export function makeSerial(random: (n: number) => Buffer = randomBytes): string {
  return `TIE-${random(6).toString('hex').toUpperCase()}`;
}

export interface VerifyInput {
  serial: string;
  revokedAt: Date | null;
}

export type CertificateState = 'VALID' | 'REVOKED';

export function certificateState(cert: VerifyInput): CertificateState {
  return cert.revokedAt ? 'REVOKED' : 'VALID';
}

export function isValidSerial(serial: string): boolean {
  return /^TIE-[0-9A-F]{8,}$/.test(serial);
}
