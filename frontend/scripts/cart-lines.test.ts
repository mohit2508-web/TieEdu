/**
 * Cart line rules.
 *
 * The cart went from three per-page `useState` arrays to one shared, persisted
 * cart, and the merge rules had to move with it. These are the rules that decide
 * whether a student is billed for something once or twice, so they are pinned
 * here rather than trusted to whichever page happened to call `addMany`.
 *
 * Every case below is a bug that existed in the app, not a hypothetical:
 * `lineKey` keyed on company id alone, so adding a second round to a vault
 * silently replaced the first; the "a pack covers this round" cleanup only ran
 * for additions made on a company page; and `'slug' in item` was used to mean
 * "a company is in the cart", which also matched a free course.
 *
 * Imports the real `src/lib/cartLines` module (the runner rewrites the `@/*`
 * alias after compiling), so the rules under test are the rules that ship.
 */
import {
  cartLineModuleIds,
  dropCoveredSingles,
  isCompanyCartLine,
  isStorableItem,
  mergeCartItems,
} from '../src/lib/cartLines';
import type { CartItem, CompanyModuleItem, CourseCartItem, PricingPlan } from '../src/types';

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
function ok(value: unknown, note: string) {
  if (!value) throw new Error(note);
}

// --- fixtures ---------------------------------------------------------------

const pack = (id: string, moduleIds: string[]): CompanyModuleItem => ({
  kind: 'company',
  id,
  slug: id.toLowerCase(),
  name: id,
  logo_url: '',
  module_ids: moduleIds,
  module_count: moduleIds.length,
  price: 499,
});

const round = (id: string, moduleId: string): CompanyModuleItem => ({
  kind: 'company',
  id,
  slug: id.toLowerCase(),
  name: id,
  logo_url: '',
  module_id: moduleId,
  module_title: 'OA',
  module_count: 1,
  price: 249,
});

const course = (id: string): CourseCartItem => ({
  kind: 'course',
  id,
  slug: id,
  name: id,
  price: 999,
});

const plan = (scope: string): PricingPlan => ({ scope, name: scope, price: 499 } as unknown as PricingPlan);

const ids = (items: CartItem[]) => items.map((i) => cartLineModuleIds(i).join('+') || String((i as any).id));

// --- cartLineModuleIds ------------------------------------------------------

check('a pack reports every module it covers', () => {
  deep(cartLineModuleIds(pack('r', ['m1', 'm2', 'm3'])), ['m1', 'm2', 'm3']);
});

check('a single round reports its one module', () => {
  deep(cartLineModuleIds(round('r', 'm2')), ['m2']);
});

check('a bare Company reports its premium modules', () => {
  const bare = { id: 'r', slug: 'r', name: 'R', premium_module_ids: ['m1', 'm4'] } as unknown as CartItem;
  deep(cartLineModuleIds(bare), ['m1', 'm4']);
});

check('a course line covers no content modules', () => {
  deep(cartLineModuleIds(course('c1')), []);
});

check('a plan line covers no content modules', () => {
  deep(cartLineModuleIds(plan('student')), []);
});

// --- isCompanyCartLine ------------------------------------------------------

check('both company shapes are recognised as company lines', () => {
  ok(isCompanyCartLine(pack('r', ['m1'])), 'pack should be a company line');
  ok(isCompanyCartLine({ id: 'r', slug: 'r', name: 'R' } as unknown as CartItem), 'bare Company should be a company line');
});

check('a course line is not a company line even though it has a slug', () => {
  // The bug: `/compare` keyed "in cart" on `'slug' in item`, so a free course
  // from /interview-course lit up a company's pill.
  ok(!isCompanyCartLine(course('free-interview-course')), 'course must not count as a company');
});

check('a plan line is not a company line', () => {
  ok(!isCompanyCartLine(plan('student')), 'plan must not count as a company');
});

// --- lineKey / mergeCartItems: distinctness ---------------------------------

check('two different rounds of one company are two separate lines', () => {
  // The bug: keying on company id alone made the second add replace the first.
  const merged = mergeCartItems([round('r', 'm1')], [round('r', 'm2')]);
  eq(merged.length, 2, 'round 1 and round 2 must coexist');
  deep(ids(merged), ['m1', 'm2']);
});

check('re-adding the same round refreshes rather than duplicates', () => {
  const first = round('r', 'm1');
  const repriced = { ...round('r', 'm1'), price: 299 };
  const merged = mergeCartItems([first], [repriced]);
  eq(merged.length, 1, 'identical line must not duplicate');
  eq((merged[0] as CompanyModuleItem).price, 299, 'the newer price must win');
});

