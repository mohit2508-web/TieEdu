// ============================================================================
// A/B experiments (lib/experiments): off until started, unique-visitor
// counting, conversions only after an exposure, and an honest verdict.
// ============================================================================

import { MIN_EXPOSURES, publicExperiments, recordEvent, results, setStatus, statusOf, twoProportionP } from '../src/lib/experiments';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

const vid = (i: number) => `visitor_${String(i).padStart(10, '0')}`;
const ev = (variant: string, event: string, i: number) => ({ experiment: 'cp_main_cta', variant, event, vid: vid(i) });

const db: any = {};
check('off by default', statusOf(db, 'cp_main_cta'), 'off');
check('nothing public while off', publicExperiments(db), []);
check('events ignored while off', recordEvent(db, ev('a', 'exposure', 1)), false);
setStatus(db, 'cp_main_cta', 'running', new Date('2026-10-28T00:00:00Z'));
check('running is public', publicExperiments(db), [{ id: 'cp_main_cta', variants: ['a', 'b'] }]);

check('exposure counted', recordEvent(db, ev('a', 'exposure', 1)), true);
check('same visitor twice: not counted again', recordEvent(db, ev('a', 'exposure', 1)), false);
check('conversion without exposure refused', recordEvent(db, ev('b', 'conversion', 2)), false);
check('conversion after exposure counted', recordEvent(db, ev('a', 'conversion', 1)), true);
check('unknown variant refused', recordEvent(db, ev('z', 'exposure', 3)), false);
check('bad visitor id refused', recordEvent(db, { ...ev('a', 'exposure', 3), vid: 'x' }), false);
check('unknown experiment refused', recordEvent(db, { ...ev('a', 'exposure', 3), experiment: 'nope' }), false);
check('visitor ids are stored hashed, never raw', JSON.stringify(db.experiment_data).includes('visitor_'), false);

let r = results(db)[0];
check('too little data: no winner named', [r.significant, /Not enough data/.test(r.verdict)], [false, true]);

// A clear difference with enough traffic.
for (let i = 100; i < 100 + 600; i++) { recordEvent(db, ev('a', 'exposure', i)); if (i % 10 === 0) recordEvent(db, ev('a', 'conversion', i)); }
for (let i = 1000; i < 1000 + 600; i++) { recordEvent(db, ev('b', 'exposure', i)); if (i % 5 === 0) recordEvent(db, ev('b', 'conversion', i)); }
r = results(db)[0];
check('rates', r.variants.map((v) => v.rate), [10.1, 20]);
check('significant, B leads', [r.significant, /Version B converts better/.test(r.verdict)], [true, true]);
check('enough traffic means at least the minimum per variant', r.variants.every((v) => v.exposures >= MIN_EXPOSURES), true);

check('p-value sanity: equal rates ≈ 1', Math.round(twoProportionP(50, 500, 50, 500)! * 100) / 100, 1);
check('p-value sanity: 10% vs 20% of 600', twoProportionP(60, 600, 120, 600)! < 0.001, true);
setStatus(db, 'cp_main_cta', 'stopped');
check('stopped: no longer public, counts kept', [publicExperiments(db).length, results(db)[0].variants[1].exposures], [0, 600]);
check('stopped: events ignored', recordEvent(db, ev('b', 'exposure', 5000)), false);

console.log(`experiments: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
