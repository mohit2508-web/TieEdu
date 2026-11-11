// ============================================================================
// The TiEEdu Store (TIE_COINS_STORE_PLAN.md §4): spend TiE Coins on digital
// rewards (delivered at once) and TiEEdu swag (an order an admin ships).
//
// Rules:
//  - The catalogue is data (db.store_items), seeded from DEFAULT_ITEMS once and
//    then owned by admins. Prices are read from the item, never from a request.
//  - Paying is a coin_ledger spend keyed on the order id; a rejected or
//    cancelled order is refunded with a new row keyed `refund:<order>`.
//  - Physical items need stock, an address and phone, an email-verified account
//    and an account at least PHYSICAL_MIN_AGE_DAYS old (anti-farming).
// ============================================================================
import crypto from 'crypto';
import { balanceOf, grant, spend, CoinError } from './coins';
import { repairStreakDay } from './streak';
import { istDate } from './streak';
import { packPrice } from './pricing';
import { SET_BY_SLUG } from './practice/bank';

export type StoreAction = 'repair' | 'coupon' | 'pack' | 'membership' | 'frame';
export interface StoreItem {
  id: string;
  kind: 'digital' | 'physical';
  action?: StoreAction;
  name: string;
  blurb: string;
  coins: number;
  /** Illustration key (frontend SwagArt) used until an admin uploads a photo. */
  art: string;
  image?: string | null;
  sizes?: string[];
  /** Units left, per size (or 'one'). Physical only. */
  stock?: Record<string, number>;
  /** Most of this item one student can redeem (lifetime); repairs use their monthly rule instead. */
  limit_per_user?: number;
  value?: { flat?: number; days?: number; frame?: 'bronze' | 'silver' | 'gold' };
  active: boolean;
  featured?: boolean;
  sort: number;
}

export const PHYSICAL_MIN_AGE_DAYS = 30;

