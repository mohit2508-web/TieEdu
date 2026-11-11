/**
 * Wipro lab report → files: Excel (.xlsx), CSV bundle (.zip) and PDF with charts.
 * The model comes from buildWiproReport (wiproReport.ts); this file only lays it out.
 *
 * Chart colours follow the validated default data-viz palette (light mode, for
 * print): blue #2a78d6 and orange #eb6834 as the first two categorical slots, a
 * neutral grey for "not started", the blue ramp for the ordinal funnel, ink for
 * all text, and one y-axis per chart.
 */
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { toXlsx, sheetCsv, type Sheet, type Cell } from '../report/xlsx';
import { zip } from '../report/zip';
import { MILESTONE_NAME, type WiproReport, type ReportStudent } from './wiproReport';

// ---------------------------------------------------------------------------
// Sheets (Excel and CSV share them)
// ---------------------------------------------------------------------------
const SUMMARY_LABEL: Record<string, string> = {
  classes: 'Lab classes', invited: 'Students invited to a lab class', joined: 'Students joined', learners_outside_labs: 'Wipro learners not in a lab class',
  repo_linked: 'Repos linked', repo_verified: 'Repos verified', labs_in_program: 'Labs in the program', labs_due: 'Labs past their due date',
  submissions: 'Lab submissions (student × lab pushed)', possible_submissions: 'Possible submissions (joined students × labs)',
  waiting_review: 'Submissions waiting for review', reviewed: 'Submissions reviewed', done: 'Labs fully done (all requirements met)',
  overdue: 'Overdue (past due, nothing pushed)', avg_lab_score: 'Average lab score (/100)', on_track: 'Students on track', behind: 'Students behind',
  not_started: 'Students not started', not_joined: 'Students not joined', avg_readiness: 'Average Wipro readiness (/100)',
  avg_lessons: 'Average lessons done (%)', tests_taken: 'Tests taken (all attempts)', avg_mock_best: 'Average best full-mock score (%)',
  commits: 'Commits pushed', integrity_flags: 'Integrity flags',
};
const statusStyle = (s: string) => (s === 'On track' ? 'good' : s === 'Behind' ? 'bad' : s === 'Not joined' || s === 'Not started' ? 'warn' : undefined);
const d10 = (s: string | null) => (s ? s.slice(0, 10) : '');

