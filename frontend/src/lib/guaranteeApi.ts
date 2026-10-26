import { API_BASE_URL, apiFetch } from './api';

/** Mirrors backend lib/accuracyGuarantee. */
export interface GuaranteeSettings { enabled: boolean; amount: number; window_days: number }
export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'refunded';
export interface MyClaim { id: string; company: string; round: string; amount: number; status: ClaimStatus; admin_note: string; created_at: string }
export interface AdminClaim {
  id: string;
  company: string;
  student: string;
  student_email: string;
  round: string;
  interview_date: string;
  what_differed: string;
  amount: number;
  status: ClaimStatus;
  admin_note: string;
  created_at: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export const fetchGuarantee = () => call<GuaranteeSettings>('/guarantee');
export const fetchMyGuarantee = () => call<{ settings: GuaranteeSettings; claims: MyClaim[]; claimable: Array<{ slug: string; name: string }> }>('/guarantee/mine');
export const fileClaim = (input: { company_slug: string; round: string; interview_date: string; what_differed: string }) =>
  call<{ id: string; status: ClaimStatus; amount: number }>('/guarantee/claims', { method: 'POST', body: JSON.stringify(input) });
export const fetchClaimQueue = () => call<{ settings: GuaranteeSettings; items: AdminClaim[] }>('/admin/guarantee/claims');
export const reviewClaim = (id: string, patch: { status?: ClaimStatus; admin_note?: string }) =>
  call<{ id: string; status: ClaimStatus }>(`/admin/guarantee/claims/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(patch) });
