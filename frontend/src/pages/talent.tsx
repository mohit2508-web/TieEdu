import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Briefcase, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Skeleton } from '@/components/ui';
import { answerRequest, getStudentTalent, saveStudentTalent, type CandidateCard, type StudentTalent } from '@/lib/talentApi';
import { CandidateView } from '@/components/talent/CandidateView';

/*
 * Get found by recruiters (E4, the student's side). Opt in to verified skill
 * search; recruiters TieEdu has checked see an anonymous card and can ask to
 * contact you. Your name and email go only to a recruiter you accept
 * (backend lib/talentSearch).
 */

const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

export default function TalentPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<StudentTalent | null>(null);
  const [form, setForm] = useState({ branch: '', grad_year: '', city: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getStudentTalent()
      .then((d) => {
        setData(d);
        if (d.profile) setForm({ branch: d.profile.branch || '', grad_year: d.profile.grad_year ? String(d.profile.grad_year) : '', city: d.profile.city || '' });
      })
      .catch(() => setErr('This page could not be loaded. Check your connection and try again.'));
  }, [user]);

  const run = async (fn: () => Promise<StudentTalent>) => {
    setBusy(true);
    setErr(null);
    try {
      setData(await fn());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const save = (visible: boolean) => run(() => saveStudentTalent({ visible, branch: form.branch, grad_year: form.grad_year ? Number(form.grad_year) : null, city: form.city }));
  const visible = data?.profile?.visible === true;
  const field = 'mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading';

  return (
    <>
      <Head>
        <title>Get found by recruiters · TieEdu</title>
        <meta name="description" content="Let verified recruiters find you by your tested skills. Your name and contact stay private until you accept." />
      </Head>
      <main className="mx-auto w-full max-w-[760px] px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <p className="eyebrow text-signal">Get found</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">Let recruiters find you by your skills</h1>
        <p className="mt-2 text-base text-body">
          Small companies hire on what you can do, not where you studied. Recruiters TieEdu has checked can see your tested scores, anonymously, and ask to get in touch.
        </p>

        {!loading && !user && (
          <Card pad="lg" className="mt-6 text-center">
            <p className="font-display text-xl font-bold text-heading">Sign in to turn this on</p>
            <Button href="/login?next=%2Ftalent" className="mt-4">Sign in</Button>
          </Card>
        )}
        {user && !data && !err && <Skeleton className="mt-6 h-48 w-full rounded-[14px]" />}
        {err && <p className="mt-4 text-sm text-danger" role="alert">{err}</p>}

        {user && data && (
          <>
            {!data.enabled && <p className="mt-6 rounded-xl bg-surface-hover px-3.5 py-3 text-sm text-body">Recruiter search opens soon. You can turn this on now and be ready when it does.</p>}
            <Card pad="lg" className="mt-6">
              <p className="flex items-start gap-2 text-sm text-body">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                Recruiters see you as an anonymous candidate: your tested skills and certificates, and the branch, year and city you add below. Never your name, college, photo or contact — until you accept a recruiter’s request.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block"><span className="text-sm font-semibold text-heading">Branch</span><input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} maxLength={40} placeholder="CSE" className={field} /></label>
                <label className="block"><span className="text-sm font-semibold text-heading">Graduation year</span><input value={form.grad_year} onChange={(e) => setForm({ ...form, grad_year: e.target.value.replace(/\D/g, '').slice(0, 4) })} inputMode="numeric" placeholder="2027" className={field} /></label>
                <label className="block"><span className="text-sm font-semibold text-heading">City</span><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={40} placeholder="Noida" className={field} /></label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={() => save(true)} disabled={busy}>{visible ? 'Save changes' : 'Let recruiters find me'}</Button>
                {visible && <Button kind="secondary" icon={EyeOff} onClick={() => save(false)} disabled={busy}>Stop showing me</Button>}
                {visible && <span className="text-sm text-success">You are searchable.</span>}
              </div>
              {visible && <p className="mt-2 text-xs text-muted">Stopping hides you at once. Recruiters you already accepted keep the contact you shared.</p>}
            </Card>

            {data.preview && <Preview card={data.preview} />}

            <section className="mt-8" aria-labelledby="req-h">
              <h2 id="req-h" className="font-display text-lg font-bold text-heading">Requests from recruiters</h2>
              {data.requests.length === 0 && <p className="mt-2 text-sm text-muted">None yet. Taking more skill tests gives recruiters more to see.</p>}
              <ul className="mt-3 space-y-3">
                {data.requests.map((r) => (
                  <li key={r.id}>
                    <Card>
                      <p className="flex items-center gap-2 font-bold text-heading"><Briefcase className="h-4 w-4 text-signal" aria-hidden /> {r.company}</p>
                      <p className="text-sm text-body">{r.role} · {r.location} · {r.pay_range}</p>
                      {r.note && <p className="mt-1 text-sm text-muted">“{r.note}”</p>}
                      <p className="mt-1 text-xs text-muted">
                        {shortDate.format(new Date(r.created_at))}
                        {r.website && <> · <a href={r.website} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-signal hover:underline">company website</a></>}
                        {' '}· verified by TieEdu
                      </p>
                      {r.status === 'pending' ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => run(() => answerRequest(r.id, true))} disabled={busy}>Share my name and email</Button>
                          <Button size="sm" kind="secondary" onClick={() => run(() => answerRequest(r.id, false))} disabled={busy}>No thanks</Button>
                        </div>
                      ) : (
                        <p className={`mt-2 text-sm font-semibold ${r.status === 'accepted' ? 'text-success' : 'text-muted'}`}>{r.status === 'accepted' ? 'You shared your contact. They will reach you by email.' : 'You declined.'}</p>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
            <p className="mt-8 text-sm text-muted">Hiring? <Link href="/recruiters" className="font-semibold text-signal hover:underline">Apply as a recruiter</Link>.</p>
          </>
        )}
      </main>
    </>
  );
}

function Preview({ card }: { card: CandidateCard }) {
  return (
    <section className="mt-6" aria-labelledby="prev-h">
      <h2 id="prev-h" className="font-display text-lg font-bold text-heading">What a recruiter sees</h2>
      <CandidateView card={card} />
    </section>
  );
}
