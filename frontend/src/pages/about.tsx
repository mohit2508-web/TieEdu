import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, BookOpen, Building2, ClipboardCheck, GraduationCap, LineChart, Lock, Scale, Users } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { LEGAL } from '@/lib/legal';

const PILLARS = [
  { icon: BookOpen, name: 'Train', text: 'Courses that run lesson by lesson, from first-year foundations to company-specific preparation.' },
  { icon: ClipboardCheck, name: 'Test', text: 'Skill tests, company-pattern tests, mock drives and mock interviews that feel like the real thing.' },
  { icon: LineChart, name: 'Track', text: 'One readiness score per company, your weakest round, and the next thing to practise.' },
];

const AUDIENCES = [
  { icon: GraduationCap, title: 'Students', text: 'A route that fits your year: foundations first, companies when they matter.', href: '/courses', cta: 'Start learning' },
  { icon: Building2, title: 'Colleges & TPOs', text: 'Batch readiness, drives and reports for the placement cell.', href: '/colleges', cta: 'For colleges' },
  { icon: Users, title: 'Recruiters', text: 'Verified skills from anonymous profiles; contact only when a student accepts.', href: '/recruiters', cta: 'For recruiters' },
];

const PRINCIPLES = [
  { icon: BadgeCheck, title: 'Proof over promises', text: 'Certificates carry a public serial anyone can verify. Ratings come only from people who finished.' },
  { icon: Scale, title: 'Honest numbers', text: 'If we have no data for something, we show nothing rather than a made-up figure.' },
  { icon: Lock, title: 'Your data is yours', text: 'We never sell it. Optional cookies and marketing are off until you say yes.' },
];

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>{`About · ${LEGAL.brand}`}</title>
        <meta name="description" content="TieEdu helps engineering students prepare for placements with Train, Test and Track: courses, company-pattern tests and a readiness score." />
        <link rel="canonical" href={`${LEGAL.siteUrl}/about`} />
      </Head>
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="relative isolate overflow-hidden rounded-[2rem] bg-[var(--brand-ink)] p-8 text-white shadow-float sm:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_10%,rgb(var(--rgb-money)/0.35),transparent_50%)]" />
          <p className="text-xs font-extrabold uppercase tracking-widest text-white/70">About {LEGAL.brand}</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Every student should walk into placement season knowing they are ready.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            Most students prepare from scattered videos and old PDFs and only find out what they were missing on the day
            of the test. {LEGAL.brand} puts the whole route in one place, and shows you where you stand at every step.
          </p>
        </header>

        <section aria-labelledby="ttt-h" className="mt-14">
          <p className="eyebrow">How it works</p>
          <h2 id="ttt-h" className="mt-1 font-display text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">Train · Test · Track</h2>
          <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <li key={p.name} className="rounded-3xl border border-line bg-card p-6 shadow-edge-neutral">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-accent)] text-[var(--accent-ink)]"><p.icon size={22} /></span>
                  <span aria-hidden="true" className="font-display text-4xl font-extrabold text-line">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-display text-2xl font-extrabold text-heading">{p.name}</h3>
                <p className="mt-2 text-base leading-relaxed text-body">{p.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="who-h" className="mt-14">
          <p className="eyebrow">Who it is for</p>
          <h2 id="who-h" className="mt-1 font-display text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">Built for the whole placement journey</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {AUDIENCES.map((a) => (
              <Link key={a.title} href={a.href} className="group flex flex-col rounded-3xl border border-line bg-card p-6 shadow-edge-neutral transition-colors hover:border-[var(--brand-sky)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-ink)] text-white"><a.icon size={22} /></span>
                <h3 className="mt-4 font-display text-xl font-extrabold text-heading">{a.title}</h3>
                <p className="mt-2 flex-1 text-base leading-relaxed text-body">{a.text}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-link">
                  {a.cta} <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="believe-h" className="mt-14">
          <p className="eyebrow">What we stand for</p>
          <h2 id="believe-h" className="mt-1 font-display text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">Three rules we do not bend</h2>
          <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <li key={p.title} className="flex gap-4 rounded-3xl border border-line bg-card p-6">
                <p.icon size={24} className="mt-0.5 shrink-0 text-link" />
                <div>
                  <h3 className="font-bold text-heading">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-body">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 flex flex-col items-start justify-between gap-5 rounded-3xl border border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/10 p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-heading">Questions, partnerships or press?</h2>
            <p className="mt-1 text-base text-body">We read every message.</p>
          </div>
          <Link href="/contact" className="btn btn-primary min-h-[48px] px-6">Contact us</Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
