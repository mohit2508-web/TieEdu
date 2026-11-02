/**
 * Company-vs-company pages (SEO_GROWTH_PLAN §5.2) — "Infosys SE vs TCS NQT".
 *
 * Built only from both companies' fact-checked records. A row where either
 * side has no data says "Not published yet" instead of guessing, and the
 * verdict states facts (higher CTC, fewer rounds) rather than opinions.
 * One URL per pair, in alphabetical slug order; the reverse order redirects.
 */
const plain = (s: unknown) => String(s ?? '').trim();
const NA = 'Not published yet';

const shortName = (c: any) => {
  const n = plain(c.name).replace(/\s*—\s*/g, ' ');
  const m = n.match(/^(\S+).*\(([A-Z]{2,6})\)\s*$/);
  if (m) return `${m[1]} ${m[2]}`;
  return n.split(' / ')[0];
};

const rounds = (c: any): any[] => (Array.isArray(c.rounds_pipeline) ? c.rounds_pipeline : []);
const ctcText = (c: any) => {
  const roles: Array<{ title: string; ctc: string }> = Array.isArray(c.profile?.roles) ? c.profile.roles : [];
  if (roles.length) return roles.map((r) => `${r.title}: ${r.ctc}`).join(' · ');
  if (c.ctc_min) return `₹${c.ctc_min}${c.ctc_max && c.ctc_max !== c.ctc_min ? `–${c.ctc_max}` : ''} LPA`;
  return NA;
};
const firstTest = (c: any) => rounds(c).find((r) => r.test_type === 'mcq');
const testText = (c: any) => {
  const t = firstTest(c);
  if (!t) return NA;
  const parts = [t.question_count ? `${t.question_count} questions` : '', t.duration_minutes ? `${t.duration_minutes} min` : ''].filter(Boolean);
  return `${t.title}${parts.length ? ` (${parts.join(', ')})` : ''}${t.elimination ? ' — eliminatory' : ''}`;
};
const hasCoding = (c: any) => rounds(c).some((r) => r.test_type === 'coding');

/** Companies that can be compared: published, with at least salary or rounds. */
export const comparable = (c: any) => c && c.status === 'published' && (c.ctc_min || rounds(c).length);

export function pairSlug(a: string, b: string): string {
  return [a, b].sort().join('-vs-');
}

export function allPairs(companies: any[]): string[] {
  const list = companies.filter(comparable).map((c) => c.slug).sort();
  const out: string[] = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) out.push(`${list[i]}-vs-${list[j]}`);
  return out;
}

/** Split "a-vs-b" into two slugs that exist; null if not a valid pair. */
export function parsePair(pair: string, companies: any[]): { a: any; b: any; canonical: string } | null {
  const bySlug = new Map(companies.filter(comparable).map((c) => [c.slug, c]));
  // Slugs can contain "-vs-"? Not today; still, try every split point.
  const parts = pair.split('-vs-');
  for (let k = 1; k < parts.length; k++) {
    const left = parts.slice(0, k).join('-vs-');
    const right = parts.slice(k).join('-vs-');
    const a = bySlug.get(left);
    const b = bySlug.get(right);
    if (a && b && a.slug !== b.slug) return { a, b, canonical: pairSlug(a.slug, b.slug) };
  }
  return null;
}

