import { API_BASE_URL, apiFetch } from './api';

export interface ParentLink {
  token: string;
  created_at: string;
}

/** Mirrors backend/src/lib/parentView.ts `ParentView`. */
export interface ParentView {
  first_name: string;
  year: string | null;
  streak: { current: number; best: number };
  weeks: Array<{ from: string; to: string; lessons: number; tests: number }>;
  certificates: Array<{ title: string; issued_at: string; verify_url: string }>;
  companies: Array<{ name: string; readiness: number; cleared: number; rounds: number }>;
  next_step: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}

export const getParentLink = () => call<{ link: ParentLink | null }>('/me/parent-link');
export const createParentLink = () => call<{ link: ParentLink }>('/me/parent-link', { method: 'POST' });
export const deleteParentLink = () => call<{ link: null }>('/me/parent-link', { method: 'DELETE' });

/** Server-side fetch for /parent/[token]. Null when the link is not active. */
export async function fetchParentView(token: string, base: string): Promise<ParentView | null> {
  try {
    const res = await fetch(`${base}/parent/${encodeURIComponent(token)}`);
    return res.ok ? ((await res.json()) as ParentView) : null;
  } catch {
    return null;
  }
}

/** Weekly WhatsApp updates (backend lib/parentWhatsapp). */
export interface ParentWaStatus { allowed: boolean; subscribed: { phone: string; lang: 'hi' | 'en'; since: string } | null; sending: boolean }
export interface StudentWaStatus { allowed: boolean; subscribed: { phone: string; lang: 'hi' | 'en'; since: string; last_week: string | null } | null }

export const getStudentWhatsapp = () => call<StudentWaStatus>('/me/parent-whatsapp');
export const setStudentWhatsapp = (allowed: boolean) => call<StudentWaStatus>('/me/parent-whatsapp', { method: 'PUT', body: JSON.stringify({ allowed }) });

const wa = (token: string) => `/parent/${encodeURIComponent(token)}/whatsapp`;
export const getParentWhatsapp = (token: string) => call<ParentWaStatus>(wa(token));
export const subscribeParentWhatsapp = (token: string, input: { phone: string; lang: 'hi' | 'en'; consent: boolean }) =>
  call<ParentWaStatus>(wa(token), { method: 'POST', body: JSON.stringify(input) });
export const stopParentWhatsapp = (token: string) => call<ParentWaStatus>(wa(token), { method: 'DELETE' });

/** Weekly parent email (backend lib/parentEmail): confirmed double opt-in. */
export interface ParentEmailStatus { offered: boolean; subscribed: { email: string; lang: 'hi' | 'en'; confirmed: boolean } | null }
const pe = (token: string) => `/parent/${encodeURIComponent(token)}/email`;
export const getParentEmail = (token: string) => call<ParentEmailStatus>(pe(token));
export const requestParentEmail = (token: string, input: { email: string; lang: 'hi' | 'en'; consent: boolean }) =>
  call<ParentEmailStatus>(pe(token), { method: 'POST', body: JSON.stringify(input) });
export const confirmParentEmail = (t: string) => call<{ confirmed: boolean; first_name: string }>('/parent-email/confirm', { method: 'POST', body: JSON.stringify({ t }) });
export const stopParentEmail = (t: string) => call<{ stopped: boolean }>('/parent-email/stop', { method: 'POST', body: JSON.stringify({ t }) });
