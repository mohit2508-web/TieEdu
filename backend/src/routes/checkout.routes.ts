import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { requireAuth } from '../middleware/auth';
import { getGateway, verifyRazorpaySignature, CreatedOrder } from '../payments/gateway';
import { effectivePaymentMode } from '../config';
import { completePaidOrder, pushAudit, unlockedCompanyIds } from '../payments/orders';

export const checkoutRouter = Router();

// Checkout requires a real logged-in account — no anonymous orders, no spoofable user_id.
checkoutRouter.use(requireAuth);

interface CartItem {
  id?: string;
  company_id?: string;
  slug?: string;
  scope?: string;
  price?: number;
  name?: string;
  kind?: 'company' | 'plan';
  module_id?: string;
  module_title?: string;
  round_type?: string;
  module_ids?: string[];
}

// Combo ladder: unique premium modules bought for one company -> pack price
const PACK_LADDER: Record<number, number> = { 1: 99, 2: 169, 3: 219 };
const SINGLE_MODULE_PRICE = 99;
const COMPLETE_PACK_PRICE = 249;
const COMPLETE_PACK_COUNT = 4;

function packPrice(uniqueModuleCount: number): number {
  if (uniqueModuleCount >= COMPLETE_PACK_COUNT) return COMPLETE_PACK_PRICE;
  return PACK_LADDER[uniqueModuleCount] ?? uniqueModuleCount * SINGLE_MODULE_PRICE;
}

// Summarizes ladder pricing (server-authoritative): subtotal + savings text
export function summarizePack(items: CartItem[]) {
  const perCompany: Record<string, { id: string; name: string; moduleIds: Set<string>; isComplete: boolean }> = {};

  for (const it of items) {
    if (it.kind === 'plan') continue;
    const id = it.id || it.company_id || it.slug || 'unknown';
    const c = perCompany[id] || (perCompany[id] = { id, name: it.name || it.slug || 'Vault', moduleIds: new Set(), isComplete: false });
    if (Array.isArray(it.module_ids) && it.module_ids.length > 0) {
      it.module_ids.forEach((m) => c.moduleIds.add(m));
      c.isComplete = true;
    } else if (it.module_id) {
      c.moduleIds.add(it.module_id);
    } else {
      c.isComplete = true; // plain company line = every round
    }
  }

  let subtotal = 0;
  let listTotal = 0;
  const savingsByCompany: string[] = [];
  for (const c of Object.values(perCompany)) {
    const n = c.isComplete ? Math.max(c.moduleIds.size, COMPLETE_PACK_COUNT) : c.moduleIds.size;
    const listPrice = n * SINGLE_MODULE_PRICE;
    const pack = packPrice(n);
    const savings = Math.max(0, listPrice - pack);
    subtotal += pack;
    listTotal += listPrice;
    if (savings > 0) savingsByCompany.push(`Pack savings on ${c.name}: ₹${savings}`);
  }

  return { subtotal, listTotal, savingsTotal: Math.max(0, listTotal - subtotal), savingsByCompany };
}

// Compute discount for a coupon against a subtotal (single source of truth)
function computeDiscount(coupon: any, subtotal: number) {
  if (!coupon || !coupon.is_active) return 0;
  if (coupon.max_uses > 0 && coupon.uses >= coupon.max_uses) return 0;
  if (coupon.discount_percent && coupon.discount_percent > 0) {
    return Math.round(subtotal * coupon.discount_percent) / 100;
  }
  return coupon.discount_flat || 0;
}

// GET /api/checkout/payment-info — merchant UPI details shown on the payment screen
checkoutRouter.get('/payment-info', (req: Request, res: Response) => {
  const db = loadDb();
  const s = db.settings || {};
  res.json({
    mode: effectivePaymentMode(db),
    upi_id: s.upi_id || '',
    upi_qr: s.upi_qr || '',
    merchant_name: s.merchant_name || 'TieEdu',
    instructions: s.upi_instructions || 'Scan with any UPI app (Paytm, GPay, PhonePe) and transfer the exact amount.',
  });
});

// GET /api/checkout/coupons — Active coupon codes (for checkout UI chips)
checkoutRouter.get('/coupons', (req: Request, res: Response) => {
  const db = loadDb();
  res.json((db.coupons || []).filter((c: any) => c.is_active).map((c: any) => ({
    id: c.id,
    code: c.code,
    label: c.label || c.code
  })));
});

