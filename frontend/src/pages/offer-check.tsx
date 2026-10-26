import React, { useState } from 'react';
import Head from 'next/head';
import { AlertTriangle, CheckCircle2, Lock, Phone, ShieldAlert, ShieldCheck, Share2 } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { checkOffer, type ScamResult } from '@/lib/scamCheck';
import { cn } from '@/lib/cn';

/*
 * "Is this job offer real?" (D3) — a free public tool. The check runs in the
 * browser (lib/scamCheck): offer messages carry names, phone numbers and ID
 * numbers, and none of it is sent anywhere.
 */

const EXAMPLE = {
  text: 'Congratulations! You have been selected for TCS Digital without interview. Pay a refundable security deposit of Rs 2500 to tcshr@ybl within 24 hours to confirm your seat. Contact HR on WhatsApp +91 98xxxxxx10.',
  senderEmail: 'tcs.hr.recruitment@gmail.com',
  link: '',
};

const VERDICT = {
  high: { title: 'Treat this as a scam', note: 'Do not pay, share documents or reply until you have verified it.', icon: ShieldAlert, tone: 'border-danger bg-danger-soft', text: 'text-danger' },
  medium: { title: 'Be careful — verify before you reply', note: 'It shows some signs of a fake offer. Check it through the company’s own site.', icon: AlertTriangle, tone: 'border-warning bg-warning-soft', text: 'text-warning' },
  low: { title: 'No common scam signs found', note: 'That does not prove it is real. Still confirm it on the company’s official careers site.', icon: ShieldCheck, tone: 'border-success bg-success-soft', text: 'text-success' },
} as const;

export default function OfferCheckPage() {
  const [text, setText] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [link, setLink] = useState('');
  const [result, setResult] = useState<ScamResult | null>(null);
  const [copied, setCopied] = useState(false);

  const run = (input = { text, senderEmail, link }) => {
    setResult(checkOffer(input));
    requestAnimationFrame(() => document.getElementById('offer-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const shareTool = async () => {
    const url = `${window.location.origin}/offer-check`;
    const msg = 'Got a job offer that looks too good? Check it for scam signs, free — the text never leaves your phone.';
    try {
      if (navigator.share) await navigator.share({ title: 'Is this job offer real?', text: msg, url });
      else { await navigator.clipboard.writeText(`${msg} ${url}`); setCopied(true); }
    } catch { /* dismissed */ }
  };

  const v = result ? VERDICT[result.level] : null;

  return (
    <>
      <Head>
        <title>Is this job offer real? Free fake job offer checker · TieEdu</title>
        <meta name="description" content="Paste a job offer, email or WhatsApp message and check it for the signs of a fake offer: fees, UPI requests, look-alike company domains and more. Free, and private: it runs on your phone." />
      </Head>
      <main className="mx-auto w-full max-w-[760px] px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <p className="eyebrow text-signal">Free tool</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-heading sm:text-4xl">Is this job offer real?</h1>
        <p className="mt-2 text-base text-body">
          Paste the offer, email or WhatsApp message. We check it for the signs of a fake offer: fees, payment requests, look-alike company sites and more.
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface-hover px-3 py-1.5 text-sm font-semibold text-heading">
          <Lock className="h-4 w-4 text-success" aria-hidden /> Private: the check runs on your phone. Nothing is sent anywhere.
        </p>

        <Card pad="lg" className="mt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run();
            }}
          >
            <label className="block">
              <span className="text-sm font-semibold text-heading">The message</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                required
                placeholder="Paste the full offer, email or chat message here"
                className="mt-1 w-full rounded-xl border border-line bg-card px-3.5 py-3 text-base text-heading placeholder:text-light focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              />
            </label>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-heading">Sender’s email <span className="font-normal text-muted">(optional)</span></span>
                <input type="email" inputMode="email" autoComplete="off" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="hr@company.com" className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading placeholder:text-light" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-heading">Any link in it <span className="font-normal text-muted">(optional)</span></span>
                <input type="url" inputMode="url" autoComplete="off" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-base text-heading placeholder:text-light" />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={!text.trim()}>Check this offer</Button>
              <Button
                kind="text"
                onClick={() => {
                  setText(EXAMPLE.text);
                  setSenderEmail(EXAMPLE.senderEmail);
                  setLink(EXAMPLE.link);
                  run(EXAMPLE);
                }}
              >
                Try an example
              </Button>
            </div>
          </form>
        </Card>

        {result && v && (
          <section id="offer-result" className="mt-6 scroll-mt-24" aria-live="polite">
            <div className={cn('rounded-[14px] border-2 p-5 sm:p-6', v.tone)}>
              <p className={cn('flex items-center gap-2 font-display text-2xl font-bold', v.text)}>
                <v.icon className="h-7 w-7 shrink-0" aria-hidden /> {v.title}
              </p>
              <p className="mt-1 text-base text-heading">{v.note}</p>
            </div>

            {result.signals.length > 0 && (
              <Card pad="lg" className="mt-4">
                <h2 className="font-display text-lg font-bold text-heading">What we found</h2>
                <ul className="mt-3 space-y-4">
                  {result.signals.map((s) => (
                    <li key={s.id} className="flex gap-3">
                      <AlertTriangle className={cn('mt-0.5 h-5 w-5 shrink-0', s.critical ? 'text-danger' : 'text-warning')} aria-hidden />
                      <div className="min-w-0">
                        <p className="font-bold text-heading">{s.label}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-body">{s.why}</p>
                        {s.match && <p className="mt-1 break-words text-sm text-muted">Found: “{s.match}”</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {result.claimed && (
              <Card pad="lg" className="mt-4">
                <h2 className="font-display text-lg font-bold text-heading">Check it with {result.claimed.company} directly</h2>
                <p className="mt-1 text-sm text-body">
                  {result.claimed.company} writes only from {result.claimed.official.join(' or ')}. Open the careers site yourself — type the address, don’t tap the link in the message — and look for the role there.
                </p>
              </Card>
            )}

            <Card pad="lg" className="mt-4">
              <h2 className="font-display text-lg font-bold text-heading">What to do now</h2>
              <ul className="mt-3 space-y-2 text-base text-body">
                <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden /> Never pay to get a job, and never share an OTP or password.</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden /> Ask your college placement cell: they know which drives are real.</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden /> <span>Report a fake offer at <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className="font-semibold text-signal underline">cybercrime.gov.in</a>.</span></li>
              </ul>
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-heading">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
                <span>Already paid or shared bank details? Call the national cyber crime helpline <a href="tel:1930" className="font-bold text-danger underline">1930</a> straight away. The sooner you report, the better the chance of stopping the money.</span>
              </p>
            </Card>

            <p className="mt-4 text-sm text-muted">This is a checklist of common patterns, not a guarantee either way.</p>
          </section>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <p className="text-sm text-body">Know someone job-hunting? Send them this check.</p>
          <Button kind="secondary" size="sm" icon={Share2} onClick={shareTool}>{copied ? 'Link copied' : 'Share'}</Button>
        </div>
      </main>
    </>
  );
}
