/**
 * Company prep engine (INFOSYS_SE_PREP_PLAN.md): the day-by-day plan, the
 * readiness score and the fix list for one student and one company. Built
 * only from data the site already has (lessons = the company's OA lesson
 * module, tests = skills tagged with the company), so content an admin adds
 * appears in the plan on the next visit.
 */
import { MPHASIS_BANK } from '../data/companyTests/mphasis';
import { MPHASIS_LESSONS } from '../data/interviewPrep/mphasisLessons';
import { MILESTONES, WIPRO_IOS_SLUG, curriculumDays } from '../data/wiproIOS';
import { LABS, WIPRO_IOS_PACK, type Lab } from '../data/wiproIOS/labs';
import { pulseOf, studentView } from './pulse/store';

export interface PrepSection { key: string; name: string; weight: number }

/**
 * A fixed course calendar instead of the generated Learn/Strengthen/Final plan
 * (WIPRO_IOS_3T_PLAN.md): lessons on their curriculum dates, a test on each
 * milestone day, and the countdown always to the next milestone.
 */
export interface PrepSchedule {
  days: Array<{ date: string; lessons: string[]; milestone?: string }>;
  milestones: Array<{ key: string; name: string; date: string }>;
}

/** Words the prep screens use for this company (defaults suit a hiring OA). */
export interface PrepLabels { section_tests: string; section_test: string; full_mock: string; mock_blurb: string; free_note?: string }

interface PrepConfig {
  sections: PrepSection[]; lessonModule: string; interviewModules: string[]; defaultDays: number;
  schedule?: PrepSchedule; labels?: Partial<PrepLabels>;
  /** Hands-on labs tracked in Project Pulse (Lab tab). */
  labs?: { pack: string; list: Lab[] };
}

/** Mphasis prep turns on once its lessons and a full mock's worth of questions exist. */
const MPHASIS_READY = MPHASIS_LESSONS.length > 0 && MPHASIS_BANK.length >= 75;

export const PREP_COMPANIES: Record<string, PrepConfig> = {
  'infosys-systems-engineer': {
    sections: [
      { key: 'math', name: 'Mathematical Ability', weight: 10 },
      { key: 'reasoning', name: 'Reasoning Ability', weight: 15 },
      { key: 'verbal', name: 'Verbal Ability', weight: 20 },
      { key: 'pseudocode', name: 'Pseudocode', weight: 5 },
      { key: 'puzzle', name: 'Puzzle Solving', weight: 4 },
    ],
    lessonModule: 'mod-prep-infosys-se-oa',
    interviewModules: ['mod-prep-infosys-se-tech', 'mod-prep-infosys-se-hr'],
    defaultDays: 50,
  },
  // Free program on the owner's course calendar; sections are the milestones.
  [WIPRO_IOS_SLUG]: {
    sections: MILESTONES.map((m) => ({ key: m.key, name: m.name, weight: m.key === 'm1' ? 30 : m.key === 'final' ? 10 : 20 })),
    lessonModule: 'mod-prep-wipro-ios-lessons',
    interviewModules: [],
    defaultDays: 45,
    schedule: { days: curriculumDays(), milestones: MILESTONES },
    labs: { pack: WIPRO_IOS_PACK, list: LABS },
    labels: {
      section_tests: 'Milestone tests', section_test: 'milestone test', full_mock: 'Full course mock',
      mock_blurb: 'One timed section per milestone, fresh questions every attempt.',
      free_note: 'Free program: every lesson, milestone test and mock is open. No pack needed.',
    },
  },
  ...(MPHASIS_READY ? {
    'mphasis-freshers': {
      sections: [
        { key: 'quant', name: 'Quantitative Aptitude', weight: 20 },
        { key: 'reasoning', name: 'Logical Reasoning', weight: 20 },
        { key: 'verbal', name: 'Verbal English', weight: 20 },
        { key: 'programming', name: 'Computer Programming', weight: 15 },
      ],
      lessonModule: 'mod-prep-mphasis-oa',
      interviewModules: ['mod-prep-mphasis-tech', 'mod-prep-mphasis-hr'],
      defaultDays: 45,
    },
  } : {}),
};

