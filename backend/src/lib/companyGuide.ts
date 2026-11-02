import { PREP_COMPANIES } from './prep';

/**
 * Company guide pages (SEO_GROWTH_PLAN §5.1 — the company "silo").
 *
 * Each published company gets focused pages for what students search:
 * exam pattern, syllabus, interview questions, HR interview, hiring process,
 * salary & eligibility, and the prep plan. Every sentence is filled from the
 * company's fact-checked record (profile, rounds pipeline, prep config,
 * modules) — nothing is invented. A topic with no data behind it is simply
 * not offered, so there are no thin or empty pages.
 *
 * Paid content stays paid: interview questions are listed, but model answers
 * are shown only for items marked as free previews.
 */
export const GUIDE_TOPICS = [
  'exam-pattern',
  'syllabus',
  'interview-questions',
  'hr-interview',
  'hiring-process',
  'salary-eligibility',
  'prep-plan',
] as const;
export type GuideTopic = (typeof GUIDE_TOPICS)[number];

export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { head: string[]; rows: string[][] };
}
export interface GuideQuestion {
  q: string;
  /** Markdown model answer — only for free-preview items. */
  answer: string | null;
  difficulty?: string;
}
export interface Guide {
  company: { name: string; slug: string; logo_url: string; tagline: string; careers_link: string | null };
  topic: GuideTopic;
  label: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  updated: string | null;
  source: string | null;
  sections: GuideSection[];
  questions: GuideQuestion[];
  locked_count: number;
  faq: Array<{ q: string; a: string }>;
  topics: Array<{ topic: GuideTopic; label: string }>;
  cta: { label: string; href: string };
}

const LABEL: Record<GuideTopic, string> = {
  'exam-pattern': 'Exam pattern',
  syllabus: 'Syllabus',
  'interview-questions': 'Interview questions',
  'hr-interview': 'HR interview',
  'hiring-process': 'Hiring process',
  'salary-eligibility': 'Salary & eligibility',
  'prep-plan': 'Prep plan',
};

const year = () => new Date().getUTCFullYear() + 1; // the batch students are preparing for
const roundsOf = (c: any): any[] => (Array.isArray(c.rounds_pipeline) ? c.rounds_pipeline : []);
const oaOf = (c: any) => roundsOf(c).find((r) => r.test_type === 'mcq' || /assessment|test/i.test(r.title || ''));
const moduleOf = (c: any, re: RegExp) => (c.modules || []).find((m: any) => re.test(`${m.id} ${m.title}`));
const plain = (s: unknown) => String(s ?? '').trim();

/** Full name for headings: "TCS — NQT" → "TCS NQT". */
const titleName = (c: any) => plain(c.name).replace(/\s*—\s*/g, ' ');
/**
 * What students type, for <title> (Google cuts titles near 60 characters):
 * "Infosys Systems Engineer (SE)" → "Infosys SE"; otherwise the full name.
 */
const shortName = (c: any) => {
  const n = titleName(c);
  const m = n.match(/^(\S+).*\(([A-Z]{2,6})\)\s*$/);
  return m ? `${m[1]} ${m[2]}` : n;
};

function sectionsFromLessons(c: any): Array<{ name: string; lessons: string[] }> {
  const oaMod = moduleOf(c, /oa|assessment/i);
  if (!oaMod) return [];
  const groups = new Map<string, string[]>();
  for (const it of oaMod.items || []) {
    const t = plain(it.question_text);
    const [head, ...rest] = t.split(':');
    const key = rest.length ? head.trim() : 'Other';
    const lesson = rest.length ? rest.join(':').trim() : t;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(lesson);
  }
  return [...groups.entries()].map(([name, lessons]) => ({ name, lessons }));
}

function questionsFrom(c: any, re: RegExp): { list: GuideQuestion[]; locked: number } {
  const mod = moduleOf(c, re);
  if (!mod) return { list: [], locked: 0 };
  const list: GuideQuestion[] = [];
  let locked = 0;
  for (const it of mod.items || []) {
    if (it.status && it.status !== 'published') continue;
    const md = (it.blocks || []).filter((b: any) => b.block_type === 'markdown').map((b: any) => plain(b.payload?.text)).join('\n\n');
    const free = !!it.is_free_preview;
    if (!free) locked += 1;
    list.push({ q: plain(it.question_text), answer: free && md ? md : null, difficulty: it.difficulty });
  }
  return { list, locked };
}

