/**
 * "Did you mean …?" for the 404 page (PRACTICE_POLISH_PLAN.md §3.1): fixes a mistyped
 * path segment by segment against the site's known routes, e.g.
 * /practice/problm/tcs-a06 → /practice/problem/tcs-a06.
 */

/** Static path segments, by depth. A `*` level accepts any slug (ids are not checked). */
const ROUTES: string[] = [
  'practice', 'practice/dsa', 'practice/companies', 'practice/companies/*', 'practice/tests', 'practice/problem/*', 'practice/test/*',
  'companies', 'company/*', 'courses', 'courses/*', 'my-courses', 'my-certificates', 'skill-test', 'skill-test/*',
  'drives', 'drives/*', 'drops', 'daily', 'calendar', 'study-plan', 'study-groups', 'mock-interview', 'peer-mock', 'english-coach',
  'interview-course', 'internships', 'offers', 'offer-check', 'guarantee', 'compare', 'compare/*', 'colleges', 'college-leaderboard',
  'recruiters', 'talent', 'project-pulse', 'account', 'login', 'signup', 'forgot-password', 'contact', 'about', 'privacy', 'terms',
  'refund-policy', 'cookies', 'prep', 'tracks', 'campus', 'tpo', 'parent', 'verify',
];

export function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[m][n];
}

/** The closest known route for `path`, or null when nothing is close (or it already matches). */
export function suggestPath(path: string): string | null {
  const segs = path.split(/[?#]/)[0].split('/').filter(Boolean).map((s) => s.toLowerCase());
  if (!segs.length) return null;
  let best: { route: string; cost: number } | null = null;
  for (const r of ROUTES) {
    const rs = r.split('/');
    if (rs.length !== segs.length) continue;
    let cost = 0;
    for (let i = 0; i < rs.length && cost <= 3; i++) {
      if (rs[i] === '*') continue;
      const dist = editDistance(segs[i], rs[i]);
      // Allow about one typo per 4 letters, at most 2 per segment.
      if (dist > Math.min(2, Math.max(1, Math.floor(rs[i].length / 4)))) { cost = 99; break; }
      cost += dist;
    }
    if (cost > 0 && cost <= 3 && (!best || cost < best.cost)) best = { route: r, cost };
  }
  if (!best) return null;
  return '/' + best.route.split('/').map((s, i) => (s === '*' ? segs[i] : s)).join('/');
}
