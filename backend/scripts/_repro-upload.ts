/**
 * Throwaway repro: does a real admin image upload reach the public feed, and
 * does the file route serve a tall portrait photo the way the card expects?
 */
import { SCRATCH_DB, TEST_JWT_SECRET, removeScratchDb } from './test-env';
import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { dropsRouter } from '../src/routes/drops.routes';
import { loadDb, saveDb } from '../src/data/db';
import { _resetStaffCache } from '../src/store/staff';

const W = 1080;
const H = 1920;

function portraitPng(): Buffer {
  const table = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
    return t;
  })();
  const crc32 = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = table[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  };
  const px = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const i = (y * W + x) * 3;
    px[i] = (x * 255 / W) | 0; px[i + 1] = (y * 255 / H) | 0; px[i + 2] = 200;
  }
  const stride = W * 3;
  const raw = Buffer.alloc(H * (stride + 1));
  for (let y = 0; y < H; y += 1) { raw[y * (stride + 1)] = 1; for (let i = 0; i < stride; i += 1) raw[y * (stride + 1) + 1 + i] = (px[y * stride + i] - (i >= 3 ? px[y * stride + i - 3] : 0)) & 0xff; }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 1 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const main = async () => {
  const db = loadDb();
  db.users.push({ id: 'u-repro', name: 'repro', email: 'repro@test.local', role: 'admin', xp: 0, disabled: false } as any);
  db.staff = db.staff || [];
  db.staff.push({ id: 'staff-repro', user_id: 'u-repro', role: 'super_admin', permissions: [], status: 'active', created_by: null, created_at: new Date().toISOString() } as any);
  saveDb(db);
  _resetStaffCache();
  console.log(`scratch db: ${SCRATCH_DB}`);

  const app = express();
  app.use(express.json());
  app.use('/api/drops', dropsRouter);
  const server: Server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const token = jwt.sign({ sub: 'u-repro', role: 'u-repro' }, TEST_JWT_SECRET);

  const png = portraitPng();
  console.log(`portrait source: ${W}x${H}, ${(png.length / 1024).toFixed(0)} KB`);

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'phone-photo.png');
  const up = await fetch(`${base}/api/drops/admin/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const upJson = await up.json().catch(() => null) as any;
  console.log(`upload -> ${up.status} ${JSON.stringify(upJson)}`);
  if (!upJson?.stored_name) { console.log('REPRO: upload itself failed'); server.close(); return; }

  const created = await fetch(`${base}/api/drops/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      type: 'company', headline: 'Repro card with an uploaded portrait photo on it',
      bullets: ['Uploaded through the real admin endpoint'],
      cta_route: '/', status: 'published', image_stored_name: upJson.stored_name, image_file_name: 'phone-photo.png',
    }),
  });
  const createdJson = await created.json().catch(() => null) as any;
  const dropId = createdJson?.drop?.id;
  console.log(`create -> ${created.status} id=${dropId} image_stored_name=${createdJson?.drop?.image_stored_name}`);

  const feed = await fetch(`${base}/api/drops?limit=50`).then((r) => r.json()) as any;
  const inFeed = (feed.items || []).find((i: any) => i.id === dropId);
  console.log(`feed image_url -> ${inFeed?.image_url ?? 'NOT IN FEED'}`);

  if (inFeed?.image_url) {
    const fileRes = await fetch(`${base}${inFeed.image_url}`);
    const bytes = Buffer.from(await fileRes.arrayBuffer());
    console.log(`file route -> ${fileRes.status} ${fileRes.headers.get('content-type')} ${(bytes.length / 1024).toFixed(0)} KB`);
    const w = bytes.readUInt32BE(16);
    const h = bytes.readUInt32BE(20);
    console.log(`served dimensions -> ${w}x${h} (source was ${W}x${H})`);
    const onDisk = path.join(__dirname, '../src/routes/../../uploads/drops', inFeed.image_url.split('/').pop()!);
    console.log(`on disk -> ${fs.existsSync(onDisk)} (${(fs.statSync(onDisk).size / 1024).toFixed(0)} KB)`);
    console.log(`aspect the card must crop: ${(w / h).toFixed(3)} wide/tall -> a 100%-height cover box will letterbox a very tall photo`);
  }

  server.close();
  const clean = loadDb();
  clean.users = (clean.users || []).filter((u: any) => u.id !== 'u-repro');
  clean.staff = (clean.staff || []).filter((s: any) => s.id !== 'staff-repro');
  clean.drops = (clean.drops || []).filter((d: any) => d.id !== dropId);
  saveDb(clean);
  console.log('cleaned up repro user/staff/drop');
  removeScratchDb();
};

main();