export function reportSheets(r: WiproReport): Sheet[] {
  const secCols = r.sections.map((s) => ({ header: s.name, width: 18 }));
  const summary: Sheet = {
    name: 'Summary', filter: false,
    intro: [[{ v: 'Wipro iOS lab report', s: 'title' }], [`${r.scope} · generated ${r.generated_at.slice(0, 16).replace('T', ' ')} UTC`], []],
    columns: [{ header: 'Metric', width: 52 }, { header: 'Value', width: 16 }],
    rows: [
      ...Object.entries(r.summary).map(([k, v]) => [SUMMARY_LABEL[k] || k, v] as Cell[]),
      [], [{ v: 'Classes', s: 'bold' }],
      ...r.classes.map((c) => [`${c.name} (teacher: ${c.teacher})`, c.students] as Cell[]),
      [], [{ v: 'Findings', s: 'bold' }],
      ...r.findings.map((f) => [f] as Cell[]),
    ],
  };
  const students: Sheet = {
    name: 'Students', freezeCols: 2,
    columns: [
      { header: 'Roll', width: 10 }, { header: 'Name', width: 24 }, { header: 'Email', width: 28 }, { header: 'Class', width: 20 }, { header: 'Status', width: 12 },
      { header: 'Joined', width: 11 }, { header: 'Repo', width: 30 }, { header: 'Verified', width: 9 },
      { header: 'Labs assigned' }, { header: 'Labs due' }, { header: 'Labs pushed' }, { header: 'On time' }, { header: 'Late' }, { header: 'Overdue' },
      { header: 'Overdue labs', width: 24 }, { header: 'Reviewed' }, { header: 'Done' }, { header: 'Lab score' }, { header: 'Commits' }, { header: 'Commit days' },
      { header: 'Lessons done' }, { header: 'Lessons total' }, { header: 'Tests taken' }, { header: 'Mock best %' }, { header: 'Readiness' }, { header: 'Band', width: 14 },
      { header: 'Last activity', width: 12 }, { header: 'Flags' }, { header: 'Integrity flags' },
    ],
    rows: r.students.map((s) => [s.roll, s.name, s.email, s.class_name, { v: s.status, s: statusStyle(s.status) }, d10(s.joined_at), s.repo, s.class_id ? (s.verified ? 'Yes' : 'No') : '',
      s.labs_assigned, s.labs_due, s.submitted, s.on_time, s.late, { v: s.overdue, s: s.overdue ? 'bad' : undefined }, s.overdue_codes.join(', '), s.reviewed, s.done,
      s.lab_score, s.commits, s.commit_days, s.lessons_done, s.lessons_total, s.tests_taken, s.mock_best, s.readiness, s.band, s.last_activity, s.flags,
      { v: s.integrity_flags, s: s.integrity_flags ? 'warn' : undefined }]),
  };
  const labs: Sheet = {
    name: 'Labs', freezeCols: 2,
    columns: [{ header: 'Code', width: 9 }, { header: 'Lab', width: 40 }, { header: 'Milestone', width: 30 }, { header: 'Kind' }, { header: 'Due', width: 11 },
      { header: 'Assigned' }, { header: 'Pushed' }, { header: 'Submit rate %' }, { header: 'On time' }, { header: 'Late' }, { header: 'Not started' }, { header: 'Overdue' },
      { header: 'Reviewed' }, { header: 'Waiting review' }, { header: 'Done' }, { header: 'Avg score (pushed)' }, { header: 'Most missed requirement', width: 60 }],
    rows: r.labs.map((l) => [l.code, l.title, MILESTONE_NAME[l.milestone] || 'Other', l.kind, l.due, l.assigned, l.submitted,
      { v: l.submit_rate, s: l.due < r.today ? (l.submit_rate >= 75 ? 'good' : l.submit_rate < 40 ? 'bad' : 'warn') : undefined },
      l.on_time, l.late, l.not_started, l.overdue, l.reviewed, { v: l.waiting_review, s: l.waiting_review ? 'warn' : undefined }, l.done, l.avg_score,
      l.most_missed ? `${l.most_missed.id} (${l.most_missed.count}/${l.most_missed.of} reviewed): ${l.most_missed.title}` : '']),
  };
  const inClass = r.students.filter((s) => s.cells.length);
  const matrix: Sheet = {
    name: 'Matrix', freezeCols: 3,
    intro: [['Each cell: the lab score if pushed, "Overdue" if past due with nothing pushed, "-" if not due yet. Green = done, amber = pushed (in review / partly met), red = overdue.'], []],
    columns: [{ header: 'Roll', width: 10 }, { header: 'Name', width: 24 }, { header: 'Class', width: 18 }, ...r.labs.map((l) => ({ header: l.code, width: 9 })), { header: 'Lab score', width: 10 }],
    rows: inClass.map((s) => [s.roll, s.name, s.class_name, ...r.labs.map((l): Cell => {
      const c = s.cells.find((x) => x.lab === l.key);
      if (!c) return '';
      if (c.submitted) return { v: c.score, s: c.status === 'done' ? 'good' : 'warn' };
      return c.overdue ? { v: 'Overdue', s: 'bad' } : { v: '-', s: 'muted' };
    }), s.lab_score]),
  };
  const reqs: Sheet = {
    name: 'Requirements', freezeCols: 2,
    columns: [{ header: 'Roll', width: 10 }, { header: 'Name', width: 24 }, { header: 'Class', width: 18 }, { header: 'Lab', width: 8 }, { header: 'Lab title', width: 30 },
      { header: 'Req', width: 6 }, { header: 'Requirement', width: 60 }, { header: 'Verdict', width: 11 }, { header: "Teacher's reason", width: 40 }],
    rows: inClass.flatMap((s) => s.cells.filter((c) => c.submitted).flatMap((c) => {
      const l = r.labs.find((x) => x.key === c.lab)!;
      return c.reqs.map((q) => [s.roll, s.name, s.class_name, l.code, l.title, q.id, q.title,
        { v: q.verdict, s: q.verdict === 'met' ? 'good' : q.verdict === 'missing' ? 'bad' : q.verdict === 'partial' ? 'warn' : 'muted' }, q.reason] as Cell[]);
    })),
  };
  const tests: Sheet = {
    name: 'Tests', freezeCols: 2,
    intro: [['Section scores are the latest attempt per milestone (section test or the full mock\'s section). Readiness = 60% tests + 25% lessons + 15% consistency, scored on milestones that are due.'], []],
    columns: [{ header: 'Roll', width: 10 }, { header: 'Name', width: 24 }, { header: 'Class', width: 18 }, { header: 'Lessons done' }, { header: 'Lessons total' },
      ...secCols, { header: 'Tests taken' }, { header: 'Mock attempts' }, { header: 'Mock best %' }, { header: 'Mock last %' }, { header: 'Readiness' }, { header: 'Band', width: 14 }],
    rows: r.students.map((s) => [s.roll, s.name, s.class_name, s.lessons_done, s.lessons_total, ...r.sections.map((sec) => s.sections[sec.key] ?? null),
      s.tests_taken, s.mock_attempts, s.mock_best, s.mock_last, s.readiness, s.band]),
  };
  const ms: Sheet = {
    name: 'Milestones', filter: false,
    columns: [{ header: 'Milestone', width: 40 }, { header: 'Labs' }, { header: 'Student × lab' }, { header: 'Done' }, { header: 'Reviewed, partly met' }, { header: 'Pushed, not reviewed' }, { header: 'Not pushed' }, { header: 'Overdue' }],
    rows: r.milestones.map((m) => [m.name, m.labs, m.cells, m.done, m.reviewed, m.submitted, m.not_started, m.overdue]),
  };
  const actions: Sheet = {
    name: 'Action list',
    columns: [{ header: 'What', width: 20 }, { header: 'Student', width: 28 }, { header: 'Class', width: 18 }, { header: 'Detail', width: 80 }],
    rows: r.actions.map((a) => [{ v: a.kind, s: a.kind === 'Integrity flag' || a.kind === 'Overdue labs' ? 'bad' : 'warn' }, a.who, a.class_name, a.detail]),
  };
  const activity: Sheet = {
    name: 'Activity', filter: false,
    columns: [{ header: 'Date (IST)', width: 12 }, { header: 'Commits' }, { header: 'Students pushing' }, { header: 'Students on lessons/tests' }, { header: 'Tests taken' }],
    rows: r.activity.map((a) => [a.date, a.commits, a.lab_students, a.prep_students, a.tests]),
  };
  return [summary, students, labs, matrix, reqs, tests, ms, actions, activity];
}

