/**
 * A 3T company page derived from data the company already has.
 *
 * The redesigned page (Company Page Studio) used to be opt-in: until an admin
 * wrote and published one, a company kept the old vault layout. This builds the
 * same page from the company record instead, so every company gets the new
 * layout on day one and an admin's Studio page simply replaces it.
 *
 * The rule that shapes every line below: derive, never invent.
 *  - A figure is shown only if the company record has it, and is stamped
 *    "Verified" only when `metric_sources` carries a source for it; everything
 *    else says "Being verified".
 *  - Rounds come from `rounds_pipeline` when it exists. Otherwise they are
 *    inferred from which kinds of modules the company has, and each such round
 *    says its pattern is being verified.
 *  - Skill tests are linked only if that slug exists on this install.
 *  - Sections that need facts nobody has entered (eligibility, role compare,
 *    countdown weights, FAQ, onboarding) are left out rather than filled with
 *    template prose. The Studio templates are for admins to edit; this page is
 *    shown to students as-is.
 *
 * The result goes through `sanitizeContent`, so it is exactly the shape a
 * published page has and every section renderer and student endpoint (Track,
 * radar, daily practice) works on it unchanged.
 */
import { CompanyPageDoc, PageContent, PageSection, SectionType, findPage, newId, sanitizeContent } from './companyPage';
import { PREP_COMPANIES } from './prep';

type RoundKey = 'OA' | 'Technical' | 'SystemDesign' | 'HR';

const ROUND_ORDER: RoundKey[] = ['OA', 'Technical', 'SystemDesign', 'HR'];

const ROUND_LABEL: Record<RoundKey, { title: string; short: string }> = {
  OA: { title: 'Online assessment', short: 'OA' },
  Technical: { title: 'Technical interview', short: 'Technical' },
  SystemDesign: { title: 'System design', short: 'Design' },
  HR: { title: 'HR interview', short: 'HR' },
};

/** Candidate skill tests per round, in order of relevance; filtered to slugs that exist. */
const ROUND_SKILLS: Record<RoundKey, string[]> = {
  OA: ['dsa', 'quantitative-aptitude', 'logical-reasoning'],
  Technical: ['dsa', 'dbms', 'oop', 'operating-systems', 'computer-networks'],
  SystemDesign: ['system-design'],
  HR: ['business-communication', 'verbal-ability'],
};

const MODULE_TYPE_ROUND: Record<string, RoundKey> = {
  dsa_question: 'OA',
  technical_question: 'Technical',
  system_design: 'SystemDesign',
  hr_question: 'HR',
};

/** Whole-word round names, for the rare module with neither a round nor a type. */
const ROUND_TITLE_RE: Record<RoundKey, RegExp> = {
  OA: /\b(OA|online assessment|coding round)\b/i,
  Technical: /\btechnical\b/i,
  SystemDesign: /\bsystem design\b/i,
  HR: /\b(HR|behaviou?ral|managerial)\b/i,
};

const asRound = (v: unknown): RoundKey | null => (ROUND_ORDER as string[]).includes(String(v)) ? (v as RoundKey) : null;

/** Which round a module belongs to: its own `round_type`, else what its type implies. */
export function moduleRound(m: any): RoundKey | null {
  return asRound(m?.round_type) ?? MODULE_TYPE_ROUND[String(m?.module_type)] ?? null;
}

function sec(type: SectionType, data: Record<string, unknown>): PageSection {
  return { id: newId('s'), type, visible: true, data };
}

/** "Round 2: Technical R1" -> "Technical R1". */
const stripRoundPrefix = (title: string) => title.replace(/^\s*round\s*\d+\s*[:\-–]\s*/i, '').trim();

function stat(label: string, value: string, source: any) {
  const verified = source && source.source && source.verified_at;
  return {
    label,
    value,
    stamp: value ? (verified ? 'verified' : 'being_verified') : 'being_verified',
    source_url: verified && /^https?:\/\//.test(source.source) ? source.source : '',
    verified_at: verified ? String(source.verified_at).slice(0, 10) : '',
  };
}

