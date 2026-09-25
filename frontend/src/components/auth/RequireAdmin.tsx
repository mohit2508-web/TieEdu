'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

const GuardSpinner = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[var(--bg-app)]">
    <div className="w-9 h-9 border-[3px] border-[#FBF1E1] border-t-[#0284C7] rounded-full animate-spin" />
    <p className="text-[13px] font-semibold text-[--text-muted] tracking-wide">Securing admin console…</p>
  </div>
);

export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/admin/login');
    } else if (user.role !== 'admin') {
      router.replace('/');
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== 'admin') {
    return <GuardSpinner />;
  }

  return <>{children}</>;
};