/** Plan §4 with the owner's choices: C2 starts with stickers, mug, bottle, T-shirt and the welcome kit; the rest wait (inactive). Stock 0 until the vendor is ready. */
export const DEFAULT_ITEMS: StoreItem[] = [
  { id: 'repair', kind: 'digital', action: 'repair', name: 'Streak Repair', blurb: 'Fill one missed day this month and keep your streak. Up to 3 a month.', coins: 60, art: 'repair', active: true, featured: true, sort: 1 },
  { id: 'frame-bronze', kind: 'digital', action: 'frame', name: 'Bronze profile frame', blurb: 'A bronze ring on your name on the leaderboard and profile.', coins: 150, art: 'frame-bronze', value: { frame: 'bronze' }, limit_per_user: 1, active: true, sort: 10 },
  { id: 'frame-silver', kind: 'digital', action: 'frame', name: 'Silver profile frame', blurb: 'A silver ring on your name on the leaderboard and profile.', coins: 400, art: 'frame-silver', value: { frame: 'silver' }, limit_per_user: 1, active: true, sort: 11 },
  { id: 'frame-gold', kind: 'digital', action: 'frame', name: 'Gold profile frame', blurb: 'A gold ring on your name on the leaderboard and profile.', coins: 900, art: 'frame-gold', value: { frame: 'gold' }, limit_per_user: 1, active: true, sort: 12 },
  { id: 'coupon-50', kind: 'digital', action: 'coupon', name: '₹50 off any course', blurb: 'A single-use coupon code for any TiEEdu course.', coins: 600, art: 'coupon', value: { flat: 50 }, active: true, sort: 20 },
  { id: 'company-pack', kind: 'digital', action: 'pack', name: 'One company pack', blurb: 'Unlock every locked problem, solution and test of one company.', coins: 1500, art: 'pack', active: true, featured: true, sort: 30 },
  { id: 'membership-30', kind: 'digital', action: 'membership', name: '30 days of TiEEdu membership', blurb: 'Member lessons, extra mock attempts and internship applications for 30 days.', coins: 2000, art: 'membership', value: { days: 30 }, active: true, featured: true, sort: 31 },
  { id: 'stickers', kind: 'physical', name: 'Sticker pack', blurb: 'TiEEdu logo, "Brain on" and "Accepted ✓" stickers for your laptop.', coins: 600, art: 'stickers', stock: { one: 0 }, limit_per_user: 2, active: true, sort: 100 },
  { id: 'keychain', kind: 'physical', name: 'Metal brain keychain', blurb: 'The TiEEdu brain in brushed metal.', coins: 1200, art: 'keychain', stock: { one: 0 }, limit_per_user: 1, active: false, sort: 101 },
  { id: 'mug', kind: 'physical', name: 'Coffee mug', blurb: '"// compiled at 2 AM", with the TiEEdu logo.', coins: 2500, art: 'mug', stock: { one: 0 }, limit_per_user: 1, active: true, featured: true, sort: 102 },
  { id: 'notebook', kind: 'physical', name: 'Placement notebook', blurb: 'Dot grid, with a Big-O cheat sheet inside the cover.', coins: 3000, art: 'notebook', stock: { one: 0 }, limit_per_user: 1, active: false, sort: 103 },
  { id: 'bottle', kind: 'physical', name: 'Steel water bottle', blurb: 'Insulated steel bottle with the TiEEdu logo.', coins: 4000, art: 'bottle', stock: { one: 0 }, limit_per_user: 1, active: true, featured: true, sort: 104 },
  { id: 'cap', kind: 'physical', name: 'TiEEdu cap', blurb: 'Embroidered logo cap.', coins: 4500, art: 'cap', stock: { one: 0 }, limit_per_user: 1, active: false, sort: 105 },
  { id: 'tshirt', kind: 'physical', name: 'TiEEdu T-shirt', blurb: 'Soft cotton tee with the TiEEdu logo.', coins: 5500, art: 'tshirt', sizes: ['S', 'M', 'L', 'XL', 'XXL'], stock: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 }, limit_per_user: 1, active: true, featured: true, sort: 106 },
  { id: 'sleeve', kind: 'physical', name: 'Laptop sleeve', blurb: 'Padded 15" sleeve with the TiEEdu logo.', coins: 7000, art: 'sleeve', stock: { one: 0 }, limit_per_user: 1, active: false, sort: 107 },
  { id: 'kit', kind: 'physical', name: 'TiEEdu welcome kit', blurb: 'Bottle, notebook, stickers and keychain in a TiEEdu box.', coins: 9500, art: 'kit', stock: { one: 0 }, limit_per_user: 1, active: true, featured: true, sort: 108 },
  { id: 'hoodie', kind: 'physical', name: 'TiEEdu hoodie', blurb: 'Heavy cotton hoodie with the TiEEdu logo.', coins: 10000, art: 'hoodie', sizes: ['S', 'M', 'L', 'XL', 'XXL'], stock: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 }, limit_per_user: 1, active: false, sort: 109 },
  { id: 'backpack', kind: 'physical', name: 'TiEEdu backpack', blurb: 'Laptop backpack with the TiEEdu logo.', coins: 15000, art: 'backpack', stock: { one: 0 }, limit_per_user: 1, active: false, sort: 110 },
];

export function storeItems(db: any): StoreItem[] {
  if (!Array.isArray(db.store_items)) db.store_items = DEFAULT_ITEMS.map((i) => JSON.parse(JSON.stringify(i)));
  return db.store_items;
}
export const itemById = (db: any, id: string) => storeItems(db).find((i) => i.id === id) || null;

