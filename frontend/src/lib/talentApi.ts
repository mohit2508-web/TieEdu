import { API_BASE_URL, apiFetch } from './api';

/** Mirrors backend lib/talentSearch. */
export interface CandidateCard {
  handle: string;
  id: string;
  branch: string | null;
  grad_year: number | null;
  city: string | null;
  skills: Array<{ name: string; slug: string; score: number; level: string | null; certified: boolean }>;
  certificates: Array<{ title: string; verified: boolean }>;
}
export interface TalentProfile { visible: boolean; handle: string; branch: string | null; grad_year: number | null; city: string | null; opted_in_at: string }
export interface StudentTalent {
  enabled: boolean;
  profile: TalentProfile | null;
  preview: CandidateCard | null;
  requests: Array<{ id: string; status: 'pending' | 'accepted' | 'declined'; company: string; website: string | null; role: string; location: string; pay_range: string; note: string; created_at: string }>;
}
export interface RecruiterInfo { company: string; website: string; work_email: string; status: 'pending' | 'approved' | 'rejected' | 'suspended'; admin_note: string | null }
export interface RecruiterHome {
  recruiter: RecruiterInfo | null;
  enabled: boolean;
  limits?: { per_week: number; used_this_week: number };
  requests: Array<{ id: string; status: string; candidate: string; role: string; created_at: string; contact: { name: string; email: string; certificates: Array<{ title: string; verify_url: string }> } | null }>;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}/talent${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export const getStudentTalent = () => call<StudentTalent>('/me');
export const saveStudentTalent = (input: { visible: boolean; branch?: string; grad_year?: number | null; city?: string }) =>
  call<StudentTalent>('/me', { method: 'PUT', body: JSON.stringify(input) });
export const answerRequest = (id: string, accept: boolean) => call<StudentTalent>(`/requests/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ accept }) });

export const getRecruiterHome = () => call<RecruiterHome>('/recruiter');
export const applyRecruiter = (input: { company: string; website: string; work_email: string }) =>
  call<RecruiterHome>('/recruiter/apply', { method: 'POST', body: JSON.stringify(input) });
export const searchTalent = (q: Record<string, string>) =>
  call<{ results: CandidateCard[]; skills: Array<{ slug: string; name: string }> }>(`/search?${new URLSearchParams(Object.entries(q).filter(([, v]) => v))}`);
export const sendTalentInterest = (input: { candidate: string; role: string; location: string; pay_range: string; note: string }) =>
  call<RecruiterHome>('/interest', { method: 'POST', body: JSON.stringify(input) });
export const withdrawTalentInterest = (id: string) => call<RecruiterHome>(`/interest/${encodeURIComponent(id)}/withdraw`, { method: 'POST' });
