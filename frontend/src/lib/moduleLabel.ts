import type { ContentModule } from '@/types';

/**
 * Display strings for a vault round — the reader's own copy, kept out of the
 * component so it can be tested.
 *
 * A lib module rather than a `.tsx` export on purpose: the test runner compiles
 * the suites without the DOM lib, so importing the component drags in `Sheet`
 * and the whole browser global surface. The same reason `readerState` reaches
 * for `globalThis` rather than `window`. This is the only text the round list
 * needs, and it is the part worth pinning down.
 */

/**
 * How much is in a round, in the words the round itself uses.
 *
 * The plan asks each row for an item count, and it is the only thing that lets a
 * student choose a round on size before opening it. The noun follows the module
 * type: a round of `technical_question` holds questions, a prep guide holds
 * items, and "14 items" on a question round reads as a mistake to the student.
 *
 * Returns `null` rather than "0 items" when there is nothing to count. A locked
 * round is commonly counted server-side only *after* the unlock, so a missing
 * `items` array usually means "not told" rather than "empty" — and printing
 * "0 items" would tell a student the round they are deciding to buy is worthless.
 */
export function describeItemCount(mod: ContentModule): string | null {
  const n = Array.isArray(mod.items) ? mod.items.length : 0;
  if (n === 0) return null;
  const isQuestions =
    mod.module_type === 'system_design' || mod.module_type.endsWith('_question');
  const noun = isQuestions ? 'question' : 'item';
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

/** Whether this round is behind the paywall, and so is not somewhere to tap. */
export function isRoundLocked(mod: ContentModule, unlocked: boolean): boolean {
  return mod.is_premium === true && !unlocked;
}
