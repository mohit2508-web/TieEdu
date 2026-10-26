/**
 * The Today screen — the signed-in home (UI_REDESIGN_PLAN_V2 §6.1).
 *
 * One request answers "what now?": where the student is on their route, the
 * single next step, this week (streak, test dates, what they did), where to
 * resume, and the weekly recap. Everything is computed from records the
 * student created — course progress, skill-test attempts, certificates, company
 * prep profiles, the XP ledger. Nothing is estimated and nothing is padded: a
 * block with no data comes back empty and the screen leaves it out.
 *
 * "From your college" (§6.1) is deliberately absent: the college lives on the
 * drive profile in Postgres, and a count must clear a privacy threshold before
 * it can be shown. It returns when both are available, not before.
 */
import { completionState, getProgress, orderedLessons } from './courses';
import { computeTrack, profilesOf } from './companyPageStudent';
import { studentPage } from './companyPageDerive';
import { addDays, dayDiff, istDate, streakView, StreakView } from './streak';

export type Stage = 'foundation' | 'internship' | 'placement';

/**
 * Where a student is, from the year they graduate. Indian academic years run
 * July–June, so in October 2026 the batch graduating in 2027 is in final year.
 * Already graduated still means "placement": they are looking for a job.
 */
export function stageFor(gradYear: number | null | undefined, now = new Date()): Stage | null {
  if (!gradYear || !Number.isFinite(gradYear)) return null;
  const today = istDate(now);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const academicEnd = month >= 7 ? year + 1 : year;
  const left = gradYear - academicEnd;
  if (left <= 0) return 'placement';
  if (left === 1) return 'internship';
  return 'foundation';
}

/** "Final year", "3rd year"… for the route's first station. */
export function yearLabel(gradYear: number, now = new Date()): string {
  const stage = stageFor(gradYear, now);
  const today = istDate(now);
  const academicEnd = Number(today.slice(5, 7)) >= 7 ? Number(today.slice(0, 4)) + 1 : Number(today.slice(0, 4));
  const left = gradYear - academicEnd;
  if (left < 0) return `Graduated ${gradYear}`;
  if (stage === 'placement') return 'Final year';
  const yr = 4 - left;
  return yr <= 1 ? '1st year' : yr === 2 ? '2nd year' : '3rd year';
}

interface Station {
  key: 'year' | 'skills' | 'companies' | 'offer';
  label: string;
  note: string | null;
  state: 'done' | 'current' | 'next';
}

interface NextStep {
  kind: 'set_year' | 'weak_round' | 'continue_course' | 'first_test' | 'weak_topic' | 'pick_company';
  title: string;
  body: string;
  href: string | null;
  cta: string;
}

export interface TodayView {
  first_name: string;
  grad_year: number | null;
  stage: Stage | null;
  route: Station[];
  next_step: NextStep;
  this_week: {
    streak: StreakView;
    test_dates: Array<{ company: string; slug: string; date: string; days_left: number }>;
    lessons: number;
    tests: number;
    xp: number;
  };
  continue: { kind: 'course' | 'test'; title: string; detail: string; href: string; percent: number | null } | null;
  recap: {
    from: string;
    to: string;
    lessons: number;
    tests: number;
    certificates: number;
    xp: number;
    best_improvement: { skill: string; from: number; to: number } | null;
  } | null;
  targets: Array<{ company: string; slug: string; overall: number | null; cleared: number; rounds: number }>;
}

const within = (iso: string | undefined | null, fromDay: string, toDay: string) => {
  if (!iso) return false;
  const d = istDate(new Date(iso));
  return d >= fromDay && d <= toDay;
};

