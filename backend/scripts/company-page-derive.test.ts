// ============================================================================
// Derived company pages — every company on the 3T layout, built from its own
// record. The rule under test is "derive, never invent": a figure appears only
// if the record has it, is stamped Verified only with a source, rounds come
// from the recorded pipeline (else the module types, stamped as unverified),
// and skill tests are linked only when the slug exists.
// ============================================================================

import { derivePageContent, moduleRound } from '../src/lib/companyPageDerive';
import { validateForPublish } from '../src/lib/companyPage';

let pass = 0;
let fail = 0;

function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
const checkTrue = (name: string, cond: boolean) => check(name, cond, true);

const skills = ['dsa', 'system-design', 'business-communication', 'dbms'].map((slug) => ({ slug, status: 'active' }));
skills.push({ slug: 'quantitative-aptitude', status: 'inactive' });

const withPipeline = {
  id: 'c1',
  slug: 'acme',
  name: 'Acme',
  status: 'published',
  industry: 'Fintech',
  ctc_min: 10,
  ctc_max: 20,
  avg_process_days: 12,
  difficulty_rating: 3,
  metric_sources: { ctc: { source: 'https://acme.example/careers', verified_at: '2026-09-01T00:00:00Z' } },
  rounds_pipeline: [
    { step_number: 2, title: 'Round 2: Technical R1', subtitle: 'OS & Networks', round_type: 'Technical' },
    { step_number: 1, title: 'Round 1: Online Assessment', subtitle: '2 DSA + 10 MCQs', round_type: 'OA' },
  ],
  modules: [
    { id: 'm-guide', title: 'Acme Hiring Guide', module_type: 'preparation_guide', is_premium: false },
    { id: 'm-oa', title: 'OA patterns', round_type: 'OA', module_type: 'dsa_question', is_premium: true },
    { id: 'm-tech', title: 'Technical questions', module_type: 'technical_question', is_premium: true },
  ],
};

const noPipeline = {
  id: 'c2',
  slug: 'beta',
  name: 'Beta',
  status: 'published',
  industry: 'Fintech',
  modules: [
    { id: 'b-hr', title: 'HR answers', module_type: 'hr_question', is_premium: false },
    { id: 'b-sd', title: 'Design drills', module_type: 'system_design', is_premium: true },
    { id: 'b-odd', title: 'Notes for the road', is_premium: false },
  ],
};

const db = { skills, companies: [withPipeline, noPipeline, { id: 'c3', slug: 'gamma', name: 'Gamma', status: 'draft' }] };
const sectionOf = (page: any, type: string) => page.sections.find((x: any) => x.type === type);

// --- with a recorded pipeline ------------------------------------------------
const a = derivePageContent(db, withPipeline);
const aStats = sectionOf(a, 'stat_strip').data.stats;
check('stats: only figures the record has', aStats.map((s: any) => s.label), ['Package', 'Selection process', 'Rounds', 'Difficulty']);
check('stats: package is verified because it has a source', aStats[0].stamp, 'verified');
check('stats: the source is carried', aStats[0].source_url, 'https://acme.example/careers');
check('stats: process has no source, so it is being verified', aStats[1].stamp, 'being_verified');
const aRounds = sectionOf(a, 'rounds_route').data.stations;
check('rounds: follow the pipeline order, prefix stripped', aRounds.map((s: any) => s.title), ['Online Assessment', 'Technical R1']);
check('rounds: the OA round gets its typed module', aRounds[0].module_ids, ['m-oa']);
check('rounds: an untyped module is placed by its module type', aRounds[1].module_ids, ['m-tech']);
check('rounds: only skill tests that exist and are active', aRounds[0].skill_slugs, ['dsa']);
check('rounds: the pipeline subtitle becomes the train line', aRounds[0].train_text, 'Focus: 2 DSA + 10 MCQs.');
check('rounds: every pattern is still unverified', aRounds.every((s: any) => s.status_note === 'Pattern being verified'), true);
check('rounds: no pattern table is invented', aRounds.every((s: any) => s.pattern.length === 0), true);
const aPack = sectionOf(a, 'prep_pack').data;
check('pack: free features are the free modules', aPack.free_features, ['Acme Hiring Guide']);
check('pack: paid features list the premium modules', aPack.paid_features, ['Everything in Free', 'OA patterns', 'Technical questions']);
check('hero: next step names the real free module', sectionOf(a, 'hero').data.next_step_text, 'Start with the free module: Acme Hiring Guide.');
for (const type of ['eligibility_apply', 'role_compare', 'countdown', 'faq', 'onboarding', 'drive_radar']) {
  check(`no section that needs unentered facts: ${type}`, sectionOf(a, type), undefined);
}
check('compare: only published companies', sectionOf(a, 'also_preparing').data.company_slugs, ['beta']);

// --- without a pipeline ------------------------------------------------------
const b = derivePageContent(db, noPipeline);
const bRounds = sectionOf(b, 'rounds_route').data.stations;
check('inferred rounds: from module types, in interview order', bRounds.map((s: any) => s.short_label), ['Design', 'HR']);
check('inferred rounds: say the pattern is being verified', bRounds.every((s: any) => s.status_note === 'Round pattern being verified'), true);
check('inferred rounds: a title like "road" is not mistaken for an OA', bRounds.some((s: any) => s.module_ids.includes('b-odd')), false);
check('no recorded figures: only the inferred round count is shown', sectionOf(b, 'stat_strip').data.stats.map((s: any) => s.label), ['Rounds']);
checkTrue('an inferred HR round links its existing skill test', bRounds.find((s: any) => s.short_label === 'HR').test_href === '/skill-test/business-communication');

// --- module rounds -----------------------------------------------------------
check('moduleRound: explicit round wins', moduleRound({ round_type: 'HR', module_type: 'dsa_question' }), 'HR');
check('moduleRound: falls back to the module type', moduleRound({ module_type: 'system_design' }), 'SystemDesign');
check('moduleRound: a guide belongs to no round', moduleRound({ module_type: 'preparation_guide' }), null);

// --- shape -------------------------------------------------------------------
// A derived page is shown as-is, so it must be the same shape a published page
// is. Publish validation flags missing admin facts; it must not find anything
// structurally wrong (unknown types, broken links).
const issues = validateForPublish(a).filter((i: any) => /unknown|link|url/i.test(String(i.message)));
check('derived page passes the publish shape checks', issues, []);

console.log(`\ncompany-page-derive: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
