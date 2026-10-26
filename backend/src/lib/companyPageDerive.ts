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

export function derivePageContent(db: any, company: any): PageContent {
  const modules: any[] = Array.isArray(company.modules) ? company.modules : [];
  const pipeline: any[] = Array.isArray(company.rounds_pipeline) ? company.rounds_pipeline : [];
  const sources = company.metric_sources || {};
  const skillSlugs = new Set<string>(
    (Array.isArray(db.skills) ? db.skills : []).filter((s: any) => s?.status === 'active').map((s: any) => s.slug)
  );
  const skillsFor = (r: RoundKey | null) => (r ? ROUND_SKILLS[r].filter((x) => skillSlugs.has(x)).slice(0, 3) : []);
  const modulesFor = (r: RoundKey | null) =>
    modules
      .filter((m) => {
        const mr = moduleRound(m);
        if (r && mr === r) return true;
        // Last resort for a module with no type at all: its own title names the round.
        return !mr && !!r && ROUND_TITLE_RE[r].test(String(m.title || ''));
      })
      .map((m) => m.id);

  // ---- rounds: the recorded pipeline, else inferred from module types
  type Station = { key: RoundKey | null; title: string; short: string; note: string; train: string };
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
          note: 'Pattern being verified',
          train: p.subtitle ? `Focus: ${String(p.subtitle)}.` : '',
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

  const roundStations = stations.map((st) => {
    const skills = skillsFor(st.key);
    return {
      title: st.title,
      short_label: st.short,
      status_note: st.note,
      eliminatory: 'unknown',
      pattern: [],
      topics: [],
      train_text: st.train || 'Questions from this round, with worked answers.',
      module_ids: modulesFor(st.key),
      test_text: skills.length ? 'A free skill test on this round’s topics.' : '',
      test_label: skills.length ? 'Take the skill test' : '',
      test_href: skills.length ? `/skill-test/${skills[0]}` : '',
      skill_slugs: skills,
      track_text: skills.length ? 'Take the skill test to see your weakest topics here.' : '',
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
      intro: '',
      subtitle: '',
      show_chips: true,
      next_step_label: 'Your next step',
      next_step_text: free.length
        ? `Start with the free module: ${String(free[0].title)}.`
        : 'Pick a round below and start with its questions.',
      next_step_href: '',
      card_eyebrow: firstSkill ? 'Test · Free' : '',
      card_title: firstSkill ? 'Check your level for {company}' : '',
      card_meta: '',
      card_cta_label: firstSkill ? 'Take a free skill test' : '',
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
  if (premium.length) {
    sections.push(
      sec('prep_pack', {
        eyebrow: 'Prep pack',
        title: 'Start free. Go deeper when you’re ready.',
        free_title: 'Free',
        free_price_label: '₹0',
        free_features: free.map((m) => String(m.title).slice(0, 60)).slice(0, 8),
        free_cta_label: free.length ? 'Read free' : '',
        free_cta_href: '',
        paid_title: '{company} Pack',
        paid_badge: '',
        paid_price_note: 'one-time · lifetime access',
        paid_features: ['Everything in Free', ...premium.map((m) => String(m.title).slice(0, 60))].slice(0, 8),
        paid_cta_label: 'Get the pack',
        preview_label: '',
        preview_href: '',
        refund_text: '',
        owned_text: 'Your pack is active. Every round is unlocked.',
      })
    );
  }
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
      seo_title: '{company} interview preparation: rounds and questions | TieEdu',
      seo_description:
        'Round-by-round preparation for {company}: each round’s questions, a free skill test for its topics, and every figure marked as checked or being verified.',
      sticky_enabled: premium.length > 0,
      sticky_text: 'Get the full {company} prep pack',
      sticky_label: 'Get the pack',
      disclaimer: 'TieEdu is not affiliated with {company}. Company names are used for identification only.',
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
