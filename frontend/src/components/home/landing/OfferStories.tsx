import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { fetchOfferWallApi, type OfferStoryPublic } from '@/lib/api';
import { initials } from '@/components/ui';
import { LandingSection } from './LandingHead';

/**
 * E12 · "Students who got placed" (UI_REDESIGN_PLAN_V3 §9): approved stories
 * from the Offer Wall, as a row of cards, with a count card beside them. The
 * whole section renders nothing until there is a real, approved story.
 */
export const OfferStories: React.FC<{ total?: number }> = ({ total }) => {
  const [items, setItems] = useState<OfferStoryPublic[]>([]);

  useEffect(() => {
    let active = true;
    fetchOfferWallApi(8).then((list) => {
      if (active) setItems(list);
    });
    return () => {
      active = false;
    };
  }, []);

  if (items.length === 0) return null;
  const count = total && total > 0 ? total : items.length;

  return (
    <LandingSection labelledBy="stories-title">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-3">Offer wall</p>
          <h2 id="stories-title" className="font-display text-section text-heading">
            Students who got placed
          </h2>
        </div>
        <div className="rounded-card border border-line bg-card px-5 py-4 shadow-edge-neutral">
          <p className="font-display text-display text-heading">{count}</p>
          <p className="text-sm text-muted">{count === 1 ? 'offer story' : 'offer stories'} so far</p>
        </div>
      </div>

      <ul className="rail-track mt-10" role="list">
        {items.map((o) => (
          <li key={o.id} className="flex w-[280px] flex-none">
            <Link
              href={`/offers?company=${encodeURIComponent(o.company_slug)}`}
              className="focus-ring flex aspect-[4/5] w-full flex-col rounded-card border border-line bg-card p-5 shadow-edge-neutral transition-colors hover:bg-surface-hover"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-highlight font-display text-label font-extrabold text-heading" aria-hidden>
                  {initials(o.name || o.company)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-label text-heading">{o.name || 'A TieEdu student'}</span>
                  <span className="block truncate text-caption text-muted">{o.college || o.company}</span>
                </span>
              </span>
              <span className="mt-4 flex items-center gap-1.5 font-display text-h3 text-heading">
                {o.company}
                {o.verified ? <BadgeCheck className="h-4 w-4 text-success" aria-label="Verified offer" /> : null}
              </span>
              <span className="text-sm text-muted">
                {o.role}
                {o.ctc_lpa ? ` · ${o.ctc_lpa} LPA` : ''}
              </span>
              <span className="mt-3 line-clamp-5 flex-1 text-body-md text-body">{o.story}</span>
              <span className="mt-3 inline-flex items-center gap-1 font-display text-label text-link">
                Read the story <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </LandingSection>
  );
};

export default OfferStories;
