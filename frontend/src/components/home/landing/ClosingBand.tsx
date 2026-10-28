import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { TieEduLogo } from '@/components/common/TieEduLogo';

/**
 * E15 · the closing teal band (UI_REDESIGN_PLAN_V3 §9): inset from the page
 * edges, graph-paper texture, the logo — unchanged — on a cream plate where
 * Tarko has a mascot, the headline's second phrase in amber, and two actions.
 */
export const ClosingBand: React.FC = () => (
  <section className="px-4 pb-16 sm:px-6 sm:pb-24" aria-labelledby="closing-title">
    <div className="tk-inherit-p grid-paper-on-hero mx-auto max-w-[1200px] rounded-band bg-hero px-6 py-14 text-center text-hero-on ring-1 ring-inset ring-hero-edge sm:px-12 sm:py-20">
      <span className="logo-plate mx-auto inline-flex rounded-card px-4 py-3 shadow-pop">
        <TieEduLogo size="sm" />
      </span>
      <h2 id="closing-title" className="mx-auto mt-8 max-w-2xl font-display text-section">
        Your placement. <span className="text-signal">Round by round.</span>
      </h2>
      <p className="tk-inherit-p mx-auto mt-4 max-w-xl text-body-lg text-hero-muted">
        Pick a company and take its free readiness check in two minutes.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button href="/signup" size="lg" icon={ArrowRight} iconEnd>
          Start free
        </Button>
        <Link
          href="/companies"
          className="focus-ring inline-flex min-h-[52px] items-center justify-center rounded-cell border-[1.5px] border-hero-on/70 px-6 font-display text-label text-hero-on transition-colors hover:bg-hero-on/10"
        >
          See all companies
        </Link>
      </div>
    </div>
  </section>
);

export default ClosingBand;