/** Which guide topics have real data behind them for this company. */
export function availableTopics(c: any): GuideTopic[] {
  const out: GuideTopic[] = [];
  const oa = oaOf(c);
  if (oa && (oa.question_count || PREP_COMPANIES[c.slug])) out.push('exam-pattern');
  if (sectionsFromLessons(c).length || (oa?.train_topics || []).length) out.push('syllabus');
  if (moduleOf(c, /tech/i)?.items?.length || roundsOf(c).some((r) => /tech/i.test(r.round_type || ''))) out.push('interview-questions');
  if (moduleOf(c, /\bhr\b|-hr/i)?.items?.length || roundsOf(c).some((r) => /hr/i.test(r.round_type || ''))) out.push('hr-interview');
  if (roundsOf(c).length) out.push('hiring-process');
  if (c.profile?.eligibility || c.ctc_min) out.push('salary-eligibility');
  if (PREP_COMPANIES[c.slug]) out.push('prep-plan');
  return out;
}

export function buildGuide(c: any, topic: GuideTopic): Guide | null {
  if (!c || c.status !== 'published' || !availableTopics(c).includes(topic)) return null;
  const name = titleName(c);
  const short = shortName(c);
  const p = c.profile || {};
  const elig = p.eligibility || {};
  const rounds = roundsOf(c);
  const oa = oaOf(c);
  const prep = PREP_COMPANIES[c.slug];
  const y = year();
  const ctc = c.ctc_min ? `₹${c.ctc_min}${c.ctc_max && c.ctc_max !== c.ctc_min ? `–${c.ctc_max}` : ''} LPA` : null;
  const checked = plain(c.fact_checked_at) || null;
  const base = {
    company: { name: c.name, slug: c.slug, logo_url: c.logo_url || '', tagline: plain(c.tagline), careers_link: c.careers_link || null },
    topic,
    label: LABEL[topic],
    updated: checked,
    source: plain(p.source) || null,
    questions: [] as GuideQuestion[],
    locked_count: 0,
    topics: availableTopics(c).map((t) => ({ topic: t, label: LABEL[t] })),
    cta: { label: `Start my ${shortName(c)} plan`, href: prep ? `/prep/${c.slug}` : `/company/${c.slug}` },
  };
  const roundLine = rounds.map((r) => r.title).join(' → ');

  switch (topic) {
    case 'exam-pattern': {
      const total = prep ? prep.sections.reduce((s, x) => s + x.weight, 0) : oa?.question_count;
      const rows = prep
        ? prep.sections.map((s) => [s.name, String(s.weight)])
        : (oa?.train_topics || []).map((t: string) => [t, '—']);
      const biggest = prep ? [...prep.sections].sort((a, b) => b.weight - a.weight)[0] : null;
      return {
        ...base,
        title: `${short} Exam Pattern ${y}: Sections, Questions & Time`,
        h1: `${name} exam pattern ${y}`,
        description: `${name} online test pattern: ${total ?? ''} questions${oa?.duration_minutes ? ` in ${oa.duration_minutes} minutes` : ''}, section-wise question count, and how the test decides who reaches the interview.`.replace(/\s+/g, ' '),
        intro: `The ${name} online assessment is the first and ${oa?.elimination ? 'eliminatory ' : ''}round: ${total ? `${total} questions` : 'a timed multiple-choice test'}${oa?.duration_minutes ? ` in ${oa.duration_minutes} minutes` : ''}. Here is how it is split, section by section.`,
        sections: [
          { heading: 'Section-wise pattern', table: { head: ['Section', 'Questions'], rows: total ? [...rows, ['Total', String(total)]] : rows } },
          {
            heading: 'At a glance',
            bullets: [
              total ? `Questions: ${total}` : '',
              oa?.duration_minutes ? `Time: ${oa.duration_minutes} minutes (about ${Math.round((oa.duration_minutes * 60) / (total || 1))} seconds a question on average)` : '',
              oa ? `Eliminatory: ${oa.elimination ? 'yes — clear it to reach the interviews' : 'not reported'}` : '',
              oa?.difficulty ? `Reported difficulty: ${oa.difficulty}` : '',
              oa?.pattern_checked_at ? `Pattern last checked: ${oa.pattern_checked_at}` : '',
            ].filter(Boolean),
          },
          ...(biggest
            ? [{ heading: 'Where the marks are', paragraphs: [`${biggest.name} is the largest section with ${biggest.weight} of ${total} questions, so it repays the most practice. Sections with few questions still count — one weak section can pull the whole score down.`] }]
            : []),
          ...(rounds.length > 1 ? [{ heading: 'What comes after the test', paragraphs: [`The full process is ${roundLine}. See the hiring process page for each round.`] }] : []),
        ],
        faq: [
          ...(total ? [{ q: `How many questions are in the ${name} online test?`, a: `${total} questions${oa?.duration_minutes ? ` in ${oa.duration_minutes} minutes` : ''}${prep ? `, across ${prep.sections.length} sections: ${prep.sections.map((s) => `${s.name} (${s.weight})`).join(', ')}` : ''}.` }] : []),
          ...(oa ? [{ q: `Is the ${name} online test eliminatory?`, a: oa.elimination ? 'Yes. Only candidates who clear it are called for the interviews.' : 'It has not been reported as eliminatory; check your drive notice.' }] : []),
        ],
      };
    }

    case 'syllabus': {
      const groups = sectionsFromLessons(c);
      return {
        ...base,
        title: `${short} Syllabus ${y}: Online Test & Interview Topics`,
        h1: `${name} syllabus ${y}`,
        description: `Topic-wise ${name} syllabus for the online test and interviews: ${groups.map((g) => g.name).join(', ') || (oa?.train_topics || []).join(', ')}.`,
        intro: `Every topic below is one we teach and test for ${name}. Work through them in this order and you have covered the online test${rounds.length > 1 ? ' and the interviews' : ''}.`,
        sections: [
          ...groups.map((g) => ({ heading: g.name === 'Math' ? 'Mathematical ability' : g.name === 'Email' ? 'Email writing' : g.name, bullets: g.lessons })),
          ...(!groups.length && oa?.train_topics?.length ? [{ heading: 'Online test topics', bullets: oa.train_topics }] : []),
          ...rounds
            .filter((r) => r.test_type === 'live_interview' && (r.train_topics || []).length)
            .map((r) => ({ heading: `${r.title} topics`, bullets: r.train_topics })),
        ],
        faq: [
          { q: `What is the syllabus for the ${name} online test?`, a: `${groups.map((g) => `${g.name}: ${g.lessons.slice(0, 3).join(', ')}${g.lessons.length > 3 ? '…' : ''}`).join(' · ') || (oa?.train_topics || []).join(', ')}.` },
        ],
      };
    }

    case 'interview-questions':
    case 'hr-interview': {
      const hr = topic === 'hr-interview';
      const { list, locked } = questionsFrom(c, hr ? /\bhr\b|-hr/i : /tech/i);
      const round = rounds.find((r) => (hr ? /hr/i : /tech/i).test(r.round_type || ''));
      const kind = hr ? 'HR interview' : 'technical interview';
      return {
        ...base,
        questions: list,
        locked_count: locked,
        title: `${short} ${hr ? 'HR Interview Questions' : 'Interview Questions'} ${y} with Answers`,
        h1: `${name} ${hr ? 'HR interview' : 'technical interview'} questions`,
        description: `${list.length ? `${list.length} ` : ''}${name} ${kind} questions asked to freshers${round?.train_topics?.length ? ` — ${round.train_topics.join(', ')}` : ''}, with what a good answer covers.`,
        intro: `${list.length ? `${list.length} questions` : 'Questions'} that come up in the ${name} ${kind}${round?.train_topics?.length ? `, covering ${round.train_topics.join(', ')}` : ''}. ${list.some((q) => q.answer) ? 'The first ones include a model answer; the full set of answers is in the interview pack.' : ''}`,
        sections: round?.train_topics?.length ? [{ heading: `What the ${kind} covers`, bullets: round.train_topics }] : [],
        faq: [
          { q: `What is asked in the ${name} ${kind}?`, a: round?.train_topics?.length ? `${round.train_topics.join(', ')}.${list[0] ? ` A typical opener: "${list[0].q}"` : ''}` : list.slice(0, 3).map((x) => x.q).join(' · ') },
        ],
      };
    }

    case 'hiring-process': {
      return {
        ...base,
        title: `${short} Hiring Process ${y}: All Rounds for Freshers`,
        h1: `${name} hiring process for freshers`,
        description: `${name} recruitment process: ${roundLine}. What happens in each round, how long it takes, and what to prepare.`,
        intro: `${name} hires freshers in ${rounds.length} round${rounds.length === 1 ? '' : 's'}: ${roundLine}.${p.hiring_window ? ` ${p.hiring_window}.` : ''}`,
        sections: [
          ...rounds.map((r, i) => ({
            heading: `Round ${i + 1}: ${r.title}`,
            bullets: [
              r.test_type === 'mcq' ? `Format: online multiple-choice test${r.question_count ? `, ${r.question_count} questions` : ''}${r.duration_minutes ? `, ${r.duration_minutes} minutes` : ''}` : r.test_type === 'live_interview' ? 'Format: live interview' : '',
              typeof r.elimination === 'boolean' ? `Eliminatory: ${r.elimination ? 'yes' : 'no'}` : '',
              (r.train_topics || []).length ? `Covers: ${r.train_topics.join(', ')}` : '',
            ].filter(Boolean),
          })),
          ...(p.training ? [{ heading: 'After selection', paragraphs: [`${p.training}.`, ...(p.bond ? [`Bond: ${p.bond}.`] : [])] }] : []),
          ...(p.higher_package ? [{ heading: 'Higher roles', paragraphs: [`${p.higher_package}.`] }] : []),
        ],
        faq: [
          { q: `How many rounds are there in the ${name} hiring process?`, a: `${rounds.length}: ${roundLine}.` },
          ...(p.hiring_window ? [{ q: `When does ${c.name.split(' ')[0]} hire freshers?`, a: `${p.hiring_window}.` }] : []),
        ],
      };
    }

    case 'salary-eligibility': {
      const roles: Array<{ title: string; ctc: string }> = Array.isArray(p.roles) ? p.roles : [];
      return {
        ...base,
        title: `${short} Salary & Eligibility ${y}: CTC, Cutoff, Gap`,
        h1: `${name} salary and eligibility`,
        description: `${name} fresher salary${ctc ? ` (${ctc})` : ''} and eligibility criteria: degrees, ${elig.cutoff ? `cutoff (${elig.cutoff}), ` : ''}backlogs and gap rules.`,
        intro: `${ctc ? `${name} pays freshers around ${ctc}. ` : ''}Here are the eligibility rules to check before you apply.`,
        sections: [
          ...(roles.length ? [{ heading: 'Salary for freshers', table: { head: ['Role', 'CTC'], rows: roles.map((r) => [r.title, r.ctc]) } }] : ctc ? [{ heading: 'Salary for freshers', paragraphs: [`Around ${ctc}.`] }] : []),
          {
            heading: 'Eligibility criteria',
            table: {
              head: ['Rule', 'Requirement'],
              rows: [
                ['Degrees', elig.degrees],
                ['Batches', elig.batches],
                ['Academic cutoff', elig.cutoff],
                ['Backlogs', elig.backlogs],
                ['Education gap', elig.gap],
              ].filter((r) => r[1]),
            },
          },
          ...(p.bond || p.training ? [{ heading: 'Bond and training', bullets: [p.bond ? `Bond: ${p.bond}` : '', p.training ? `Training: ${p.training}` : ''].filter(Boolean) }] : []),
          ...(p.note ? [{ heading: 'How sure we are', paragraphs: [`Confidence: ${p.confidence || 'medium'}. ${p.note} Always confirm with the official drive notice.`] }] : []),
        ],
        faq: [
          ...(ctc ? [{ q: `What is the ${name} salary for freshers?`, a: `Around ${ctc}${roles[0] ? ` for ${roles[0].title}` : ''}.` }] : []),
          ...(elig.cutoff ? [{ q: `What is the eligibility for ${name}?`, a: `${elig.cutoff}; ${elig.backlogs || 'check backlog rules'}; gap ${elig.gap || 'as per the drive notice'}.` }] : []),
        ],
      };
    }

    case 'prep-plan': {
      const total = prep!.sections.reduce((s, x) => s + x.weight, 0);
      const lessons = sectionsFromLessons(c).reduce((n, g) => n + g.lessons.length, 0);
      return {
        ...base,
        title: `How to Prepare for ${short}: ${prep!.defaultDays}-Day Plan`,
        h1: `How to prepare for ${name}`,
        description: `A ${prep!.defaultDays}-day ${name} preparation plan: what to study each day, sectional tests, and a readiness score that shows when you are ready.`,
        intro: `The TieEdu plan for ${name} splits your days by how many questions each section carries, tests you section by section, and tracks a readiness score — so you know what to fix before the test.`,
        sections: [
          {
            heading: 'Train · Test · Track',
            bullets: [
              `Train: ${lessons ? `${lessons} topic lessons` : 'topic lessons'} for the online test${rounds.some((r) => r.test_type === 'live_interview') ? ', plus interview question packs' : ''}.`,
              `Test: sectional tests for ${prep!.sections.map((s) => s.name).join(', ')} — unlimited retakes.`,
              'Track: a readiness score per section and your weakest area, updated after every test.',
            ],
          },
          {
            heading: 'How the days are split',
            table: {
              head: ['Section', 'Questions in the test', 'Share of your plan'],
              rows: prep!.sections.map((s) => [s.name, String(s.weight), `${Math.round((s.weight / total) * 100)}%`]),
            },
          },
          { heading: 'Set your test date', paragraphs: [`Tell the plan your test date and it re-splits the days for you. No date? It uses ${prep!.defaultDays} days.`] },
        ],
        faq: [
          { q: `How many days do I need to prepare for ${name}?`, a: `The plan defaults to ${prep!.defaultDays} days; set your test date and it adapts.` },
        ],
      };
    }
  }
  return null;
}

export const isGuideTopic = (t: unknown): t is GuideTopic => (GUIDE_TOPICS as readonly string[]).includes(String(t));
