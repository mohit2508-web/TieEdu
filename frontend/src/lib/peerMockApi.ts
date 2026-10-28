import { API_BASE_URL, apiFetch } from './api';

/** Mirrors backend lib/peerMock `sessionView` and `rubric`. */
export type Dimension = 'content' | 'clarity' | 'confidence';
export type Rating = Record<Dimension, 1 | 2 | 3>;
export interface PeerQuestion { id: string; topic: string; question: string | null; key_points: string[] | null; tip: string | null; rating: Rating | null }
export interface PeerSessionView {
  id: string;
  role: 'interviewer' | 'candidate';
  kind: 'hr' | 'technical';
  status: 'open' | 'live' | 'done' | 'cancelled';
  code: string | null;
  partner: string | null;
  created_at: string;
  joined_at: string | null;
  done_at: string | null;
  submit_after: string | null;
  questions: PeerQuestion[];
  averages: Record<Dimension, number> | null;
  note: string | null;
  xp: number;
  xp_note: string | null;
}
export interface PeerRubric {
  dimensions: Array<{ id: Dimension; label: string }>;
  levels: Array<{ value: 1 | 2 | 3; label: string }>;
  xp: { INTERVIEWER: number; CANDIDATE: number };
  min_minutes: number;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, init);
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

type One = { session: PeerSessionView };
const p = (id: string) => `/peer-mock/${encodeURIComponent(id)}`;
export const fetchPeerHome = () => call<{ rubric: PeerRubric; sessions: PeerSessionView[] }>('/peer-mock');
export const startPeerSession = (kind: 'hr' | 'technical') => call<One>('/peer-mock', { method: 'POST', body: JSON.stringify({ kind }) });
export const joinPeerSession = (code: string) => call<One>('/peer-mock/join', { method: 'POST', body: JSON.stringify({ code }) });
export const fetchPeerSession = (id: string) => call<One>(p(id));
export const submitPeerRatings = (id: string, ratings: Record<string, Partial<Rating>>, note: string) =>
  call<One>(`${p(id)}/ratings`, { method: 'POST', body: JSON.stringify({ ratings, note }) });
export const cancelPeerSession = (id: string) => call<One>(`${p(id)}/cancel`, { method: 'POST' });
export const deletePeerNote = (id: string) => call<One>(`${p(id)}/note`, { method: 'DELETE' });
