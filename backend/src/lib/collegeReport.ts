/**
 * Management / NAAC report for a college (E2), as a PDF.
 *
 * The rule (set by the platform owner): aggregates only. No student names,
 * roll numbers or per-student rows ever enter the report; it is downloadable
 * by Management, the T&P Head and the Data Officer (placement.reports.read).
 * On top of that, any branch with fewer than MIN_GROUP students is folded into
 * "Other branches", because a tiny group's totals can identify a student.
 *
 * Sections: who is on TieEdu and how ready they are (the batch-readiness
 * segments the TPO already sees), the same by branch, practice in the chosen
 * period, and placement results by year as recorded by the placement cell
 * (lib/campusIntel). It is offered as supporting evidence for NAAC Criterion 5
 * (Student Support and Progression); it does not claim to compute NAAC metrics.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { BatchReadiness, Segment } from './batchReadiness';
import { historyOf } from './campusIntel';
import { istDate } from './streak';
import { yearOnYear } from './yearOnYear';

export const MIN_GROUP = 5;
const SEGS: Segment[] = ['not_started', 'at_risk', 'in_progress', 'ready'];
const SEG_LABEL: Record<Segment, string> = { not_started: 'Not started', at_risk: 'At risk', in_progress: 'In progress', ready: 'Ready' };

export interface ReportInput { collegeId: string; collegeName: string; from: string; to: string; batch: string | null }
export interface BranchRow { branch: string; students: number; segments: Record<Segment, number>; avg_readiness: number | null }
export interface CollegeReport {
  college: string;
  generated: string;
  period: { from: string; to: string };
  batch: string | null;
  students: number;
  active_in_period: number;
  segments: Record<Segment, number>;
  branches: BranchRow[];
  practice: { tests: number; lessons: number; course_certificates: number; skill_certificates: number; practice_days: number };
  results: Array<{ year: number; companies: number; selected: number; change_pct: number | null; detail: Array<{ company: string; selected: number | null }> }>;
}

const inPeriod = (iso: unknown, from: string, to: string) => {
  if (!iso) return false;
  const t = Date.parse(String(iso));
  if (Number.isNaN(t)) return false;
  const d = istDate(new Date(t));
  return d >= from && d <= to;
};

export function parsePeriod(rawFrom: unknown, rawTo: unknown, now = new Date()): { from: string; to: string } {
  const ok = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
  const to = ok(rawTo) ? String(rawTo) : istDate(now);
  // Default: the last academic year's worth, so a NAAC annual submission needs no fiddling.
  const from = ok(rawFrom) ? String(rawFrom) : istDate(new Date(Date.parse(to) - 364 * 86_400_000));
  if (from > to) throw new Error('The start date is after the end date.');
  return { from, to };
}

export function buildCollegeReport(db: any, batch: BatchReadiness, input: ReportInput, now = new Date()): CollegeReport {
  const students = batch.students.filter((s) => !input.batch || s.batch === input.batch);
  const ids = new Set(students.map((s) => s.user_id));
  const segments = Object.fromEntries(SEGS.map((g) => [g, students.filter((s) => s.segment === g).length])) as Record<Segment, number>;

  const byBranch = new Map<string, typeof students>();
  for (const s of students) {
    const b = s.branch || 'Not recorded';
    byBranch.set(b, [...(byBranch.get(b) || []), s]);
  }
  const row = (branch: string, list: typeof students): BranchRow => {
    const avgs = list.map((s) => s.average).filter((v): v is number => v !== null);
    return {
      branch,
      students: list.length,
      segments: Object.fromEntries(SEGS.map((g) => [g, list.filter((s) => s.segment === g).length])) as Record<Segment, number>,
      avg_readiness: avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : null,
    };
  };
  const big: BranchRow[] = [];
  const small: typeof students = [];
  for (const [b, list] of [...byBranch.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (list.length >= MIN_GROUP) big.push(row(b, list));
    else small.push(...list);
  }
  // Folded only when it is itself big enough; otherwise those students count in the totals alone.
  if (small.length >= MIN_GROUP) big.push(row('Other branches', small));

  const { from, to } = input;
  const attempts = (db.attempts || []).filter((a: any) => ids.has(a.userId) && (a.status === 'submitted' || a.status === 'timed_out') && inPeriod(a.submittedAt || a.updated_at, from, to));
  const lessons = (db.xp_ledger || []).filter((e: any) => ids.has(e.user_id) && e.reason === 'lesson_complete' && inPeriod(e.created_at, from, to));
  const courseCerts = (db.certificates || []).filter((c: any) => ids.has(c.user_id) && c.status === 'active' && inPeriod(c.issued_at, from, to));
  const skillCerts = (db.skillCertificates || []).filter((c: any) => ids.has(c.userId) && c.status !== 'revoked' && inPeriod(c.issuedAt || c.issued_at || c.createdAt, from, to));
  const days = new Set<string>();
  const active = new Set<string>();
  for (const s of db.user_streaks || []) {
    if (!ids.has(s.user_id)) continue;
    for (const d of s.days || []) if (d >= from && d <= to) { days.add(`${s.user_id}:${d}`); active.add(s.user_id); }
  }
  for (const a of attempts) active.add(a.userId);
  for (const e of lessons) active.add(e.user_id);

  const companies = new Map<string, string>((db.companies || []).map((c: any) => [c.slug, c.name]));
  const years = new Map<number, Array<{ company: string; selected: number | null }>>();
  for (const h of historyOf(db).filter((x) => x.college_id === input.collegeId)) {
    years.set(h.year, [...(years.get(h.year) || []), { company: companies.get(h.company_slug) || h.company_slug, selected: h.selected }]);
  }
  // Change between comparable years, computed once in lib/yearOnYear.
  const yoy = new Map(yearOnYear(db, input.collegeId).years.map((y) => [y.year, y.change_pct]));
  const results = [...years.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, detail]) => ({
      year,
      companies: detail.length,
      selected: detail.reduce((n, d) => n + (d.selected || 0), 0),
      change_pct: yoy.get(year) ?? null,
      detail: detail.sort((a, b) => (b.selected || 0) - (a.selected || 0) || a.company.localeCompare(b.company)),
    }));

  return {
    college: input.collegeName,
    generated: now.toISOString(),
    period: { from, to },
    batch: input.batch,
    students: students.length,
    active_in_period: active.size,
    segments,
    branches: big,
    practice: { tests: attempts.length, lessons: lessons.length, course_certificates: courseCerts.length, skill_certificates: skillCerts.length, practice_days: days.size },
    results,
  };
}

// --- PDF ----------------------------------------------------------------------------------

/** pdf-lib's standard fonts are WinAnsi; same normalisation as the certificate renderers. */
function ascii(str: string): string {
  return String(str || '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[ ]/g, ' ')
    .replace(/[^\x20-\x7E]/g, '');
}
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '-');
const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

