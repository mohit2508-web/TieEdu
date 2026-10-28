// ============================================================================
// Year-on-year placement results (lib/yearOnYear): totals from recorded
// numbers only, changes only between comparable years, per-company deltas.
// ============================================================================

import { yearOnYear } from '../src/lib/yearOnYear';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

const h = (company_slug: string, year: number, selected: number | null, college_id = 'col1') => ({ id: `${company_slug}-${year}-${college_id}`, college_id, company_slug, year, selected });
const db: any = {
  companies: [{ slug: 'tcs', name: 'TCS' }, { slug: 'infosys', name: 'Infosys' }, { slug: 'wipro', name: 'Wipro' }],
  campus_history: [
    h('tcs', 2024, 40), h('infosys', 2024, 20),
    h('tcs', 2025, 51), h('infosys', 2025, 33), h('wipro', 2025, null),
    h('tcs', 2026, 64), h('infosys', 2026, null), h('wipro', 2026, 26),
    h('tcs', 2026, 999, 'col2'),
  ],
};
const y = yearOnYear(db, 'col1');

check('years newest first', y.years.map((x) => x.year), [2026, 2025, 2024]);
check('totals count recorded numbers only', y.years.map((x) => [x.selected, x.unrecorded]), [[90, 1], [84, 1], [60, 0]]);
check('change from the previous year', y.years.map((x) => x.change), [6, 24, null]);
check('percent change', y.years.map((x) => x.change_pct), [7, 40, null]);
check('other colleges never mix in', y.years[0].companies, 3);
check('companies, biggest latest first', y.companies.map((c) => c.company), ['TCS', 'Infosys', 'Wipro']);
check('per-year table keeps unrecorded as null', y.companies.find((c) => c.slug === 'infosys')!.by_year, { 2024: 20, 2025: 33, 2026: null });
check('latest change only when the latest year is recorded', y.companies.map((c) => c.latest_change), [13, null, null]);

const onlyUnrecorded = yearOnYear({ campus_history: [h('tcs', 2025, 10), h('tcs', 2026, null)] }, 'col1');
check('no change claimed against a year with nothing recorded', onlyUnrecorded.years[0].change, null);
const fromZero = yearOnYear({ campus_history: [h('tcs', 2025, 0), h('tcs', 2026, 5)] }, 'col1');
check('no percent from zero', [fromZero.years[0].change, fromZero.years[0].change_pct], [5, null]);
check('empty college', yearOnYear({}, 'col1'), { years: [], companies: [] });

console.log(`year-on-year: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
