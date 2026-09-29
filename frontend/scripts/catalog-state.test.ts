/**
 * Catalogue URL-state tests.
 *
 * The query string is user input. Someone will hand-edit it, paste it from a
 * search result, or point an old bookmark at it, and none of those may produce
 * a crash, a NaN page, or a filter that silently selects the wrong courses.
 */
import {
  activeFilterLabels,
  catalogQueryFor,
  countActiveFilters,
  parseCatalogQuery,
  toggleFilterValue,
  PAGE_SIZE,
} from '../src/lib/catalogState';
import { EMPTY_CATALOG_FILTERS, type CatalogFacets, type CatalogFilters } from '../src/types';

let pass = 0;
let fail = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
  } catch (err: any) {
    fail += 1;
    console.error(`FAIL  ${name}\n      ${err?.message}`);
  }
}
function eq(actual: unknown, expected: unknown, note = '') {
  if (actual !== expected) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${note ? ` — ${note}` : ''}`);
  }
}
function deep(actual: unknown, expected: unknown, note = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`expected ${b}, got ${a}${note ? ` — ${note}` : ''}`);
}

const filters = (over: Partial<CatalogFilters> = {}): CatalogFilters => ({ ...EMPTY_CATALOG_FILTERS, ...over });

/**
 * Turn a query string into the shape Next hands to a page: repeated keys become
 * an array. `Object.fromEntries` would keep only the last of each, which would
 * quietly turn a two-tag selection into a one-tag one and make these round-trip
 * assertions pass for the wrong reason.
 */
const queryObject = (qs: string): Record<string, string | string[]> => {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of new URLSearchParams(qs.replace(/^\?/, ''))) {
    if (out[key] === undefined) out[key] = value;
    else if (Array.isArray(out[key])) out[key].push(value);
    else out[key] = [out[key], value];
  }
  return out;
};

// --- parsing ----------------------------------------------------------------

check('an empty query is the default filter set', () => {
  deep(parseCatalogQuery({}), { q: '', category: [], tag: [], type: [], level: [], sort: 'popular', page: 1 });
});

check('repeated params accumulate into a list', () => {
  const parsed = parseCatalogQuery({ tag: ['c', 'arrays'], category: ['Computer Science'] });
  deep(parsed.tag, ['c', 'arrays']);
  deep(parsed.category, ['Computer Science']);
});

check('comma-joined values are split, because people hand-edit URLs', () => {
  deep(parseCatalogQuery({ tag: 'c, arrays' }).tag, ['c', 'arrays']);
  deep(parseCatalogQuery({ tag: ['c,arrays', 'c'] }).tag, ['c', 'arrays'], 'deduplicated');
});

check('blank and whitespace-only values are dropped', () => {
  deep(parseCatalogQuery({ tag: ' , ,arrays, ' }).tag, ['arrays']);
});

check('a comma in a URL is a separator, and a repeated param is not', () => {
  // The client always emits repeated params, and those round-trip losslessly.
  // A hand-written comma list is split for leniency, which is deliberately
  // ambiguous: a facet value containing a comma cannot survive the comma form.
  // That is the server's contract too, so the two agree rather than diverging.
  const emitted = catalogQueryFor(filters({ tag: ['c', 'arrays'] }));
  deep(parseCatalogQuery(queryObject(emitted)).tag, ['c', 'arrays']);
  deep(parseCatalogQuery({ tag: 'c, arrays' }).tag, ['c', 'arrays']);
});

check('level and type are lowercased so the server key matches', () => {
  const parsed = parseCatalogQuery({ level: 'Beginner', type: 'FREE' });
  deep(parsed.level, ['beginner']);
  deep(parsed.type, ['free']);
});

check('an unknown sort falls back to popular', () => {
  eq(parseCatalogQuery({ sort: 'trending' }).sort, 'popular');
  eq(parseCatalogQuery({ sort: 'AZ' }).sort, 'az');
});

check('page parsing rejects junk, zero, negatives and absurd values', () => {
  eq(parseCatalogQuery({ page: '3' }).page, 3);
  eq(parseCatalogQuery({ page: 'abc' }).page, 1);
  eq(parseCatalogQuery({ page: 'NaN' }).page, 1);
  eq(parseCatalogQuery({ page: '-2' }).page, 1);
  eq(parseCatalogQuery({ page: '0' }).page, 1);
  eq(parseCatalogQuery({ page: '2.7' }).page, 2);
  eq(parseCatalogQuery({ page: '99999' }).page, 500);
});

check('an over-long search term is truncated rather than rejected', () => {
  const parsed = parseCatalogQuery({ q: 'x'.repeat(500) });
  eq(parsed.q.length, 120);
});

check('a non-string q is ignored instead of becoming "[object Object]"', () => {
  eq(parseCatalogQuery({ q: ['a', 'b'] }).q, '');
});

// --- serialising ------------------------------------------------------------

check('the default filter set serialises to an empty string', () => {
  eq(catalogQueryFor(EMPTY_CATALOG_FILTERS), '');
});

check('multi-values repeat the key rather than joining with commas', () => {
  const qs = catalogQueryFor(filters({ tag: ['c', 'arrays'] }));
  if (!qs.includes('tag=c&tag=arrays')) throw new Error(`expected repeated keys, got ${qs}`);
});

check('page and sort are omitted at their defaults', () => {
  eq(catalogQueryFor(EMPTY_CATALOG_FILTERS, 1), '');
  eq(catalogQueryFor(filters({ sort: 'az' })).includes('sort=az'), true);
  eq(catalogQueryFor(EMPTY_CATALOG_FILTERS, 2).includes('page=2'), true);
});

check('a whitespace-only search term is not sent', () => {
  eq(catalogQueryFor(filters({ q: '   ' })), '');
});

check('parse and serialise are inverses for a realistic query', () => {
  const original = filters({ q: 'c programming', category: ['Computer Science'], tag: ['c', 'basics'], type: ['free'], level: ['beginner'], sort: 'rating' });
  const parsed = parseCatalogQuery(queryObject(catalogQueryFor(original)));
  deep({ ...parsed, page: 1 }, { ...original, page: 1 });
});

check('every value is percent-encoded', () => {
  const qs = catalogQueryFor(filters({ q: 'C & C++ basics' }));
  if (qs.includes(' ')) throw new Error('space was not encoded');
  if (!qs.includes('%26')) throw new Error('ampersand was not encoded');
  eq(parseCatalogQuery({ q: 'C & C++ basics' }).q, 'C & C++ basics');
});

// --- toggling ---------------------------------------------------------------

check('toggling adds then removes a value, leaving the other groups alone', () => {
  const base = filters({ category: ['Computer Science'], tag: ['c'] });
  const added = toggleFilterValue(base, 'tag', 'arrays');
  deep(added.tag, ['c', 'arrays']);
  deep(added.category, ['Computer Science']);
  deep(toggleFilterValue(added, 'tag', 'c').tag, ['arrays']);
});

check('toggling never mutates the input object', () => {
  const base = filters({ tag: ['c'] });
  const snapshot = JSON.stringify(base);
  toggleFilterValue(base, 'tag', 'arrays');
  eq(JSON.stringify(base), snapshot);
});

// --- counting and labelling -------------------------------------------------

check('active filters are counted across all four groups', () => {
  eq(countActiveFilters(filters()), 0);
  eq(countActiveFilters(filters({ category: ['a'], tag: ['b', 'c'], type: ['free'] })), 4);
  eq(countActiveFilters(filters({ q: 'search', sort: 'az' })), 0, 'search and sort are not filters');
});

const FACETS: CatalogFacets = {
  level: [
    { key: 'beginner', label: 'Beginner', count: 2 },
    { key: 'intermediate', label: 'Intermediate', count: 1 },
  ],
  type: [{ key: 'free', label: 'Free', count: 3 }],
  category: [{ key: 'computer science', label: 'Computer Science', count: 3 }],
  tag: [{ key: 'c', label: 'C', count: 1 }],
};

check('pills use the server label, not the raw key', () => {
  // Pills come out in group order (category, tag, type, level) so the row of
  // pills always matches the order of the groups in the rail above it.
  const pills = activeFilterLabels(filters({ category: ['computer science'], level: ['beginner'] }), FACETS);
  deep(pills.map((p) => p.label), ['Computer Science', 'Beginner']);
});

check('a level pill is humanised even when the facet is missing it', () => {
  const pills = activeFilterLabels(filters({ level: ['intermediate'] }), { ...FACETS, level: [] });
  deep(pills.map((p) => p.label), ['Intermediate']);
});

check('a value we no longer offer still gets a readable pill', () => {
  const pills = activeFilterLabels(filters({ tag: ['retired-topic'] }), FACETS);
  eq(pills.length, 1);
  eq(pills[0].label, 'retired-topic');
});

check('pills carry the group so removing one does not touch another', () => {
  const pills = activeFilterLabels(filters({ tag: ['c', 'arrays'] }), FACETS);
  deep(pills.map((p) => [p.key, p.value]), [['tag', 'c'], ['tag', 'arrays']]);
});

check('the page size is the 20 the infinite scroll was specified for', () => {
  eq(PAGE_SIZE, 20);
});

console.log(`\ncatalogState: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
