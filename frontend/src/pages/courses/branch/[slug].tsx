import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { ArrowRight, Compass } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { CourseRowCard, CourseRowSkeleton } from '@/components/courses/CourseUi';
import { API_BASE_URL } from '@/lib/api';
import { serverApiBase } from '@/lib/companyPagesApi';
import { fetchCourseCatalog } from '@/lib/coursesApi';
import { parseCatalogQuery } from '@/lib/catalogState';
import type { CourseCatalogResponse } from '@/types';

const SITE_URL = 'https://tieedu.com';

/**
 * Branch landing page: `/courses/branch/cse`.
 *
 * Server-rendered per branch so a search for "ECE courses" lands on a page
 * that already lists them. The hero names the audience, the chips narrow
 * within the branch (buckets, computed against this branch's courses), and
 * the list is the same row card as the catalogue — one card design, no drift.
 *
 * Unknown slugs 404: a branch page for a branch that does not exist would be
 * an empty page wearing a real URL. A branch with no courses yet renders an
 * honest empty state pointing at the full catalogue, never a fabricated list.
 */

export const BRANCH_META: Record<string, { short: string; label: string; blurb: string }> = {
  year1: {
    short: 'First Year',
    label: 'Year-1 Common',
    blurb: 'The common foundation every branch shares — start here in your first year, whatever your department.',
  },
  cse: {
    short: 'CSE',
    label: 'Computer Science & IT',
    blurb: 'Programming, data structures and the interview track — from zero to placed.',
  },
  'ai-ds': {
    short: 'AI-DS',
    label: 'AI & Data Science',
    blurb: 'Python, data and machine learning foundations for AI & DS students.',
  },
  ece: {
    short: 'ECE',
    label: 'Electronics & Communication',
    blurb: 'Semester-mapped electronics core, signals to systems.',
  },
  eee: {
    short: 'EEE',
    label: 'Electrical & Electronics',
    blurb: 'Semester-mapped electrical core, circuits to machines.',
  },
  mech: {
    short: 'Mech',
    label: 'Mechanical',
    blurb: 'Semester-mapped mechanical core, thermo to design.',
  },
  civil: {
    short: 'Civil',
    label: 'Civil',
    blurb: 'Semester-mapped civil core, structures to estimation.',
  },
  career: {
    short: 'Career',
    label: 'Career & Placement',
    blurb: 'Aptitude, interviews and workplace skills — branch-agnostic, placement-focused.',
  },
  tools: {
    short: 'Tools',
    label: 'Industry Tools',
    blurb: 'The tools employers test for: Git, Excel, GenAI and more.',
  },
};

export const BRANCH_SLUGS = Object.keys(BRANCH_META);

