import React from 'react';
import type { CatalogFacets, CatalogFilters } from '@/types';
import type { CatalogMultiKey } from '@/lib/catalogState';
import { formatLevel } from '@/lib/courseFormat';

/**
 * The catalogue filter rail.
 *
 * Multi-select checkboxes grouped into the four dimensions the data actually
 * has: category, topic, course type and level. There is no "domain" or
 * "duration" group, because there is no field behind either one — a filter that
 * cannot narrow anything is worse than no filter, because it teaches people that
 * the filters do not work.
 *
 * Values within a group are OR-ed and groups are AND-ed, which is the
 * convention every catalogue uses. The server does the narrowing; this
 * component only reports intent.
 */

/** Values shown inline before a "More" link appears. */
const INLINE_LIMIT = 4;

const GROUPS: { key: CatalogMultiKey; title: string; columns?: boolean }[] = [
  { key: 'type', title: 'Course type', columns: true },
  { key: 'level', title: 'Course level' },
  { key: 'category', title: 'Category' },
  { key: 'tag', title: 'Topic' },
];

const isLevelGroup = (key: CatalogMultiKey) => key === 'level';

/** A real checkbox, visually replaced. Using a real input keeps keyboard and
 *  screen-reader behaviour correct, which a styled `<div role=checkbox>` does not. */
const Checkbox: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
  count: number;
  id: string;
  disabled?: boolean;
}> = ({ checked, onChange, label, count, id, disabled }) => (
  <label
    htmlFor={id}
    className={[
      'group flex cursor-pointer items-center gap-2.5 py-1.5 text-sm',
      disabled ? 'cursor-not-allowed opacity-45' : '',
    ].join(' ')}
  >
    <input
      id={id}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className="peer sr-only"
    />
    <span
      aria-hidden="true"
      className={[
        'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors',
        checked
          ? 'border-[var(--brand-sky)] bg-[var(--brand-sky)]'
          : 'border-[var(--border-strong)] bg-[var(--bg-surface)] group-hover:border-[var(--brand-sky)]',
        'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--brand-sky)]',
      ].join(' ')}
    >
      {checked && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 6.2L4.8 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>

    {/* Selected values are bold and carry a count badge, so the current
        selection is legible at a glance without opening anything. */}
    <span className={checked ? 'font-bold text-[var(--ink)]' : 'text-[var(--text-body)]'}>
      {label}
    </span>
    <span className="ml-auto text-xs tabular-nums text-[var(--text-light)]">{count}</span>
  </label>
);

const FilterGroup: React.FC<{
  groupKey: CatalogMultiKey;
  title: string;
  columns?: boolean;
  options: CatalogFacets[keyof CatalogFacets];
  selected: string[];
  onToggle: (key: CatalogMultiKey, value: string) => void;
}> = ({ groupKey, title, columns, options, selected, onToggle }) => {
  // The topic list is the only one that can grow past the inline cap, so this
  // is the only group that needs the expanded state.
  const [expanded, setExpanded] = React.useState(false);
  const hidden = Math.max(0, options.length - INLINE_LIMIT);
  const visible = expanded ? options : options.slice(0, INLINE_LIMIT);

  if (options.length === 0) return null;

  return (
    <fieldset className="border-b border-[var(--border-subtle)] pb-6 last:border-b-0">
      <legend className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {title}
      </legend>

      <div className={columns ? 'grid grid-cols-1 gap-x-8 sm:grid-cols-2' : ''}>
        {visible.map((option) => {
          const checked = selected.includes(option.key);
          return (
            <Checkbox
              key={option.key}
              id={`filter-${groupKey}-${option.key}`}
              checked={checked}
              // A value with no courses cannot be selected, but it is still
              // shown with its real count rather than hidden — "Paid 0" is
              // information, and hiding it makes the rail look broken.
              disabled={option.count === 0 && !checked}
              onChange={() => onToggle(groupKey, option.key)}
              label={isLevelGroup(groupKey) ? formatLevel(option.key) : option.label}
              count={option.count}
            />
          );
        })}
      </div>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-2 text-xs font-bold text-[var(--brand-sky)] hover:underline"
        >
          {expanded ? 'Show less' : `Show ${hidden} more`}
        </button>
      )}
    </fieldset>
  );
};

export const CourseFilterRail: React.FC<{
  facets: CatalogFacets;
  filters: CatalogFilters;
  onToggle: (key: CatalogMultiKey, value: string) => void;
  onClear: () => void;
  /** Counted by the caller from the selected arrays. */
  activeCount: number;
}> = ({ facets, filters, onToggle, onClear, activeCount }) => (
  <div>
    {activeCount > 0 && (
      <button
        type="button"
        onClick={onClear}
        className="mb-5 text-sm font-bold text-[var(--brand-sky)] hover:underline"
      >
        Clear all filters ({activeCount})
      </button>
    )}

    {GROUPS.map((group) => (
      <FilterGroup
        key={group.key}
        groupKey={group.key}
        title={group.title}
        columns={group.columns}
        options={facets[group.key] || []}
        selected={filters[group.key] as string[]}
        onToggle={onToggle}
      />
    ))}
  </div>
);
