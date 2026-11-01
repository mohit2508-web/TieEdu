import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Briefcase, BrainCircuit, Building2, ClipboardCheck, Cloud, Code2, Cpu, Database, Globe, Palette, Search, SearchX, Smartphone, Target, X, type LucideIcon } from 'lucide-react';
import { Chip, EmptyState, RouteLine, SectionHead, SkeletonCard } from '@/components/ui';
import { fetchSkillsApi, SkillTestSkill } from '@/lib/skillTestApi';

/**
 * /skill-test — the Practise section's landing page (UI_REDESIGN_PLAN_V2 §7,
 * "Skill Test rebuild in brand").
 *
 * What changed, and why:
 *  - Every number comes from the API. The old "how it works" promised "30
 *    questions in 30 minutes" while 99 of the 100 live tests are 10 in 15; the
 *    steps now state the most common length, computed from the data.
 *  - No invented fallback. When the API failed, the page used to show eight
 *    hard-coded tests with made-up counts; it now says it could not load them
 *    and offers a retry.
 *  - Cards say what differs between tests (name, length, certificate,
 *    popular) instead of repeating the same brain icon and "Certificate
 *    Available" a hundred times.
 */

type CardSkill = {
  name: string;
  slug: string;
  q: number;
  min: number;
  category: string;
  tags: string[];
  popular: boolean;
  certificate: boolean;
  companySlug?: string;
};

/* One look per category: an icon on a tinted tile (tokens only). */
const CAT_STYLE: Record<string, { icon: LucideIcon; tile: string }> = {
  Programming: { icon: Code2, tile: 'bg-signal-soft text-amber-deep' },
  'Web Development': { icon: Globe, tile: 'bg-secondary-soft text-secondary' },
  Databases: { icon: Database, tile: 'bg-success-soft text-success' },
  'Core CS': { icon: Cpu, tile: 'bg-warning-soft text-amber-deep' },
  'Data Science & AI': { icon: BrainCircuit, tile: 'bg-secondary-soft text-secondary' },
  'Cloud & DevOps': { icon: Cloud, tile: 'bg-success-soft text-success' },
  'Mobile & Game Dev': { icon: Smartphone, tile: 'bg-danger-soft text-danger' },
  'Design & Creative': { icon: Palette, tile: 'bg-danger-soft text-danger' },
  'Career & Aptitude': { icon: Target, tile: 'bg-signal-soft text-amber-deep' },
  'Business & Marketing': { icon: Briefcase, tile: 'bg-warning-soft text-amber-deep' },
  'Company mocks': { icon: Building2, tile: 'bg-signal text-on-primary' },
};
const catStyle = (c: string) => CAT_STYLE[c] || { icon: ClipboardCheck, tile: 'bg-surface-hover text-heading' };
const COMPANY_MOCKS = 'Company mocks';

const toCard = (s: SkillTestSkill): CardSkill => ({
  name: s.name.replace(/ Programming$/, ''),
  slug: s.slug,
  q: s.totalQuestions,
  min: s.avgCompletionTime,
  category: s.category || 'Other',
  tags: s.tags || [],
  popular: !!s.isPopular,
  certificate: s.certificateAvailable !== false,
  companySlug: (s as any).company_slug,
});

/** The length most tests share, so the steps can say it without a hard-coded number. */
const typicalLength = (skills: CardSkill[]): { q: number; min: number } | null => {
  const counts = new Map<string, { q: number; min: number; n: number }>();
  for (const s of skills) {
    const key = `${s.q}/${s.min}`;
    const prev = counts.get(key);
    counts.set(key, { q: s.q, min: s.min, n: (prev?.n ?? 0) + 1 });
  }
  const best = [...counts.values()].sort((a, b) => b.n - a.n)[0];
  return best ? { q: best.q, min: best.min } : null;
};

const CatTile: React.FC<{ category: string; size?: 'sm' | 'md' }> = ({ category, size = 'sm' }) => {
  const { icon: Icon, tile } = catStyle(category);
  return (
    <span className={`flex shrink-0 items-center justify-center ${size === 'md' ? 'h-11 w-11 rounded-xl' : 'h-8 w-8 rounded-lg'} ${tile}`} aria-hidden>
      <Icon className={size === 'md' ? 'h-5 w-5' : 'h-4 w-4'} />
    </span>
  );
};

