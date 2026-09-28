/**
 * End-to-end check of the landing-hero poster HTTP surface against a scratch
 * database. Runs the real router, the real requireAdmin middleware and the real
 * multer upload, so both route-wiring bugs and the schedule/ordering rules the
 * homepage depends on get caught.
 */
import { SCRATCH_DB, TEST_JWT_SECRET, removeScratchDb } from './test-env';
import express from 'express';
import fs from 'fs';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { postersRouter } from '../src/routes/posters.routes';
import { loadDb, saveDb } from '../src/data/db';

let pass = 0;
let fail = 0;
const eq = (name: string, a: any, b: any) => {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa === sb) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${sb}\n  actual:   ${sa}`);
  }
};

// 1x1 transparent PNG — the smallest thing multer and the browser both accept.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const UPLOAD_DIR = path.join(__dirname, '../src/routes/../../uploads/posters');

const seedUser = (id: string, role: string) => {
  const db = loadDb();
  db.users.push({ id, name: id, email: `${id}@test.local`, role, xp: 0, disabled: false } as any);
  saveDb(db);
};

const main = async () => {
  seedUser('u-admin', 'admin');
  seedUser('u-student', 'student');

  const app = express();
  app.use(express.json());
  app.use('/api/posters', postersRouter);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const uploaded: string[] = [];

  const token = (sub: string) => jwt.sign({ sub, role: sub }, TEST_JWT_SECRET);
  const call = async (method: string, url: string, body?: any, as?: string) => {
    const res = await fetch(`${base}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(as ? { Authorization: `Bearer ${token(as)}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, json: await res.json().catch(() => null) as any };
  };

  const upload = async (as?: string, name = 'banner.png', bytes: Buffer = PNG, type = 'image/png') => {
    const form = new FormData();
    form.append('file', new Blob([bytes], { type }), name);
    const res = await fetch(`${base}/api/posters/admin/upload`, {
      method: 'POST',
      headers: as ? { Authorization: `Bearer ${token(as)}` } : {},
      body: form,
    });
    const json = await res.json().catch(() => null) as any;
    if (json?.stored_name) uploaded.push(json.stored_name);
    return { status: res.status, json };
  };

  // ---- empty store ----
  eq('fresh install has no public posters', (await call('GET', '/api/posters')).json, []);

  // ---- auth on every admin action ----
  eq('anonymous list is 401', (await call('GET', '/api/posters/admin')).status, 401);
  eq('student list is 403', (await call('GET', '/api/posters/admin', undefined, 'u-student')).status, 403);
  eq('anonymous create is 401', (await call('POST', '/api/posters/admin', { title: 'x' })).status, 401);
  eq('student create is 403', (await call('POST', '/api/posters/admin', { title: 'x' }, 'u-student')).status, 403);
  eq('anonymous upload is 401', (await upload()).status, 401);
  eq('student upload is 403', (await upload('u-student')).status, 403);

  // ---- upload validation ----
  const rejected = await upload('u-admin', 'notes.pdf', Buffer.from('not an image'), 'application/pdf');
  eq('non-image upload is 400', rejected.status, 400);
  const img = await upload('u-admin');
  eq('image upload is 201', img.status, 201);
  eq('stored name is server-generated', /^poster-\d+-[a-z0-9]{4,10}\.png$/.test(img.json.stored_name), true);
  eq('uploaded file landed on disk', fs.existsSync(path.join(UPLOAD_DIR, img.json.stored_name)), true);

  // ---- create validation ----
  eq('create without an image is 400', (await call('POST', '/api/posters/admin', { title: 'No art' }, 'u-admin')).status, 400);
  eq('create with a fake stored name is 400',
    (await call('POST', '/api/posters/admin', { title: 'Fake', image_stored_name: 'poster-1-deadbeef.png' }, 'u-admin')).status, 400);

  const created = await call('POST', '/api/posters/admin', {
    image_stored_name: img.json.stored_name,
    image_file_name: img.json.file_name,
    badge: 'NEW',
    title: 'Google Drive 2026',
    subtitle: 'Round-by-round vault',
    cta_label: 'Open Vault',
    href: '/company/google',
    alt_text: 'Google drive vault offer',
  }, 'u-admin');
  eq('create is 201', created.status, 201);
  eq('new poster defaults to active', created.json.poster.is_active, true);
  eq('new poster is live', created.json.poster.is_live, true);
  eq('new poster is not featured', created.json.poster.is_featured, false);

  const first = created.json.poster.id;

  // ---- the public feed carries the creative ----
  const pub = await call('GET', '/api/posters');
  eq('public feed has one poster', pub.json.length, 1);
  eq('public feed exposes the image url', pub.json[0].image_url, `/api/posters/file/${img.json.stored_name}`);
  eq('public feed exposes the copy', pub.json[0].title, 'Google Drive 2026');
  eq('public feed does not leak internals', Object.keys(pub.json[0]).includes('is_active'), false);

  // ---- serving the creative ----
  const fileRes = await fetch(`${base}${pub.json[0].image_url}`);
  eq('file is served', fileRes.status, 200);
  eq('file has an image content type', (fileRes.headers.get('content-type') || '').startsWith('image/'), true);
  eq('traversal name is rejected', (await fetch(`${base}/api/posters/file/..%2F..%2Fdb.json`)).status, 404);
  eq('foreign file is rejected', (await fetch(`${base}/api/posters/file/pdf-1-abcd.pdf`)).status, 404);

  // ---- schedule windows ----
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();
  const img2 = await upload('u-admin', 'two.png');
  const scheduled = await call('POST', '/api/posters/admin', {
    image_stored_name: img2.json.stored_name, title: 'Scheduled', start_at: future,
  }, 'u-admin');
  eq('future-start poster is saved but not live', scheduled.json.poster.is_live, false);
  eq('future-start poster is hidden from the feed', (await call('GET', '/api/posters')).json.length, 1);

  const img3 = await upload('u-admin', 'three.png');
  const expired = await call('POST', '/api/posters/admin', {
    image_stored_name: img3.json.stored_name, title: 'Expired', end_at: past,
  }, 'u-admin');
  eq('past-end poster is not live', expired.json.poster.is_live, false);
  eq('expired poster is hidden from the feed', (await call('GET', '/api/posters')).json.length, 1);

  // A typo'd date must not silently retire the whole homepage: an unparseable
  // bound is ignored rather than treated as "ended".
  const img4 = await upload('u-admin', 'four.png');
  const typo = await call('POST', '/api/posters/admin', {
    image_stored_name: img4.json.stored_name, title: 'Typo date', end_at: 'next tuesday',
  }, 'u-admin');
  eq('unparseable end date is stored as null', typo.json.poster.end_at, null);
  eq('unparseable end date does not hide the poster', typo.json.poster.is_live, true);

  // ---- paused posters disappear ----
  eq('pause is accepted', (await call('PUT', `/api/posters/admin/${first}`, { is_active: false }, 'u-admin')).json.poster.is_live, false);
  eq('paused poster leaves the feed', (await call('GET', '/api/posters')).json.length, 1);
  await call('PUT', `/api/posters/admin/${first}`, { is_active: true }, 'u-admin');
  eq('reactivated poster returns to the feed', (await call('GET', '/api/posters')).json.length, 2);

  // ---- ordering ----
  const ordered = await call('GET', '/api/posters');
  eq('feed is ordered by sort_order', ordered.json.map((p: any) => p.title), ['Google Drive 2026', 'Typo date']);
  await call('PUT', `/api/posters/admin/${first}`, { sort_order: 99 }, 'u-admin');
  eq('raising sort_order moves it to the back',
    (await call('GET', '/api/posters')).json.map((p: any) => p.title), ['Typo date', 'Google Drive 2026']);
  await call('PUT', `/api/posters/admin/${first}`, { sort_order: 0 }, 'u-admin');

  // ---- featured collapses the rotation ----
  const typoId = typo.json.poster.id;
  eq('featuring is accepted', (await call('PUT', `/api/posters/admin/${typoId}`, { is_featured: true }, 'u-admin')).json.poster.is_featured, true);
  const featuredFeed = await call('GET', '/api/posters');
  eq('featured poster becomes the only slide', featuredFeed.json.map((p: any) => p.title), ['Typo date']);
  eq('featuring one poster clears the flag on the others',
    (await call('GET', '/api/posters/admin', undefined, 'u-admin')).json.filter((p: any) => p.is_featured).length, 1);
  await call('PUT', `/api/posters/admin/${typoId}`, { is_featured: false }, 'u-admin');
  eq('unfeaturing restores the full rotation', (await call('GET', '/api/posters')).json.length, 2);

  // ---- image swap: an image still used by another poster must survive ----
  const shared = await upload('u-admin', 'shared.png');
  const a = (await call('POST', '/api/posters/admin', { image_stored_name: shared.json.stored_name, title: 'A' }, 'u-admin')).json.poster;
  const b = (await call('POST', '/api/posters/admin', { image_stored_name: shared.json.stored_name, title: 'B' }, 'u-admin')).json.poster;
  const swap = await upload('u-admin', 'replacement.png');
  await call('PUT', `/api/posters/admin/${a.id}`, { image_stored_name: swap.json.stored_name, image_file_name: swap.json.file_name }, 'u-admin');
  eq('swapped poster points at the new image', fs.existsSync(path.join(UPLOAD_DIR, swap.json.stored_name)), true);
  eq('a still-referenced image is not deleted', fs.existsSync(path.join(UPLOAD_DIR, shared.json.stored_name)), true);

  // ---- admin list reports the server's liveness verdict ----
  const adminList = (await call('GET', '/api/posters/admin', undefined, 'u-admin')).json;
  eq('admin list returns every poster', adminList.length, 6);
  eq('admin list includes paused and scheduled posters', adminList.filter((p: any) => !p.is_live).length, 2);
  eq('admin list exposes the image url', adminList.every((p: any) => p.image_url.startsWith('/api/posters/file/')), true);

  // ---- delete removes the record and the file ----
  const bImage = path.join(UPLOAD_DIR, shared.json.stored_name);
  eq('delete is accepted', (await call('DELETE', `/api/posters/admin/${b.id}`, undefined, 'u-admin')).status, 200);
  eq('deleted poster is gone from the store', (await call('GET', '/api/posters/admin', undefined, 'u-admin')).json.length, 5);
  eq('deleting the last reference removes the file', fs.existsSync(bImage), false);
  eq('deleting a missing poster is 404', (await call('DELETE', `/api/posters/admin/${b.id}`, undefined, 'u-admin')).status, 404);

  // ---- a stored name that never landed on disk is a 404, not a 500 ----
  const ghost = await call('POST', '/api/posters/admin', { image_stored_name: img.json.stored_name, title: 'Ghost' }, 'u-admin');
  eq('create is 201', ghost.status, 201);
  fs.rmSync(path.join(UPLOAD_DIR, img.json.stored_name), { force: true });
  eq('missing file on disk is 404', (await fetch(`${base}${ghost.json.poster.image_url}`)).status, 404);

  server.close();
  removeScratchDb();
  // The uploads directory is shared with the real install, so only the exact
  // files this run wrote are swept — never the directory itself.
  for (const f of uploaded) fs.rmSync(path.join(UPLOAD_DIR, f), { force: true });

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
