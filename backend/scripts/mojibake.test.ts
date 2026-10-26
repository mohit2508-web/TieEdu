// ============================================================================
// Generic encoding repair. The guarantees: double/triple-encoded punctuation is
// restored, legitimate accented text is never touched, object keys are repaired
// in step with values (quiz answer maps), and a second pass is a no-op.
// ============================================================================

import { repairMojibakeGeneric, repairMojibakeGenericDeep } from '../src/lib/textEncoding';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

// Build corrupted strings the way the broken chain did: UTF-8 bytes read as cp1252.
const CP1252: Record<number, number> = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
  0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160, 0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018,
  0x92: 0x2019, 0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02dc,
  0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153, 0x9e: 0x017e, 0x9f: 0x0178,
};
const corrupt = (s: string) => Array.from(Buffer.from(s, 'utf8'), (b) => String.fromCharCode(CP1252[b] ?? b)).join('');

for (const clean of ['Module 1 — Orientation', '90 Mins → 2 DSA', '₹12L - ₹22L', 'O(n²)', '“quoted”', 'it’s', '…']) {
  check(`single: ${clean}`, repairMojibakeGeneric(corrupt(clean)), clean);
  check(`double: ${clean}`, repairMojibakeGeneric(corrupt(corrupt(clean))), clean);
  check(`triple: ${clean}`, repairMojibakeGeneric(corrupt(corrupt(corrupt(clean)))), clean);
  check(`clean untouched: ${clean}`, repairMojibakeGeneric(clean), clean);
}

for (const legit of ['café', 'naïve résumé', 'Zürich', 'São Paulo', 'Ångström', 'Ação', 'ÿes', 'Â', 'déjà vu']) {
  check(`legit accents untouched: ${legit}`, repairMojibakeGeneric(legit), legit);
}

const doc = {
  title: corrupt(corrupt('Lists — and tuples')),
  answers: { [corrupt(corrupt('5,984,210 — the answer'))]: 'correct' },
  options: [corrupt(corrupt('5,984,210 — the answer')), 'other'],
  n: 3,
  ok: true,
};
const { value, changed } = repairMojibakeGenericDeep(doc);
check('deep: values repaired', value.title, 'Lists — and tuples');
check('deep: keys repaired in step with options', Object.keys(value.answers)[0], value.options[0]);
check('deep: non-strings untouched', [value.n, value.ok], [3, true]);
check('deep: change count includes the key', changed, 3);
check('deep: second pass is a no-op', repairMojibakeGenericDeep(value).changed, 0);

console.log(`mojibake: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
