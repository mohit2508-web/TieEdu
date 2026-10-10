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
  { icon: LibraryBig, label: 'Courses', href: '/courses', tint: 'text-[#0271B5] bg-[#E8F4FB]' },
  { icon: BrainCircuit, label: 'Skill Tests', href: '/skill-test', tint: 'text-[#7C3AED] bg-[#F1EBFE]' },
  { icon: ClipboardList, label: 'Mock Drives', href: '/mock-drive', tint: 'text-[#0271B5] bg-[#E8F4FB]' },
  { icon: GraduationCap, label: 'Free Course', href: '/interview-course', tint: 'text-[#B45309] bg-[#FBF1E1]' },
  { icon: Building2, label: 'Vaults', href: '#companies', tint: 'text-[#0E2A44] bg-[#E8EEF4]' },
  { icon: Zap, label: 'Drops', href: '/drops', tint: 'text-[#A63D28] bg-[#FDEDE9]' },
  { icon: CalendarCheck, label: 'Study Plan', href: '/study-plan', tint: 'text-[#0271B5] bg-[#E9F6EE]' },
  { icon: IndianRupee, label: 'Pricing', href: '#pricing', tint: 'text-[#92400E] bg-[#F7F6F3]' },
];

export const QuickActions: React.FC = () => (
  <section className="bg-white border-b border-[#E9E7E1]">
    <Reveal className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 py-4 sm:py-5">
      <nav aria-label="Quick links" className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-3 transition-colors hover:bg-[#F7F6F3] focus-ring"
          >
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${a.tint}`}
            >
              <a.icon className="w-5 h-5" aria-hidden />
            </span>
            <span className="text-center text-[12px] font-bold leading-tight text-[#3E4754]">
              {a.label}
            </span>
          </Link>
        ))}
      </nav>
    </Reveal>
  </section>
);

export default QuickActions;
