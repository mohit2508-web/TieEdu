'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';
import { DROP_TYPE_META, fetchDropFeedApi, type DropFeedItem } from '@/lib/dropsApi';

const STRIP_LIMIT = 6;

/**
 * Homepage teaser for the feed.
 *
 * Self-fetching and silent by design: if the feed is empty or the API is down
 * this renders nothing rather than an error panel — the homepage must not
 * break over a feature strip. Every card deep-links to `/drops/:id`, so a
 * visitor arrives at the shareable article (with its Open Graph tags), not at
 * a feed they must then swipe through.
 */
export const DropsStrip: React.FC = () => {
  const [drops, setDrops] = useState<DropFeedItem[]>([]);

  useEffect(() => {
    let active = true;
    fetchDropFeedApi({ limit: STRIP_LIMIT })
      .then((page) => {
        if (active) setDrops(page.items);
      })
      .catch(() => {
        /* the strip is optional — the feed page itself surfaces errors */
      });
    return () => {
      active = false;
    };
  }, []);

  if (drops.length === 0) return null;

  return (
    <section className="border-b border-[#E9E7E1] bg-[#FBFAF7] py-10">
      <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1.5">
            <span className="eyebrow inline-flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" aria-hidden /> Drops
            </span>
            <h2 className="font-serif-heading text-2xl sm:text-3xl font-extrabold text-[#10151C] leading-tight">
              Fresh off the career feed
            </h2>
            <p className="text-[14px] text-[--text-muted] max-w-xl">
              Hiring drives, deadlines, contests and tips — one swipe each.
            </p>
          </div>
          <Link href="/drops" className="btn btn-ghost px-4 py-2.5 text-sm">
            Open the feed <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-6 flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
          {drops.map((d) => {
            const meta = DROP_TYPE_META[d.type];
            return (
              <Link
                key={d.id}
                href={`/drops/${d.id}`}
                className="vault-card group flex w-[260px] flex-none flex-col gap-2.5 p-4 transition-colors hover:border-[#0284C7]"
              >
                <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#F1F3F5] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#3E4754]">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: meta.chip }}
                    aria-hidden
                  />
                  {meta.label}
                  {d.sponsored && <span className="text-[#AEB6BE]">· Ad</span>}
                </span>
                <h3 className="text-[15px] font-extrabold leading-snug text-[#10151C] drop-headline">
                  {d.headline}
                </h3>
                {d.bullets[0] && (
                  <p className="text-[13px] leading-relaxed text-[--text-muted] line-clamp-2">
                    {d.bullets[0]}
                  </p>
                )}
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[13px] font-bold text-[#0284C7]">
                  {d.cta_label}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DropsStrip;
