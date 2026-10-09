import { describe, expect, it } from 'vitest';
import { certificateState, isValidSerial, makeSerial } from './certificates';

describe('makeSerial', () => {
  it('produces a valid TIE- serial', () => {
    const serial = makeSerial(() => Buffer.from('a1b2c3d4e5f6', 'hex'));
    expect(serial).toBe('TIE-A1B2C3D4E5F6');
    expect(isValidSerial(serial)).toBe(true);
  });
});

describe('isValidSerial', () => {
  it('rejects malformed serials', () => {
    expect(isValidSerial('abc')).toBe(false);
    expect(isValidSerial('TIE-xyz')).toBe(false);
  });
});

describe('certificateState', () => {
  it('reports revocation', () => {
    expect(certificateState({ serial: 'TIE-A1B2C3D4', revokedAt: null })).toBe('VALID');
    expect(certificateState({ serial: 'TIE-A1B2C3D4', revokedAt: new Date() })).toBe('REVOKED');
  });
});
