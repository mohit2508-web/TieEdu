'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

const GuardSpinner = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[var(--bg-app)]">
    <div className="w-9 h-9 border-[3px] border-[#E8F4FB] border-t-[#0284C7] rounded-full animate-spin" />
    <p className="text-[13px] font-semibold text-[--text-muted] tracking-wide">Verifying session…</p>
  </div>
);

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(router.asPath)}`);
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <GuardSpinner />;
  }

  return <>{children}</>;
};