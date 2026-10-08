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
    if (body?.error) message = body.error;
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