// POST /api/checkout/validate-coupon — Validate code against server-side coupons
checkoutRouter.post('/validate-coupon', (req: Request, res: Response) => {
  const db = loadDb();
  const code = (req.body.code || '').trim().toUpperCase();
  const subtotal = Number(req.body.subtotal) || 0;

  if (!code) return res.json({ valid: false, discount: 0, message: 'Enter a coupon code' });

  const coupon = (db.coupons || []).find((c: any) => c.code === code);
  if (!coupon) {
    return res.json({ valid: false, discount: 0, message: 'Invalid or expired coupon code' });
  }
  if (!coupon.is_active) {
    return res.json({ valid: false, discount: 0, message: 'Coupon is no longer active' });
  }
  if (coupon.max_uses > 0 && coupon.uses >= coupon.max_uses) {
    return res.json({ valid: false, discount: 0, message: 'Coupon usage limit reached' });
  }

  const discount = Math.min(computeDiscount(coupon, subtotal), subtotal);
  res.json({
    valid: true,
    discount,
    code,
    label: coupon.label,
    message: discount > 0 ? 'Coupon applied' : 'Coupon applied (no discount on this cart)'
  });
});

// POST /api/checkout/create-order — Persist a real order for the active gateway.
// UPI orders start in 'created' (awaiting payment); razorpay calls the provider first.
checkoutRouter.post('/create-order', async (req: Request, res: Response) => {
  const db = loadDb();
  const { amount, items = [], coupon_code } = req.body;
  const user_id = req.user!.id;

  // Server-authoritative subtotal via combo ladder
  const pack = summarizePack(items as CartItem[]);
  const hasLadderableItems = items.some((it: CartItem) => it.kind !== 'plan');
  const subtotal = hasLadderableItems ? pack.subtotal : Number(amount) || pack.subtotal;

  let appliedCoupon: any = null;
  let discount = 0;
  const code = (coupon_code || '').trim().toUpperCase();
  if (code) {
    appliedCoupon = (db.coupons || []).find((c: any) => c.code === code);
    if (appliedCoupon) discount = computeDiscount(appliedCoupon, subtotal);
  }

  const total = Math.max(0, subtotal - discount);
  const mode = effectivePaymentMode(db);
  const order_id = `order_${mode === 'razorpay' ? 'rzp' : 'upi'}_${Date.now()}`;

  const order: any = {
    id: order_id,
    entity: 'order',
    amount_paisa: Math.round(total * 100),
    base_amount_paisa: Math.round(subtotal * 100),
    discount_paisa: Math.round(discount * 100),
    currency: 'INR',
    status: 'created',
    user_id,
    coupon_code: appliedCoupon?.code || null,
    items: items.map((it: CartItem) => ({
      kind: it.kind || (it.slug ? 'company' : 'plan'),
      id: it.id || it.company_id || it.slug || it.scope || 'unknown',
      name: it.name || it.slug || 'Vault',
      price: it.kind === 'plan' ? it.price || 0 : (Array.isArray(it.module_ids) && it.module_ids.length > 0 ? COMPLETE_PACK_PRICE : it.price || SINGLE_MODULE_PRICE),
      module_id: it.module_id,
      module_title: it.module_title,
      round_type: it.round_type,
      module_ids: it.module_ids
    })),
    pack_subtotal: pack.subtotal,
    list_total: pack.listTotal,
    pack_savings: pack.savingsTotal,
    created_at: new Date().toISOString()
  };

  // Gateway round-trip for razorpay BEFORE persisting (no phantom orders).
  let created: CreatedOrder;
  try {
    created = await getGateway(mode).createOrder({
      order_id,
      amount_paisa: order.amount_paisa,
      currency: order.currency,
    });
  } catch (e: any) {
    return res.status(502).json({ error: `Payment gateway unavailable: ${e?.message || 'unknown'}` });
  }
  order.gateway = created.gateway;
  order.gateway_order_id = created.gateway_order_id;

  if (!db.orders) db.orders = [];
  db.orders.push(order);
  pushAudit(db, {
    actor: user_id,
    action: 'order.created',
    detail: `${total} INR via ${created.gateway}`,
    order_id: order.id,
    gateway: created.gateway,
  });
  saveDb(db);

  res.json({
    id: order.id,
    amount: total,
    amount_paisa: order.amount_paisa,
    currency: 'INR',
    status: 'created',
    discount,
    coupon_code: appliedCoupon?.code || null,
    gateway: created.gateway,
    gateway_order_id: created.gateway_order_id,
    key_id: created.key_id || undefined,
    created_at: order.created_at
  });
});