export const reportXlsx = (r: WiproReport) => toXlsx(reportSheets(r), new Date(r.generated_at));
export const reportCsvZip = (r: WiproReport) =>
  zip(reportSheets(r).map((s) => ({ name: `${s.name.replace(/\s+/g, '-')}.csv`, data: sheetCsv(s) })), new Date(r.generated_at));

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const C = {
  ink: hex('#0b0b0b'), ink2: hex('#52514e'), muted: hex('#8a8983'), grid: hex('#e1e0d9'), axis: hex('#c3c2b7'), surface: hex('#ffffff'), tile: hex('#f4f3ef'),
  s1: hex('#2a78d6'), s2: hex('#eb6834'), neutral: hex('#c3c2b7'), good: hex('#0ca30c'), critical: hex('#d03b3b'),
  ramp: ['#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7'].map(hex),
};
const W = 595.28, H = 841.89, M = 40;

/** Standard PDF fonts speak WinAnsi only; anything else becomes a close ASCII form or '?'. */
const pdfText = (s: unknown) => String(s ?? '')
  .replace(/[–—−]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...')
  .replace(/·|•/g, '-').replace(/₹/g, 'Rs ').replace(/×/g, 'x').replace(/[→]/g, '->')
  .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');

class Pdf {
  doc!: PDFDocument; f!: PDFFont; b!: PDFFont; page!: PDFPage; y = 0; n = 0;
  constructor(public title: string) {}
  async init() { this.doc = await PDFDocument.create(); this.f = await this.doc.embedFont(StandardFonts.Helvetica); this.b = await this.doc.embedFont(StandardFonts.HelveticaBold); this.doc.setTitle(this.title); this.doc.setCreator('TiEEdu'); }
  add() {
    this.page = this.doc.addPage([W, H]); this.n++; this.y = H - M;
    this.text(`TiEEdu - ${this.title} - page ${this.n}`, M, 22, 8, C.muted);
    return this.page;
  }
  ensure(h: number) { if (this.y - h < M) this.add(); }
  text(s: unknown, x: number, y: number, size = 10, color = C.ink, bold = false) { this.page.drawText(pdfText(s), { x, y, size, font: bold ? this.b : this.f, color }); }
  width(s: unknown, size = 10, bold = false) { return (bold ? this.b : this.f).widthOfTextAtSize(pdfText(s), size); }
  fit(s: unknown, max: number, size = 9, bold = false) {
    let t = pdfText(s);
    if (this.width(t, size, bold) <= max) return t;
    while (t.length > 1 && this.width(`${t}...`, size, bold) > max) t = t.slice(0, -1);
    return `${t}...`;
  }
  wrap(s: unknown, max: number, size = 10) {
    const out: string[] = []; let line = '';
    for (const w of pdfText(s).split(/\s+/)) {
      const next = line ? `${line} ${w}` : w;
      if (this.width(next, size) > max && line) { out.push(line); line = w; } else line = next;
    }
    if (line) out.push(line);
    return out;
  }
  heading(s: string, sub?: string) {
    this.ensure(50); this.text(s, M, this.y - 14, 15, C.ink, true); this.y -= 22;
    if (sub) { for (const l of this.wrap(sub, W - 2 * M, 9)) { this.text(l, M, this.y - 9, 9, C.ink2); this.y -= 12; } }
    this.y -= 8;
  }
  para(s: string, size = 10, indent = 0) {
    for (const l of this.wrap(s, W - 2 * M - indent, size)) { this.ensure(size + 4); this.text(l, M + indent, this.y - size, size, C.ink); this.y -= size + 4; }
  }
  rect(x: number, y: number, w: number, h: number, color: any) { if (w > 0.2 && h > 0.2) this.page.drawRectangle({ x, y, width: w, height: h, color }); }
  line(x1: number, y1: number, x2: number, y2: number, color = C.grid, t = 0.5) { this.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness: t }); }
  legend(items: [string, any][]) {
    let x = M;
    for (const [label, color] of items) { this.rect(x, this.y - 8, 8, 8, color); this.text(label, x + 12, this.y - 8, 8.5, C.ink2); x += 24 + this.width(label, 8.5); }
    this.y -= 18;
  }
  /** Simple table; repeats the header on a new page. */
  table(cols: { h: string; w: number; align?: 'r' }[], rows: unknown[][], size = 8) {
    const rowH = size + 6;
    const head = () => {
      this.ensure(rowH * 2); let x = M;
      this.rect(M, this.y - rowH, cols.reduce((n, c) => n + c.w, 0), rowH, C.tile);
      for (const c of cols) { const t = this.fit(c.h, c.w - 6, size, true); this.text(t, c.align === 'r' ? x + c.w - 3 - this.width(t, size, true) : x + 3, this.y - rowH + 4, size, C.ink, true); x += c.w; }
      this.y -= rowH;
    };
    head();
    for (const r of rows) {
      if (this.y - rowH < M) { this.add(); head(); }
      let x = M;
      cols.forEach((c, i) => { const t = this.fit(r[i] ?? '', c.w - 6, size); this.text(t, c.align === 'r' ? x + c.w - 3 - this.width(t, size) : x + 3, this.y - rowH + 4, size); x += c.w; });
      this.line(M, this.y - rowH, M + cols.reduce((n, c) => n + c.w, 0), this.y - rowH);
      this.y -= rowH;
    }
    this.y -= 10;
  }
}

