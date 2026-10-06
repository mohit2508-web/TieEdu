import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { HeroPoster } from '@/types';
import { apiAssetUrl } from '@/lib/api';

/*
 * The landing hero's big rotating creative — the slot a marketplace would fill
 * with its own banner ad. Everything on screen comes from the API, so the owner
 * controls which ad is live without a deploy.
 *
 * Interaction rules borrowed from those sites: it advances on its own, it stops
 * while you are reading it, arrows and dots jump directly, and touch swipes work.
 * Accessibility rules those sites often get wrong: the rotation is a labelled
 * region, it never auto-advances under prefers-reduced-motion, and it pauses
 * when the tab is in the background so a hidden tab is not burning the campaign.
 */

const ROTATE_MS = 5500;

const isExternal = (href: string) => /^https?:\/\//i.test(href);

interface HeroPosterCarouselProps {
  posters: HeroPoster[];
  /** Fires with the poster id whenever one becomes visible — impression signal. */
  onPosterView?: (posterId: string) => void;
}

export const HeroPosterCarousel: React.FC<HeroPosterCarouselProps> = ({ posters, onPosterView }) => {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = posters.length;

  // A shrinking list (admin paused a poster) must not strand the index past the
  // end, or the stage renders empty.
  useEffect(() => {
    if (index > count - 1) setIndex(Math.max(0, count - 1));
  }, [count, index]);

  useEffect(() => {
    if (count <= 1 || !onPosterView) return;
    const current = posters[index]?.id;
    if (current) onPosterView(current);
  }, [count, index, onPosterView, posters]);

  const goTo = useCallback((next: number) => {
    setIndex(((next % count) + count) % count);
  }, [count]);

  // Autoplay, restarted on every index change so a visitor who skips ahead always
  // gets a full dwell time on the poster they landed on.
  useEffect(() => {
    if (count <= 1 || isPaused) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => goTo(index + 1), ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [count, goTo, index, isPaused]);

  // Pause while the tab is hidden.
  useEffect(() => {
    const onVisibility = () => setIsPaused((p) => p || document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (count <= 1) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    const end = e.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined) return;
    const delta = end - start;
    // ~48px is a thumb-width of intent; anything less reads as a scroll.
    if (Math.abs(delta) < 48) return;
    goTo(delta < 0 ? index + 1 : index - 1);
  };

  /**
   * Only the current slide and its two neighbours are mounted. A campaign can
   * legally hold 24 posters, and eagerly decoding 24 full-bleed images on the
   * homepage is exactly what turns a fast LCP into a stall.
   */
  const visible = useMemo(() => {
    if (count === 0) return [] as { poster: HeroPoster; offset: number }[];
    const offsets = count === 1 ? [0] : [-1, 0, 1];
    return offsets.map((offset) => ({
      poster: posters[(((index + offset) % count) + count) % count],
      offset,
    }));
  }, [count, index, posters]);

  if (count === 0) return null;

  return (
    <div
      className="w-full select-none group/carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured offers"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
    >
      <div
        className="relative w-full aspect-[16/10] sm:aspect-[4/3] lg:aspect-[4/5] rounded-[var(--radius-lg)] overflow-hidden bg-[#0E2A44] shadow-raised"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {visible.map(({ poster, offset }) => {
          const isActive = offset === 0;
          const href = poster.href || '';
          const label = poster.alt_text || poster.title || 'Offer';
          const slideCls = `absolute inset-0 transition-opacity duration-500 ease-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`;

          const creative = (
            <>
              {/*
               * This used to be a plain `<img>` justified as "next/image cannot
               * optimise it". That reason was true only while `images` was nested
               * inside `experimental` in next.config.mjs, where Next ignored it —
               * the config is fixed, so the reason is gone and so is the excuse.
               *
               * It is the largest unoptimised image in the product: a full-bleed
               * hero creative, above the fold, on the first page every visitor
               * loads. It is safe to optimise because the source is provably ours:
               * `POST /api/posters` accepts only `.jpg/.jpeg/.png/.webp/.avif`,
               * the stored filename is regex-anchored to those extensions, and the
               * serve route only ever emits raster Content-Types. So the optimizer
               * can never be handed an SVG it would reject.
               *
               * `priority` replaces the old `loading={isActive ? 'eager' :
               * 'lazy'}`: it does the same job and additionally emits a preload
               * hint for the visible slide, which is what actually moves LCP.
               */}
              <Image
                src={apiAssetUrl(poster.image_url)}
                alt={label}
                fill
                draggable={false}
                priority={isActive}
                // The slide is `absolute inset-0`, so the rendered width is the
                // viewport. Leaving `sizes` off would make the optimizer assume
                // 100vw *and* skip the srcset, so a desktop user would download
                // the phone-sized file at 3x.
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/5" />

              {poster.badge && (
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#E8A33D] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#10151C] shadow-soft">
                  {poster.badge}
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                {poster.title && (
                  <h2 className="text-white font-serif-heading text-xl sm:text-2xl font-extrabold leading-tight drop-shadow-sm text-balance">
                    {poster.title}
                  </h2>
                )}
                {poster.subtitle && (
                  <p className="mt-1.5 text-white/85 text-[13px] sm:text-sm leading-relaxed line-clamp-2">
                    {poster.subtitle}
                  </p>
                )}
                {poster.cta_label && (
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[13px] font-extrabold text-[#10151C] shadow-soft">
                    {poster.cta_label} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </>
          );

          if (!href) {
            return (
              <div key={poster.id} className={slideCls} aria-hidden={!isActive} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${count}`}>
                {creative}
              </div>
            );
          }

          if (isExternal(href)) {
            // An external campaign must not hijack the tab, and must not be
            // crawlable into the homepage either.
            return (
              <a
                key={poster.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className={slideCls}
                aria-hidden={!isActive}
                aria-label={label}
              >
                {creative}
              </a>
            );
          }

          return (
            <Link
              key={poster.id}
              href={href}
              className={slideCls}
              tabIndex={isActive ? 0 : -1}
              aria-hidden={!isActive}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}`}
            >
              {creative}
            </Link>
          );
        })}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="Previous offer"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 grid h-11 w-11 place-items-center rounded-full bg-white/85 text-[#10151C] shadow-soft backdrop-blur hover:bg-white focus-ring opacity-0 sm:opacity-100 transition-opacity group-hover/carousel:opacity-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="Next offer"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 grid h-11 w-11 place-items-center rounded-full bg-white/85 text-[#10151C] shadow-soft backdrop-blur hover:bg-white focus-ring opacity-0 sm:opacity-100 transition-opacity group-hover/carousel:opacity-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 backdrop-blur">
              {posters.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to offer ${i + 1}`}
                  aria-current={i === index}
                  className="grid h-8 w-8 -m-1 place-items-center rounded-full focus-ring"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'}`}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HeroPosterCarousel;
