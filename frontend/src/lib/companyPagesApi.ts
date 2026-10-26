import { API_BASE_URL, apiFetch } from './api';
import type { CpAdminDoc, CpAdminRadarReport, CpContent, CpMe, CpPublic, CpSchema, CpStats } from '@/types/companyPage';

/**
 * Error carrying the HTTP status and parsed body, so the studio can tell a
 * save conflict (409) or a publish refusal with issues (422) from a plain failure.
 */
export class CpApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, init);
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new CpApiError(body?.error || `Request failed (${res.status})`, res.status, body);
  return body as T;
}

/**
 * API base for server-side fetches (getServerSideProps).
 *
 * `API_BASE_URL` defaults to the relative `/api`, which the browser resolves
 * against the page origin but Node's fetch cannot resolve at all — so an SSR
 * fetch against it fails every time. The Node server reaches the backend at the
 * same target `next.config` proxies `/api` to.
 */
export function serverApiBase(): string {
  if (/^https?:\/\//i.test(API_BASE_URL)) return API_BASE_URL;
  return `${(process.env.API_PROXY_TARGET || 'http://localhost:5000').replace(/\/+$/, '')}/api`;
}

/** Public: the published page, or `{ enabled: false }`. Never throws. */
export async function fetchCompanyPage(slug: string, base: string = API_BASE_URL): Promise<CpPublic> {
  try {
    const res = await fetch(`${base}/company-pages/${encodeURIComponent(slug)}`);
    if (!res.ok) return { enabled: false };
    return (await res.json()) as CpPublic;
  } catch {
    return { enabled: false };
  }
}

export const fetchCpSchema = () => call<CpSchema>('/admin/company-pages/schema');

export const fetchCpAdminDoc = (companyId: string) => call<CpAdminDoc>(`/admin/company-pages/${companyId}`);

export const saveCpDraft = (companyId: string, content: CpContent, baseUpdatedAt: string | null) =>
  call<CpAdminDoc>(`/admin/company-pages/${companyId}/draft`, {
    method: 'PUT',
    body: JSON.stringify({ content, base_updated_at: baseUpdatedAt }),
  });

export const publishCp = (companyId: string) =>
  call<CpAdminDoc>(`/admin/company-pages/${companyId}/publish`, { method: 'POST' });

export const setCpEnabled = (companyId: string, enabled: boolean) =>
  call<CpAdminDoc>(`/admin/company-pages/${companyId}/enabled`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  });

export const restoreCpVersion = (companyId: string, index: number) =>
  call<CpAdminDoc>(`/admin/company-pages/${companyId}/restore/${index}`, { method: 'POST' });

export const resetCpDraft = (companyId: string, opts: { template?: string; from_company_id?: string }) =>
  call<CpAdminDoc>(`/admin/company-pages/${companyId}/reset`, {
    method: 'POST',
    body: JSON.stringify(opts),
  });

// ---------------------------------------------------------------------------
// Student — the signed-in student's state on a live company page
// ---------------------------------------------------------------------------

const slugPath = (slug: string) => `/company-pages/${encodeURIComponent(slug)}`;

export const fetchCpMe = (slug: string) => call<CpMe>(`${slugPath(slug)}/me`);

export const updateCpMe = (slug: string, patch: { test_date?: string; target_role?: number | null; onboarding_done?: string[] }) =>
  call<CpMe>(`${slugPath(slug)}/me`, { method: 'PUT', body: JSON.stringify(patch) });

export const recordCpDaily = (slug: string) => call<CpMe>(`${slugPath(slug)}/me/daily`, { method: 'POST' });

export const setCpWatching = (slug: string, on: boolean) =>
  call<CpMe>(`${slugPath(slug)}/watch`, { method: 'PUT', body: JSON.stringify({ on }) });

export const reportCpRadar = (slug: string, kind: string, text: string) =>
  call<CpMe>(`${slugPath(slug)}/radar`, { method: 'POST', body: JSON.stringify({ kind, text }) });

export const confirmCpRadar = (slug: string, id: string) =>
  call<CpMe>(`${slugPath(slug)}/radar/${encodeURIComponent(id)}/confirm`, { method: 'POST' });

/** Fire-and-forget page analytics. Never throws, never blocks the UI. */
export function trackCpEvent(slug: string, event: string): void {
  try {
    void fetch(`${API_BASE_URL}${slugPath(slug)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics must never break the page */
  }
}

/** Public URL of an image uploaded through the studio. */
export const cpMediaUrl = (storedName: string) => `${API_BASE_URL}/company-pages/media/${encodeURIComponent(storedName)}`;

// ---------------------------------------------------------------------------
// Studio extras
// ---------------------------------------------------------------------------

export const scheduleCp = (companyId: string, at: string) =>
  call<CpAdminDoc>(`/admin/company-pages/${companyId}/schedule`, { method: 'POST', body: JSON.stringify({ at }) });

export const unscheduleCp = (companyId: string) =>
  call<CpAdminDoc>(`/admin/company-pages/${companyId}/schedule`, { method: 'DELETE' });

export const fetchCpRadarReports = (companyId: string) =>
  call<CpAdminRadarReport[]>(`/admin/company-pages/${companyId}/radar`);

export const fetchCpRadarSuggestion = (companyId: string) =>
  call<{ status: 'Open' | 'Closed' | null; basis: { kind: string; date: string; text: string } | null; count: number }>(
    `/admin/company-pages/${companyId}/radar/suggestion`
  );

export const moderateCpRadar = (companyId: string, id: string, status: 'approved' | 'rejected' | 'pending') =>
  call<CpAdminRadarReport>(`/admin/company-pages/${companyId}/radar/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const fetchCpStats = (companyId: string, days = 30) =>
  call<CpStats>(`/admin/company-pages/${companyId}/stats?days=${days}`);

export const pingCpPresence = (companyId: string, leaving = false) =>
  call<{ others: { name: string; seconds_ago: number }[] }>(`/admin/company-pages/${companyId}/presence`, {
    method: 'POST',
    body: JSON.stringify({ leaving }),
  });

export async function uploadCpMedia(companyId: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await call<{ stored_name: string }>(`/admin/company-pages/${companyId}/media`, { method: 'POST', body: form });
  return res.stored_name;
}