/** Horizontal bars; each row a stack of [value, colour]. Labels left, total right, 2pt gap between segments. */
function hbars(p: Pdf, rows: { label: string; parts: [number, any][]; right: string }[], max: number, opts: { labelW?: number; barH?: number } = {}) {
  const labelW = opts.labelW ?? 70, barH = opts.barH ?? 11, gap = 5, rightW = 50;
  const x0 = M + labelW, w = W - 2 * M - labelW - rightW;
  for (const r of rows) {
    p.ensure(barH + gap);
    p.text(p.fit(r.label, labelW - 6, 8.5), M, p.y - barH + 2, 8.5, C.ink2);
    p.rect(x0, p.y - barH, w, barH, C.tile);
    let x = x0;
    for (const [v, color] of r.parts) {
      const len = max ? (v / max) * w : 0;
      if (len > 0) { p.rect(x, p.y - barH, Math.max(len - 2, 1), barH, color); x += len; }
    }
    p.text(r.right, x0 + w + 6, p.y - barH + 2, 8.5, C.ink);
    p.y -= barH + gap;
  }
  p.y -= 6;
}

function chartFrame(p: Pdf, h: number, yMax: number, yLabel: string) {
  p.ensure(h + 30);
  const x0 = M + 30, x1 = W - M, top = p.y - 6, bottom = p.y - h;
  const step = niceStep(yMax);
  for (let v = 0; v <= yMax + 1e-9; v += step) {
    const y = bottom + (v / (yMax || 1)) * (top - bottom);
    p.line(x0, y, x1, y, v === 0 ? C.axis : C.grid, v === 0 ? 0.8 : 0.4);
    const t = String(Math.round(v)); p.text(t, x0 - 4 - p.width(t, 7.5), y - 3, 7.5, C.ink2);
  }
  p.text(yLabel, M, top + 4, 7.5, C.ink2);
  return { x0, x1, top, bottom, yAt: (v: number) => bottom + (v / (yMax || 1)) * (top - bottom) };
}
const niceStep = (max: number) => {
  if (max <= 5) return 1;
  const raw = max / 5, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
};
const niceMax = (max: number) => { const s = niceStep(Math.max(max, 1)); return Math.ceil(Math.max(max, 1) / s) * s; };

