import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { SlidersHorizontal, X, Search as SearchIcon, ChevronDown } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CourseRowCard, CourseRowSkeleton, Pill } from '@/components/courses/CourseUi';
import { CourseFilterRail } from '@/components/courses/CourseFilterRail';
import { API_BASE_URL } from '@/lib/api';
import { fetchCourseCatalog } from '@/lib/coursesApi';
import {
  PAGE_SIZE,
  activeFilterLabels,
  catalogQueryFor,
  countActiveFilters,
  parseCatalogQuery,
  toggleFilterValue,
  type CatalogMultiKey,
} from '@/lib/catalogState';
import { useAuth } from '@/context/AuthContext';
import type { CatalogFacets, CatalogFilters, CatalogSortKey, CourseCard, CourseCatalogResponse } from '@/types';

const SITE_URL = 'https://tieedu.com';

const EMPTY_FACETS: CatalogFacets = { category: [], tag: [], type: [], level: [] };

const SORT_LABELS: Record<CatalogSortKey, string> = {
  popular: 'Most popular',
  newest: 'Newest first',
  rating: 'Highest rated',
  az: 'Course name (A–Z)',
  za: 'Course name (Z–A)',
};

export default function CoursesPage({ initialData }: { initialData: CourseCatalogResponse | null }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Filter state is read from the URL, never mirrored into local state, so the
  // back button, a shared link and a refresh all land on the same result set.
  //
  // `router.query` arrives as a fresh object on some re-renders, which would
  // churn the memo chain below and re-fetch the catalogue on a scroll. A string
  // signature only changes when the URL itself does.
  const querySignature = JSON.stringify(router.query);
  const parsed = useMemo(() => parseCatalogQuery(JSON.parse(querySignature)), [querySignature]);
  const filters: CatalogFilters = useMemo(
    () => ({
      q: parsed.q,
      category: parsed.category,
      tag: parsed.tag,
      type: parsed.type,
      level: parsed.level,
      sort: parsed.sort,
    }),
    [parsed]
  );

  const [data, setData] = useState<CourseCatalogResponse | null>(initialData);
  const [extra, setExtra] = useState<CourseCard[]>([]);
  const [page, setPage] = useState(initialData?.page || 1);
  const [status, setStatus] = useState<'ready' | 'loading' | 'loadingMore' | 'error'>('ready');
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState(filters.q);
  const [sheetOpen, setSheetOpen] = useState(false);

  const facets = data?.facets || EMPTY_FACETS;
  const sorts = data?.sorts?.length
    ? data.sorts
    : (Object.keys(SORT_LABELS) as CatalogSortKey[]).map((key) => ({ key, label: SORT_LABELS[key] }));
  const total = data?.total ?? 0;
  const hasMore = data ? data.has_more && page < Math.ceil(total / PAGE_SIZE) : false;

  // The SSR payload is authoritative for the first paint, so the effect below
  // must not immediately re-request page 1 and flash the skeleton over it.
  //
  // That is only true when there *is* a payload. If SSR could not reach the
  // API, `initialData` is null and this page would sit on an empty catalogue
  // forever, because every mount skips its first fetch. Seeding the ref from
  // `initialData` makes the skip mean "SSR already did this fetch" instead of
  // unconditionally "skip the first one".
  const skipNextFetch = useRef(!!initialData);

  const courses = useMemo(() => {
    const seen = new Set<string>();
    return [...(data?.courses || []), ...extra].filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [data?.courses, extra]);

  /**
   * Ids already on screen, for de-duplicating an appended page.
   *
   * Held in a ref rather than read from `courses` inside the loader, because the
   * observer effect has to re-run whenever a page arrives — closing over the
   * course list would tear the observer down and build it back up on every row.
   */
  const shownIds = useRef<Set<string>>(new Set());
  useEffect(() => { shownIds.current = new Set(courses.map((c) => c.id)); }, [courses]);

  const loadFirstPage = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setExtra([]);
    try {
      const result = await fetchCourseCatalog(filters);
      setData(result);
      setPage(result.page);
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the courses');
      setStatus('error');
    }
  }, [filters]);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    void loadFirstPage();
  }, [loadFirstPage, user?.id, authLoading]);

  /**
   * The search text most recently committed to the URL.
   *
   * The debounce effect compares against this instead of `filters.q` so that a
   * navigation — back button, or a shared link opened from the address bar —
   * cannot be undone by a timer that was still pending when the URL moved.
   */
  const committedSearch = useRef(filters.q);

  /** Keep the box in step with the URL when the user navigates back/forward. */
  useEffect(() => {
    committedSearch.current = filters.q;
    setSearchText(filters.q);
  }, [filters.q]);

  // Debounced search: one request per pause in typing instead of one per
  // keystroke, which on a slow connection means the last one usually wins.
  useEffect(() => {
    if (searchText === committedSearch.current) return;
    const timer = setTimeout(() => {
      committedSearch.current = searchText;
      void router.replace(`/courses${catalogQueryFor({ ...filters, q: searchText })}`, undefined, {
        shallow: true,
        scroll: false,
      });
    }, 320);
    return () => clearTimeout(timer);
  }, [searchText, filters, router]);

  const applyFilters = useCallback(
    (next: CatalogFilters) => {
      void router.replace(`/courses${catalogQueryFor(next)}`, undefined, { shallow: true, scroll: false });
    },
    [router]
  );

  const onToggle = useCallback(
    (key: CatalogMultiKey, value: string) => applyFilters(toggleFilterValue(filters, key, value)),
    [applyFilters, filters]
  );

  const clearAll = useCallback(() => {
    setSearchText('');
    applyFilters({ q: '', category: [], tag: [], type: [], level: [], sort: filters.sort });
  }, [applyFilters, filters.sort]);

  // --- Infinite scroll -------------------------------------------------------
  // A sentinel below the list is watched; when it enters the viewport the next
  // page is appended. Loading more is guarded against re-entry so a fast scroll
  // cannot stack three duplicate requests for the same page.
  const sentinel = useRef<HTMLDivElement | null>(null);
  const loadingMore = status === 'loadingMore';
  useEffect(() => {
    if (!hasMore || loadingMore || status !== 'ready') return;
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setStatus('loadingMore');
        const next = page + 1;
        fetchCourseCatalog({ ...filters, page: next })
          .then((result) => {
            setExtra((prev) => {
              const known = new Set([...shownIds.current, ...prev.map((c) => c.id)]);
              return [...prev, ...result.courses.filter((c) => !known.has(c.id))];
            });
            setPage(next);
            setStatus('ready');
          })
          .catch(() => setStatus('ready')); // Silent: the sentinel retries on the next scroll.
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, status, page, filters]);

  // A learner's own unfinished courses, surfaced above the results. Derived from
  // the rows already fetched, so it cannot promise a course that the current
  // filter is hiding.
  const continueLearning = useMemo(
    () =>
      courses
        .filter((c) => c.progress?.enrolled && !c.progress.is_complete)
        .sort((a, b) => (b.progress?.percent || 0) - (a.progress?.percent || 0))
        .slice(0, 3),
    [courses]
  );

  const pills = activeFilterLabels(filters, facets);
  const activeCount = countActiveFilters(filters);
  const showEmpty = status === 'ready' && courses.length === 0;

  // The list is one column on every breakpoint. Three narrow cards forced a
  // three-line title and a four-line description at desktop width, which is
  // exactly the shape a horizontal row card is meant to avoid.
  return (
    <>
      <Head>
        <title>Courses · TieEdu</title>
        <meta
          name="description"
          content="Free, structured programming courses from TieEdu. Filter by topic, level and course type, and finish with a certificate whose signature anyone can verify."
        />
        <link rel="canonical" href={`${SITE_URL}/courses`} />
        <meta property="og:title" content="Courses · TieEdu" />
        <meta
          property="og:description"
          content="Structured, sequential programming courses with verified progress and signed, verifiable certificates."
        />
        <meta property="og:url" content={`${SITE_URL}/courses`} />
        {courses.length > 0 && (
          <script
            type="application/ld+json"
            /* eslint-disable-next-line react/no-danger */
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'ItemList',
                name: 'TieEdu courses',
                numberOfItems: total,
                itemListElement: courses.slice(0, 40).map((c, i) => ({
                  '@type': 'ListItem',
                  position: i + 1,
                  url: `${SITE_URL}/courses/${c.slug}`,
                  name: c.title,
                })),
              }),
            }}
          />
        )}
      </Head>

      <Header cartCount={0} onOpenCart={() => {}} onOpenSearch={() => {}} onOpenLeaderboard={() => {}} />

      <main className="mx-auto w-full max-w-[1180px] px-5 pb-28 pt-10 sm:px-8 lg:pb-24">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-sky)]">Learn properly</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[var(--ink)] sm:text-4xl">
            Courses that keep their promises
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-body)]">
            Work through each lesson in order. Your progress is saved on the server, the time you put
            in is checked rather than assumed, and the certificate you finish with carries a signature
            anyone can verify.
          </p>
        </header>

        {continueLearning.length > 0 && (
          <section aria-labelledby="continue-heading" className="mt-9">
            <h2 id="continue-heading" className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Continue where you left off
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {continueLearning.map((c) => (
                <a
                  key={c.id}
                  href={`/courses/${c.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:border-[var(--brand-sky)]"
                >
                  {c.title}
                  <span className="text-xs font-bold text-[var(--brand-sky)]">{c.progress?.percent}%</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Toolbar */}
        <div className="mt-9 flex flex-col gap-3 border-y border-[var(--border-subtle)] py-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-light)]"
            />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by course name or topic"
              aria-label="Search courses"
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--text-light)] focus:border-[var(--brand-sky)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-bold text-[var(--ink)] lg:hidden"
            >
              <SlidersHorizontal size={15} />
              Filters
              {activeCount > 0 && (
                <span className="rounded-full bg-[var(--brand-sky)] px-1.5 text-[11px] leading-[18px] text-white">
                  {activeCount}
                </span>
              )}
            </button>

            <div className="relative">
              <label htmlFor="catalog-sort" className="sr-only">
                Sort courses
              </label>
              <select
                id="catalog-sort"
                value={filters.sort}
                onChange={(e) => applyFilters({ ...filters, sort: e.target.value as CatalogSortKey })}
                className="appearance-none rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-2.5 pl-4 pr-9 text-sm font-bold text-[var(--ink)] outline-none focus:border-[var(--brand-sky)]"
              >
                {sorts.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-sm text-[var(--text-muted)]" role="status" aria-live="polite">
            {status === 'loading'
              ? 'Loading…'
              : `${total} ${total === 1 ? 'course' : 'courses'}${filters.q ? ` for “${filters.q}”` : ''}`}
          </p>
          {pills.map((pill) => (
            <Pill
              key={`${pill.key}:${pill.value}`}
              onRemove={() => onToggle(pill.key, pill.value)}
              removeLabel={`Remove filter: ${pill.label}`}
            >
              {pill.label}
            </Pill>
          ))}
          {activeCount > 0 && (
            <button type="button" onClick={clearAll} className="text-xs font-bold text-[var(--brand-sky)] hover:underline">
              Clear all
            </button>
          )}
        </div>

        <div className="mt-6 flex gap-10">
          <aside className="hidden w-[248px] shrink-0 lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
              <CourseFilterRail
                facets={facets}
                filters={filters}
                onToggle={onToggle}
                onClear={clearAll}
                activeCount={activeCount}
              />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {status === 'error' && (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-4 py-3 text-sm text-[var(--color-error)]">
                <p>{error}</p>
                <button type="button" onClick={loadFirstPage} className="mt-2 font-bold underline">
                  Try again
                </button>
              </div>
            )}

            {showEmpty && (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] px-6 py-16 text-center">
                <p className="text-base font-bold text-[var(--ink)]">
                  {total === 0 && activeCount === 0 && !filters.q
                    ? 'No courses have been published yet.'
                    : 'Nothing matches those filters.'}
                </p>
                {activeCount > 0 && (
                  <button type="button" onClick={clearAll} className="mt-3 text-sm font-bold text-[var(--brand-sky)] hover:underline">
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            <div className="space-y-4">
              {status === 'loading'
                ? Array.from({ length: 6 }, (_, i) => <CourseRowSkeleton key={i} />)
                : courses.map((c) => <CourseRowCard key={c.id} course={c} />)}
              {loadingMore && Array.from({ length: 3 }, (_, i) => <CourseRowSkeleton key={`more-${i}`} />)}
            </div>

            <div ref={sentinel} aria-hidden="true" className="h-px" />
            {hasMore && !loadingMore && (
              <p className="mt-6 text-center text-xs text-[var(--text-light)]">Scroll for more courses</p>
            )}
          </div>
        </div>

        <CatalogueSeoCopy facets={facets} total={total} />
      </main>

      {sheetOpen && (
        <MobileFilterSheet
          facets={facets}
          filters={filters}
          onToggle={onToggle}
          onClear={clearAll}
          activeCount={activeCount}
          total={total}
          onClose={() => setSheetOpen(false)}
        />
      )}

      <Footer />
    </>
  );
}

/**
 * The mobile filter surface.
 *
 * A bottom sheet rather than a collapsed accordion, because the rail is four
 * groups tall: opened inline it pushes the results off the screen entirely, so
 * the visitor would be filtering blind.
 */
const MobileFilterSheet: React.FC<{
  facets: CatalogFacets;
  filters: CatalogFilters;
  onToggle: (key: CatalogMultiKey, value: string) => void;
  onClear: () => void;
  activeCount: number;
  total: number;
  onClose: () => void;
}> = ({ facets, filters, onToggle, onClear, activeCount, total, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filter courses">
      <button type="button" aria-label="Close filters" onClick={onClose} className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="text-base font-extrabold text-[var(--ink)]">Filters</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)]">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <CourseFilterRail facets={facets} filters={filters} onToggle={onToggle} onClear={onClear} activeCount={activeCount} />
        </div>
        <div className="border-t border-[var(--border-subtle)] p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-[var(--radius-sm)] bg-[var(--brand-sky)] py-3 text-sm font-bold text-white"
          >
            Show {total} {total === 1 ? 'course' : 'courses'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Long-form copy for the bottom of the catalogue.
 *
 * Server-rendered, and every number in it is a number the server just counted.
 * There is no "join 50,000 learners" line here: enrollment counts are real, so
 * that sentence could only be true at some size, and at three courses it would
 * be the single loudest lie on the page.
 */
const CatalogueSeoCopy: React.FC<{ facets: CatalogFacets; total: number }> = ({ facets, total }) => {
  if (total === 0) return null;
  const levels = facets.level.filter((l) => l.count > 0).map((l) => l.label);
  const topics = facets.tag.filter((t) => t.count > 0).map((t) => t.label);
  const freeCount = facets.type.find((t) => t.key === 'free')?.count ?? 0;

  return (
    <section className="mt-20 max-w-3xl border-t border-[var(--border-subtle)] pt-10">
      <h2 className="text-2xl font-extrabold tracking-tight text-[var(--ink)]">
        How TieEdu courses work
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-[var(--text-body)]">
        <p>
          Every TieEdu course is a fixed sequence of modules and lessons. Nothing is unlocked out of
          order, so a lesson you have reached is a lesson whose prerequisites you have already met.
          Progress is recorded on the server as you read or watch, which is why it survives a cleared
          browser and a new phone.
        </p>
        <p>
          Ratings on this page come from learners who finished the course and submitted feedback —
          an unrated course shows no rating at all rather than a made-up one. Learner counts are
          enrolment records, not impressions. The same rule governs completion and XP: the server
          credits time at real-time speed and caps how fast a lesson can be marked done.
        </p>
        <p>
          {freeCount > 0 && freeCount === total
            ? 'All of these courses are free to start.'
            : `${freeCount} of these courses are free to start.`}{' '}
          Finishing any of them issues a certificate signed by TieEdu, and its serial can be checked
          by anyone at tieedu.com/verify without an account.
        </p>
        {levels.length > 0 && topics.length > 0 && (
          <p>
            Use the filters to narrow the list by {levels.join(', ').toLowerCase()} level and by topic
            — currently {topics.slice(0, 8).join(', ')}
            {topics.length > 8 ? ', among others' : ''}.
          </p>
        )}
      </div>
    </section>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  let initialData: CourseCatalogResponse | null = null;
  try {
    // No Authorization header is sent on purpose: the catalogue is public, and
    // per-learner progress is layered on by the client effect after hydration.
    const url = `${API_BASE_URL}/courses${catalogQueryFor(parseCatalogQuery(query))}`;
    const res = await fetch(url);
    if (res.ok) initialData = await res.json();
  } catch {
    // Backend unreachable at SSR time — the client effect fetches and retries.
  }
  return { props: { initialData } };
};