export default function BranchPage({ initialData, branch }: { initialData: CourseCatalogResponse | null; branch: string }) {
  const router = useRouter();
  const meta = BRANCH_META[branch];
  const querySignature = JSON.stringify(router.query);
  const bucket = useMemo(() => {
    const parsed = parseCatalogQuery(JSON.parse(querySignature));
    return parsed.bucket;
  }, [querySignature]);

  const [data, setData] = useState<CourseCatalogResponse | null>(initialData);
  const [page, setPage] = useState(initialData?.page || 1);
  const [status, setStatus] = useState<'ready' | 'loading' | 'loadingMore'>('ready');
  const [more, setMore] = useState<any[]>([]);

  // SSR is authoritative for the first paint; client navigation re-fetches.
  const skipNextFetch = React.useRef(true);
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      setMore([]);
      return;
    }
    setStatus('loading');
    fetchCourseCatalog({ branch: [branch], bucket })
      .then((result) => {
        setData(result);
        setPage(result.page);
        setMore([]);
        setStatus('ready');
      })
      .catch(() => setStatus('ready'));
  }, [branch, JSON.stringify(bucket)]);

  const courses = useMemo(() => [...(data?.courses || []), ...more], [data?.courses, more]);
  const total = data?.total ?? 0;
  const hasMore = data ? data.has_more && page < Math.ceil(total / 20) : false;
  const bucketFacets = (data?.facets?.bucket || []).filter((o) => o.count > 0);
  const freeCount = (data?.facets?.type || []).find((t) => t.key === 'free')?.count ?? 0;

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setStatus('loadingMore');
    const next = page + 1;
    fetchCourseCatalog({ branch: [branch], bucket, page: next })
      .then((result) => {
        const known = new Set([...(data?.courses || []).map((c) => c.id), ...more.map((c) => c.id)]);
        setMore((prev) => [...prev, ...result.courses.filter((c) => !known.has(c.id))]);
        setPage(result.page);
        setStatus('ready');
      })
      .catch(() => setStatus('ready'));
  }, [hasMore, page, branch, JSON.stringify(bucket), data?.courses, more]);

  if (!meta) return null;

  const siblings = BRANCH_SLUGS.filter((s) => s !== branch);

  return (
    <>
      <Head>
        <title>{`Courses for ${meta.short} students · TieEdu`}</title>
        <meta name="description" content={`${meta.blurb} Structured courses with verified progress and signed certificates.`} />
        <link rel="canonical" href={`${SITE_URL}/courses/branch/${branch}`} />
        <meta property="og:title" content={`Courses for ${meta.short} students · TieEdu`} />
        <meta property="og:description" content={meta.blurb} />
        <meta property="og:url" content={`${SITE_URL}/courses/branch/${branch}`} />
      </Head>

      <main className="mx-auto w-full max-w-[1180px] px-5 pb-28 pt-10 sm:px-8">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-sky)]">
            <Link href="/courses?src=branch" className="hover:underline">Courses</Link>
            {' / '}{meta.short}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[var(--ink)] sm:text-4xl">
            Courses for {meta.short} students
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-body)]">{meta.blurb}</p>
          <p className="mt-3 text-sm text-[var(--text-muted)]" role="status" aria-live="polite">
            {status === 'loading'
              ? 'Loading…'
              : total === 0
                ? 'No courses here yet'
                : `${total} ${total === 1 ? 'course' : 'courses'}${freeCount > 0 ? ` · ${freeCount} free` : ''}`}
          </p>
        </header>

        {/* Sibling branches — every branch page links the rest, so no audience is a dead end. */}
        <nav aria-label="Other branches" className="rail-track mt-6">
          {siblings.map((s) => (
            <Link
              key={s}
              href={`/courses/branch/${s}?src=branch`}
              className="min-h-[40px] flex flex-none snap-start items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 text-sm font-bold text-[var(--text-body)] transition-colors hover:border-[var(--brand-sky)]/50 focus-ring"
            >
              {BRANCH_META[s].short}
            </Link>
          ))}
        </nav>

        {/* Buckets within this branch, counted against this branch's courses. */}
        {bucketFacets.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by course bucket">
            {bucketFacets.map((o) => {
              const selected = bucket.includes(o.key);
              return (
                <Link
                  key={o.key}
                  href={selected ? `/courses/branch/${branch}?src=branch` : `/courses/branch/${branch}?bucket=${o.key}&src=branch`}
                  aria-current={selected ? 'true' : undefined}
                  className={[
                    'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-sm font-bold transition-colors focus-ring',
                    selected
                      ? 'border-[var(--brand-sky)] bg-[var(--brand-sky)] text-white'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-body)]',
                  ].join(' ')}
                >
                  {o.label}
                  <span className={selected ? 'text-white/80' : 'text-[var(--text-light)]'}>{o.count}</span>
                </Link>
              );
            })}
          </div>
        )}

        {status === 'loading' ? (
          <div className="mt-8 space-y-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} aria-hidden="true" className="h-[140px] animate-pulse rounded-[var(--radius-lg)] bg-surface-hover" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] px-6 py-16 text-center">
            <p className="text-base font-bold text-[var(--ink)]">No {meta.short} courses yet.</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">
              This shelf is being stocked — the catalogue already has courses worth starting with.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/courses?src=branch"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--brand-sky)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-sky-strong)]"
              >
                Browse all courses <ArrowRight size={15} />
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-bold text-[var(--ink)] hover:border-[var(--brand-sky)]"
              >
                <Compass size={15} /> Take the 60-second finder
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {/* Keeps the outline h1 → h2 → card h3. */}
            <h2 className="sr-only">Courses</h2>
            {courses.map((c) => (
              <CourseRowCard key={c.id} course={c} />
            ))}
            {status === 'loadingMore' && (
              <div aria-hidden="true" className="h-[140px] animate-pulse rounded-[var(--radius-lg)] bg-surface-hover" />
            )}
            {hasMore && status !== 'loadingMore' && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={loadMore}
                  className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-2.5 text-sm font-bold text-[var(--ink)] hover:border-[var(--brand-sky)]"
                >
                  Show more {meta.short} courses
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ query, params }) => {
  const branch = String(params?.slug || '').toLowerCase();
  if (!BRANCH_SLUGS.includes(branch)) return { notFound: true };

  let initialData: CourseCatalogResponse | null = null;
  try {
    const parsed = parseCatalogQuery(query as Record<string, string | string[]>);
    const qs = new URLSearchParams();
    qs.set('branch', branch);
    for (const b of parsed.bucket) qs.append('bucket', b);
    const res = await fetch(`${serverApiBase()}/courses?${qs.toString()}`);
    if (res.ok) initialData = await res.json();
  } catch {
    // Backend unreachable at SSR time — the client effect fetches and retries.
  }
  return { props: { initialData, branch } };
};
