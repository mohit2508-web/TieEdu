import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Building2, Search } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { CompanyListCard } from '@/components/company/CompanyListCard';
import { Chip, EmptyState, SectionHead, SkeletonCard } from '@/components/ui';
import { fetchCompanies } from '@/lib/api';
import { industryGroup } from '@/lib/industryGroup';
import { useCartScope } from '@/context/CartContext';
import type { Company } from '@/types';
import type { GetServerSideProps } from 'next';
import { serverApiBase } from '@/lib/companyPagesApi';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { isCompanyStage } from '@/lib/onboardingApi';
import { ForYou } from '@/components/personal/ForYou';
import { AdSlot } from '@/components/ads/AdSlot';

/**
 * /companies — every company page (UI_REDESIGN_PLAN_V2 §5, the Companies
 * section's landing page).
 *
 * The grid used to be the bottom half of the home page; it moved here so the
 * home page can answer "what now?" and this page can be a proper directory:
 * search, industries taken from the data (not a hard-coded list that drifts),
 * and a sort. `?q=` is read on load so the home hero's search can hand off.
 */

type SortKey = 'popular' | 'name' | 'ctc';

/** The company TiEEdu is completing first (INFOSYS_SE_PREP_PLAN.md) leads the list. */
const FOCUS_SLUG = 'infosys-systems-engineer';

const SORTS: Array<[SortKey, string]> = [
  ['popular', 'Most unlocked'],
  ['ctc', 'Highest CTC'],
  ['name', 'A–Z'],
];

