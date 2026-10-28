import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { BadgeCheck, BookOpen, ClipboardCheck, Flame } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { Card, ProgressRing, SectionHead } from '@/components/ui';
import { serverApiBase } from '@/lib/companyPagesApi';
import { fetchParentView, ParentView } from '@/lib/parentApi';
import { ParentWhatsappBox } from '@/components/parent/ParentWhatsappBox';
import { ParentEmailBox } from '@/components/parent/ParentEmailBox';

/**
 * /parent/<token> — the read-only page a student shares with a parent
 * (UI_REDESIGN_PLAN_V2 §8). Effort and results, in plain words; nothing a
 * student would not show at the dinner table. `noindex`, never cached by
 * shared caches, and gone the moment the student turns the link off.
 */

export const getServerSideProps: GetServerSideProps<{ view: ParentView; token: string; stop: boolean }> = async ({ params, query, res }) => {
  const token = String(params?.token || '');
  const view = await fetchParentView(token, serverApiBase());
  if (!view) return { notFound: true };
  res.setHeader('Cache-Control', 'private, no-store');
  // ?stop=1 is the stop link in each WhatsApp message.
  return { props: { view, token, stop: query.stop === '1' } };
};

const dayMonth = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const weekLabel = (w: ParentView['weeks'][number], i: number, n: number) =>
  i === n - 1 ? 'This week' : `${dayMonth.format(new Date(`${w.from}T00:00:00Z`))} – ${dayMonth.format(new Date(`${w.to}T00:00:00Z`))}`;

export default function ParentPage({ view: v, token, stop }: { view: ParentView; token: string; stop: boolean }) {
  const max = Math.max(1, ...v.weeks.map((w) => w.lessons + w.tests));
  return (
    <>
      <Head>
        <title>{`${v.first_name}'s progress · TieEdu`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="flex min-h-screen flex-col bg-paper">
        <main className="mx-auto w-full max-w-[860px] flex-1 space-y-10 px-4 py-10 sm:px-6">
          <header>
            <p className="eyebrow text-signal-ink">Shared by {v.first_name}</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-heading sm:text-4xl">
              How {v.first_name} is preparing for placements
            </h1>
            <p className="mt-3 text-base text-muted">
              {v.year ? `${v.year}. ` : ''}This page shows effort and results on TieEdu. {v.first_name} can turn it off at any time.
            </p>
          </header>

          {stop && <ParentWhatsappBox token={token} name={v.first_name} stop />}

          <section aria-labelledby="weeks-title">
            <SectionHead id="weeks-title" title="The last four weeks" description="Lessons finished and skill tests taken, week by week." />
            <ul className="mt-6 space-y-3">
              {v.weeks.map((w, i) => (
                <li key={w.from} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[9rem_1fr_auto]">
                  <span className="font-semibold text-heading">{weekLabel(w, i, v.weeks.length)}</span>
                  <span className="flex h-3 overflow-hidden rounded-full bg-line" aria-hidden>
                    <span className="bg-train" style={{ width: `${(w.lessons / max) * 100}%` }} />
                    <span className="bg-test" style={{ width: `${(w.tests / max) * 100}%` }} />
                  </span>
                  <span className="tabular-nums text-muted">
                    {w.lessons} lesson{w.lessons === 1 ? '' : 's'} · {w.tests} test{w.tests === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-train" aria-hidden /> Lessons</span>
              <span className="inline-flex items-center gap-1.5"><ClipboardCheck className="h-3.5 w-3.5 text-test" aria-hidden /> Skill tests</span>
            </p>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <p className="eyebrow text-muted">Study streak</p>
              <p className="mt-2 flex items-center gap-2 font-display text-3xl font-bold tabular-nums text-heading">
                <Flame className="h-7 w-7 text-signal" aria-hidden /> {v.streak.current} day{v.streak.current === 1 ? '' : 's'}
              </p>
              {v.streak.best > v.streak.current && <p className="mt-1 text-sm text-muted">Longest so far: {v.streak.best} days</p>}
            </Card>
            <Card>
              <p className="eyebrow text-muted">Working on next</p>
              <p className="mt-2 font-semibold text-heading">{v.next_step}</p>
            </Card>
          </div>

          {v.companies.length > 0 && (
            <section aria-labelledby="companies-title">
              <SectionHead id="companies-title" title="Readiness for target companies" description="From skill tests on each company's interview rounds." />
              <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {v.companies.map((c) => (
                  <li key={c.name}>
                    <Card className="flex items-center gap-4">
                      <ProgressRing value={c.readiness} size={64} thickness={6} label={`${c.name} readiness`} />
                      <div>
                        <p className="font-display text-lg font-bold text-heading">{c.name}</p>
                        <p className="text-sm text-muted">{c.cleared} of {c.rounds} rounds cleared</p>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {v.certificates.length > 0 && (
            <section aria-labelledby="certs-title">
              <SectionHead id="certs-title" title="Certificates" description="Each one can be checked on its verification page." />
              <ul className="mt-6 space-y-2">
                {v.certificates.map((c) => (
                  <li key={c.verify_url}>
                    <Link href={c.verify_url} className="flex items-center gap-3 rounded-xl border border-line bg-card p-4 hover:border-line-strong">
                      <BadgeCheck className="h-5 w-5 shrink-0 text-success" aria-hidden />
                      <span className="min-w-0 flex-1 font-semibold text-heading">{c.title}</span>
                      <span className="text-sm font-semibold text-signal">Verify</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!stop && <ParentWhatsappBox token={token} name={v.first_name} stop={false} />}
          {!stop && <ParentEmailBox token={token} name={v.first_name} />}
        </main>
        <Footer />
      </div>
    </>
  );
}
