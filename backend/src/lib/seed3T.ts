/**
 * 3T content seeding: the 2026-27 company profiles, company mock tests and
 * interview prep. Used by the CLI scripts (full upsert) and by the server on
 * start (onlyMissing: adds what is not in the database yet and never touches
 * anything that exists, so admin edits are safe).
 */
import crypto from 'crypto';
import { PROFILES } from '../data/companyProfiles2026';
import { INFOSYS_SE_BANK } from '../data/companyTests/infosysSE';
import { TECHNICAL, HR, type PrepItem } from '../data/interviewPrep/infosysSE';
import { LESSONS, type Lesson } from '../data/interviewPrep/infosysSELessons';
import { LESSON_EXTRAS } from '../data/interviewPrep/infosysSELessonExtras';
import fs from 'fs';
import path from 'path';
import { FEED_V3 } from '../data/feedV3';
import { FEED_V3_STORY, FEED_V3_QUIZ } from '../data/feedV3Content';
import { validateDropInput, DROP_FILE_RE } from './drops';
import { MPHASIS_BANK } from '../data/companyTests/mphasis';
import { MPHASIS_TECHNICAL, MPHASIS_HR } from '../data/interviewPrep/mphasis';
import { MPHASIS_LESSONS, MPHASIS_LESSON_EXTRAS } from '../data/interviewPrep/mphasisLessons';
import { WIPRO_IOS_BANK, WIPRO_IOS_LESSONS, WIPRO_IOS_LESSON_EXTRAS, WIPRO_IOS_SLUG } from '../data/wiproIOS';
import { CHEAT_SHEETS } from '../data/wiproIOS/cheatsheets';
import { TCS_NQT_BANK } from '../data/companyTests/tcsNqt';
import { TCS_NQT_CODING, CODING_PER_MOCK, CODING_MINUTES, CODING_MIN, type CodingProblem } from '../data/companyTests/tcsNqtCoding';
import { TCS_NQT_TECHNICAL, TCS_NQT_MANAGERIAL, TCS_NQT_HR } from '../data/interviewPrep/tcsNqt';
import { TCS_NQT_LESSONS, TCS_NQT_LESSON_EXTRAS } from '../data/interviewPrep/tcsNqtLessons';

export function seedCompanyProfiles(db: any, onlyMissing = false, only?: string[]): { created: number; updated: number } {
  const FACT_CHECKED = '2026-10-27';
  db.companies = Array.isArray(db.companies) ? db.companies : [];

  const nextId = () => {
    const n = db.companies.reduce((m: number, c: any) => Math.max(m, Number(String(c.id).replace(/\D/g, '')) || 0), 0);
    return `comp-${n + 1}`;
  };

  let created = 0;
  let updated = 0;
  for (const p of PROFILES) {
    if (only && !only.includes(p.slug)) continue;
    const rounds = p.rounds.map(([title, round_type, test_type, question_count, duration_minutes, elimination, train_topics], i) => ({
      step_number: i + 1,
      round_type,
      title,
      subtitle: '',
      difficulty: 'medium',
      module_count: 0,
      test_type,
      ...(question_count != null ? { question_count } : {}),
      ...(duration_minutes != null ? { duration_minutes } : {}),
      ...(elimination != null ? { elimination } : {}),
      ...(train_topics?.length ? { train_topics } : {}),
      pattern_checked_at: p.pattern_checked || (p.confidence === 'low' ? undefined : FACT_CHECKED),
    }));

    const fields = {
      slug: p.slug,
      name: p.name,
      company_group: p.company,
      logo_url: p.logo || '',
      industry: p.industry,
      tags: p.tags,
      tagline: p.tagline,
      about: p.about,
      hq: p.hq,
      founded_year: Number(p.founded) || null,
      employee_band: p.size,
      careers_link: p.careers,
      difficulty_rating: p.difficulty,
      avg_rounds: p.rounds.length,
      ctc_min: p.ctc ? p.ctc[0] : null,
      ctc_max: p.ctc ? p.ctc[1] : null,
      status: 'published',
      is_free: !!p.is_free,
      seo_title: p.seo[0],
      seo_description: p.seo[1],
      // Low-confidence profiles get no "checked" date, so the site says "Being verified".
      fact_checked_at: p.confidence === 'low' ? null : FACT_CHECKED,
      rounds_pipeline: rounds,
      // Checked figures carry their source, so the page stamps them "verified"
      // instead of "being verified". Low-confidence profiles get none.
      metric_sources: p.confidence === 'low'
        ? (p.pattern_checked ? { rounds: { source: "Owner's exam-pattern document", verified_at: p.pattern_checked } } : {})
        : {
        // Estimated pay is shown but never stamped verified.
        ...(p.ctc_estimate ? {} : { ctc: { source: 'Company profiles (prep sites, recent drives)', verified_at: FACT_CHECKED } }),
        rounds: p.pattern_checked
          ? { source: "Owner's exam-pattern document", verified_at: p.pattern_checked }
          : { source: 'Company profiles (recent drives)', verified_at: FACT_CHECKED },
        difficulty: { source: 'Editorial estimate', verified_at: FACT_CHECKED },
      },
      profile: {
        program_type: p.program_type,
        contest: !!p.contest,
        roles: p.roles.map(([title, ctc]) => ({ title, ctc })),
        eligibility: p.elig,
        higher_package: p.higher,
        bond: p.bond,
        training: p.training,
        hiring_window: p.window,
        confidence: p.confidence,
        note: p.note,
        source: 'Company profiles, fact-checked 27 Oct 2026',
        ...(p.oa_pattern ? { oa_pattern: p.oa_pattern.map(([section, questions, minutes, difficulty]) => ({ section, questions, minutes, difficulty })) } : {}),
        ...(p.syllabus ? { syllabus: p.syllabus.map(([section, topics]) => ({ section, topics })) } : {}),
        ...(p.apply_steps ? { apply_steps: p.apply_steps.map(([title, body, link_label, link_href]) => ({ title, body, link_label: link_label || '', link_href: link_href || '' })) } : {}),
        ...(p.page_notes ? { page_notes: p.page_notes } : {}),
        ...(p.faq ? { faq: p.faq.map(([q, a]) => ({ q, a })) } : {}),
      },
    };

    const existing = db.companies.find((c: any) => c.slug === p.slug);
    if (existing && onlyMissing) continue;
    if (existing) {
      Object.assign(existing, fields);
      updated++;
    } else {
      db.companies.push({ id: nextId(), unlock_count: 0, modules: [], ...fields });
      created++;
    }
  }
  return { created, updated };
}