/** Lesson titles start with their section ("Math: …"); map them to section keys. */
const LESSON_SECTION: Record<string, string> = {
  math: 'math', reasoning: 'reasoning', verbal: 'verbal', pseudocode: 'pseudocode', puzzles: 'puzzle', email: 'verbal',
  quant: 'quant', programming: 'programming', coding: 'programming', svar: 'verbal',
  m1: 'm1', m2: 'm2', m3: 'm3', m4: 'm4', final: 'final',
};
const lessonSection = (title: string) => LESSON_SECTION[(title.split(':')[0] || '').trim().toLowerCase()] || 'verbal';

const ist = (d = new Date()) => new Date(d.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
const addDays = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
const diffDays = (a: string, b: string) => Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000);

export function progressOf(db: any, userId: string, slug: string) {
  db.prep_progress = Array.isArray(db.prep_progress) ? db.prep_progress : [];
  let p = db.prep_progress.find((x: any) => x.user_id === userId && x.company_slug === slug);
  if (!p) {
    p = { user_id: userId, company_slug: slug, lessons_done: [], test_date: null, started_at: ist(), activity_days: [] };
    db.prep_progress.push(p);
  }
  return p;
}

export function touchActivity(p: any) {
  const today = ist();
  if (!p.activity_days.includes(today)) p.activity_days.push(today);
  p.activity_days = p.activity_days.slice(-60);
}

export const band = (s: number) => (s >= 85 ? 'Drive-ready' : s >= 70 ? 'Ready' : s >= 40 ? 'Getting there' : 'Not ready yet');

