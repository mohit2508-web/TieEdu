import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { requireAuth } from '../middleware/auth';
import { getGateway, verifyRazorpaySignature, CreatedOrder } from '../payments/gateway';
import { effectivePaymentMode } from '../config';
import { completePaidOrder, unlockedCompanyIds, ownedModuleIdsFor, ownedCourseIdsFor } from '../payments/orders';
import { appendAudit } from '../store/audit';
import { SINGLE_MODULE_PRICE, COMPLETE_PACK_COUNT, packPrice, listPriceFor } from '../lib/pricing';

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
  kind?: 'company' | 'plan' | 'course';
  module_id?: string;
  module_title?: string;
  round_type?: string;
  module_ids?: string[];
  /** `kind: 'course'` only. Falls back to `id`, which holds the course id. */
  course_id?: string;
}

// Pricing ladder lives in lib/pricing.ts (single source of truth, shared with
// GET /api/pricing/catalog) — never re-declare the numbers here.

// Summarizes ladder pricing (server-authoritative): subtotal + savings text.
// `byCompany` carries the per-company module count + the exact pack price charged,
// so persisted order lines can be stamped with the price actually billed (never a
// client-supplied or hardcoded number).
export function summarizePack(items: CartItem[]) {
  const perCompany: Record<string, { id: string; name: string; moduleIds: Set<string>; isComplete: boolean }> = {};

  for (const it of items) {
    // Plan lines are billed outside this ladder, and course lines are priced
    // from the course catalogue by `summarizeCourseLines` instead.
    if (it.kind === 'plan' || it.kind === 'course') continue;
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
  const byCompany: Record<string, { name: string; module_count: number; pack_price: number; list_total: number; savings: number }> = {};

  for (const c of Object.values(perCompany)) {
    // A plain company line (no module ids) = every round; array pack lines =
    // exactly the modules listed (e.g. a "finish your pack" with 2 left -> Rs 169).
    const n = c.isComplete && c.moduleIds.size === 0 ? COMPLETE_PACK_COUNT : c.moduleIds.size;
    const listPrice = listPriceFor(n);
    const pack = packPrice(n);
    const savings = Math.max(0, listPrice - pack);
    subtotal += pack;
    listTotal += listPrice;
    byCompany[c.id] = { name: c.name, module_count: n, pack_price: pack, list_total: listPrice, savings };
    if (savings > 0) savingsByCompany.push(`Pack savings on ${c.name}: ₹${savings}`);
  }

  return { subtotal, listTotal, savingsTotal: Math.max(0, listTotal - subtotal), savingsByCompany, byCompany };
}

/**
 * Resolves `kind: 'course'` cart lines against the course catalogue.
 *
 * A course is priced per course, not by the module-pack ladder, so it cannot go
 * through `summarizePack`. The price always comes from the stored course record
 * — never from the cart line — because a client that could name its own price
 * could buy a ₹4,999 course for ₹1.
 *
 * Free courses are dropped rather than billed at zero: they are meant to be
 * enrolled in directly, and a ₹0 line in a real order is just noise on the
 * receipt.
 */
function summarizeCourseLines(db: any, items: CartItem[]) {
  const lines: { course_id: string; slug: string; title: string; price: number }[] = [];
  const seen = new Set<string>();
  let subtotal = 0;

  for (const it of items) {
    if (it.kind !== 'course') continue;
    const wanted = it.course_id || it.id || '';
    const course = (db.courses || []).find(
      (c: any) => c.id === wanted || (!!it.slug && c.slug === it.slug)
    );
    // Unknown course: dropped rather than rejected, so a stale cart line cannot
    // block checkout of everything else in the basket.
    if (!course) continue;
    if (course.is_free) continue;
    const price = Math.max(0, Number(course.price_inr) || 0);
    if (price === 0) continue;
    if (seen.has(course.id)) continue;
    seen.add(course.id);

    lines.push({ course_id: course.id, slug: course.slug, title: course.title, price });
    subtotal += price;
  }

  return { lines, subtotal };
}

/** Order lines for course purchases, in the same shape as `buildOrderLines`. */
function buildCourseOrderLines(courses: { course_id: string; slug: string; title: string; price: number }[]) {
  return courses.map((c) => ({
    kind: 'course' as const,
    id: c.course_id,
    course_id: c.course_id,
    name: c.title,
    price: c.price,
  }));
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

/**
 * Builds the persisted order lines so that the receipt is arithmetically honest:
 *   sum(line.price) === pack.subtotal   and   sum(line.list_total) - sum(line.pack_savings) === subtotal
 *
 * A company's pack is priced ONCE for the whole company, so only the FIRST line of that
 * company carries the pack price; the remaining lines are marked `included_in_pack: true`
 * with price 0. Previously every line was stamped with a flat price, so an order for a
 * 2-module pack (charged Rs 169) could show two Rs 99 lines that did not add up.
 */
function buildOrderLines(items: CartItem[], byCompany: Record<string, { module_count: number; pack_price: number; list_total: number; savings: number }>) {
  const pricedCompanies = new Set<string>();
  const seenLines = new Map<string, number>();

  return items
    // Course lines are billed by `buildCourseOrderLines`. Passing them through
    // here as well would stamp a pack price on them too and the receipt would
    // show the course twice.
    .filter((it: CartItem) => it.kind !== 'course')
    .map((it: CartItem) => {
    const kind = it.kind || (it.slug ? 'company' : 'plan');
    const lineId = it.id || it.company_id || it.slug || it.scope || 'unknown';
    const lineNo = (seenLines.get(lineId) || 0) + 1;
    seenLines.set(lineId, lineNo);

    if (kind === 'plan') {
      return {
        kind,
        id: lineId,
        name: it.name || it.slug || 'Vault',
        price: it.price || 0,
        module_id: it.module_id,
        module_title: it.module_title,
        round_type: it.round_type,
        module_ids: it.module_ids,
      };
    }

    const bucket = byCompany[lineId];
    const isFirstLineOfCompany = !pricedCompanies.has(lineId);
    pricedCompanies.add(lineId);

    return {
      kind,
      id: lineId,
      name: it.name || it.slug || 'Vault',
      // The pack price is billed once per company, on its first line only.
      price: isFirstLineOfCompany ? (bucket?.pack_price ?? SINGLE_MODULE_PRICE) : 0,
      included_in_pack: !isFirstLineOfCompany,
      module_id: it.module_id,
      module_title: it.module_title,
      round_type: it.round_type,
      module_ids: it.module_ids,
      // Auditable pricing breakdown for this company's pack on this order.
      module_count: bucket?.module_count ?? (it.module_id ? 1 : 0),
      list_total: bucket?.list_total ?? 0,
      pack_savings: bucket?.savings ?? 0,
    };
    });
}

// POST /api/checkout/create-order — Persist a real order for the active gateway.
// UPI orders start in 'created' (awaiting payment); razorpay calls the provider first.
checkoutRouter.post('/create-order', async (req: Request, res: Response) => {
  const db = loadDb();
  const { amount, items = [], coupon_code } = req.body;
  const user_id = req.user!.id;

  // Drop anything the user already owns (company fully unlocked, module already
  // bought, or course already paid for).
  const ownedModuleIds = ownedModuleIdsFor(db, user_id);
  const ownedCompanyIds = new Set(unlockedCompanyIds(db, user_id));
  const ownedCourseIds = new Set(ownedCourseIdsFor(db, user_id));
  const unowned: CartItem[] = (items as CartItem[] || []).filter((it: CartItem) => {
    if (it.kind === 'plan') return true;
    if (it.kind === 'course') return !ownedCourseIds.has(it.course_id || it.id || '');
    const companyId = it.id || it.company_id || it.slug || '';
    if (ownedCompanyIds.has(companyId)) return false;
    if (Array.isArray(it.module_ids) && it.module_ids.length > 0) {
      return it.module_ids.some((m: string) => !ownedModuleIds.includes(m)) as unknown as boolean;
    }
    if (it.module_id) return !ownedModuleIds.includes(it.module_id);
    return true; // plain company line — not an owned company, keep
  });

  if (unowned.length === 0) {
    return res.status(400).json({ error: 'You already own everything in this cart — nothing to buy here.' });
  }

  // Server-authoritative subtotal: the pack ladder for vault lines, the course
  // catalogue for course lines.
  //
  // The `amount` in the request body is a client claim and is only ever consulted
  // for a plan-only cart, which has no server-side price table. That is a narrow
  // exception and it must stay narrow: as soon as ANY line in the cart resolves
  // against a catalogue record, the total comes from the catalogue alone.
  //
  // The trap this closes: a cart of one free course resolves to no priced lines
  // at all, so a `courses.subtotal > 0 ? ... : Number(amount)` ladder falls
  // through to the client figure and happily charges Rs 500 for a free course.
  // Testing for the PRESENCE of course lines rather than the value of their sum
  // is what makes that impossible.
  const pack = summarizePack(unowned as CartItem[]);
  const courses = summarizeCourseLines(db, unowned as CartItem[]);
  const hasCourseLines = unowned.some((it: CartItem) => it.kind === 'course');
  const hasLadderableItems = unowned.some((it: CartItem) => it.kind !== 'plan' && it.kind !== 'course');

  const subtotal = hasLadderableItems || hasCourseLines
    ? pack.subtotal + courses.subtotal
    : Number(amount) || pack.subtotal;

  if (hasCourseLines && courses.lines.length === 0) {
    return res.status(400).json({
      error: 'No purchasable course in this cart — free and already-owned courses are not for sale.',
    });
  }

  if (subtotal <= 0) {
    return res.status(400).json({ error: 'Nothing in this cart costs anything.' });
  }

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
    items: [...buildOrderLines(unowned, pack.byCompany), ...buildCourseOrderLines(courses.lines)],
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
  await appendAudit(db, {
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
checkoutRouter.post('/confirm-payment', async (req: Request, res: Response) => {
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
  await appendAudit(db, {
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
checkoutRouter.post('/verify', async (req: Request, res: Response) => {
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
  await completePaidOrder(db, order, user_id);
  saveDb(db);
  res.json({ status: 'success', message: 'Payment verified & vault unlocked', order, unlocked_company_ids: unlockedCompanyIds(db, user_id) });
});