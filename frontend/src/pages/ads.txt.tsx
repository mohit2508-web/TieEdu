import type { GetServerSideProps } from 'next';

/**
 * /ads.txt — declares Google as an authorised seller of this site's ad space.
 * AdSense asks for it before serving. Built from NEXT_PUBLIC_ADSENSE_CLIENT so
 * the publisher id lives in one place; absent → 404, which is correct for a
 * site that sells no ads.
 */
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const client = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '').trim();
  const pub = client.replace(/^ca-/, '');
  if (!/^pub-\d{10,20}$/.test(pub)) return { notFound: true };
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  // f08c47fec0942fa0 is Google's fixed certification authority id.
  res.write(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`);
  res.end();
  return { props: {} };
};

export default function AdsTxt() {
  return null;
}
