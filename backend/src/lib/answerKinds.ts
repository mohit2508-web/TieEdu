import crypto from 'crypto';

/**
 * Non-MCQ test questions (Wipro iOS and any bank that uses them):
 *  - fill_blank: the student types the answer (the missing code, or the error and
 *    its fix). options = every accepted answer, never sent to the browser.
 *    Answer: selectedOptions = [typed text].
 *  - ordering: drag the items into order. options = the items in the right order;
 *    the browser gets them shuffled with their real index.
 *    Answer: selectedOptions = the real indices in the student's order.
 */

/** Case, spaces, quotes, backticks and a trailing ; don't matter. */
export const normAnswer = (s: string) =>
  String(s || '').toLowerCase().replace(/[`'"‘’“”]/g, '').replace(/;+\s*$/, '').replace(/\s+/g, '');

export const typedRight = (accepted: string[], typed: string) => {
  const t = normAnswer(typed);
  return !!t && accepted.some((a) => normAnswer(a) === t);
};

export const orderRight = (n: number, picked: string[]) =>
  picked.length === n && picked.every((v, i) => Number(v) === i);

/** The same shuffled order for an attempt every time it is opened; never already solved. */
export function shownOrder(seed: string, n: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  let h = crypto.createHash('md5').update(seed).digest();
  for (let i = n - 1; i > 0; i--) {
    if (i % 16 === 0) h = crypto.createHash('md5').update(h).digest();
    const j = h[i % 16] % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  if (n > 1 && idx.every((v, i) => v === i)) idx.push(idx.shift()!);
  return idx;
}
