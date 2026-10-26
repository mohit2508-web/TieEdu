// ============================================================================
// Company Page Studio — sanitiser, link rules, publish validation, templates.
//
// The studio stores admin-authored content that the public page renders
// straight into hrefs and headings, so the sanitiser is the security boundary:
// unknown keys and section types must vanish, every value must take its
// declared kind, and no link may carry a scheme other than http(s)/mailto.
// ============================================================================

import {
  SECTION_CATALOG,
  TEMPLATES,
  cleanUrl,
  sanitizeContent,
  templateContent,
  validateForPublish,
  MAX_SECTIONS,
} from '../src/lib/companyPage';

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

function checkTrue(name: string, cond: boolean) {
  check(name, cond, true);
}

// --- links ------------------------------------------------------------------
check('url: in-app path', cleanUrl('/skill-test/aptitude'), '/skill-test/aptitude');
check('url: anchor', cleanUrl('#drive-radar'), '#drive-radar');
check('url: https', cleanUrl('https://www.example.com/careers'), 'https://www.example.com/careers');
check('url: mailto', cleanUrl('mailto:help@tieedu.in'), 'mailto:help@tieedu.in');
check('url: javascript refused', cleanUrl('javascript:alert(1)'), '');
check('url: protocol-relative refused', cleanUrl('//evil.test/x'), '');
check('url: backslash trick refused', cleanUrl('/\\evil.test'), '');
check('url: data refused', cleanUrl('data:text/html,<script>'), '');
check('url: anchor with spaces refused', cleanUrl('#a b'), '');

// --- sanitiser --------------------------------------------------------------
const dirty = sanitizeContent({
  settings: { accent: 'neon-pink', hero_style: 'paper', evil: 'x', sticky_enabled: 'yes' },
  sections: [
    { type: 'not_a_section', data: {} },
    {
      id: 's-abc12',
      type: 'stat_strip',
      visible: true,
      data: {
        injected: true,
        stats: [
          { label: 'Package\n\u0000LPA', value: 4.5, stamp: 'made-up', link_href: 'javascript:x', extra: 1 },
          'not an object',
        ],
      },
    },
    { id: 's-abc12', type: 'faq', data: { items: [{ q: 'Q?', a: '**A**' }] } },
  ],
});
check('drops unknown section type', dirty.sections.map((s) => s.type), ['stat_strip', 'faq']);
check('unknown accent falls back to first swatch', dirty.settings.accent, 'violet');
check('known setting kept', dirty.settings.hero_style, 'paper');
check('unknown setting key dropped', 'evil' in dirty.settings, false);
check('bool needs a real true', dirty.settings.sticky_enabled, false);
check('unknown data key dropped', 'injected' in dirty.sections[0].data, false);
const stat = (dirty.sections[0].data.stats as any[])[0];
check('non-object list rows dropped', (dirty.sections[0].data.stats as any[]).length, 1);
check('single-line text flattens newlines + strips control chars', stat.label, 'Package LPA');
check('number coerced to text', stat.value, '4.5');
check('unknown select value falls back', stat.stamp, 'being_verified');
check('bad link emptied', stat.link_href, '');
check('unknown row key dropped', 'extra' in stat, false);
checkTrue('list rows get an id', typeof stat.id === 'string' && stat.id.length > 0);
checkTrue('duplicate section ids are re-issued', dirty.sections[0].id !== dirty.sections[1].id);
check('markdown kept verbatim', (dirty.sections[1].data.items as any[])[0].a, '**A**');

const ints = sanitizeContent({
  sections: [{ type: 'countdown', data: { default_days: 999, mock_every_days: 'abc', plan_blocks: [{ focus: 'Quant', weight: -4 }] } }],
});
check('int clamped to max', ints.sections[0].data.default_days, 60);
check('non-numeric int is null', ints.sections[0].data.mock_every_days, null);
check('int clamped to min', (ints.sections[0].data.plan_blocks as any[])[0].weight, 1);