export function buildPrep(db: any, userId: string, slug: string, owned: boolean) {
  const cfg = PREP_COMPANIES[slug];
  const company = (db.companies || []).find((c: any) => c.slug === slug);
  if (!cfg || !company) return null;
  const p = progressOf(db, userId, slug);
  const today = ist();

  // ---- content
  const lessonMod = (company.modules || []).find((m: any) => m.id === cfg.lessonModule);
  const lessons = (lessonMod?.items || []).map((it: any) => ({
    id: it.id, title: String(it.question_text || ''), section: lessonSection(String(it.question_text || '')), done: p.lessons_done.includes(it.id), free: !!it.is_free_preview,
  }));
  const skills = (db.skills || []).filter((s: any) => s.company_slug === slug && s.status === 'active');
  const fullMock = skills.find((s: any) => s.prep_role !== 'sectional');
  const sectional = Object.fromEntries(skills.filter((s: any) => s.prep_role === 'sectional').map((s: any) => [s.section_key, s]));

  // ---- attempts → latest score per section (sectional or full-mock section)
  const asmBySkill = new Map((db.assessments || []).filter((a: any) => skills.some((s: any) => s.id === a.skillId)).map((a: any) => [a.id, a.skillId]));
  const topicKey = new Map((db.topics || []).filter((t: any) => skills.some((s: any) => s.id === t.skillId)).map((t: any) => [t.id, t.slug]));
  const attempts = (db.attempts || [])
    .filter((a: any) => a.userId === userId && a.status === 'submitted' && asmBySkill.has(a.assessmentId))
    .sort((a: any, b: any) => String(a.submittedAt || a.updated_at).localeCompare(String(b.submittedAt || b.updated_at)));
  const hist: Record<string, number[]> = {};
  for (const a of attempts) {
    for (const tp of a.topicPerformance || []) {
      const key = topicKey.get(tp.topicId) as string | undefined;
      if (!key) continue;
      (hist[key] = hist[key] || []).push(Number(tp.percentage) || 0);
    }
  }
  const mockAttempts = attempts.filter((a: any) => asmBySkill.get(a.assessmentId) === fullMock?.id);

  // Calendar programs score the milestones up to the next one; later ones are not due yet.
  const nextMs = cfg.schedule ? (cfg.schedule.milestones.find((m) => m.date >= today) || cfg.schedule.milestones[cfg.schedule.milestones.length - 1]) : null;
  const due = (key: string) => !nextMs || cfg.schedule!.milestones.findIndex((m) => m.key === key) <= cfg.schedule!.milestones.indexOf(nextMs);

  const sections = cfg.sections.map((s) => {
    const scores = hist[s.key] || [];
    const sl = lessons.filter((l: any) => l.section === s.key);
    return {
      ...s,
      score: scores.length ? scores[scores.length - 1] : null,
      trend: scores.slice(-5),
      attempts: scores.length,
      lessons_total: sl.length,
      lessons_done: sl.filter((l: any) => l.done).length,
      test_slug: sectional[s.key]?.slug || null,
    };
  });

  // ---- readiness = 0.6 test + 0.25 lessons + 0.15 consistency
  const wTotal = cfg.sections.reduce((n, s) => n + s.weight, 0);
  const scoped = sections.filter((s) => due(s.key));
  const wScoped = scoped.reduce((n, s) => n + s.weight, 0) || 1;
  const testScore = scoped.reduce((n, s) => n + (s.score ?? 0) * s.weight, 0) / wScoped;
  const scopedLessons = lessons.filter((l: any) => due(l.section));
  const lessonScore = scopedLessons.length ? (scopedLessons.filter((l: any) => l.done).length / scopedLessons.length) * 100 : 0;
  const last14 = new Set(Array.from({ length: 14 }, (_, i) => addDays(today, -i)));
  const activeDays = new Set([...p.activity_days, ...attempts.map((a: any) => String(a.submittedAt || a.updated_at || '').slice(0, 10))]);
  const consistency = ([...activeDays].filter((d) => last14.has(d)).length / 14) * 100;
  const readiness = Math.round(0.6 * testScore + 0.25 * lessonScore + 0.15 * consistency);

  // ---- weakest section: lowest score among tested, else the first with lessons left
  const tested = scoped.filter((s) => s.score !== null).sort((a, b) => (a.score! - b.score!));
  const weak = tested[0] && tested[0].score! < 70 ? tested[0] : scoped.find((s) => s.lessons_done < s.lessons_total) || tested[0] || scoped[0] || sections[0];
  const fix = {
    section: weak.key, name: weak.name, score: weak.score,
    lessons: lessons.filter((l: any) => l.section === weak.key && !l.done).slice(0, 3),
    test_slug: weak.test_slug,
  };

  // ---- the plan: test date (or default) split Learn 60% · Strengthen 25% · Final 15%
  // Calendar programs count to the next milestone (a date the student set wins until it has passed).
  const testDate = nextMs ? (p.test_date && p.test_date >= today ? p.test_date : nextMs.date) : (p.test_date || addDays(p.started_at || today, cfg.defaultDays));
  const totalDays = Math.max(7, diffDays(p.started_at || today, testDate));
  const learnDays = Math.round(totalDays * 0.6);
  const strengthenDays = Math.round(totalDays * 0.25);
  type Item = { kind: 'lesson' | 'sectional' | 'mock' | 'revision' | 'interview'; ref: string; title: string; done: boolean; soon?: boolean };
  const plan: Array<{ day: number; date: string; phase: string; items: Item[] }> = [];
  if (cfg.schedule) {
    const built = schedulePlan(cfg, lessons, sectional, hist, fullMock, mockAttempts, today);
    plan.push(...built.plan);
    return finish(built.today);
  }
  const order = cfg.sections.map((s) => s.key);
  const queue = order.flatMap((k) => [
    ...lessons.filter((l: any) => l.section === k).map((l: any): Item => ({ kind: 'lesson', ref: l.id, title: l.title, done: l.done })),
    { kind: 'sectional' as const, ref: sectional[k]?.slug || '', title: `${cfg.sections.find((s) => s.key === k)!.name} test`, done: (hist[k] || []).length > 0 },
  ]);
  const perDay = Math.max(1, Math.ceil(queue.length / Math.max(1, learnDays)));
  let qi = 0;
  for (let d = 0; d < totalDays; d++) {
    const date = addDays(p.started_at || today, d);
    const phase = d < learnDays ? 'Learn' : d < learnDays + strengthenDays ? 'Strengthen' : 'Final';
    const items: Item[] = [];
    if (phase === 'Learn') { for (let k = 0; k < perDay && qi < queue.length; k++) items.push(queue[qi++]); }
    if ((d + 1) % 7 === 0 || d === totalDays - 1) items.push({ kind: 'mock', ref: fullMock?.slug || '', title: `Full mock: ${wTotal} Qs, real pattern`, done: mockAttempts.some((a: any) => String(a.submittedAt || '').slice(0, 10) >= date) });
    if (phase !== 'Learn' && items.length < 2) {
      const target = phase === 'Strengthen' ? weak : sections[d % sections.length];
      items.push({ kind: 'revision', ref: target.test_slug || '', title: `Revision test: ${target.name}`, done: false });
    }
    if (phase === 'Final' && d >= totalDays - 3) items.push({ kind: 'interview', ref: cfg.interviewModules[0], title: 'Interview prep: technical and HR answers', done: false });
    if (!items.length) items.push({ kind: 'revision', ref: weak.test_slug || '', title: `Revision: ${weak.name}`, done: false });
    plan.push({ day: d + 1, date, phase, items });
  }
  return finish(plan.find((x) => x.date === today) || plan[0]);

  function finish(todayPlan: { day: number; date: string; phase: string; items: Item[] }) {
  // Readiness history, one value per day: drives "+6% this week" and "was → now" after a test.
  p.readiness_log = Array.isArray(p.readiness_log) ? p.readiness_log : [];
  const lastLog = p.readiness_log[p.readiness_log.length - 1];
  if (lastLog?.date === today) lastLog.score = readiness; else p.readiness_log.push({ date: today, score: readiness });
  p.readiness_log = p.readiness_log.slice(-90);
  const weekAgo = [...p.readiness_log].reverse().find((x: any) => x.date <= addDays(today, -7)) || p.readiness_log[0];
  const prevDay = p.readiness_log.length > 1 ? p.readiness_log[p.readiness_log.length - 2].score : null;

  return {
    company: { name: company.name, slug },
    owned,
    test_date: testDate,
    days_left: Math.max(0, diffDays(today, testDate)),
    readiness: { score: readiness, band: band(readiness), test: Math.round(testScore), lessons: Math.round(lessonScore), consistency: Math.round(consistency), week_change: readiness - (weekAgo?.score ?? readiness), previous: prevDay },
    attempts: attempts.slice(-20).reverse().map((a: any) => ({ id: a.id, slug: skills.find((s: any) => s.id === asmBySkill.get(a.assessmentId))?.slug, title: skills.find((s: any) => s.id === asmBySkill.get(a.assessmentId))?.name, score: Math.round(Number(a.score) || 0), at: a.submittedAt || a.updated_at })),
    interview: cfg.interviewModules,
    interview_modules: cfg.interviewModules.map((id) => {
      const m = (company.modules || []).find((x: any) => x.id === id);
      return { id, title: String(m?.title || ''), count: (m?.items || []).length };
    }).filter((m) => m.count > 0),
    free: !!company.is_free,
    lab: cfg.labs ? labsFor(db, userId, cfg.labs) : null,
    labels: { section_tests: 'Section tests', section_test: 'section test', full_mock: 'Full mock', mock_blurb: 'Real pattern, fresh questions every attempt.', ...(cfg.labels || {}) },
    next_milestone: nextMs,
    sections,
    full_mock: fullMock ? {
      slug: fullMock.slug, attempts: mockAttempts.length, last: mockAttempts.length ? Number(mockAttempts[mockAttempts.length - 1].score) || 0 : null,
      questions: Number(fullMock.totalQuestions) || null, minutes: Number(fullMock.avgCompletionTime) || null,
    } : null,
    lessons,
    fix,
    today: todayPlan,
    plan,
  };
  }
}

