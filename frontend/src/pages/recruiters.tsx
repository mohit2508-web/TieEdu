import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { Clock, Mail, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Skeleton } from '@/components/ui';
import { CandidateView } from '@/components/talent/CandidateView';
import {
  applyRecruiter, getRecruiterHome, searchTalent, sendTalentInterest, withdrawTalentInterest,
  type CandidateCard, type RecruiterHome,
} from '@/lib/talentApi';

/*
 * For recruiters (E4). Apply; once TieEdu verifies the company, search
 * students by tested skill. Candidates are anonymous until they accept a
 * request, which shares their name and email (backend lib/talentSearch).
 */

const field = 'mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading';
const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

export default function RecruitersPage() {
  const { user, loading } = useAuth();
  const [home, setHome] = useState<RecruiterHome | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getRecruiterHome().then(setHome).catch(() => setErr('This page could not be loaded. Check your connection and try again.'));
  }, [user]);

  const r = home?.recruiter;
  return (
    <>
      <Head>
        <title>Hire on tested skills · TieEdu</title>
        <meta name="description" content="Search students by verified skill-test scores. Verified recruiters only; candidates share contact when they accept." />
      </Head>
      <main className="mx-auto w-full max-w-[900px] px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <p className="eyebrow text-signal">For recruiters</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">Hire on tested skills</h1>
        <p className="mt-2 text-base text-body">
          Search students by their verified TieEdu skill-test scores. Candidates are anonymous; send a request with the role and pay, and they choose whether to share their contact.
        </p>

        {!loading && !user && (
          <Card pad="lg" className="mt-6 text-center">
            <p className="font-display text-xl font-bold text-heading">Sign in to apply</p>
            <p className="mt-1 text-sm text-muted">Use any TieEdu account; you will add your work email next.</p>
            <Button href="/login?next=%2Frecruiters" className="mt-4">Sign in</Button>
          </Card>
        )}
        {user && !home && !err && <Skeleton className="mt-6 h-48 w-full rounded-[14px]" />}
        {err && <p className="mt-4 text-sm text-danger" role="alert">{err}</p>}

        {user && home && (!r || r.status === 'rejected') && <Apply rejectedNote={r?.status === 'rejected' ? r.admin_note : null} onDone={setHome} />}
        {r?.status === 'pending' && (
          <Card pad="lg" className="mt-6">
            <p className="flex items-center gap-2 font-display text-lg font-bold text-heading"><Clock className="h-5 w-5 text-signal" aria-hidden /> Application received</p>
            <p className="mt-1 text-body">TieEdu checks {r.company} and {r.work_email} before you can search. You will be able to search here once verified.</p>
          </Card>
        )}
        {r?.status === 'suspended' && <Card pad="lg" className="mt-6"><p className="text-body">This recruiter account is suspended. Contact TieEdu support.</p></Card>}
        {r?.status === 'approved' && !home!.enabled && <Card pad="lg" className="mt-6"><p className="text-body">You are verified. Search opens soon.</p></Card>}
        {r?.status === 'approved' && home!.enabled && <Workspace home={home!} setHome={setHome} />}
      </main>
    </>
  );
}

function Apply({ rejectedNote, onDone }: { rejectedNote: string | null; onDone: (h: RecruiterHome) => void }) {
  const [form, setForm] = useState({ company: '', website: '', work_email: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Card pad="lg" className="mt-6">
      <p className="flex items-center gap-2 font-display text-lg font-bold text-heading"><ShieldCheck className="h-5 w-5 text-success" aria-hidden /> Apply to search</p>
      {rejectedNote && <p className="mt-2 text-sm text-danger">Your last application was not approved: {rejectedNote}</p>}
      <form
        className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try { onDone(await applyRecruiter(form)); } catch (e2) { setErr((e2 as Error).message); } finally { setBusy(false); }
        }}
      >
        <label className="block"><span className="text-sm font-semibold text-heading">Company</span><input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={field} /></label>
        <label className="block"><span className="text-sm font-semibold text-heading">Website</span><input required value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="acmelabs.in" className={field} /></label>
        <label className="block"><span className="text-sm font-semibold text-heading">Work email</span><input required type="email" inputMode="email" autoComplete="work email" value={form.work_email} onChange={(e) => setForm({ ...form, work_email: e.target.value })} placeholder="hr@acmelabs.in" className={field} /></label>
        <div className="sm:col-span-3">
          <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Apply'}</Button>
          {err && <span className="ml-3 text-sm text-danger">{err}</span>}
          <p className="mt-2 text-xs text-muted">Use an email on your company’s own domain. TieEdu checks every recruiter before they can see students.</p>
        </div>
      </form>
    </Card>
  );
}

