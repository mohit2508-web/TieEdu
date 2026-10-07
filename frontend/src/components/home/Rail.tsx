import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Reveal } from '@/components/home/Reveal';

/**
 * One horizontal snap rail — the spine of the homepage.
 *
 * Native CSS scroll (`snap-x snap-mandatory`) carries touch momentum, trackpad
 * swipes and rubber-banding for free; nothing here is a JS carousel. The
 * partially visible next card on a phone *is* the "there is more" affordance,
 * so no arrows are rendered below `lg` — where, unlike a phone, a mouse user
 * gets no touch affordance and would miss hidden content (NN/g: desktop users
 * do not expect horizontal scroll). Those arrows live in the header row rather
 * than floating over the track so they can never cover a card.
 */
export const Rail: React.FC<{
  id?: string;
  eyebrow?: string;
  title: string;
  /** Right-hand meta, e.g. "42 vaults". Plain text, not a link. */
  meta?: string;
  /** Filter chips etc. — rendered between the header row and the track. */
  controls?: React.ReactNode;
  seeAllHref?: string;
  seeAllLabel?: string;
  /** Rendered while the section's own fetch is in flight (cards only). */
  loading?: boolean;
  skeletonCount?: number;
  skeletonWidth?: string;
  skeletonHeight?: string;
  tone?: 'app' | 'white';
  children?: React.ReactNode;
}> = ({
  id,
  eyebrow,
  title,
  meta,
  controls,
  seeAllHref,
  seeAllLabel = 'See all',
  loading = false,
  skeletonCount = 3,
  skeletonWidth = 'w-[82vw] max-w-[320px] sm:w-[300px] lg:w-[320px]',
  skeletonHeight = 'h-[276px]',
  tone = 'app',
  children,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const syncEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(max <= 2 || el.scrollLeft >= max - 2);
  }, []);

  useEffect(() => {
    syncEdges();
    const el = trackRef.current;
    if (!el) return;
    const onResize = () => syncEdges();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncEdges, children]);

  const nudge = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
  };

  const arrowCls =
    'hidden lg:inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E9E7E1] bg-white text-[#3E4754] shadow-soft transition-all hover:text-[#0271B5] hover:border-[#0284C7]/40 disabled:opacity-0 disabled:pointer-events-none focus-ring';

  return (
    <section
      id={id}
      className={`py-10 sm:py-12 ${tone === 'white' ? 'bg-white border-b border-[#E9E7E1]' : ''}`}
    >
      <Reveal className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div className="min-w-0">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-serif-heading text-2xl sm:text-3xl font-extrabold text-[#10151C] leading-tight">
                {title}
              </h2>
              {meta && (
                <span className="text-[12px] font-bold text-[#15803D] bg-[#E9F6EE] border border-[#CDE9D4] px-2.5 py-1 rounded-full whitespace-nowrap">
                  {meta}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex gap-2">
              <button
                type="button"
                aria-label={`Scroll ${title} left`}
                onClick={() => nudge(-1)}
                disabled={atStart}
                className={arrowCls}
              >
                <ChevronLeft className="w-[18px] h-[18px]" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Scroll ${title} right`}
                onClick={() => nudge(1)}
                disabled={atEnd}
                className={arrowCls}
              >
                <ChevronRight className="w-[18px] h-[18px]" aria-hidden />
              </button>
            </div>
            {seeAllHref && (
              <Link
                href={seeAllHref}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-[14px] font-bold text-[#0271B5] hover:text-[#025a95] transition-colors focus-ring"
              >
                {seeAllLabel} <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>

        {controls}

        <div ref={trackRef} onScroll={syncEdges} className="rail-track">
          {loading
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className={`flex-none snap-start animate-pulse rounded-2xl bg-[#F0EFEC] ${skeletonWidth} ${skeletonHeight}`}
                />
              ))
            : children}
        </div>
      </Reveal>
    </section>
  );
};

export default Rail;
