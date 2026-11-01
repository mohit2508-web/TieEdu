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
import { FEED_V2 } from '../data/feedV2';

export function seedCompanyProfiles(db: any, onlyMissing = false): { created: number; updated: number } {
  const FACT_CHECKED = '2026-10-27';
  db.companies = Array.isArray(db.companies) ? db.companies : [];

  const nextId = () => {
    const n = db.companies.reduce((m: number, c: any) => Math.max(m, Number(String(c.id).replace(/\D/g, '')) || 0), 0);
    return `comp-${n + 1}`;
  };

  let created = 0;
  let updated = 0;
  for (const p of PROFILES) {
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
      pattern_checked_at: p.confidence === 'low' ? undefined : FACT_CHECKED,
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
      seo_title: p.seo[0],
      seo_description: p.seo[1],
      // Low-confidence profiles get no "checked" date, so the site says "Being verified".
      fact_checked_at: p.confidence === 'low' ? null : FACT_CHECKED,
      rounds_pipeline: rounds,
      // Checked figures carry their source, so the page stamps them "verified"
      // instead of "being verified". Low-confidence profiles get none.
      metric_sources: p.confidence === 'low' ? {} : {
        ctc: { source: 'Company profiles (prep sites, recent drives)', verified_at: FACT_CHECKED },
        rounds: { source: 'Company profiles (recent drives)', verified_at: FACT_CHECKED },
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
  /** Optional, ungraded task shown after the last section (Infosys: an email, 120–150 words). */
  writing?: { title: string; words: [number, number]; tasks: WritingTask[] };
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


const BANKS: Record<string, any[]> = { 'infosys-se': INFOSYS_SE_BANK };
export const COMPANY_TESTS = Object.keys(CONFIGS);

export function seedCompanyTest(db: any, key: string, onlyMissing = false): number {
  const cfg = CONFIGS[key];
  if (!cfg) throw new Error(`Unknown test "${key}". Known: ${Object.keys(CONFIGS).join(', ')}`);
  const bank: any[] = BANKS[key];

  const id = (p: string) => `${p}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  for (const k of ['skills', 'topics', 'questions', 'assessments']) db[k] = Array.isArray(db[k]) ? db[k] : [];

  let skill = db.skills.find((s: any) => s.slug === cfg.slug);
  if (skill && onlyMissing) return 0;
  if (!skill) {
    skill = { id: id('skl'), slug: cfg.slug, created_at: now };
    db.skills.push(skill);
  }
  Object.assign(skill, {
    name: cfg.name, category: 'Company mocks', description: cfg.description, shortDescription: `${cfg.name} mock`,
    status: 'active', isPopular: true, certificateAvailable: false, displayOrder: 0,
    tags: ['company', key, cfg.company_slug], totalQuestions: cfg.sections.reduce((n, s) => n + s.count, 0),
    avgCompletionTime: cfg.minutes, company_slug: cfg.company_slug, prep_role: 'full', updated_at: now,
  });

  const topicId: Record<string, string> = {};
  cfg.sections.forEach((s, i) => {
    let t = db.topics.find((x: any) => x.skillId === skill.id && x.slug === s.key);
    if (!t) { t = { id: id('top'), skillId: skill.id, slug: s.key, created_at: now }; db.topics.push(t); }
    Object.assign(t, { name: `${s.name} (${s.count} Qs · ${s.minutes} min)`, displayOrder: i + 1, isActive: true, updated_at: now });
    topicId[s.key] = t.id;
  });

  db.questions = db.questions.filter((q: any) => q.skillId !== skill.id);
  for (const q of bank) {
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
    title: cfg.name, description: cfg.description, durationMinutes: cfg.minutes,
    totalQuestions: cfg.sections.reduce((n, s) => n + s.count, 0), passingScore: 60,
    topicBlueprint: cfg.sections.map((s) => ({ topicId: topicId[s.key], questionCount: s.count })),
    // Sectional mode: the test page runs one timer per section, in this order, with no going back.
    sections: cfg.sections.map((s) => ({ topicId: topicId[s.key], name: s.name, count: s.count, minutes: s.minutes })),
    writing: cfg.writing || null,
    // Section counts decide the paper; no extra difficulty fill on top.
    difficultyBlueprint: { beginner: 0, intermediate: 0, advanced: 0, expert: 0 },
    certificateThresholds: { pass: 60, proficient: 75, advanced: 85, expert: 90 },
    isActive: true, isDefault: true, allowRetake: true, maxRetakes: 50,
    // Section order matters (it is the real paper's order), so questions are not shuffled across sections.
    shuffleQuestions: false, shuffleOptions: true, showExplanationAfterSubmit: true,
    requireFullScreen: true, tabSwitchLimit: 3,
    instructions: [
      `${cfg.sections.map((s) => `${s.name}: ${s.count}`).join(' · ')}`,
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

const SETS: Array<{ slug: string; id: string; type: string; round: string; title: string; order: number; items: PrepItem[]; lesson?: boolean }> = [
  { slug: 'infosys-systems-engineer', id: 'mod-prep-infosys-se-oa', type: 'preparation_guide', round: 'OA', title: 'Online assessment: topic lessons', order: 1, items: LESSONS.map(lessonAsItem), lesson: true },
  { slug: 'infosys-systems-engineer', id: 'mod-prep-infosys-se-tech', type: 'technical_question', round: 'Technical', title: 'Technical interview: questions and model answers', order: 2, items: TECHNICAL },
  { slug: 'infosys-systems-engineer', id: 'mod-prep-infosys-se-hr', type: 'hr_question', round: 'HR', title: 'HR interview: questions and model answers', order: 3, items: HR },
];

const FREE_PREVIEW = 3;

const md = ([, , , covers, sample, follow]: PrepItem, lesson = false) => lesson
  ? `**Key rules**\n${covers.map((c) => `- ${c}`).join('\n')}\n\n**Worked example**\n\n> ${sample}\n\n**Common trap:** ${follow}`
  : `**What a good answer covers**\n${covers.map((c) => `- ${c}`).join('\n')}\n\n**Sample answer**\n\n> ${sample}\n\n**Follow-up to expect:** ${follow}`;

export function seedInterviewPrep(db: any, onlyMissing = false): number {
  let added = 0;
  for (const set of SETS) {
    const company = (db.companies || []).find((c: any) => c.slug === set.slug);
    if (!company) continue;
    company.modules = Array.isArray(company.modules) ? company.modules : [];
    if (onlyMissing && company.modules.some((m: any) => m.id === set.id)) continue;
    const module = {
      id: set.id, company_id: company.id, module_type: set.type, round_type: set.round, title: set.title,
      // Topic lessons are free (design: Free = topic notes); interview answers are in the pack, first FREE_PREVIEW readable.
      sort_order: set.order, is_premium: !set.lesson,
      items: set.items.map((it, i) => ({
        id: `${set.id}-${i + 1}`, module_id: set.id, question_text: it[0], is_free_preview: set.lesson || i < FREE_PREVIEW,
        difficulty: it[1], role_tag: 'Systems Engineer', frequency_tag: it[2], round_type: set.round, status: 'published',
        comments_count: 0, upvotes_count: 0,
        blocks: [{ id: `${set.id}-${i + 1}-b1`, block_type: 'markdown', block_order: 1, payload: { text: md(it, set.lesson) } }],
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
 * Feed v2, once per database: the old demo drops move to "archived" (kept and
 * restorable in Admin → Drops, never deleted) and the new set is published.
 */
export function seedFeedV2(db: any): number {
  if (db.feed_v2_seeded) return 0;
  const now = new Date().toISOString();
  db.drops = Array.isArray(db.drops) ? db.drops : [];
  for (const d of db.drops) if (d.status !== 'archived') { d.status = 'archived'; d.updated_at = now; }
  FEED_V2.forEach(([type, headline, bullets, cta_route, pinned, priority, sponsored], i) => {
    db.drops.push({
      id: `drop-v2-${String(i + 1).padStart(2, '0')}`, type, headline, bullets, image_alt: headline,
      cta_route, target_slug: cta_route.startsWith('/company/') ? cta_route.split('/')[2].split('#')[0] : undefined,
      sponsored: !!sponsored, sponsor_name: sponsored ? 'TieEdu' : undefined, pinned, priority,
      status: 'published', publish_at: now, expires_at: null, audience: {}, tags: ['feed-v2'],
      stats: { views: 0, unique_viewers: 0, cta_clicks: 0, shares: 0, saves: 0, dwell_ms_total: 0 },
      author_id: 'system', source: { kind: 'manual' }, created_at: now, updated_at: now,
    });
  });
  db.feed_v2_seeded = now;
  return FEED_V2.length;
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
};

export function seedSectionalTests(db: any, key: string, onlyMissing = false): number {
  const cfg = CONFIGS[key];
  const bank = BANKS[key];
  const now = new Date().toISOString();
  const mk = (p: string) => `${p}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  let made = 0;
  for (const sec of SECTIONAL[key] || []) {
    const slug = `${cfg.slug}-${sec.key}`;
    let skill = db.skills.find((s: any) => s.slug === slug);
    if (skill && onlyMissing) continue;
    if (!skill) { skill = { id: mk('skl'), slug, created_at: now }; db.skills.push(skill); }
    Object.assign(skill, {
      name: `${cfg.name.replace(' Online Assessment', '')} · ${sec.name}`, category: 'Company mocks',
      description: `${sec.name} sectional test for ${cfg.name}: ${sec.count} questions in ${sec.minutes} minutes.`,
      shortDescription: `${sec.name} test`, status: 'active', isPopular: false, certificateAvailable: false, displayOrder: 0,
      tags: ['company', key, cfg.company_slug, 'sectional'], totalQuestions: sec.count, avgCompletionTime: sec.minutes,
      company_slug: cfg.company_slug, prep_role: 'sectional', section_key: sec.key, updated_at: now,
    });
    let t = db.topics.find((x: any) => x.skillId === skill.id && x.slug === sec.key);
    if (!t) { t = { id: mk('top'), skillId: skill.id, slug: sec.key, created_at: now }; db.topics.push(t); }
    Object.assign(t, { name: sec.name, displayOrder: 1, isActive: true, updated_at: now });
    db.questions = db.questions.filter((q: any) => q.skillId !== skill.id);
    for (const q of bank.filter((x: any) => x.topic === sec.key)) {
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
const FOCUS = ['infosys-systems-engineer', 'tcs-nqt', 'accenture', 'wipro-elite-nth', 'cognizant-genc'];
export function applyCompanyFocus(db: any): number {
  if (db.company_focus_applied) return 0;
  let n = 0;
  for (const c of db.companies || []) if (!FOCUS.includes(c.slug) && c.status === 'published') { c.status = 'draft'; n++; }
  db.company_focus_applied = new Date().toISOString();
  return n;
}

/** Server start: add any missing 3T content. Returns true when something was added. */
export function seedMissing3T(db: any): boolean {
  const covers = seedCourseCovers(db) + seedFeedV2(db);
  const t0 = COMPANY_TESTS.reduce((n, k) => n + seedSectionalTests(db, k, true), 0);
  const p = seedCompanyProfiles(db, true);
  const t = COMPANY_TESTS.reduce((n, k) => n + seedCompanyTest(db, k, true), 0);
  const i = seedInterviewPrep(db, true);
  const focus = applyCompanyFocus(db);
  return covers + t0 + focus + p.created + t + i > 0;
}
