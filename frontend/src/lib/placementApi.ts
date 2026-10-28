import { API_BASE_URL, apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { markPlacementAccess } from '@/lib/navConfig';

// Re-exported so placement-flavored consumers (AuthContext.logout) have one
// import to reach for; the flag itself lives with the nav functions it feeds.
export { clearPlacementAccess, hasPlacementPortalAccess } from '@/lib/navConfig';

/**
 * Campus TPO Portal — API client.
 *
 * Thin by design: `apiFetch` already owns the 401 → refresh → retry loop, so
 * this file only names endpoints and shapes responses. Every call may carry
 * `x-college-id`, which is how a multi-college account (the platform super
 * admin) says which college it means; single-college accounts never send it
 * and the server pins them to their own grant.
 *
 * Placement endpoints answer 503 when PostgreSQL is down — the module has no
 * JSON fallback — so callers must treat `error` responses as possibly
 * infrastructure, not as "no access".
 */

export interface PlacementCollegeInfo {
  college_id: string;
  slug: string;
  name: string;
  short_name: string;
  theme_color: string;
  logo_url: string | null;
  status: string;
}

export interface PlacementGrantInfo {
  access_id: string;
  college_id: string | null;
  role: string;
  role_label: string;
  scopes: Record<string, unknown>;
}

export interface PlacementMe {
  status: 'ok';
  user: { id: string; name: string; email: string; role: string; roll_no?: string };
  grants: PlacementGrantInfo[];
  colleges: PlacementCollegeInfo[];
  active_college_id: string | null;
  permissions: string[];
}

export interface PlacementInviteInfo {
  email: string;
  role: string;
  role_label: string;
  college: string;
  account_exists: boolean;
  expires_at: string;
}

const COLLEGE_KEY = 'tpo_active_college';

/** The college the UI is currently pointed at, if any (localStorage-backed). */
export const getStoredCollegeId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(COLLEGE_KEY);
  } catch {
    return null;
  }
};

export const setStoredCollegeId = (collegeId: string | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (collegeId) localStorage.setItem(COLLEGE_KEY, collegeId);
    else localStorage.removeItem(COLLEGE_KEY);
  } catch {
    /* private mode — the choice simply does not persist */
  }
};

const collegeHeader = (collegeId?: string | null): Record<string, string> => {
  const id = collegeId ?? getStoredCollegeId();
  return id ? { 'x-college-id': id } : {};
};

/** Parses a non-2xx response into a throwable Error carrying the server message. */
const fail = async (res: Response): Promise<never> => {
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    // Bridge endpoints send a code in `error` and the sentence in `message`.
    if (body?.error) message = typeof body.message === 'string' && body.message ? body.message : body.error;
  } catch {
    /* non-JSON error body — the status line is all we know */
  }
  const err = new Error(message) as Error & { status?: number };
  err.status = res.status;
  throw err;
};

export const placementMe = async (collegeId?: string | null): Promise<PlacementMe> => {
  const res = await apiFetch(`${API_BASE_URL}/placement/me`, { headers: collegeHeader(collegeId) });
  if (res.status === 403) {
    // The grant is gone (or never existed) — drop the nav flag immediately so
    // the drawer entry disappears on the next render, not at token expiry.
    markPlacementAccess(false);
    return fail(res);
  }
  if (!res.ok) return fail(res);
  // 5xx/503 deliberately leaves the flag untouched: an outage must not make a
  // real officer lose their portal link.
  markPlacementAccess(true);
  return res.json();
};

export const placementInviteInfo = async (token: string): Promise<PlacementInviteInfo> => {
  const res = await apiFetch(`${API_BASE_URL}/placement/invites/${encodeURIComponent(token)}/info`, {
    method: 'POST',
  });
  if (!res.ok) return fail(res);
  return res.json();
};

export interface PlacementAcceptResult {
  status: string;
  accessToken?: string;
  user?: { id: string; name: string; email: string; role: string };
  college_id?: string;
}

