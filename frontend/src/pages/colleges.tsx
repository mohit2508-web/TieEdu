import React, { useState } from 'react';
import Head from 'next/head';
import { ArrowRight, BarChart3, CheckCircle2, ClipboardList, Download, GraduationCap, Lock } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { Button, Card, SectionHead, Stamp } from '@/components/ui';
import { ReadinessView } from '@/components/tpo/ReadinessView';
import { API_BASE_URL } from '@/lib/api';
import type { BatchReadiness } from '@/lib/placementApi';

/**
 * /colleges — TieEdu for placement cells (UI_REDESIGN_PLAN_V2 §7.1).
 *
 * The product tour is the real batch-readiness component rendering sample
 * data, labelled as such on screen. Nothing on this page states a price, a
 * client count or a compliance certification we have not got: pricing is
 * quoted per batch, and the data section describes what the product does.
 */

const sample = (n: number, roll: string, branch: string, r: (number | null)[], segment: any, last: string | null, tests: number) => {
  const vals = r.filter((v): v is number => v !== null);
  return {
    user_id: `s${n}`, label: roll, roll_no: roll, branch, batch: '2027',
    readiness: { a: r[0], b: r[1], c: r[2] },
    average: vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : null,
    tests, lessons: tests * 2, last_active: last, segment,
  };
};
const SAMPLE: BatchReadiness = {
  generated_at: '2026-10-26T09:00:00Z',
  companies: [
    { id: 'a', name: 'Company A', slug: 'a', targeted_by: 31 },
    { id: 'b', name: 'Company B', slug: 'b', targeted_by: 24 },
    { id: 'c', name: 'Company C', slug: 'c', targeted_by: 12 },
  ],
  students: [
    sample(1, 'CS-001', 'CSE', [84, 77, null], 'ready', '2026-10-25', 9),
    sample(2, 'CS-002', 'CSE', [41, 52, 38], 'at_risk', '2026-10-24', 5),
    sample(3, 'EC-011', 'ECE', [63, 58, null], 'in_progress', '2026-10-23', 4),
    sample(4, 'IT-021', 'IT', [null, null, null], 'not_started', null, 0),
    sample(5, 'EC-012', 'ECE', [72, 81, 70], 'ready', '2026-10-26', 11),
  ] as BatchReadiness['students'],
  segments: { not_started: 1, at_risk: 1, in_progress: 1, ready: 2 },
};

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Batch readiness',
    body: 'Every student against the companies your batch is preparing for, scored from the tests they take. Filter by branch, see who is at risk, export to CSV.',
  },
  {
    icon: ClipboardList,
    title: 'Mock drives',
    body: 'Run a company-style assessment for your batch: registrations, the test, results — in the same portal.',
  },
  {
    icon: GraduationCap,
    title: 'Free for your students',
    body: 'Skill tests, many courses and every company’s free pack cost students nothing. Their practice is what fills your dashboard.',
  },
  {
    icon: Download,
    title: 'Your data, exportable',
    body: 'Download what you see as CSV for your own reports. Nothing is locked inside TieEdu.',
  },
];

