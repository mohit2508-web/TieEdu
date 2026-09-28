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

const future = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
eq('daysUntil future ~10', Math.abs((daysUntil(future) ?? 0) - 10) <= 1, true);
eq('daysUntil null', daysUntil(null), null);
eq('daysUntil invalid', daysUntil('not-a-date'), null);

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
