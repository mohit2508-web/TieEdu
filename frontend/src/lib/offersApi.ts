import { API_BASE_URL, apiFetch } from './api';

/** Mirrors backend lib/offerWall. */
export interface OfferItem {
  id: string;
  company: string;
  company_slug: string;
  role: string;
  ctc_lpa: number | null;
  story: string;
  name: string;
  college: string;
  verified: boolean;
  created_at: string;
}
export interface MyOffer { id: string; company: string; role: string; status: 'pending' | 'approved' | 'rejected'; verified: boolean; created_at: string }
export interface AdminOffer extends OfferItem {
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  name_mode: string;
  author: string;
  author_email: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, init);
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export const fetchOfferWall = (company?: string) =>
  call<{ items: OfferItem[]; companies: Array<{ slug: string; name: string }> }>(`/offers${company ? `?company=${encodeURIComponent(company)}` : ''}`);
export const fetchMyOffers = () => call<{ items: MyOffer[] }>('/offers/mine');
export const submitOffer = (input: { company_slug: string; role: string; ctc_lpa?: string; story: string; name_mode: string; college: string }) =>
  call<{ id: string; status: string }>('/offers', { method: 'POST', body: JSON.stringify(input) });
export const withdrawOffer = (id: string) => call<void>(`/offers/mine/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const fetchOfferQueue = () => call<{ items: AdminOffer[] }>('/admin/offers');
export const moderateOffer = (id: string, patch: { status?: 'approved' | 'rejected' | 'pending'; verified?: boolean }) =>
  call<{ id: string; status: string; verified: boolean }>(`/admin/offers/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(patch) });