interface Section { key: string; name: string; count: number; minutes: number }
interface WritingTask { prompt: string; model: string; tip: string }
interface Config {
  slug: string; name: string; company_slug: string; description: string; minutes: number; sections: Section[];
  /** Short name for sectional tests ("Wipro iOS · Milestone 1"); default: name without " Online Assessment". */
  short?: string;
  /**
   * Stable question ids and a bank hash: a live database picks up bank changes
   * on the next start, and old attempts keep their questions (removed ones are
   * retired, not deleted).
   */
  stable?: boolean;
  /** Optional, ungraded task shown after the last section (Infosys: an email, 120–150 words). */
  writing?: { title: string; words: [number, number]; tasks: WritingTask[] };
  /**
   * Coding section after the MCQ sections (TCS Part B): `count` problems from
   * the pool in `minutes`. No code runner: the student checks against the
   * samples and marks each problem. Added only once the pool has `min`.
   */
  coding?: { title: string; count: number; minutes: number; min: number; pool: CodingProblem[]; module: string };
}

const CONFIGS: Record<string, Config> = {
  'infosys-se': {
    slug: 'infosys-se-online-assessment',
    name: 'Infosys SE Online Assessment',
    company_slug: 'infosys-systems-engineer',
    description: 'Full Infosys Systems Engineer mock in the real pattern: Mathematical Ability 10, Reasoning 15, Verbal 20, Pseudocode 5, Puzzles 4. 54 questions in 100 minutes, timed, secure mode.',
    minutes: 100,
    sections: [
      { key: 'math', name: 'Mathematical Ability', count: 10, minutes: 35 },
      { key: 'reasoning', name: 'Reasoning Ability', count: 15, minutes: 25 },
      { key: 'verbal', name: 'Verbal Ability', count: 20, minutes: 20 },
      { key: 'pseudocode', name: 'Pseudocode', count: 5, minutes: 10 },
      { key: 'puzzle', name: 'Puzzle Solving', count: 4, minutes: 10 },
    ],
    writing: {
      title: 'Writing task (email)',
      words: [120, 150],
      tasks: [
        {
          prompt: 'Write an email to your professor requesting a one-week extension for submitting your project report, because you were ill for three days. Mention what you have already completed.',
          model: 'Subject: Request for Extension – Project Report\n\nDear Professor Mehta,\n\nI am writing to request a one-week extension for submitting my project report, which is due on Friday. I was unwell with a fever for three days this week and could not work on the report during that time.\n\nI have already completed the literature review and the system design, and I have started the testing chapter. With an extension until next Friday, I will be able to finish the testing and proofread the report carefully.\n\nI can share my medical certificate if you need it. Thank you for considering my request.\n\nYours sincerely,\nRahul Sharma\nRoll No. 21CS045',
          tip: 'S-G-P-D-C: Subject line, Greeting, Purpose in the first sentence, Details (reason + what is done), Close with thanks.',
        },
        {
          prompt: 'Write an email to the HR manager of a company accepting a job offer and confirming your joining date of 1 July. Ask what documents you should bring.',
          model: 'Subject: Acceptance of Offer – Systems Engineer\n\nDear Ms. Iyer,\n\nThank you for offering me the position of Systems Engineer. I am delighted to accept the offer and look forward to contributing to your team.\n\nI confirm that I will join on 1 July at your Pune office. Could you please let me know which original documents and certificates I should bring on the first day, and whether there is anything I should complete before joining?\n\nThank you once again for this opportunity.\n\nWarm regards,\nAnanya Rao',
          tip: 'A-C-Q: Accept first, confirm the date second, ask your question third. Keep each idea in its own short paragraph.',
        },
      ],
    },
  },
};


CONFIGS.mphasis = {
  slug: 'mphasis-online-assessment',
  name: 'Mphasis Online Assessment',
  company_slug: 'mphasis-freshers',
  description: 'Full Mphasis mock in the reported pattern: Quantitative Aptitude 20, Logical Reasoning 20, Verbal English 20, Computer Programming 15. 75 questions in 115 minutes, timed, secure mode. (The SVAR spoken-English test and the optional coding round are practised separately.)',
  minutes: 115,
  sections: [
    { key: 'quant', name: 'Quantitative Aptitude', count: 20, minutes: 35 },
    { key: 'reasoning', name: 'Logical Reasoning', count: 20, minutes: 35 },
    { key: 'verbal', name: 'Verbal English', count: 20, minutes: 25 },
    { key: 'programming', name: 'Computer Programming', count: 15, minutes: 20 },
  ],
};

CONFIGS['wipro-ios'] = {
  slug: 'wipro-ios-full-course-mock',
  name: 'Wipro iOS Full Course Mock',
  short: 'Wipro iOS',
  company_slug: WIPRO_IOS_SLUG,
  description: 'Full course mock for the Wipro iOS developer training: one timed section per milestone (Swift foundations 20, Architecture & concurrency 10, Networking & UIKit 10, SwiftUI & project setup 12, Testing & Instruments 8). 60 questions in 75 minutes, secure mode, fresh questions every attempt. Free.',
  minutes: 75,
  stable: true,
  sections: [
    { key: 'm1', name: 'Milestone 1 · Swift foundations', count: 20, minutes: 25 },
    { key: 'm2', name: 'Milestone 2 · Architecture & concurrency', count: 10, minutes: 12 },
    { key: 'm3', name: 'Milestone 3 · Networking & UIKit', count: 10, minutes: 12 },
    { key: 'm4', name: 'Milestone 4 · SwiftUI & project setup', count: 12, minutes: 15 },
    { key: 'final', name: 'Final · Testing & Instruments', count: 8, minutes: 11 },
  ],
};

// TCS NQT (owner's 2027 guide, 2026-11-10): Part A Foundation + Part B Advanced MCQs, then Part B coding.
CONFIGS['tcs-nqt'] = {
  slug: 'tcs-nqt-full-mock',
  name: 'TCS NQT Full Mock',
  short: 'TCS NQT',
  company_slug: 'tcs-nqt',
  description: 'Full TCS NQT mock in the reported 2026 pattern. Part A (Foundation): Numerical 20, Verbal 25, Reasoning 20, 25 minutes each. Part B (Advanced): Advanced Quant & Reasoning 15 in 25 minutes, then 2 coding problems in 90 minutes. 190 minutes, timed, secure mode.',
  minutes: 100,
  stable: true,
  sections: [
    { key: 'numerical', name: 'Part A · Numerical Ability', count: 20, minutes: 25 },
    { key: 'verbal', name: 'Part A · Verbal Ability', count: 25, minutes: 25 },
    { key: 'reasoning', name: 'Part A · Reasoning Ability', count: 20, minutes: 25 },
    { key: 'advanced', name: 'Part B · Advanced Quant & Reasoning', count: 15, minutes: 25 },
  ],
  coding: { title: 'Part B · Advanced Coding', count: CODING_PER_MOCK, minutes: CODING_MINUTES, min: CODING_MIN, pool: TCS_NQT_CODING, module: 'mod-prep-tcs-nqt-coding' },
};

