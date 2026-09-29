import {
  resolvePlan, sanitizeBlock, sanitizeMarkdown, normalizePhase,
  reindexPhases, daysUntil, fallbackPhases, sanitizeBlocks, scalePhasesToWindow,
  ALLOWED_BLOCK_TYPES,
} from '../src/lib/studyPlanTemplates';
import { ALL_BLOCK_TYPES } from '../src/data/db';
import { seedStudyPlanTemplates } from '../src/data/seedStudyPlans';

let pass = 0;
let fail = 0;
const eq = (name: string, a: any, b: any) => {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa === sb) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${sb}\n  actual:   ${sa}`);
  }
};

eq('strips script tags', sanitizeMarkdown('a <script>alert(1)</script> b'), 'a  b');
eq('strips onerror', sanitizeMarkdown('<img src=x onerror="alert(1)">'), '<img src=x>');
eq('strips javascript: url', sanitizeMarkdown('[x](javascript:alert(1))'), '[x](alert(1))');
eq('keeps normal markdown', sanitizeMarkdown('- a\n- b\n\n| x | y |'), '- a\n- b\n\n| x | y |');
eq('caps length', sanitizeMarkdown('x'.repeat(30000)).length, 20000);

eq(
  'rejects unknown block type',
  sanitizeBlock({ block_type: 'evil', payload: {} }, 1),
  null
);
const cl = sanitizeBlock({ block_type: 'checklist', payload: { title: 'T', items: ['a', 'b'] } }, 1);
eq('accepts checklist with items', [cl!.block_type, cl!.block_order, cl!.payload], ['checklist', 1, { title: 'T', items: ['a', 'b'] }]);
eq('generates an id', typeof cl!.id === 'string' && cl!.id.length > 0, true);

// A table's rows are an array OF arrays. This used to be rebuilt with
// Object.fromEntries, which turned [['a','b'],['c','d']] into
// [{0:'a',1:'b'},{0:'c',1:'d'}] — and the reader crashed the whole page on
// `row.map`. Any phase holding a table was affected, so it only showed up on a
// deep link like #phase-2.
const tbl = sanitizeBlock(
  {
    block_type: 'table',
    payload: {
      title: 'Complexity',
      headers: ['Structure', 'Lookup'],
      rows: [['Array', 'O(1)'], ['Hash map', 'O(1) avg']],
    },
  },
  1
);
eq('table rows stay an array', Array.isArray(tbl!.payload.rows), true);
eq('table row stays an array', Array.isArray(tbl!.payload.rows[0]), true);
eq('table row values survive', tbl!.payload.rows[0], ['Array', 'O(1)']);
eq('table headers survive', tbl!.payload.headers, ['Structure', 'Lookup']);

// Object entries inside an array are still rebuilt key by key, and urls inside
// them are still scheme-checked.
const res2 = sanitizeBlock(
  { block_type: 'resources', payload: { links: [{ label: 'A <script>x</script>', url: 'javascript:alert(1)' }] } },
  1
);
eq('array of objects keeps its shape', res2!.payload.links[0], { label: 'A ', url: '' });

// A table longer than MAX_PAYLOAD_DEPTH must keep every row. `.map(sanitizeArrayEntry)`
// once passed the element index as the `depth` arg, so row 4 onward came back empty
// - a silent data loss that a short table would never have exposed.
const manyRows = Array.from({ length: 9 }, (_, i) => [`r${i}a`, `r${i}b`]);
const longTbl = sanitizeBlock(
  { block_type: 'table', payload: { title: 'Long', headers: ['A', 'B'], rows: manyRows } },
  1
);
eq('a long table keeps every row', longTbl!.payload.rows.length, 9);
eq('a long table keeps the last row intact', longTbl!.payload.rows[8], ['r8a', 'r8b']);
eq('row depth is not the row index', longTbl!.payload.rows.map((r: any) => r.length), manyRows.map(() => 2));

const phase = normalizePhase({ title: 'P1', day_from: 1, day_to: 3, blocks: [{ block_type: 'markdown', payload: { text: 'hi' } }] }, 't1', 1);
eq('phase day range', [phase.day_from, phase.day_to], [1, 3]);
eq('phase rejects inverted range', normalizePhase({ day_from: 5, day_to: 2 }, 't1', 1).day_to, 5);
eq('open ended day_to', normalizePhase({ day_from: 12, day_to: null }, 't1', 1).day_to, null);
eq('phase block order starts at 1', phase.blocks[0].block_order, 1);

eq(
  'reindex makes contiguous',
  reindexPhases([
    { phase_order: 9 } as any,
    { phase_order: 3 } as any,
    { phase_order: 5 } as any,
  ]).map((p) => p.phase_order),
  [1, 2, 3]
);

const emptyDb = {};
const r1 = resolvePlan(emptyDb, { companyName: 'Google', role: 'SDE', totalDays: 30 });
eq('no templates falls back', r1.source, 'fallback');
eq('fallback never empty', r1.phases.length > 0, true);
eq('fallback interpolates company', JSON.stringify(r1.phases).includes('Google'), true);
eq('fallback covers the whole window', r1.phases[r1.phases.length - 1].day_to, 30);
eq('fallback grows to fill a long window', r1.phases.length > 4, true);
// A 7-day sprint must show 7 days of work, not four phases truncated to fit.
const short = fallbackPhases('X', 'SDE', 7);
eq('short window drops later phases', short.length, 2);
eq('short window ends on the last day', short[short.length - 1].day_to, 7);
eq('short window stays contiguous', short.map((p) => p.day_from), [1, 4]);

const mkTemplate = (over: any) => ({
  id: 't1', title: 'T', company_id: null, company_name: null, role: null,
  status: 'published', version: 1, created_at: '', updated_at: '', updated_by: null, ...over,
});
const mkPhase = (template_id: string, order: number) => ({
  id: `p${order}`, template_id, phase_order: order, title: `Phase ${order}`,
  day_from: 1, day_to: null, summary: '', blocks: [],
});

const db = {
  companies: [
    { id: 'cmp-google', name: 'Google', slug: 'google' },
    { id: 'cmp-acme', name: 'Acme Corp', slug: 'acme-corp' },
  ],
  study_plan_templates: [
    mkTemplate({ id: 'generic', status: 'published' }),
    mkTemplate({ id: 'co', company_name: 'Google', status: 'published' }),
    mkTemplate({ id: 'coRole', company_name: 'Google', role: 'SDE', status: 'published' }),
    mkTemplate({ id: 'byId', company_id: 'cmp-acme', status: 'published' }),
    mkTemplate({ id: 'draftOnly', company_name: 'Google', role: 'SDE', status: 'draft' }),
  ],
  study_plan_phases: [
    mkPhase('generic', 1), mkPhase('co', 1), mkPhase('coRole', 1),
    mkPhase('byId', 1), mkPhase('draftOnly', 1),
  ],
};

eq('company+role wins', resolvePlan(db, { companyName: 'Google', role: 'SDE', totalDays: 20 }).template!.id, 'coRole');
eq('company only next', resolvePlan(db, { companyName: 'Google', role: 'PM', totalDays: 20 }).template!.id, 'co');
eq('generic fallback tier', resolvePlan(db, { companyName: 'Unknown Co', role: 'SDE', totalDays: 20 }).template!.id, 'generic');
eq('drafts are ignored', resolvePlan(db, { companyName: 'Google', role: 'SDE', totalDays: 20 }).template!.id !== 'draftOnly', true);
eq('case insensitive company', resolvePlan(db, { companyName: 'google', role: 'SDE', totalDays: 20 }).template!.id, 'coRole');
eq('empty db never throws', resolvePlan({}, { totalDays: 14 }).phases.length, 4);

// --- company_id matching (the wildcard bug) ---------------------------------
// A template carrying a company_id used to be treated as "matches any company",
// so a learner targeting Acme was handed the Google plan — the single most
// misleading failure this feature has, because it looks like it worked.
eq(
  'a company_id template does not match an unrelated company',
  resolvePlan(db, { companyName: 'Google', role: 'SDE', totalDays: 20 }).template!.id !== 'byId',
  true
);
eq('a company_id template matches its own company by name', resolvePlan(db, { companyName: 'Acme Corp', role: 'SDE', totalDays: 20 }).template!.id, 'byId');
eq('a company_id template matches by slug', resolvePlan(db, { companyName: 'acme-corp', role: 'SDE', totalDays: 20 }).template!.id, 'byId');
eq('a company_id template is case insensitive', resolvePlan(db, { companyName: 'ACME CORP', role: 'SDE', totalDays: 20 }).template!.id, 'byId');
eq('a blank company_id stays a wildcard', resolvePlan(db, { companyName: 'Whoever', role: 'Any', totalDays: 20 }).template!.id, 'generic');
eq('an empty-string company_id is not treated as a real id', resolvePlan(db, { companyName: 'Nobody At All', role: 'R', totalDays: 20 }).template!.id, 'generic');
// Whitespace and punctuation differences must not defeat the match.
eq('company names match despite punctuation', resolvePlan(db, { companyName: 'Acme, Corp.', role: 'SDE', totalDays: 20 }).template!.id, 'byId');
eq('company names match despite extra spaces', resolvePlan(db, { companyName: '  Acme   Corp  ', role: 'SDE', totalDays: 20 }).template!.id, 'byId');

// ---- daysUntil: calendar days, not elapsed milliseconds -------------------
// These are EXACT on purpose, and they are pinned to a fixed `from` rather than
// "now" so the suite cannot pass or fail depending on the hour it runs.
//
// The bug they guard: a date-only string used to be parsed as UTC
// (`new Date('2026-11-13')` is UTC midnight, 05:30 in IST) and then differenced
// against a local midnight. East of UTC that silently dropped a day; west of
// UTC across a DST boundary it invented one. A learner in India asking for a
// plan 45 days out was handed a 44-day plan for five and a half hours a day.
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plusDays = (from: Date, n: number) => {
  const d = new Date(from);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
const atLocalMidnight = (y: number, mo: number, day: number) =>
  new Date(y, mo - 1, day, 0, 0, 0, 0);

const REF = atLocalMidnight(2026, 9, 30);
eq('daysUntil: the same day is 0', daysUntil('2026-09-30', REF), 0);
eq('daysUntil: tomorrow is 1', daysUntil('2026-10-01', REF), 1);
eq('daysUntil: 7 days ahead is exactly 7', daysUntil(plusDays(REF, 7), REF), 7);
eq('daysUntil: 45 days ahead is exactly 45', daysUntil(plusDays(REF, 45), REF), 45);
eq('daysUntil: 365 days ahead is exactly 365', daysUntil(plusDays(REF, 365), REF), 365);
eq('daysUntil: a past date is negative', daysUntil(plusDays(REF, -5), REF), -5);
eq('daysUntil: null', daysUntil(null), null);
eq('daysUntil: invalid', daysUntil('not-a-date'), null);
eq('daysUntil: empty string', daysUntil(''), null);
// A month boundary, where a naive millisecond diff is most likely to drift.
eq('daysUntil: across a month boundary', daysUntil(plusDays(REF, 46), REF), 46);
// A leap day, the other boundary a hand-rolled day count gets wrong.
eq('daysUntil: across a leap day', daysUntil(plusDays(atLocalMidnight(2028, 2, 20), 9), atLocalMidnight(2028, 2, 20)), 9);
// Leading zeros and surrounding whitespace are what a date input can produce.
eq('daysUntil: padded and whitespace-padded input', daysUntil('  2026-10-07  ', REF), 7);
// A full ISO timestamp names an instant, so which day it falls on is a question
// of whose calendar: 18:30Z is already the 8th in IST. The server resolves it on
// the local calendar, so the expectation is derived the same way rather than
// pinned to a number that would only be right in some timezones.
const STAMP = '2026-10-07T18:30:00.000Z';
const stampLocalDay = (() => {
  const d = new Date(STAMP);
  return (daysUntil(ymd(d), REF) as number);
})();
eq('daysUntil: a full ISO timestamp is accepted and read on the local calendar', daysUntil(STAMP, REF), stampLocalDay);

const seedA = seedStudyPlanTemplates();
const seedB = seedStudyPlanTemplates();
const stripTimes = (s: any) => JSON.stringify(s).replace(/"(created_at|updated_at)":"[^"]*"/g, '"$1":"T"');
eq('seed is deterministic apart from install timestamps', stripTimes(seedA), stripTimes(seedB));
eq('seed ships one published generic template', seedA.templates.length === 1 && seedA.templates[0].status === 'published', true);
eq('seed template is company and role agnostic', [seedA.templates[0].company_id, seedA.templates[0].role], ['', '']);
eq('seed phases are ordered 1..n', seedA.phases.map((p) => p.phase_order), seedA.phases.map((_, i) => i + 1));
eq('seed phase ids are unique', new Set(seedA.phases.map((p) => p.id)).size, seedA.phases.length);
eq('seed block ids are unique', new Set(seedA.phases.flatMap((p) => p.blocks.map((b) => b.id))).size === seedA.phases.flatMap((p) => p.blocks).length, true);
eq('every seed phase has content', seedA.phases.every((p) => p.blocks.length > 0 && p.summary.length > 0), true);
eq('seed day ranges are contiguous', seedA.phases.every((p, i) => i === 0 || p.day_from === (seedA.phases[i - 1].day_to ?? seedA.phases[i - 1].day_from) + 1), true);
eq('seeded plan resolves as a template', resolvePlan(
  { study_plan_templates: seedA.templates, study_plan_phases: seedA.phases },
  { companyName: 'Any Company', role: 'Any Role', totalDays: 28 }
).source, 'template');
eq('seed uses only allowed block types', seedA.phases.flatMap((p) => p.blocks).every((b) => ALLOWED_BLOCK_TYPES.has(b.block_type)), true);
eq('seeded plan survives a sanitize pass', sanitizeBlocks(seedA.phases[1].blocks).length, seedA.phases[1].blocks.length);

const fb = fallbackPhases('Acme', 'SDE', 14);
eq('fallback phase ids are matchable', fb.every((p) => p.id.startsWith('fallback-')), true);
eq('fallback last phase closes at the window length', fb[fb.length - 1].day_to, 14);
// The old behaviour left a short window open-ended, which claims there is more
// to do after the interview date. It must close on the last day instead.
const fb8 = fallbackPhases('Acme', 'SDE', 8);
eq('short window closes on the last day', fb8[fb8.length - 1].day_to, 8);
eq('short window has no phase beyond it', fb8.every((p) => (p.day_to ?? p.day_from) <= 8), true);

// --- window scaling ---------------------------------------------------------
// The plan must fit the window, and the stored template is never mutated.
const authored = [
  { id: 'a', template_id: '', phase_order: 1, title: 'One', day_from: 1, day_to: 3, summary: '', blocks: [] },
  { id: 'b', template_id: '', phase_order: 2, title: 'Two', day_from: 4, day_to: 7, summary: '', blocks: [] },
  { id: 'c', template_id: '', phase_order: 3, title: 'Three', day_from: 8, day_to: null, summary: '', blocks: [] },
] as any[];

const span = (ps: any[]) => ps.map((p) => [p.day_from, p.day_to]);
const orders = (ps: any[]) => ps.map((p) => p.phase_order);

// Inside the authored window only the open-ended tail is closed, on the last day.
eq('scaling inside the window closes the open tail', span(scalePhasesToWindow(authored, 14)), [[1, 3], [4, 7], [8, 14]]);
eq('scaling does not mutate the input', authored.map((p) => p.day_to), [3, 7, null]);

const s45 = scalePhasesToWindow(authored, 45, { company: 'Acme', role: 'SDE' });
eq('a 45-day window adds phases', s45.length > authored.length, true);
eq('scaled phases are contiguously ordered', orders(s45), s45.map((_, i) => i + 1));
eq('a 45-day plan ends on day 45', s45[s45.length - 1].day_to, 45);
eq('scaled day ranges are contiguous', s45.every((p, i) =>
  i === 0 || p.day_from === (s45[i - 1].day_to ?? s45[i - 1].day_from) + 1), true);
eq('scaled phase ids are unique', new Set(s45.map((p) => p.id)).size, s45.length);
eq('scaled block ids are unique', new Set(s45.flatMap((p) => p.blocks.map((b: any) => b.id))).size === s45.flatMap((p) => p.blocks).length, true);
eq('generated phases carry content', s45.filter((p) => p.id.startsWith('consolidation-')).every((p) => p.blocks.length > 0), true);
eq('scaling is idempotent', span(scalePhasesToWindow(s45, 45, { company: 'Acme', role: 'SDE' })), span(s45));
eq('a 1-day window still returns a phase', scalePhasesToWindow(authored, 1).length, 1);
eq('a 1-day window ends on day 1', scalePhasesToWindow(authored, 1)[0].day_to, 1);
eq('scaling tolerates no phases', scalePhasesToWindow([], 30), []);
// A template resolves through the same scaling, so a 45-day learner on a
// 12-day template is not shown four stretched phases.
const seeded45 = resolvePlan(
  { study_plan_templates: seedA.templates, study_plan_phases: seedA.phases },
  { companyName: 'Any Company', role: 'Any Role', totalDays: 45 }
);
eq('a seeded template scales to the window', seeded45.phases.length > seedA.phases.length, true);
eq('the scaled seeded plan ends on day 45', seeded45.phases[seeded45.phases.length - 1].day_to, 45);
eq('the stored seed is untouched by scaling', seedA.phases[seedA.phases.length - 1].day_to !== 45, true);

// --- block vocabulary --------------------------------------------------------
// The silent-content-loss bug: the allow-lists were retyped per write path and
// drifted from the renderer, so a block the editor could insert was dropped on
// save with a 200 response. These assertions fail the moment the lists diverge.
eq('the runtime list is non-empty', ALL_BLOCK_TYPES.length > 0, true);
eq('the runtime list has no duplicates', new Set(ALL_BLOCK_TYPES).size, ALL_BLOCK_TYPES.length);
eq('the study-plan allow-list covers the whole vocabulary', [...ALLOWED_BLOCK_TYPES].sort(), [...ALL_BLOCK_TYPES].sort());
eq('checklist survives the study-plan allow-list', ALLOWED_BLOCK_TYPES.has('checklist'), true);
eq('resources survives the study-plan allow-list', ALLOWED_BLOCK_TYPES.has('resources'), true);
eq('steps survives the study-plan allow-list', ALLOWED_BLOCK_TYPES.has('steps'), true);
eq('video_link survives the study-plan allow-list', ALLOWED_BLOCK_TYPES.has('video_link'), true);
// A block type the vocabulary rejects must be dropped, not smuggled through.
eq('an unknown block type is dropped', sanitizeBlocks([{ block_type: 'nope', payload: { text: 'x' } }]).length, 0);
eq('every vocabulary type survives sanitisation', ALL_BLOCK_TYPES.every((t) =>
  sanitizeBlocks([{ block_type: t, payload: { text: 'x' } }]).length === 1), true);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
