import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowRight, Award, Briefcase, Compass, GraduationCap, Sparkles, Target, Wrench, X } from 'lucide-react';
import type { CatalogFacets, CatalogFilters } from '@/types';
import type { CatalogMultiKey } from '@/lib/catalogState';

/**
 * Catalogue entry aids: intent sections, the find-your-course wizard, and the
 * mobile quick-chip row.
 *
 * Everything here navigates by URL, never by hidden state. An intent card is
 * a link to a filtered catalogue the server renders; the wizard finishes by
 * pushing the same query string a hand-built filter would. That is what keeps
 * every one of these doors shareable, SSR-able and honest: the destination is
 * the real result set, including when it is empty.
 */

// --- Intent sections ---------------------------------------------------------

const INTENTS = [
  {
    label: 'Exam prep (free)',
    sub: 'Semester-mapped core, free',
    href: '/courses?bucket=b&type=free&src=intent',
    icon: GraduationCap,
  },
  {
    label: 'Placement',
    sub: 'Career-track courses',
    href: '/courses?bucket=d&src=intent',
    icon: Target,
  },
  {
    label: 'Industry tools',
    sub: 'Skills that pay',
    href: '/courses?bucket=c&src=intent',
    icon: Wrench,
  },
  {
    label: 'Start here in a weekend',
    sub: 'Micro-courses, 2–4 hours',
    href: '/courses?bucket=e&src=intent',
    icon: Sparkles,
  },
];

export const IntentSections: React.FC = () => (
  <section aria-label="Start from your goal" className="mt-9">
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
      {INTENTS.map((intent) => (
        <Link
          key={intent.label}
          href={intent.href}
          className="group flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 transition-colors hover:border-[var(--brand-sky)]/50 focus-ring sm:p-4"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F4FB] text-[#0271B5]">
            <intent.icon size={18} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold text-[var(--ink)] group-hover:text-[var(--brand-sky-strong)]">
              {intent.label}
            </span>
            <span className="block truncate text-xs text-[var(--text-muted)]">{intent.sub}</span>
          </span>
        </Link>
      ))}
    </div>
  </section>
);

// --- Find-your-course wizard ---------------------------------------------------

const WIZARD_KEY = 'tieedu_course_wizard_v1';

const YEAR_OPTIONS = [
  { key: '1', label: '1st year' },
  { key: '2', label: '2nd year' },
  { key: '3', label: '3rd year' },
  { key: '4', label: '4th year +' },
];

const WIZARD_BRANCHES = [
  { key: 'cse', label: 'CSE / IT' },
  { key: 'ece', label: 'ECE' },
  { key: 'eee', label: 'EEE' },
  { key: 'mech', label: 'Mech' },
  { key: 'civil', label: 'Civil' },
  { key: 'career', label: 'Non-tech' },
];

const WIZARD_GOALS = [
  { key: 'exam', label: 'Pass semester exams', sub: 'Mapped to your syllabus', icon: GraduationCap },
  { key: 'placement', label: 'Get placed', sub: 'Career-track courses', icon: Briefcase },
  { key: 'internship', label: 'Find an internship', sub: 'Search internships', icon: Compass },
  { key: 'gate', label: 'Crack GATE', sub: 'Search GATE prep', icon: Award },
  { key: 'tool', label: 'Learn a tool skill', sub: 'Industry tools', icon: Wrench },
];

