import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CheckCircle2, Clock, Mail, MessageSquareText, ShieldCheck } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { Accordion } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { LEGAL } from '@/lib/legal';
import { SUPPORT_TOPICS, sendSupportRequest, type SupportTopic } from '@/lib/supportApi';

const FAQ = [
  {
    id: 'paid-not-unlocked',
    question: 'I paid but the course or pack did not unlock.',
    answer: 'UPI payments are checked against the bank reference. If it has not unlocked within a few hours, send us the UTR (12-digit reference) using the form with topic “Payment or refund” and we will unlock it or refund you.',
  },
  {
    id: 'refund',
    question: 'How do I get a refund?',
    answer: <>Ask within {LEGAL.refundWindowDays} days of purchase. Everything is in the <Link className="font-semibold text-link underline" href="/refund-policy">Refund Policy</Link>.</>,
  },
  {
    id: 'certificate',
    question: 'Where is my certificate, and how can an employer check it?',
    answer: <>Finished certificates are in <Link className="font-semibold text-link underline" href="/my-certificates">My certificates</Link>. Each has a serial and QR code anyone can check at <Link className="font-semibold text-link underline" href="/verify">/verify</Link>, without an account.</>,
  },
  {
    id: 'lesson-locked',
    question: 'Why is the next lesson locked?',
    answer: 'Courses run in order: finish the current lesson (and its quiz, if it has one) and the next one opens. This is what makes the certificate mean something.',
  },
  {
    id: 'password',
    question: 'I cannot sign in.',
    answer: 'Check you are using the email you signed up with. If you still cannot get in, write to us from that email and we will help you recover the account.',
  },
  {
    id: 'college',
    question: 'I am a TPO / placement officer. How do we use TieEdu for our college?',
    answer: <>See <Link className="font-semibold text-link underline" href="/colleges">TieEdu for colleges</Link>, or send us a message with topic “For colleges / TPO”.</>,
  },
];

export default function ContactPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [f, setF] = useState({ name: '', email: '', topic: 'other' as SupportTopic, message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentRef, setSentRef] = useState<string | null>(null);

  // Prefill from the account, and from ?topic= links elsewhere on the site.
  useEffect(() => {
    setF((prev) => ({
      ...prev,
      name: prev.name || user?.name || '',
      email: prev.email || user?.email || '',
    }));
  }, [user]);
  useEffect(() => {
    const t = router.query.topic;
    if (typeof t === 'string' && SUPPORT_TOPICS.some((x) => x.id === t)) setF((prev) => ({ ...prev, topic: t as SupportTopic }));
  }, [router.query.topic]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await sendSupportRequest(f);
      setSentRef(r.ref);
      setF((prev) => ({ ...prev, message: '' }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field = 'mt-1.5 min-h-[48px] w-full rounded-xl border border-line bg-app px-3.5 text-base text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)]';

  return (
    <>
      <Head>
        <title>{`Contact & support · ${LEGAL.brand}`}</title>
        <meta name="description" content="Get help with payments, courses, certificates and drives, or reach the TieEdu team." />
        <link rel="canonical" href={`${LEGAL.siteUrl}/contact`} />
      </Head>
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="max-w-2xl">
          <p className="eyebrow">Help</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-heading sm:text-5xl">How can we help?</h1>
          <p className="mt-3 text-lg leading-relaxed text-body">
            Real people read every message. Most questions are answered below; for anything else, write to us.
          </p>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: Clock, title: `Reply within ${LEGAL.replyWithinDays} working day`, text: 'Every message gets a written reply' },
            { icon: Mail, title: 'Email us', text: <a className="font-semibold text-link underline" href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> },
            { icon: ShieldCheck, title: `${LEGAL.refundWindowDays}-day refund`, text: <Link className="font-semibold text-link underline" href="/refund-policy">Read the policy</Link> },
          ].map((c) => (
            <div key={c.title} className="flex items-start gap-3 rounded-3xl border border-line bg-card p-5 shadow-edge-neutral">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-ink)] text-white"><c.icon size={20} /></span>
              <div>
                <p className="font-bold text-heading">{c.title}</p>
                <p className="mt-0.5 text-sm text-body">{c.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section aria-labelledby="faq-h">
            <h2 id="faq-h" className="font-display text-2xl font-extrabold tracking-tight text-heading sm:text-3xl">Common questions</h2>
            <Accordion className="mt-5" items={FAQ} />
          </section>

          <section aria-labelledby="form-h" className="rounded-3xl border border-line bg-card p-6 shadow-edge-neutral sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-accent)] text-[var(--accent-ink)]"><MessageSquareText size={20} /></span>
              <h2 id="form-h" className="font-display text-2xl font-extrabold tracking-tight text-heading">Send us a message</h2>
            </div>

            {sentRef ? (
              <div role="status" className="mt-6 rounded-2xl bg-[var(--color-success)]/10 p-5">
                <p className="flex items-center gap-2 font-bold text-heading"><CheckCircle2 size={18} className="text-[var(--color-success)]" /> Message sent</p>
                <p className="mt-1 text-sm text-body">
                  Your reference is <strong>{sentRef}</strong>. We have emailed you a copy and will reply to {f.email} within {LEGAL.replyWithinDays} working day.
                </p>
                <button type="button" onClick={() => setSentRef(null)} className="mt-3 text-sm font-semibold text-link underline">Send another message</button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-heading">
                    Your name
                    <input required autoComplete="name" maxLength={80} className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                  </label>
                  <label className="block text-sm font-semibold text-heading">
                    Email
                    <input required type="email" inputMode="email" autoComplete="email" maxLength={160} className={field} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                  </label>
                </div>
                <label className="block text-sm font-semibold text-heading">
                  What is it about?
                  <select className={field} value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value as SupportTopic })}>
                    {SUPPORT_TOPICS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-heading">
                  Message
                  <textarea
                    required
                    minLength={10}
                    maxLength={4000}
                    rows={6}
                    className={`${field} py-3`}
                    value={f.message}
                    onChange={(e) => setF({ ...f, message: e.target.value })}
                    placeholder={f.topic === 'payment' ? 'Include your order id or the 12-digit UPI reference (UTR).' : 'Tell us what happened and what you expected.'}
                  />
                </label>
                {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
                <button type="submit" disabled={busy} className="btn btn-primary min-h-[48px] w-full px-6 disabled:opacity-60 sm:w-auto">
                  {busy ? 'Sending…' : 'Send message'}
                </button>
                <p className="text-xs text-muted">
                  We use these details only to answer you. See our <Link className="underline" href="/privacy">Privacy Policy</Link>.
                </p>
              </form>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