export type OrderStatus = 'placed' | 'approved' | 'packed' | 'shipped' | 'delivered' | 'rejected' | 'cancelled';
export interface Address { name: string; line1: string; line2?: string; city: string; state: string; pincode: string }
export interface StoreOrder {
  id: string; user_id: string; item_id: string; item_name: string; kind: 'digital' | 'physical'; size: string | null; coins: number;
  status: OrderStatus; address: Address | null; phone: string | null; courier: string | null; tracking: string | null;
  /** What a digital item produced: coupon code, company, repaired day, membership end, frame. */
  result: Record<string, string> | null;
  history: Array<{ status: OrderStatus; at: string; by: string; note?: string }>;
  created_at: string;
}
export function ordersOf(db: any): StoreOrder[] {
  if (!Array.isArray(db.store_orders)) db.store_orders = [];
  return db.store_orders;
}

export const stockLeft = (item: StoreItem, size: string | null) => (item.stock ? Number(item.stock[size || 'one'] ?? 0) : Infinity);
export const inStock = (item: StoreItem) => item.kind === 'digital' || Object.values(item.stock || {}).some((n) => Number(n) > 0);

/** Companies whose pack can be bought with coins: not free, and with premium modules or a locked practice set. */
export function packCompanies(db: any): Array<{ slug: string; name: string; price: number }> {
  return (db.companies || []).filter((c: any) => !c.is_free && ((c.modules || []).some((m: any) => m.is_premium) || SET_BY_SLUG.has(c.slug)))
    .map((c: any) => ({ slug: c.slug, name: c.name, price: packPrice((c.modules || []).filter((m: any) => m.is_premium).length) }));
}

const clean = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export interface RedeemInput { item_id?: unknown; size?: unknown; address?: any; phone?: unknown; company_slug?: unknown; day?: unknown }