function lineChart(p: Pdf, dates: string[], series: { label: string; color: any; values: number[] }[], yLabel: string, h = 150) {
  const yMax = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const f = chartFrame(p, h, yMax, yLabel);
  const xAt = (i: number) => f.x0 + 4 + (dates.length > 1 ? (i / (dates.length - 1)) * (f.x1 - f.x0 - 8) : (f.x1 - f.x0) / 2);
  for (const s of series) {
    for (let i = 1; i < s.values.length; i++) p.line(xAt(i - 1), f.yAt(s.values[i - 1]), xAt(i), f.yAt(s.values[i]), s.color, 2);
    if (s.values.length === 1) p.page.drawCircle({ x: xAt(0), y: f.yAt(s.values[0]), size: 3, color: s.color });
    // Label the peak only (selective direct label).
    const peak = s.values.reduce((m, v, i) => (v > s.values[m] ? i : m), 0);
    if (s.values[peak] > 0) { p.page.drawCircle({ x: xAt(peak), y: f.yAt(s.values[peak]), size: 3, color: s.color, borderColor: C.surface, borderWidth: 1.5 }); p.text(`${s.values[peak]}`, xAt(peak) + 5, f.yAt(s.values[peak]) + 3, 7.5, C.ink); }
  }
  const ticks = Math.min(6, dates.length);
  for (let k = 0; k < ticks; k++) {
    const i = ticks === 1 ? 0 : Math.round((k / (ticks - 1)) * (dates.length - 1));
    const t = dates[i].slice(5); p.text(t, xAt(i) - p.width(t, 7.5) / 2, f.bottom - 11, 7.5, C.ink2);
  }
  p.y = f.bottom - 22;
}

