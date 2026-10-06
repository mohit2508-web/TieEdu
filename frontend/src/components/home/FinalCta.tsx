import React from 'react';
import Link from 'next/link';
import { ArrowRight, Newspaper, PlayCircle } from 'lucide-react';
import { PWAInstallButton } from '@/components/common/PWAInstallButton';
import { Reveal } from '@/components/home/Reveal';

/*
 * The page ended on pricing tables — the last thing a hesitant visitor read
 * was a wall of rupees. This closes on the free entry points instead: the
 * free pack, the feed, the free course, and (when the browser offers it) the
 * home-screen install.
 */
export const FinalCta: React.FC = () => (
  <section className="pb-6 pt-2 bg-white border-t border-[#E9E7E1]">
    <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 pt-12">
      <Reveal className="hero-mesh rounded-3xl border border-[#E9E7E1] px-5 py-10 sm:px-10 sm:py-12 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto space-y-5">
          <span className="eyebrow">Start free</span>
          <h2 className="display-2">
            Your first vault costs <span className="gradient-sky">nothing</span>
          </h2>
          <p className="text-[15px] sm:text-base text-[#3E4754] leading-relaxed">
            Every vault opens with a free 7-section pack — readable without an account. Read it,
            then decide.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              href="/interview-course"
              className="btn btn-primary w-full sm:w-auto min-h-[48px] justify-center px-6 py-3.5 text-[15px] focus-ring"
            >
              <PlayCircle className="w-4 h-4" /> Start the free course
            </Link>
            <Link
              href="/drops"
              className="btn btn-ghost w-full sm:w-auto min-h-[48px] justify-center px-6 py-3.5 text-[15px] focus-ring"
            >
              <Newspaper className="w-4 h-4" /> Open the career feed
            </Link>
          </div>
          <div className="flex justify-center pt-1">
            <PWAInstallButton className="min-h-[44px] px-4 py-2.5 text-[13px]" />
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

export default FinalCta;
