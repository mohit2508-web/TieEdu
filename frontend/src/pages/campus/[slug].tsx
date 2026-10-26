import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { ArrowRight, Users } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { Button, Card, ProgressRing, SectionHead } from '@/components/ui';
import { serverApiBase } from '@/lib/companyPagesApi';

/**
 * /campus/<college> — a college's public prep page (UI_REDESIGN_PLAN_V2 §7.3).
 *
 * Exists only when the college's placement officer turned it on. Aggregates
 * only, and none at all until enough students have linked for an average to
 * be anonymous (backend lib/campusPage). Co-branded with the college's own
 * colour; the page is for their students and parents, so it points them at
 * how to join rather than selling to them.
 */

interface CampusPublic {
  college: { name: string; short_name: string | null; slug: string; theme_color: string | null; logo_url: string | null };
  intro: string;
  aggregate: {
    students_linked: number;
    segments: { not_started: number; at_risk: number; in_progress: number; ready: number } | null;
    companies: Array<{ name: string; slug: string; preparing: number; average: number }>;
    min_students: number;
  };
}

export const getServerSideProps: GetServerSideProps<{ page: CampusPublic }> = async ({ params }) => {
  try {
    // Bounded: a slow placement database must not hold the page open.
    const res = await fetch(`${serverApiBase()}/campus-pages/${encodeURIComponent(String(params?.slug || ''))}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { notFound: true };
    return { props: { page: (await res.json()) as CampusPublic } };
  } catch {
    return { notFound: true };
  }
};

const SEGMENT_LABEL = { ready: 'Ready', in_progress: 'In progress', at_risk: 'Needs help', not_started: 'Not started yet' } as const;
const SEGMENT_TONE = { ready: 'bg-success', in_progress: 'bg-warning', at_risk: 'bg-danger', not_started: 'bg-line-strong' } as const;

export default function CampusPage({ page }: { page: CampusPublic }) {
  const { college, aggregate: a } = page;
  const accent = /^#[0-9a-f]{6}$/i.test(college.theme_color || '') ? (college.theme_color as string) : '#0E2A44';

  return (
    <>
      <Head>
        <title>{`${college.name} · Placement prep on TieEdu`}</title>
        <meta name="description" content={`How students of ${college.name} are preparing for placements on TieEdu.`} />
      </Head>
      <div className="flex min-h-screen flex-col bg-paper">
        <main className="flex-1">
          <section className="bg-brand-ink text-white">
            {/* The college's own colour as a band: co-branding without trusting it for text contrast. */}
            <div className="h-2" style={{ background: accent }} aria-hidden />
            <div className="mx-auto max-w-[1000px] px-4 py-12 sm:px-6 sm:py-16">
              <p className="eyebrow text-money">Campus page</p>
              <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">{college.name}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
                {page.intro || `Placement preparation for ${college.short_name || college.name} students: company rounds, free skill tests and courses on TieEdu.`}
              </p>
              <p className="mt-6 inline-flex items-center gap-2 text-sm text-white/80">
                <Users className="h-4 w-4" aria-hidden />
                <span className="tabular-nums">{a.students_linked}</span> student{a.students_linked === 1 ? '' : 's'} preparing on TieEdu
              </p>
            </div>
          </section>

          <div className="mx-auto max-w-[1000px] space-y-12 px-4 py-12 sm:px-6">
            {a.segments ? (
              <section aria-labelledby="batch-title">
                <SectionHead id="batch-title" title="How the batch is doing" description="Share of students in each group, from the tests they have taken." />
                <div className="mt-6 flex h-4 overflow-hidden rounded-full" role="img" aria-label={(Object.keys(SEGMENT_LABEL) as Array<keyof typeof SEGMENT_LABEL>).map((k) => `${SEGMENT_LABEL[k]} ${a.segments![k]}%`).join(', ')}>
                  {(Object.keys(SEGMENT_LABEL) as Array<keyof typeof SEGMENT_LABEL>).map((k) =>
                    a.segments![k] > 0 ? <span key={k} className={SEGMENT_TONE[k]} style={{ width: `${a.segments![k]}%` }} /> : null
                  )}
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(Object.keys(SEGMENT_LABEL) as Array<keyof typeof SEGMENT_LABEL>).map((k) => (
                    <li key={k} className="flex items-center gap-2 text-sm text-body">
                      <span className={`h-3 w-3 rounded-full ${SEGMENT_TONE[k]}`} aria-hidden />
                      {SEGMENT_LABEL[k]} <span className="font-semibold tabular-nums text-heading">{a.segments![k]}%</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <Card>
                <p className="font-semibold text-heading">Batch numbers appear once {a.min_students} students have joined.</p>
                <p className="mt-1 text-sm text-muted">
                  Below that, an average could point to individual students, so we do not show one.
                </p>
              </Card>
            )}

            {a.companies.length > 0 && (
              <section aria-labelledby="companies-title">
                <SectionHead id="companies-title" title="Companies the batch is preparing for" description="Average readiness of the students who have taken that company's tests." />
                <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {a.companies.map((c) => (
                    <li key={c.slug}>
                      <Card className="flex items-center gap-4">
                        <ProgressRing value={c.average} size={64} thickness={6} label={`${c.name} average readiness`} />
                        <div className="min-w-0">
                          <Link href={`/company/${c.slug}`} className="font-display text-lg font-bold text-heading hover:text-signal">
                            {c.name}
                          </Link>
                          <p className="text-sm text-muted">{c.preparing} preparing</p>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <Card variant="ink" pad="lg">
              <h2 className="font-display text-2xl font-bold text-white">Studying at {college.short_name || college.name}?</h2>
              <p className="mt-2 max-w-xl text-white/80">
                Sign up, then add your college and roll number to your profile. Your practice counts towards your batch: your
                placement cell&apos;s readiness view shows your scores, not your answers.
              </p>
              <Button href="/signup" icon={ArrowRight} iconEnd className="mt-5">
                Join free
              </Button>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