const SkillCard: React.FC<{ skill: CardSkill }> = ({ skill }) => (
  <Link
    href={`/skill-test/${skill.slug}`}
    className="group focus-ring flex h-full min-h-[148px] flex-col rounded-card border border-line bg-card p-5 shadow-edge-neutral transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-signal/60 hover:shadow-[var(--shadow-pop)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
  >
    <div className="flex items-start gap-3">
      <CatTile category={skill.category} size="md" />
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-display text-lg font-bold leading-snug text-heading">{skill.name}</h4>
        <p className="mt-0.5 text-sm tabular-nums text-muted">{skill.q} questions · {skill.min} min</p>
      </div>
      {skill.popular && <Chip tone="signal">Popular</Chip>}
    </div>
    <div className="mt-auto flex items-center justify-between pt-4">
      {skill.certificate ? (
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
          <BadgeCheck className="h-4 w-4" aria-hidden /> Certificate
        </span>
      ) : <span />}
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-link">
        Start <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </div>
  </Link>
);

/* Company mocks (3T): the real-pattern tests, shown first and larger. */
const MockCard: React.FC<{ skill: CardSkill }> = ({ skill }) => (
  <Link
    href={`/skill-test/${skill.slug}`}
    className="group focus-ring flex flex-col gap-4 rounded-card border border-signal/40 bg-card p-6 shadow-edge-neutral transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:flex-row sm:items-center"
  >
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-signal text-on-primary" aria-hidden>
      <Building2 className="h-7 w-7" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-deep">Company mock · real pattern</p>
      <h4 className="mt-1 font-display text-xl font-bold text-heading">{skill.name}</h4>
      <p className="mt-1 text-base tabular-nums text-muted">{skill.q} questions · {skill.min} minutes · timed, secure mode</p>
    </div>
    <span className="btn btn-primary min-h-[48px] px-5">
      Start the mock <ArrowRight className="h-4 w-4" aria-hidden />
    </span>
  </Link>
);