const many = sanitizeContent({ sections: Array.from({ length: 50 }, () => ({ type: 'rich_text', data: {} })) });
check('section count capped', many.sections.length, MAX_SECTIONS);

check('null content is an empty page, not a throw', sanitizeContent(null).sections, []);

// --- validation -------------------------------------------------------------
const empty = validateForPublish(sanitizeContent({ sections: [] }));
checkTrue('empty page is a blocking error', empty.some((i) => i.level === 'error'));

const missingRequired = validateForPublish(
  sanitizeContent({ sections: [{ type: 'hero', data: {} }, { type: 'faq', data: { items: [{ q: '', a: '' }] } }] })
);
checkTrue('required list fields are errors', missingRequired.filter((i) => i.level === 'error').length >= 2);

const hiddenBroken = validateForPublish(
  sanitizeContent({ sections: [{ type: 'hero', data: {} }, { type: 'faq', visible: false, data: { items: [{ q: '' }] } }] })
);
check('hidden sections are not validated', hiddenBroken.filter((i) => i.level === 'error').length, 0);

const unsourced = validateForPublish(
  sanitizeContent({
    sections: [{ type: 'stat_strip', data: { stats: [{ label: 'CTC', value: '4.5', stamp: 'verified', verified_at: '2020-01-01' }] } }],
  }),
  new Date('2026-10-25T00:00:00Z')
);
checkTrue('verified stat without source warns', unsourced.some((i) => /no source link/.test(i.message)));
checkTrue('stale verification warns', unsourced.some((i) => /over 60 days/.test(i.message)));

// --- templates --------------------------------------------------------------
for (const t of TEMPLATES) {
  const content = templateContent(t.value);
  check(`template ${t.value} survives the sanitiser unchanged`, sanitizeContent(content), content);
  check(`template ${t.value} has no blocking errors`, validateForPublish(content).filter((i) => i.level === 'error'), []);
  const stats = content.sections.find((s) => s.type === 'stat_strip');
  checkTrue(
    `template ${t.value} ships no invented numbers`,
    ((stats?.data.stats as any[]) || []).every((s) => s.value === '')
  );
}

checkTrue('every catalog type has a label and description', SECTION_CATALOG.every((d) => !!d.label && !!d.description));

// --- Hinglish variants --------------------------------------------------------
const hi = sanitizeContent({
  settings: { hi: { disclaimer: 'Hum affiliated nahi hain', seo_title: '' } },
  sections: [
    {
      type: 'rounds_route',
      data: {
        title: 'Rounds',
        hi: { title: 'Saare rounds', nav_label: 'Rounds', evil: 'x' },
        stations: [{ title: 'Coding', test_href: '/x', hi: { title: 'Coding round', test_href: 'javascript:1', topics: ['Arrays'] } }],
      },
    },
  ],
});
check('hi text kept', (hi.sections[0].data.hi as any).title, 'Saare rounds');
check('hi unknown key dropped', 'evil' in (hi.sections[0].data.hi as any), false);
const hiRow = (hi.sections[0].data.stations as any[])[0].hi;
check('hi on list rows', hiRow.title, 'Coding round');
check('hi never carries links', 'test_href' in hiRow, false);
check('hi tags kept', hiRow.topics, ['Arrays']);
check('empty hi value dropped', 'seo_title' in (hi.settings.hi as any), false);

check('image field accepts only studio media names', sanitizeContent({ settings: { og_image: '../../etc/passwd' } }).settings.og_image, '');
check('image field keeps a real name', sanitizeContent({ settings: { og_image: 'cp-1790000000000-abcd1234.png' } }).settings.og_image, 'cp-1790000000000-abcd1234.png');

