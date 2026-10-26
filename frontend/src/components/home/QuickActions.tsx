import React from 'react';
import Link from 'next/link';
import { Reveal } from '@/components/home/Reveal';
import {
  BrainCircuit,
  Building2,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  IndianRupee,
  LibraryBig,
  Zap,
} from 'lucide-react';

/*
 * The product in one glance — the row a PW-style app opens with. Eight doors,
 * one word each, no sentences: a visitor who never scrolls still knows the
 * portal sells vaults, courses, tests and a free course, and can reach any of
 * them in one tap. Cells are 76px tall (thumb floor is 44) and the anchors are
 * real links, so `#companies` / `#pricing` keep the homepage's in-page jumps.
 */
const ACTIONS = [
  { icon: LibraryBig, label: 'Courses', href: '/courses', tint: 'text-signal bg-signal-soft' },
  { icon: BrainCircuit, label: 'Skill Tests', href: '/skill-test', tint: 'text-[#7C3AED] bg-[#F1EBFE]' },
  { icon: ClipboardList, label: 'Mock Drives', href: '/mock-drive', tint: 'text-signal bg-signal-soft' },
  { icon: GraduationCap, label: 'Free Course', href: '/interview-course', tint: 'text-amber-deep bg-warning-soft' },
  { icon: Building2, label: 'Companies', href: '/companies', tint: 'text-brand-ink bg-surface-hover' },
  { icon: Zap, label: 'Drops', href: '/drops', tint: 'text-danger bg-signal-soft' },
  { icon: CalendarCheck, label: 'Study Plan', href: '/study-plan', tint: 'text-signal bg-surface-hover' },
  { icon: IndianRupee, label: 'Pricing', href: '#pricing', tint: 'text-amber-deep bg-paper' },
];

export const QuickActions: React.FC = () => (
  <section className="bg-white border-b border-line">
    <Reveal className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 py-4 sm:py-5">
      <nav aria-label="Quick links" className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-3 transition-colors hover:bg-paper focus-ring"
          >
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${a.tint}`}
            >
              <a.icon className="w-5 h-5" aria-hidden />
            </span>
            <span className="text-center text-xs font-bold leading-tight text-body">
              {a.label}
            </span>
          </Link>
        ))}
      </nav>
    </Reveal>
  </section>
);

export default QuickActions;