/**
 * Calendar plan: every day from the first class to the final. Lessons sit on
 * their curriculum dates ("coming" when not written yet), each milestone day
 * has its test, the two days before it a practice run of that test, empty days
 * a revision test. Today also lists up to 3 earlier lessons still unread.
 */
function schedulePlan(cfg: PrepConfig, lessons: any[], sectional: Record<string, any>, hist: Record<string, number[]>, fullMock: any, mockAttempts: any[], today: string) {
  type Item = { kind: 'lesson' | 'sectional' | 'mock' | 'revision' | 'interview'; ref: string; title: string; done: boolean; soon?: boolean };
  const { days, milestones } = cfg.schedule!;
  const byTitle = new Map(lessons.map((l: any) => [l.title, l]));
  const strip = (t: string) => t.replace(/^[^:]+:\s*/, '');
  const name = (k: string) => cfg.sections.find((s) => s.key === k)?.name || k;
  const short = (k: string) => name(k).split(' · ')[0];
  const test = (k: string, title: string): Item => ({ kind: 'sectional', ref: sectional[k]?.slug || '', title, done: (hist[k] || []).length > 0, ...(sectional[k] ? {} : { soon: true }) });
  const first = days[0].date;
  const last = days[days.length - 1].date;
  const plan: Array<{ day: number; date: string; phase: string; items: Item[] }> = [];
  for (let d = first, n = 1; d <= last; d = addDays(d, 1), n++) {
    const sd = days.find((x) => x.date === d);
    const ms = milestones.find((m) => m.date >= d) || milestones[milestones.length - 1];
    const items: Item[] = (sd?.lessons || []).map((t) => {
      const l: any = byTitle.get(t);
      return l ? { kind: 'lesson', ref: l.id, title: strip(t), done: l.done } : { kind: 'lesson', ref: '', title: strip(t), done: false, soon: true };
    });
    const toMs = diffDays(d, ms.date);
    if (sd?.milestone) items.push(test(sd.milestone, `${name(sd.milestone)}: test day`));
    else if (toMs >= 1 && toMs <= 2) {
      // Before the last milestone, rehearse the whole course, not one section.
      const isLast = ms === milestones[milestones.length - 1];
      items.push(isLast && fullMock ? { kind: 'mock', ref: fullMock.slug, title: 'Practice: full course mock (60 Qs)', done: mockAttempts.length > 0 } : test(ms.key, `Practice: ${short(ms.key)} mock test`));
    }
    if (d === last && fullMock) items.push({ kind: 'mock', ref: fullMock.slug, title: 'Full course mock', done: mockAttempts.length > 0 });
    if (!items.length) items.push({ ...test(ms.key, `Revision: ${short(ms.key)} test`), kind: 'revision', done: false });
    plan.push({ day: n, date: d, phase: short(ms.key), items });
  }
  const at = today < first ? plan[0] : today > last ? plan[plan.length - 1] : plan.find((x) => x.date === today)!;
  const catchUp: Item[] = plan.filter((x) => x.date < at.date).flatMap((x) => x.items)
    .filter((it) => it.kind === 'lesson' && it.ref && !it.done).slice(0, 3)
    .map((it) => ({ ...it, title: `Catch up: ${it.title}` }));
  return { plan, today: { ...at, items: [...catchUp, ...at.items] } };
}

