'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Bookmark, LayoutGrid } from 'lucide-react';
import { DROP_TYPE_META, DROP_TYPES } from '@/lib/dropsApi';
import { cn } from '@/lib/cn';
import { haptic } from '@/components/common/Pressable';

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
 *
 * On the bar variant the active chip is scrolled into view when the filter
 * changes: with ~14 chips on a phone, "Jobs" is often off-screen until you
 * hunt for it, and a filter you cannot see is a filter you will not use.
 *
 * Chips use `.pressable` (not the `Pressable` component) because the auto-scroll
 * needs a real `ref` on each button, and `Pressable` does not forward refs.
 */
export const DropsFilterBar: React.FC<DropsFilterBarProps> = ({
  value,
  onChange,
  variant = 'bar',
  className,
}) => {
  const barRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  const setChipRef = useCallback(
    (key: string) => (el: HTMLButtonElement | null) => {
      chipRefs.current.set(key, el);
    },
    []
  );

  useEffect(() => {
    if (variant !== 'bar') return;
    const el = chipRefs.current.get(value) ?? chipRefs.current.get('all');
    if (!el || !barRef.current) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    try {
      el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    } catch {
      el.scrollIntoView(false);
    }
  }, [value, variant]);

  const chip = (next: DropsFilter, label: string, dot?: string, Icon?: typeof LayoutGrid) => (
    <button
      key={next || 'all'}
      ref={setChipRef(next || 'all')}
      type="button"
      className="drops-filter-chip pressable"
      aria-pressed={value === next}
      onPointerDown={() => haptic('light')}
      onClick={() => onChange(next)}
    >
      {dot ? (
        <span className="drops-filter-dot" style={{ background: dot }} aria-hidden />
      ) : Icon ? (
        <Icon size={14} strokeWidth={2.4} aria-hidden />
      ) : null}
      {label}
    </button>
  );

  return (
    <div
      ref={barRef}
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