const A4: [number, number] = [595.28, 841.89];
const M = 48;
const INK = rgb(0.11, 0.13, 0.2);
const MUTED = rgb(0.42, 0.45, 0.52);
const LINE = rgb(0.86, 0.87, 0.9);
const ACCENT = rgb(0.91, 0.36, 0.13);

export async function renderCollegeReportPdf(r: CollegeReport): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(ascii(`${r.college} - placement readiness report`));
  pdf.setAuthor('TieEdu');
  pdf.setSubject('Aggregate placement readiness for management and NAAC (Criterion 5)');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = pdf.addPage(A4);
  let y = A4[1] - M;
  const width = A4[0] - 2 * M;
  const ensure = (h: number) => {
    if (y - h < M + 30) { page = pdf.addPage(A4); y = A4[1] - M; }
  };
  const text = (s: string, x: number, size: number, f: PDFFont = font, color = INK) => page.drawText(ascii(s), { x, y, size, font: f, color });
  const para = (s: string, size = 10, color = MUTED) => {
    const words = ascii(s).split(/\s+/);
    let line = '';
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) > width) { ensure(size + 4); text(line, M, size, font, color); y -= size + 4; line = w; } else line = next;
    }
    if (line) { ensure(size + 4); text(line, M, size, font, color); y -= size + 4; }
  };
  const heading = (s: string) => { y -= 14; ensure(30); text(s, M, 13, bold); y -= 8; page.drawLine({ start: { x: M, y }, end: { x: M + width, y }, thickness: 0.8, color: LINE }); y -= 16; };
  const table = (cols: Array<{ label: string; w: number; right?: boolean }>, rows: string[][]) => {
    const draw = (cells: string[], f: PDFFont, color = INK) => {
      ensure(16);
      let x = M;
      cells.forEach((c, i) => {
        const s = ascii(c);
        const cw = cols[i].w * width;
        const tx = cols[i].right ? x + cw - f.widthOfTextAtSize(s, 9.5) - 4 : x;
        page.drawText(s, { x: tx, y, size: 9.5, font: f, color });
        x += cw;
      });
      y -= 15;
    };
    draw(cols.map((c) => c.label), bold, MUTED);
    for (const r0 of rows) draw(r0, font);
  };

  // Title block
  page.drawRectangle({ x: M, y: y - 4, width: 36, height: 4, color: ACCENT });
  y -= 22;
  text(r.college, M, 20, bold);
  y -= 22;
  text('Placement readiness report', M, 13, font, MUTED);
  y -= 18;
  text(`Period ${fmtDate(r.period.from)} to ${fmtDate(r.period.to)}${r.batch ? `  |  Batch ${r.batch}` : '  |  All batches'}  |  Generated ${fmtDate(r.generated.slice(0, 10))}`, M, 9.5, font, MUTED);
  y -= 16;
  para('Aggregate figures only: this report contains no student names, roll numbers or individual results. Branches with fewer than 5 students are combined so that no individual can be identified. Readiness uses the same records students see on TieEdu. Suitable as supporting evidence for NAAC Criterion 5 (Student Support and Progression).', 9);

  heading('1. Students and readiness');
  table(
    [{ label: '', w: 0.5 }, { label: 'Students', w: 0.25, right: true }, { label: 'Share', w: 0.25, right: true }],
    [
      ['Students of the college on TieEdu', String(r.students), ''],
      ['Practised during the period', String(r.active_in_period), pct(r.active_in_period, r.students)],
      ...SEGS.map((g) => [`Readiness: ${SEG_LABEL[g]}`, String(r.segments[g]), pct(r.segments[g], r.students)]),
    ]
  );
  y -= 4;
  para('Ready: average readiness 70% or more across target companies. At risk: below 50%, or no practice for 14 days. Not started: no tests or lessons yet.', 8.5);

  heading('2. Readiness by branch');
  if (!r.branches.length) para('No branch has 5 or more students yet, so branch figures are not shown.', 10);
  else table(
    [{ label: 'Branch', w: 0.22 }, { label: 'Students', w: 0.11, right: true }, { label: 'Not started', w: 0.14, right: true }, { label: 'At risk', w: 0.11, right: true }, { label: 'In progress', w: 0.14, right: true }, { label: 'Ready', w: 0.1, right: true }, { label: 'Avg readiness', w: 0.18, right: true }],
    r.branches.map((b) => [b.branch, String(b.students), String(b.segments.not_started), String(b.segments.at_risk), String(b.segments.in_progress), String(b.segments.ready), b.avg_readiness === null ? '-' : `${b.avg_readiness}%`])
  );

  heading('3. Practice during the period');
  table(
    [{ label: '', w: 0.7 }, { label: 'Total', w: 0.3, right: true }],
    [
      ['Skill tests completed', String(r.practice.tests)],
      ['Lessons completed', String(r.practice.lessons)],
      ['Student practice days', String(r.practice.practice_days)],
      ['Course certificates earned', String(r.practice.course_certificates)],
      ['Skill certificates earned', String(r.practice.skill_certificates)],
    ]
  );

  heading('4. Placement results by year');
  if (!r.results.length) para('No placement results have been recorded by the placement cell yet. They are added under Campus intel in the TPO portal.', 10);
  else {
    table(
      [{ label: 'Year', w: 0.2 }, { label: 'Companies recorded', w: 0.28, right: true }, { label: 'Students selected', w: 0.28, right: true }, { label: 'Change', w: 0.24, right: true }],
      r.results.map((x) => [String(x.year), String(x.companies), String(x.selected), x.change_pct === null ? '-' : `${x.change_pct > 0 ? '+' : ''}${x.change_pct}%`])
    );
    for (const x of r.results.slice(0, 3)) {
      y -= 6;
      ensure(20);
      text(`${x.year}: by company`, M, 10, bold);
      y -= 15;
      table([{ label: 'Company', w: 0.7 }, { label: 'Selected', w: 0.3, right: true }], x.detail.map((d) => [d.company, d.selected === null ? 'not recorded' : String(d.selected)]));
    }
    para('Results as recorded by the college placement cell in TieEdu. Change compares students selected with the previous year that has recorded numbers; companies with no number recorded are not counted.', 8.5);
  }

  // Footer on every page
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(ascii(`${r.college} | TieEdu placement readiness report | Page ${i + 1} of ${pages.length}`), { x: M, y: 28, size: 8, font, color: MUTED });
  });
  return pdf.save();
}