// --- publishing: pack cap + schedule -----------------------------------------
import { companyPackCap, applyDueSchedule, newPageDoc, publishContent } from '../src/lib/companyPage';
import { summarizePack } from '../src/routes/checkout.routes';
{
  const doc = newPageDoc('c1', 'mass_recruiter', 'admin');
  doc.draft.settings.pack_price_inr = 99;
  const db: any = { company_pages: [doc] };
  check('no cap while unpublished', companyPackCap(db, 'c1'), null);
  publishContent(doc, doc.draft, 'admin', '2026-10-01T00:00:00Z');
  check('no cap while switched off', companyPackCap(db, 'c1'), null);
  doc.enabled = true;
  check('cap when live', companyPackCap(db, 'c1'), 99);

  const items: any[] = [{ kind: 'company', id: 'c1', slug: 'acc', module_ids: ['m1', 'm2', 'm3', 'm4'] }];
  check('ladder without cap', summarizePack(items).subtotal, 249);
  check('cap lowers the pack', summarizePack(items, () => 99).subtotal, 99);
  check('cap never raises a price', summarizePack([{ kind: 'company', id: 'c1', slug: 'acc', module_id: 'm1' }] as any, () => 150).subtotal, 99);

  doc.scheduled = { content: { ...doc.draft, settings: { ...doc.draft.settings, seo_title: 'later' } }, at: '2026-12-01T00:00:00Z', by: 'admin' };
  check('schedule not due', applyDueSchedule(doc, new Date('2026-11-30T00:00:00Z')), false);
  check('schedule due', applyDueSchedule(doc, new Date('2026-12-01T00:00:01Z')), true);
  check('schedule promoted', doc.published?.settings.seo_title, 'later');
  check('schedule cleared', doc.scheduled, null);
  check('previous version kept in history', doc.history.length, 1);
}

