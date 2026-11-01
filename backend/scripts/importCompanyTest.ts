/**
 * Loads a company's online-assessment question bank (src/data/companyTests/<file>.json,
 * produced by scripts/parseInfosysPdfs.py) as a skill test that mirrors the real
 * pattern: one topic per section, a blueprint with the real per-section counts,
 * secure mode on. Every attempt draws a fresh mix from the pool.
 *
 *   npx ts-node --transpile-only scripts/importCompanyTest.ts infosys-se
 *
 * Re-running replaces that skill's questions (old attempts keep their snapshot).
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { loadDb, safeSaveDb } from '../src/data/db';

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

const key = process.argv[2];
const cfg = CONFIGS[key];
if (!cfg) throw new Error(`Unknown test "${key}". Known: ${Object.keys(CONFIGS).join(', ')}`);
const bank: any[] = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/companyTests', `${key}.json`), 'utf8'));

const id = (p: string) => `${p}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const now = new Date().toISOString();
const db: any = loadDb();
for (const k of ['skills', 'topics', 'questions', 'assessments']) db[k] = Array.isArray(db[k]) ? db[k] : [];

let skill = db.skills.find((s: any) => s.slug === cfg.slug);
if (!skill) {
  skill = { id: id('skl'), slug: cfg.slug, created_at: now };
  db.skills.push(skill);
}
Object.assign(skill, {
  name: cfg.name, category: 'Company mocks', description: cfg.description, shortDescription: `${cfg.name} mock`,
  status: 'active', isPopular: true, certificateAvailable: false, displayOrder: 0,
  tags: ['company', key, cfg.company_slug], totalQuestions: cfg.sections.reduce((n, s) => n + s.count, 0),
  avgCompletionTime: cfg.minutes, company_slug: cfg.company_slug, updated_at: now,
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

const counts = cfg.sections.map((s) => `${s.key} ${bank.filter((q) => q.topic === s.key).length}/${s.count}`).join(', ');
console.log(`${cfg.name}: ${db.questions.filter((q: any) => q.skillId === skill.id).length} questions (${counts})`);
safeSaveDb(db);