/** Redeem an item. Validates everything first, then pays, then delivers (digital) or queues (physical). */
export function redeem(db: any, userId: string, input: RedeemInput, now = new Date()): StoreOrder {
  const item = itemById(db, String(input.item_id || ''));
  if (!item || !item.active) throw new CoinError(404, 'This item is not available');
  const user = (db.users || []).find((u: any) => u.id === userId);
  if (!user) throw new CoinError(404, 'Account not found');
  const mine = ordersOf(db).filter((o) => o.user_id === userId && o.item_id === item.id && !['rejected', 'cancelled'].includes(o.status));
  if (item.limit_per_user && mine.length >= item.limit_per_user) throw new CoinError(409, item.limit_per_user === 1 ? 'You already have this one' : `You can redeem this ${item.limit_per_user} times`);
  if (balanceOf(db, userId) < item.coins) throw new CoinError(402, `You need ${item.coins - balanceOf(db, userId)} more TiE Coins`);

  let size: string | null = null;
  let address: Address | null = null;
  let phone: string | null = null;
  if (item.kind === 'physical') {
    if (!user.email_verified) throw new CoinError(403, 'Verify your email before ordering swag');
    const ageDays = (now.getTime() - new Date(user.created_at || now).getTime()) / 86_400_000;
    if (ageDays < PHYSICAL_MIN_AGE_DAYS) throw new CoinError(403, `Swag opens ${PHYSICAL_MIN_AGE_DAYS} days after you join. Keep practising.`);
    if (item.sizes?.length) {
      size = clean(input.size, 8);
      if (!item.sizes.includes(size)) throw new CoinError(400, 'Choose a size');
    }
    if (stockLeft(item, size) <= 0) throw new CoinError(409, 'Out of stock right now');
    const a = input.address || {};
    address = { name: clean(a.name, 80), line1: clean(a.line1, 160), line2: clean(a.line2, 160), city: clean(a.city, 60), state: clean(a.state, 60), pincode: clean(a.pincode, 6) };
    if (!address.name || !address.line1 || !address.city || !address.state) throw new CoinError(400, 'Fill in your delivery address');
    if (!/^[1-9]\d{5}$/.test(address.pincode)) throw new CoinError(400, 'Enter a 6-digit PIN code');
    phone = clean(input.phone, 15).replace(/[\s-]/g, '');
    if (!/^(\+91)?[6-9]\d{9}$/.test(phone)) throw new CoinError(400, 'Enter a 10-digit Indian mobile number');
  }

  // Digital pre-checks (before paying).
  let company: { slug: string; name: string } | null = null;
  const day = clean(input.day, 10);
  if (item.action === 'pack') {
    const slug = clean(input.company_slug, 80);
    const c = (db.companies || []).find((x: any) => x.slug === slug);
    if (!c || !packCompanies(db).some((p) => p.slug === slug)) throw new CoinError(400, 'Choose a company');
    if ((db.unlocks || []).some((u: any) => u.user_id === userId && u.company_id === c.id && u.status === 'active')) throw new CoinError(409, `You already have the ${c.name} pack`);
    company = { slug, name: c.name };
  }
  if (item.action === 'repair') {
    // Dry run on a copy, so a day that cannot be repaired never costs coins.
    const copy = { users: [], user_streaks: JSON.parse(JSON.stringify(db.user_streaks || [])) };
    try { repairStreakDay(copy, userId, day, now); } catch (e) { throw new CoinError(400, (e as Error).message); }
  }

  const id = `ord-${now.getTime()}-${crypto.randomBytes(3).toString('hex')}`;
  spend(db, userId, `spend:${id}`, item.coins, `${item.name}${size ? ` (${size})` : ''}`, id);

  const order: StoreOrder = {
    id, user_id: userId, item_id: item.id, item_name: item.name, kind: item.kind, size, coins: item.coins,
    status: item.kind === 'digital' ? 'delivered' : 'placed', address, phone, courier: null, tracking: null, result: null,
    history: [{ status: item.kind === 'digital' ? 'delivered' : 'placed', at: now.toISOString(), by: userId }], created_at: now.toISOString(),
  };

  if (item.kind === 'physical') {
    if (item.stock) item.stock[size || 'one'] = stockLeft(item, size) - 1;
  } else if (item.action === 'repair') {
    const r = repairStreakDay(db, userId, day, now);
    if (!Array.isArray(db.streak_repairs)) db.streak_repairs = [];
    db.streak_repairs.push({ user_id: userId, day, at: now.toISOString(), order_id: id });
    order.result = { day, streak: String(r.current) };
  } else if (item.action === 'coupon') {
    let code = '';
    for (let i = 0; i < 10 && !code; i++) {
      const c = `TIECOIN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      if (!(db.coupons || []).some((x: any) => x.code === c)) code = c;
    }
    if (!Array.isArray(db.coupons)) db.coupons = [];
    db.coupons.push({ id: `coup-coins-${id}`, code, discount_percent: 0, discount_flat: item.value?.flat || 50, is_active: true, max_uses: 1, uses: 0, label: `TiE Coins: ${item.name}`, owner_user_id: userId });
    order.result = { coupon: code };
  } else if (item.action === 'pack' && company) {
    const c = (db.companies || []).find((x: any) => x.slug === company!.slug);
    if (!Array.isArray(db.unlocks)) db.unlocks = [];
    db.unlocks.push({ id: `unl-coins-${id}`, user_id: userId, company_id: c.id, status: 'active', source: 'coins', order_id: id, created_at: now.toISOString() });
    order.result = { company: company.name, slug: company.slug };
  } else if (item.action === 'membership') {
    const days = item.value?.days || 30;
    const cur = user.membership && user.membership.tier === 'member' && Date.parse(user.membership.expires_at) > now.getTime() ? Date.parse(user.membership.expires_at) : now.getTime();
    user.membership = { tier: 'member', source: 'coins', granted_at: user.membership?.granted_at || now.toISOString(), expires_at: new Date(cur + days * 86_400_000).toISOString() };
    order.result = { until: istDate(new Date(user.membership.expires_at)) };
  } else if (item.action === 'frame') {
    user.profile_frame = item.value?.frame || 'bronze';
    order.result = { frame: user.profile_frame };
  }
  ordersOf(db).push(order);
  return order;
}

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  placed: ['approved', 'rejected', 'cancelled'], approved: ['packed', 'rejected'], packed: ['shipped', 'rejected'],
  shipped: ['delivered'], delivered: [], rejected: [], cancelled: [],
};

/** Move an order along (admin), or cancel it (the student, while it is only placed). Rejected/cancelled orders refund the coins and the stock. */
export function setOrderStatus(db: any, orderId: string, to: OrderStatus, by: { id: string; admin: boolean }, extra: { note?: string; courier?: string; tracking?: string } = {}): StoreOrder {
  const o = ordersOf(db).find((x) => x.id === orderId);
  if (!o) throw new CoinError(404, 'Order not found');
  if (!by.admin && (o.user_id !== by.id || to !== 'cancelled')) throw new CoinError(403, 'Not allowed');
  if (!NEXT[o.status].includes(to)) throw new CoinError(409, `A ${o.status} order cannot become ${to}`);
  if (to === 'rejected' && !clean(extra.note, 300)) throw new CoinError(400, 'Say why it was rejected');
  if (to === 'shipped' && !clean(extra.tracking, 60)) throw new CoinError(400, 'Add the tracking number');
  o.status = to;
  if (extra.courier) o.courier = clean(extra.courier, 60);
  if (extra.tracking) o.tracking = clean(extra.tracking, 60);
  o.history.push({ status: to, at: new Date().toISOString(), by: by.id, ...(extra.note ? { note: clean(extra.note, 300) } : {}) });
  if (to === 'rejected' || to === 'cancelled') {
    grant(db, o.user_id, 'refund', `refund:${o.id}`, o.coins, `Refund: ${o.item_name}`, o.id);
    const item = itemById(db, o.item_id);
    if (item?.stock && o.kind === 'physical') item.stock[o.size || 'one'] = stockLeft(item, o.size) + 1;
  }
  return o;
}

/** Admin edit of an item: only known fields, sane values. */
export function updateItem(db: any, id: string, patch: any): StoreItem {
  let item = itemById(db, id);
  if (!item) {
    if (!/^[a-z0-9-]{2,40}$/.test(id)) throw new CoinError(400, 'Use a short id: lowercase letters, digits and dashes');
    item = { id, kind: patch?.kind === 'digital' ? 'digital' : 'physical', name: 'New item', blurb: '', coins: 1000, art: 'kit', stock: { one: 0 }, active: false, sort: 200 };
    storeItems(db).push(item);
  }
  if (typeof patch?.name === 'string' && patch.name.trim()) item.name = clean(patch.name, 80);
  if (typeof patch?.blurb === 'string') item.blurb = clean(patch.blurb, 240);
  if (Number.isFinite(Number(patch?.coins)) && Number(patch.coins) > 0) item.coins = Math.round(Number(patch.coins));
  if (typeof patch?.active === 'boolean') item.active = patch.active;
  if (typeof patch?.featured === 'boolean') item.featured = patch.featured;
  if (typeof patch?.image === 'string') item.image = clean(patch.image, 500) || null;
  if (Number.isFinite(Number(patch?.sort))) item.sort = Math.round(Number(patch.sort));
  if (patch?.limit_per_user === null || Number.isFinite(Number(patch?.limit_per_user))) item.limit_per_user = patch.limit_per_user === null ? undefined : Math.max(0, Math.round(Number(patch.limit_per_user))) || undefined;
  if (item.kind === 'physical' && patch?.stock && typeof patch.stock === 'object') {
    const keys = item.sizes?.length ? item.sizes : ['one'];
    item.stock = Object.fromEntries(keys.map((k) => [k, Math.max(0, Math.round(Number(patch.stock[k] ?? item!.stock?.[k] ?? 0)) || 0)]));
  }
  return item;
}