function Workspace({ home, setHome }: { home: RecruiterHome; setHome: (h: RecruiterHome) => void }) {
  const [q, setQ] = useState({ skill: '', min_score: '', grad_year: '', branch: '', city: '' });
  const [results, setResults] = useState<CandidateCard[] | null>(null);
  const [skills, setSkills] = useState<Array<{ slug: string; name: string }>>([]);
  const [asking, setAsking] = useState<string | null>(null);
  const [offer, setOffer] = useState({ role: '', location: '', pay_range: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      const r = await searchTalent(q);
      setResults(r.results);
      setSkills(r.skills);
    } catch (e2) {
      setMsg({ ok: false, text: (e2 as Error).message });
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- first load only
  useEffect(() => { search(); }, []);

  const send = async (candidate: string) => {
    setBusy(true);
    setMsg(null);
    try {
      setHome(await sendTalentInterest({ candidate, ...offer }));
      setAsking(null);
      setMsg({ ok: true, text: `Request sent to ${candidate}. You will see their contact here if they accept.` });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const accepted = home.requests.filter((r) => r.contact);
  return (
    <>
      {accepted.length > 0 && (
        <Card pad="lg" className="mt-6">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-heading"><Mail className="h-5 w-5 text-success" aria-hidden /> Candidates who shared their contact</p>
          <ul className="mt-3 space-y-2">
            {accepted.map((r) => (
              <li key={r.id} className="rounded-xl border border-line p-3 text-sm">
                <p className="font-bold text-heading">{r.contact!.name} <span className="font-normal text-muted">({r.candidate}, for {r.role})</span></p>
                <a href={`mailto:${r.contact!.email}`} className="font-semibold text-signal hover:underline">{r.contact!.email}</a>
                {r.contact!.certificates.length > 0 && (
                  <p className="mt-1 text-xs text-muted">Certificates: {r.contact!.certificates.map((c, i) => <React.Fragment key={c.verify_url}>{i > 0 && ', '}<a href={c.verify_url} target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">{c.title}</a></React.Fragment>)}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card pad="lg" className="mt-6">
        <form onSubmit={search} className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          <label className="col-span-2 block"><span className="text-sm font-semibold text-heading">Skill</span>
            <select value={q.skill} onChange={(e) => setQ({ ...q, skill: e.target.value })} className={field}><option value="">Any skill</option>{skills.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select>
          </label>
          <label className="block"><span className="text-sm font-semibold text-heading">Min score</span><input value={q.min_score} onChange={(e) => setQ({ ...q, min_score: e.target.value.replace(/\D/g, '').slice(0, 3) })} inputMode="numeric" placeholder="60" className={field} /></label>
          <label className="block"><span className="text-sm font-semibold text-heading">Year</span><input value={q.grad_year} onChange={(e) => setQ({ ...q, grad_year: e.target.value.replace(/\D/g, '').slice(0, 4) })} inputMode="numeric" placeholder="2027" className={field} /></label>
          <label className="block"><span className="text-sm font-semibold text-heading">Branch</span><input value={q.branch} onChange={(e) => setQ({ ...q, branch: e.target.value })} placeholder="CSE" className={field} /></label>
          <label className="block"><span className="text-sm font-semibold text-heading">City</span><input value={q.city} onChange={(e) => setQ({ ...q, city: e.target.value })} placeholder="Noida" className={field} /></label>
          <div className="col-span-2 sm:col-span-6 flex flex-wrap items-center gap-3">
            <Button type="submit" icon={Search}>Search</Button>
            {home.limits && <span className="text-sm text-muted">{home.limits.used_this_week} of {home.limits.per_week} requests used this week</span>}
          </div>
        </form>
      </Card>
      {msg && <p className={`mt-4 text-sm ${msg.ok ? 'text-success' : 'text-danger'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}

      {results && results.length === 0 && <p className="mt-6 text-sm text-muted">No candidates match. Try a lower score or fewer filters.</p>}
      <ul className="mt-2">
        {results?.map((c) => (
          <li key={c.id}>
            <CandidateView card={c} action={<Button size="sm" kind="secondary" onClick={() => setAsking(asking === c.handle ? null : c.handle)}>Ask to connect</Button>} />
            {asking === c.handle && (
              <Card className="mt-2">
                <form className="grid grid-cols-1 gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); send(c.handle); }}>
                  <label className="block"><span className="text-sm font-semibold text-heading">Role</span><input required maxLength={80} value={offer.role} onChange={(e) => setOffer({ ...offer, role: e.target.value })} placeholder="Junior Java Developer" className={field} /></label>
                  <label className="block"><span className="text-sm font-semibold text-heading">Location</span><input required maxLength={60} value={offer.location} onChange={(e) => setOffer({ ...offer, location: e.target.value })} placeholder="Noida / remote" className={field} /></label>
                  <label className="block"><span className="text-sm font-semibold text-heading">Pay range</span><input required maxLength={40} value={offer.pay_range} onChange={(e) => setOffer({ ...offer, pay_range: e.target.value })} placeholder="4–5 LPA" className={field} /></label>
                  <label className="block sm:col-span-3"><span className="text-sm font-semibold text-heading">A short note <span className="font-normal text-muted">(no links or contact details)</span></span><input maxLength={300} value={offer.note} onChange={(e) => setOffer({ ...offer, note: e.target.value })} className={field} /></label>
                  <div className="sm:col-span-3"><Button type="submit" disabled={busy}>Send request</Button></div>
                </form>
              </Card>
            )}
          </li>
        ))}
      </ul>

      {home.requests.some((r) => !r.contact) && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold text-heading">Your requests</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {home.requests.filter((r) => !r.contact).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-body">{r.candidate} · {r.role} · {shortDate.format(new Date(r.created_at))} · <span className="font-semibold">{r.status === 'pending' ? 'waiting' : r.status}</span></span>
                {r.status === 'pending' && <Button size="sm" kind="text" onClick={async () => setHome(await withdrawTalentInterest(r.id))}>Withdraw</Button>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
