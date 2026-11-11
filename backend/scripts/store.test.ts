/**
 * The TiEEdu Store (lib/store.ts, routes/store.routes.ts): digital items deliver at once
 * (repair, coupon, pack, membership, frame), swag needs eligibility + stock + address,
 * limits and balance are enforced, reject/cancel refunds coins and stock, and admin
 * edits and order moves work over HTTP.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, note = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${note}`); }
}

async function main() {
  const file = path.join(os.tmpdir(), `store-${process.pid}.json`);
  process.env.DB_FILE = file;
  delete process.env.DATABASE_URL;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'store-test-secret-0123456789abcdef012345';
  const C = await import('../src/lib/coins');
  const S = await import('../src/lib/store');
  const { istDate, addDays, touchStreak } = await import('../src/lib/streak');
  const { seedCompanyProfiles } = await import('../src/lib/seed3T');

  const old = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const db: any = { companies: [], unlocks: [], coupons: [], users: [
    { id: 'rich', email: 'r@x.com', role: 'student', email_verified: true, created_at: old },
    { id: 'new', email: 'n@x.com', role: 'student', email_verified: true, created_at: new Date().toISOString() },
    { id: 'poor', email: 'p@x.com', role: 'student', email_verified: true, created_at: old },
  ] };
  seedCompanyProfiles(db, false, ['tcs-nqt']);
  C.grant(db, 'rich', 'admin', 'seed', 20000, 'test');
  C.grant(db, 'new', 'admin', 'seed2', 20000, 'test');
  C.grant(db, 'poor', 'admin', 'seed3', 100, 'test');

  check('the catalogue seeds with the starting items', S.storeItems(db).length >= 15 && S.itemById(db, 'tshirt')!.active && !S.itemById(db, 'hoodie')!.active);

  // Digital
  const frame = S.redeem(db, 'rich', { item_id: 'frame-bronze' });
  check('a frame is delivered at once and set on the profile', frame.status === 'delivered' && db.users[0].profile_frame === 'bronze' && C.balanceOf(db, 'rich') === 19850);
  let err: any = null; try { S.redeem(db, 'rich', { item_id: 'frame-bronze' }); } catch (e) { err = e; }
  check('a once-only item cannot be bought twice', err?.status === 409);

  const cp = S.redeem(db, 'rich', { item_id: 'coupon-50' });
  const coupon = db.coupons.find((c: any) => c.code === cp.result?.coupon);
  check('the coupon is a real single-use ₹50 code', !!coupon && coupon.discount_flat === 50 && coupon.max_uses === 1);

  const tcs = db.companies.find((c: any) => c.slug === 'tcs-nqt');
  const packable = S.packCompanies(db).some((p) => p.slug === 'tcs-nqt');
  if (packable) {
    const pk = S.redeem(db, 'rich', { item_id: 'company-pack', company_slug: 'tcs-nqt' });
    check('a company pack unlocks that company', pk.result?.slug === 'tcs-nqt' && db.unlocks.some((u: any) => u.user_id === 'rich' && u.company_id === tcs.id && u.status === 'active'));
    err = null; try { S.redeem(db, 'rich', { item_id: 'company-pack', company_slug: 'tcs-nqt' }); } catch (e) { err = e; }
    check('the same pack is not sold twice', err?.status === 409);
  } else check('TCS NQT is a paid pack company', false, 'packCompanies() did not list tcs-nqt');
  err = null; try { S.redeem(db, 'rich', { item_id: 'company-pack', company_slug: 'nope' }); } catch (e) { err = e; }
  check('a pack needs a real company, and no coins move', err?.status === 400);

  const m1 = S.redeem(db, 'rich', { item_id: 'membership-30' });
  const m2 = S.redeem(db, 'rich', { item_id: 'membership-30' });
  const until = Date.parse(db.users[0].membership.expires_at);
  check('membership: 30 days, and a second buy extends it', m1.status === 'delivered' && m2.status === 'delivered' && until > Date.now() + 59 * 86_400_000);

  // Streak Repair
  const today = istDate();
  const sdb: any = { companies: [], users: [{ id: 's', role: 'student' }] };
  C.grant(sdb, 's', 'admin', 'seed', 1000, 'test');
  const dayOf = (n: number) => addDays(today, n);
  const inMonth = (d: string) => d.slice(0, 7) === today.slice(0, 7);
  // Practised 6 and 5 days ago, missed 4 and 3 days ago (too long for the free weekly freeze), then the last 3 days.
  for (const n of [-6, -5, -2, -1, 0]) touchStreak(sdb, 's', new Date(`${dayOf(n)}T06:00:00Z`));
  const before = sdb.user_streaks[0].current;
  if (inMonth(dayOf(-6))) {
    S.redeem(sdb, 's', { item_id: 'repair', day: dayOf(-4) });
    const rep = S.redeem(sdb, 's', { item_id: 'repair', day: dayOf(-3) });
    check('two repairs fill the gap and join the runs (3 → 7 days)', before === 3 && rep.result?.day === dayOf(-3) && sdb.user_streaks[0].current === 7, `before ${before}, after ${sdb.user_streaks[0].current}`);
    err = null; try { S.redeem(sdb, 's', { item_id: 'repair', day: dayOf(-3) }); } catch (e) { err = e; }
    check('a day already counted cannot be repaired (and costs nothing)', err?.status === 400 && C.balanceOf(sdb, 's') === 880);
  } else {
    console.log('  skip repair-joins check (too early in the month)');
  }
  err = null; try { S.redeem(sdb, 's', { item_id: 'repair', day: today }); } catch (e) { err = e; }
  check('today cannot be repaired', err?.status === 400);

  // Swag
  err = null; try { S.redeem(db, 'rich', { item_id: 'tshirt', size: 'M', phone: '9876543210', address: { name: 'R', line1: 'x', city: 'y', state: 'z', pincode: '110001' } }); } catch (e) { err = e; }
  check('out-of-stock swag cannot be ordered', err?.status === 409);
  S.updateItem(db, 'tshirt', { stock: { M: 2 } });
  err = null; try { S.redeem(db, 'new', { item_id: 'tshirt', size: 'M', phone: '9876543210', address: { name: 'N', line1: 'x', city: 'y', state: 'z', pincode: '110001' } }); } catch (e) { err = e; }
  check('a brand-new account cannot order swag yet', err?.status === 403);
  err = null; try { S.redeem(db, 'rich', { item_id: 'tshirt', size: 'Q', phone: '9876543210', address: { name: 'R', line1: 'x', city: 'y', state: 'z', pincode: '110001' } }); } catch (e) { err = e; }
  check('a size must be one of the item sizes', err?.status === 400);
  err = null; try { S.redeem(db, 'rich', { item_id: 'tshirt', size: 'M', phone: '12345', address: { name: 'R', line1: 'x', city: 'y', state: 'z', pincode: '110001' } }); } catch (e) { err = e; }
  check('a phone number is checked', err?.status === 400);
  const bal = C.balanceOf(db, 'rich');
  const tee = S.redeem(db, 'rich', { item_id: 'tshirt', size: 'M', phone: '+919876543210', address: { name: 'Rich', line1: '1 Road', city: 'Pune', state: 'MH', pincode: '411001' } });
  check('swag order is placed, paid and takes stock', tee.status === 'placed' && C.balanceOf(db, 'rich') === bal - 5500 && S.itemById(db, 'tshirt')!.stock!.M === 1);
  err = null; try { S.redeem(db, 'poor', { item_id: 'mug' }); } catch (e) { err = e; }
  check('not enough coins is refused', err?.status === 402 || err?.status === 409);

  err = null; try { S.setOrderStatus(db, tee.id, 'approved', { id: 'rich', admin: false }); } catch (e) { err = e; }
  check('a student cannot move their own order', err?.status === 403);
  err = null; try { S.setOrderStatus(db, tee.id, 'shipped', { id: 'a', admin: true }); } catch (e) { err = e; }
  check('status moves in order only', err?.status === 409);
  S.setOrderStatus(db, tee.id, 'approved', { id: 'a', admin: true });
  err = null; try { S.setOrderStatus(db, tee.id, 'rejected', { id: 'a', admin: true }); } catch (e) { err = e; }
  check('rejecting needs a reason', err?.status === 400);
  const b2 = C.balanceOf(db, 'rich');
  S.setOrderStatus(db, tee.id, 'rejected', { id: 'a', admin: true }, { note: 'Size gone' });
  check('reject refunds coins and stock', C.balanceOf(db, 'rich') === b2 + 5500 && S.itemById(db, 'tshirt')!.stock!.M === 2);
  err = null; try { S.setOrderStatus(db, tee.id, 'rejected', { id: 'a', admin: true }, { note: 'again' }); } catch (e) { err = e; }
  check('a rejected order cannot be refunded twice', err?.status === 409 && C.balanceOf(db, 'rich') === b2 + 5500);
}

main().then(async () => {
  // ---- HTTP
  const file = process.env.DB_FILE!;
  const db: any = { companies: [], users: [{ id: 'h', email: 'h@x.com', role: 'student', email_verified: true, created_at: new Date(Date.now() - 90 * 86_400_000).toISOString() }] };
  fs.writeFileSync(file, JSON.stringify(db));
  const C = await import('../src/lib/coins');
  const { loadDb, saveDb } = await import('../src/data/db');
  const d = loadDb(); C.grant(d, 'h', 'admin', 'seedh', 5000, 'test'); saveDb(d);
  const express = (await import('express')).default;
  const { storeRouter, storeAdminRouter } = await import('../src/routes/store.routes');
  const { signAccessToken } = await import('../src/middleware/auth');
  const app = express();
  app.use(express.json());
  app.use('/store', storeRouter);
  app.use('/admin', storeAdminRouter);
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${signAccessToken({ id: 'h', role: 'student' })}` };
  const call = async (p: string, method = 'GET', body?: unknown, h: Record<string, string> = H) => { const r = await fetch(base + p, { method, headers: h, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };

  const anon = (await call('/store', 'GET', undefined, {})).body;
  check('guests see the catalogue, not a balance', anon.items.length > 5 && anon.coins === undefined && !anon.items.some((i: any) => i.id === 'hoodie'));
  const me = (await call('/store')).body;
  check('signed in: balance, swag eligibility, repair info', me.coins === 5000 && me.swag_ok === true && typeof me.repairs_left === 'number');
  const put = await call('/admin/items/mug', 'PUT', { stock: { one: 3 }, coins: 2400, featured: true });
  check('admin edits price and stock', put.body.item.coins === 2400 && put.body.item.stock.one === 3);
  const buy = await call('/store/redeem', 'POST', { item_id: 'mug', phone: '9876543210', address: { name: 'H', line1: 'x', city: 'Delhi', state: 'DL', pincode: '110001' } });
  check('redeem over HTTP', buy.status === 200 && buy.body.order.status === 'placed' && buy.body.coins === 2600, JSON.stringify(buy.body).slice(0, 200));
  const list = (await call('/admin/orders')).body;
  check('admin sees the order with the student', list.orders[0].id === buy.body.order.id && list.orders[0].user.email === 'h@x.com' && list.counts.placed === 1);
  const csv = await fetch(`${base}/admin/orders?format=csv`).then((r) => r.text());
  check('courier CSV has the address', csv.includes('110001') && csv.split('\n')[0].startsWith('id,created_at,status'));
  const cancel = await call(`/store/orders/${buy.body.order.id}/cancel`, 'POST');
  check('the student can cancel while placed, coins back', cancel.body.order.status === 'cancelled' && cancel.body.coins === 5000);

  server.close();
  fs.rmSync(file, { force: true });
  console.log(`\nstore: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}).catch((e) => { console.error(e); process.exit(1); });
