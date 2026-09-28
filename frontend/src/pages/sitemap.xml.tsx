import { GetServerSideProps } from 'next';
import { fetchCompanies } from '@/lib/api';
import { fetchCourseCatalog } from '@/lib/coursesApi';

export default function Sitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = 'https://tieedu.com';
  const today = new Date().toISOString().split('T')[0];

  let companies: { slug: string }[] = [];
  try {
    companies = await fetchCompanies();
  } catch {
    companies = [];
  }

  let courses: { slug: string }[] = [];
  try {
    // Public endpoint, no auth — the catalogue is the same list a visitor sees
    // before signing in, so this never needs a token.
    const data = await fetchCourseCatalog();
    courses = (data?.courses || []).map((c) => ({ slug: c.slug }));
  } catch {
    courses = [];
  }

  const companyUrls = companies.map(
    (c) => `
  <url>
    <loc>${baseUrl}/company/${c.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`
  ).join('');

  // Course detail pages are indexable: a free course's syllabus and description
  // are the same content a logged-out visitor can already read. Progress,
  // certificates and the lesson bodies are not, and are not linked here.
  const courseUrls = courses.map(
    (c) => `
  <url>
    <loc>${baseUrl}/courses/${c.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  ).join('');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/compare</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/study-plan</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/courses</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  ${courseUrls}
  ${companyUrls}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemapXml);
  res.end();

  return {
    props: {}
  };
};
