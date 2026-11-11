import React, { useCallback, useEffect, useState } from 'react';
import { Download, Search, X, CheckCircle2, XCircle, AlertTriangle, Activity } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { Chip } from '@/components/ui/Chip';
import {
  downloadCsv, fetchCoverage, fetchFunnel, fetchPracticeOverview, fetchPracticeStudent, fetchPracticeStudents, fetchProblemStats, fetchSubmissionCode,
  type CoverageRow, type FunnelRow, type PracticeOverview, type ProblemStat, type StudentDetail, type StudentRow,
} from '@/lib/adminPracticeApi';

type Sub = 'overview' | 'students' | 'problems' | 'companies' | 'coverage';

const when = (iso: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
const VERDICT: Record<string, string> = { accepted: 'Accepted', wrong_answer: 'Wrong answer', compile_error: 'Compile error', runtime_error: 'Runtime error', time_limit: 'Time limit' };

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-heading">{value}</p>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </div>
  );
}

function CsvButton({ path, name }: { path: '/students' | '/problems' | '/companies'; name: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} onClick={() => { setBusy(true); downloadCsv(path, name).catch((e) => alert(e.message)).finally(() => setBusy(false)); }}
      className="btn btn-ghost focus-ring min-h-[40px] px-3 text-sm"><Download className="h-4 w-4" aria-hidden /> {busy ? 'Preparing…' : 'Download CSV'}</button>
  );
}

const th = 'px-3 py-2 text-left text-sm font-semibold text-muted';
const td = 'px-3 py-2.5 text-body-md text-body';

/**
 * Admin → Coding practice (PRACTICE_MODE_PLAN.md §9): activity, students with
 * their timeline and code, per-problem stats, company funnels and content coverage.
 */
export const CodingPracticeTab: React.FC = () => {
  const [sub, setSub] = useState<Sub>('overview');
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-heading">Coding practice</h2>
        <p className="mt-1 text-body-md text-body">Who practises what, how well, and where the content is thin.</p>
      </div>
      <Tabs label="Coding practice" value={sub} onChange={setSub} items={[
        { key: 'overview', label: 'Overview' }, { key: 'students', label: 'Students' }, { key: 'problems', label: 'Problems' },
        { key: 'companies', label: 'Company funnel' }, { key: 'coverage', label: 'Content coverage' },
      ]} />
      {sub === 'overview' && <OverviewPane />}
      {sub === 'students' && <StudentsPane />}
      {sub === 'problems' && <ProblemsPane />}
      {sub === 'companies' && <FunnelPane />}
      {sub === 'coverage' && <CoveragePane />}
    </div>
  );
};

