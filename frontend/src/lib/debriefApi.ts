import { API_BASE_URL, apiFetch } from './api';

/** Mirrors backend lib/debrief `debriefView`. */
export interface RecoveryStep { title: string; why: string; href: string }
export interface DebriefView {
  id: string;
  company: string;
  slug: string;
  round: string;
  reasons: string[];
  note: string;
  created_at: string;
  plan: RecoveryStep[];
  peers: { students: number; top_reason: string | null } | null;
}
export interface DebriefList {
  debriefs: DebriefView[];
  options: { reasons: Array<{ id: string; label: string }>; rounds: string[] };
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, init);
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export const fetchDebriefs = () => call<DebriefList>('/me/debriefs');
export const createDebrief = (input: { company_slug: string; round: string; reasons: string[]; note: string }) =>
  call<{ debrief: DebriefView }>('/me/debriefs', { method: 'POST', body: JSON.stringify(input) });
export const deleteDebrief = (id: string) => call<void>(`/me/debriefs/${encodeURIComponent(id)}`, { method: 'DELETE' });
