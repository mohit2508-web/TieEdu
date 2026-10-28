import React from 'react';
import Link from 'next/link';
import { Building, Cpu, GraduationCap, Plane, Wrench } from 'lucide-react';
import { LandingHead, LandingSection } from './LandingHead';

/**
 * E8 · "Built for" (UI_REDESIGN_PLAN_V3 §9): five white cards with an edge, a
 * two-colour line icon, a title and one line. Each opens the matching place.
 */
const AUDIENCES = [
  { title: 'Service companies', caption: 'TCS, Infosys, Wipro and the mass drives', href: '/companies', icon: Building },
  { title: 'Product companies', caption: 'Coding rounds and system design', href: '/companies', icon: Cpu },
  { title: 'Off-campus drives', caption: 'Openings and deadlines in the feed', href: '/drops', icon: Plane },
  { title: 'Core engineering', caption: 'Courses for ECE, EE, ME and civil', href: '/courses', icon: Wrench },
  { title: 'Colleges and TPOs', caption: 'A dashboard for your batch', href: '/colleges', icon: GraduationCap },
];

export const AudienceGrid: React.FC = () => (
  <LandingSection labelledBy="audience-title">
    <LandingHead id="audience-title" eyebrow="Built for" title="Whatever your placement looks like" />
    <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5" role="list">
      {AUDIENCES.map((a) => {
        const Icon = a.icon;
        return (
          <li key={a.title}>
            <Link
              href={a.href}
              className="focus-ring flex h-full flex-col items-center rounded-card border border-line bg-card px-4 py-7 text-center shadow-edge-neutral transition-colors hover:bg-surface-hover"
            >
              <span className="relative mb-4 inline-flex h-12 w-12 items-center justify-center" aria-hidden>
                <span className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-signal-soft" />
                <Icon className="relative h-8 w-8 text-secondary" strokeWidth={1.6} />
              </span>
              <span className="font-display text-h3 text-heading">{a.title}</span>
              <span className="mt-1 text-sm text-muted">{a.caption}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  </LandingSection>
);

export default AudienceGrid;