const MONTH_YEAR = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });
const TEST_TYPE_LABEL = {
  mcq: 'MCQ test',
  coding: 'Coding test',
  pseudocode: 'Pseudocode MCQ',
  written: 'Written / essay',
  audio: 'Speaking (audio)',
  video_interview: 'Recorded video interview',
  live_interview: 'Live interview',
  group_discussion: 'Group discussion',
} as const;

export function derivePageContent(db: any, company: any): PageContent {
  const modules: any[] = Array.isArray(company.modules) ? company.modules : [];
  const pipeline: any[] = Array.isArray(company.rounds_pipeline) ? company.rounds_pipeline : [];
  const sources = company.metric_sources || {};
  const skillSlugs = new Set<string>(
    (Array.isArray(db.skills) ? db.skills : []).filter((s: any) => s?.status === 'active').map((s: any) => s.slug)
  );
  const skillsFor = (r: RoundKey | null) => (r ? ROUND_SKILLS[r].filter((x) => skillSlugs.has(x)).slice(0, 3) : []);
  // `raw`: the pipeline's own round type, for rounds outside the four keys (TCS "Coding", "Managerial").
  // A module filed under such a round belongs to that round only (TCS Managerial is not HR).
  const ownRounds = new Set(pipeline.map((p: any) => String(p.round_type || '')).filter((x: string) => x && !asRound(x)));
  const modulesFor = (r: RoundKey | null, raw?: string) =>
    modules
      .filter((m) => {
        const mRaw = String(m.round_type || '');
        if (ownRounds.has(mRaw)) return !r && raw === mRaw;
        const mr = moduleRound(m);
        if (r && mr === r) return true;
        // Last resort for a module with no type at all: its own title names the round.
        return !mr && !!r && ROUND_TITLE_RE[r].test(String(m.title || ''));
      })
      .map((m) => m.id);

  // ---- rounds: the recorded pipeline, else inferred from module types
  type Station = { key: RoundKey | null; title: string; short: string; note: string; train: string; step?: any };
  let stations: Station[];
  if (pipeline.length > 0) {
    stations = [...pipeline]
      .sort((a, b) => (a.step_number ?? 0) - (b.step_number ?? 0))
      .map((p) => {
        const key = asRound(p.round_type);
        return {
          key,
          title: stripRoundPrefix(String(p.title || (key ? ROUND_LABEL[key].title : 'Round'))).slice(0, 44),
          short: (key ? ROUND_LABEL[key].short : String(p.round_type || '')).slice(0, 18),
          note: p.pattern_checked_at ? `Pattern last checked ${MONTH_YEAR.format(new Date(p.pattern_checked_at))}` : 'Pattern being verified',
          train: p.subtitle ? `Focus: ${String(p.subtitle)}.` : '',
          step: p,
        };
      });
  } else {
    const present = new Set(modules.map(moduleRound).filter(Boolean) as RoundKey[]);
    stations = ROUND_ORDER.filter((r) => present.has(r)).map((key) => ({
      key,
      title: ROUND_LABEL[key].title,
      short: ROUND_LABEL[key].short,
      note: 'Round pattern being verified',
      train: '',
    }));
  }

  // A company mock (scripts/importCompanyTest.ts) replaces the generic skill test
  // on the first MCQ-style round: that is the online assessment it mirrors.
  const companyMock = (Array.isArray(db.skills) ? db.skills : []).find((s: any) => s?.company_slug === company.slug && s?.status === 'active' && s?.prep_role !== 'sectional');
  let mockUsed = false;
  const roundStations = stations.map((st) => {
    const skills = skillsFor(st.key);
    const p = st.step || {};
    const useMock = !!companyMock && !mockUsed && ['mcq', 'pseudocode'].includes(p.test_type);
    // A mock that ends with a coding section (TCS Part B) is also the test for the coding round.
    const mockCoding = !useMock && !!companyMock?.has_coding && p.test_type === 'coding';
    // Interview rounds are practised in the mock interview, not a quiz.
    const interview = !useMock && ['live_interview', 'video_interview'].includes(p.test_type);
    if (useMock) mockUsed = true;
    // One pattern row ("MCQ test · 90 Qs · 90 min") when the admin set a test type.
    const pattern = p.test_type
      ? [{
          id: 'p1',
          name: TEST_TYPE_LABEL[p.test_type as keyof typeof TEST_TYPE_LABEL] || String(p.test_type),
          questions: typeof p.question_count === 'number' ? p.question_count : null,
          minutes: typeof p.duration_minutes === 'number' ? p.duration_minutes : null,
        }]
      : [];
    const topics: string[] = Array.isArray(p.train_topics) ? p.train_topics : [];
    return {
      title: st.title,
      short_label: st.short,
      status_note: st.note,
      eliminatory: typeof p.elimination === 'boolean' ? (p.elimination ? 'yes' : 'no') : 'unknown',
      pattern,
      topics,
      test_type: p.test_type || null,
      weight: typeof p.weight === 'number' ? p.weight : null,
      train_text: topics.length ? `${topics.join(', ')}.` : st.train || 'Questions from this round, with worked answers.',
      module_ids: modulesFor(st.key, p.round_type ? String(p.round_type) : undefined),
      test_text: useMock
        ? `The full ${companyMock.name} in the real pattern, ${companyMock.totalQuestions} questions${companyMock.has_coding ? ' plus the coding round' : ''} in ${companyMock.avgCompletionTime} minutes. Timed, in secure mode.`
        : mockCoding ? `The ${companyMock.name} ends with this round: the coding problems, timed, after the MCQ sections.`
        : interview ? 'Practise answering out loud in a mock interview, then compare with the model answers above.'
        : skills.length ? 'A free skill test on this round’s topics. Timed, in secure mode.' : '',
      test_label: useMock || mockCoding ? 'Start the full mock' : interview ? 'Start a mock interview' : skills.length ? 'Take the skill test' : '',
      test_href: useMock || mockCoding ? `/practice/test/${companyMock.slug}` : interview ? '/mock-interview' : skills.length ? `/skill-test/${skills[0]}` : '',
      skill_slugs: skills,
      track_text: mockCoding ? 'After the mock, mark each problem solved, partly solved or not solved. Your coding score shows here.' : useMock ? 'Take the mock to see your weakest sections here.' : interview ? 'Answer quality over attempts, from your mock interviews.' : skills.length ? 'Take the skill test to see your weakest topics here.' : '',
      tip: '',
    };
  });

  // ---- figures
  const stats: Array<Record<string, unknown>> = [];
  if (company.ctc_min != null && company.ctc_max != null) stats.push(stat('Package', `₹${company.ctc_min}–${company.ctc_max} LPA`, sources.ctc));
  if (company.avg_process_days != null) stats.push(stat('Selection process', `${company.avg_process_days} days`, sources.process_days));
  if (stations.length > 0) stats.push(stat('Rounds', String(stations.length), sources.rounds));
  if (Number(company.difficulty_rating) > 0) stats.push(stat('Difficulty', `${company.difficulty_rating} / 5`, sources.difficulty));

  const free = modules.filter((m) => m.is_premium !== true);
  const premium = modules.filter((m) => m.is_premium === true);
  const firstSkill = roundStations.find((r) => r.test_href)?.test_href || '';

  const sections: PageSection[] = [
    sec('hero', {
      eyebrow: company.industry ? String(company.industry) : '',
      title: '{company} placement prep',
      intro: company.tagline ? String(company.tagline) : '',
      subtitle: '',
      show_chips: true,
      next_step_label: PREP_COMPANIES[company.slug] ? 'Your prep plan' : 'Your next step',
      next_step_text: PREP_COMPANIES[company.slug]
        ? 'A day-by-day plan to your test date, your readiness score and what to fix next.'
        : free.length
        ? `Start with the free module: ${String(free[0].title)}.`
        : 'Pick a round below and start with its questions.',
      next_step_href: PREP_COMPANIES[company.slug] ? `/prep/${company.slug}` : '',
      card_eyebrow: PREP_COMPANIES[company.slug] && companyMock ? 'Step 1 · Free demo test' : firstSkill ? 'Test · Free' : '',
      // With a company mock, the hero card offers the real-pattern test itself.
      card_title: companyMock ? 'How ready are you for {company}?' : firstSkill ? 'Check your level for {company}' : '',
      card_meta: companyMock ? `${companyMock.totalQuestions} questions · ${companyMock.avgCompletionTime} minutes · the real pattern, timed` : '',
      card_cta_label: PREP_COMPANIES[company.slug] && companyMock ? 'Take the free demo test' : companyMock ? 'Start the full mock' : firstSkill ? 'Take a free skill test' : '',
      card_cta_href: firstSkill,
      card_note: '',
    }),
  ];
  if (stats.length) sections.push(sec('stat_strip', { stats }));
  sections.push(sec('section_nav', { eyebrow: 'Your {company} loop' }));
  if (roundStations.length) {
    sections.push(
      sec('rounds_route', {
        eyebrow: 'The route to the offer',
        title: 'Every round. Train, test and track each one.',
        intro: 'Pick a round: read its questions, take a skill test on its topics, and see what to fix next.',
        pass_mark: 70,
        stations: roundStations,
      })
    );
  }
  // ---- Plan: the countdown splits days across rounds by their readiness weight
  const testable = (pipeline.length ? pipeline : []).filter((p: any) => p.test_type && p.test_type !== 'live_interview');
  // Only for programs with an imported profile: the plan needs a real round list.
  if (company.profile && roundStations.length) {
    sections.push(
      sec('countdown', {
        title: 'When is your test? We’ll split the days for you.',
        date_label: 'Your {company} test date',
        default_days: 14,
        mock_every_days: 4,
        final_day_label: 'Revise weak topics, rest',
        plan_blocks: (testable.length ? testable : pipeline.length ? pipeline : roundStations).map((r: any) => ({
          focus: String(r.title || 'Practice'),
          weight: typeof r.weight === 'number' && r.weight > 0 ? r.weight : 1,
        })),
      })
    );
  }

  // ---- program profile (2026–27 import): eligibility, roles, facts students ask about
  const prof = company.profile || null;
  if (prof) {
    const el = prof.eligibility || {};
    const rows = [
      ['Degree and branches', el.degrees],
      ['Eligible batches', el.batches],
      ['Academic cut-off', el.cutoff],
      ['Backlogs', el.backlogs],
      ['Education gap', el.gap],
    ].map(([label, value], i) => ({ id: `el${i}`, label, value: value || '', check: false }));
    sections.push(
      sec('eligibility_apply', {
        title: 'Can you apply, and how?',
        eligibility_title: 'Eligibility',
        rows,
        apply_title: 'How to apply',
        // The owner's own steps when the profile has them; else the generic four.
        steps: Array.isArray(prof.apply_steps) && prof.apply_steps.length
          ? prof.apply_steps.slice(0, 6).map((x: any, i: number) => ({ id: `ap${i + 1}`, title: x.title, body: x.body || '', link_label: x.link_label || '', link_href: x.link_href || '' }))
          : [
          { id: 'ap1', title: 'Register', body: company.careers_link ? 'On the official careers page, or through your college placement cell.' : 'Through your college placement cell or the official listing.', link_label: company.careers_link ? 'Official careers page' : '', link_href: company.careers_link || '' },
          { id: 'ap2', title: 'Get your test invite', body: 'Check your email, including spam.', link_label: '', link_href: '' },
          { id: 'ap3', title: 'Clear the rounds', body: roundStations.map((r) => r.title).join(', ') + '.', link_label: '', link_href: '' },
          { id: 'ap4', title: 'Offer and onboarding', body: prof.training ? String(prof.training) : 'Read the offer letter before you accept.', link_label: '', link_href: '' },
          ],
        last_confirmed: String((pipeline[0]?.pattern_checked_at) || company.fact_checked_at || '').slice(0, 10),
        source_label: prof.source || '',
        source_url: '',
      })
    );
    const roles: any[] = Array.isArray(prof.roles) ? prof.roles.slice(0, 3) : [];
    if (roles.length > 1) {
      sections.push(
        sec('role_compare', {
          title: 'Which role should you aim for?',
          picker_label: 'Aim for',
          roles: roles.map((r, i) => ({ id: `r${i}`, title: r.title, short: r.title, ctc: r.ctc || '', stamp: company.fact_checked_at && sources.ctc ? 'verified' : 'being_verified' })),
          rows: [{ id: 'rw1', attribute: 'What gets you there', role_1: 'Clear the standard rounds', role_2: prof.higher_package || '', role_3: roles[2] ? prof.higher_package || '' : '' }],
        })
      );
    }
    const faq = [
      prof.higher_package && ['What decides the higher package?', prof.higher_package],
      prof.bond && ['Is there a bond or service agreement?', prof.bond],
      prof.training && ['What training happens after joining?', prof.training],
      prof.hiring_window && ['When does hiring happen?', prof.hiring_window],
      ...(Array.isArray(prof.faq) ? prof.faq.map((x: any) => [x.q, x.a]) : []),
      prof.note && ['How reliable is this information?', `${prof.note} Always confirm in the official notice and your offer letter.`],
    ].filter(Boolean) as string[][];
    // The owner's notes (e.g. "two NQTs", the drive timeline, the 90-day plan) as text blocks.
    for (const n of Array.isArray(prof.page_notes) ? prof.page_notes : []) {
      if (n?.title && n?.body) sections.push(sec('rich_text', { title: String(n.title), tone: n.tone || 'plain', body: String(n.body) }));
    }
    if (faq.length) sections.push(sec('faq', { title: 'Questions students ask', items: faq.map(([q, a], i) => ({ id: `fq${i}`, q, a })) }));
  }

  if (premium.length) {
    const prep = PREP_COMPANIES[company.slug];
    const prepLessons = prep ? ((modules.find((m: any) => m.id === prep.lessonModule)?.items) || []).length : 0;
    const prepSectional = prep ? (db.skills || []).filter((x: any) => x.company_slug === company.slug && x.prep_role === 'sectional' && x.status === 'active').length : 0;
    sections.push(
      sec('prep_pack', {
        eyebrow: 'Prep pack',
        title: 'Start free. Go deeper when you’re ready.',
        free_title: 'Free',
        free_price_label: '₹0',
        // With a company mock, Free and Pack spell out the 3T split (plan §3, §8).
        // Prep companies (INFOSYS_SE_3T_UX_PLAN §2a): the plain free/pack split with real counts.
        free_features: prep && companyMock
          ? ['1 full demo test (real pattern) with section scores', 'First lesson of every section, with practice', 'Your day-by-day plan and readiness score', '3 sample answers per interview round']
          : companyMock
          ? [`1 full ${companyMock.name} (real pattern)`, 'Readiness check and basic Track score', 'Round-by-round plan and daily countdown', '3 sample answers per interview round', ...free.map((m) => String(m.title).slice(0, 60))].slice(0, 8)
          : free.map((m) => String(m.title).slice(0, 60)).slice(0, 8),
        free_cta_label: free.length ? 'Read free' : '',
        free_cta_href: '',
        paid_title: '{company} Pack',
        paid_badge: '',
        paid_price_note: 'one-time · lifetime access',
        paid_features: prep && companyMock
          ? [`All ${prepLessons} topic lessons with worked examples and practice`, `${prepSectional} section tests, unlimited retakes`, 'Unlimited full mocks, fresh questions every attempt', 'Weak-area fix list and revision tests', ...premium.map((m) => `${String(m.title).replace(/:.*/, '')}: ${(m.items || []).length} model answers`)].slice(0, 8)
          : companyMock
          ? ['Everything in Free', 'Unlimited full mocks, fresh questions every attempt', ...premium.map((m) => `${String(m.title).slice(0, 48)} (${(m.items || []).length})`), 'Explanations and memory tricks for every question'].slice(0, 8)
          : ['Everything in Free', ...premium.map((m) => String(m.title).slice(0, 60))].slice(0, 8),
        paid_cta_label: 'Get the pack',
        preview_label: '',
        preview_href: '',
        refund_text: '',
        owned_text: 'Your pack is active. Every round is unlocked.',
      })
    );
  }
  // ---- Track after the drive: crowd radar, onboarding, comeback (profiled programs only)
  if (company.profile) sections.push(
    sec('drive_radar', { title: 'Drive Radar', min_confirmations: 3, updates: [] }),
    sec('onboarding', {
      eyebrow: 'Selected?',
      title: 'Track it to day one',
      steps: ['Offer letter received', 'Documents submitted', 'Background verification', 'Joining letter', 'Day one'].map((title, i) => ({ id: `ob${i + 1}`, title })),
    }),
    sec('comeback', {
      title: 'Didn’t clear this time?',
      body: 'Your Track results show which round to fix. Get a comeback plan and see which other drives are open now.',
      cta_label: 'Get my comeback plan',
      cta_href: `/company/${encodeURIComponent(company.slug)}#rounds`,
    })
  );
  sections.push(
    sec('community_offer', {
      title: 'Took the {company} process? Help the next batch.',
      body: 'Share your round-by-round experience. Once it is checked, it appears here for everyone preparing.',
      cta_label: 'Share my experience',
    }),
    sec('experiences', { eyebrow: 'From candidates', title: 'Interview experiences' })
  );
  const others = (db.companies || [])
    .filter((c: any) => c.id !== company.id && c.status === 'published' && c.slug)
    .sort((a: any, b: any) => Number(a.industry === company.industry ? 0 : 1) - Number(b.industry === company.industry ? 0 : 1))
    .slice(0, 3)
    .map((c: any) => c.slug);
  if (others.length) {
    sections.push(
      sec('also_preparing', {
        title: 'Compare with',
        intro: 'Rounds, pay and process side by side.',
        company_slugs: others,
        compare_label: 'Compare companies',
      })
    );
  }

  return sanitizeContent({
    schema_version: 1,
    settings: {
      accent: 'sky',
      hero_style: 'ink',
      seo_title: '{company} interview preparation: rounds and questions | TiEEdu',
      seo_description:
        'Round-by-round preparation for {company}: each round’s questions, a free skill test for its topics, and every figure marked as checked or being verified.',
      sticky_enabled: premium.length > 0,
      sticky_text: 'Get the full {company} prep pack',
      sticky_label: 'Get the pack',
      disclaimer: 'TiEEdu is not affiliated with {company}. Company names are used for identification only.',
    },
    sections,
  });
}

/**
 * The page a student sees for a company: the admin's published page when it is
 * on, nothing when an admin published one and switched it off (the old layout,
 * by choice), otherwise the derived page.
 *
 * Deliberately separate from `livePage`, which stays "admin-published only":
 * its callers set pack price caps, notify radar watchers and send streak
 * reminders, and none of that may be triggered by a page nobody wrote.
 */
export function studentPage(db: any, company: any): { page: PageContent; doc: CompanyPageDoc | null; derived: boolean } | null {
  const doc = findPage(db, company.id);
  if (doc?.published) return doc.enabled ? { page: doc.published, doc, derived: false } : null;
  return { page: derivePageContent(db, company), doc: null, derived: true };
}