const BANKS: Record<string, any[]> = { 'infosys-se': INFOSYS_SE_BANK, mphasis: MPHASIS_BANK, 'wipro-ios': WIPRO_IOS_BANK, 'tcs-nqt': TCS_NQT_BANK };

/**
 * What the test page gets for the coding section: statements and samples only.
 * Hints and model solutions stay in the Train module (pack content).
 */
export function codingSectionOf(cfg: Config): Record<string, unknown> | null {
  const c = cfg.coding;
  if (!c || c.pool.length < c.min) return null;
  return {
    title: c.title, count: c.count, minutes: c.minutes,
    problems: c.pool.map((p) => ({
      id: p.id, title: p.title, difficulty: p.difficulty, topic: p.topic, statement: p.statement,
      input_format: p.input_format, output_format: p.output_format, constraints: p.constraints, samples: p.samples,
      solution_href: `/company/${cfg.company_slug}?m=${c.module}&q=${c.module}-${p.id}`,
    })),
  };
}

const md5 = (x: string) => crypto.createHash('md5').update(x).digest('hex').slice(0, 12);
const bankHash = (bank: any[]) => md5(JSON.stringify(bank));

/**
 * Stable mode: one id per question text, updated in place; questions no longer
 * in the bank are retired so old attempts can still be reviewed.
 */
function writeStableQuestions(db: any, skill: any, rows: Array<{ q: any; topicId: string }>, tags: (q: any) => string[], now: string) {
  const keep = new Set<string>();
  for (const { q, topicId } of rows) {
    const id = `qst-${skill.slug}-${md5(q.question)}`;
    keep.add(id);
    // fill: the accepted answers are the (hidden) options; order: the items in the right order.
    const type = q.kind === 'fill' ? 'fill_blank' : q.kind === 'order' ? 'ordering' : 'single_choice';
    const options = q.kind === 'fill' ? (q.answers || []).map((text: string) => ({ text, isCorrect: true }))
      : q.kind === 'order' ? (q.items || []).map((text: string) => ({ text, isCorrect: false }))
        : q.options.map((text: string, i: number) => ({ text, isCorrect: i === q.correct }));
    const fields = {
      skillId: skill.id, topicId, type, difficulty: q.difficulty, question: q.question, options,
      explanation: q.explanation, hint: q.trick || null, tags: tags(q), status: 'approved', code: !!q.code, updated_at: now,
    };
    const old = db.questions.find((x: any) => x.id === id);
    if (old) Object.assign(old, fields);
    else db.questions.push({ id, ...fields, version: 1, usageCount: 0, correctCount: 0, difficultyScore: 0, created_at: now });
  }
  for (const x of db.questions) if (x.skillId === skill.id && !keep.has(x.id) && x.status === 'approved') x.status = 'retired';
}

/** A test is only created once its bank can fill every section — never a half-empty paper. */
const bankFills = (bank: any[], sections: Array<{ key: string; count: number }>) =>
  sections.every((s) => bank.filter((q) => q.topic === s.key).length >= s.count);
export const COMPANY_TESTS = Object.keys(CONFIGS);

