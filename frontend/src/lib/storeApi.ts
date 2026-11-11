import { apiFetch, API_BASE_URL } from './api';
import { API_ORIGIN } from './assetUrl';

/** The TiEEdu Store (backend routes/store.routes.ts). */
export interface StoreItemView {
  id: string; kind: 'digital' | 'physical'; action: 'repair' | 'coupon' | 'pack' | 'membership' | 'frame' | null;
  name: string; blurb: string; coins: number; art: string; image: string | null;
  sizes: string[] | null; in_stock: boolean; sizes_in_stock: string[] | null; featured: boolean; limit_per_user: number | null; redeemed?: number;
  // Showcase (STORE_3D_SHOWCASE_AND_SPEED_PLAN.md §B2): 3D model key and the product detail.
  model: StoreModel | null; details: string; specs: Array<[string, string]>; in_box: string[];
  colors: Array<{ name: string; hex: string }>; size_chart: Array<{ size: string; chest_cm: number; length_cm: number }> | null;
  print_front: string | null; print_back: string | null; gallery: string[]; promo: boolean;
}
export type StoreModel = 'bottle' | 'mug' | 'tshirt' | 'hoodie' | 'cap' | 'stickers' | 'keychain' | 'notebook' | 'kit';
export interface StorePromo {
  items: Array<{ id: string; name: string; coins: number; model: StoreModel; image: string | null; in_stock: boolean; blurb: string }>;
  me: { coins: number; pace: number } | null;
}
export interface StoreView {
  items: StoreItemView[]; signed_in: boolean; coins?: number; /** Coins earned per day, last 14 days. */ pace?: number; swag_ok?: boolean; swag_reason?: string | null;
  repairable_days?: string[]; repairs_left?: number; pack_companies?: Array<{ slug: string; name: string; price: number }>; goal_item_id?: string | null;
  /** Streak rewards ready to claim for free. */
  claims?: Array<{ key: string; title: string; days: number; item: StoreItemView }>;
}
export type OrderStatus = 'placed' | 'approved' | 'packed' | 'shipped' | 'delivered' | 'rejected' | 'cancelled';
export interface Address { name: string; line1: string; line2?: string; city: string; state: string; pincode: string }
export interface StoreOrder {
  id: string; user_id: string; item_id: string; item_name: string; kind: 'digital' | 'physical'; size: string | null; coins: number;
  status: OrderStatus; address: Address | null; phone: string | null; courier: string | null; tracking: string | null;
  result: Record<string, string> | null; history: Array<{ status: OrderStatus; at: string; by: string; note?: string }>; created_at: string;
}
export interface StoreItemAdmin extends Omit<StoreItemView, 'in_stock' | 'sizes_in_stock' | 'redeemed' | 'action' | 'model' | 'details' | 'specs' | 'in_box' | 'colors' | 'size_chart' | 'gallery' | 'promo'> {
  action?: string; stock?: Record<string, number>; active: boolean; sort: number;
  details?: string; specs?: Array<[string, string]>; in_box?: string[]; colors?: Array<{ name: string; hex: string }>; gallery?: string[]; promo?: boolean; model?: StoreModel | null;
  /** What students see for the showcase fields. */
  shown?: Pick<StoreItemView, 'model' | 'details' | 'specs' | 'in_box' | 'colors' | 'print_front' | 'print_back' | 'gallery' | 'promo'>;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const fetchStore = () => call<StoreView>('/store');
export const fetchStorePromo = () => call<StorePromo>('/store/promo');
/** Uploaded store media are stored as /api/store/media/…; resolve them against the API origin. */
export const mediaUrl = (u: string | null | undefined) => (!u ? null : u.startsWith('/api/') ? `${API_ORIGIN}${u}` : u);
export async function uploadStoreMedia(file: File): Promise<string> {
  const fd = new FormData(); fd.append('file', file);
  const r = await call<{ url: string }>('/admin/store/media', { method: 'POST', body: fd });
  return r.url;
}
export const setStorePromo = (on: boolean) => call<{ on: boolean }>('/admin/store/promo', json('PUT', { on }));
export const redeemItem = (body: { item_id: string; size?: string; address?: Address; phone?: string; company_slug?: string; day?: string; claim?: string }) =>
  call<{ order: StoreOrder; coins: number }>('/store/redeem', json('POST', body));
export const fetchMyOrders = () => call<{ orders: StoreOrder[] }>('/store/orders');
export const cancelOrder = (id: string) => call<{ order: StoreOrder; coins: number }>(`/store/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST' });

// admin
export const fetchStoreItemsAdmin = () => call<{ items: StoreItemAdmin[]; promo_off: boolean }>('/admin/store/items');
export const saveStoreItem = (id: string, patch: Partial<StoreItemAdmin>) => call<{ item: StoreItemAdmin }>(`/admin/store/items/${encodeURIComponent(id)}`, json('PUT', patch));
export const fetchStoreOrdersAdmin = (status = '') => call<{ orders: Array<StoreOrder & { user: { name: string; email: string } }>; counts: Record<string, number> }>(`/admin/store/orders${status ? `?status=${status}` : ''}`);
export const moveStoreOrder = (id: string, body: { status: OrderStatus; note?: string; courier?: string; tracking?: string }) =>
  call<{ order: StoreOrder }>(`/admin/store/orders/${encodeURIComponent(id)}/status`, json('POST', body));
export const storeOrdersCsvUrl = () => `${API_BASE_URL}/admin/store/orders?format=csv`;

export const ORDER_LABEL: Record<OrderStatus, string> = {
  placed: 'Order placed', approved: 'Approved', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', rejected: 'Rejected (coins refunded)', cancelled: 'Cancelled (coins refunded)',
};