export default function CompaniesPage({ initialCompanies = [] }: { initialCompanies?: Company[] }) {
  const router = useRouter();
  const { user } = useAuth();
  // 1st/2nd years: companies stay open, but we say what matters now first.
  const earlyYears = !!user?.grad_year && !isCompanyStage(user.grad_year);
  // Server-rendered list (SEO_GROWTH_PLAN S3): Google sees every company link.
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [loading, setLoading] = useState(initialCompanies.length === 0);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [industry, setIndustry] = useState('All');
  const [sort, setSort] = useState<SortKey>('popular');

  useEffect(() => {
    if (router.isReady && typeof router.query.q === 'string') setQuery(router.query.q);
  }, [router.isReady, router.query.q]);

  const load = () =>
    fetchCompanies()
      .then((data) => {
        if (Array.isArray(data)) setCompanies(data);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  // A purchase in the cart drawer unlocks companies server-side; refetch rather than guess.
  useCartScope(useMemo(() => ({ onCheckoutSuccess: () => { load(); } }), []));

  const industries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of companies) {
      const g = industryGroup(c.industry);
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return ['All', ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)];
  }, [companies]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = companies.filter(
      (c) =>
        (industry === 'All' || industryGroup(c.industry) === industry) &&
        (!q ||
          c.name.toLowerCase().includes(q) ||
          (c.industry || '').toLowerCase().includes(q) ||
          (c.tags || []).some((t) => t.toLowerCase().includes(q)))
    );
    const by: Record<SortKey, (a: Company, b: Company) => number> = {
      // The real 2026–27 programs (imported profiles carry company_group) come
      // before the older demo pages, then most unlocked first.
      popular: (a, b) => (Number(b.slug === FOCUS_SLUG) - Number(a.slug === FOCUS_SLUG)) || (Number(!!(b as any).company_group) - Number(!!(a as any).company_group)) || (b.unlock_count || 0) - (a.unlock_count || 0),
      ctc: (a, b) => (b.ctc_max ?? -1) - (a.ctc_max ?? -1),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...list].sort(by[sort]);
  }, [companies, query, industry, sort]);

  const roundsMapped = companies.reduce((n, c) => n + (c.rounds_pipeline?.length ?? 0), 0);
  const checkedCount = companies.filter((c) => c.fact_checked_at).length;

  return (
    <>
      <Head>
        <title>{`Company-wise Placement Preparation${companies.length ? ` — ${companies.slice(0, 3).map((c) => c.name.split(/[ (—-]/)[0]).filter((v, i, a) => a.indexOf(v) === i).join(', ')} & more` : ''} | TiEEdu`}</title>
        <meta
          name="description"
          content="Placement preparation company by company: every round, exam pattern, interview questions, CTC and hiring process for freshers — with each figure marked as checked or still being verified."
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'ItemList',
                  name: 'Company-wise placement preparation on TiEEdu',
                  itemListElement: companies.slice(0, 50).map((c, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    name: c.name,
                    url: `https://tieedu.in/company/${c.slug}`,
                  })),
                },
                {
                  '@type': 'BreadcrumbList',
                  itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tieedu.in' },
                    { '@type': 'ListItem', position: 2, name: 'Companies', item: 'https://tieedu.in/companies' },
                  ],
                },
              ],
            }),
          }}
        />
      </Head>

      <div className="flex min-h-screen flex-col bg-paper">
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 sm:py-12">
          <SectionHead
            level={1}
            eyebrow="Companies"
            title="Know every round before you walk into it"
            description={
              loading
                ? 'Loading companies…'
                : `${companies.length} companies, each with its rounds, questions and what it pays.`
            }
          />

          {earlyYears && (
            <div className="mt-6 rounded-3xl border border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/10 p-5 sm:p-6">
              <p className="font-display text-xl font-extrabold text-heading">Company prep starts in 3rd year</p>
              <p className="mt-1 max-w-2xl text-base text-body">
                Right now the biggest win is strong foundations — coding, DSA basics and your core subjects. Look
                around here if you are curious; when you reach 3rd year we will help you pick target companies.
              </p>
              <Link href="/courses" className="btn btn-primary mt-4 min-h-[44px] px-5 text-sm">See courses for your year</Link>
              <ForYou bare className="mt-6" show={['courses']} />
            </div>
          )}

          {!loading && companies.length > 0 && (
            <dl className="mt-6 flex flex-wrap gap-3">
              {[
                [companies.length, 'companies'],
                [roundsMapped, 'rounds mapped'],
                [checkedCount, 'fact-checked'],
              ].filter(([n]) => Number(n) > 0).map(([n, label]) => (
                <div key={label} className="flex items-baseline gap-2 rounded-full border border-line bg-card px-4 py-2 shadow-edge-neutral">
                  <dd className="font-display text-lg font-bold tabular-nums text-heading">{n}</dd>
                  <dt className="text-sm text-muted">{label}</dt>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative flex-1">
                <span className="sr-only">Search companies</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  type="search"
                  inputMode="search"
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a company, industry or skill"
                  className="min-h-[44px] w-full rounded-xl border border-line bg-card pl-10 pr-4 text-sm text-heading placeholder:text-text-light focus:border-signal focus:outline-none focus:ring-4 focus:ring-signal/10"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                Sort
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="min-h-[44px] rounded-xl border border-line bg-card px-3 text-sm font-semibold text-heading focus:border-signal focus:outline-none"
                >
                  {SORTS.map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </label>
            </div>

            {industries.length > 2 && (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none]">
                {industries.map((name) => (
                  <Chip key={name} selected={industry === name} onClick={() => setIndustry(name)}>
                    {name}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : error ? (
              <EmptyState
                icon={Building2}
                title="Companies could not be loaded."
                note="This is on our side. Try again in a moment."
                action={{ label: 'Try again', onClick: () => { setLoading(true); load(); } }}
              />
            ) : shown.length === 0 ? (
              <EmptyState
                icon={Search}
                title={query ? `No company matches “${query}”.` : 'No companies in this industry yet.'}
                action={{ label: 'Show all companies', onClick: () => { setQuery(''); setIndustry('All'); } }}
              />
            ) : (
              <>
                <p className="mb-3 text-sm text-muted" aria-live="polite">
                  {shown.length === companies.length ? `All ${shown.length}` : `${shown.length} of ${companies.length}`}
                </p>
                <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {shown.map((c, i) => (
                    <li key={c.id} className="min-w-0 apple-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                      <CompanyListCard company={c} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {/* One ad, after the content (PROFESSIONAL_PLATFORM_PLAN §7.2). */}
          <AdSlot className="mt-12" />
        </main>
        <Footer />
      </div>
    </>
  );
}

/** Server fetch with a short timeout; a slow API never blocks the page. */
async function serverGet(path: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(`${serverApiBase()}${path}`, { signal: ctrl.signal });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const data = await serverGet('/companies');
  const list = Array.isArray(data) ? data : Array.isArray(data?.companies) ? data.companies : [];
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  return { props: { initialCompanies: list } };
};