// --- student side ------------------------------------------------------------
import {
  computeTrack,
  recordDaily,
  profileView,
  updateProfile,
  createRadarReport,
  confirmRadarReport,
  moderateRadarReport,
  publicRadar,
  grantExperienceReward,
  istDate,
} from '../src/lib/companyPageStudent';
{
  const page = templateContent('mass_recruiter');
  const rounds = page.sections.find((s) => s.type === 'rounds_route')!;
  const [cog, coding] = rounds.data.stations as any[];
  const db: any = {
    skills: [
      { id: 'sk-q', slug: 'quantitative-aptitude' },
      { id: 'sk-l', slug: 'logical-reasoning' },
      { id: 'sk-c', slug: 'c' },
    ],
    attempts: [
      { userId: 'u1', skillId: 'sk-q', status: 'submitted', percentage: 40, topicPerformance: [{ topicName: 'Percentages', correct: 1, total: 5 }, { topicName: 'Ratios', correct: 4, total: 5 }] },
      { userId: 'u1', skillId: 'sk-q', status: 'submitted', percentage: 60, topicPerformance: [{ topicName: 'Percentages', correct: 2, total: 5 }, { topicName: 'Ratios', correct: 5, total: 5 }] },
      { userId: 'u1', skillId: 'sk-l', status: 'submitted', percentage: 80, topicPerformance: [] },
      { userId: 'u1', skillId: 'sk-c', status: 'in_progress', percentage: 100, topicPerformance: [] },
      { userId: 'u2', skillId: 'sk-c', status: 'submitted', percentage: 10, topicPerformance: [] },
    ],
  };
  const track = computeTrack(db, 'u1', page);
  const tc = track.stations.find((s) => s.station_id === cog.id)!;
  check('track: best attempt per skill, averaged across the round', tc.score, 70);
  check('track: weakest topics from the best attempts, perfect ones excluded', tc.weak_topics, [{ name: 'Percentages', percentage: 40 }]);
  check('track: unfinished attempts never count', track.stations.find((s) => s.station_id === coding.id)!.score, null);
  check('track: other students never count', computeTrack(db, 'u2', page).stations.find((s) => s.station_id === coding.id)!.score, 10);
  check('track: overall + weakest', [track.overall, track.weakest_station_id], [70, cog.id]);

  // streak
  const pdb: any = {};
  recordDaily(pdb, 'u1', 'c1', new Date('2026-10-20T10:00:00+05:30'));
  recordDaily(pdb, 'u1', 'c1', new Date('2026-10-20T20:00:00+05:30'));
  recordDaily(pdb, 'u1', 'c1', new Date('2026-10-21T08:00:00+05:30'));
  check('streak: one per IST day, consecutive days add up', pdb.company_prep_profiles[0].daily_streak, 2);
  recordDaily(pdb, 'u1', 'c1', new Date('2026-10-24T08:00:00+05:30'));
  check('streak: a gap restarts it', pdb.company_prep_profiles[0].daily_streak, 1);
  check('streak: shown as broken after a missed day', profileView(pdb.company_prep_profiles[0], new Date('2026-10-26T08:00:00+05:30')).daily_streak, 0);
  check('IST day boundary', istDate(new Date('2026-10-20T19:00:00Z')), '2026-10-21');

  // profile patch validation
  const steps = page.sections.find((s) => s.type === 'onboarding')!.data.steps as any[];
  const p = updateProfile(pdb, 'u1', 'c1', { test_date: 'tomorrow', target_role: 9, onboarding_done: [steps[0].id, 'forged', steps[0].id], daily_streak: 500 }, page);
  check('profile: bad date cleared', p.test_date, '');
  check('profile: role outside the page is refused', p.target_role, null);
  check('profile: only real onboarding steps, deduped', p.onboarding_done, [steps[0].id]);
  check('profile: streak not client-writable', p.daily_streak, 1);

  // radar
  const rdb: any = {};
  const radarPage = templateContent('mass_recruiter');
  const radar = radarPage.sections.find((s) => s.type === 'drive_radar')!;
  radar.data.allow_reports = false;
  let refused = false;
  try { createRadarReport(rdb, { id: 'u1', name: 'A' }, 'c1', radarPage, { kind: 'invites', text: 'Invites are going out today' }); } catch { refused = true; }
  checkTrue('radar: closed when reports are off', refused);
  radar.data.allow_reports = true;
  radar.data.min_confirmations = 2;
  const r = createRadarReport(rdb, { id: 'u1', name: 'A' }, 'c1', radarPage, { kind: 'invites', text: '  Invites   are going out today ' });
  check('radar: text normalised', r.text, 'Invites are going out today');
  let tooShort = false;
  try { createRadarReport(rdb, { id: 'u1', name: 'A' }, 'c1', radarPage, { text: 'hi' }); } catch { tooShort = true; }
  checkTrue('radar: too-short text refused', tooShort);
  let selfConfirm = false;
  try { confirmRadarReport(rdb, r.id, 'u1', radarPage); } catch { selfConfirm = true; }
  checkTrue('radar: no self-confirmation', selfConfirm);
  check('radar: first confirmation keeps it pending', confirmRadarReport(rdb, r.id, 'u2', radarPage).becameApproved, false);
  check('radar: duplicate confirmation not counted', (confirmRadarReport(rdb, r.id, 'u2', radarPage), r.confirmed_by.length), 1);
  check('radar: threshold approves it', confirmRadarReport(rdb, r.id, 'u3', radarPage).becameApproved, true);
  check('radar: public list shows it', publicRadar(rdb, 'c1', radarPage, null).map((x) => [x.text, x.confirmed, x.pending]), [['Invites are going out today', 2, false]]);
  radar.data.min_confirmations = 0;
  const r2 = createRadarReport(rdb, { id: 'u4', name: 'B' }, 'c1', radarPage, { kind: 'results', text: 'Results announced for batch one' });
  check('radar: admin-only mode hides pending', publicRadar(rdb, 'c1', radarPage, null).some((x) => x.id === r2.id), false);
  check('radar: admin approval', moderateRadarReport(rdb, r2.id, 'c1', 'approved', 'admin').becameApproved, true);
  check('radar: moderation scoped to the company', (() => { try { moderateRadarReport(rdb, r2.id, 'other', 'rejected', 'admin'); return 'moved'; } catch { return 'refused'; } })(), 'refused');

  // experience reward
  const doc = newPageDoc('c1', 'mass_recruiter', 'admin');
  publishContent(doc, doc.draft, 'admin', '2026-10-01T00:00:00Z');
  doc.enabled = true;
  const wdb: any = { company_pages: [doc], users: [{ id: 'u1' }], unlocks: [], audit: [] };
  const report = { id: 'rep1', user_id: 'u1', company_id: 'c1' };
  check('reward: off by default', grantExperienceReward(wdb, report, 'admin'), false);
  doc.published!.settings.experience_reward = true;
  check('reward: granted when the page opts in', grantExperienceReward(wdb, report, 'admin'), true);
  check('reward: once per student', grantExperienceReward(wdb, { ...report, id: 'rep2' }, 'admin'), false);
  check('reward: audited', wdb.audit.length, 1);
  check('reward: anonymous reports get nothing', grantExperienceReward(wdb, { id: 'rep3', company_id: 'c1' }, 'admin'), false);
}




