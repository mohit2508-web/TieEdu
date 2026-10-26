import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { BadgeCheck, Download, PartyPopper, Trash2 } from 'lucide-react';
import { downloadShareCard } from '@/lib/shareCard';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Chip, Skeleton } from '@/components/ui';
import { fetchCompanies } from '@/lib/api';
import { fetchMyOffers, fetchOfferWall, submitOffer, withdrawOffer, type MyOffer, type OfferItem } from '@/lib/offersApi';
import { cn } from '@/lib/cn';

/*
 * The offer wall (C1). Students who got placed share the route that got them
 * there. Stories are moderated before they appear; "Verified" means an admin
 * confirmed the offer with the student. Names appear the way the author chose.
 */

const monthYear = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });
const STATUS: Record<MyOffer['status'], string> = { pending: 'Being reviewed', approved: 'On the wall', rejected: 'Not published' };

export default function OffersPage() {
  const { user } = useAuth();
  const [wall, setWall] = useState<{ items: OfferItem[]; companies: Array<{ slug: string; name: string }> } | null>(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState<MyOffer[]>([]);

  useEffect(() => {
    fetchOfferWall(filter || undefined).then(setWall).catch(() => setError('The wall could not be loaded. Check your connection and try again.'));
  }, [filter]);
  const loadMine = () => fetchMyOffers().then((r) => setMine(r.items)).catch(() => setMine([]));
  useEffect(() => { if (user) loadMine(); }, [user]);

  return (
    <>
      <Head>
        <title>Offers and the routes that got them · TieEdu</title>
        <meta name="description" content="Real placement offers from TieEdu students, and how each one prepared: the rounds, the practice and what made the difference." />
      </Head>
      <main className="mx-auto w-full max-w-[880px] px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <p className="eyebrow text-signal">Offer wall</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">Offers, and the route that got them</h1>
        <p className="mt-2 text-base text-body">Students who got placed, in their own words: what they practised, what was asked, and what made the difference.</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {user ? (
            <Button icon={PartyPopper} onClick={() => setOpen((v) => !v)}>{open ? 'Close' : 'Got placed? Share your route'}</Button>
          ) : (
            <Button href="/login?next=%2Foffers" icon={PartyPopper}>Got placed? Sign in to share</Button>
          )}
        </div>

        {user && open && <ShareForm onDone={() => { setOpen(false); loadMine(); }} />}

        {mine.length > 0 && (
          <Card className="mt-4">
            <p className="text-sm font-bold text-heading">Your stories</p>
            <ul className="mt-2 space-y-2">
              {mine.map((m) => (
                <li key={m.id} className="flex items-center gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate text-body">{m.company} · {m.role}</span>
                  <span className={cn('shrink-0 font-semibold', m.status === 'approved' ? 'text-success' : m.status === 'rejected' ? 'text-danger' : 'text-muted')}>{STATUS[m.status]}</span>
                  {m.status === 'approved' && (
                    <button
                      type="button"
                      aria-label={`Share the ${m.company} offer as an image`}
                      onClick={() =>
                        downloadShareCard(
                          {
                            eyebrow: m.verified ? 'Verified offer' : 'Offer',
                            headline: `Placed at ${m.company}`,
                            lines: [m.role, 'How I prepared is on the TieEdu offer wall'],
                            url: `${window.location.host}/offers`,
                          },
                          'portrait',
                          `tieedu-offer-${m.company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                        ).catch(() => { /* canvas unavailable: the wall link still works */ })
                      }
                      className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:text-heading"
                    >
                      <Download className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                  <button type="button" aria-label={`Withdraw the ${m.company} story`} onClick={() => withdrawOffer(m.id).then(loadMine)} className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:text-danger">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {wall && wall.companies.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by company">
            <Chip selected={!filter} onClick={() => setFilter('')}>All</Chip>
            {wall.companies.map((c) => <Chip key={c.slug} selected={filter === c.slug} onClick={() => setFilter(c.slug)}>{c.name}</Chip>)}
          </div>
        )}

        {error && <p className="mt-6 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
        {!wall && !error && <div className="mt-6 space-y-3">{[0, 1].map((n) => <Skeleton key={n} className="h-40 w-full rounded-[14px]" />)}</div>}
        {wall && wall.items.length === 0 && (
          <Card pad="lg" className="mt-6 text-center">
            <p className="font-display text-lg font-bold text-heading">No stories here yet</p>
            <p className="mt-1 text-sm text-muted">The first ones are being checked. If you have been placed, yours could be first.</p>
          </Card>
        )}
        <ul className="mt-6 space-y-4">
          {wall?.items.map((o) => (
            <li key={o.id}>
              <Card pad="lg">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/company/${o.company_slug}`} className="font-display text-xl font-bold text-heading hover:text-signal">{o.company}</Link>
                    <p className="text-sm text-muted">{o.role}{o.ctc_lpa !== null && ` · ₹${o.ctc_lpa} LPA`}</p>
                  </div>
                  {o.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified offer
                    </span>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-body">{o.story}</p>
                <p className="mt-3 text-sm font-semibold text-muted">— {o.name}{o.college && `, ${o.college}`} · {monthYear.format(new Date(o.created_at))}</p>
              </Card>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}

function ShareForm({ onDone }: { onDone: () => void }) {
  const [companies, setCompanies] = useState<Array<{ name: string; slug: string }>>([]);
  const [f, setF] = useState({ company_slug: '', role: '', ctc_lpa: '', story: '', name_mode: 'first_name', college: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    fetchCompanies().then((cs) => setCompanies((cs || []).map((c: any) => ({ name: c.name, slug: c.slug })).sort((a, b) => a.name.localeCompare(b.name)))).catch(() => { /* the select shows its placeholder */ });
  }, []);
  const field = 'mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading placeholder:text-light';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await submitOffer(f);
      setMsg({ ok: true, text: 'Thank you. We check every story before it goes up — usually within a day.' });
      setTimeout(onDone, 1800);
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card pad="lg" className="mt-4">
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-heading">Company</span>
          <select required value={f.company_slug} onChange={(e) => setF({ ...f, company_slug: e.target.value })} className={field}>
            <option value="">Choose</option>
            {companies.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label className="block"><span className="text-sm font-semibold text-heading">Role</span><input required maxLength={80} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} autoComplete="off" placeholder="e.g. Associate Software Engineer" className={field} /></label>
        <label className="block"><span className="text-sm font-semibold text-heading">Package, LPA <span className="font-normal text-muted">(optional)</span></span><input type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" value={f.ctc_lpa} onChange={(e) => setF({ ...f, ctc_lpa: e.target.value })} autoComplete="off" placeholder="e.g. 4.5" className={field} /></label>
        <label className="block"><span className="text-sm font-semibold text-heading">College <span className="font-normal text-muted">(optional)</span></span><input maxLength={80} value={f.college} onChange={(e) => setF({ ...f, college: e.target.value })} autoComplete="off" className={field} /></label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-heading">How you prepared</span>
          <textarea required minLength={80} maxLength={1500} rows={6} value={f.story} onChange={(e) => setF({ ...f, story: e.target.value })} placeholder="The rounds, what was asked, what you practised, what you would tell a junior…" className="mt-1 w-full rounded-xl border border-line bg-card px-3.5 py-3 text-base text-heading placeholder:text-light focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20" />
          <span className="text-xs text-muted">{f.story.trim().length} / 1500 · at least 80</span>
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-semibold text-heading">Show my name as</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {[['first_name', 'First name'], ['initials', 'Initials'], ['anonymous', 'Anonymous']].map(([v, l]) => (
              <Chip key={v} selected={f.name_mode === v} onClick={() => setF({ ...f, name_mode: v })}>{l}</Chip>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={busy || !f.company_slug || f.story.trim().length < 80}>{busy ? 'Sending…' : 'Send for review'}</Button>
          {msg && <span className={cn('text-sm', msg.ok ? 'text-success' : 'text-danger')}>{msg.text}</span>}
        </div>
      </form>
    </Card>
  );
}
