import { describe, expect, it } from 'vitest';
import { generateOtp, OTP_DIGITS } from './otp';
import { isValidPin } from './password';

describe('generateOtp', () => {
  it('is always 6 digits', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateOtp();
      expect(code).toHaveLength(OTP_DIGITS);
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe('isValidPin', () => {
  it('accepts 4–6 digit PINs only', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });
});
