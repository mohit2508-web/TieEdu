import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock3, Compass, GraduationCap } from 'lucide-react';
import { BrandTile } from '@/components/common/BrandTile';
import { useAuth } from '@/context/AuthContext';
import { useConsent } from '@/lib/consent';
import { fetchForYou, readLocalRecent, type ForYouView } from '@/lib/forYouApi';
import { cn } from '@/lib/cn';

/**
 * "For you" rails (PROFESSIONAL_PLATFORM_PLAN §3): recommended courses for the
 * student's year and interests, recently viewed pages, and — from 3rd year —
 * the companies they are looking at. Renders nothing when there is nothing
 * real to show, so a new visitor never sees an empty frame.
 *
 * `show` picks the rails for the page it sits on.
 */
export const ForYou: React.FC<{
  show?: Array<'courses' | 'recent' | 'companies'>;
  className?: string;
  title?: string;
  /** No card of its own — for when it sits inside another panel. */
  bare?: boolean;
}> = ({ show = ['courses', 'recent'], className, title, bare = false }) => {
  const { user, loading } = useAuth();
  const consent = useConsent();
  const [view, setView] = useState<ForYouView | null>(null);
  const [localRecent, setLocalRecent] = useState<ReturnType<typeof readLocalRecent>>([]);

  useEffect(() => {
    if (loading) return;
    if (user) {
      fetchForYou().then(setView).catch(() => setView(null));
    } else {
      setView(null);
      setLocalRecent(readLocalRecent());
    }
  }, [loading, user, consent]);

  const recent = view
    ? view.recent
    : localRecent.map((r) => ({ kind: r.kind, slug: r.slug, title: r.title, href: r.kind === 'course' ? `/courses/${r.slug}` : `/company/${r.slug}` }));
  const courses = show.includes('courses') ? view?.courses || [] : [];
  const companies = show.includes('companies') && view?.show_companies ? view.companies : [];
  const showRecent = show.includes('recent') && recent.length > 0;

  if (!courses.length && !companies.length && !showRecent) return null;

  const heading =
    title ||
    (view?.stage === 'foundation'
      ? 'Picked for your year'
      : view?.stage === 'placement'
        ? 'For placement season'
        : 'Picked for you');

  return (
    <section aria-labelledby="for-you-h" className={cn(!bare && 'rounded-3xl border border-line bg-card p-5 shadow-edge-neutral sm:p-6', className)}>
      {(courses.length > 0 || companies.length > 0) && (
        <div className="flex items-center gap-2">
          <Compass size={18} className="text-[var(--brand-accent)]" aria-hidden="true" />
          <h2 id="for-you-h" className="font-display text-xl font-extrabold tracking-tight text-heading">{heading}</h2>
        </div>
      )}

      {courses.length > 0 && (
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.slice(0, 3).map((c) => (
            <li key={c.slug}>
              <Link
                href={`/courses/${c.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-line bg-app p-4 transition-colors hover:border-[var(--brand-sky)]"
              >
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                  <GraduationCap size={14} aria-hidden="true" /> {c.category}
                  {c.is_free && <span className="rounded-full bg-[var(--brand-accent)] px-2 py-0.5 text-[var(--accent-ink)]">Free</span>}
                </span>
                <span className="mt-2 font-bold leading-snug text-heading">{c.title}</span>
                <span className="mt-1 flex-1 text-sm text-body line-clamp-2">{c.subtitle}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-link">
                  {c.reason} <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {companies.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {companies.map((c) => (
            <li key={c.slug}>
              <Link href={`/company/${c.slug}`} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-app py-1.5 pl-1.5 pr-4 text-sm font-semibold text-heading transition-colors hover:border-[var(--brand-sky)]">
                <BrandTile name={c.name} src={c.logo_url} className="h-8 w-8 rounded-full p-0.5" />
                {c.name}
                <span className="text-xs font-normal text-muted">· {c.reason}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showRecent && (
        <div className={cn(courses.length || companies.length ? 'mt-5 border-t border-line pt-4' : '')}>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted">
            <Clock3 size={13} aria-hidden="true" /> Recently viewed
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {recent.slice(0, 6).map((r) => (
              <li key={`${r.kind}:${r.slug}`}>
                <Link href={r.href} className="inline-flex min-h-[40px] items-center rounded-full border border-line bg-app px-3.5 text-sm font-semibold text-heading transition-colors hover:border-[var(--brand-sky)]">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
