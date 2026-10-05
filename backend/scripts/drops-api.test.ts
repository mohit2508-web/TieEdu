/**
 * End-to-end check of the Drops HTTP surface against a scratch database.
 *
 * Runs the real router, the real JWT middleware, the real RBAC grants and the
 * real multer upload, so route-wiring bugs and the editorial rules the feed
 * depends on (window liveness, audience scoping, ordering, the 30-live and
 * 10-per-day caps) get caught together rather than in isolation.
 */
import { SCRATCH_DB, TEST_JWT_SECRET, removeScratchDb } from './test-env';
import express from 'express';
import fs from 'fs';
import path from 'path';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { dropsRouter } from '../src/routes/drops.routes';
import { createAutoDrop } from '../src/lib/autoDrops';
import { sweepDrops } from '../src/lib/dropScheduler';
import { loadDb, saveDb } from '../src/data/db';
import { _resetStaffCache } from '../src/store/staff';

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

const UPLOAD_DIR = path.join(__dirname, '../src/routes/../../uploads/drops');

const past = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

const seedUser = (id: string, role: string, extra: Record<string, unknown> = {}) => {
  const db = loadDb();
  db.users.push({ id, name: id, email: `${id}@test.local`, role, xp: 0, disabled: false, ...extra } as any);
  saveDb(db);
};

/**
 * Staff grants for the two fine-grained admins plus one who must stay inert.
 *
 * Seeded BEFORE the first admin request: `getStaffSync()` cold-reads the JSON
 * ledger, so rows written here are what the authority cache resolves against.
 */
const seedStaff = (id: string, userId: string, role: string, permissions: string[] = []) => {
  const db = loadDb();
  db.staff = db.staff || [];
  db.staff.push({
    id, user_id: userId, role, permissions,
    status: 'active', created_by: null, created_at: new Date().toISOString(),
  } as any);
  saveDb(db);
};