export const placementAcceptInvite = async (
  token: string,
  body: { name?: string; password?: string }
): Promise<PlacementAcceptResult> => {
  const res = await apiFetch(`${API_BASE_URL}/placement/invites/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) return fail(res);
  return res.json();
};

/** True when the bearer token is already in memory (post-login calls). */
export const hasSessionToken = (): boolean => Boolean(getAccessToken());

/** Mirrors backend/src/lib/batchReadiness.ts `BatchReadiness`. */
export type ReadinessSegment = 'not_started' | 'at_risk' | 'in_progress' | 'ready';
export interface BatchReadiness {
  generated_at: string;
  companies: Array<{ id: string; name: string; slug: string; targeted_by: number }>;
  students: Array<{
    user_id: string;
    label: string;
    roll_no: string;
    branch: string | null;
    batch: string | null;
    readiness: Record<string, number | null>;
    average: number | null;
    tests: number;
    lessons: number;
    last_active: string | null;
    segment: ReadinessSegment;
  }>;
  segments: Record<ReadinessSegment, number>;
}

/** GET /api/placement/readiness for the active college (read-only). */
export const placementReadiness = async (collegeId?: string | null): Promise<BatchReadiness> => {
  const res = await apiFetch(`${API_BASE_URL}/placement/readiness`, { headers: collegeHeader(collegeId) });
  if (!res.ok) return fail(res);
  return res.json();
};

export interface CampusPageSettings {
  college_id: string;
  enabled: boolean;
  intro: string;
  updated_by: string | null;
  updated_at: string | null;
}

/** The public campus page switch for the active college (stored outside the placement DB). */
export const getCampusPageSettings = async (collegeId?: string | null): Promise<CampusPageSettings> => {
  const res = await apiFetch(`${API_BASE_URL}/placement/campus-page`, { headers: collegeHeader(collegeId) });
  if (!res.ok) return fail(res);
  return res.json();
};

export const saveCampusPageSettings = async (
  patch: { enabled?: boolean; intro?: string },
  collegeId?: string | null
): Promise<CampusPageSettings> => {
  const res = await apiFetch(`${API_BASE_URL}/placement/campus-page`, {
    method: 'PUT',
    headers: collegeHeader(collegeId),
    body: JSON.stringify(patch),
  });
  if (!res.ok) return fail(res);
  return res.json();
};

// ---- Campus intel (backend lib/campusIntel): placement history + senior notes ----

export interface CampusHistoryRow {
  id: string;
  company_slug: string;
  year: number;
  selected: number | null;
  cgpa_cutoff: number | null;
  backlogs_allowed: number | null;
  note: string;
  updated_at: string;
}
export interface SeniorNoteRow {
  id: string;
  company_slug: string;
  label: string;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export const getCampusIntel = async (collegeId?: string | null): Promise<{ history: CampusHistoryRow[]; notes: SeniorNoteRow[] }> => {
  const res = await apiFetch(`${API_BASE_URL}/placement/campus-intel`, { headers: collegeHeader(collegeId) });
  if (!res.ok) return fail(res);
  return res.json();
};

export const saveCampusHistory = async (
  row: { company_slug: string; year: number; selected?: number | null; cgpa_cutoff?: number | null; backlogs_allowed?: number | null; note?: string },
  collegeId?: string | null
): Promise<CampusHistoryRow> => {
  const res = await apiFetch(`${API_BASE_URL}/placement/campus-history`, { method: 'PUT', headers: collegeHeader(collegeId), body: JSON.stringify(row) });
  if (!res.ok) return fail(res);
  return res.json();
};

export const deleteCampusHistory = async (id: string, collegeId?: string | null): Promise<void> => {
  const res = await apiFetch(`${API_BASE_URL}/placement/campus-history/${encodeURIComponent(id)}`, { method: 'DELETE', headers: collegeHeader(collegeId) });
  if (!res.ok) return fail(res);
};

export const moderateSeniorNote = async (id: string, status: 'approved' | 'rejected', collegeId?: string | null): Promise<void> => {
  const res = await apiFetch(`${API_BASE_URL}/placement/senior-notes/${encodeURIComponent(id)}`, { method: 'PUT', headers: collegeHeader(collegeId), body: JSON.stringify({ status }) });
  if (!res.ok) return fail(res);
};

// ---------------------------------------------------------------------------
// One-click nudges (backend lib/collegeNudges): officers draft, the T&P Head
// approves; students can opt out and the college sees only how many have.
// ---------------------------------------------------------------------------
export type NudgeSegment = 'not_started' | 'at_risk' | 'in_progress' | 'ready';
export interface CollegeNudgeRow {
  id: string;
  status: 'pending' | 'sent' | 'rejected' | 'withdrawn';
  preview: string;
  audience: { segments: NudgeSegment[]; branch: string | null; batch: string | null; labels: string[] };
  preview_count: number;
  drafted_by: string | null;
  drafted_by_me: boolean;
  drafted_at: string;
  decided_by: string | null;
  decided_at: string | null;
  reject_reason: string | null;
  sent: { delivered: number; opted_out: number; capped: number } | null;
}
export interface CollegeNudgeData {
  can_approve: boolean;
  presets: Array<{ id: string; label: string; text: string; needs_company: boolean }>;
  segments: Array<{ id: NudgeSegment; label: string; students: number }>;
  branches: string[];
  batches: string[];
  opted_out: number;
  limits: { line_max: number; per_student_per_week: number };
  nudges: CollegeNudgeRow[];
}
export interface NudgeDraft { preset: string; company_slug?: string; line: string; audience: { segments: NudgeSegment[]; branch: string | null; batch: string | null } }

const nudgeCall = async <T>(path: string, init: RequestInit, collegeId?: string | null): Promise<T> => {
  const res = await apiFetch(`${API_BASE_URL}/placement/nudges${path}`, { ...init, headers: { ...collegeHeader(collegeId), ...(init.headers || {}) } });
  if (!res.ok) return fail(res);
  return res.json();
};
export const getCollegeNudges = (collegeId?: string | null) => nudgeCall<CollegeNudgeData>('', {}, collegeId);
export const draftCollegeNudge = (d: NudgeDraft, collegeId?: string | null) =>
  nudgeCall<{ nudge: { id: string; status: string; preview_count: number; sent: CollegeNudgeRow['sent'] } }>('', { method: 'POST', body: JSON.stringify(d) }, collegeId);
export const approveCollegeNudge = (id: string, collegeId?: string | null) => nudgeCall<{ nudge: { id: string; sent: CollegeNudgeRow['sent'] } }>(`/${encodeURIComponent(id)}/approve`, { method: 'POST' }, collegeId);
export const rejectCollegeNudge = (id: string, reason: string, collegeId?: string | null) => nudgeCall(`/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }, collegeId);
export const withdrawCollegeNudge = (id: string, collegeId?: string | null) => nudgeCall(`/${encodeURIComponent(id)}/withdraw`, { method: 'POST' }, collegeId);

