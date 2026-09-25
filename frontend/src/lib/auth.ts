import { API_BASE_URL } from './api';

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
  created_at: string;
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

export const apiLogin = async (email: string, password: string): Promise<AuthLoginPayload> => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
};

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