check('the same round number for two companies does not collide', () => {
  const merged = mergeCartItems([round('razorpay', 'oa-1')], [round('zerodha', 'oa-1')]);
  eq(merged.length, 2, 'round 1 of Razorpay and round 1 of Zerodha are different products');
});

check('a pack covering a different module set is a different line', () => {
  const merged = mergeCartItems([pack('r', ['m1', 'm2'])], [pack('r', ['m3', 'm4'])]);
  eq(merged.length, 2, 'two packs of the same company are distinct lines');
});

check('module order does not make a pack look new', () => {
  const merged = mergeCartItems([pack('r', ['m1', 'm2'])], [pack('r', ['m2', 'm1'])]);
  eq(merged.length, 1, 'module_ids are a set, not a sequence');
});

check('a course and a company with the same id stay separate', () => {
  const merged = mergeCartItems([round('x', 'm1')], [course('x')]);
  eq(merged.length, 2, 'different kinds must not share a line');
});

// --- pack supersedes single rounds ------------------------------------------

check('adding a pack drops a single round it already covers', () => {
  // The bug: this cleanup only ran for adds made on a company page, so a pack
  // from /compare plus a round from a vault billed the round twice.
  const merged = mergeCartItems([round('r', 'm1')], [pack('r', ['m1', 'm2'])]);
  eq(merged.length, 1, 'the covered single must be dropped');
  deep(ids(merged), ['m1+m2']);
});

check('adding the single after the pack also drops the single', () => {
  const merged = mergeCartItems([pack('r', ['m1', 'm2'])], [round('r', 'm2')]);
  eq(merged.length, 1, 'order of addition must not matter');
  deep(ids(merged), ['m1+m2']);
});

check('a pack does not swallow another company round with the same module id', () => {
  const merged = mergeCartItems([pack('r', ['m1', 'm2'])], [round('z', 'm1')]);
  eq(merged.length, 2, 'module ids are only unique within a company');
});

check('a pack does not swallow rounds it does not cover', () => {
  const merged = mergeCartItems([round('r', 'm3')], [pack('r', ['m1', 'm2'])]);
  eq(merged.length, 2, 'm3 is not in the pack');
});

check('singles survive when no pack is present at all', () => {
  const merged = mergeCartItems([round('r', 'm1')], [round('r', 'm2')]);
  eq(merged.length, 2);
});

check('a course line is never dropped by a company pack', () => {
  const merged = mergeCartItems([course('c1')], [pack('r', ['m1'])]);
  eq(merged.length, 2, 'courses are priced separately and must survive');
});

// --- dropCoveredSingles directly --------------------------------------------

check('dropCoveredSingles leaves a pack-free cart untouched', () => {
  const lines = [round('r', 'm1'), round('r', 'm2')];
  deep(ids(dropCoveredSingles(lines)), ['m1', 'm2']);
});

check('dropCoveredSingles does not treat a bare Company as a pack', () => {
  // A bare Company has premium_module_ids, not module_ids, so it is not a pack
  // line and must not trigger the supersede pass over unrelated singles.
  const bare = { id: 'r', slug: 'r', name: 'R', premium_module_ids: ['m1'] } as unknown as CartItem;
  const lines = [bare, round('r', 'm1')];
  eq(dropCoveredSingles(lines).length, 2, 'only module_ids makes a line a pack');
});

check('a multi-company cart keeps every uncovered line', () => {
  const merged = mergeCartItems(
    [pack('r', ['m1', 'm2']), round('r', 'm3'), round('z', 'm1')],
    [round('r', 'm2')]
  );
  deep(ids(merged), ['m1+m2', 'm3', 'm1'], 'r/m2 dropped as covered, r/m3 and z/m1 kept');
});

// --- malformed input --------------------------------------------------------

check('a garbage line from localStorage is rejected, not merged', () => {
  ok(!isStorableItem(null), 'null');
  ok(!isStorableItem('nope'), 'string');
  ok(!isStorableItem({ price: 10 }), 'no id or scope');
  ok(isStorableItem({ id: 'r' }), 'id is enough');
  ok(isStorableItem({ scope: 'student' }), 'scope is enough');
});

check('merging ignores non-storable entries instead of throwing', () => {
  const merged = mergeCartItems([], [{ price: 1 } as unknown as CartItem, round('r', 'm1')]);
  eq(merged.length, 1, 'the bad line is skipped, the good one lands');
});

console.log(`\ncart-lines: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