// POST /api/checkout/confirm-payment — UPI flow: user says they completed the transfer.
// Order moves to 'awaiting_verification'; it unlocks ONLY after an admin verifies it.
checkoutRouter.post('/confirm-payment', (req: Request, res: Response) => {
  const db = loadDb();
  const { order_id } = req.body;
  const user_id = req.user!.id;

  const order = (db.orders || []).find((o: any) => o.id === order_id && o.user_id === user_id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.gateway === 'razorpay') {
    return res.status(400).json({ error: 'Razorpay orders complete via webhook/signature automatically' });
  }
  if (order.status === 'paid') {
    return res.json({ status: 'paid', message: 'Order already paid', unlocked_company_ids: unlockedCompanyIds(db, user_id) });
  }
  if (order.status === 'awaiting_verification') {
    return res.json({ status: 'awaiting_verification', message: 'Payment already awaiting verification' });
  }

  order.status = 'awaiting_verification';
  order.payment_confirmed_at = new Date().toISOString();
  pushAudit(db, {
    actor: user_id,
    action: 'order.payment_confirmed',
    detail: `UPI payment confirmed for ${order.id} — awaiting admin verification`,
    order_id: order.id,
    gateway: 'upi',
  });
  saveDb(db);
  res.json({ status: 'awaiting_verification', message: 'Payment received — verification in progress', order });
});

// GET /api/checkout/order/:orderId/status — Live status for the paying user.
// The FE polls this; when an admin verifies, the client flips to the unlocked state itself.
checkoutRouter.get('/order/:orderId/status', (req: Request, res: Response) => {
  const db = loadDb();
  const user_id = req.user!.id;
  const order = (db.orders || []).find((o: any) => o.id === req.params.orderId && o.user_id === user_id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const safe: any = {
    order_id: order.id,
    status: order.status,
    gateway: order.gateway,
    amount_paisa: order.amount_paisa,
    paid_at: order.paid_at || null,
    rejected_at: order.rejected_at || null,
    reject_reason: order.reject_reason || null,
  };
  if (order.status === 'created') {
    const s = db.settings || {};
    safe.upi_id = s.upi_id || '';
    safe.upi_qr = s.upi_qr || '';
    safe.merchant_name = s.merchant_name || 'TieEdu';
    safe.instructions = s.upi_instructions || 'Scan with any UPI app (Paytm, GPay, PhonePe) and transfer the exact amount.';
  }
  if (order.status === 'paid') {
    safe.unlocked_company_ids = unlockedCompanyIds(db, user_id);
  }
  res.json(safe);
});

// POST /api/checkout/complete — retained only for any legacy 'mock' orders; not used by UPI.
checkoutRouter.post('/complete', (req: Request, res: Response) => {
  return res.status(400).json({ error: 'This endpoint is no longer used. UPI orders are verified manually by our team.' });
});

// POST /api/checkout/verify — Real gateway verification (Razorpay signature check; UPI never reaches this)
checkoutRouter.post('/verify', (req: Request, res: Response) => {
  const db = loadDb();
  const { order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const user_id = req.user!.id;

  const order = (db.orders || []).find((o: any) => o.id === order_id && o.user_id === user_id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status === 'paid') {
    return res.json({ status: 'success', message: 'Order already paid', order, unlocked_company_ids: unlockedCompanyIds(db, user_id) });
  }

  const rzpOrderId = order.gateway_order_id || order_id;
  if (!verifyRazorpaySignature({ order_id: rzpOrderId, payment_id: razorpay_payment_id, signature: razorpay_signature })) {
    return res.status(400).json({ error: 'Payment signature verification failed' });
  }

  order.razorpay_payment_id = razorpay_payment_id;
  completePaidOrder(db, order, user_id);
  saveDb(db);
  res.json({ status: 'success', message: 'Payment verified & vault unlocked', order, unlocked_company_ids: unlockedCompanyIds(db, user_id) });
});