function vbars(p: Pdf, bars: { label: string; value: number }[], color: any, yLabel: string, h = 130) {
  const yMax = niceMax(Math.max(1, ...bars.map((b) => b.value)));
  const f = chartFrame(p, h, yMax, yLabel);
  const slot = (f.x1 - f.x0) / Math.max(bars.length, 1), bw = Math.min(slot * 0.6, 48);
  bars.forEach((b, i) => {
    const cx = f.x0 + slot * i + slot / 2;
    p.rect(cx - bw / 2, f.bottom, bw, f.yAt(b.value) - f.bottom, color);
    const v = String(b.value); p.text(v, cx - p.width(v, 8) / 2, f.yAt(b.value) + 3, 8, C.ink);
    p.text(b.label, cx - p.width(b.label, 7.5) / 2, f.bottom - 11, 7.5, C.ink2);
  });
  p.y = f.bottom - 22;
}

function scatter(p: Pdf, pts: { x: number; y: number }[], xLabel: string, yLabel: string, h = 200) {
  const f = chartFrame(p, h, 100, yLabel);
  const xAt = (v: number) => f.x0 + (v / 100) * (f.x1 - f.x0);
  for (let v = 0; v <= 100; v += 20) { const t = String(v); p.text(t, xAt(v) - p.width(t, 7.5) / 2, f.bottom - 11, 7.5, C.ink2); }
  for (const pt of pts) p.page.drawCircle({ x: xAt(pt.x), y: f.yAt(pt.y), size: 3.5, color: C.s1, borderColor: C.surface, borderWidth: 1.5, opacity: 0.85 });
  p.text(xLabel, f.x1 - p.width(xLabel, 7.5), f.bottom - 22, 7.5, C.ink2);
  p.y = f.bottom - 32;
}