export function buildToday(db: any, userId: string, now = new Date()): TodayView {
  const today = istDate(now);
  const user = (db.users || []).find((u: any) => u.id === userId) || {};
  const gradYear: number | null = Number.isFinite(user.grad_year) ? user.grad_year : null;
  const stage = stageFor(gradYear, now);
  const firstName = String(user.name || '').trim().split(/\s+/)[0] || 'there';

  // ---- courses
  const courses = (db.courses || []).filter((c: any) => c.published);
  const enrolled = courses
    .map((c: any) => ({ course: c, state: completionState(db, userId, c), progress: getProgress(db, userId, c.id) }))
    .filter((x: any) => x.state.enrolled);
  const inProgress = enrolled
    .filter((x: any) => !x.state.is_complete)
    .sort((a: any, b: any) => String(b.progress?.updated_at || '').localeCompare(String(a.progress?.updated_at || '')));
  const completedCourses = enrolled.filter((x: any) => x.state.is_complete).length;

  // ---- skill tests
  const skillById = new Map<string, any>((db.skills || []).map((s: any) => [s.id, s]));
  const finished = (db.attempts || []).filter(
    (a: any) => a.userId === userId && (a.status === 'submitted' || a.status === 'timed_out')
  );
  const openAttempt = (db.attempts || [])
    .filter((a: any) => a.userId === userId && a.status === 'in_progress')
    .sort((a: any, b: any) => String(b.startedAt || '').localeCompare(String(a.startedAt || '')))[0];
  const skillCerts = (db.skillCertificates || []).filter((c: any) => c.userId === userId && c.status !== 'revoked');
  const courseCerts = (db.certificates || []).filter((c: any) => c.user_id === userId && c.status === 'active');

  // ---- target companies: prep profiles plus companies the student bought
  const companies = db.companies || [];
  const targetIds = new Set<string>();
  for (const p of profilesOf(db)) if (p.user_id === userId) targetIds.add(p.company_id);
  for (const u of db.unlocks || []) if (u.user_id === userId && u.status !== 'revoked') targetIds.add(u.company_id);
  const targets = [...targetIds]
    .map((id) => companies.find((c: any) => c.id === id && c.status === 'published'))
    .filter(Boolean)
    .map((company: any) => {
      const hit = studentPage(db, company);
      const track = hit ? computeTrack(db, userId, hit.page) : null;
      const rounds = (hit?.page.sections.find((x) => x.type === 'rounds_route')?.data.stations as any[]) || [];
      const passMark = Number(hit?.page.sections.find((x) => x.type === 'rounds_route')?.data.pass_mark) || 70;
      const weakest = track?.weakest_station_id ? rounds.find((r) => r.id === track.weakest_station_id) : null;
      const weakestScore = track?.stations.find((s) => s.station_id === track?.weakest_station_id)?.score ?? null;
      return {
        company,
        overall: track?.overall ?? null,
        cleared: track ? track.stations.filter((s) => (s.score ?? -1) >= passMark).length : 0,
        rounds: rounds.length,
        weakest: weakest ? { title: String(weakest.title), href: String(weakest.test_href || ''), score: weakestScore } : null,
      };
    });

  // ---- route
  const skillsDone = skillCerts.length > 0 || courseCerts.length > 0 || completedCourses > 0;
  const anyTargetCleared = targets.some((t) => t.rounds > 0 && t.cleared === t.rounds);
  const route: Station[] = [
    {
      key: 'year',
      label: gradYear ? yearLabel(gradYear, now) : 'Your year',
      note: gradYear ? `Graduating ${gradYear}` : 'Tell us your year',
      state: gradYear ? 'done' : 'current',
    },
    {
      key: 'skills',
      label: 'Skills',
      note: skillsDone
        ? `${skillCerts.length + courseCerts.length} certificate${skillCerts.length + courseCerts.length === 1 ? '' : 's'}`
        : finished.length
          ? `${finished.length} test${finished.length === 1 ? '' : 's'} taken`
          : null,
      state: !gradYear ? 'next' : skillsDone ? 'done' : 'current',
    },
    {
      key: 'companies',
      label: 'Companies',
      note: targets.length ? targets.map((t) => t.company.name).slice(0, 2).join(', ') : null,
      state: anyTargetCleared ? 'done' : gradYear && (skillsDone || stage === 'placement' || targets.length > 0) ? 'current' : 'next',
    },
    { key: 'offer', label: 'Offer', note: null, state: anyTargetCleared ? 'current' : 'next' },
  ];
  // Only one station is "current": the first one that is.
  let seen = false;
  for (const st of route) {
    if (st.state === 'current') {
      if (seen) st.state = 'next';
      seen = true;
    }
  }

  // ---- next step: one card, in priority order
  const weakTarget = targets
    .filter((t) => t.weakest && t.weakest.score !== null)
    .sort((a, b) => (a.weakest!.score as number) - (b.weakest!.score as number))[0];
  const course = inProgress[0];
  const nextLesson = course
    ? orderedLessons(course.course).find((l: any) => l.id === course.state.next_lesson_id) || null
    : null;
  const latestRec = (db.recommendations || [])
    .filter((r: any) => r.userId === userId && Array.isArray(r.weakTopics) && r.weakTopics.length)
    .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];

  let next_step: NextStep;
  if (!gradYear) {
    next_step = {
      kind: 'set_year',
      title: 'Which year are you in?',
      body: 'Your route depends on it: foundations in the first years, companies in the last.',
      href: null,
      cta: 'Set my year',
    };
  } else if (weakTarget) {
    const w = weakTarget.weakest!;
    next_step = {
      kind: 'weak_round',
      title: `Your weakest ${weakTarget.company.name} round is ${w.title} (${w.score}%)`,
      body: 'Practise it next. Your score on the company page updates when you retake the test.',
      href: w.href || `/company/${weakTarget.company.slug}#rounds`,
      cta: 'Practise this round',
    };
  } else if (course && nextLesson) {
    next_step = {
      kind: 'continue_course',
      title: `Continue ${course.course.title}`,
      body: `Next lesson: ${nextLesson.title}`,
      href: `/courses/${course.course.slug}?lesson=${nextLesson.id}`,
      cta: 'Continue',
    };
  } else if (finished.length === 0) {
    next_step = {
      kind: 'first_test',
      title: 'Take your first skill test',
      body: 'Ten questions, about fifteen minutes. It shows where you stand before you plan anything.',
      href: '/skill-test',
      cta: 'Pick a test',
    };
  } else if (latestRec) {
    const skill = skillById.get(latestRec.skillId);
    next_step = {
      kind: 'weak_topic',
      title: `Work on ${String(latestRec.weakTopics[0]?.topicName || latestRec.weakTopics[0] || 'your weakest topic')}`,
      body: skill ? `It was your weakest topic in ${skill.name}. Retake the test when you're ready.` : 'Retake the test when you are ready.',
      href: skill ? `/skill-test/${skill.slug}` : '/skill-test',
      cta: 'Retake the test',
    };
  } else {
    next_step = {
      kind: 'pick_company',
      title: 'Pick a company to prepare for',
      body: 'Each company page lists its rounds in order and scores you on each one.',
      href: '/companies',
      cta: 'Browse companies',
    };
  }

  // ---- this week (last 7 IST days including today)
  const weekFrom = addDays(today, -6);
  const ledger = (db.xp_ledger || []).filter((e: any) => e.user_id === userId || e.userId === userId);
  const lessonsIn = (from: string, to: string) =>
    ledger.filter((e: any) => e.reason === 'lesson_complete' && within(e.created_at, from, to)).length;
  const xpIn = (from: string, to: string) =>
    ledger.filter((e: any) => within(e.created_at, from, to)).reduce((s: number, e: any) => s + (Number(e.xp) || 0), 0);
  const testsIn = (from: string, to: string) => finished.filter((a: any) => within(a.submittedAt || a.updated_at, from, to));

  const testDates = profilesOf(db)
    .filter((p) => p.user_id === userId && p.test_date && p.test_date >= today)
    .map((p) => {
      const c = companies.find((x: any) => x.id === p.company_id);
      return c ? { company: c.name, slug: c.slug, date: p.test_date, days_left: dayDiff(today, p.test_date) } : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.days_left - b.days_left) as TodayView['this_week']['test_dates'];

  // ---- continue: the most recent unfinished thing
  let resume: TodayView['continue'] = null;
  const courseAt = course?.progress?.updated_at || '';
  const testAt = openAttempt?.startedAt || '';
  if (openAttempt && testAt >= courseAt) {
    const skill = skillById.get(openAttempt.skillId);
    if (skill) {
      resume = {
        kind: 'test',
        title: `${skill.name} skill test`,
        detail: 'You started this test and did not submit it.',
        href: `/skill-test/${skill.slug}`,
        percent: null,
      };
    }
  }
  if (!resume && course && nextLesson) {
    resume = {
      kind: 'course',
      title: course.course.title,
      detail: `${course.state.completed} of ${course.state.total} lessons`,
      href: `/courses/${course.course.slug}?lesson=${nextLesson.id}`,
      percent: course.state.percent,
    };
  }

  // ---- weekly recap: the previous 7 days, and what got better
  const recapTo = addDays(today, -1);
  const recapFrom = addDays(today, -7);
  const recapTests = testsIn(recapFrom, recapTo);
  let best: { skill: string; from: number; to: number } | null = null;
  for (const a of recapTests) {
    const earlier = finished
      .filter((b: any) => b.skillId === a.skillId && String(b.submittedAt || b.updated_at) < String(a.submittedAt || a.updated_at))
      .sort((x: any, y: any) => String(y.submittedAt || y.updated_at).localeCompare(String(x.submittedAt || x.updated_at)))[0];
    if (!earlier) continue;
    const gain = (Number(a.percentage) || 0) - (Number(earlier.percentage) || 0);
    if (gain > 0 && (!best || gain > best.to - best.from)) {
      best = { skill: skillById.get(a.skillId)?.name || 'A skill', from: Number(earlier.percentage) || 0, to: Number(a.percentage) || 0 };
    }
  }
  const recapCerts =
    skillCerts.filter((c: any) => within(c.issueDate || c.created_at, recapFrom, recapTo)).length +
    courseCerts.filter((c: any) => within(c.issued_at, recapFrom, recapTo)).length;
  const recap = {
    from: recapFrom,
    to: recapTo,
    lessons: lessonsIn(recapFrom, recapTo),
    tests: recapTests.length,
    certificates: recapCerts,
    xp: xpIn(recapFrom, recapTo),
    best_improvement: best,
  };
  const recapEmpty = !recap.lessons && !recap.tests && !recap.certificates && !recap.xp;

  return {
    first_name: firstName,
    grad_year: gradYear,
    stage,
    route,
    next_step,
    this_week: {
      streak: streakView(db, userId, now),
      test_dates: testDates,
      lessons: lessonsIn(weekFrom, today),
      tests: testsIn(weekFrom, today).length,
      xp: xpIn(weekFrom, today),
    },
    continue: resume,
    recap: recapEmpty ? null : recap,
    targets: targets.map((t) => ({ company: t.company.name, slug: t.company.slug, overall: t.overall, cleared: t.cleared, rounds: t.rounds })),
  };
}