export const CourseWizard: React.FC<{
  open: boolean;
  onClose: (dismiss: boolean) => void;
}> = ({ open, onClose }) => {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [year, setYear] = useState<string | null>(null);
  const [branch, setBranch] = useState<string | null>(null);

  // Fresh run each time the sheet opens — a half-answered wizard from last
  // time is not a sensible starting point.
  useEffect(() => {
    if (open) {
      setStep(0);
      setYear(null);
      setBranch(null);
    }
  }, [open ]);

  if (!open) return null;

  const needsBranch = year !== '1';
  const steps = needsBranch ? ['Year', 'Branch', 'Goal'] : ['Year', 'Goal'];
  const current = needsBranch ? step : step === 0 ? 0 : 1;

  const finish = (goal: string) => {
    const qs = new URLSearchParams();
    qs.set('src', 'wizard');
    if (year === '1') {
      qs.set('branch', 'year1');
    } else if (branch) {
      qs.set('branch', branch);
    }
    if (goal === 'exam') qs.set('bucket', 'b');
    else if (goal === 'placement') qs.set('bucket', 'd');
    else if (goal === 'tool') qs.set('bucket', 'c');
    else if (goal === 'internship') qs.set('q', 'internship');
    else if (goal === 'gate') qs.set('q', 'gate');
    onClose(true);
    void router.push(`/courses?${qs.toString()}`);
  };

  const optionCls =
    'flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 text-left text-sm font-bold text-[var(--ink)] transition-colors hover:border-[var(--brand-sky)] focus-ring';

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Find your course">
      <button type="button" aria-label="Close" onClick={() => onClose(true)} className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg rounded-t-2xl bg-[var(--bg-surface)] p-6 pb-[calc(1.5rem+var(--safe-bottom))] sm:inset-0 sm:m-auto sm:h-fit sm:rounded-2xl">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Step {current + 1} of {steps.length} · {steps[current]}
          </p>
          <button
            type="button"
            onClick={() => onClose(true)}
            aria-label="Dismiss"
            className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mb-5 h-1 overflow-hidden rounded-full bg-[var(--bg-surface-hover)]">
          <div
            className="h-full rounded-full bg-[var(--brand-sky)] transition-all"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </div>

        {step === 0 && (
          <>
            <h2 className="text-lg font-extrabold text-[var(--ink)]">Kis saal mein ho?</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {YEAR_OPTIONS.map((y) => (
                <button
                  key={y.key}
                  type="button"
                  className={optionCls}
                  onClick={() => {
                    setYear(y.key);
                    setStep(1);
                  }}
                >
                  {y.label} <ArrowRight size={15} className="text-[var(--text-light)]" />
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && needsBranch && (
          <>
            <h2 className="text-lg font-extrabold text-[var(--ink)]">Apna branch chuno</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {WIZARD_BRANCHES.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  className={optionCls}
                  onClick={() => {
                    setBranch(b.key);
                    setStep(2);
                  }}
                >
                  {b.label} <ArrowRight size={15} className="text-[var(--text-light)]" />
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setStep(0)} className="mt-4 text-xs font-bold text-[var(--text-muted)] hover:underline">
              ← Back
            </button>
          </>
        )}

        {(step === 2 || (step === 1 && !needsBranch)) && (
          <>
            <h2 className="text-lg font-extrabold text-[var(--ink)]">Kis liye chahiye?</h2>
            <div className="mt-4 space-y-2">
              {WIZARD_GOALS.map((g) => (
                <button key={g.key} type="button" className={optionCls} onClick={() => finish(g.key)}>
                  <span className="flex items-center gap-2.5">
                    <g.icon size={16} className="text-[var(--brand-sky)]" />
                    <span>
                      {g.label}
                      <span className="block text-xs font-semibold text-[var(--text-muted)]">{g.sub}</span>
                    </span>
                  </span>
                  <ArrowRight size={15} className="text-[var(--text-light)]" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => (needsBranch ? setStep(1) : setStep(0))}
              className="mt-4 text-xs font-bold text-[var(--text-muted)] hover:underline"
            >
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export function shouldAutoOpenWizard(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(WIZARD_KEY) !== '1';
  } catch {
    return true;
  }
}

export function dismissWizard(): void {
  try {
    window.localStorage.setItem(WIZARD_KEY, '1');
  } catch {
    // Dismissal for this visit only when storage is blocked.
  }
}

// --- Mobile quick chips --------------------------------------------------------
// Branch + bucket first (the two dimensions the plan promotes), counts only;
// a value with no courses is not offered.

export const MobileFilterChips: React.FC<{
  facets: CatalogFacets;
  filters: CatalogFilters;
  onToggle: (key: CatalogMultiKey, value: string) => void;
}> = ({ facets, filters, onToggle }) => {
  const branches = (facets.branch || []).filter((o) => o.count > 0);
  const buckets = (facets.bucket || []).filter((o) => o.count > 0);
  if (branches.length === 0 && buckets.length === 0) return null;

  const chip = (key: CatalogMultiKey, optKey: string, label: string, selected: boolean) => (
    <button
      key={`${key}:${optKey}`}
      type="button"
      onClick={() => onToggle(key, optKey)}
      aria-pressed={selected}
      className={[
        'min-h-[40px] flex-none snap-start rounded-full border px-3.5 text-[13px] font-bold transition-colors focus-ring',
        selected
          ? 'border-[var(--brand-sky)] bg-[var(--brand-sky)] text-white'
          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-body)]',
      ].join(' ')}
    >
      {label}
    </button>
  );

  return (
    <div className="rail-track mt-4 lg:hidden" aria-label="Quick filters">
      {branches.map((o) => chip('branch', o.key, o.label, filters.branch.includes(o.key)))}
      {buckets.map((o) => chip('bucket', o.key, o.label, filters.bucket.includes(o.key)))}
    </div>
  );
};
