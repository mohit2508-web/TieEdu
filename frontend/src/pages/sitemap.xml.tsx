import { GetServerSideProps } from 'next';
import { fetchCompanies } from '@/lib/api';

export default function Sitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = 'https://tieedu.com';

  let companies: { slug: string }[] = [];
  try {
    companies = await fetchCompanies();
  } catch {
    companies = [];
  }

  const companyUrls = companies.map(
    (c) => `
  <url>
    <loc>${baseUrl}/company/${c.slug}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`
  ).join('');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/compare</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/study-plan</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  ${companyUrls}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemapXml);
  res.end();

  return {
    props: {}
  };
};
