/** Where two outputs first differ (after the same normalising the judge does), for the diff view. */
export function firstDiff(actual: string, expected: string): { line: number; col: number; got: string; want: string } | null {
  const a = actual.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd());
  const e = expected.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd());
  while (a.length && !a[a.length - 1]) a.pop();
  while (e.length && !e[e.length - 1]) e.pop();
  for (let i = 0; i < Math.max(a.length, e.length); i++) {
    const x = a[i] ?? '', y = e[i] ?? '';
    if (x === y) continue;
    let c = 0;
    while (c < x.length && c < y.length && x[c] === y[c]) c++;
    return { line: i + 1, col: c + 1, got: i >= a.length ? '(missing line)' : x.slice(c, c + 12) || '(line ends)', want: i >= e.length ? '(no more lines)' : y.slice(c, c + 12) || '(line ends)' };
  }
  return null;
}
