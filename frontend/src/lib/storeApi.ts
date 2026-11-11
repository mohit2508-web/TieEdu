import { apiFetch, API_BASE_URL } from './api';

/** The TiEEdu Store (backend routes/store.routes.ts). */
export interface StoreItemView {
  id: string; kind: 'digital' | 'physical'; action: 'repair' | 'coupon' | 'pack' | 'membership' | 'frame' | null;
  name: string; blurb: string; coins: number; art: string; image: string | null;
  sizes: string[] | null; in_stock: boolean; sizes_in_stock: string[] | null; featured: boolean; limit_per_user: number | null; redeemed?: number;
}
export interface StoreView {
  items: StoreItemView[]; signed_in: boolean; coins?: number; swag_ok?: boolean; swag_reason?: string | null;
  repairable_days?: string[]; repairs_left?: number; pack_companies?: Array<{ slug: string; name: string; price: number }>;
}
export type OrderStatus = 'placed' | 'approved' | 'packed' | 'shipped' | 'delivered' | 'rejected' | 'cancelled';
export interface Address { name: string; line1: string; line2?: string; city: string; state: string; pincode: string }
export interface StoreOrder {
  id: string; user_id: string; item_id: string; item_name: string; kind: 'digital' | 'physical'; size: string | null; coins: number;
  status: OrderStatus; address: Address | null; phone: string | null; courier: string | null; tracking: string | null;
  result: Record<string, string> | null; history: Array<{ status: OrderStatus; at: string; by: string; note?: string }>; created_at: string;
}
export interface StoreItemAdmin extends Omit<StoreItemView, 'in_stock' | 'sizes_in_stock' | 'redeemed' | 'action'> {
  action?: string; stock?: Record<string, number>; active: boolean; sort: number;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const fetchStore = () => call<StoreView>('/store');
export const redeemItem = (body: { item_id: string; size?: string; address?: Address; phone?: string; company_slug?: string; day?: string }) =>
  call<{ order: StoreOrder; coins: number }>('/store/redeem', json('POST', body));
export const fetchMyOrders = () => call<{ orders: StoreOrder[] }>('/store/orders');
export const cancelOrder = (id: string) => call<{ order: StoreOrder; coins: number }>(`/store/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST' });

// admin
export const fetchStoreItemsAdmin = () => call<{ items: StoreItemAdmin[] }>('/admin/store/items');
export const saveStoreItem = (id: string, patch: Partial<StoreItemAdmin>) => call<{ item: StoreItemAdmin }>(`/admin/store/items/${encodeURIComponent(id)}`, json('PUT', patch));
export const fetchStoreOrdersAdmin = (status = '') => call<{ orders: Array<StoreOrder & { user: { name: string; email: string } }>; counts: Record<string, number> }>(`/admin/store/orders${status ? `?status=${status}` : ''}`);
export const moveStoreOrder = (id: string, body: { status: OrderStatus; note?: string; courier?: string; tracking?: string }) =>
  call<{ order: StoreOrder }>(`/admin/store/orders/${encodeURIComponent(id)}/status`, json('POST', body));
export const storeOrdersCsvUrl = () => `${API_BASE_URL}/admin/store/orders?format=csv`;

export const ORDER_LABEL: Record<OrderStatus, string> = {
  placed: 'Order placed', approved: 'Approved', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', rejected: 'Rejected (coins refunded)', cancelled: 'Cancelled (coins refunded)',
};
