'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  AuthUser, apiLogin, apiSignup, apiLogout, apiRefresh, setAuthSession, getUserId,
} from '@/lib/auth';

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await apiRefresh();
      if (!active) return;
      if (data?.user?.id) {
        const uid = data.user.id;
        setAuthSession(data.accessToken, uid);
        setUser(data.user);
      } else {
        setAuthSession(null, null);
        setUser(null);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setAuthSession(data.accessToken, data.user.id);
    setUser(data.user);
    return data.user;
  };

  const signup = async (payload: { name: string; email: string; password: string; college?: string }) => {
    const data = await apiSignup(payload);
    setAuthSession(data.accessToken, data.user.id);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await apiLogout();
    setAuthSession(null, null);
    setUser(null);
  };

  const value: AuthContextValue = { user, loading, login, signup, logout, setUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};