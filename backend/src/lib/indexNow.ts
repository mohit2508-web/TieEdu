/**
 * IndexNow (SEO_GROWTH_PLAN S3): tell Bing, Yandex, Naver, Seznam (and any
 * engine that shares IndexNow) the moment a public page is published or
 * changed, instead of waiting for the next crawl.
 *
 * The key is public by design — the same value is served at
 * https://tieedu.in/<key>.txt (frontend/public), which proves we own the site.
 * Sends only in production, never from tests or a developer machine.
 */
const KEY = 'e58c76a2ee4a021abf550dccc96664a4';
const HOST = 'tieedu.in';

export function pingIndexNow(paths: string[]): void {
  if (process.env.NODE_ENV !== 'production' || process.env.INDEXNOW_DISABLED === '1') return;
  const urlList = [...new Set(paths.filter((p) => typeof p === 'string' && p.startsWith('/')))]
    .slice(0, 100)
    .map((p) => `https://${HOST}${p}`);
  if (!urlList.length) return;
  void fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
  }).catch(() => undefined); // best effort: a ping never affects the publish
}