export async function reportPdf(r: WiproReport): Promise<Buffer> {
  const p = new Pdf('Wipro iOS lab report');
  await p.init();
  const S = r.summary as Record<string, number | null>;
  const n = (v: number | null | undefined, suffix = '') => (v == null ? '-' : `${v}${suffix}`);

  // ---- 1. Cover: key numbers, funnel, findings
  p.add();
  p.text('Wipro iOS lab report', M, p.y - 22, 22, C.ink, true); p.y -= 34;
  p.text(`${r.scope} - generated ${r.generated_at.slice(0, 16).replace('T', ' ')} UTC`, M, p.y - 10, 10, C.ink2); p.y -= 16;
  if (r.classes.length) { p.para(`Classes: ${r.classes.map((c) => `${c.name} (${c.teacher}, ${c.students} students)`).join('; ')}`, 9); }
  p.y -= 8;
  const tiles: [string, string, string][] = [
    ['Joined', `${n(S.joined)}/${n(S.invited)}`, 'students in lab classes'],
    ['Repos verified', n(S.repo_verified), `${n(S.repo_linked)} linked`],
    ['Labs pushed', `${S.possible_submissions ? Math.round(((S.submissions || 0) / S.possible_submissions) * 100) : 0}%`, `${n(S.submissions)} of ${n(S.possible_submissions)}`],
    ['Waiting review', n(S.waiting_review), 'submissions'],
    ['Avg lab score', n(S.avg_lab_score), 'out of 100'],
    ['Avg readiness', n(S.avg_readiness), 'Wipro readiness /100'],
    ['Tests taken', n(S.tests_taken), `mock best avg ${n(S.avg_mock_best, '%')}`],
    ['Behind', n(S.behind), `${n(S.not_started)} not started`],
  ];
  const tw = (W - 2 * M - 3 * 10) / 4, th = 58;
  tiles.forEach(([label, value, sub], i) => {
    const x = M + (i % 4) * (tw + 10), y = p.y - Math.floor(i / 4) * (th + 10) - th;
    p.rect(x, y, tw, th, C.tile);
    p.text(label, x + 10, y + th - 16, 8.5, C.ink2);
    p.text(value, x + 10, y + 20, 18, C.ink, true);
    p.text(p.fit(sub, tw - 20, 7.5), x + 10, y + 8, 7.5, C.ink2);
  });
  p.y -= 2 * (th + 10) + 12;

  if (r.funnel[0]?.count) {
    p.heading('Lab funnel', 'How far students have got, from invite to pushing every Milestone 1 lab.');
    const top = r.funnel[0].count;
    hbars(p, r.funnel.map((f, i) => ({ label: f.label, parts: [[f.count, C.ramp[i % C.ramp.length]]], right: `${f.count} (${Math.round((f.count / top) * 100)}%)` })), top, { labelW: 100, barH: 14 });
  }
  p.heading('Findings');
  for (const f of r.findings) { p.ensure(14); p.text('-', M, p.y - 10, 10, C.ink2); p.para(f, 10, 12); p.y -= 3; }

  // ---- 2. Submissions per lab
  if (r.labs.length) {
    p.add();
    p.heading('Submissions per lab', 'Each bar is every assigned student. On time: first push before the due date. Late: pushed only after it. Overdue: past the due date with nothing pushed. The empty part of a bar is students whose lab is not due yet.');
    p.legend([['On time', C.s1], ['Late', C.s2], ['Overdue, not pushed', C.neutral]]);
    const max = Math.max(1, ...r.labs.map((l) => l.assigned));
    hbars(p, r.labs.map((l) => ({ label: `${l.code} ${l.title}`, parts: [[l.on_time, C.s1], [l.late, C.s2], [l.overdue, C.neutral]], right: `${l.submitted}/${l.assigned}` })), max, { labelW: 150, barH: 10 });

    // ---- 3. Milestones + score spread
    p.add();
    p.heading('Progress by milestone', 'Every student x lab pair in the milestone. Done: every requirement met. In review: pushed, not yet fully met or not reviewed. Overdue: past due, nothing pushed. Empty: not due yet.');
    p.legend([['Done', C.s1], ['In review / partly met', C.s2], ['Overdue, not pushed', C.neutral]]);
    const mmax = Math.max(1, ...r.milestones.map((m) => m.cells));
    hbars(p, r.milestones.map((m) => ({ label: m.name.replace(/^Milestone /, 'M'), parts: [[m.done, C.s1], [m.reviewed + m.submitted, C.s2], [m.overdue, C.neutral]], right: `${m.cells ? Math.round((m.done / m.cells) * 100) : 0}% done` })), mmax, { labelW: 160, barH: 16 });
    p.y -= 6;
    p.heading('Lab score spread', 'Joined students by average lab score (due labs not pushed count as 0).');
    vbars(p, r.score_bands.map((b) => ({ label: b.label, value: b.count })), C.s1, 'Students');
  }

  // ---- 4. Activity
  if (r.activity.length > 1) {
    p.add();
    p.heading('Commits per day', `Lab commits pushed by these students, ${r.activity[0].date} to ${r.activity[r.activity.length - 1].date} (IST).`);
    lineChart(p, r.activity.map((a) => a.date), [{ label: 'Commits', color: C.s1, values: r.activity.map((a) => a.commits) }], 'Commits');
    p.heading('Active students per day', 'Students who pushed lab work, and students who did lessons or tests, each day.');
    p.legend([['Pushed lab work', C.s1], ['Lessons or tests', C.s2]]);
    lineChart(p, r.activity.map((a) => a.date), [
      { label: 'Pushed lab work', color: C.s1, values: r.activity.map((a) => a.lab_students) },
      { label: 'Lessons or tests', color: C.s2, values: r.activity.map((a) => a.prep_students) },
    ], 'Students');
    p.heading('Tests taken per day');
    lineChart(p, r.activity.map((a) => a.date), [{ label: 'Tests', color: C.s1, values: r.activity.map((a) => a.tests) }], 'Tests', 110);
  }

  // ---- 5. Labs vs tests, top and need-help lists
  const both = r.students.filter((s) => s.lab_score != null && s.readiness != null && (s.tests_taken || s.lessons_done));
  p.add();
  if (both.length >= 3) {
    p.heading('Lab score vs Wipro readiness', `${both.length} students with both lab work and lessons or tests. Each dot is one student.`);
    scatter(p, both.map((s) => ({ x: s.lab_score!, y: s.readiness! })), 'Lab score ->', 'Readiness');
  }
  const ranked = r.students.filter((s) => s.status !== 'Not joined')
    .map((s) => ({ s, k: (s.lab_score ?? 0) * (s.class_id ? 0.6 : 0) + (s.readiness ?? 0) * (s.class_id ? 0.4 : 1) }));
  const rowOf = (s: ReportStudent) => [s.roll, s.name, s.class_name, `${s.submitted}/${s.labs_assigned}`, n(s.lab_score), `${s.lessons_done}/${s.lessons_total}`, n(s.readiness), s.status];
  const cols = [{ h: 'Roll', w: 45 }, { h: 'Name', w: 120 }, { h: 'Class', w: 95 }, { h: 'Labs', w: 40, align: 'r' as const }, { h: 'Lab score', w: 50, align: 'r' as const },
    { h: 'Lessons', w: 45, align: 'r' as const }, { h: 'Readiness', w: 52, align: 'r' as const }, { h: 'Status', w: 68 }];
  p.heading('Top 10 students', 'Ranked by lab score (60%) and readiness (40%); learners without a lab class by readiness.');
  p.table(cols, [...ranked].sort((a, b) => b.k - a.k).slice(0, 10).map((x) => rowOf(x.s)));
  const help = r.students.filter((s) => s.status === 'Behind' || s.status === 'Not started').sort((a, b) => b.overdue - a.overdue || (a.lab_score ?? 0) - (b.lab_score ?? 0));
  p.heading('Students who need help', `${help.length} students are Behind or have not started.`);
  p.table(cols, help.slice(0, 25).map(rowOf));
  if (help.length > 25) p.para(`...and ${help.length - 25} more; see the Students sheet in the Excel file.`, 9);

  // ---- 6. Lab table
  if (r.labs.length) {
    p.add();
    p.heading('Every lab', 'Avg score is over students who pushed. Most missed: the requirement most often marked missing or partly met.');
    p.table([{ h: 'Lab', w: 46 }, { h: 'Title', w: 138 }, { h: 'Due', w: 52 }, { h: 'Pushed', w: 44, align: 'r' }, { h: 'Late', w: 30, align: 'r' }, { h: 'Overdue', w: 42, align: 'r' },
      { h: 'Reviewed', w: 46, align: 'r' }, { h: 'Avg', w: 30, align: 'r' }, { h: 'Most missed', w: 87 }],
      r.labs.map((l) => [l.code, l.title, l.due, `${l.submitted}/${l.assigned}`, l.late, l.overdue, l.reviewed, n(l.avg_score), l.most_missed ? `${l.most_missed.id} (${l.most_missed.count}/${l.most_missed.of})` : '-']));
  }

  // ---- 7. Every student
  p.add();
  p.heading('Every student', `${r.students.length} students. Full detail (email, repo, every lab and requirement) is in the Excel file.`);
  p.table([{ h: 'Roll', w: 42 }, { h: 'Name', w: 110 }, { h: 'Class', w: 80 }, { h: 'Pushed', w: 40, align: 'r' }, { h: 'Overdue', w: 42, align: 'r' }, { h: 'Lab score', w: 46, align: 'r' },
    { h: 'Lessons', w: 42, align: 'r' }, { h: 'Tests', w: 32, align: 'r' }, { h: 'Ready', w: 36, align: 'r' }, { h: 'Status', w: 45 }],
    r.students.map((s) => [s.roll, s.name, s.class_name, `${s.submitted}/${s.labs_assigned}`, s.overdue, n(s.lab_score), `${s.lessons_done}/${s.lessons_total}`, s.tests_taken, n(s.readiness), s.status]), 7.5);

  return Buffer.from(await p.doc.save());
}