// --- third pass: reminders, drive suggestion, catalog cap ---------------------
import { planStreakReminders, driveStatusSuggestion } from '../src/lib/companyPageStudent';
import { buildPricingCatalog } from '../src/lib/pricing';
{
  const doc = newPageDoc('c1', 'mass_recruiter', 'admin');
  publishContent(doc, doc.draft, 'admin', '2026-10-01T00:00:00Z');
  doc.enabled = true;
  const db: any = {
    companies: [{ id: 'c1', name: 'Acme', slug: 'acme' }],
    company_pages: [doc],
    company_prep_profiles: [
      { user_id: 'yesterday', company_id: 'c1', daily_last: '2026-10-25', daily_streak: 4 },
      { user_id: 'today', company_id: 'c1', daily_last: '2026-10-26', daily_streak: 5 },
      { user_id: 'lapsed', company_id: 'c1', daily_last: '2026-10-20', daily_streak: 2 },
    ],
  };
  const evening = new Date('2026-10-26T19:30:00+05:30');
  check('reminders: off unless the page opts in', planStreakReminders(db, evening).length, 0);
  doc.published!.settings.streak_reminders = true;
  check('reminders: not in the morning', planStreakReminders(db, new Date('2026-10-26T09:00:00+05:30')).length, 0);
  check('reminders: only the streak at risk', planStreakReminders(db, evening).map((r) => r.user_id), ['yesterday']);
  check('reminders: once per day', planStreakReminders(db, new Date('2026-10-26T20:30:00+05:30')).length, 0);

  const sdb: any = { company_pages: [doc], company_radar_reports: [] };
  check('suggestion: nothing recent', driveStatusSuggestion(sdb, 'c1', new Date('2026-10-26T12:00:00Z')).status, null);
  sdb.company_radar_reports.push({ company_id: 'c1', status: 'approved', kind: 'applications', text: 'Applications open', created_at: '2026-10-20T10:00:00Z', confirmed_by: [] });
  check('suggestion: applications → Open', driveStatusSuggestion(sdb, 'c1', new Date('2026-10-26T12:00:00Z')).status, 'Open');
  sdb.company_radar_reports.push({ company_id: 'c1', status: 'approved', kind: 'results', text: 'Results out', created_at: '2026-10-24T10:00:00Z', confirmed_by: [] });
  check('suggestion: newest results → Closed', driveStatusSuggestion(sdb, 'c1', new Date('2026-10-26T12:00:00Z')).status, 'Closed');
  sdb.company_radar_reports.push({ company_id: 'c1', status: 'pending', kind: 'applications', text: 'x', created_at: '2026-10-25T10:00:00Z', confirmed_by: [] });
  check('suggestion: pending reports ignored', driveStatusSuggestion(sdb, 'c1', new Date('2026-10-26T12:00:00Z')).status, 'Closed');

  const companies = [{ id: 'c1', slug: 'acme', name: 'Acme', status: 'published', modules: [1, 2, 3, 4].map((n) => ({ id: `m${n}`, is_premium: true })) }];
  check('catalog: ladder without cap', buildPricingCatalog(companies).companies[0].pack_price, 249);
  const capped = buildPricingCatalog(companies, [], [], false, () => 99).companies[0];
  check('catalog: cap matches checkout', [capped.pack_price, capped.savings, capped.savings_percent], [99, 297, 75]);
}

console.log(`company-page: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