const main = async () => {
  seedUser('u-admin', 'admin');
  seedUser('u-student', 'user');
  seedUser('u-gla', 'user', { college: 'GLA University' });
  seedUser('u-editor', 'admin');
  seedUser('u-analyst', 'admin');
  seedUser('u-noperm', 'admin');
  seedStaff('staff-super', 'u-admin', 'super_admin');
  seedStaff('staff-editor', 'u-editor', 'content_editor');
  seedStaff('staff-analyst', 'u-analyst', 'analyst');
  _resetStaffCache();

  const app = express();
  app.use(express.json());
  app.use('/api/drops', dropsRouter);

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

  const upload = async (as?: string, name = 'drop.png', bytes: Buffer = PNG, type = 'image/png') => {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(bytes)], { type }), name);
    const res = await fetch(`${base}/api/drops/admin/upload`, {
      method: 'POST',
      headers: as ? { Authorization: `Bearer ${token(as)}` } : {},
      body: form,
    });
    const json = await res.json().catch(() => null) as any;
    if (json?.stored_name) uploaded.push(json.stored_name);
    return { status: res.status, json };
  };

  const feed = async (qs = '', as?: string) => (await call('GET', `/api/drops${qs}`, undefined, as)).json;
  const feedIds = async (qs = '', as?: string) => ((await feed(qs, as))?.items || []).map((d: any) => d.id);

  // ========================================================================
  // 1. Public feed + admin gates
  // ========================================================================
  const empty = await feed();
  eq('fresh install has an empty feed', empty.items, []);
  eq('fresh install reports zero total', empty.total, 0);

  eq('anonymous admin list is 401', (await call('GET', '/api/drops/admin')).status, 401);
  eq('student admin list is 403', (await call('GET', '/api/drops/admin', undefined, 'u-student')).status, 403);
  const analystList = await call('GET', '/api/drops/admin', undefined, 'u-analyst');
  eq('analyst (no drops.read) is 403', analystList.status, 403);
  eq('analyst denial names the permission', analystList.json.required_permission, 'drops.read');
  const inertList = await call('GET', '/api/drops/admin', undefined, 'u-noperm');
  eq('admin with no staff row is inert', inertList.status, 403);
  eq('inert admin denial names the permission', inertList.json.required_permission, 'drops.read');
  eq('anonymous create is 401', (await call('POST', '/api/drops/admin', { type: 'tip' })).status, 401);
  eq('student create is 403', (await call('POST', '/api/drops/admin', { type: 'tip' }, 'u-student')).status, 403);
  eq('analyst create is 403', (await call('POST', '/api/drops/admin', { type: 'tip' }, 'u-analyst')).status, 403);
  eq('anonymous upload is 401', (await upload()).status, 401);

  // ========================================================================
  // 2. Upload validation
  // ========================================================================
  const pdf = await upload('u-admin', 'notes.pdf', Buffer.from('not an image'), 'application/pdf');
  eq('non-image upload is 400', pdf.status, 400);
  const img = await upload('u-admin');
  eq('image upload is 201', img.status, 201);
  eq('stored name is server-generated', /^drop-\d+-[a-z0-9]{4,10}\.png$/.test(img.json.stored_name), true);
  eq('uploaded file landed on disk', fs.existsSync(path.join(UPLOAD_DIR, img.json.stored_name)), true);

  // ========================================================================
  // 3. Create validation — the editorial rules
  // ========================================================================
  const baseDrop = {
    type: 'vault',
    headline: 'Google Drive 2026 is live with new rounds',
    bullets: ['Round-wise question vault', 'Updated for 2026 batch', 'Free with any unlock'],
    image_stored_name: img.json.stored_name,
    image_file_name: 'drop.png',
    cta_route: '/company/google',
    target_slug: 'google',
    status: 'published',
    publish_at: past(1),
  };
  const bad = async (name: string, patch: any, expect = 400) =>
    eq(name, (await call('POST', '/api/drops/admin', { ...baseDrop, ...patch }, 'u-admin')).status, expect);

  await bad('create without an image is 400', { image_stored_name: '' });
  await bad('create with a fake stored name is 400', { image_stored_name: 'drop-1-deadbeef.png' });
  await bad('unknown type is 400', { type: 'nonsense' });
  await bad('short headline is 400', { headline: 'Too short' });
  await bad('headline over 100 chars is 400', { headline: 'x'.repeat(101) });
  await bad('no bullets is 400', { bullets: [] });
  await bad('four bullets is 400', { bullets: ['a', 'b', 'c', 'd'] });
  await bad('bullet over 120 chars is 400', { bullets: ['y'.repeat(121)] });
  await bad('protocol-relative cta_route is 400', { cta_route: '//evil.example' });
  await bad('javascript cta_url is 400', { cta_url: 'javascript:alert(1)' });
  await bad('no CTA target and no article is 400', { cta_route: '', target_slug: '', cta_url: '' });
  await bad('expiry before publish is 400', { publish_at: future(2), expires_at: future(1) });

  const created = await call('POST', '/api/drops/admin', baseDrop, 'u-admin');
  eq('valid create is 201', created.status, 201);
  const mainId = created.json.drop.id;
  eq('new drop is live', created.json.drop.is_live, true);
  eq('new drop list status is live', created.json.drop.list_status, 'live');
  eq('new drop stats start at zero', created.json.drop.stats.views, 0);
  eq('new drop records a manual source', created.json.drop.source.kind, 'manual');
  eq('create appended an audit row',
    (loadDb().audit || []).some((a: any) => a.action === 'drops.create' && a.target === mainId), true);

  // ========================================================================
  // 4. Lifecycle windows — what the feed hides
  // ========================================================================
  const mk = async (patch: Record<string, unknown>) => {
    const res = await call('POST', '/api/drops/admin', { ...baseDrop, ...patch }, 'u-admin');
    return res.json?.drop;
  };

  const draft = await mk({ headline: 'A draft headline for testing', status: 'draft' });
  const scheduled = await mk({ headline: 'A scheduled headline for test', status: 'scheduled', publish_at: future(3) });
  const expired = await mk({ headline: 'An expired headline for test', status: 'published', publish_at: past(5), expires_at: past(1) });
  const deadlinePast = await mk({
    headline: 'A deadline headline already past', type: 'deadline',
    publish_at: past(3), deadline_at: past(1), target_slug: '',
    cta_route: '', cta_url: 'https://example.com/apply',
  });
  const typo = await mk({ headline: 'A typo-dated headline for test', publish_at: 'next tuesday' });

  let ids = await feedIds();
  eq('published drop is in the feed', ids.includes(mainId), true);
  eq('draft is hidden from the feed', ids.includes(draft.id), false);
  eq('future-scheduled drop is hidden', ids.includes(scheduled.id), false);
  eq('expired drop is hidden', ids.includes(expired.id), false);
  eq('past-deadline drop is hidden', ids.includes(deadlinePast.id), false);
  eq('unparseable publish date does not hide the drop', ids.includes(typo.id), true);

  const adminList = (await call('GET', '/api/drops/admin', undefined, 'u-admin')).json;
  const findAdmin = (id: string) => adminList.items.find((d: any) => d.id === id);
  eq('admin list marks the draft', findAdmin(draft.id).list_status, 'draft');
  eq('admin list marks the scheduled drop', findAdmin(scheduled.id).list_status, 'scheduled');
  eq('admin list marks the expired drop', findAdmin(expired.id).list_status, 'expired');
  eq('admin list marks the past-deadline drop expired', findAdmin(deadlinePast.id).list_status, 'expired');
  eq('admin list marks the typo-dated drop live', findAdmin(typo.id).list_status, 'live');
  eq('admin list reports the caps', adminList.caps, { max_live: 30, max_per_day: 10 });

  // ========================================================================
  // 5. Type filter, audience scoping, pagination, limit clamp
  // ========================================================================
  const audienceDrop = await mk({
    headline: 'GLA University campus drive opens', type: 'scholarship',
    audience: { colleges: ['GLA University'] }, target_slug: 'gla', cta_route: '/company/gla',
  });
  ids = await feedIds();
  eq('unscoped drop is visible to a guest', ids.includes(mainId), true);
  eq('college-scoped drop is hidden from a guest', ids.includes(audienceDrop.id), false);
  eq('college-scoped drop is hidden from a mismatched student',
    (await feedIds('', 'u-student')).includes(audienceDrop.id), false);
  eq('college-scoped drop reaches the matching student',
    (await feedIds('', 'u-gla')).includes(audienceDrop.id), true);

  const tipIds = new Set<string>();
  const tip = async (patch: Record<string, unknown>, name: string) => {
    const d = await mk({ ...patch, type: 'tip', target_slug: '', cta_route: '/drops', image_alt: name });
    tipIds.add(d.id);
    return d;
  };
  const tipA = await tip({ headline: 'Tip A newest plain publish ordering', publish_at: past(10) }, 'a');
  const tipB = await tip({ headline: 'Tip B the newest plain publish here', publish_at: past(5) }, 'b');
  const tipC = await tip({ headline: 'Tip C pinned despite an older publish', publish_at: past(60), pinned: true }, 'c');
  const tipD = await tip({ headline: 'Tip D deadline two days from now', publish_at: past(20), deadline_at: future(2) }, 'd');
  const tipE = await tip({ headline: 'Tip E deadline nine days from now', publish_at: past(30), deadline_at: future(9) }, 'e');
  const tipF = await tip({ headline: 'Tip F priority one without any deadline', publish_at: past(40), priority: 1 }, 'f');

  const tipOrder = await feedIds('?type=tip');
  eq('type filter returns only that type', tipOrder.length, 6);
  eq('ordering is pinned > priority > soonest deadline > newest',
    tipOrder, [tipC.id, tipF.id, tipD.id, tipE.id, tipB.id, tipA.id]);
  eq('unknown type filter is 400', (await call('GET', '/api/drops?type=nonsense')).status, 400);

  const one = await feed('?limit=1');
  eq('limit=1 returns one item', one.items.length, 1);
  eq('limit=1 offers a cursor', typeof one.next_cursor, 'string');
  const second = await feed(`?limit=1&cursor=${one.next_cursor}`);
  eq('cursor advances the page', second.items[0].id !== one.items[0].id, true);
  eq('limit=999 is clamped to the feed window', (await feed('?limit=999')).items.length <= 30, true);
  const raw = await fetch(`${base}/api/drops`);
  eq('feed sends Cache-Control no-store', raw.headers.get('cache-control'), 'no-store');

  // ========================================================================
  // 6. Unseen-first for a signed-in viewer
  // ========================================================================
  await call('POST', `/api/drops/${tipB.id}/event`, { event: 'view' }, 'u-student');
  const studentTips = await feedIds('?type=tip', 'u-student');
  eq('a seen drop sinks below unseen drops of the same tier',
    studentTips, [tipC.id, tipF.id, tipD.id, tipE.id, tipA.id, tipB.id]);
  eq('the guest order is untouched by someone else seeing a drop',
    await feedIds('?type=tip'), [tipC.id, tipF.id, tipD.id, tipE.id, tipB.id, tipA.id]);

  // ========================================================================
  // 7. Event beacons
  // ========================================================================
  const fresh = await mk({ headline: 'Beacon target headline here', type: 'course', target_slug: 'py', cta_route: '/courses/python' });
  eq('anonymous view is accepted', (await call('POST', `/api/drops/${fresh.id}/event`, { event: 'view' })).status, 200);
  eq('logged-in view is accepted',
    (await call('POST', `/api/drops/${fresh.id}/event`, { event: 'view', dwell_ms: 5000 }, 'u-student')).status, 200);
  eq('second view by the same viewer is accepted',
    (await call('POST', `/api/drops/${fresh.id}/event`, { event: 'view' }, 'u-student')).status, 200);
  await call('POST', `/api/drops/${fresh.id}/event`, { event: 'cta_click' }, 'u-student');
  eq('invalid event is 400', (await call('POST', `/api/drops/${fresh.id}/event`, { event: 'explode' })).status, 400);
  eq('event on an unknown drop is 404', (await call('POST', '/api/drops/no-such/event', { event: 'view' })).status, 404);

  const dbAfterEvents = loadDb();
  const freshRow = dbAfterEvents.drops.find((d: any) => d.id === fresh.id);
  eq('views are counted', freshRow.stats.views, 3);
  eq('cta clicks are counted', freshRow.stats.cta_clicks, 1);
  eq('dwell is accumulated', freshRow.stats.dwell_ms_total, 5000);
  eq('unique viewers count accounts once', freshRow.stats.unique_viewers, 1);
  eq('anonymous views leave no read-state row',
    dbAfterEvents.drop_views.filter((v: any) => v.drop_id === fresh.id && !v.user_id).length, 0);
  eq('event rows are recorded',
    dbAfterEvents.drop_events.filter((e: any) => e.drop_id === fresh.id).length, 4);

  // ========================================================================
  // 8. Bookmarks
  // ========================================================================
  eq('anonymous bookmark is 401', (await call('POST', `/api/drops/${mainId}/bookmark`)).status, 401);
  eq('bookmark on an unknown drop is 404', (await call('POST', '/api/drops/no-such/bookmark', {}, 'u-student')).status, 404);
  eq('bookmark is accepted', (await call('POST', `/api/drops/${mainId}/bookmark`, {}, 'u-student')).status, 200);
  eq('repeating the bookmark does not double the stat',
    (await call('POST', `/api/drops/${mainId}/bookmark`, {}, 'u-student')).status, 200);
  let mainRow = loadDb().drops.find((d: any) => d.id === mainId);
  eq('saves counted once', mainRow.stats.saves, 1);
  const saved = await call('GET', '/api/drops/saved', undefined, 'u-student');
  eq('saved list returns the drop', saved.json.items.map((d: any) => d.id), [mainId]);
  eq('another viewer has an empty saved list',
    (await call('GET', '/api/drops/saved', undefined, 'u-gla')).json.items, []);
  await call('POST', `/api/drops/${mainId}/bookmark`, {}, 'u-admin');
  eq('unbookmarking removes only the caller save',
    (await call('DELETE', `/api/drops/${mainId}/bookmark`, undefined, 'u-student')).status, 200);
  mainRow = loadDb().drops.find((d: any) => d.id === mainId);
  eq('saves decrement', mainRow.stats.saves, 1);
  eq('the other save survives', (await call('GET', '/api/drops/saved', undefined, 'u-admin')).json.items.length, 1);
  eq('unbookmarking again is still 200 and idempotent',
    (await call('DELETE', `/api/drops/${mainId}/bookmark`, undefined, 'u-student')).status, 200);

  // ========================================================================
  // 9. Mutes — per-user, never global
  // ========================================================================
  eq('anonymous mute is 401', (await call('POST', `/api/drops/${tipA.id}/mute`)).status, 401);
  eq('drop mute is accepted',
    (await call('POST', `/api/drops/${tipA.id}/mute`, {}, 'u-student')).status, 200);
  const mutedTips = await feedIds('?type=tip', 'u-student');
  eq('muted drop leaves that viewer feed', mutedTips.includes(tipA.id), false);
  eq('the same drop stays for everyone else', (await feedIds('?type=tip')).includes(tipA.id), true);
  const mutes = await call('GET', '/api/drops/mutes', undefined, 'u-student');
  eq('mute is listed back', mutes.json.items.length, 1);
  const muteId = mutes.json.items[0].id;
  eq('a second identical mute does not duplicate',
    (await call('POST', `/api/drops/${tipA.id}/mute`, {}, 'u-student')).json, { status: 'success', kind: 'drop', value: tipA.id });
  eq('type mute hides the whole category for that viewer',
    (await call('POST', `/api/drops/${tipC.id}/mute`, { kind: 'type', value: 'tip' }, 'u-student')).status, 200);
  eq('every tip is gone for the muter', (await feedIds('?type=tip', 'u-student')).length, 0);
  eq('tips are untouched for the guest', (await feedIds('?type=tip')).length, 6);
  eq('company mute on a drop without a target is 400',
    (await call('POST', `/api/drops/${tipD.id}/mute`, { kind: 'company' }, 'u-student')).status, 400);
  eq('mute delete is accepted',
    (await call('DELETE', `/api/drops/mutes/${muteId}`, undefined, 'u-student')).status, 200);
  eq('deleting a missing mute is 404',
    (await call('DELETE', `/api/drops/mutes/${muteId}`, undefined, 'u-student')).status, 404);
  eq('another viewer cannot delete your mute',
    (await call('DELETE', `/api/drops/mutes/${muteId}`, undefined, 'u-gla')).status, 404);

  // ========================================================================
  // 10. Detail route
  // ========================================================================
  const detail = await call('GET', `/api/drops/${mainId}`);
  eq('live detail is public', detail.status, 200);
  eq('detail carries the article', typeof detail.json.drop.body_md, 'string');
  eq('detail exposes the type default CTA label', detail.json.drop.cta_label, 'Open Vault');
  eq('draft detail is 404 for a guest', (await call('GET', `/api/drops/${draft.id}`)).status, 404);
  eq('draft detail is visible to an admin',
    (await call('GET', `/api/drops/${draft.id}`, undefined, 'u-admin')).status, 200);
  eq('unknown detail is 404', (await call('GET', '/api/drops/no-such')).status, 404);

  // ========================================================================
  // 11. File serving
  // ========================================================================
  const fileRes = await fetch(`${base}/api/drops/file/${img.json.stored_name}`);
  eq('file is served', fileRes.status, 200);
  eq('file has an image content type', (fileRes.headers.get('content-type') || '').startsWith('image/'), true);
  eq('traversal name is rejected', (await fetch(`${base}/api/drops/file/..%2F..%2Fdb.json`)).status, 404);
  eq('foreign file is rejected', (await fetch(`${base}/api/drops/file/poster-1-abcd.png`)).status, 404);

  // ========================================================================
  // 12. Update
  // ========================================================================
  const patched = await call('PUT', `/api/drops/admin/${mainId}`, { headline: 'An updated headline for main', priority: 1 }, 'u-editor');
  eq('editor with drops.write may update', patched.status, 200);
  eq('partial update keeps the image', patched.json.drop.image_stored_name, img.json.stored_name);
  eq('partial update keeps the CTA', patched.json.drop.cta_route, '/company/google');
  eq('partial update applies the patch', patched.json.drop.priority, 1);
  eq('update appended an audit row',
    (loadDb().audit || []).some((a: any) => a.action === 'drops.update' && a.target === mainId), true);
  eq('headline too short on update is 400',
    (await call('PUT', `/api/drops/admin/${mainId}`, { headline: 'short' }, 'u-admin')).status, 400);
  eq('update of an unknown drop is 404',
    (await call('PUT', '/api/drops/admin/no-such', { headline: 'x'.repeat(20) }, 'u-admin')).status, 404);

  await call('PUT', `/api/drops/admin/${mainId}`, { status: 'draft' }, 'u-admin');
  eq('flipping to draft removes it from the feed', (await feedIds()).includes(mainId), false);
  await call('PUT', `/api/drops/admin/${mainId}`, { status: 'published' }, 'u-admin');
  eq('flipping back restores it to the feed', (await feedIds()).includes(mainId), true);

  // ========================================================================
  // 13. Delete cascades
  // ========================================================================
  const doomedImg = await upload('u-admin', 'doomed.png');
  const doomed = await call('POST', '/api/drops/admin', {
    ...baseDrop,
    headline: 'Doomed drop headline for cascade',
    type: 'contest', target_slug: '', cta_route: '/contests',
    image_stored_name: doomedImg.json.stored_name, image_file_name: 'doomed.png',
  }, 'u-admin');
  const doomedId = doomed.json.drop.id;
  await call('POST', `/api/drops/${doomedId}/event`, { event: 'view' }, 'u-student');
  await call('POST', `/api/drops/${doomedId}/bookmark`, {}, 'u-student');

  eq('delete is accepted', (await call('DELETE', `/api/drops/admin/${doomedId}`, undefined, 'u-editor')).status, 200);
  eq('deleted drop is gone from the admin list',
    (await call('GET', '/api/drops/admin', undefined, 'u-admin')).json.items.some((d: any) => d.id === doomedId), false);
  eq('deleted drop is gone from the feed', (await feedIds()).includes(doomedId), false);
  eq('deleted drop is 404', (await call('GET', `/api/drops/${doomedId}`)).status, 404);
  eq('deleting again is 404', (await call('DELETE', `/api/drops/admin/${doomedId}`, undefined, 'u-admin')).status, 404);
  eq('its read-state rows are swept',
    loadDb().drop_views.filter((v: any) => v.drop_id === doomedId).length, 0);
  eq('its bookmarks are swept',
    loadDb().drop_bookmarks.filter((b: any) => b.drop_id === doomedId).length, 0);
  eq('its event rows are swept',
    loadDb().drop_events.filter((e: any) => e.drop_id === doomedId).length, 0);
  eq('its unreferenced image file is removed',
    fs.existsSync(path.join(UPLOAD_DIR, doomedImg.json.stored_name)), false);
  eq('delete appended an audit row',
    (loadDb().audit || []).some((a: any) => a.action === 'drops.delete' && a.target === doomedId), true);
  eq('deleting a referenced image on another drop keeps the file',
    fs.existsSync(path.join(UPLOAD_DIR, img.json.stored_name)), true);

  // ========================================================================
  // 14. Analytics
  // ========================================================================
  const analytics = await call('GET', '/api/drops/admin/analytics', undefined, 'u-admin');
  eq('analytics is readable with drops.read', analytics.status, 200);
  eq('analytics covers all twelve types', analytics.json.by_type.length, 12);
  eq('analytics counts the recorded views', analytics.json.totals.views >= 4, true);
  eq('analytics reports a live count', analytics.json.live >= 5, true);
  eq('analytics ranks top drops', analytics.json.top_drops.length >= 1, true);
  eq('analytics is closed to analysts', (await call('GET', '/api/drops/admin/analytics', undefined, 'u-analyst')).status, 403);

  // ========================================================================
  // 15. Editorial caps — 10 per day, 30 live
  // ========================================================================
  const today = new Date().toISOString().slice(0, 10);
  const countedToday = (d: any) =>
    (d.status === 'published' || d.status === 'scheduled') &&
    String(d.publish_at || d.created_at || '').slice(0, 10) === today;

  const before = (await call('GET', '/api/drops/admin', undefined, 'u-admin')).json.items;
  const usedToday = before.filter(countedToday).length;
  eq('the test has not already blown the daily quota', usedToday <= 10, true);

  const seed = (n: number, patch: Record<string, unknown>) => {
    const db = loadDb();
    for (let i = 0; i < n; i++) {
      const now = new Date().toISOString();
      db.drops.push({
        id: `drop-seed-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'tip', headline: 'Seeded quota filler headline',
        bullets: ['seeded bullet'], pinned: false, priority: 0, status: 'published',
        audience: {}, tags: [], stats: { views: 0, unique_viewers: 0, cta_clicks: 0, shares: 0, saves: 0, dwell_ms_total: 0 },
        created_at: now, updated_at: now, source: { kind: 'manual' },
        ...patch,
      } as any);
    }
    saveDb(db);
  };

  seed(10 - usedToday, { publish_at: new Date().toISOString() });
  const quotaHit = await call('POST', '/api/drops/admin', {
    ...baseDrop, headline: 'One drop too many for today', publish_at: new Date().toISOString(),
  }, 'u-admin');
  eq('the 11th drop published on one day is 409', quotaHit.status, 409);
  eq('the daily-quota refusal names the limit', /quota bhar chuka hai/.test(quotaHit.json.error), true);

  const midList = (await call('GET', '/api/drops/admin', undefined, 'u-admin')).json.items;
  const liveNow = midList.filter((d: any) => d.is_live).length;
  eq('quota fills sit at or below ten for the day',
    midList.filter(countedToday).length <= 10 || liveNow > 30, true);
  seed(Math.max(0, 30 - liveNow), { publish_at: past(100) });

  const liveHit = await call('POST', '/api/drops/admin', {
    ...baseDrop, headline: 'The thirty-first live drop', publish_at: past(200),
  }, 'u-admin');
  eq('the 31st simultaneously live drop is 409', liveHit.status, 409);
  eq('the live-cap refusal names the limit', /sirf 30 drops live/.test(liveHit.json.error), true);

  // ========================================================================
  // 16. Auto-drops — dedupe, draft default, cap degradation
  //
  // Runs after section 15 deliberately: the live cap is full and today's
  // quota is spent, which is exactly the state a platform event must not be
  // able to break.
  // ========================================================================
  const autoSpec = {
    event: 'course.published', entityId: 'course-auto-1', type: 'course' as const,
    headline: 'A live course just opened to everyone',
    bullets: ['Thirty lessons now unlocked'],
    ctaRoute: '/courses/auto-course', targetSlug: 'auto-course',
    status: 'published' as const,
  };
  const auto1 = createAutoDrop(autoSpec);
  eq('an auto-drop that requests published is created', auto1.created, true);
  eq('...but degrades to a draft when the caps are full', (auto1 as any).status, 'draft');

  const autoRow = loadDb().drops.find((d: any) => d.id === (auto1 as any).id);
  eq('it carries the auto source marker',
    autoRow?.source, { kind: 'auto', event: 'course.published', entity_id: 'course-auto-1' });
  eq('...attributed to the system when no actor is given', autoRow?.author_id, 'system');
  eq('the auto creation is appended to the audit trail',
    (loadDb().audit || []).some((a: any) => a.action === 'drops.auto' && a.target === (auto1 as any).id), true);
  eq('a draft auto-drop stays out of the public feed',
    (await feedIds()).includes((auto1 as any).id), false);

  const auto2 = createAutoDrop(autoSpec);
  eq('the same event + entity is deduped',
    auto2, { created: false, reason: 'duplicate' });

  const beforeAuto = loadDb().drops.length;
  const autoBad = createAutoDrop({
    ...autoSpec, status: undefined, entityId: 'course-auto-2',
    headline: 'Too short',
  });
  eq('a headline the admin form would reject is refused',
    autoBad, { created: false, reason: 'invalid', detail: 'Headline kam se kam 10 characters ka hona chahiye' });
  eq('...and writes no row', loadDb().drops.length, beforeAuto);

  const auto3 = createAutoDrop({
    event: 'lesson.added', entityId: 'course-auto-1:fixture-day', type: 'course',
    headline: 'New lesson in A live course', bullets: ['Fresh material'],
    ctaRoute: '/courses/auto-course', targetSlug: 'auto-course',
    actorId: 'u-editor',
  });
  eq('an auto-drop with no explicit status is created', auto3.created, true);
  eq('...and defaults to draft', (auto3 as any).status, 'draft');
  eq('...and attributes the actor who caused it',
    loadDb().drops.find((d: any) => d.id === (auto3 as any).id)?.author_id, 'u-editor');
  eq('a repeat trigger for a different course still cards',
    createAutoDrop({ ...autoSpec, entityId: 'course-auto-9' }).created, true);

  // ========================================================================
  // 17. The sweep — due flips + 30-day retention archive
  // ========================================================================
  const sweepSeed = (id: string, patch: Record<string, unknown>) => {
    const db = loadDb();
    const now = new Date().toISOString();
    db.drops.push({
      id, type: 'tip', headline: 'Sweep fixture headline for retention', bullets: ['fixture'],
      pinned: false, priority: 0, status: 'published', audience: {}, tags: [],
      stats: { views: 0, unique_viewers: 0, cta_clicks: 0, shares: 0, saves: 0, dwell_ms_total: 0 },
      created_at: now, updated_at: now, source: { kind: 'manual' }, ...patch,
    } as any);
    saveDb(db);
  };
  const sweepStatus = (id: string) => loadDb().drops.find((d: any) => d.id === id)?.status;

  sweepSeed('drop-sweep-due', { status: 'scheduled', publish_at: past(1) });
  sweepSeed('drop-sweep-future', { status: 'scheduled', publish_at: future(3) });
  sweepSeed('drop-sweep-ancient', { expires_at: past(40) });
  sweepSeed('drop-sweep-recent', { expires_at: past(2) });
  sweepSeed('drop-sweep-draft-old', { status: 'draft', expires_at: past(40) });

  const sweep1 = sweepDrops();
  eq('a scheduled row past its publish time flips to published', sweepStatus('drop-sweep-due'), 'published');
  eq('a scheduled row with a future publish time stays scheduled', sweepStatus('drop-sweep-future'), 'scheduled');
  eq('a row dead beyond retention is archived', sweepStatus('drop-sweep-ancient'), 'archived');
  eq('a row recently expired survives the retention window', sweepStatus('drop-sweep-recent'), 'published');
  eq('a draft with an old expiry is never archived', sweepStatus('drop-sweep-draft-old'), 'draft');
  eq('the sweep reports both counts', sweep1.flipped >= 1 && sweep1.archived >= 1, true);

  const sweep2 = sweepDrops();
  eq('a second sweep is a no-op', sweep2, { flipped: 0, archived: 0 });

  const routesSrc = fs.readFileSync(path.join(__dirname, '../src/routes/drops.routes.ts'), 'utf8');
  eq('mounting the drops router is what arms the scheduler',
    routesSrc.includes('startDropScheduler();'), true);

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
