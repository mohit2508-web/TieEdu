'use client';

import React from 'react';
import { Bookmark, LayoutGrid } from 'lucide-react';
import { DROP_TYPE_META, DROP_TYPES } from '@/lib/dropsApi';
import { cn } from '@/lib/cn';

/** `''` is everything, `'saved'` is the bookmarked list, anything else is a type. */
export type DropsFilter = '' | 'saved' | (typeof DROP_TYPES)[number];

export interface DropsFilterBarProps {
  value: DropsFilter;
  onChange: (next: DropsFilter) => void;
  /** `bar` scrolls horizontally under the header; `rail` is the desktop column. */
  variant?: 'bar' | 'rail';
  className?: string;
}

/**
 * The type filter.
 *
 * Every chip is a literal from `DROP_TYPE_META` — the same table the server
 * validates against — so a new drop type appears here the moment the backend
 * allows it, and a chip can never name a type the API would 400 on.
 */
export const DropsFilterBar: React.FC<DropsFilterBarProps> = ({
  value,
  onChange,
  variant = 'bar',
  className,
}) => {
  const chip = (next: DropsFilter, label: string, dot?: string, Icon?: typeof LayoutGrid) => (
    <button
      key={next || 'all'}
      type="button"
      className="drops-filter-chip"
      aria-pressed={value === next}
      onClick={() => onChange(next)}
    >
      {dot ? <span className="drops-filter-dot" style={{ background: dot }} aria-hidden /> : Icon ? (
        <Icon size={14} strokeWidth={2.4} aria-hidden />
      ) : null}
      {label}
    </button>
  );

  return (
    <div
      className={cn(
        variant === 'bar' ? 'drops-filters drops-filters--bar' : 'drops-filters drops-filters--rail',
        className
      )}
      role="group"
      aria-label="Filter drops"
    >
      {chip('', 'All', undefined, LayoutGrid)}
      {chip('saved', 'Saved', undefined, Bookmark)}
      {DROP_TYPES.map((type) => chip(type, DROP_TYPE_META[type].label, DROP_TYPE_META[type].chip))}
    </div>
  );
};

export default DropsFilterBar;
