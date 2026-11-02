import { GetServerSideProps } from 'next';
import { serverApiBase } from '@/lib/companyPagesApi';

export default function Sitemap() {
  return null;
}

type Entry = { loc: string; lastmod?: string | null; changefreq?: string; priority: number };

const BASE = 'https://tieedu.in';

const day = (v: unknown): string | null => {
  if (typeof v !== 'string' || !v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
};

async function getJson(path: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(`${serverApiBase()}${path}`, { signal: ctrl.signal });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Every public, indexable page (SEO_GROWTH_PLAN §2.2). Private pages are not
 * listed (they also carry noindex — see lib/seo). `lastmod` is written only
 * where the data has a real date: a sitemap stamping "today" on every URL
 * teaches search engines to ignore its dates.
 */
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const today = new Date().toISOString().slice(0, 10);
  const entries: Entry[] = [];

  // Hubs and evergreen pages.
  const statics: Array<[string, number, string]> = [
    ['/', 1.0, 'daily'],
    ['/courses', 0.9, 'weekly'],
    ['/companies', 0.9, 'weekly'],
    ['/skill-test', 0.9, 'weekly'],
    ['/compare', 0.8, 'weekly'],
    ['/tracks', 0.8, 'weekly'],
    ['/interview-course', 0.8, 'monthly'],
    ['/mock-interview', 0.7, 'monthly'],
    ['/drops', 0.6, 'daily'],
    ['/verify', 0.5, 'monthly'],
    ['/guarantee', 0.5, 'monthly'],
    ['/colleges', 0.6, 'monthly'],
    ['/recruiters', 0.5, 'monthly'],
    ['/about', 0.6, 'monthly'],
    ['/contact', 0.6, 'monthly'],
    ['/privacy', 0.3, 'yearly'],
    ['/terms', 0.3, 'yearly'],
    ['/refund-policy', 0.3, 'yearly'],
    ['/cookies', 0.3, 'yearly'],
  ];
  for (const [path, priority, changefreq] of statics) {
    entries.push({ loc: `${BASE}${path === '/' ? '' : path}`, priority, changefreq, lastmod: path === '/' ? today : null });
  }

  // Companies — the most valuable pages.
  const companiesRaw = await getJson('/companies');
  const companies: any[] = Array.isArray(companiesRaw) ? companiesRaw : Array.isArray(companiesRaw?.companies) ? companiesRaw.companies : [];
  for (const c of companies) {
    if (!c?.slug) continue;
    entries.push({ loc: `${BASE}/company/${c.slug}`, priority: 0.9, changefreq: 'weekly', lastmod: day(c.fact_checked_at) });
  }

  // Company guide pages (exam pattern, syllabus, …) — only topics with data.
  const guides = await Promise.all(
    companies.filter((c) => c?.slug).map(async (c) => ({ c, g: await getJson(`/companies/${c.slug}/guide`) }))
  );
  for (const { c, g } of guides) {
    for (const t of Array.isArray(g?.topics) ? g.topics : []) {
      entries.push({ loc: `${BASE}/company/${c.slug}/${t}`, priority: 0.8, changefreq: 'monthly', lastmod: day(c.fact_checked_at) });
    }
  }

  // Courses (paged: the catalogue returns 20 per call).
  for (let page = 1; page <= 50; page++) {
    const data: any = await getJson(`/courses?page=${page}`);
    const batch: any[] = data?.courses || [];
    for (const c of batch) {
      if (c?.slug) entries.push({ loc: `${BASE}/courses/${c.slug}`, priority: 0.8, changefreq: 'weekly', lastmod: day(c.updated_at) });
    }
    if (!data?.has_more || batch.length === 0) break;
  }

  // Branch landing pages.
  for (const b of ['year1', 'cse', 'ai-ds', 'ece', 'eee', 'mech', 'civil', 'career', 'tools']) {
    entries.push({ loc: `${BASE}/courses/branch/${b}`, priority: 0.7, changefreq: 'weekly' });
  }

  // Skill tests — server-rendered landing pages. Company tests live inside the
  // company plan (they redirect), so they are not listed on their own.
  const skills = await getJson('/skill-test/skills');
  for (const s of Array.isArray(skills) ? skills : []) {
    if (!s?.slug || s.company_slug) continue;
    entries.push({ loc: `${BASE}/skill-test/${s.slug}`, priority: 0.7, changefreq: 'monthly', lastmod: day(s.updated_at) });
  }

  // Career tracks.
  const tracksRaw = await getJson('/tracks');
  const tracks: any[] = Array.isArray(tracksRaw) ? tracksRaw : Array.isArray(tracksRaw?.tracks) ? tracksRaw.tracks : [];
  for (const t of tracks) {
    if (t?.slug) entries.push({ loc: `${BASE}/tracks/${t.slug}`, priority: 0.7, changefreq: 'monthly', lastmod: day(t.updated_at) });
  }

  // De-duplicate, keep the first (highest-intent) entry for a URL.
  const seen = new Set<string>();
  const body = entries
    .filter((e) => (seen.has(e.loc) ? false : (seen.add(e.loc), true)))
    .map(
      (e) => `  <url>
    <loc>${e.loc}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}
    <changefreq>${e.changefreq || 'weekly'}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`);
  res.end();
  return { props: {} };
};