// ---------------------------------------------------------------------------
// Management / NAAC report (backend lib/collegeReport): aggregates only.
// ---------------------------------------------------------------------------
export interface ReportQuery { from?: string; to?: string; batch?: string }
const reportQs = (q: ReportQuery) => new URLSearchParams(Object.entries(q).filter(([, v]) => v) as Array<[string, string]>).toString();

/** The figures the PDF is built from, for an on-screen preview. */
export const getCollegeReport = async (q: ReportQuery, collegeId?: string | null): Promise<any> => {
  const res = await apiFetch(`${API_BASE_URL}/placement/reports/summary?${reportQs(q)}`, { headers: collegeHeader(collegeId) });
  if (!res.ok) return fail(res);
  return res.json();
};

/** Downloads the PDF through an object URL, since the request needs the auth and college headers. */
export const downloadCollegeReport = async (q: ReportQuery, collegeId?: string | null): Promise<void> => {
  const res = await apiFetch(`${API_BASE_URL}/placement/reports/pdf?${reportQs(q)}`, { headers: collegeHeader(collegeId) });
  if (!res.ok) return fail(res);
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || 'placement-report.pdf';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

/** Year-on-year placement results from Campus intel history (backend lib/yearOnYear). */
export interface YearOnYearData {
  years: Array<{ year: number; companies: number; selected: number; unrecorded: number; change: number | null; change_pct: number | null }>;
  companies: Array<{ company: string; slug: string; by_year: Record<string, number | null>; latest_change: number | null }>;
}
export const getYearOnYear = async (collegeId?: string | null): Promise<YearOnYearData> => {
  const res = await apiFetch(`${API_BASE_URL}/placement/year-on-year`, { headers: collegeHeader(collegeId) });
  if (!res.ok) return fail(res);
  return res.json();
};
