import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock, Target, Bell, BellRing, ClipboardList, Gauge } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PracticeLayout } from '@/components/practice/PracticeLayout';
import { PracticeSkeleton } from '@/components/practice/PracticeSkeleton';
import { ProgressRing, MixBar } from '@/components/practice/SetVisuals';
import { BrandTile } from '@/components/common/BrandTile';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/common/ErrorState';
import { cn } from '@/lib/cn';
import { fetchPracticeCompanies, setPracticeNotify, type CompanyCard, type ComingSoonCompany } from '@/lib/codeApi';

type Filter = 'all' | 'progress' | 'tests' | 'free';
const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' }, { key: 'progress', label: 'In progress' }, { key: 'tests', label: 'Has tests' }, { key: 'free', label: 'Free to start' },
];

/** One company's card (PRACTICE_POLISH_PLAN.md §6.1): it says what to do next without opening it. */
function CompanyCardView({ c }: { c: CompanyCard }) {
  const href = `/practice/companies/${c.slug}`;
  const cont = c.continue;
  return (
    <article className={cn('relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md', c.target ? 'border-signal' : 'border-line')}>
      <span aria-hidden className="h-1.5 w-full" style={{ background: c.brand_color || 'rgb(var(--rgb-border-subtle))' }} />
      {c.target && <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-signal px-2.5 py-0.5 text-xs font-semibold text-on-primary"><Target className="h-3.5 w-3.5" aria-hidden /> Your target</span>}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-4">
          <BrandTile name={c.name} src={c.logo_url} className="h-14 w-14 rounded-2xl" />
          <div className="min-w-0 flex-1 pr-20">
            <h2 className="font-display text-xl font-semibold text-heading"><Link href={href} className="hover:text-link focus-ring">{c.name}</Link></h2>
            {c.tagline && <p className="mt-0.5 line-clamp-2 text-body-md text-body">{c.tagline}</p>}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-5">
          <ProgressRing done={c.solved} total={c.total} label={`${c.name} progress`} />
          <div className="min-w-0 flex-1">
            <p className="text-body-md text-body"><span className="font-semibold text-heading">{c.solved}</span> of {c.total} coding problems · {c.levels} levels</p>
            <div className="mt-2"><MixBar mix={c.mix} /></div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {c.reported > 0 && <Chip>{c.reported} reported questions</Chip>}
          {c.tests > 0 ? <Chip icon={ClipboardList}>{c.tests} tests{c.best_mock != null ? ` · best ${c.best_mock}%` : ''}</Chip> : <Chip icon={ClipboardList}>Tests soon</Chip>}
          {c.readiness != null && <Chip icon={Gauge}>Readiness {c.readiness}%</Chip>}
          {c.owned ? <Chip tone="success">Pack active</Chip> : c.locked > 0 ? <Chip icon={Lock}>{c.locked} in the pack</Chip> : <Chip tone="success">All free</Chip>}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
          {cont ? (
            <Link href={`/practice/problem/${cont.id}?company=${c.slug}`} className="btn btn-primary focus-ring inline-flex min-h-[44px] max-w-full items-center gap-2 px-4">
              <span className="truncate">{cont.started ? `Continue: ${cont.title}` : `Start with ${cont.title}`}</span> <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          ) : (
            <span className="text-body-md font-semibold text-success">Every open problem solved</span>
          )}
          <Link href={href} className="text-body-md font-semibold text-link hover:underline focus-ring">Open the set</Link>
        </div>
      </div>
    </article>
  );
}

function ComingSoonCard({ c, signedIn, onToggle }: { c: ComingSoonCompany; signedIn: boolean; onToggle: (on: boolean) => void }) {
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-dashed border-line bg-card/60 p-4">
      <BrandTile name={c.name} src={c.logo_url} className="h-12 w-12 rounded-xl opacity-80" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-heading">{c.name}</p>
        <p className="text-sm text-muted">Coding set coming soon</p>
      </div>
      {signedIn ? (
        <button type="button" aria-pressed={c.notify} onClick={() => onToggle(!c.notify)}
          className={cn('inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3 text-sm font-semibold focus-ring', c.notify ? 'border-signal bg-signal-soft text-signal-ink' : 'border-line text-body hover:border-line-strong')}>
          {c.notify ? <BellRing className="h-4 w-4" aria-hidden /> : <Bell className="h-4 w-4" aria-hidden />} {c.notify ? 'We will tell you' : 'Notify me'}
        </button>
      ) : (
        <Link href="/login?next=/practice/companies" className="text-sm font-semibold text-link hover:underline">Sign in to get notified</Link>
      )}
    </article>
  );
}

/** Company sets (PRACTICE_POLISH_PLAN.md §6.1): target first, filters, cards that say what to do next, coming-soon companies. */
export default function CompanySetsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<{ companies: CompanyCard[]; coming_soon: ComingSoonCompany[] } | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  // Defaults keep the page working against an older API (e.g. frontend deployed before the backend).
  const load = () => { setError(''); fetchPracticeCompanies().then((r) => setData({ companies: (r.companies || []).map((c) => ({ ...c, mix: c.mix || { easy: 0, medium: 0, hard: 0 }, reported: c.reported ?? 0, continue: c.continue ?? null, readiness: c.readiness ?? null, best_mock: c.best_mock ?? null, levels: c.levels ?? 0, target: !!c.target })), coming_soon: r.coming_soon || [] })).catch((e) => setError(e.message)); };
  useEffect(load, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => (data?.companies || []).filter((c) =>
    filter === 'progress' ? c.solved + c.attempted > 0 : filter === 'tests' ? c.tests > 0 : filter === 'free' ? c.locked < c.total : true), [data, filter]);

  const toggle = (slug: string, on: boolean) => {
    setData((d) => d && { ...d, coming_soon: d.coming_soon.map((x) => (x.slug === slug ? { ...x, notify: on } : x)) });
    setPracticeNotify(slug, on).catch(() => setData((d) => d && { ...d, coming_soon: d.coming_soon.map((x) => (x.slug === slug ? { ...x, notify: !on } : x)) }));
  };

  return (
    <PracticeLayout title="Company sets" intro="The coding questions each company asks, in the order to practise them, plus its tests in the real pattern. Your target company comes first.">
      {error && <ErrorState message={error} onRetry={load} />}
      {!data && !error && <PracticeSkeleton kind="cards" label="Loading company sets" />}
      {data && (
        <div className="space-y-10">
          <div role="group" aria-label="Filter companies" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}
                className={cn('min-h-[40px] rounded-full border px-4 text-body-md font-semibold focus-ring', filter === f.key ? 'border-signal bg-signal-soft text-signal-ink' : 'border-line bg-card text-body hover:border-line-strong')}>
                {f.label}
              </button>
            ))}
          </div>
          {shown.length ? (
            <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">{shown.map((c) => <CompanyCardView key={c.slug} c={c} />)}</div>
          ) : (
            <p className="rounded-2xl border border-line bg-card p-6 text-body-md text-body">Nothing here yet. <button type="button" className="font-semibold text-link underline" onClick={() => setFilter('all')}>Show all companies</button></p>
          )}
          {data.coming_soon.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-heading">Coming next</h2>
              <p className="mt-1 text-body-md text-body">These companies have a prep plan already. Their coding sets are being written.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {data.coming_soon.map((c) => <ComingSoonCard key={c.slug} c={c} signedIn={!!user} onToggle={(on) => toggle(c.slug, on)} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </PracticeLayout>
  );
}
