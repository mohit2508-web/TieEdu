/**
 * Wipro iOS lab report (WIPRO_LAB_REPORT_PLAN.md). Everything students have
 * done in the program, in one model: lab submissions and the teacher's marks
 * (Project Pulse), lessons, milestone tests and the full mock (prep), plus the
 * analysis on top. Writers turn it into Excel, CSV and PDF (wiproReportFiles.ts).
 *
 * Numbers come from the same functions the app shows (studentView, buildPrep),
 * so the report always matches the teacher's dashboard and the student's page.
 * Read-only: buildPrep writes a readiness log, so it runs on a copy of
 * prep_progress and nothing is saved.
 *
 * Access: admins see every Wipro lab class (and Wipro learners not in a lab
 * class); a teacher sees only the classes they teach. Teacher private notes
 * are never included.
 */
import { pulseOf, canTeach, isAdmin, isTeacher, studentView, repoFor, isVerified, PulseError } from './store';
import { LABS, WIPRO_IOS_PACK } from '../../data/wiproIOS/labs';
import { MILESTONES, WIPRO_IOS_SLUG } from '../../data/wiproIOS';
import { buildPrep } from '../prep';

type U = { id: string; role?: string };
const DAY = 86400000;
const istDay = (at: string | number | Date) => new Date(new Date(at).getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

export const STATUS_LABEL: Record<string, string> = {
  noRepo: 'No repo linked', notStarted: 'Not started', unverified: 'Repo not verified',
  submitted: 'Submitted, waiting for review', progress: 'Reviewed, partly met', done: 'Done',
};
export const MILESTONE_NAME: Record<string, string> = Object.fromEntries(MILESTONES.map((m) => [m.key, m.name]));
const INTEGRITY = new Set(['bulk', 'backdated', 'similar', 'claimed']);

export interface ReportLab {
  key: string; code: string; title: string; milestone: string; module: number | null; kind: string; due: string;
  assigned: number; submitted: number; on_time: number; late: number; not_started: number; overdue: number;
  reviewed: number; waiting_review: number; done: number; avg_score: number | null; submit_rate: number;
  most_missed: { id: string; title: string; count: number; of: number } | null;
}
export interface ReportCell {
  lab: string; status: string; score: number; submitted: boolean; on_time: boolean; late: boolean; overdue: boolean; due: boolean;
  reviewed: boolean; commits: number; last: string | null; flags: { kind: string; text: string }[];
  reqs: { id: string; title: string; verdict: string; reason: string }[];
}
export interface ReportStudent {
  key: string; roll: string; name: string; email: string; class_name: string; class_id: string | null; teacher: string;
  roster_status: string; joined_at: string | null; repo: string | null; verified: boolean;
  labs_assigned: number; labs_due: number; submitted: number; on_time: number; late: number; reviewed: number; done: number; overdue: number;
  overdue_codes: string[]; lab_score: number | null; commits: number; commit_days: number;
  lessons_done: number; lessons_total: number;
  sections: Record<string, number | null>; tests_taken: number; mock_attempts: number; mock_best: number | null; mock_last: number | null;
  readiness: number | null; band: string; last_activity: string | null; flags: number; integrity_flags: number;
  status: 'Not joined' | 'Not started' | 'Behind' | 'On track';
  cells: ReportCell[];
}
export interface WiproReport {
  generated_at: string; today: string; scope: string;
  classes: { id: string; name: string; teacher: string; students: number }[];
  sections: { key: string; name: string }[];
  labs: ReportLab[]; students: ReportStudent[];
  milestones: { key: string; name: string; labs: number; cells: number; done: number; reviewed: number; submitted: number; not_started: number; overdue: number }[];
  funnel: { label: string; count: number }[];
  activity: { date: string; commits: number; lab_students: number; prep_students: number; tests: number }[];
  score_bands: { label: string; count: number }[];
  summary: Record<string, number | null>;
  findings: string[];
  actions: { kind: string; who: string; class_name: string; detail: string }[];
}

const labMeta = (task: any) => {
  const ref = String(task.pack_ref || '');
  const lab = ref.startsWith(`${WIPRO_IOS_PACK}:`) ? LABS.find((l) => l.id === ref.slice(WIPRO_IOS_PACK.length + 1)) : null;
  if (lab) return { key: lab.id, code: lab.code, title: lab.title, milestone: lab.milestone, module: lab.module, kind: lab.kind, order: LABS.indexOf(lab) };
  return { key: `task:${String(task.title).toLowerCase()}`, code: task.folder, title: task.title, milestone: '', module: null, kind: 'task', order: 1000 };
};

/** Wipro lab classes: made from the pack, or holding a pack lab. */
export const wiproClasses = (db: any) => {
  const p = pulseOf(db);
  return p.classes.filter((c) => c.pack === WIPRO_IOS_PACK || p.tasks.some((t) => t.class_id === c.id && String(t.pack_ref || '').startsWith(`${WIPRO_IOS_PACK}:`)));
};

export function buildWiproReport(db: any, user: U, opts: { classId?: string | null; now?: Date } = {}): WiproReport {
  const now = opts.now || new Date();
  const nowIso = now.toISOString();
  const today = istDay(now);
  if (!isTeacher(db, user as any)) throw new PulseError(403, 'Only admins and teachers can download the report.');
  const p = pulseOf(db);
  let classes = wiproClasses(db).filter((c) => canTeach(db, user as any, c));
  if (opts.classId) classes = classes.filter((c) => c.id === opts.classId);
  if (opts.classId && !classes.length) throw new PulseError(404, 'Class not found.');
  const withLearners = isAdmin(user) && !opts.classId;
  if (!classes.length && !withLearners) throw new PulseError(404, 'No Wipro lab class yet.');

  // buildPrep logs readiness into prep_progress; give it a copy so the live store is untouched.
  const view: any = { ...db, prep_progress: structuredClone(Array.isArray(db.prep_progress) ? db.prep_progress : []) };
  const users = new Map<string, any>((db.users || []).map((x: any) => [x.id, x]));
  const teacherName = (c: any) => users.get(c.owner_id)?.name || 'Teacher';

  // Wipro tests: every submitted attempt on a Wipro skill.
  const skills = (db.skills || []).filter((s: any) => s.company_slug === WIPRO_IOS_SLUG);
  const skillOf = new Map<string, any>((db.assessments || []).filter((a: any) => skills.some((s: any) => s.id === a.skillId)).map((a: any) => [a.id, skills.find((s: any) => s.id === a.skillId)]));
  const attemptsBy = new Map<string, any[]>();
  for (const a of db.attempts || []) {
    if (a.status !== 'submitted' || !skillOf.has(a.assessmentId)) continue;
    (attemptsBy.get(a.userId) || attemptsBy.set(a.userId, []).get(a.userId)!).push(a);
  }
  const progressBy = new Map<string, any>((view.prep_progress as any[]).filter((x) => x.company_slug === WIPRO_IOS_SLUG).map((x) => [x.user_id, x]));

  let sections: { key: string; name: string }[] = [];
  const prepFor = (userId: string | null | undefined) => {
    if (!userId) return null;
    try {
      const r = buildPrep(view, userId, WIPRO_IOS_SLUG, true);
      if (r && !sections.length) sections = r.sections.map((s: any) => ({ key: s.key, name: s.name }));
      return r;
    } catch { return null; }
  };

  const labs = new Map<string, ReportLab & { order: number; miss: Record<string, { title: string; count: number }>; scores: number[] }>();
  const students: ReportStudent[] = [];
  const commitDays = new Map<string, { commits: number; who: Set<string> }>();
  const addDay = (d: string) => commitDays.get(d) || commitDays.set(d, { commits: 0, who: new Set() }).get(d)!;

  const prepPart = (userId: string | null | undefined) => {
    const prep = prepFor(userId);
    const att = (userId && attemptsBy.get(userId)) || [];
    const mock = att.filter((a) => skillOf.get(a.assessmentId)?.prep_role !== 'sectional')
      .sort((a, b) => String(a.submittedAt || a.updated_at).localeCompare(String(b.submittedAt || b.updated_at)));
    return {
      lessons_done: prep ? prep.lessons.filter((l: any) => l.done).length : 0,
      lessons_total: prep ? prep.lessons.length : 0,
      sections: Object.fromEntries((prep?.sections || []).map((s: any) => [s.key, s.score == null ? null : Math.round(s.score)])),
      tests_taken: att.length,
      mock_attempts: mock.length,
      mock_best: mock.length ? Math.round(Math.max(...mock.map((a) => Number(a.score) || 0))) : null,
      mock_last: mock.length ? Math.round(Number(mock[mock.length - 1].score) || 0) : null,
      readiness: prep ? prep.readiness.score : null,
      band: prep ? prep.readiness.band : '',
      last_prep: [...(progressBy.get(userId || '')?.activity_days || []), ...att.map((a) => istDay(a.submittedAt || a.updated_at))].sort().pop() || null,
    };
  };

  for (const cls of classes) {
    const tasks = p.tasks.filter((t) => t.class_id === cls.id && t.published).map((t) => ({ t, m: labMeta(t) })).sort((a, b) => a.m.order - b.m.order || String(a.t.deadline_at).localeCompare(String(b.t.deadline_at)));
    const roster = p.roster.filter((r) => r.class_id === cls.id && r.status !== 'removed');
    for (const { t, m } of tasks) {
      if (!labs.has(m.key)) labs.set(m.key, { key: m.key, code: m.code, title: m.title, milestone: m.milestone, module: m.module, kind: m.kind, due: istDay(t.deadline_at), order: m.order,
        assigned: 0, submitted: 0, on_time: 0, late: 0, not_started: 0, overdue: 0, reviewed: 0, waiting_review: 0, done: 0, avg_score: null, submit_rate: 0, most_missed: null, miss: {}, scores: [] });
    }
    for (const row of roster) {
      const active = row.status === 'active';
      const rec = repoFor(db, cls.id, row.id);
      const repoCommits: any[] = rec?.snap?.commits || [];
      for (const c of repoCommits) { const d = addDay(istDay(c.at)); d.commits++; d.who.add(row.id); }
      const cells: ReportCell[] = [];
      for (const { t, m } of active ? tasks : []) {
        const v = studentView(db, t, row, 'teacher');
        const due = nowIso > t.deadline_at;
        const submitted = v.commits.length > 0;
        const onTime = submitted && v.commits.some((c: any) => (c.pushed || c.at) <= t.deadline_at);
        const cell: ReportCell = {
          lab: m.key, status: v.status, score: v.score, submitted, on_time: onTime, late: submitted && !onTime, overdue: !submitted && due, due,
          reviewed: v.reviewed, commits: v.commits.length, last: v.lastActivity, flags: v.flags.map((f: any) => ({ kind: f.kind, text: f.text })),
          reqs: t.requirements.map((r: any) => ({ id: r.id, title: r.title, verdict: v.reqs[r.id].verdict, reason: v.reqs[r.id].verdict === 'unreviewed' ? '' : v.reqs[r.id].reason })),
        };
        cells.push(cell);
        const L = labs.get(m.key)!;
        L.assigned++;
        if (submitted) { L.submitted++; L.scores.push(v.score); }
        if (onTime) L.on_time++;
        if (cell.late) L.late++;
        if (!submitted) L.not_started++;
        if (cell.overdue) L.overdue++;
        if (v.reviewed) L.reviewed++;
        if (v.status === 'submitted') L.waiting_review++;
        if (v.status === 'done') L.done++;
        if (v.reviewed) for (const r of cell.reqs) if (r.verdict === 'missing' || r.verdict === 'partial') (L.miss[r.id] ||= { title: r.title, count: 0 }).count++;
      }
      const dueCells = cells.filter((c) => c.due || c.submitted);
      const prep = prepPart(row.user_id);
      const flags = cells.flatMap((c) => c.flags);
      const lastLab = cells.map((c) => c.last).filter(Boolean).sort().pop() || null;
      const s: ReportStudent = {
        key: row.id, roll: row.roll_no || '', name: row.name || '', email: row.email || '', class_name: cls.name, class_id: cls.id, teacher: teacherName(cls),
        roster_status: row.status, joined_at: row.joined_at || null, repo: rec?.repo ?? null, verified: isVerified(rec),
        labs_assigned: cells.length, labs_due: cells.filter((c) => c.due).length,
        submitted: cells.filter((c) => c.submitted).length, on_time: cells.filter((c) => c.on_time).length, late: cells.filter((c) => c.late).length,
        reviewed: cells.filter((c) => c.reviewed).length, done: cells.filter((c) => c.status === 'done').length,
        overdue: cells.filter((c) => c.overdue).length, overdue_codes: cells.filter((c) => c.overdue).map((c) => labs.get(c.lab)!.code),
        lab_score: avg(dueCells.map((c) => c.score)), commits: repoCommits.length, commit_days: new Set(repoCommits.map((c) => istDay(c.at))).size,
        ...prep,
        last_activity: [lastLab ? istDay(lastLab) : null, prep.last_prep].filter(Boolean).sort().pop() || null,
        flags: flags.length, integrity_flags: flags.filter((f) => INTEGRITY.has(f.kind)).length,
        status: 'On track', cells,
      };
      students.push(s);
    }
  }

  // Admin, whole program: Wipro learners who are not in any lab class still did lessons and tests.
  if (withLearners) {
    const inClass = new Set(p.roster.filter((r) => r.status === 'active' && classes.some((c) => c.id === r.class_id)).map((r) => r.user_id));
    const ids = new Set<string>([...progressBy.keys(), ...attemptsBy.keys()]);
    for (const id of ids) {
      if (inClass.has(id)) continue;
      const prog = progressBy.get(id);
      if (!attemptsBy.has(id) && !(prog?.lessons_done || []).length && !(prog?.activity_days || []).length) continue;
      const usr = users.get(id);
      const prep = prepPart(id);
      students.push({
        key: id, roll: '', name: usr?.name || '', email: usr?.email || '', class_name: 'No lab class', class_id: null, teacher: '',
        roster_status: 'learner', joined_at: prog?.started_at || null, repo: null, verified: false,
        labs_assigned: 0, labs_due: 0, submitted: 0, on_time: 0, late: 0, reviewed: 0, done: 0, overdue: 0, overdue_codes: [], lab_score: null, commits: 0, commit_days: 0,
        ...prep, last_activity: prep.last_prep, flags: 0, integrity_flags: 0, status: 'On track', cells: [],
      });
    }
  }

  // Status labels.
  for (const s of students) {
    const anything = s.submitted || s.lessons_done || s.tests_taken;
    s.status = s.roster_status === 'invited' || s.roster_status === 'pending' ? 'Not joined'
      : !anything ? 'Not started'
      : s.overdue >= 2 || (s.labs_due > 0 && (s.lab_score ?? 0) < 40) || (s.readiness != null && s.readiness < 40 && s.class_id === null) ? 'Behind'
      : 'On track';
  }

  const labList = [...labs.values()].sort((a, b) => a.order - b.order || a.due.localeCompare(b.due)).map(({ order, miss, scores, ...L }) => {
    const top = Object.entries(miss).sort((a, b) => b[1].count - a[1].count)[0];
    return { ...L, avg_score: avg(scores), submit_rate: pct(L.submitted, L.assigned), most_missed: top ? { id: top[0], title: top[1].title, count: top[1].count, of: L.reviewed } : null };
  });
  if (!sections.length) sections = MILESTONES.map((m) => ({ key: m.key, name: m.name }));

  // Milestones: every student × lab cell, grouped.
  const allCells = students.flatMap((s) => s.cells);
  const milestones = [...MILESTONES.map((m) => m.key as string), ''].map((key) => {
    const ls = labList.filter((l) => l.milestone === key);
    const cs = allCells.filter((c) => ls.some((l) => l.key === c.lab));
    return { key, name: key ? MILESTONE_NAME[key] : 'Other tasks', labs: ls.length, cells: cs.length,
      done: cs.filter((c) => c.status === 'done').length, reviewed: cs.filter((c) => c.status === 'progress').length,
      submitted: cs.filter((c) => c.status === 'submitted' || c.status === 'unverified').length,
      not_started: cs.filter((c) => !c.submitted).length, overdue: cs.filter((c) => c.overdue).length };
  }).filter((m) => m.labs);

  const labStudents = students.filter((s) => s.class_id);
  const joined = labStudents.filter((s) => s.roster_status === 'active');
  const m1Labs = labList.filter((l) => l.milestone === 'm1').map((l) => l.key);
  const funnel = [
    { label: 'Invited', count: labStudents.length },
    { label: 'Joined', count: joined.length },
    { label: 'Repo linked', count: joined.filter((s) => s.repo).length },
    { label: 'Repo verified', count: joined.filter((s) => s.verified).length },
    { label: 'First lab pushed', count: joined.filter((s) => s.submitted > 0).length },
    ...(m1Labs.length ? [{ label: 'All M1 labs pushed', count: joined.filter((s) => m1Labs.every((k) => s.cells.some((c) => c.lab === k && c.submitted))).length }] : []),
  ];

  // Activity, last 60 days up to today.
  const testsByDay = new Map<string, number>();
  const prepByDay = new Map<string, number>();
  const covered = new Set(students.map((s) => (s.class_id ? p.roster.find((r) => r.id === s.key)?.user_id : s.key)).filter(Boolean));
  for (const [uid, list] of attemptsBy) if (covered.has(uid)) for (const a of list) { const d = istDay(a.submittedAt || a.updated_at); testsByDay.set(d, (testsByDay.get(d) || 0) + 1); }
  for (const [uid, prog] of progressBy) if (covered.has(uid)) for (const d of prog.activity_days || []) prepByDay.set(d, (prepByDay.get(d) || 0) + 1);
  const days = [...commitDays.keys(), ...testsByDay.keys(), ...prepByDay.keys()].filter((d) => d <= today).sort();
  const earliest = istDay(now.getTime() - 59 * DAY);
  const start = !days.length ? today : days[0] > earliest ? days[0] : earliest;
  const nextDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + DAY).toISOString().slice(0, 10);
  const activity: WiproReport['activity'] = [];
  for (let d = start; d <= today; d = nextDay(d)) {
    activity.push({ date: d, commits: commitDays.get(d)?.commits || 0, lab_students: commitDays.get(d)?.who.size || 0, prep_students: prepByDay.get(d) || 0, tests: testsByDay.get(d) || 0 });
  }

  const scored = joined.filter((s) => s.lab_score != null);
  const score_bands = [['0–19', 0, 19], ['20–39', 20, 39], ['40–59', 40, 59], ['60–79', 60, 79], ['80–100', 80, 100]]
    .map(([label, lo, hi]) => ({ label: String(label), count: scored.filter((s) => s.lab_score! >= (lo as number) && s.lab_score! <= (hi as number)).length }));

  const withPrep = students.filter((s) => s.readiness != null && (s.lessons_done || s.tests_taken));
  const summary: Record<string, number | null> = {
    classes: classes.length, invited: labStudents.length, joined: joined.length, learners_outside_labs: students.length - labStudents.length,
    repo_linked: joined.filter((s) => s.repo).length, repo_verified: joined.filter((s) => s.verified).length,
    labs_in_program: labList.length, labs_due: labList.filter((l) => l.due < today).length,
    submissions: allCells.filter((c) => c.submitted).length, possible_submissions: allCells.length,
    waiting_review: allCells.filter((c) => c.status === 'submitted').length, reviewed: allCells.filter((c) => c.reviewed).length,
    done: allCells.filter((c) => c.status === 'done').length, overdue: allCells.filter((c) => c.overdue).length,
    avg_lab_score: avg(scored.map((s) => s.lab_score!)), on_track: students.filter((s) => s.status === 'On track').length,
    behind: students.filter((s) => s.status === 'Behind').length, not_started: students.filter((s) => s.status === 'Not started').length,
    not_joined: students.filter((s) => s.status === 'Not joined').length,
    avg_readiness: avg(withPrep.map((s) => s.readiness!)), avg_lessons: avg(students.filter((s) => s.lessons_total).map((s) => pct(s.lessons_done, s.lessons_total))),
    tests_taken: students.reduce((n, s) => n + s.tests_taken, 0), avg_mock_best: avg(students.filter((s) => s.mock_best != null).map((s) => s.mock_best!)),
    commits: labStudents.reduce((n, s) => n + s.commits, 0), integrity_flags: students.reduce((n, s) => n + s.integrity_flags, 0),
  };

  // Plain-English findings.
  const findings: string[] = [];
  const S = summary as Record<string, number>;
  if (labStudents.length) findings.push(`${S.joined} of ${S.invited} invited students have joined; ${funnel[4].count} (${pct(funnel[4].count, S.joined)}%) have pushed at least one lab.`);
  if (S.possible_submissions) findings.push(`${S.submissions} of ${S.possible_submissions} possible lab submissions are in (${pct(S.submissions, S.possible_submissions)}%); ${S.overdue} are past their due date with nothing pushed.`);
  if (S.waiting_review) findings.push(`${S.waiting_review} submissions are waiting for the teacher's review. Scores stay low until requirements are marked.`);
  const dueLabs = labList.filter((l) => l.due < today && l.assigned);
  const weakest = [...dueLabs].sort((a, b) => a.submit_rate - b.submit_rate)[0];
  if (weakest) findings.push(`Lowest submission rate among due labs: ${weakest.code} "${weakest.title}" at ${weakest.submit_rate}% (${weakest.submitted} of ${weakest.assigned}).`);
  const missed = labList.filter((l) => l.most_missed && l.most_missed.of >= 3).sort((a, b) => b.most_missed!.count / b.most_missed!.of - a.most_missed!.count / a.most_missed!.of)[0];
  if (missed) findings.push(`Most missed requirement: ${missed.code} ${missed.most_missed!.id}, missed or partly met by ${missed.most_missed!.count} of ${missed.most_missed!.of} reviewed students: "${missed.most_missed!.title.slice(0, 120)}".`);
  if (S.avg_lab_score != null) findings.push(`Average lab score of joined students: ${S.avg_lab_score}/100 (due labs not pushed count as 0).`);
  if (S.avg_readiness != null) findings.push(`Average Wipro readiness: ${S.avg_readiness}/100 across ${withPrep.length} students with lessons or tests.`);
  const secAvg = sections.map((sec) => ({ sec, a: avg(students.map((s) => s.sections[sec.key]).filter((x): x is number => x != null)) })).filter((x) => x.a != null);
  if (secAvg.length >= 2) {
    const lo = secAvg.reduce((m, x) => (x.a! < m.a! ? x : m)); const hi = secAvg.reduce((m, x) => (x.a! > m.a! ? x : m));
    findings.push(`Strongest test section: ${hi.sec.name} (${hi.a}%). Weakest: ${lo.sec.name} (${lo.a}%).`);
  }
  const allDue = joined.filter((s) => s.labs_due && s.cells.filter((c) => c.due).every((c) => c.submitted) && s.readiness != null);
  const someMissing = joined.filter((s) => s.labs_due && s.cells.some((c) => c.overdue) && s.readiness != null);
  if (allDue.length >= 3 && someMissing.length >= 3) findings.push(`Students with every due lab pushed average ${avg(allDue.map((s) => s.readiness!))} readiness, against ${avg(someMissing.map((s) => s.readiness!))} for students with overdue labs.`);
  if (S.integrity_flags) findings.push(`${S.integrity_flags} integrity flags (bulk commits, backdated commits, similar code or a claimed repo) need a look; see the Action list.`);
  if (S.behind) findings.push(`${S.behind} students are Behind (2+ overdue labs or a lab score under 40) and ${S.not_started} have not started anything.`);

  // Action list.
  const actions: WiproReport['actions'] = [];
  const who = (s: ReportStudent) => `${s.name}${s.roll ? ` (${s.roll})` : ''}`;
  for (const s of students) {
    if (s.status === 'Not joined') actions.push({ kind: 'Not joined', who: who(s), class_name: s.class_name, detail: `Invited ${s.email}; has not accepted the invite.` });
    else if (s.class_id && !s.repo) actions.push({ kind: 'No repo linked', who: who(s), class_name: s.class_name, detail: 'Joined but has not linked a GitHub repo.' });
    else if (s.class_id && s.commits && !s.verified) actions.push({ kind: 'Repo not verified', who: who(s), class_name: s.class_name, detail: 'PULSE.txt verification code missing, so work does not count yet.' });
    if (s.overdue) actions.push({ kind: 'Overdue labs', who: who(s), class_name: s.class_name, detail: `${s.overdue} overdue: ${s.overdue_codes.join(', ')}` });
    if (s.status === 'Not started' && s.class_id) actions.push({ kind: 'Not started', who: who(s), class_name: s.class_name, detail: 'No lab, lesson or test yet.' });
    for (const c of s.cells) for (const f of c.flags) if (INTEGRITY.has(f.kind)) actions.push({ kind: 'Integrity flag', who: who(s), class_name: s.class_name, detail: `${labs.get(c.lab)?.code}: ${f.text}` });
  }
  for (const l of labList) if (l.waiting_review) actions.push({ kind: 'Waiting for review', who: '', class_name: '', detail: `${l.code} ${l.title}: ${l.waiting_review} submission${l.waiting_review > 1 ? 's' : ''} not reviewed` });

  return {
    generated_at: nowIso, today, scope: opts.classId ? classes[0].name : classes.length === 1 && !withLearners ? classes[0].name : 'All Wipro iOS classes',
    classes: classes.map((c) => ({ id: c.id, name: c.name, teacher: teacherName(c), students: p.roster.filter((r) => r.class_id === c.id && r.status === 'active').length })),
    sections, labs: labList, students: students.sort((a, b) => a.class_name.localeCompare(b.class_name) || a.roll.localeCompare(b.roll, undefined, { numeric: true }) || a.name.localeCompare(b.name)),
    milestones, funnel, activity, score_bands, summary, findings, actions,
  };
}
