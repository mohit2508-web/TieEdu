import { describe, expect, it } from 'vitest';
import { generateSchoolCode } from './ids';

describe('generateSchoolCode', () => {
  it('derives 4 letters from the name plus a 4-digit suffix', () => {
    expect(generateSchoolCode('Green Valley Tech Academy')).toMatch(/^GREE-\d{4}$/);
  });

  it('pads short names', () => {
    expect(generateSchoolCode('AB')).toMatch(/^ABXX-\d{4}$/);
  });

  it('is not deterministic (suffix varies)', () => {
    const set = new Set(Array.from({ length: 20 }, () => generateSchoolCode('Same Name')));
    expect(set.size).toBeGreaterThan(1);
  });
});
