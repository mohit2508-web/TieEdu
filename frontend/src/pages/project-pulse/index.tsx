import React from 'react';
import Link from 'next/link';
import { GraduationCap, Presentation, ShieldCheck, GitCommitHorizontal, FlaskConical, Sparkles, Copy, ArrowRight, Lock } from 'lucide-react';
import { PulseShell } from '@/components/pulse/PulseUi';

/**
 * Project Pulse — landing (PROJECT_PULSE_PLAN.md §3.1). Linked only from the
 * footer during Phase 0. Explains what it checks and who can get in.
 */

const LAYERS = [
  { icon: GitCommitHorizontal, title: 'Activity', text: 'Commits since the task was assigned, the files the task asks for, last activity, a day-by-day timeline.' },
  { icon: FlaskConical, title: 'Autograder', text: 'Compiles with gcc -Wall -Werror and runs your test cases on GitHub Actions. Pass or fail, per test.' },
  { icon: Sparkles, title: 'Requirement review', text: 'Each requirement read against the code: done, partly, or missing, with the exact file and lines as proof.' },
  { icon: Copy, title: 'Integrity', text: 'Copied code (even with renamed variables), one bulk commit, backdated commits. Signals for the teacher, never auto-penalties.' },
];

const RoleCard: React.FC<{ href: string; icon: React.ComponentType<{ className?: string }>; title: string; who: string; points: string[]; cta: string }> = ({
  href, icon: Icon, title, who, points, cta,
}) => (
  <Link href={href} className="group flex flex-col rounded-band border border-line bg-card p-6 transition-shadow hover:shadow-pop focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)]">
    <span className="flex h-11 w-11 items-center justify-center rounded-tile bg-secondary-soft text-secondary"><Icon className="h-5 w-5" /></span>
    <h2 className="mt-4 font-display text-h2 text-heading">{title}</h2>
    <p className="mt-1 text-sm text-muted">{who}</p>
    <ul className="mt-4 flex-1 space-y-2 text-sm text-body">
      {points.map((p) => <li key={p} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" aria-hidden />{p}</li>)}
    </ul>
    <span className="mt-6 inline-flex items-center gap-1.5 font-display text-label text-link">
      {cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </span>
  </Link>
);

export default function ProjectPulseHome() {
  return (
    <PulseShell title="Know who really finished the task" role={null}>
      <p className="-mt-2 mb-8 max-w-2xl text-body-lg text-body">
        Students do the task in their own GitHub repo. Project Pulse reads every repo and shows the teacher, on one screen,
        who started, who finished, which requirement each student is stuck on, and every line of code behind it.
      </p>
      <div className="-mt-4 mb-8 flex flex-wrap gap-2">
        <Link href="/project-pulse/demo" className="inline-flex h-10 items-center rounded-cell bg-signal px-4 text-sm font-semibold text-on-primary shadow-edge-primary">See the demo</Link>
        <Link href="/project-pulse/join" className="inline-flex h-10 items-center rounded-cell border border-line bg-card px-4 text-sm font-semibold text-heading">Join a class with a code</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RoleCard
          href="/project-pulse/teacher"
          icon={Presentation}
          title="Teacher"
          who="Appointed by TiEEdu. Sees only the classes they own."
          points={[
            'Whole class at a glance: status donut, daily commits, the hardest requirement',
            'Student × requirement matrix and a sortable table',
            "Open any student: source code, changes, tests, timeline, integrity",
            'Override marks, leave feedback, export CSV',
          ]}
          cta="Open the teacher dashboard"
        />
        <RoleCard
          href="/project-pulse/student"
          icon={GraduationCap}
          title="Student"
          who="Invited by their teacher. Sees only their own work."
          points={[
            'Link your repo once',
            'See exactly which requirement is done, partly done or missing, and why',
            'Your test results and your teacher’s feedback',
            'Your own commit timeline. No one else’s data, no leaderboard',
          ]}
          cta="Open the student view"
        />
      </div>

      <h2 className="mt-12 font-display text-h2 text-heading">How “done” is checked</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LAYERS.map((l, i) => (
          <div key={l.title} className="rounded-card border border-line bg-card p-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted"><l.icon className="h-4 w-4" /> Layer {i + 1}</p>
            <h3 className="mt-2 font-display text-h3 text-heading">{l.title}</h3>
            <p className="mt-1.5 text-sm text-body">{l.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 rounded-band bg-hero p-6 text-hero-on sm:flex-row sm:items-center">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tile bg-hero-edge"><Lock className="h-5 w-5" /></span>
        <div className="flex-1">
          <p className="font-display text-h3">Invite-only, by design</p>
          <p className="mt-1 text-sm text-hero-muted">
            A TiEEdu account is not enough. Teachers are appointed by TiEEdu; students get in only through their teacher’s invite,
            with the same email. Every check runs on the server, and every teacher view of a student’s code is logged.
          </p>
        </div>
        <ShieldCheck className="hidden h-10 w-10 shrink-0 text-hero-muted sm:block" aria-hidden />
      </div>
    </PulseShell>
  );
}
