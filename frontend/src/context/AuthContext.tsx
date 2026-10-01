'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  AuthUser, apiLogin, apiSignup, apiLogout, setAuthSession, getUserId,
} from '@/lib/auth';
import { tryRefreshSession, getSessionUser } from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (payload: { name: string; email: string; password: string; college?: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tieedu_cached_user');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      /*
       * Goes through `tryRefreshSession` rather than calling `apiRefresh`
       * directly, and that indirection is load-bearing.
       *
       * The refresh token is single-use: every successful refresh rotates it and
       * issues a new cookie. Two refreshes for the same session therefore race,
       * and the loser presents an already-consumed cookie, gets a 401, and takes
       * the `else` branch below - signing the student out. This effect can easily
       * run twice for one page view (a remount, React's double-invoked effects in
       * development, a second tab opening), and the network trace showed exactly
       * that: `/auth/me` 401, `/auth/refresh` 200, `/auth/me` 401,
       * `/auth/refresh` 401, signed out.
       *
       * `tryRefreshSession` collapses concurrent callers onto one request, so the
       * second caller gets the first caller's result instead of a stale cookie.
       */
      const ok = await tryRefreshSession();
      if (!active) return;
      const fresh = ok ? getSessionUser() : null;
      if (fresh?.id) {
        setUser(fresh);
        try { localStorage.setItem('tieedu_cached_user', JSON.stringify(fresh)); } catch {}
      } else {
        setUser(null);
        try { localStorage.removeItem('tieedu_cached_user'); } catch {}
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setAuthSession(data.accessToken, data.user.id);
    setUser(data.user);
    try { localStorage.setItem('tieedu_cached_user', JSON.stringify(data.user)); } catch {}
    return data.user;
  };

  const signup = async (payload: { name: string; email: string; password: string; college?: string }) => {
    const data = await apiSignup(payload);
    setAuthSession(data.accessToken, data.user.id);
    setUser(data.user);
    try { localStorage.setItem('tieedu_cached_user', JSON.stringify(data.user)); } catch {}
    return data.user;
  };

  const logout = async () => {
    await apiLogout();
    setAuthSession(null, null);
    setUser(null);
    try { localStorage.removeItem('tieedu_cached_user'); } catch {}
  };

  const value: AuthContextValue = { user, loading, login, signup, logout, setUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};