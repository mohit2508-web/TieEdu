import { API_BASE_URL, apiFetch } from './api';
import { chooseDeviceToSignOut, type SignedInDevice } from './deviceLimit';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  xp: number;
  streak: number;
  college?: string | null;
  badge?: string | null;
  avatar?: string | null;
  license_id?: string | null;
  roll_no?: string | null;
  created_at: string;
  email_verified?: boolean;
  has_password?: boolean;
  google_linked?: boolean;
  grad_year?: number | null;
  branch?: string | null;
  interests?: string[];
  notify?: { email: boolean; push: boolean; whatsapp: boolean } | null;
  whatsapp?: { number: string; verified: boolean } | null;
  /** Set by the server until onboarding is finished or skipped. */
  needs_onboarding?: boolean;
  /** Paid for anything; paying students see no ads. */
  has_paid?: boolean;
}

export interface AuthLoginPayload {
  user: AuthUser;
  accessToken: string;
  unlocked_company_ids?: string[];
  orders?: any[];
}

let accessToken: string | null = null;
let userId: string | null = null;

export const setAuthSession = (token: string | null, uid: string | null) => {
  accessToken = token;
  userId = uid;
};

export const getAccessToken = () => accessToken;
export const getUserId = () => userId;
export const isSignedIn = () => !!userId;

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
});

export const apiSignup = async (payload: {
  name: string;
  email: string;
  password: string;
  college?: string;
}): Promise<AuthLoginPayload> => {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Signup failed');
  return data;
};

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);

/**
 * A sign-in request that handles the two-device limit: on 409 `device_limit`
 * it asks the student which device to sign out (DeviceLimitSheet) and sends
 * the same request again with that choice.
 */
async function signInRequest<T>(path: string, body: Record<string, unknown>, fallbackError: string): Promise<T> {
  let signOut: string | undefined;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, standalone: isStandalone(), ...(signOut ? { sign_out_device: signOut } : {}) }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409 && data.code === 'device_limit' && attempt < 2) {
      const pick = await chooseDeviceToSignOut((data.devices || []) as SignedInDevice[]);
      if (!pick) throw new Error('Not signed in — your other two devices are still signed in.');
      signOut = pick;
      continue;
    }
    if (!res.ok) throw new Error(data.error || fallbackError);
    return data as T;
  }
}

export const apiLogin = (email: string, password: string) =>
  signInRequest<AuthLoginPayload>('/auth/login', { email, password }, 'Login failed');

export const apiRefresh = async (): Promise<AuthLoginPayload | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const apiLogout = async () => {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch { /* network failure — local session clears regardless */ }
};

export const apiVerifyAdmin = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/verify-admin`, {
      credentials: 'include',
      headers: { ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}) },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.status === 'ok' && data?.user?.role === 'admin';
  } catch {
    return false;
  }
};
// ---------------------------------------------------------------------------
// Google sign-in, recovery, verification (PROFESSIONAL_PLATFORM_PLAN §1)
// ---------------------------------------------------------------------------

async function postJson<T>(path: string, body: unknown, withAuth = false): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: withAuth ? jsonHeaders() : { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export const apiGoogleConfig = async (): Promise<{ enabled: boolean; client_id: string | null }> => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/google/config`, { credentials: 'include' });
    if (!res.ok) return { enabled: false, client_id: null };
    return await res.json();
  } catch {
    return { enabled: false, client_id: null };
  }
};

export const apiGoogleSignIn = (credential: string) =>
  signInRequest<AuthLoginPayload & { created: boolean }>('/auth/google', { credential }, 'Google sign-in failed');
export const apiForgotPassword = (email: string) => postJson<{ message: string }>('/auth/forgot', { email });
export const apiResetPassword = (token: string, password: string) => postJson<AuthLoginPayload>('/auth/reset', { token, password });
export const apiVerifyEmail = (token: string) => postJson<{ email: string }>('/auth/verify-email', { token });
export const apiResendVerification = () => postJson<{ already?: boolean }>('/auth/resend-verification', {}, true);

/**
 * Where to send someone right after they sign in: onboarding first if they
 * have not done it, then wherever they were going. Only same-site paths.
 */
export const afterAuthPath = (user: Pick<AuthUser, 'needs_onboarding'> | null, next: string): string => {
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  if (user?.needs_onboarding && !safeNext.startsWith('/welcome')) return `/welcome?next=${encodeURIComponent(safeNext)}`;
  return safeNext;
};

// ---------------------------------------------------------------------------
// Where this account is signed in (EMAIL_LIFECYCLE_AND_DEVICES_PLAN §4)
// ---------------------------------------------------------------------------

async function devicesCall<T>(path: string, method = 'GET'): Promise<T> {
  const res = await apiFetch(`${API_BASE_URL}/auth/devices${path}`, { method });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export const apiDevices = () => devicesCall<{ devices: SignedInDevice[]; limit: number | null }>('');
export const apiSignOutDevice = (id: string) => devicesCall<{ status: string }>(`/${encodeURIComponent(id)}/sign-out`, 'POST');
export const apiSignOutOtherDevices = () => devicesCall<{ status: string }>('/sign-out-others', 'POST');