function OverviewPane() {
  const [days, setDays] = useState(30);
  const [o, setO] = useState<PracticeOverview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { setO(null); fetchPracticeOverview(days).then(setO).catch((e) => setError(e.message)); }, [days]);
  if (error) return <p className="text-danger">{error}</p>;
  if (!o) return <p className="text-muted">Loading…</p>;
  const max = Math.max(1, ...o.series.map((s) => s.submissions));
  const r = o.runner;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 90].map((d) => <Chip key={d} onClick={() => setDays(d)} selected={days === d}>Last {d} days</Chip>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active students" value={o.totals.students} sub={`in the last ${o.days} days`} />
        <Stat label="Submissions" value={o.totals.submissions} sub={`${o.totals.accepted} accepted`} />
        <Stat label="Students who solved one" value={o.totals.solvers} />
        <Stat label="Company tests taken" value={o.totals.tests} />
      </div>
      <section className="rounded-xl border border-line bg-card p-4">
        <p className="text-base font-semibold text-heading">Submissions per day</p>
        <div className="mt-3 flex h-40 items-end gap-0.5" role="img" aria-label="Submissions per day">
          {o.series.map((s) => (
            <div key={s.day} className="flex flex-1 flex-col justify-end" title={`${s.day}: ${s.submissions} submissions, ${s.accepted} accepted, ${s.students} students, ${s.tests} tests`}>
              <div className="rounded-t bg-signal/40" style={{ height: `${(s.submissions / max) * 100}%` }}>
                <div className="rounded-t bg-success" style={{ height: `${s.submissions ? (s.accepted / s.submissions) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">Green = accepted share. Hover a bar for the day&apos;s numbers.</p>
      </section>
      <section className="rounded-xl border border-line bg-card p-4">
        <p className="flex items-center gap-2 text-base font-semibold text-heading"><Activity className="h-5 w-5" aria-hidden /> Code runner</p>
        {!r.configured ? <p className="mt-2 text-body-md text-danger">Not configured: set PISTON_API_URL on the server.</p>
          : r.up ? <p className="mt-2 text-body-md text-body"><span className="font-semibold text-success">Up</span> · answered in {r.ms} ms · languages: {r.languages.join(', ') || '—'}</p>
          : <p className="mt-2 flex items-center gap-2 text-body-md text-danger"><AlertTriangle className="h-4 w-4" aria-hidden /> Down: Piston did not answer. Students see &quot;runner offline&quot;.</p>}
        {r.avg_grade_ms != null && <p className="mt-1 text-body-md text-muted">Average time to grade a submission: {(r.avg_grade_ms / 1000).toFixed(1)} s</p>}
        <p className="mt-1 text-sm text-muted">{o.totals.all_time_submissions} submissions stored in total.</p>
      </section>
    </div>
  );
}

function StudentsPane() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => { fetchPracticeStudents(q, '', page).then((r) => { setRows(r.rows); setTotal(r.total); }).catch(() => setRows([])); }, [q, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative w-full max-w-sm">
          <span className="sr-only">Search students</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name, email or college" className="h-10 w-full rounded-lg border border-line bg-card pl-9 pr-3 text-body-md text-heading focus:border-signal focus:outline-none" />
        </label>
        <p className="text-body-md text-muted">{total} students</p>
        <div className="ml-auto"><CsvButton path="/students" name="practice-students" /></div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[900px]">
          <thead className="border-b border-line"><tr>{['Student', 'Target', 'Solved', 'Submissions', 'Tests', 'Best mock', 'Readiness', 'Last active'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {(rows || []).map((r) => (
              <tr key={r.id} className="cursor-pointer hover:bg-surface-hover" onClick={() => setOpen(r.id)}>
                <td className={td}><p className="font-semibold text-heading">{r.name || '—'}</p><p className="text-sm text-muted">{r.email}{r.college ? ` · ${r.college}` : ''}</p></td>
                <td className={td}>{r.target || '—'}</td>
                <td className={`${td} tabular-nums`}>{r.solved}<span className="text-muted"> / {r.attempted}</span></td>
                <td className={`${td} tabular-nums`}>{r.submissions}</td>
                <td className={`${td} tabular-nums`}>{r.tests}</td>
                <td className={`${td} tabular-nums`}>{r.best_mock != null ? `${r.best_mock}%` : '—'}</td>
                <td className={`${td} tabular-nums`}>{r.readiness != null ? `${r.readiness}%` : '—'}</td>
                <td className={td}>{when(r.last_active)}</td>
              </tr>
            ))}
            {rows && !rows.length && <tr><td className={td} colSpan={8}>No students match.</td></tr>}
          </tbody>
        </table>
      </div>
      {total > 50 && (
        <div className="flex items-center gap-2">
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="btn btn-ghost min-h-[40px] px-3">Previous</button>
          <span className="text-body-md text-muted">Page {page} of {Math.ceil(total / 50)}</span>
          <button type="button" disabled={page * 50 >= total} onClick={() => setPage(page + 1)} className="btn btn-ghost min-h-[40px] px-3">Next</button>
        </div>
      )}
      {open && <StudentDrawer id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function StudentDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [d, setD] = useState<StudentDetail | null>(null);
  const [code, setCode] = useState<{ title: string; language: string; code: string } | null>(null);
  useEffect(() => { fetchPracticeStudent(id).then(setD).catch(() => {}); }, [id]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="Student practice">
      <button type="button" aria-label="Close" className="flex-1 bg-black/40" onClick={onClose} />
      <div className="flex h-full w-full max-w-2xl flex-col bg-card shadow-xl">
        <div className="flex h-14 items-center justify-between border-b border-line px-5">
          <p className="text-lg font-semibold text-heading">{d?.student.name || 'Student'}</p>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-muted hover:text-heading focus-ring"><X className="h-5 w-5" aria-hidden /></button>
        </div>
        {!d ? <p className="p-5 text-muted">Loading…</p> : (
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
            <p className="text-body-md text-body">{d.student.email}{d.student.college ? ` · ${d.student.college}` : ''}{d.student.grad_year ? ` · ${d.student.grad_year}` : ''}{d.student.target ? ` · target ${d.student.target}` : ''}</p>
            {d.prep.length > 0 && (
              <section>
                <h3 className="text-base font-semibold text-heading">Plans</h3>
                <ul className="mt-2 space-y-1 text-body-md text-body">{d.prep.map((p) => <li key={p.company}>{p.company}: {p.lessons_done} lessons · readiness {p.readiness ?? '—'}% · {p.active_days} active days{p.test_date ? ` · test ${p.test_date}` : ''}</li>)}</ul>
              </section>
            )}
            <section>
              <h3 className="text-base font-semibold text-heading">DSA topics</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">{d.topics.map((t) => <p key={t.key} className="text-body-md text-body">{t.name}: <span className="font-semibold text-heading">{t.solved}</span> / {t.total}</p>)}</div>
            </section>
            <section>
              <h3 className="text-base font-semibold text-heading">Company tests</h3>
              {!d.tests.length ? <p className="mt-1 text-body-md text-muted">None yet.</p> : (
                <ul className="mt-2 divide-y divide-line rounded-lg border border-line">{d.tests.map((t) => <li key={t.id} className="flex justify-between gap-3 px-3 py-2 text-body-md"><span className="text-heading">{t.name}</span><span className="tabular-nums text-body">{t.score}% · {when(t.at)}</span></li>)}</ul>
              )}
            </section>
            <section>
              <h3 className="text-base font-semibold text-heading">Submissions</h3>
              {!d.submissions.length ? <p className="mt-1 text-body-md text-muted">None yet.</p> : (
                <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
                  {d.submissions.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                      {s.verdict === 'accepted' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden /> : <XCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden />}
                      <span className="min-w-0 flex-1 text-body-md text-heading">{s.title}<span className="block text-sm text-muted">{VERDICT[s.verdict] || s.verdict} · {s.passed}/{s.total} · {s.language} · {when(s.at)}{s.in_test ? ' · in a test' : ''}</span></span>
                      <button type="button" onClick={() => fetchSubmissionCode(s.id).then(setCode).catch(() => {})} className="btn btn-ghost min-h-[36px] px-3 text-sm">View code</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {code && (
              <section>
                <div className="flex items-center justify-between"><h3 className="text-base font-semibold text-heading">{code.title} · {code.language}</h3><button type="button" onClick={() => setCode(null)} className="text-sm text-link">Close code</button></div>
                <pre className="mt-2 max-h-[50vh] overflow-auto rounded-lg bg-surface p-3 font-mono text-xs leading-relaxed text-heading">{code.code || '(empty)'}</pre>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProblemsPane() {
  const [rows, setRows] = useState<ProblemStat[] | null>(null);
  const [sort, setSort] = useState<'students' | 'acceptance' | 'flag'>('students');
  useEffect(() => { fetchProblemStats().then((r) => setRows(r.rows)).catch(() => setRows([])); }, []);
  const list = [...(rows || [])].sort((a, b) => sort === 'flag' ? Number(!!b.flag) - Number(!!a.flag) : sort === 'acceptance' ? (a.acceptance ?? 101) - (b.acceptance ?? 101) : b.students - a.students);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip onClick={() => setSort('students')} selected={sort === 'students'}>Most tried</Chip>
        <Chip onClick={() => setSort('acceptance')} selected={sort === 'acceptance'}>Lowest acceptance</Chip>
        <Chip onClick={() => setSort('flag')} selected={sort === 'flag'}>Flagged first</Chip>
        <div className="ml-auto"><CsvButton path="/problems" name="practice-problems" /></div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[900px]">
          <thead className="border-b border-line"><tr>{['Problem', 'Topic', 'Students', 'Solved by', 'Acceptance', 'Tries to solve', 'Most common miss', ''].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {list.map((r) => (
              <tr key={r.id}>
                <td className={td}><p className="font-semibold text-heading">{r.title}</p><p className="text-sm text-muted">{r.difficulty} · {r.companies}</p></td>
                <td className={td}>{r.topic}</td>
                <td className={`${td} tabular-nums`}>{r.students}</td>
                <td className={`${td} tabular-nums`}>{r.solvers}</td>
                <td className={`${td} tabular-nums`}>{r.acceptance != null ? `${r.acceptance}%` : '—'}</td>
                <td className={`${td} tabular-nums`}>{r.avg_tries ?? '—'}</td>
                <td className={td}>{r.common_wrong ? (VERDICT[r.common_wrong.split(' ')[0]] || r.common_wrong.split(' ')[0]) + ' ' + r.common_wrong.split(' ').slice(1).join(' ') : '—'}</td>
                <td className={td}>{r.flag && <Chip tone="danger">{r.flag}</Chip>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FunnelPane() {
  const [rows, setRows] = useState<FunnelRow[] | null>(null);
  useEffect(() => { fetchFunnel().then((r) => setRows(r.rows)).catch(() => setRows([])); }, []);
  const steps: Array<[keyof FunnelRow, string]> = [['targeted', 'Picked as target'], ['practised_coding', 'Practised coding'], ['took_mock', 'Took a full mock'], ['bought_pack', 'Bought the pack'], ['two_plus_mocks', '2+ full mocks'], ['ready_70', 'Readiness 70%+']];
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><CsvButton path="/companies" name="practice-companies" /></div>
      {(rows || []).map((r) => {
        const top = Math.max(1, ...steps.map(([k]) => Number(r[k]) || 0));
        return (
          <section key={r.slug} className="rounded-xl border border-line bg-card p-4">
            <p className="text-lg font-semibold text-heading">{r.name}</p>
            <div className="mt-3 space-y-2">
              {steps.map(([k, label]) => (
                <div key={k} className="grid grid-cols-[170px_1fr_48px] items-center gap-3">
                  <span className="text-body-md text-body">{label}</span>
                  <div className="h-3 rounded-full bg-surface-hover"><div className="h-3 rounded-full bg-signal" style={{ width: `${((Number(r[k]) || 0) / top) * 100}%` }} /></div>
                  <span className="text-right text-body-md font-semibold tabular-nums text-heading">{r[k]}</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CoveragePane() {
  const [rows, setRows] = useState<CoverageRow[] | null>(null);
  useEffect(() => { fetchCoverage().then((r) => setRows(r.rows)).catch(() => setRows([])); }, []);
  return (
    <div className="space-y-4">
      {(rows || []).map((r) => (
        <section key={r.slug} className="rounded-xl border border-line bg-card p-4">
          <p className="text-lg font-semibold text-heading">{r.name}</p>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-muted">Coding set · {r.coding_total} problems</p>
              <ul className="mt-1 text-body-md text-body">{r.coding_by_topic.map((t) => <li key={t.topic}>{t.topic}: {t.count}</li>)}{!r.coding_by_topic.length && <li className="text-danger">No coding set yet</li>}</ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted">Full mock bank (aim for 2× each section)</p>
              {r.mock ? (
                <ul className="mt-1 text-body-md">{r.mock.sections.map((s) => <li key={s.name} className={s.ok ? 'text-body' : 'text-danger'}>{s.name}: {s.have} / {s.needed * 2}</li>)}{r.mock.coding > 0 && <li className="text-body">Coding pool: {r.mock.coding}</li>}</ul>
              ) : <p className="mt-1 text-body-md text-danger">No full mock yet: the MCQ bank is not filled.</p>}
            </div>
            <div>
              <p className="text-sm font-semibold text-muted">Train modules</p>
              <ul className="mt-1 text-body-md text-body">{r.modules.map((m) => <li key={m.title} className={m.items ? '' : 'text-danger'}>{m.title}: {m.items}</li>)}{!r.modules.length && <li className="text-danger">None</li>}</ul>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
