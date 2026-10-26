import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowRight, HeartHandshake, Lock, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Chip, Skeleton } from '@/components/ui';
import { createDebrief, deleteDebrief, fetchDebriefs, type DebriefList, type DebriefView } from '@/lib/debriefApi';
import { fetchCompanies } from '@/lib/api';

/*
 * Rejection debrief (B7). Two minutes after a "no": what happened, then a
 * plan for what to do about it. The note is private; peer numbers show only
 * when enough students have logged the same company (backend lib/debrief).
 */

const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

export default function DebriefPage() {
  const { user, loading } = useAuth();
  const [list, setList] = useState<DebriefList | null>(null);
  const [companies, setCompanies] = useState<Array<{ name: string; slug: string }>>([]);
  const [slug, setSlug] = useState('');
  const [round, setRound] = useState('');
  const [reasons, setReasons] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [latest, setLatest] = useState<DebriefView | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchDebriefs().then(setList).catch(() => setErr('Your debriefs could not be loaded. Check your connection and try again.'));
    fetchCompanies()
      .then((cs) => setCompanies((cs || []).map((c: any) => ({ name: c.name, slug: c.slug })).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => { /* the select shows its placeholder */ });
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { debrief } = await createDebrief({ company_slug: slug, round, reasons, note });
      setLatest(debrief);
      setList((l) => (l ? { ...l, debriefs: [debrief, ...l.debriefs] } : l));
      setSlug(''); setRound(''); setReasons([]); setNote('');
      requestAnimationFrame(() => document.getElementById('debrief-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await deleteDebrief(id).catch(() => { /* stays listed; the next load corrects it */ });
    setList((l) => (l ? { ...l, debriefs: l.debriefs.filter((d) => d.id !== id) } : l));
    if (latest?.id === id) setLatest(null);
  };

  return (
    <>
      <Head>
        <title>After a rejection · TieEdu</title>
        <meta name="description" content="Got a no from a company? Note what happened in two minutes and get a plan for the next one." />
      </Head>
      <main className="mx-auto w-full max-w-[760px] px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <p className="eyebrow text-signal">After a rejection</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">A no is information, not a verdict</h1>
        <p className="mt-2 text-base text-body">
          Almost everyone gets several before an offer. Take two minutes to note what happened while it is fresh, and leave with a plan for the next company.
        </p>

        {!loading && !user && (
          <Card pad="lg" className="mt-6 text-center">
            <p className="font-display text-xl font-bold text-heading">Sign in to keep your debriefs</p>
            <p className="mt-1 text-sm text-muted">They are private to you, and your plan builds on your own scores.</p>
            <Button href="/login?next=%2Fdebrief" className="mt-4">Sign in</Button>
          </Card>
        )}

        {user && (
          <>
            <Card pad="lg" className="mt-6">
              <form onSubmit={submit}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-heading">Company</span>
                    <select value={slug} onChange={(e) => setSlug(e.target.value)} required className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading">
                      <option value="">Choose a company</option>
                      {companies.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-heading">Round you reached</span>
                    <select value={round} onChange={(e) => setRound(e.target.value)} required className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading">
                      <option value="">Choose a round</option>
                      {(list?.options.rounds || []).map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                </div>
                <fieldset className="mt-4">
                  <legend className="text-sm font-semibold text-heading">What do you think went wrong? <span className="font-normal text-muted">Pick any</span></legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(list?.options.reasons || []).map((r) => {
                      const on = reasons.includes(r.id);
                      return (
                        <Chip key={r.id} selected={on} onClick={() => setReasons((rs) => (on ? rs.filter((x) => x !== r.id) : [...rs, r.id]))}>
                          {r.label}
                        </Chip>
                      );
                    })}
                  </div>
                </fieldset>
                <label className="mt-4 block">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-heading"><Lock className="h-3.5 w-3.5 text-success" aria-hidden /> A note for yourself <span className="font-normal text-muted">(private, optional)</span></span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder="The question you got stuck on, what you would say differently…" className="mt-1 w-full rounded-xl border border-line bg-card px-3.5 py-3 text-base text-heading placeholder:text-light focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20" />
                </label>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={busy || !slug || !round || reasons.length === 0}>{busy ? 'Saving…' : 'Get my plan'}</Button>
                  {err && <span className="text-sm text-danger">{err}</span>}
                </div>
              </form>
            </Card>

            {latest && (
              <section id="debrief-result" className="mt-6 scroll-mt-24" aria-live="polite">
                <DebriefResult d={latest} />
              </section>
            )}

            <section className="mt-8" aria-labelledby="past-h">
              <h2 id="past-h" className="font-display text-lg font-bold text-heading">Your debriefs</h2>
              {!list && !err && <Skeleton className="mt-3 h-20 w-full rounded-[14px]" />}
              {list && list.debriefs.length === 0 && <p className="mt-2 text-sm text-muted">None yet. They stay private to you.</p>}
              <ul className="mt-3 space-y-3">
                {list?.debriefs.filter((d) => d.id !== latest?.id).map((d) => (
                  <li key={d.id}>
                    <Card>
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-heading">{d.company} · {d.round}</p>
                          <p className="text-sm text-muted">{shortDate.format(new Date(d.created_at))} · {d.reasons.join(', ')}</p>
                          {d.note && <p className="mt-1 text-sm text-body">{d.note}</p>}
                          <Link href={d.plan[0]?.href || '/calendar'} className="mt-2 inline-flex min-h-[32px] items-center gap-1 text-sm font-semibold text-signal hover:underline">
                            Next step: {d.plan[0]?.title || 'plan the next company'} <ArrowRight className="h-4 w-4" aria-hidden />
                          </Link>
                        </div>
                        <button type="button" onClick={() => remove(d.id)} aria-label={`Delete the ${d.company} debrief`} className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-surface-hover hover:text-danger">
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </>
  );
}

function DebriefResult({ d }: { d: DebriefView }) {
  return (
    <>
      <Card variant="ink" pad="lg">
        <p className="flex items-center gap-2 font-display text-xl font-bold text-white"><HeartHandshake className="h-6 w-6 text-money" aria-hidden /> Noted. Here is your way back.</p>
        <p className="mt-1 text-white/80">{d.company} · {d.round}. Work through these over the next week or two.</p>
        {d.peers ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-white/[0.08] px-3.5 py-3 text-sm text-white">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-money" aria-hidden />
            <span>You are not alone: {d.peers.students} students have logged a rejection at {d.company}{d.peers.top_reason ? `, most often on ${d.peers.top_reason.toLowerCase()}` : ''}.</span>
          </p>
        ) : (
          <p className="mt-4 rounded-xl bg-white/[0.08] px-3.5 py-3 text-sm text-white/90">Every student who gets an offer has a list of companies that said no first.</p>
        )}
      </Card>
      <ol className="mt-4 space-y-3">
        {d.plan.map((s, i) => (
          <li key={s.href}>
            <Link href={s.href} className="focus-ring group flex gap-4 rounded-[14px] border border-line bg-card p-4 hover:border-line-strong">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-soft font-bold text-signal-ink">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-heading group-hover:text-signal">{s.title}</span>
                <span className="mt-0.5 block text-sm text-body">{s.why}</span>
              </span>
              <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
