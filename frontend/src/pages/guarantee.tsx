import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Skeleton } from '@/components/ui';
import { fetchGuarantee, fetchMyGuarantee, fileClaim, type ClaimStatus, type GuaranteeSettings, type MyClaim } from '@/lib/guaranteeApi';
import { cn } from '@/lib/cn';

/*
 * The accuracy guarantee (D4). When an admin has it switched on: if a round's
 * pattern was different from what we showed, a student who bought that
 * company's content can claim their money back. Every claim is reviewed; the
 * refund itself is made by the team, not automatically.
 */

const STATUS: Record<ClaimStatus, { label: string; tone: string }> = {
  pending: { label: 'Being reviewed', tone: 'text-muted' },
  approved: { label: 'Approved — refund on its way', tone: 'text-success' },
  rejected: { label: 'Not approved', tone: 'text-danger' },
  refunded: { label: 'Refunded', tone: 'text-success' },
};

export default function GuaranteePage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<GuaranteeSettings | null>(null);
  const [mine, setMine] = useState<{ claims: MyClaim[]; claimable: Array<{ slug: string; name: string }> } | null>(null);
  const [f, setF] = useState({ company_slug: '', round: '', interview_date: '', what_differed: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { fetchGuarantee().then(setSettings).catch(() => setSettings({ enabled: false, amount: 99, window_days: 30 })); }, []);
  const loadMine = () => fetchMyGuarantee().then((r) => setMine({ claims: r.claims, claimable: r.claimable })).catch(() => setMine({ claims: [], claimable: [] }));
  useEffect(() => { if (user) loadMine(); }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await fileClaim(f);
      setMsg({ ok: true, text: `Claim received for ₹${r.amount}. We will check it against other reports and reply by email.` });
      setF({ company_slug: '', round: '', interview_date: '', what_differed: '' });
      loadMine();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const field = 'mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading';

  return (
    <>
      <Head>
        <title>Accuracy guarantee · TieEdu</title>
        <meta name="description" content="If a round's pattern was different from what TieEdu showed, get your money back for that company's content." />
      </Head>
      <main className="mx-auto w-full max-w-[760px] px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <p className="eyebrow text-signal">Our promise</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">The accuracy guarantee</h1>
        {!settings && <Skeleton className="mt-4 h-24 w-full" />}
        {settings && !settings.enabled && (
          <Card pad="lg" className="mt-6"><p className="text-base text-body">The accuracy guarantee is not running at the moment.</p></Card>
        )}
        {settings?.enabled && (
          <>
            <p className="mt-2 text-base text-body">
              If you bought a company’s prep and its real round was different from the pattern we showed, tell us within {settings.window_days} days of your interview and get ₹{settings.amount} back.
            </p>
            <Card variant="ink" pad="lg" className="mt-6">
              <p className="flex items-center gap-2 font-display text-lg font-bold text-white"><ShieldCheck className="h-5 w-5 text-money" aria-hidden /> How it works</p>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-white/85 marker:font-bold marker:text-money">
                <li>Claim within {settings.window_days} days of the interview, for a company whose content you bought.</li>
                <li>Say what was different. We check it against other students’ reports.</li>
                <li>If it holds, we refund ₹{settings.amount} to how you paid, and fix the round for everyone after you.</li>
              </ol>
            </Card>

            {!user && <Button href="/login?next=%2Fguarantee" className="mt-6">Sign in to make a claim</Button>}

            {user && mine && (
              <>
                {mine.claimable.length > 0 ? (
                  <Card pad="lg" className="mt-6">
                    <h2 className="font-display text-lg font-bold text-heading">Make a claim</h2>
                    <form onSubmit={submit} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-semibold text-heading">Company</span>
                        <select required value={f.company_slug} onChange={(e) => setF({ ...f, company_slug: e.target.value })} className={field}>
                          <option value="">Choose</option>
                          {mine.claimable.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                        </select>
                      </label>
                      <label className="block"><span className="text-sm font-semibold text-heading">Interview date</span><input type="date" required max={today} value={f.interview_date} onChange={(e) => setF({ ...f, interview_date: e.target.value })} autoComplete="off" className={field} /></label>
                      <label className="block sm:col-span-2"><span className="text-sm font-semibold text-heading">Which round was different?</span><input required maxLength={80} value={f.round} onChange={(e) => setF({ ...f, round: e.target.value })} autoComplete="off" placeholder="e.g. Technical interview" className={field} /></label>
                      <label className="block sm:col-span-2">
                        <span className="text-sm font-semibold text-heading">What was different?</span>
                        <textarea required minLength={40} maxLength={1500} rows={5} value={f.what_differed} onChange={(e) => setF({ ...f, what_differed: e.target.value })} placeholder="What we showed, and what actually happened in the room" className="mt-1 w-full rounded-xl border border-line bg-card px-3.5 py-3 text-base text-heading placeholder:text-light focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20" />
                      </label>
                      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                        <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send claim'}</Button>
                        {msg && <span className={cn('text-sm', msg.ok ? 'text-success' : 'text-danger')}>{msg.text}</span>}
                      </div>
                    </form>
                  </Card>
                ) : (
                  <p className="mt-6 text-sm text-muted">The guarantee covers company content you have bought. You have no purchases left to claim for.</p>
                )}
                {mine.claims.length > 0 && (
                  <section className="mt-6" aria-labelledby="claims-h">
                    <h2 id="claims-h" className="font-display text-lg font-bold text-heading">Your claims</h2>
                    <ul className="mt-3 space-y-2">
                      {mine.claims.map((c) => (
                        <li key={c.id}>
                          <Card>
                            <p className="font-bold text-heading">{c.company} · {c.round} · ₹{c.amount}</p>
                            <p className={cn('text-sm font-semibold', STATUS[c.status].tone)}>{STATUS[c.status].label}</p>
                            {c.admin_note && <p className="mt-1 text-sm text-body">{c.admin_note}</p>}
                          </Card>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
