import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Save, AlertTriangle } from 'lucide-react';
import { Segmented } from '@/components/ui/Segmented';
import { BrandLoader } from '@/components/brand/BrandLoader';
import { ErrorState } from '@/components/common/ErrorState';
import { CoinIcon } from '@/components/coins/CoinIcon';
import {
  adjustCoins, fetchCoinRulesAdmin, fetchCoinStats, fetchCoinStudent, fetchDailySchedule, fetchPracticeAccess, saveCoinRule, searchCoinStudents,
  setDailyProblem, setPracticeAccess, type AdminCoinRule, type CoinLedgerRow, type CoinStats, type CoinStudent, type PracticeAccessRow,
} from '@/lib/adminCoinsApi';
import { cn } from '@/lib/cn';

type View = 'stats' | 'students' | 'rules' | 'access' | 'daily';
const input = 'h-9 rounded-md border border-line bg-card px-2 text-body-md text-heading focus:border-signal focus:outline-none';
const n = (v: number) => v.toLocaleString('en-IN');
const card = 'rounded-2xl border border-line bg-card p-5';

function StatsView() {
  const [s, setS] = useState<CoinStats | null>(null);
  const [err, setErr] = useState('');
  const [days, setDays] = useState(30);
  useEffect(() => { setS(null); fetchCoinStats(days).then(setS).catch((e) => setErr(e.message)); }, [days]);
  if (err) return <ErrorState message={err} />;
  if (!s) return <BrandLoader caption="Loading coin stats…" />;
  const tiles = [
    ['Issued (all time)', n(s.totals.issued)], ['Spent', n(s.totals.spent)], ['Refunded', n(s.totals.refunded)],
    ['Held by students', n(s.totals.outstanding)], ['Liability', `₹${n(s.totals.liability_inr)}`], ['Students with coins', n(s.totals.holders)],
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {tiles.map(([k, v]) => <div key={k} className={card}><p className="text-sm text-muted">{k}</p><p className="mt-1 text-2xl font-bold tabular-nums text-heading">{v}</p></div>)}
      </div>
      <p className="text-sm text-muted">Liability uses 10 coins ≈ ₹1 (decision C1). Orders: {Object.entries(s.orders).map(([k, v]) => `${k} ${v}`).join(' · ') || 'none yet'}.</p>
      <div className="flex items-center gap-2"><span className="text-body-md text-body">Window</span>
        {[7, 30, 90].map((d) => <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={cn('min-h-[36px] rounded-full border px-3 text-sm font-semibold', days === d ? 'border-signal bg-signal-soft text-signal-ink' : 'border-line')}>{d} days</button>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h3 className="text-lg font-semibold text-heading">By rule, last {s.days} days</h3>
          <ul className="mt-3 divide-y divide-line">
            {Object.entries(s.by_rule).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([k, v]) => (
              <li key={k} className="flex justify-between py-2 text-body-md"><span className="text-body">{k}</span><span className={cn('font-semibold tabular-nums', v < 0 ? 'text-danger' : 'text-heading')}>{v > 0 ? '+' : ''}{n(v)}</span></li>
            ))}
            {!Object.keys(s.by_rule).length && <li className="py-2 text-body-md text-muted">Nothing yet.</li>}
          </ul>
        </section>
        <section className={card}>
          <h3 className="text-lg font-semibold text-heading">Top earners, last {s.days} days</h3>
          <ol className="mt-3 divide-y divide-line">
            {s.top_earners.map((t, i) => <li key={t.user_id} className="flex justify-between py-2 text-body-md"><span className="text-body">{i + 1}. {t.name}</span><span className="font-semibold tabular-nums text-heading">{n(t.coins)}</span></li>)}
            {!s.top_earners.length && <li className="py-2 text-body-md text-muted">Nothing yet.</li>}
          </ol>
        </section>
      </div>
      {s.flagged.length > 0 && (
        <section className={cn(card, 'border-warning/40')}>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-heading"><AlertTriangle className="h-5 w-5 text-warning" aria-hidden /> Unusual days (over 150 coins earned in a day)</h3>
          <ul className="mt-3 divide-y divide-line">{s.flagged.map((f) => <li key={f.user_id + f.day} className="flex justify-between py-2 text-body-md"><span>{f.name} · {f.day}</span><span className="font-semibold">{n(f.coins)}</span></li>)}</ul>
        </section>
      )}
    </div>
  );
}

function StudentsView() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<CoinStudent[] | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ student: CoinStudent; ledger: CoinLedgerRow[] } | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const search = useCallback(() => { searchCoinStudents(q).then((r) => setRows(r.students)).catch(() => setRows([])); }, [q]);
  useEffect(() => { search(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (pick) { setDetail(null); fetchCoinStudent(pick).then(setDetail).catch(() => undefined); } }, [pick]);
  const adjust = async (sign: 1 | -1) => {
    setMsg('');
    try { await adjustCoins(pick!, sign * Math.abs(Number(amount)), note); setAmount(''); setNote(''); setMsg('Done'); fetchCoinStudent(pick!).then(setDetail); search(); } catch (e) { setMsg((e as Error).message); }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
      <section className={card}>
        <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email" className={cn(input, 'flex-1')} />
          <button type="submit" className="btn btn-secondary focus-ring inline-flex min-h-[36px] items-center gap-1 px-3"><Search className="h-4 w-4" aria-hidden /> Find</button>
        </form>
        {!rows ? <BrandLoader caption="Loading students…" /> : (
          <ul className="mt-3 max-h-[520px] divide-y divide-line overflow-y-auto">
            {rows.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setPick(r.id)} className={cn('flex w-full items-center gap-3 px-2 py-2.5 text-left hover:bg-surface-hover', pick === r.id && 'bg-surface-hover')}>
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-heading">{r.name || r.email}</span><span className="block truncate text-sm text-muted">{r.email}</span></span>
                  <span className="inline-flex items-center gap-1 font-semibold tabular-nums"><CoinIcon size={14} />{n(r.coins)}</span>
                </button>
              </li>
            ))}
            {!rows.length && <li className="py-3 text-body-md text-muted">No students with coins yet. Search by name or email.</li>}
          </ul>
        )}
      </section>
      <section className={card}>
        {!pick ? <p className="text-body-md text-muted">Pick a student to see every coin they earned and spent.</p> : !detail ? <BrandLoader caption="Loading the ledger…" /> : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-semibold text-heading">{detail.student.name || detail.student.email}</h3>
              <p className="inline-flex items-center gap-1 text-xl font-bold tabular-nums"><CoinIcon size={18} />{n(detail.student.coins)}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-surface-hover p-3">
              <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Coins" className={cn(input, 'w-24')} />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (required)" className={cn(input, 'min-w-[180px] flex-1')} />
              <button type="button" disabled={!amount || note.trim().length < 3} onClick={() => adjust(1)} className="btn btn-primary focus-ring min-h-[36px] px-3 disabled:opacity-40">Grant</button>
              <button type="button" disabled={!amount || note.trim().length < 3} onClick={() => adjust(-1)} className="btn btn-secondary focus-ring min-h-[36px] px-3 disabled:opacity-40">Deduct</button>
              {msg && <span className="text-sm text-muted">{msg}</span>}
            </div>
            <ul className="mt-3 max-h-[440px] divide-y divide-line overflow-y-auto">
              {detail.ledger.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2 text-body-md">
                  <span className="min-w-0 flex-1"><span className="block truncate text-heading">{e.note}</span><span className="block text-sm text-muted">{e.rule} · {new Date(e.at).toLocaleString('en-IN')}</span></span>
                  <span className={cn('font-semibold tabular-nums', e.coins > 0 ? 'text-success' : 'text-danger')}>{e.coins > 0 ? '+' : ''}{n(e.coins)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function RuleRow({ rule, onSaved }: { rule: AdminCoinRule; onSaved: (r: AdminCoinRule) => void }) {
  const [d, setD] = useState(rule);
  const [msg, setMsg] = useState('');
  const dirty = JSON.stringify(d) !== JSON.stringify(rule);
  const save = async (reset = false) => {
    setMsg('');
    try {
      const r = await saveCoinRule(rule.id, reset ? { reset: true } : { on: d.on, coins: d.coins, cap_day: d.cap_day, by_difficulty: d.by_difficulty, milestones: d.milestones });
      onSaved(r.rule); setD(r.rule); setMsg(reset ? 'Back to default' : 'Saved');
    } catch (e) { setMsg((e as Error).message); }
  };
  const ms = Object.entries(d.milestones || {}).map(([k, v]) => `${k}:${v}`).join(', ');
  return (
    <tr className="border-t border-line align-top">
      <td className="px-3 py-3"><label className="flex items-center gap-2"><input type="checkbox" checked={d.on} onChange={(e) => setD({ ...d, on: e.target.checked })} /><span className="text-body-md font-semibold text-heading">{d.label}</span></label><span className="ml-6 text-xs text-muted">{rule.id}</span></td>
      <td className="px-3 py-3">
        {d.by_difficulty ? (
          <div className="flex gap-1">{(['easy', 'medium', 'hard'] as const).map((k) => <input key={k} type="number" min={0} title={k} value={d.by_difficulty![k]} onChange={(e) => setD({ ...d, by_difficulty: { ...d.by_difficulty!, [k]: Number(e.target.value) } })} className={cn(input, 'w-16')} />)}</div>
        ) : d.milestones ? (
          <input defaultValue={ms} title="days:coins, comma separated" onBlur={(e) => setD({ ...d, milestones: Object.fromEntries(e.target.value.split(',').map((x) => x.split(':').map((y) => y.trim())).filter(([a, b]) => Number(a) > 0 && b !== undefined).map(([a, b]) => [a, Number(b)])) })} className={cn(input, 'w-64')} />
        ) : (
          <input type="number" min={0} value={d.coins} onChange={(e) => setD({ ...d, coins: Number(e.target.value) })} className={cn(input, 'w-24')} />
        )}
      </td>
      <td className="px-3 py-3">{d.cap_day != null ? <input type="number" min={0} value={d.cap_day} onChange={(e) => setD({ ...d, cap_day: Number(e.target.value) })} className={cn(input, 'w-20')} /> : <span className="text-sm text-muted">—</span>}</td>
      <td className="whitespace-nowrap px-3 py-3">
        <button type="button" disabled={!dirty} onClick={() => save()} className="btn btn-primary focus-ring inline-flex min-h-[36px] items-center gap-1 px-3 disabled:opacity-40"><Save className="h-4 w-4" aria-hidden /> Save</button>
        <button type="button" onClick={() => save(true)} className="ml-2 text-sm font-semibold text-link hover:underline">Default</button>
        {msg && <p className="mt-1 text-sm text-muted">{msg}</p>}
      </td>
    </tr>
  );
}

function RulesView() {
  const [rules, setRules] = useState<AdminCoinRule[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { fetchCoinRulesAdmin().then((r) => setRules(r.rules)).catch((e) => setErr(e.message)); }, []);
  if (err) return <ErrorState message={err} />;
  if (!rules) return <BrandLoader caption="Loading the earning rules…" />;
  return (
    <>
      <p className="rounded-xl bg-surface-hover p-3 text-body-md text-body">Changes apply to coins earned from now on. Coins already in the ledger never change.</p>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[760px] text-left">
          <thead className="text-sm text-muted"><tr><th className="px-3 py-3 font-medium">Rule</th><th className="px-3 py-3 font-medium">Coins</th><th className="px-3 py-3 font-medium">Daily cap</th><th className="px-3 py-3" /></tr></thead>
          <tbody>{rules.map((r) => <RuleRow key={r.id} rule={r} onSaved={(x) => setRules((l) => l && l.map((y) => (y.id === x.id ? x : y)))} />)}</tbody>
        </table>
      </div>
    </>
  );
}

function AccessView() {
  const [rows, setRows] = useState<PracticeAccessRow[] | null>(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { fetchPracticeAccess().then((r) => setRows(r.problems)).catch((e) => setErr(e.message)); }, []);
  const shown = useMemo(() => (rows || []).filter((r) => !q || `${r.id} ${r.title} ${r.topic}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);
  const set = (id: string, access: PracticeAccessRow['override']) => setPracticeAccess(id, access).then((r) => setRows((l) => l && l.map((x) => (x.id === id ? { ...x, override: r.override } : x)))).catch((e) => setErr(e.message));
  if (err) return <ErrorState message={err} />;
  if (!rows) return <BrandLoader caption="Loading problems…" />;
  return (
    <>
      <p className="rounded-xl bg-surface-hover p-3 text-body-md text-body"><span className="font-semibold text-heading">Default</span> follows the plan (free core and each company&apos;s free problems are open, the rest need the pack). <span className="font-semibold text-heading">Free</span> opens it to everyone, <span className="font-semibold text-heading">Pack</span> locks it even if it is free, <span className="font-semibold text-heading">Hidden</span> takes it off every list (for a broken problem).</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a problem" className={cn(input, 'mt-3 w-full max-w-sm')} />
      <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[720px] text-left">
          <thead className="text-sm text-muted"><tr><th className="px-3 py-3 font-medium">Problem</th><th className="px-3 py-3 font-medium">Default</th><th className="px-3 py-3 font-medium">Access</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className={cn('border-t border-line', r.override === 'hidden' && 'opacity-60')}>
                <td className="px-3 py-2.5"><span className="font-semibold text-heading">{r.title}</span><span className="block text-sm text-muted">{r.id} · {r.difficulty} · {r.topic} · {r.companies.join(', ')}</span></td>
                <td className="px-3 py-2.5 text-sm text-muted">{r.free_core ? 'Free core' : 'Pack'}</td>
                <td className="px-3 py-2.5">
                  <select value={r.override} onChange={(e) => set(r.id, e.target.value as PracticeAccessRow['override'])} className={input}>
                    <option value="default">Default</option><option value="free">Free</option><option value="pack">Pack</option><option value="hidden">Hidden</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DailyView() {
  const [d, setD] = useState<Awaited<ReturnType<typeof fetchDailySchedule>> | null>(null);
  const [problems, setProblems] = useState<PracticeAccessRow[]>([]);
  const [err, setErr] = useState('');
  const load = () => fetchDailySchedule().then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); fetchPracticeAccess().then((r) => setProblems(r.problems.filter((p) => p.override !== 'hidden'))).catch(() => undefined); }, []);
  if (err) return <ErrorState message={err} />;
  if (!d) return <BrandLoader caption="Loading the daily schedule…" />;
  return (
    <>
      <p className="rounded-xl bg-surface-hover p-3 text-body-md text-body">One problem a day for everyone, picked automatically from the free problems. Pin a problem to a date to choose it yourself.</p>
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
        {d.schedule.map((s) => (
          <li key={s.date} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <span className={cn('w-36 text-body-md font-semibold', s.date === d.today ? 'text-signal-ink' : 'text-heading')}>{new Date(`${s.date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}{s.date === d.today ? ' · today' : ''}</span>
            <select value={s.overridden ? s.id || '' : ''} onChange={(e) => setDailyProblem(s.date, e.target.value || null).then(load)} className={cn(input, 'min-w-[260px] flex-1')}>
              <option value="">Automatic: {s.title || '—'}</option>
              {problems.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.difficulty})</option>)}
            </select>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Admin → TiE Coins (TIE_COINS_STORE_PLAN.md §7): stats, students and their ledger, earning rules, practice access, the daily problem. */
export const CoinsAdminTab: React.FC = () => {
  const [view, setView] = useState<View>('stats');
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-heading"><CoinIcon size={24} /> TiE Coins</h2>
          <p className="text-body-md text-body">What students earn and hold, the earning rules, who can open which problem, and the daily problem.</p>
        </div>
        <Segmented label="Section" value={view} onChange={setView}
          items={[{ key: 'stats', label: 'Stats' }, { key: 'students', label: 'Students' }, { key: 'rules', label: 'Earning rules' }, { key: 'access', label: 'Practice access' }, { key: 'daily', label: 'Daily problem' }]} />
      </div>
      {view === 'stats' && <StatsView />}
      {view === 'students' && <StudentsView />}
      {view === 'rules' && <RulesView />}
      {view === 'access' && <AccessView />}
      {view === 'daily' && <DailyView />}
    </div>
  );
};
