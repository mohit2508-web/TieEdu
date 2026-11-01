import React from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Flame, Languages, MessagesSquare, Target, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Button, DeviceFrame, FloatingChip, ProgressRing } from '@/components/ui';
import { CompanyFinder } from '@/components/home/CompanyFinder';
import type { Company } from '@/types';
import type { PublicStats } from '@/lib/api';

/**
 * E3 · Hero and E4 · product mock-up (UI_REDESIGN_PLAN_V3 §9).
 *
 * Ruled exercise-book paper with TieEdu's teal margin line (D2), a proof line
 * that only appears with a real student count, the headline with the
 * highlighter on its last phrase, the company finder (the page's one
 * question), then the Today screen in a browser frame — a phone frame on
 * phones — with sample data that says it is a sample.
 */

const BRANCHES = ['CSE', 'ECE', 'ME', 'EE'];

/** The Today screen, drawn with sample data. Decorative: a picture of the product. */
const SampleToday: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <div className={compact ? 'space-y-3 p-4 pt-9' : 'grid grid-cols-[1fr_220px] gap-5 p-6'} aria-hidden>
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Today · sample</p>
        <p className="mt-1 font-display text-h2 text-heading">Good evening, Riya</p>
      </div>
      <div className="tk-inherit-p flex items-center justify-between rounded-card bg-hero p-4 text-hero-on grid-paper-on-hero">
        <div>
          <p className="font-mono text-eyebrow uppercase text-hero-muted">Test day</p>
          <p className="font-display text-h3">Infosys test in 6 days</p>
          <p className="text-caption text-hero-muted">Round 2 of 4 · Technical</p>
        </div>
        <CalendarDays className="h-6 w-6 text-signal" />
      </div>
      <div>
        <p className="eyebrow mb-2">Up next</p>
        <div className="grid gap-2">
          {[
            ['Coding round mock', '25 min'],
            ['Aptitude: time and work', '12 min'],
          ].map(([t, m]) => (
            <div key={t} className="flex items-center justify-between rounded-cell border border-line bg-card px-3 py-2.5 shadow-edge-neutral">
              <span className="text-sm font-semibold text-heading">{t}</span>
              <span className="whitespace-nowrap rounded-full bg-signal-soft px-2 py-0.5 font-mono text-eyebrow text-signal-ink">{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    {!compact && (
      <div className="space-y-4">
        <div className="rounded-card border border-line bg-card p-4">
          <p className="eyebrow">Streak</p>
          <p className="mt-1 flex items-center gap-2 font-display text-display text-heading">
            <Flame className="h-7 w-7 text-signal" /> 7
          </p>
          <p className="text-caption text-muted">days in a row</p>
        </div>
        <div className="flex flex-col items-center rounded-card border border-line bg-card p-4">
          <ProgressRing value={62} label="Infosys readiness" caption="ready" size={84} />
          <p className="mt-2 text-caption text-muted">Infosys readiness</p>
        </div>
      </div>
    )}
  </div>
);

export const LandingHero: React.FC<{
  companies: Company[];
  stats: PublicStats | null;
  searchQuery: string;
  onSearch: (q: string) => void;
}> = ({ companies, stats, searchQuery, onSearch }) => {
  const covered = companies.slice(0, 4).map((c) => c.name);

  return (
    <section className="relative overflow-hidden border-b border-line bg-app" aria-labelledby="hero-title">
      {/* Ruled paper, fading out, and the teal margin line (plan §7, D2). */}
      <div className="paper-lines mask-fade-b pointer-events-none absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 left-[6%] hidden w-0.5 bg-secondary/30 md:block" aria-hidden />

      <div className="relative mx-auto w-full max-w-[1200px] px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-3xl text-left sm:text-center">
          {stats?.students ? (
            <div className="mb-6 flex items-center gap-3 sm:justify-center">
              <span className="flex -space-x-2" aria-hidden>
                {BRANCHES.map((b) => (
                  <span key={b} className="flex h-9 w-9 items-center justify-center rounded-full bg-highlight font-display text-caption font-extrabold text-heading ring-2 ring-app">
                    {b}
                  </span>
                ))}
              </span>
              <p className="text-left text-sm leading-tight text-muted">
                Join <span className="font-display font-bold text-heading">{stats.students.toLocaleString('en-IN')}+</span> students
                <br />
                Free to start · No card needed
              </p>
            </div>
          ) : null}

          <h1 id="hero-title" className="font-display text-[clamp(30px,10.6vw,46px)] leading-[1.04] tracking-[-0.04em] text-heading sm:text-headline">
            Placement test coming up? TieEdu gets you <span className="marker">ready, round by round</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-body-lg text-muted">
            Pick your company and your test date. You get the real rounds, a skill test for each, and a plan for every
            day until the drive.
          </p>

          <CompanyFinder companies={companies} value={searchQuery} onChange={onSearch} className="mx-auto mt-8 max-w-xl text-left" />

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button href="/signup" size="lg" icon={ArrowRight} iconEnd className="min-h-[48px]">
              Start free
            </Button>
            <Button href="/companies" kind="secondary" size="lg" className="min-h-[48px]">
              Browse companies
            </Button>
          </div>
        </div>

        {/* E4: the product, framed. Floating chips only where there is room for them. */}
        <div className="relative mx-auto mt-14 max-w-3xl">
          <DeviceFrame url="tieedu.in/today" className="hidden sm:block">
            <SampleToday />
          </DeviceFrame>
          <DeviceFrame kind="phone" className="mx-auto w-[280px] sm:hidden">
            <SampleToday compact />
          </DeviceFrame>

          <FloatingChip bob icon={MessagesSquare} tone="info" title="Mock interview feedback" caption="5 answers reviewed" className="absolute -top-6 right-[calc(100%-44px)] hidden xl:inline-flex" />
          <FloatingChip bob icon={TrendingUp} tone="success" title="Infosys readiness 62%" caption="Up 12% this week" className="absolute left-[calc(100%-44px)] top-36 hidden xl:inline-flex [animation-delay:-1.2s]" />
          <FloatingChip bob icon={Target} tone="primary" title="Daily challenge done" caption="3 of 3" className="absolute -bottom-7 left-[calc(100%-44px)] hidden xl:inline-flex [animation-delay:-2s]" />
          <FloatingChip bob icon={Languages} tone="secondary" title="Explained in Hinglish" caption="Switch any time" className="absolute bottom-10 right-[calc(100%-44px)] hidden xl:inline-flex [animation-delay:-0.6s]" />
        </div>

        <div className="mx-auto mt-14 flex max-w-xl flex-col items-center text-center">
          <Button href="/signup" size="lg" icon={ArrowRight} iconEnd className="min-h-[52px] w-full sm:w-auto">
            Plan my placement
          </Button>
          <p className="mt-3 text-sm text-muted">Free to start, no card needed.</p>
        </div>

        {/* The laurel card: only companies we actually cover, by name. */}
        {covered.length > 0 && (
          <div className="mx-auto mt-10 flex max-w-2xl items-center justify-center gap-3 rounded-card border border-line bg-card px-5 py-3 text-center shadow-edge-neutral">
            <CheckCircle2 className="h-5 w-5 flex-none text-secondary" aria-hidden />
            <p className="text-sm text-body">
              <span className="font-display font-semibold text-heading">Built for campus placements</span>
              {' · '}
              {covered.join(' · ')}
              {' · '}
              2026–27
            </p>
          </div>
        )}

        {stats && stats.companies > 0 ? (
          <p className="mt-4 text-center text-sm text-muted">
            <Link href="/companies" className="font-semibold text-link hover:underline">
              {stats.companies} companies
            </Link>{' '}
            so far, and every skill test is free.
          </p>
        ) : null}
      </div>
    </section>
  );
};

export default LandingHero;
