// ============================================================================
// CATALOGUE URL STATE
//
// The filter state lives in the query string, not in component state. That is
// what makes a filtered catalogue shareable and bookmarkable, and it is what
// lets getServerSideProps render the right result set for a crawler or a link
// someone pasted into a chat.
//
// Parsing is deliberately total: a hand-edited URL can carry anything, and a
// malformed filter must degrade to "no filter" rather than throw during render.
// ============================================================================

import type { CatalogFilters, CatalogSortKey, FacetOption } from '@/types';
import { EMPTY_CATALOG_FILTERS } from '@/types';
import { formatLevel } from './courseFormat';

export const CATALOG_MULTI_KEYS = ['category', 'tag', 'type', 'level'] as const;
export type CatalogMultiKey = (typeof CATALOG_MULTI_KEYS)[number];

export const CATALOG_SORT_KEYS: CatalogSortKey[] = ['popular', 'newest', 'rating', 'az', 'za'];

export const PAGE_SIZE = 20;

type QueryLike = Record<string, string | string[] | undefined>;

/** Comma-joined values are accepted too — people edit URLs by hand. */
const toList = (raw: string | string[] | undefined): string[] => {
  if (raw === undefined) return [];
  const parts = (Array.isArray(raw) ? raw : [raw])
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
};

const toSort = (raw: string | string[] | undefined): CatalogSortKey => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const normalised = String(value || '').trim().toLowerCase() as CatalogSortKey;
  return CATALOG_SORT_KEYS.includes(normalised) ? normalised : EMPTY_CATALOG_FILTERS.sort;
};

const toPage = (raw: string | string[] | undefined): number => {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  // A nonsense page is page 1, never page NaN — the observer would then request
  // "?page=NaN" forever.
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(Math.floor(value), 500);
};

export const parseCatalogQuery = (query: QueryLike): CatalogFilters & { page: number } => ({
  q: typeof query.q === 'string' ? query.q.slice(0, 120) : '',
  category: toList(query.category),
  tag: toList(query.tag),
  type: toList(query.type).map((v) => v.toLowerCase()),
  level: toList(query.level).map((v) => v.toLowerCase()),
  sort: toSort(query.sort),
  page: toPage(query.page),
});

/**
 * Build the query string for a filter set. Repeats a key per value rather than
 * joining with commas, so a tag that legitimately contains a comma cannot split
 * into two filters.
 */
export const catalogQueryFor = (filters: CatalogFilters, page = 1): string => {
  const qs = new URLSearchParams();
  if (filters.q.trim()) qs.set('q', filters.q.trim());
  for (const key of CATALOG_MULTI_KEYS) {
    for (const value of filters[key]) qs.append(key, value);
  }
  if (filters.sort !== EMPTY_CATALOG_FILTERS.sort) qs.set('sort', filters.sort);
  if (page > 1) qs.set('page', String(page));
  const str = qs.toString();
  return str ? `?${str}` : '';
};

/** Toggle one value inside one group, leaving every other group untouched. */
export const toggleFilterValue = (
  filters: CatalogFilters,
  key: CatalogMultiKey,
  value: string
): CatalogFilters => {
  const current = filters[key];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return { ...filters, [key]: next };
};

export const countActiveFilters = (filters: CatalogFilters): number =>
  CATALOG_MULTI_KEYS.reduce((total, key) => total + filters[key].length, 0);

/** Human labels for the active-filter pills, resolved against the real facets. */
export const activeFilterLabels = (
  filters: CatalogFilters,
  facets: { level: FacetOption[]; type: FacetOption[]; category: FacetOption[]; tag: FacetOption[] }
): { key: CatalogMultiKey; value: string; label: string }[] => {
  const out: { key: CatalogMultiKey; value: string; label: string }[] = [];
  for (const key of CATALOG_MULTI_KEYS) {
    for (const value of filters[key]) {
      const option = facets[key]?.find((o) => o.key === value);
      out.push({
        key,
        value,
        // A value we no longer offer still needs a readable pill, and the raw
        // key is more honest than dropping the selection without a trace.
        label: option?.label || (key === 'level' ? formatLevel(value) : value),
      });
    }
  }
  return out;
};
