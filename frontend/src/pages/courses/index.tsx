import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CourseCardTile } from '@/components/courses/CourseUi';
import { fetchCourseCatalog } from '@/lib/coursesApi';
import { useAuth } from '@/context/AuthContext';
import type { CourseCard } from '@/types';

export default function CoursesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The catalogue is public, but the per-card progress block needs the session.
  // Waiting for auth to settle avoids a flash of "0% / not enrolled" for people
  // who are actually mid-course.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCourseCatalog()
      .then((data) => {
        if (cancelled) return;
        setCourses(data.courses || []);
        setCategories(data.categories || []);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [authLoading, user?.id]);

  // Client-side filtering keeps the page instant; the API also accepts the same
  // params so this can be moved server-side without changing the UI.
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return courses.filter((c) => {
      if (category && c.category !== category) return false;
      if (!needle) return true;
      return (
        c.title.toLowerCase().includes(needle) ||
        c.subtitle.toLowerCase().includes(needle) ||
        c.tags.some((t) => t.toLowerCase().includes(needle))
      );
    });
  }, [courses, q, category]);

  return (
    <>
      <Head>
        <title>Courses · TieEdu</title>
        <meta
          name="description"
          content="Structured, sequential courses with verified progress and signed, verifiable certificates."
        />
      </Head>
      <Header cartCount={0} onOpenCart={() => {}} onOpenSearch={() => {}} onOpenLeaderboard={() => {}} />
      <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-14">
        <header className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-sky)]">
            Learn properly
          </p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-[var(--ink)]">
            Courses that keep their promises
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-body)]">
            Work through each lesson in order. Your progress is saved on the server, the time you
            put in is checked rather than assumed, and the certificate you finish with carries a
            signature anyone can verify.
          </p>
        </header>

        {categories.length > 1 && (
          <div className="mt-8 flex flex-wrap gap-2">
            <FilterChip active={!category} onClick={() => setCategory('')}>
              All
            </FilterChip>
            {categories.map((c) => (
              <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </FilterChip>
            ))}
          </div>
        )}

        <div className="mt-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses"
            aria-label="Search courses"
            className="w-full max-w-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--text-light)] focus:border-[var(--brand-sky)]"
          />
        </div>

        {error && (
          <p className="mt-10 rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-4 py-3 text-sm text-[var(--color-error)]">
            {error}
          </p>
        )}

        {loading && !error && (
          <p className="mt-16 text-center text-sm text-[var(--text-muted)]">Loading courses…</p>
        )}

        {!loading && !error && visible.length === 0 && (
          <p className="mt-16 text-center text-sm text-[var(--text-muted)]">
            {courses.length === 0
              ? 'No courses have been published yet.'
              : 'Nothing matches that search.'}
          </p>
        )}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((course) => (
            <CourseCardTile key={course.id} course={course} />
          ))}
        </div>

        {!authLoading && !user && (
          <p className="mt-10 text-sm text-[var(--text-muted)]">
            <button
              type="button"
              onClick={() => router.push('/login?next=/courses')}
              className="font-semibold text-[var(--brand-sky)] underline underline-offset-2"
            >
              Sign in
            </button>{' '}
            to save your progress and earn certificates.
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}

const FilterChip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={[
      'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
      active
        ? 'border-[var(--brand-sky)] bg-[var(--brand-sky)] text-white'
        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-body)] hover:border-[var(--border-strong)]',
    ].join(' ')}
  >
    {children}
  </button>
);