export function buildComparison(x: any, y: any) {
  // Canonical order (alphabetical) so content never differs by URL order.
  const [a, b] = [x, y].sort((p, q) => String(p.slug).localeCompare(String(q.slug)));
  const A = shortName(a);
  const B = shortName(b);
  const yr = new Date().getUTCFullYear() + 1;
  const ea = a.profile?.eligibility || {};
  const eb = b.profile?.eligibility || {};
  const ra = rounds(a);
  const rb = rounds(b);

  const row = (label: string, va: string, vb: string) => [label, va || NA, vb || NA];
  const table = {
    head: ['', A, B],
    rows: [
      row('Fresher CTC', ctcText(a), ctcText(b)),
      row('Number of rounds', ra.length ? String(ra.length) : '', rb.length ? String(rb.length) : ''),
      row('Rounds', ra.map((r) => r.title).join(' → '), rb.map((r) => r.title).join(' → ')),
      row('Online test', testText(a), testText(b)),
      row('Coding round', ra.length ? (hasCoding(a) ? 'Yes' : 'No') : '', rb.length ? (hasCoding(b) ? 'Yes' : 'No') : ''),
      row('Academic cutoff', plain(ea.cutoff), plain(eb.cutoff)),
      row('Backlogs', plain(ea.backlogs), plain(eb.backlogs)),
      row('Education gap', plain(ea.gap), plain(eb.gap)),
      row('Eligible degrees', plain(ea.degrees), plain(eb.degrees)),
      row('Bond', plain(a.profile?.bond), plain(b.profile?.bond)),
      row('Training', plain(a.profile?.training), plain(b.profile?.training)),
      row('When they hire', plain(a.profile?.hiring_window), plain(b.profile?.hiring_window)),
    ],
  };

  // Verdict: facts only.
  const facts: string[] = [];
  const maxA = Number(a.ctc_max || a.ctc_min || 0);
  const maxB = Number(b.ctc_max || b.ctc_min || 0);
  const minA = Number(a.ctc_min || 0);
  const minB = Number(b.ctc_min || 0);
  if (maxA && maxB && maxA !== maxB) facts.push(`${maxA > maxB ? A : B} has the higher top fresher package (up to ₹${Math.max(maxA, maxB)} LPA vs ₹${Math.min(maxA, maxB)} LPA).`);
  if (minA && minB && minA !== minB) facts.push(`${minA > minB ? A : B} starts higher at the entry role (₹${Math.max(minA, minB)} LPA vs ₹${Math.min(minA, minB)} LPA).`);
  if (ra.length && rb.length && ra.length !== rb.length) facts.push(`${ra.length < rb.length ? A : B} has fewer rounds (${Math.min(ra.length, rb.length)} vs ${Math.max(ra.length, rb.length)}).`);
  if (ra.length && rb.length && hasCoding(a) !== hasCoding(b)) facts.push(`${hasCoding(a) ? A : B} includes a coding round; ${hasCoding(a) ? B : A} does not.`);
  if (!facts.length) facts.push(`${A} and ${B} are close on the published numbers — compare the rounds below and pick the one whose test suits you.`);

  const title = `${A} vs ${B} ${yr}: Salary, Rounds, Eligibility Compared`;
  return {
    pair: pairSlug(a.slug, b.slug),
    a: { slug: a.slug, name: a.name, short: A, logo_url: a.logo_url || '' },
    b: { slug: b.slug, name: b.name, short: B, logo_url: b.logo_url || '' },
    title,
    h1: `${A} vs ${B}`,
    description: `${A} vs ${B} for freshers: CTC, number of rounds, online test, coding round, cutoff, backlogs, bond and training — side by side from fact-checked data.`,
    intro: `Placement season, two offers to prepare for: here is ${A} against ${B} on everything that decides it — pay, rounds, the online test and the eligibility rules.`,
    verdict: facts,
    table,
    updated: [a.fact_checked_at, b.fact_checked_at].filter(Boolean).sort().slice(-1)[0] || null,
    faq: [
      ...(maxA && maxB ? [{ q: `Which pays more, ${A} or ${B}?`, a: maxA === maxB ? `Both go up to about ₹${maxA} LPA for freshers.` : `${maxA > maxB ? A : B}: up to ₹${Math.max(maxA, maxB)} LPA, against ₹${Math.min(maxA, maxB)} LPA.` }] : []),
      ...(ra.length && rb.length ? [{ q: `Which has fewer rounds, ${A} or ${B}?`, a: ra.length === rb.length ? `Both have ${ra.length} rounds.` : `${ra.length < rb.length ? A : B}, with ${Math.min(ra.length, rb.length)} rounds against ${Math.max(ra.length, rb.length)}.` }] : []),
      ...(ea.cutoff && eb.cutoff ? [{ q: `What is the eligibility for ${A} and ${B}?`, a: `${A}: ${ea.cutoff}. ${B}: ${eb.cutoff}.` }] : []),
    ],
  };
}