const DemoForm: React.FC = () => {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    setState('sending');
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/colleges/demo-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send. Please try again.');
      setState('sent');
    } catch (err: any) {
      setError(err?.message || 'Could not send. Please try again.');
      setState('idle');
    }
  };

  if (state === 'sent') {
    return (
      <Card variant="raised" className="text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden />
        <h3 className="mt-3 font-display text-xl font-bold text-heading">Thanks. We will be in touch.</h3>
        <p className="mt-1 text-sm text-muted">We reply by email to set a time that suits you.</p>
      </Card>
    );
  }

  const field = 'min-h-[44px] w-full rounded-xl border border-line-strong bg-card px-3 text-base text-heading placeholder:text-text-light focus:border-signal focus:outline-none focus:ring-4 focus:ring-signal/10';
  return (
    <Card variant="raised" as="section">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-heading">
          Your name
          <input name="name" required autoComplete="name" className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-heading">
          Your role
          <input name="role" autoComplete="organization-title" placeholder="Training & Placement Officer" className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-heading sm:col-span-2">
          College
          <input name="college" required autoComplete="organization" className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-heading">
          Work email
          <input name="email" type="email" required autoComplete="email" inputMode="email" className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-heading">
          <span>Phone <span className="font-normal text-muted">(optional)</span></span>
          <input name="phone" type="tel" autoComplete="tel" inputMode="tel" className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-heading">
          Students in the batch
          <input name="batch_size" type="number" min={1} inputMode="numeric" autoComplete="off" className={field} />
        </label>
        {/* Honeypot: hidden from people and screen readers; bots fill it. */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-heading sm:col-span-2">
          <span>Anything we should know? <span className="font-normal text-muted">(optional)</span></span>
          <textarea name="message" rows={3} className={`${field} py-2`} />
        </label>
        {error && (
          <p className="text-sm text-danger sm:col-span-2" role="alert">
            {error}
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" size="lg" disabled={state === 'sending'} icon={ArrowRight} iconEnd>
            {state === 'sending' ? 'Sending…' : 'Book a 20-minute demo'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default function CollegesPage() {
  return (
    <>
      <Head>
        <title>TieEdu for colleges — batch placement readiness in one screen</title>
        <meta
          name="description"
          content="For placement cells: see every student's readiness for the companies coming to campus, run mock drives, and export it all. Book a 20-minute demo."
        />
      </Head>

      <div className="flex min-h-screen flex-col bg-paper">
        <main className="flex-1">
          <section className="bg-brand-ink text-white">
            <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-20">
              <p className="eyebrow text-money">For colleges and placement cells</p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
                See your batch&apos;s placement readiness in one screen, not twenty spreadsheets.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
                Every student&apos;s readiness for the companies coming to your campus, from the tests they actually take. You see
                who needs help this week, before the drive, not after it.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button href="#demo" size="lg" icon={ArrowRight} iconEnd>
                  Book a 20-minute demo
                </Button>
                <a
                  href="#tour"
                  className="focus-ring inline-flex min-h-[52px] items-center justify-center rounded-xl border border-white/30 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  See it with sample data
                </a>
              </div>
            </div>
          </section>

          <section id="tour" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-14 sm:px-6">
            <SectionHead
              eyebrow="The placement officer's view"
              title="Who is ready, who is at risk, who has not started"
              description="This is the real screen, filled with made-up students. Click a segment to filter it."
              action={<Stamp kind="pending" flat>Sample data — not a real college</Stamp>}
            />
            <div className="mt-8 rounded-[20px] border border-line bg-card p-4 sm:p-6">
              <ReadinessView data={SAMPLE} />
            </div>
          </section>

          <section className="mx-auto max-w-[1200px] px-4 pb-14 sm:px-6">
            <SectionHead title="What your placement cell gets" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <Card key={f.title}>
                  <f.icon className="h-6 w-6 text-signal" aria-hidden />
                  <h3 className="mt-3 font-display text-lg font-bold text-heading">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
                </Card>
              ))}
            </div>
          </section>

          <section className="border-y border-line bg-card">
            <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
              <div>
                <SectionHead eyebrow="Student data" title="What you see, and what you don't" />
                <p className="mt-4 text-base leading-relaxed text-body">
                  Students join your college&apos;s view themselves, by adding their college and roll number to their TieEdu
                  profile. Nothing is imported behind their back.
                </p>
              </div>
              <ul className="space-y-4 text-base text-body">
                {[
                  'The readiness view shows each student’s readiness, test count and last activity — not their answers or attempt history.',
                  'In the readiness view, names are shown only to officers whose role includes student data. Everyone else sees roll numbers.',
                  'Officers join by invitation, and each officer gets only the access their role needs.',
                  'Exports contain exactly what is on your screen, nothing more.',
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Lock className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id="demo" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-14 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
              <div>
                <SectionHead eyebrow="Pricing" title="Priced per batch" />
                <p className="mt-4 text-base leading-relaxed text-body">
                  Tell us how many students are in the batch and we will send a quote. You can start with a pilot on one batch
                  before deciding on more.
                </p>
                <p className="mt-4 text-base leading-relaxed text-body">
                  In the demo we will show you the portal with your own companies and answer questions about your students&apos;
                  data.
                </p>
              </div>
              <DemoForm />
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
