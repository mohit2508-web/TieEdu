'use client';

import React from 'react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PlacementProvider, usePlacement } from '@/context/PlacementContext';
import { AlertTriangle, Lock, ServerCrash, Loader2 } from 'lucide-react';

/**
 * Entry guard for every `/tpo/*` screen.
 *
 * Mirrors `RequireAdmin`'s shape (spinner → redirect) but its middle states
 * differ, because placement access is a GRANT, not a role bit:
 *
 *  - no session          → /tpo/login (same as admin)
 *  - session, no grants  → a "you have no portal access" screen with a way
 *                           out — NOT a redirect home, which would look like
 *                           the link was broken rather than unauthorized
 *  - backend unreachable → an honest infrastructure screen with retry; the
 *                           placement module has no JSON fallback, so a 503
 *                           must never be rendered as "access denied"
 *
 * The provider mounts INSIDE the guard so `/me` fires exactly when a TPO page
 * mounts, and dies with it — no global fetch for students who never visit.
 */

const CenterCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 bg-[var(--bg-app)] text-center">
    {children}
  </div>
);

const GuardSpinner: React.FC<{ label: string }> = ({ label }) => (
  <CenterCard>
    <div className="w-9 h-9 border-[3px] border-[#FBF1E1] border-t-[#0284C7] rounded-full animate-spin" />
    <p className="text-[13px] font-semibold text-[--text-muted] tracking-wide">{label}</p>
  </CenterCard>
);

/** Decision screen — lives inside the provider so it can read `status`. */
const PlacementGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, errorMessage, refresh } = usePlacement();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (status === 'signed-out') router.replace('/tpo/login');
  }, [loading, status, router]);

  if (loading || status === 'loading') return <GuardSpinner label="Opening Campus TPO Portal…" />;

  if (status === 'signed-out') return <GuardSpinner label="Redirecting to sign in…" />;

  if (status === 'denied') {
    return (
      <CenterCard>
        <div className="w-12 h-12 rounded-2xl bg-[#FDEDE9] border border-[#F2C9BC] flex items-center justify-center">
          <Lock className="w-6 h-6 text-[#A63D28]" />
        </div>
        <h1 className="display-2">No Campus TPO access</h1>
        <p className="text-[15px] text-[--text-muted] max-w-[420px]">
          {errorMessage || 'Your account does not have placement portal access yet.'} Ask your Training &
          Placement Head to invite you from the admin console.
        </p>
        <div className="flex gap-3 mt-2">
          <button onClick={() => router.replace('/')} className="btn btn-primary py-3 px-5 text-sm focus-ring">
            Go to TieEdu home
          </button>
        </div>
        <p className="text-[13px] text-[--text-muted]">
          Signed in as <span className="font-semibold">{user?.email}</span>
        </p>
      </CenterCard>
    );
  }

  if (status === 'error') {
    return (
      <CenterCard>
        <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] border border-[#F5E0A3] flex items-center justify-center">
          <ServerCrash className="w-6 h-6 text-[#92400E]" />
        </div>
        <h1 className="display-2">Placement service unavailable</h1>
        <p className="text-[15px] text-[--text-muted] max-w-[440px]">
          {errorMessage ||
            'The placement data store is not responding. This is infrastructure, not your account — your access is unchanged.'}
        </p>
        <button onClick={() => refresh()} className="btn btn-primary py-3 px-5 text-sm focus-ring">
          Try again
        </button>
      </CenterCard>
    );
  }

  return <>{children}</>;
};

export const RequirePlacement: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PlacementProvider>
    <PlacementGate>{children}</PlacementGate>
  </PlacementProvider>
);

/** Inline badge for screens that want to show a permission state without a full guard. */
export const PermissionDeniedNote: React.FC<{ permission: string }> = ({ permission }) => (
  <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#FEF3C7] border border-[#F5E0A3] text-[#92400E] text-[13px] font-semibold">
    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
    <span>
      You do not have <code className="font-mono">{permission}</code> — ask your T&amp;P Head if you need it.
    </span>
  </div>
);

/** Loading row for data sections inside an already-guarded page. */
export const InlineSpinner: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="flex items-center gap-2 text-[13px] font-semibold text-[--text-muted]">
    <Loader2 className="w-4 h-4 animate-spin" /> {label}
  </div>
);