/**
 * The Lab tab: every handbook lab with its due date and, when the student is in
 * a Project Pulse class that has the pack, their status there (pushed, reviewed,
 * score). Students outside Pulse still see every brief.
 */
function labsFor(db: any, userId: string, labs: { pack: string; list: Lab[] }) {
  const p = pulseOf(db);
  const rows = p.roster.filter((r: any) => r.user_id === userId && r.status === 'active');
  const tasks = p.tasks.filter((t: any) => t.published && String(t.pack_ref || '').startsWith(`${labs.pack}:`) && rows.some((r: any) => r.class_id === t.class_id));
  const cls = tasks.length ? p.classes.find((c: any) => c.id === tasks[0].class_id) : null;
  return {
    pack: labs.pack,
    pulse_class: cls ? { id: cls.id, name: cls.name } : null,
    items: labs.list.map((lab) => {
      const task = tasks.find((t: any) => t.pack_ref === `${labs.pack}:${lab.id}`);
      const row = task && rows.find((r: any) => r.class_id === task.class_id);
      const v = task && row ? studentView(db, task, row, 'student') : null;
      return {
        ...lab,
        pulse: v ? { task_id: task.id, folder: task.folder, deadline: task.deadline_at, status: v.status, score: v.score, reviewed: v.reviewed, commits: v.commits.length, repo: v.repo, feedback: v.feedback } : null,
      };
    }),
  };
}
