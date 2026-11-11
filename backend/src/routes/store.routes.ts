import { Router, Request, Response } from 'express';
import { loadDb, safeSaveDb } from '../data/db';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { balanceOf, CoinError } from '../lib/coins';
import { repairableDays } from '../lib/streak';
import { inStock, itemById, ordersOf, packCompanies, redeem, setOrderStatus, stockLeft, storeItems, updateItem, PHYSICAL_MIN_AGE_DAYS, type OrderStatus } from '../lib/store';
import { appendAudit } from '../store/audit';

/**
 * The TiEEdu Store (TIE_COINS_STORE_PLAN.md §4).
 *   GET  /api/store                  catalogue (+ my balance, eligibility, repairable days, pack companies)
 *   POST /api/store/redeem           { item_id, size?, address?, phone?, company_slug?, day? }
 *   GET  /api/store/orders           my orders
 *   POST /api/store/orders/:id/cancel  while still "placed"
 * Admin (/api/admin/store, behind requireAdmin):
 *   GET /items · PUT /items/:id · GET /orders?status= (&format=csv) · POST /orders/:id/status
 */
export const storeRouter = Router();
export const storeAdminRouter = Router();

const fail = (res: Response, e: unknown) => {
  if (e instanceof CoinError) return res.status(e.status).json({ error: e.message });
  console.error('[store]', e);
  return res.status(500).json({ error: 'Something went wrong' });
};

const publicItem = (db: any, i: any) => ({
  id: i.id, kind: i.kind, action: i.action || null, name: i.name, blurb: i.blurb, coins: i.coins, art: i.art, image: i.image || null,
  sizes: i.sizes || null, in_stock: inStock(i), sizes_in_stock: i.sizes ? i.sizes.filter((s: string) => stockLeft(i, s) > 0) : null,
  featured: !!i.featured, limit_per_user: i.limit_per_user || null,
});

storeRouter.get('/', optionalAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const items = storeItems(db).filter((i) => i.active).sort((a, b) => a.sort - b.sort).map((i) => publicItem(db, i));
  if (!req.userId) return res.json({ items, signed_in: false });
  const user = (db.users || []).find((u: any) => u.id === req.userId);
  const ageDays = user ? (Date.now() - new Date(user.created_at || Date.now()).getTime()) / 86_400_000 : 0;
  const owned = new Map<string, number>();
  for (const o of ordersOf(db)) if (o.user_id === req.userId && !['rejected', 'cancelled'].includes(o.status)) owned.set(o.item_id, (owned.get(o.item_id) || 0) + 1);
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({
    items: items.map((i) => ({ ...i, redeemed: owned.get(i.id) || 0 })),
    signed_in: true,
    coins: balanceOf(db, req.userId),
    swag_ok: !!user?.email_verified && ageDays >= PHYSICAL_MIN_AGE_DAYS,
    swag_reason: !user?.email_verified ? 'Verify your email to order swag.' : ageDays < PHYSICAL_MIN_AGE_DAYS ? `Swag opens ${PHYSICAL_MIN_AGE_DAYS} days after you join (in ${Math.ceil(PHYSICAL_MIN_AGE_DAYS - ageDays)} days).` : null,
    repairable_days: repairableDays(db, req.userId),
    repairs_left: 3 - (db.streak_repairs || []).filter((r: any) => r.user_id === req.userId && String(r.day).slice(0, 7) === new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 7)).length,
    pack_companies: packCompanies(db),
  });
});

storeRouter.post('/redeem', requireAuth, async (req: Request, res: Response) => {
  const db = loadDb();
  try {
    const order = redeem(db, req.userId!, req.body || {});
    void appendAudit(db, { actor: req.userId!, action: 'store.redeem', detail: `${order.item_name}${order.size ? ` (${order.size})` : ''} for ${order.coins} coins, ${order.id}` }).catch(() => undefined);
    safeSaveDb(db);
    res.json({ order, coins: balanceOf(db, req.userId!) });
  } catch (e) { fail(res, e); }
});

storeRouter.get('/orders', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ orders: ordersOf(db).filter((o) => o.user_id === req.userId).slice().reverse() });
});

storeRouter.post('/orders/:id/cancel', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  try {
    const o = setOrderStatus(db, req.params.id, 'cancelled', { id: req.userId!, admin: false });
    safeSaveDb(db);
    res.json({ order: o, coins: balanceOf(db, req.userId!) });
  } catch (e) { fail(res, e); }
});

// ---- admin
storeAdminRouter.get('/items', (_req: Request, res: Response) => {
  const db = loadDb();
  res.json({ items: storeItems(db).slice().sort((a, b) => a.sort - b.sort) });
});

storeAdminRouter.put('/items/:id', async (req: Request, res: Response) => {
  const db = loadDb();
  try {
    const item = updateItem(db, req.params.id, req.body || {});
    void appendAudit(db, { actor: (req as any).userId || 'admin', action: 'store.item', detail: `${item.id}: ${JSON.stringify(req.body || {}).slice(0, 300)}` }).catch(() => undefined);
    safeSaveDb(db);
    res.json({ item });
  } catch (e) { fail(res, e); }
});

storeAdminRouter.get('/orders', (req: Request, res: Response) => {
  const db = loadDb();
  const status = String(req.query.status || '');
  const users = new Map<string, any>((db.users || []).map((u: any) => [u.id, u]));
  const rows = ordersOf(db).filter((o) => !status || o.status === status).slice().reverse().map((o) => ({ ...o, user: { name: users.get(o.user_id)?.name || '', email: users.get(o.user_id)?.email || '' } }));
  if (req.query.format === 'csv') {
    const cell = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const cols = ['id', 'created_at', 'status', 'item_name', 'size', 'coins', 'name', 'phone', 'line1', 'line2', 'city', 'state', 'pincode', 'email', 'courier', 'tracking'];
    const lines = rows.filter((o) => o.kind === 'physical').map((o) => [o.id, o.created_at, o.status, o.item_name, o.size, o.coins, o.address?.name, o.phone, o.address?.line1, o.address?.line2, o.address?.city, o.address?.state, o.address?.pincode, o.user.email, o.courier, o.tracking].map(cell).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tieedu-swag-orders-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send([cols.join(','), ...lines].join('\n'));
  }
  const counts: Record<string, number> = {};
  for (const o of ordersOf(db)) counts[o.status] = (counts[o.status] || 0) + 1;
  res.json({ orders: rows.slice(0, 300), counts });
});

storeAdminRouter.post('/orders/:id/status', async (req: Request, res: Response) => {
  const db = loadDb();
  try {
    const to = String(req.body?.status || '') as OrderStatus;
    const o = setOrderStatus(db, req.params.id, to, { id: (req as any).userId || 'admin', admin: true }, { note: req.body?.note, courier: req.body?.courier, tracking: req.body?.tracking });
    void appendAudit(db, { actor: (req as any).userId || 'admin', action: 'store.order', detail: `${o.id} → ${to}` }).catch(() => undefined);
    safeSaveDb(db);
    res.json({ order: o, item: itemById(db, o.item_id) });
  } catch (e) { fail(res, e); }
});
