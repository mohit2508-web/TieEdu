import React, { useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Briefcase,
  Building2,
  CircuitBoard,
  Cog,
  Compass,
  Cpu,
  GraduationCap,
  Target,
  Wrench,
  Zap,
} from 'lucide-react';
import { Reveal } from '@/components/home/Reveal';

/**
 * The branch / goal selector band — the page's best capture lever.
 *
 * Two thumb-scrollable rows below the hero: "Apna branch" (branch-filtered
 * catalogue) and "Kya chahiye" (goal → bucket or real search). Every card is
 * a real link carrying the filter in the URL, so the destination is shareable
 * and SSR-able, and the catalogue page honours it without extra state. The
 * `src=band` marker is funnel attribution for later analysis, not a filter —
 * the catalogue parser ignores unknown keys.
 *
 * The last pick is remembered locally and ringed on return visits. That is the
 * whole of the "personalisation" here: no invented recommendations, just a
 * visual nudge toward the door the visitor already chose.
 */

const PICK_KEY = 'tieedu_band_pick_v1';

interface BandLink {
  key: string;
  label: string;
  sub: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
}

const BRANCHES: BandLink[] = [
  { key: 'branch:cse', label: 'CSE', sub: 'CS & IT', href: '/courses?branch=cse&src=band', icon: Cpu, tint: 'text-signal bg-signal-soft' },
  { key: 'branch:ece', label: 'ECE', sub: 'Electronics', href: '/courses?branch=ece&src=band', icon: CircuitBoard, tint: 'text-[#7C3AED] bg-[#F1EBFE]' },
  { key: 'branch:eee', label: 'EEE', sub: 'Electrical', href: '/courses?branch=eee&src=band', icon: Zap, tint: 'text-amber-deep bg-warning-soft' },
  { key: 'branch:mech', label: 'Mech', sub: 'Mechanical', href: '/courses?branch=mech&src=band', icon: Cog, tint: 'text-brand-ink bg-surface-hover' },
  { key: 'branch:civil', label: 'Civil', sub: 'Civil', href: '/courses?branch=civil&src=band', icon: Building2, tint: 'text-success bg-surface-hover' },
  { key: 'branch:career', label: 'Non-tech', sub: 'Career paths', href: '/courses?branch=career&src=band', icon: Briefcase, tint: 'text-danger bg-signal-soft' },
];

const GOALS: BandLink[] = [
  { key: 'goal:exam', label: 'Exam pass', sub: 'Semester core', href: '/courses?bucket=b&src=band', icon: GraduationCap, tint: 'text-signal bg-signal-soft' },
  { key: 'goal:placement', label: 'Placement', sub: 'Career track', href: '/courses?bucket=d&src=band', icon: Target, tint: 'text-success bg-surface-hover' },
  { key: 'goal:internship', label: 'Internship', sub: 'Real search', href: '/courses?q=internship&src=band', icon: Compass, tint: 'text-[#7C3AED] bg-[#F1EBFE]' },
  { key: 'goal:gate', label: 'GATE', sub: 'Real search', href: '/courses?q=gate&src=band', icon: Award, tint: 'text-amber-deep bg-warning-soft' },
  { key: 'goal:tools', label: 'Tool skill', sub: 'Industry tools', href: '/courses?bucket=c&src=band', icon: Wrench, tint: 'text-brand-ink bg-surface-hover' },
];

function readPick(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(PICK_KEY);
  } catch {
    return null;
  }
}

const Row: React.FC<{ title: string; hint: string; links: BandLink[] }> = ({ title, hint, links }) => {
  const [pick, setPick] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  React.useEffect(() => {
    setPick(readPick());
    setHydrated(true);
  }, []);

  const choose = (key: string) => {
    setPick(key);
    try {
      window.localStorage.setItem(PICK_KEY, key);
    } catch {
      // A blocked localStorage must not break navigation — the link works anyway.
    }
  };

  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-extrabold text-heading">{title}</h2>
        <span className="text-xs font-semibold text-[var(--text-muted)]">{hint}</span>
      </div>
      <div className="rail-track">
        {links.map((l) => {
          const chosen = hydrated && pick === l.key;
          return (
            <Link
              key={l.key}
              href={l.href}
              onClick={() => choose(l.key)}
              aria-current={chosen ? 'true' : undefined}
              className={[
                'group flex w-[148px] flex-none snap-start items-center gap-3 rounded-2xl border bg-white p-3 transition-colors focus-ring',
                chosen
                  ? 'border-signal ring-2 ring-signal/20'
                  : 'border-line hover:border-signal/40',
              ].join(' ')}
            >
              <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${l.tint}`}>
                <l.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-heading group-hover:text-signal">
                  {l.label}
                </span>
                <span className="block truncate text-xs font-semibold text-[var(--text-muted)]">
                  {l.sub}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export const BranchGoalBand: React.FC = () => (
  <section aria-label="Find courses by branch or goal" className="border-b border-line bg-white">
    <Reveal className="mx-auto w-full max-w-[1700px] space-y-5 px-4 py-6 sm:px-8 sm:py-7 lg:px-12">
      <Row title="Apna branch chuno" hint="One tap → filtered courses" links={BRANCHES} />
      <Row title="Kya chahiye?" hint="Pick a goal, start today" links={GOALS} />
    </Reveal>
  </section>
);

export default BranchGoalBand;