export default function SkillTestLanding() {
  const [skills, setSkills] = useState<CardSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('All');

  const load = useCallback(() => {
    setLoading(true);
    fetchSkillsApi()
      .then((data) => {
        setSkills(data.filter((s) => s.status === 'active').map(toCard));
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const catNames = useMemo(() => {
    const seen: string[] = [];
    for (const s of skills) if (s.category !== COMPANY_MOCKS && !seen.includes(s.category)) seen.push(s.category);
    return seen;
  }, [skills]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((s) => {
      if (s.category === COMPANY_MOCKS) return false;
      if (activeCat !== 'All' && s.category !== activeCat) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.slug.includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [skills, query, activeCat]);

  const groups = useMemo(() => {
    const map = new Map<string, CardSkill[]>();
    for (const s of filtered) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return Array.from(map.entries()).map(([name, list]) => ({ name, skills: list }));
  }, [filtered]);

  const mocks = useMemo(() => skills.filter((s) => s.category === COMPANY_MOCKS), [skills]);
  const typical = useMemo(() => typicalLength(skills.filter((s) => s.category !== COMPANY_MOCKS)), [skills]);
  const firstSlug = skills.find((s) => s.popular)?.slug ?? skills[0]?.slug ?? 'java';

  const clearFilters = () => {
    setQuery('');
    setActiveCat('All');
  };

  const steps = [
    { label: 'Pick a skill', note: skills.length ? `${skills.length - mocks.length} to choose from` : undefined },
    {
      label: typical ? `Answer ${typical.q} questions` : 'Answer the questions',
      note: typical ? `About ${typical.min} minutes` : undefined,
    },
    { label: 'See your score by topic', note: 'Strengths and gaps' },
    { label: 'Pass, get a certificate', note: 'With a public verification link' },
  ];

  return (
    <>
      <Head>
        <title>Free skill tests with certificates | TieEdu</title>
        <meta
          name="description"
          content="Free skill tests for engineering students: programming, core CS, data and cloud. See your score by topic and earn a certificate anyone can verify."
        />
      </Head>

      <div className="min-h-screen bg-paper">
        {/* Hero — the page's one ink band. */}
        <section className="bg-brand-ink text-white">
          <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                <ClipboardCheck className="h-3.5 w-3.5" aria-hidden /> Free skill tests
              </p>
              <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
                Know your skills. <span className="text-money">Prove them.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
                Take a free test, see where you are strong and where you are not, and earn a certificate anyone can
                verify.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/skill-test/${firstSlug}`}
                  className="pressable focus-ring inline-flex min-h-[48px] items-center justify-center gap-2 rounded-cell bg-signal px-6 text-base font-semibold text-on-primary transition-colors hover:bg-signal-hover shadow-edge-primary active:translate-y-0.5 active:shadow-edge-selected"
                >
                  Take a free test <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a
                  href="#skills"
                  className="focus-ring inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/30 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Browse all tests
                </a>
              </div>
            </div>
            <RouteLine onInk numbered className="mt-12 hidden md:block" stations={steps.map((s) => ({ ...s, state: 'next' as const }))} />
            <RouteLine onInk numbered orientation="vertical" className="mt-10 md:hidden" stations={steps.map((s) => ({ ...s, state: 'next' as const }))} />
          </div>
        </section>

        {/* Skills */}
        <section id="skills" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-12 sm:px-6">
          {mocks.length > 0 && (
            <div className="mb-12">
              <SectionHead eyebrow="Placement" title="Company mocks" description="The real test pattern of each company, section by section." />
              <ul className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {mocks.map((m) => <li key={m.slug}><MockCard skill={m} /></li>)}
              </ul>
            </div>
          )}
          <SectionHead
            eyebrow="All tests"
            title="Choose a skill"
            description={loading ? 'Loading tests…' : `${skills.length - mocks.length} skill tests, all free, each with a certificate.`}
          />

          {loading ? (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} lines={1} />
              ))}
            </div>
          ) : failed ? (
            <EmptyState
              className="mt-8"
              icon={ClipboardCheck}
              title="Skill tests could not be loaded."
              note="This is on our side. Try again in a moment."
              action={{ label: 'Try again', onClick: load }}
            />
          ) : (
            <>
              <div className="mt-8 space-y-4">
                <label className="relative block max-w-xl">
                  <span className="sr-only">Search skills</span>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                  <input
                    type="search"
                    inputMode="search"
                    autoComplete="off"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search a skill: Python, SQL, AWS…"
                    className="min-h-[44px] w-full rounded-xl border border-line bg-card pl-10 pr-12 text-sm text-heading placeholder:text-text-light focus:border-signal focus:outline-none focus:ring-4 focus:ring-signal/10"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                      className="focus-ring absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-heading"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </label>

                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
                  {['All', ...catNames].map((cat) => {
                    const Icon = cat === 'All' ? null : catStyle(cat).icon;
                    return (
                      <Chip key={cat} selected={activeCat === cat} onClick={() => setActiveCat(cat)}>
                        {Icon && <Icon className="h-4 w-4" aria-hidden />}
                        {cat}
                      </Chip>
                    );
                  })}
                </div>

                <p className="text-sm text-muted" aria-live="polite">
                  {filtered.length === skills.length - mocks.length ? `All ${filtered.length}` : `${filtered.length} of ${skills.length - mocks.length}`}
                  {activeCat !== 'All' && ` in ${activeCat}`}
                  {query.trim() && ` matching “${query.trim()}”`}
                </p>
              </div>

              {filtered.length === 0 ? (
                <EmptyState
                  className="mt-6"
                  icon={SearchX}
                  title="No test matches that."
                  note="Try another word, or clear the filters."
                  action={{ label: 'Clear filters', onClick: clearFilters }}
                />
              ) : (
                groups.map((cat) => (
                  <section key={cat.name} className="mt-10" aria-labelledby={`cat-${cat.name}`}>
                    <h3 id={`cat-${cat.name}`} className="flex items-center gap-2 font-display text-xl font-bold text-heading">
                      <CatTile category={cat.name} />
                      {cat.name}
                      <span className="text-sm font-normal tabular-nums text-muted">{cat.skills.length}</span>
                    </h3>
                    <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {cat.skills.map((skill) => (
                        <li key={skill.slug} className="min-w-0">
                          <SkillCard skill={skill} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </>
          )}
        </section>

        {/* Closing — a plain card; the hero is the page's ink band. */}
        <section className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6">
          <div className="flex flex-col items-start gap-5 rounded-[20px] border border-line bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-heading">Don&apos;t just say you know it. Prove it.</h2>
              <p className="mt-1 text-base text-muted">
                Every certificate you earn is listed on your{' '}
                <Link href="/skill-test/skill-passport" className="font-semibold text-link hover:underline">
                  skill passport
                </Link>
                , and each one has its own verification page.
              </p>
            </div>
            <Link
              href={`/skill-test/${firstSlug}`}
              className="pressable focus-ring inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-cell bg-signal px-6 text-base font-semibold text-on-primary transition-colors hover:bg-signal-hover shadow-edge-primary active:translate-y-0.5 active:shadow-edge-selected"
            >
              Take a free test <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