export function seedCompanyTest(db: any, key: string, onlyMissing = false): number {
  const cfg = CONFIGS[key];
  if (!cfg) throw new Error(`Unknown test "${key}". Known: ${Object.keys(CONFIGS).join(', ')}`);
  const bank: any[] = BANKS[key];
  if (!bankFills(bank, cfg.sections)) return 0;

  const id = (p: string) => `${p}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  for (const k of ['skills', 'topics', 'questions', 'assessments']) db[k] = Array.isArray(db[k]) ? db[k] : [];

  let skill = db.skills.find((s: any) => s.slug === cfg.slug);
  // The coding pool is part of the hash, so new problems reach a live database on the next start.
  const hash = cfg.stable ? bankHash(cfg.coding ? [bank, cfg.coding.pool] : bank) : undefined;
  const coding = codingSectionOf(cfg);
  if (skill && onlyMissing && (!cfg.stable || skill.bank_hash === hash)) return 0;
  if (!skill) {
    skill = { id: id('skl'), slug: cfg.slug, created_at: now };
    db.skills.push(skill);
  }
  if (hash) skill.bank_hash = hash;
  Object.assign(skill, {
    name: cfg.name, category: 'Company mocks', description: cfg.description, shortDescription: `${cfg.name} mock`,
    status: 'active', isPopular: true, certificateAvailable: false, displayOrder: 0,
    tags: ['company', key, cfg.company_slug], totalQuestions: cfg.sections.reduce((n, s) => n + s.count, 0),
    avgCompletionTime: cfg.minutes + (coding ? cfg.coding!.minutes : 0), company_slug: cfg.company_slug, prep_role: 'full',
    has_coding: !!coding, updated_at: now,
  });

  const topicId: Record<string, string> = {};
  cfg.sections.forEach((s, i) => {
    let t = db.topics.find((x: any) => x.skillId === skill.id && x.slug === s.key);
    if (!t) { t = { id: id('top'), skillId: skill.id, slug: s.key, created_at: now }; db.topics.push(t); }
    Object.assign(t, { name: `${s.name} (${s.count} Qs · ${s.minutes} min)`, displayOrder: i + 1, isActive: true, updated_at: now });
    topicId[s.key] = t.id;
  });

  if (cfg.stable) {
    writeStableQuestions(db, skill, bank.filter((q) => topicId[q.topic]).map((q) => ({ q, topicId: topicId[q.topic] })), (q) => [key, q.topic, q.source], now);
  } else db.questions = db.questions.filter((q: any) => q.skillId !== skill.id);
  for (const q of cfg.stable ? [] : bank) {
    if (!topicId[q.topic]) continue;
    db.questions.push({
      id: id('qst'), skillId: skill.id, topicId: topicId[q.topic], type: 'single_choice', difficulty: q.difficulty,
      question: q.question, options: q.options.map((text: string, i: number) => ({ text, isCorrect: i === q.correct })),
      explanation: q.explanation, tags: [key, q.topic, q.source], status: 'approved', version: 1,
      usageCount: 0, correctCount: 0, difficultyScore: 0, created_at: now, updated_at: now,
    });
  }

  let asm = db.assessments.find((a: any) => a.skillId === skill.id && a.isDefault);
  if (!asm) { asm = { id: id('asm'), skillId: skill.id, created_at: now }; db.assessments.push(asm); }
  Object.assign(asm, {
    title: cfg.name, description: cfg.description, durationMinutes: cfg.minutes + (coding ? cfg.coding!.minutes : 0),
    totalQuestions: cfg.sections.reduce((n, s) => n + s.count, 0), passingScore: 60,
    topicBlueprint: cfg.sections.map((s) => ({ topicId: topicId[s.key], questionCount: s.count })),
    // Sectional mode: the test page runs one timer per section, in this order, with no going back.
    sections: cfg.sections.map((s) => ({ topicId: topicId[s.key], name: s.name, count: s.count, minutes: s.minutes })),
    writing: cfg.writing || null,
    coding,
    // Section counts decide the paper; no extra difficulty fill on top.
    difficultyBlueprint: { beginner: 0, intermediate: 0, advanced: 0, expert: 0 },
    certificateThresholds: { pass: 60, proficient: 75, advanced: 85, expert: 90 },
    isActive: true, isDefault: true, allowRetake: true, maxRetakes: 50,
    // Section order matters (it is the real paper's order), so questions are not shuffled across sections.
    shuffleQuestions: false, shuffleOptions: true, showExplanationAfterSubmit: true,
    requireFullScreen: true, tabSwitchLimit: 3,
    instructions: [
      `${cfg.sections.map((s) => `${s.name}: ${s.count}`).join(' · ')}${coding ? ` · ${cfg.coding!.title}: ${cfg.coding!.count} problems` : ''}`,
      'Timed and in secure mode: stay in fullscreen; leaving the test 3 times submits it.',
      'Every attempt draws a fresh set of questions from the bank.',
    ],
    updated_at: now,
  });
  return db.questions.filter((q: any) => q.skillId === skill.id).length;
}

// Lessons become items too: title as the question, notes as the answer block.
const lessonAsItem = ([section, title, rules, example, trap]: Lesson): PrepItem =>
  [`${section}: ${title}`, 'medium', 'high', rules, example, trap];

/**
 * The lesson reader's structured lesson (INFOSYS_SE_3T_UX_PLAN §3): what it is,
 * rules, worked examples, trap, and 5 practice questions from the Infosys bank
 * matching the topic (3 to 5, on-topic first).
 */
interface LessonExtraPlus { what: string; examples: string[]; match: RegExp; doc?: { label: string; url: string }; task?: string; module?: number }
interface LessonSource { lessons: Lesson[]; extras: Record<string, LessonExtraPlus>; bank: Array<typeof INFOSYS_SE_BANK[number] & { lesson?: string }>; topic: Record<string, string>; /** Module number → cheat sheet shown in each of its lessons. */ cheats?: Record<number, unknown>; /** Most practice questions per lesson (default 5). */ max?: number }

const INFOSYS_LESSONS: LessonSource = {
  lessons: LESSONS, extras: LESSON_EXTRAS, bank: INFOSYS_SE_BANK,
  topic: { Math: 'math', Reasoning: 'reasoning', Verbal: 'verbal', Pseudocode: 'pseudocode', Puzzles: 'puzzle', Email: 'verbal' },
};
const MPHASIS_LESSON_SOURCE: LessonSource = {
  lessons: MPHASIS_LESSONS, extras: MPHASIS_LESSON_EXTRAS, bank: MPHASIS_BANK,
  topic: { Quant: 'quant', Reasoning: 'reasoning', Verbal: 'verbal', Programming: 'programming', Coding: 'programming', SVAR: 'verbal' },
};

const TCS_NQT_LESSON_SOURCE: LessonSource = {
  lessons: TCS_NQT_LESSONS, extras: TCS_NQT_LESSON_EXTRAS, bank: TCS_NQT_BANK,
  topic: { Numerical: 'numerical', Verbal: 'verbal', Reasoning: 'reasoning', Advanced: 'advanced', Coding: 'coding' },
};

const WIPRO_IOS_LESSON_SOURCE: LessonSource = {
  lessons: WIPRO_IOS_LESSONS, extras: WIPRO_IOS_LESSON_EXTRAS, bank: WIPRO_IOS_BANK,
  topic: { M1: 'm1', M2: 'm2', M3: 'm3', M4: 'm4', Final: 'final' },
  cheats: CHEAT_SHEETS,
  // Every question tagged to a lesson is practised there (owner: the guess papers must be covered in Train).
  max: 20,
};

function structuredLessons(src: LessonSource) {
  const used = new Set<number>();
  const { topic } = src;
  return src.lessons.map(([section, title, rules, example, trap]) => {
    const x = src.extras[title];
    // Topic match first (an unused one, then one another lesson also uses), then any unused question of the section.
    const all = src.bank.map((q, i) => ({ q, i })).filter(({ q }) => q.topic === topic[section]);
    // Questions tagged with a lesson belong to that lesson only; untagged ones are matched by pattern.
    const hit = ({ q }: { q: LessonSource['bank'][number] }) => (q.lesson ? q.lesson === title : !!x?.match.test(q.question));
    const order = [
      ...all.filter((e) => hit(e) && !used.has(e.i)), ...all.filter((e) => hit(e) && used.has(e.i)),
      ...all.filter((e) => !hit(e) && !used.has(e.i)), ...all.filter((e) => !hit(e) && used.has(e.i)),
    ];
    // Up to 5 on-topic questions; when the bank has fewer, fill to 3 with the section's others (never pad to 5 with off-topic ones).
    const hits = all.filter(hit).length;
    const pick = section === 'Email' || section === 'SVAR' ? [] : order.slice(0, Math.min(src.max ?? 5, Math.max(3, hits)));
    pick.forEach(({ i }) => used.add(i));
    return {
      section, title, what: x?.what || '', rules, examples: [example, ...(x?.examples || [])], trap,
      ...(x?.doc ? { doc: x.doc } : {}), ...(x?.task ? { task: x.task } : {}), ...(x?.module ? { module: x.module } : {}),
      ...(x?.module && src.cheats?.[x.module] ? { cheat: src.cheats[x.module] } : {}),
      practice: pick.map(({ q }) => {
        const x = q as typeof q & { kind?: string; answers?: string[]; items?: string[]; trick?: string };
        return {
          question: q.code ? q.question : q.question.replace(/\s*\n\s*/g, ' '), options: q.options, correct: q.correct, explanation: q.explanation, code: q.code,
          ...(x.kind && x.kind !== 'mcq' ? { kind: x.kind, answers: x.answers, items: x.items } : {}),
          ...(x.trick ? { trick: x.trick } : {}),
        };
      }),
    };
  });
}

/** Bump when the lesson set changes: older copies on a live database are replaced on the next start. */
const LESSON_VERSION = 3;

/** Free sets: every item readable, nothing in the pack. hash: content hash that replaces LESSON_VERSION for this set. */
const WIPRO_IOS_HASH = md5(JSON.stringify([WIPRO_IOS_LESSONS, WIPRO_IOS_LESSON_EXTRAS, WIPRO_IOS_BANK, CHEAT_SHEETS]));

const LANG: Array<[keyof CodingProblem['solutions'], string]> = [['c', 'C'], ['cpp', 'C++'], ['java', 'Java'], ['python', 'Python']];
const FENCE = '`'.repeat(3);

/** One coding problem as a reader item: title line first (all a locked item keeps), then statement, samples, hints, approach, solutions. */
export function codingMarkdown(p: CodingProblem): string {
  const block = (x: string, lang = '') => `${FENCE}${lang}\n${x.replace(/\s+$/, '')}\n${FENCE}`;
  return [
    `**${p.title}** · ${p.topic} · ${p.difficulty} · [Solve it in the code editor](/code/${p.id})`,
    p.statement,
    `**Input format**\n\n${p.input_format}`,
    `**Output format**\n\n${p.output_format}`,
    p.constraints.length ? `**Constraints**\n${p.constraints.map((c) => `- ${c}`).join('\n')}` : '',
    ...p.samples.map((x, i) => `**Sample ${i + 1}**\n\nInput\n\n${block(x.input)}\n\nOutput\n\n${block(x.output)}${x.explain ? `\n\n${x.explain}` : ''}`),
    p.hints.length ? `**Hints**\n${p.hints.map((h, i) => `${i + 1}. ${h}`).join('\n')}` : '',
    `**Approach**\n\n${p.approach}\n\n**Complexity:** ${p.complexity}`,
    ...LANG.filter(([k]) => p.solutions[k]).map(([k, label]) => `**Solution · ${label}**\n\n${block(p.solutions[k]!, k)}`),
  ].filter(Boolean).join('\n\n');
}
const codingAsItem = (p: CodingProblem): PrepItem => [`Coding: ${p.title}`, p.difficulty, 'high', [p.topic], '', ''];

const SETS: Array<{
  slug: string; id: string; type: string; round: string; title: string; order: number; items: PrepItem[]; lesson?: LessonSource; role: string; free?: boolean; hash?: string;
  /** Item markdown that replaces the generated one; itemIds: stable item ids; gated: pack-gated but outside the price ladder. */
  markdown?: string[]; itemIds?: string[]; gated?: boolean;
}> = [
  { slug: 'infosys-systems-engineer', id: 'mod-prep-infosys-se-oa', type: 'preparation_guide', round: 'OA', title: 'Online assessment: topic lessons', order: 1, items: LESSONS.map(lessonAsItem), lesson: INFOSYS_LESSONS, role: 'Systems Engineer' },
  { slug: 'infosys-systems-engineer', id: 'mod-prep-infosys-se-tech', type: 'technical_question', round: 'Technical', title: 'Technical interview: questions and model answers', order: 2, items: TECHNICAL, role: 'Systems Engineer' },
  { slug: 'infosys-systems-engineer', id: 'mod-prep-infosys-se-hr', type: 'hr_question', round: 'HR', title: 'HR interview: questions and model answers', order: 3, items: HR, role: 'Systems Engineer' },
  // Mphasis: empty until the owner's content lands; sets with no items are skipped.
  { slug: 'mphasis-freshers', id: 'mod-prep-mphasis-oa', type: 'preparation_guide', round: 'OA', title: 'Online assessment: topic lessons', order: 1, items: MPHASIS_LESSONS.map(lessonAsItem), lesson: MPHASIS_LESSON_SOURCE, role: 'Software Engineer' },
  { slug: 'mphasis-freshers', id: 'mod-prep-mphasis-tech', type: 'technical_question', round: 'Technical', title: 'Technical interview: questions and model answers', order: 2, items: MPHASIS_TECHNICAL, role: 'Software Engineer' },
  { slug: 'mphasis-freshers', id: 'mod-prep-mphasis-hr', type: 'hr_question', round: 'HR', title: 'HR interview: questions and model answers', order: 3, items: MPHASIS_HR, role: 'Software Engineer' },
  // TCS NQT (owner, 2026-11-10): empty until the owner's content lands; sets with no items are skipped.
  // Coding problems are pack-gated like lessons (outside the price ladder); the 3 interview rounds are the paid modules.
  { slug: 'tcs-nqt', id: 'mod-prep-tcs-nqt-oa', type: 'preparation_guide', round: 'OA', title: 'NQT Parts A and B: topic lessons', order: 1, items: TCS_NQT_LESSONS.map(lessonAsItem), lesson: TCS_NQT_LESSON_SOURCE, role: 'Ninja / Digital / Prime' },
  { slug: 'tcs-nqt', id: 'mod-prep-tcs-nqt-coding', type: 'dsa_question', round: 'Coding', title: 'Coding round: problems and solutions', order: 2, items: TCS_NQT_CODING.map(codingAsItem), markdown: TCS_NQT_CODING.map(codingMarkdown), itemIds: TCS_NQT_CODING.map((p) => p.id), gated: true, hash: md5(JSON.stringify(TCS_NQT_CODING.map(codingMarkdown))), role: 'Digital / Prime' },
  { slug: 'tcs-nqt', id: 'mod-prep-tcs-nqt-tech', type: 'technical_question', round: 'Technical', title: 'Technical interview: questions and model answers', order: 3, items: TCS_NQT_TECHNICAL, role: 'Ninja / Digital / Prime' },
  { slug: 'tcs-nqt', id: 'mod-prep-tcs-nqt-managerial', type: 'hr_question', round: 'Managerial', title: 'Managerial interview: questions and model answers', order: 4, items: TCS_NQT_MANAGERIAL, role: 'Ninja / Digital / Prime' },
  { slug: 'tcs-nqt', id: 'mod-prep-tcs-nqt-hr', type: 'hr_question', round: 'HR', title: 'HR interview: questions and model answers', order: 5, items: TCS_NQT_HR, role: 'Ninja / Digital / Prime' },
  // Wipro iOS (owner, 2026-11-04): free program, every lesson open.
  { slug: WIPRO_IOS_SLUG, id: 'mod-prep-wipro-ios-lessons', type: 'preparation_guide', round: 'OA', title: 'iOS training: topic lessons', order: 1, items: WIPRO_IOS_LESSONS.map(lessonAsItem), lesson: WIPRO_IOS_LESSON_SOURCE, role: 'iOS Developer', free: true, hash: WIPRO_IOS_HASH },
];

const FREE_PREVIEW = 3;

const md = ([, , , covers, sample, follow]: PrepItem, lesson = false) => lesson
  ? `**Key rules**\n${covers.map((c) => `- ${c}`).join('\n')}\n\n**Worked example**\n\n> ${sample}\n\n**Common trap:** ${follow}`
  : `**What a good answer covers**\n${covers.map((c) => `- ${c}`).join('\n')}\n\n**Sample answer**\n\n> ${sample}\n\n**Follow-up to expect:** ${follow}`;

export function seedInterviewPrep(db: any, onlyMissing = false): number {
  let added = 0;
  for (const set of SETS) {
    if (!set.items.length) continue;
    const company = (db.companies || []).find((c: any) => c.slug === set.slug);
    if (!company) continue;
    company.modules = Array.isArray(company.modules) ? company.modules : [];
    const existing = company.modules.find((m: any) => m.id === set.id);
    const current = set.hash ? existing?.content_hash === set.hash : (!set.lesson || (existing?.content_version || 1) >= LESSON_VERSION);
    if (onlyMissing && existing && current) continue;
    const rich = set.lesson ? structuredLessons(set.lesson) : [];
    const firstOfSection = new Set(rich.map((l, i) => (rich.findIndex((r) => r.section === l.section) === i ? i : -1)).filter((i) => i >= 0));
    const module = {
      id: set.id, company_id: company.id, module_type: set.type, round_type: set.round, title: set.title,
      // Topic lessons are free (design: Free = topic notes); interview answers are in the pack, first FREE_PREVIEW readable.
      // Lessons stay out of the price ladder (is_premium false) but are pack-gated: the first lesson of each section is free.
      sort_order: set.order, is_premium: !set.free && !set.lesson && !set.gated, pack_gated: !set.free && (!!set.lesson || !!set.gated),
      content_version: set.lesson && !set.hash ? LESSON_VERSION : undefined, content_hash: set.hash,
      items: set.items.map((it, i) => ({
        // Hash-versioned sets key items by title, so a lesson inserted mid-list keeps every student's "done" ticks.
        id: set.itemIds ? `${set.id}-${set.itemIds[i]}` : set.hash ? `${set.id}-${md5(it[0])}` : `${set.id}-${i + 1}`, module_id: set.id, question_text: it[0],
        is_free_preview: set.free || (set.lesson ? firstOfSection.has(i) : i < FREE_PREVIEW), lesson: set.lesson ? rich[i] : undefined,
        difficulty: it[1], role_tag: set.role, frequency_tag: it[2], round_type: set.round, status: 'published',
        comments_count: 0, upvotes_count: 0,
        blocks: [{ id: `${set.id}-${i + 1}-b1`, block_type: 'markdown', block_order: 1, payload: { text: set.markdown?.[i] ?? md(it, !!set.lesson) } }],
      })),
    };
    const at = company.modules.findIndex((m: any) => m.id === set.id);
    if (at >= 0) company.modules[at] = module; else company.modules.push(module);
    added++;
    company.module_count = company.modules.length;
  }
  return added;
}

/** Courses without a cover get the generated one (routes/covers.routes.ts). Uploaded covers are kept. */
export function seedCourseCovers(db: any): number {
  let n = 0;
  for (const c of db.courses || []) {
    if (!c.thumbnail_url && c.slug) { c.thumbnail_url = `/api/covers/course/${c.slug}.svg`; n++; }
  }
  return n;
}

/**
 * Feed v3, once per database (owner request, 2026-11-06: "remove all the
 * seeded drops"). Every earlier drop is deleted — together with its views,
 * saves, events, per-drop mutes and uploaded files — and the FEED_V3 set is
 * written in its place. Each row goes through `validateDropInput`, the same
 * gate the admin form uses, so a seeded card can never be one a human could
 * not have created.
 *
 * Publish times are spread over the last few days (and a couple scheduled
 * ahead) so the feed reads newest-first and today's publish quota stays free
 * for the admin.
 */
export function seedFeedV3(db: any, nowMs = Date.now()): number {
  if (db.feed_v3_seeded) return 0;
  const uploads = path.join(__dirname, '../../uploads/drops');
  for (const d of Array.isArray(db.drops) ? db.drops : []) {
    for (const name of [d?.image_stored_name, d?.video_stored_name, d?.audio_stored_name]) {
      if (typeof name === 'string' && DROP_FILE_RE.test(name)) fs.rm(path.join(uploads, name), { force: true }, () => {});
    }
  }
  db.drops = [];
  db.drop_views = [];
  db.drop_bookmarks = [];
  db.drop_events = [];
  db.drop_mutes = (Array.isArray(db.drop_mutes) ? db.drop_mutes : []).filter((m: any) => m && m.kind !== 'drop');

  const iso = (ms: number) => new Date(ms).toISOString();
  const stamp = iso(nowMs);
  FEED_V3.forEach((spec, i) => {
    const id = `drop-v3-${String(i + 1).padStart(2, '0')}`;
    const story = FEED_V3_STORY[id];
    const publishMs = nowMs + spec.at * 86_400_000;
    const scheduled = spec.at > 0;
    const checked = validateDropInput({
      type: spec.type,
      headline: spec.headline,
      bullets: spec.bullets,
      cta_route: spec.route,
      target_slug: spec.route.startsWith('/company/') ? spec.route.split('/')[2].split('#')[0] : undefined,
      body_md: story?.body || spec.body,
      facts: (story?.facts || []).map(([label, value]) => ({ label, value })),
      source_name: story?.source_name,
      source_url: story?.source_url,
      deadline_at: spec.deadline,
      expires_at: spec.expires,
      publish_at: iso(publishMs),
      status: scheduled ? 'scheduled' : 'published',
      pinned: !!spec.pinned,
      priority: spec.priority || 0,
      tags: ['feed-v3', ...(spec.tags || [])],
      art: spec.art,
      art_text: spec.text,
      art_sub: spec.sub,
      motion: spec.motion,
      effect: spec.effect,
      text_anim: spec.text_anim,
      sound: spec.sound,
      image_alt: spec.headline,
    });
    if (!checked.ok) {
      console.warn(`[seedFeedV3] skipped "${spec.headline}": ${checked.error}`);
      return;
    }
    db.drops.push({
      ...checked.value,
      id,
      audience: {},
      stats: { views: 0, unique_viewers: 0, cta_clicks: 0, shares: 0, saves: 0, dwell_ms_total: 0 },
      author_id: 'system',
      source: { kind: 'manual' },
      created_at: stamp,
      updated_at: stamp,
    });
  });
  addFeedV3Quizzes(db, nowMs);
  db.feed_v3_seeded = stamp;
  db.feed_v3_1 = stamp;
  return db.drops.length;
}

/** The 12 practice-quiz drops; skips any id that already exists. */
function addFeedV3Quizzes(db: any, nowMs: number): number {
  if (!Array.isArray(db.drops)) db.drops = [];
  const have = new Set(db.drops.map((d: any) => d.id));
  const stamp = new Date(nowMs).toISOString();
  let added = 0;
  for (const q of FEED_V3_QUIZ) {
    if (have.has(q.id)) continue;
    const checked = validateDropInput({
      type: 'quiz',
      headline: q.headline,
      bullets: [],
      cta_route: q.route,
      cta_label: 'Practise more',
      status: 'published',
      publish_at: new Date(nowMs + q.at * 86_400_000).toISOString(),
      priority: 0,
      tags: ['feed-v3', 'quiz', q.topic.toLowerCase()],
      art: q.art,
      art_text: 'QUIZ',
      art_sub: `Practice · ${q.topic}`,
      motion: 'kenburns',
      effect: 'none',
      text_anim: 'pop',
      sound: 'pop',
      quiz: q.quiz,
      image_alt: q.headline,
    });
    if (!checked.ok) {
      console.warn(`[seedFeedV3] skipped quiz "${q.headline}": ${checked.error}`);
      continue;
    }
    db.drops.push({
      ...checked.value,
      id: q.id,
      audience: {},
      stats: { views: 0, unique_viewers: 0, cta_clicks: 0, shares: 0, saves: 0, dwell_ms_total: 0 },
      author_id: 'system',
      source: { kind: 'manual' },
      created_at: stamp,
      updated_at: stamp,
    });
    added += 1;
  }
  return added;
}

/**
 * Feed v3.1, once per database that already ran v3: fill the story page
 * (article, key facts, official link) on seeded drops the admin has not
 * edited, and add the quiz drops. An edited drop (updated_at moved) is left
 * exactly as the admin saved it.
 */
export function upgradeFeedV3_1(db: any, nowMs = Date.now()): number {
  if (!db.feed_v3_seeded || db.feed_v3_1) return 0;
  let changed = 0;
  for (const d of Array.isArray(db.drops) ? db.drops : []) {
    const story = FEED_V3_STORY[d?.id];
    if (!story || d.updated_at !== d.created_at) continue;
    d.body_md = d.body_md || story.body;
    d.facts = story.facts ? story.facts.map(([label, value]) => ({ label, value })) : [];
    if (story.source_name) d.source_name = story.source_name;
    if (story.source_url) d.source_url = story.source_url;
    changed += 1;
  }
  changed += addFeedV3Quizzes(db, nowMs);
  db.feed_v3_1 = new Date(nowMs).toISOString();
  return changed;
}

/**
 * Sectional tests for a company mock: one short test per section, drawn from
 * that section's questions in the full mock's bank. Pack owners take them as
 * often as they like; they feed the prep hub's section scores.
 */
const SECTIONAL: Record<string, Array<{ key: string; name: string; count: number; minutes: number }>> = {
  'infosys-se': [
    { key: 'math', name: 'Mathematical Ability', count: 10, minutes: 15 },
    { key: 'reasoning', name: 'Reasoning Ability', count: 10, minutes: 12 },
    { key: 'verbal', name: 'Verbal Ability', count: 10, minutes: 10 },
    { key: 'pseudocode', name: 'Pseudocode', count: 5, minutes: 10 },
    { key: 'puzzle', name: 'Puzzle Solving', count: 4, minutes: 10 },
  ],
  mphasis: [
    { key: 'quant', name: 'Quantitative Aptitude', count: 10, minutes: 15 },
    { key: 'reasoning', name: 'Logical Reasoning', count: 10, minutes: 15 },
    { key: 'verbal', name: 'Verbal English', count: 10, minutes: 10 },
    { key: 'programming', name: 'Computer Programming', count: 8, minutes: 10 },
  ],
  'tcs-nqt': [
    { key: 'numerical', name: 'Numerical Ability', count: 10, minutes: 13 },
    { key: 'verbal', name: 'Verbal Ability', count: 10, minutes: 10 },
    { key: 'reasoning', name: 'Reasoning Ability', count: 10, minutes: 13 },
    { key: 'advanced', name: 'Advanced Quant & Reasoning', count: 8, minutes: 14 },
  ],
  // Milestone tests: the M1 test is the 15 Nov mock (40 of 118 questions, fresh draw every attempt).
  'wipro-ios': [
    { key: 'm1', name: 'Milestone 1 · Swift foundations', count: 40, minutes: 50 },
    { key: 'm2', name: 'Milestone 2 · Architecture & concurrency', count: 25, minutes: 30 },
    { key: 'm3', name: 'Milestone 3 · Networking & UIKit', count: 25, minutes: 30 },
    { key: 'm4', name: 'Milestone 4 · SwiftUI & project setup', count: 25, minutes: 30 },
    { key: 'final', name: 'Final · Testing & Instruments', count: 15, minutes: 20 },
  ],
};

export function seedSectionalTests(db: any, key: string, onlyMissing = false): number {
  const cfg = CONFIGS[key];
  const bank = BANKS[key];
  const now = new Date().toISOString();
  const mk = (p: string) => `${p}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  let made = 0;
  for (const sec of SECTIONAL[key] || []) {
    if (!bankFills(bank, [sec])) continue;
    const slug = `${cfg.slug}-${sec.key}`;
    let skill = db.skills.find((s: any) => s.slug === slug);
    const secBank = bank.filter((x: any) => x.topic === sec.key);
    const hash = cfg.stable ? bankHash(secBank) : undefined;
    if (skill && onlyMissing && (!cfg.stable || skill.bank_hash === hash)) continue;
    if (!skill) { skill = { id: mk('skl'), slug, created_at: now }; db.skills.push(skill); }
    if (hash) skill.bank_hash = hash;
    Object.assign(skill, {
      name: `${cfg.short || cfg.name.replace(' Online Assessment', '')} · ${sec.name}`, category: 'Company mocks',
      description: `${sec.name} sectional test for ${cfg.name}: ${sec.count} questions in ${sec.minutes} minutes.`,
      shortDescription: `${sec.name} test`, status: 'active', isPopular: false, certificateAvailable: false, displayOrder: 0,
      tags: ['company', key, cfg.company_slug, 'sectional'], totalQuestions: sec.count, avgCompletionTime: sec.minutes,
      company_slug: cfg.company_slug, prep_role: 'sectional', section_key: sec.key, updated_at: now,
    });
    let t = db.topics.find((x: any) => x.skillId === skill.id && x.slug === sec.key);
    if (!t) { t = { id: mk('top'), skillId: skill.id, slug: sec.key, created_at: now }; db.topics.push(t); }
    Object.assign(t, { name: sec.name, displayOrder: 1, isActive: true, updated_at: now });
    if (cfg.stable) writeStableQuestions(db, skill, secBank.map((q: any) => ({ q, topicId: t.id })), (q) => [key, q.topic, q.source, 'sectional'], now);
    else db.questions = db.questions.filter((q: any) => q.skillId !== skill.id);
    for (const q of cfg.stable ? [] : secBank) {
      db.questions.push({
        id: mk('qst'), skillId: skill.id, topicId: t.id, type: 'single_choice', difficulty: q.difficulty,
        question: q.question, options: q.options.map((text: string, i: number) => ({ text, isCorrect: i === q.correct })),
        explanation: q.explanation, tags: [key, q.topic, q.source, 'sectional'], status: 'approved', version: 1,
        usageCount: 0, correctCount: 0, difficultyScore: 0, created_at: now, updated_at: now,
      });
    }
    let asm = db.assessments.find((a: any) => a.skillId === skill.id && a.isDefault);
    if (!asm) { asm = { id: mk('asm'), skillId: skill.id, created_at: now }; db.assessments.push(asm); }
    Object.assign(asm, {
      title: skill.name, description: skill.description, durationMinutes: sec.minutes, totalQuestions: sec.count, passingScore: 60,
      topicBlueprint: [{ topicId: t.id, questionCount: sec.count }], difficultyBlueprint: { beginner: 0, intermediate: 0, advanced: 0, expert: 0 },
      certificateThresholds: { pass: 60, proficient: 75, advanced: 85, expert: 90 }, isActive: true, isDefault: true,
      allowRetake: true, maxRetakes: 500, freeAttempts: 0, shuffleQuestions: true, shuffleOptions: true, showExplanationAfterSubmit: true,
      requireFullScreen: true, tabSwitchLimit: 3, instructions: [`${sec.count} questions · ${sec.minutes} minutes`, 'Secure mode: stay in fullscreen.'], updated_at: now,
    });
    made++;
  }
  return made;
}

/** Focus (owner, 2026-11-01): only these programs are public for now; the rest become drafts once (restorable in Admin). */
const FOCUS = ['infosys-systems-engineer', 'tcs-nqt', 'accenture', 'wipro-elite-nth', 'cognizant-genc', 'mphasis-freshers', WIPRO_IOS_SLUG];
export function applyCompanyFocus(db: any): number {
  if (db.company_focus_applied) return 0;
  let n = 0;
  for (const c of db.companies || []) if (!FOCUS.includes(c.slug) && c.status === 'published') { c.status = 'draft'; n++; }
  db.company_focus_applied = new Date().toISOString();
  return n;
}

/**
 * Focus fix, once per database: the 5 focus programs are published, and the
 * main focus company gets its full profile even if an older record with the
 * same slug existed (an earlier admin-made "Infosys" draft blocked it on prod).
 */
export function ensureFocusLive(db: any): number {
  if (db.company_focus_v2) return 0;
  seedCompanyProfiles(db, false, ['infosys-systems-engineer']);
  let n = 0;
  for (const c of db.companies || []) if (FOCUS.includes(c.slug) && c.status !== 'published') { c.status = 'published'; n++; }
  db.company_focus_v2 = new Date().toISOString();
  return n + 1;
}

/**
 * Mphasis (owner, 2026-11-02): rewrite the profile once from the owner's
 * exam-pattern document and publish it. An older copy on a live database was
 * a draft from the focus cut, so nothing an admin made is lost.
 */
export function ensureMphasisV1(db: any): number {
  if (db.company_mphasis_v1) return 0;
  seedCompanyProfiles(db, false, ['mphasis-freshers']);
  db.company_mphasis_v1 = new Date().toISOString();
  return 1;
}

/**
 * TCS NQT (owner, 2026-11-10): rewrite the profile once from the owner's 2027
 * guide (pattern, eligibility, apply steps, timeline). Modules on the record
 * are kept, and later admin edits are not touched again.
 */
export function ensureTcsNqtV1(db: any): number {
  if (db.company_tcs_nqt_v1) return 0;
  seedCompanyProfiles(db, false, ['tcs-nqt']);
  db.company_tcs_nqt_v1 = new Date().toISOString();
  return 1;
}

/**
 * Wipro iOS (owner, 2026-11-04): publish the program once with its full
 * profile, even if an older record with the slug exists.
 */
export function ensureWiproIOSV1(db: any): number {
  // v2: course compressed to end on the 15 Nov Wipro test (profile text changed).
  if (db.company_wipro_ios_v2) return 0;
  seedCompanyProfiles(db, false, [WIPRO_IOS_SLUG]);
  db.company_wipro_ios_v1 = db.company_wipro_ios_v1 || new Date().toISOString();
  db.company_wipro_ios_v2 = new Date().toISOString();
  return 1;
}

/** Server start: add any missing 3T content. Returns true when something was added. */
export function seedMissing3T(db: any): boolean {
  const covers = seedCourseCovers(db) + seedFeedV3(db) + upgradeFeedV3_1(db);
  const p = seedCompanyProfiles(db, true);
  const wipro = ensureWiproIOSV1(db);
  const t0 = COMPANY_TESTS.reduce((n, k) => n + seedSectionalTests(db, k, true), 0);
  const t = COMPANY_TESTS.reduce((n, k) => n + seedCompanyTest(db, k, true), 0);
  const i = seedInterviewPrep(db, true);
  const focus = applyCompanyFocus(db);
  const focusFix = ensureFocusLive(db);
  const mphasis = ensureMphasisV1(db);
  const tcs = ensureTcsNqtV1(db);
  return covers + t0 + focus + focusFix + mphasis + tcs + wipro + p.created + t + i > 0;
}
