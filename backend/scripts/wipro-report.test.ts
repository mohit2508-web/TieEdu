// ============================================================================
// Wipro iOS lab report (WIPRO_LAB_REPORT_PLAN.md): a fixture class with known
// pushes, marks, lessons and tests → fixed numbers, access rules, read-only
// behaviour, and Excel / CSV / PDF files that open. No live database.
//   npm run test:wipro-report            (add --out <dir> to keep the files)
// ============================================================================
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { seedCompanyProfiles, seedInterviewPrep, seedCompanyTest } from '../src/lib/seed3T';
import { addPack } from '../src/lib/pulse/packs';
import { appointTeacher, PulseError, saveReview } from '../src/lib/pulse/store';
import { buildWiproReport } from '../src/lib/pulse/wiproReport';
import { reportXlsx, reportCsvZip, reportPdf, reportSheets } from '../src/lib/pulse/wiproReportFiles';
import { sheetCsv } from '../src/lib/report/xlsx';
import { PDFDocument } from 'pdf-lib';
import { WIPRO_IOS_SLUG } from '../src/data/wiproIOS';

let pass = 0, fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else { fail++; console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`); }
}
function status(name: string, fn: () => unknown, code: number) {
  try { fn(); fail++; console.log(`FAIL ${name}: allowed`); } catch (e) { check(name, e instanceof PulseError ? e.status : String(e), code); }
}

const NOW = new Date('2026-11-11T12:00:00Z');
const admin = { id: 'adm', role: 'admin', email: 'adm@x.in', name: 'Admin' };
const teach = { id: 't1', role: 'user', email: 't1@x.in', name: 'Teacher One' };
const other = { id: 't2', role: 'user', email: 't2@x.in', name: 'Teacher Two' };
const names = ['Asha', 'Ravi', 'Meena', '=cmd|calc', 'Zoya'];
const db: any = {
  companies: [], skills: [], topics: [], questions: [], assessments: [], attempts: [], prep_progress: [],
  users: [admin, teach, other, ...names.map((n, i) => ({ id: `s${i + 1}`, role: 'user', email: `s${i + 1}@x.in`, name: n })), { id: 'lone', role: 'user', email: 'lone@x.in', name: 'Lone Learner' }],
};
seedCompanyProfiles(db, false, [WIPRO_IOS_SLUG]);
seedInterviewPrep(db);
seedCompanyTest(db, 'wipro-ios');
appointTeacher(db, admin, 't1@x.in');
appointTeacher(db, admin, 't2@x.in');

db.pulse.classes.push({ id: 'cls1', name: 'iOS batch A', owner_id: 't1', co_teachers: [] }, { id: 'cls2', name: 'C batch', owner_id: 't2', co_teachers: [] });
addPack(db, db.pulse.classes[0], 'wipro-ios', 't1');
// s1–s4 active, s5 invited only.
names.forEach((n, i) => db.pulse.roster.push({ id: `r${i + 1}`, class_id: 'cls1', user_id: i < 4 ? `s${i + 1}` : null, name: n, email: `s${i + 1}@x.in`, roll_no: String(101 + i), status: i < 4 ? 'active' : 'invited', joined_at: i < 4 ? '2026-11-02T05:00:00Z' : null }));

const task = (folder: string) => db.pulse.tasks.find((t: any) => t.folder === folder);
const commit = (at: string, folder: string, add = 20) => ({ sha: at.slice(5, 13).replace(/\D/g, ''), at, pushed: at, message: 'm', add, del: 0, files: [{ p: `${folder}/main.swift`, a: add, d: 0 }] });
const repo = (rid: string, name: string, commits: any[], verified = true) => db.pulse.repos.push({
  id: `repo_${rid}`, class_id: 'cls1', roster_id: rid, repo: name, verify_code: 'PULSE-X', verified, verified_by_teacher: false, verified_owner: name.split('/')[0],
  linked_at: '2026-11-02T06:00:00Z', last_sync_at: '2026-11-11T00:00:00Z', sync_error: null,
  snap: { head_sha: 'h', synced_at: '2026-11-11T00:00:00Z', workflow_ok: true, dirs: [...new Set(commits.map((c) => c.files[0].p.split('/')[0]))], commits: commits.sort((a, b) => b.at.localeCompare(a.at)) },
});
// Asha: 1A on time + 1B on time (both reviewed); Ravi: 1A late; Meena: repo linked, nothing pushed; s4: no repo.
repo('r1', 'asha/ios', [commit('2026-11-04T10:00:00Z', 'lab-1a'), commit('2026-11-05T10:00:00Z', 'lab-1a'), commit('2026-11-05T12:00:00Z', 'lab-1b')]);
repo('r2', 'ravi/ios', [commit('2026-11-08T10:00:00Z', 'lab-1a')]);
repo('r3', 'meena/ios', []);
const r1 = db.pulse.roster[0], r2 = db.pulse.roster[1];
const t1a = task('lab-1a'), t1b = task('lab-1b');
saveReview(db, t1a, r1, { verdicts: Object.fromEntries(t1a.requirements.map((r: any) => [r.id, 'met'])) }, 't1');
saveReview(db, t1b, r1, { verdicts: { R1: 'met', R2: 'missing' }, reasons: { R2: 'No validation' } }, 't1');
saveReview(db, t1a, r2, { verdicts: { R1: 'partial' } }, 't1');
db.pulse.results.find((x: any) => x.task_id === t1a.id && x.roster_id === 'r2').notes = [{ body: 'PRIVATE NOTE' }];

// Lessons + tests.
const company = db.companies.find((c: any) => c.slug === WIPRO_IOS_SLUG);
const lessonIds = (company.modules.find((m: any) => m.items?.length)?.items || []).slice(0, 5).map((x: any) => x.id);
db.prep_progress.push({ user_id: 's1', company_slug: WIPRO_IOS_SLUG, lessons_done: lessonIds, test_date: null, started_at: '2026-11-02', activity_days: ['2026-11-09', '2026-11-10'] });
db.prep_progress.push({ user_id: 'lone', company_slug: WIPRO_IOS_SLUG, lessons_done: lessonIds.slice(0, 2), test_date: null, started_at: '2026-11-05', activity_days: ['2026-11-10'] });
const mock = db.skills.find((s: any) => s.company_slug === WIPRO_IOS_SLUG && s.prep_role !== 'sectional');
const asm = db.assessments.find((a: any) => a.skillId === mock.id);
const topic = db.topics.find((t: any) => t.skillId === mock.id);
db.attempts.push({ id: 'at1', userId: 's1', assessmentId: asm.id, status: 'submitted', score: 64, submittedAt: '2026-11-10T09:00:00Z', topicPerformance: [{ topicId: topic.id, percentage: 64 }] });
db.attempts.push({ id: 'at2', userId: 's1', assessmentId: asm.id, status: 'submitted', score: 78, submittedAt: '2026-11-10T15:00:00Z', topicPerformance: [{ topicId: topic.id, percentage: 78 }] });
db.attempts.push({ id: 'at3', userId: 's2', assessmentId: asm.id, status: 'in_progress', score: 0 });

// ---- access
const before = JSON.stringify(db);
status('a student cannot download the report', () => buildWiproReport(db, { id: 's1', role: 'user' }, { now: NOW }), 403);
status('a teacher with no Wipro class gets 404', () => buildWiproReport(db, other, { now: NOW }), 404);
status('a teacher cannot ask for another class', () => buildWiproReport(db, other, { classId: 'cls1', now: NOW }), 404);
const r = buildWiproReport(db, teach, { now: NOW });
check('report is read-only (store unchanged)', JSON.stringify(db) === before, true);
check('teacher scope: own class only, no outside learners', [r.classes.map((c) => c.id), r.students.length], [['cls1'], 5]);
check('33 labs in handbook order', [r.labs.length, r.labs[0].code, r.labs[1].code], [33, '1A', '1B']);

// ---- numbers
const L1a = r.labs[0];
check('lab 1A: 4 assigned, 2 pushed, 1 on time, 1 late, 2 overdue', [L1a.assigned, L1a.submitted, L1a.on_time, L1a.late, L1a.overdue, L1a.submit_rate], [4, 2, 1, 1, 2, 50]);
check('lab 1A reviewed 2, done 1', [L1a.reviewed, L1a.done], [2, 1]);
check('lab 1B: most missed is R2', r.labs[1].most_missed?.id, 'R2');
const asha = r.students.find((s) => s.name === 'Asha')!;
const ravi = r.students.find((s) => s.name === 'Ravi')!;
check('Asha: pushed 2, done 1, verified, 3 commits on 2 days', [asha.submitted, asha.done, asha.verified, asha.commits, asha.commit_days], [2, 1, true, 3, 2]);
check('Asha: 5 lessons, 2 tests, mock best 78 last 78', [asha.lessons_done, asha.tests_taken, asha.mock_best, asha.mock_last], [5, 2, 78, 78]);
check('Asha has a readiness score', typeof asha.readiness, 'number');
check('in-progress attempts are not counted', ravi.tests_taken, 0);
check('statuses (most M1 labs are overdue by 11 Nov)', r.students.map((s) => s.status), ['Behind', 'Behind', 'Not started', 'Not started', 'Not joined']);
check('funnel', r.funnel.map((f) => f.count), [5, 4, 3, 3, 2, 0]);
check('summary', [r.summary.joined, r.summary.submissions, r.summary.waiting_review, r.summary.not_joined], [4, 3, 0, 1]);
check('activity ends today and has the push days', [r.activity[r.activity.length - 1].date, r.activity.find((a) => a.date === '2026-11-05')?.commits], ['2026-11-11', 2]);
check('findings written', r.findings.length >= 4, true);
check('action list has not-joined, no-repo and overdue rows', ['Not joined', 'No repo linked', 'Overdue labs'].every((k) => r.actions.some((a) => a.kind === k)), true);
check('teacher private notes never in the report', JSON.stringify(r).includes('PRIVATE NOTE'), false);

const all = buildWiproReport(db, admin, { now: NOW });
check('admin: learners outside a lab class are added', all.students.some((s) => s.name === 'Lone Learner' && s.class_name === 'No lab class' && s.lessons_done === 2), true);
check('admin, one class: no outside learners', buildWiproReport(db, admin, { classId: 'cls1', now: NOW }).students.length, 5);

// ---- files
const unzip = (buf: Buffer) => {
  const out: Record<string, string> = {};
  for (let i = 0; i < buf.length - 4; i++) {
    if (buf.readUInt32LE(i) !== 0x04034b50) continue;
    const size = buf.readUInt32LE(i + 18), nameLen = buf.readUInt16LE(i + 26), extra = buf.readUInt16LE(i + 28);
    const name = buf.slice(i + 30, i + 30 + nameLen).toString();
    out[name] = zlib.inflateRawSync(buf.slice(i + 30 + nameLen + extra, i + 30 + nameLen + extra + size)).toString();
    i += 30 + nameLen + extra + size - 1;
  }
  return out;
};
(async () => {
  const xlsx = reportXlsx(all);
  const parts = unzip(xlsx);
  check('xlsx has workbook, styles and 9 sheets', ['xl/workbook.xml', 'xl/styles.xml', '[Content_Types].xml'].every((k) => k in parts) && Object.keys(parts).filter((k) => k.startsWith('xl/worksheets/')).length, 9);
  check('xlsx sheet text is escaped', parts['xl/worksheets/sheet2.xml'].includes('=cmd|calc') && !/<t[^>]*>[^<]*&(?!amp;|lt;|gt;|quot;)/.test(parts['xl/worksheets/sheet2.xml']), true);
  const csv = unzip(reportCsvZip(all));
  check('csv zip: one file per sheet', Object.keys(csv).sort(), ['Action-list.csv', 'Activity.csv', 'Labs.csv', 'Matrix.csv', 'Milestones.csv', 'Requirements.csv', 'Students.csv', 'Summary.csv', 'Tests.csv']);
  check('csv: formula-looking names are defused', csv['Students.csv'].includes(`"'=cmd|calc"`), true);
  check('csv has a header and one row per student', sheetCsv(reportSheets(all)[1]).split('\r\n').length, all.students.length + 1);
  const pdf = await reportPdf(all);
  check('pdf opens and has 7+ pages', (await PDFDocument.load(pdf)).getPageCount() >= 7, true);
  const empty = await reportPdf(buildWiproReport({ users: [admin], pulse: {} }, admin, { now: NOW }));
  check('empty program still renders a pdf', empty.slice(0, 4).toString(), '%PDF');

  const outIdx = process.argv.indexOf('--out');
  if (outIdx > 0) {
    const dir = process.argv[outIdx + 1];
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'wipro-lab-report.xlsx'), xlsx);
    fs.writeFileSync(path.join(dir, 'wipro-lab-report-csv.zip'), reportCsvZip(all));
    fs.writeFileSync(path.join(dir, 'wipro-lab-report.pdf'), pdf);
    console.log(`files written to ${dir}`);
  }
  console.log(`\nwipro report: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
