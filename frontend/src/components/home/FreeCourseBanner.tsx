import React from 'react';
import Link from 'next/link';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { Reveal } from '@/components/home/Reveal';

/*
 * The free course deserves a billboard: it is the one product a signed-out
 * visitor can start without an account or a payment, and the nav already
 * carries it as "Free Course". One card, one line of copy, one button — the
 * whole card is the link, so there is exactly one CTA, not a button fighting a
 * text link. The dark gradient deliberately breaks the page's mesh rhythm:
 * three identical hero-mesh cards in one scroll would read as a template.
 */
export const FreeCourseBanner: React.FC = () => (
  <section className="pt-2 pb-8">
    <Reveal className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12">
      <Link
        href="/interview-course"
        className="group flex flex-col gap-4 rounded-3xl border border-[#0B2439] bg-gradient-to-br from-[#0E2A44] via-[#0F3D63] to-[#0271B5] p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8 focus-ring relative overflow-hidden"
      >
        {/* faint vault grid, decorative */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-1/2 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'linear-gradient(to left, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to left, black, transparent)',
          }}
        />
        <div className="relative z-10 min-w-0 flex-1 space-y-2 text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#CFEFFF]">
            100% Free
          </span>
          <h2 className="font-serif-heading text-2xl sm:text-3xl font-extrabold leading-tight text-white">
            The Interview Masterclass
          </h2>
          <p className="text-[14px] text-white/80">
            50 modules · STAR answers · mock interviews — start free, no payment.
          </p>
        </div>
        <span className="relative z-10 inline-flex min-h-[48px] items-center justify-center gap-2 self-start rounded-2xl bg-white px-6 py-3 text-[15px] font-extrabold text-[#0E2A44] shadow-soft transition-transform group-hover:-translate-y-0.5 sm:self-auto">
          <PlayCircle className="w-4 h-4" /> Start free
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
    </Reveal>
  </section>
);

export default FreeCourseBanner;
