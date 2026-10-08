'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  PlacementMe,
  placementMe,
  getStoredCollegeId,
  setStoredCollegeId,
} from '@/lib/placementApi';

/**
 * Campus TPO Portal session state.
 *
 * Fetches `GET /api/placement/me` exactly once per sign-in — the same boot
 * contract the admin console uses (`/auth/verify-admin`) — and keeps three
 * facts the whole portal needs:
 *
 *  - `me`: grants, colleges, permissions (from the SERVER, never from the JWT;
 *    a revoked grant takes effect on the next fetch, not at token expiry);
 *  - `activeCollegeId`: which college the UI is pointed at (localStorage so a
 *    refresh keeps it, server validates it so a stale id 404s honestly);
 *  - `status`: a discriminated union so screens render "loading" / "denied" /
 *    "backend down" differently instead of guessing from an error string.
 *
 * `denied` (403) and `error` (500/503) are deliberately separate states: a
 * placement officer who lost access must see a "ask your T&P Head" message,
 * while an operator facing a PostgreSQL outage must see that, not an
 * accusation about their account.
 */

export type PlacementStatus =
  | 'loading'
  | 'ready'
  | 'signed-out' // no TieEdu session at all → /tpo/login
  | 'denied' // session fine, zero placement grants → 403 screen
  | 'error'; // network / 5xx / 503 (PG down) → retryable screen

export interface PlacementContextValue {
  status: PlacementStatus;
  me: PlacementMe | null;
  errorMessage: string | null;
  activeCollegeId: string | null;
  /** Permissions of the ACTIVE grant only (empty until a college resolves). */
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  setActiveCollegeId: (collegeId: string) => void;
  refresh: () => Promise<void>;
}

const PlacementContext = createContext<PlacementContextValue | null>(null);

const WILDCARD = '*';

export const PlacementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<PlacementStatus>('loading');
  const [me, setMe] = useState<PlacementMe | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeCollegeId, setActiveCollege] = useState<string | null>(getStoredCollegeId);

  const load = useCallback(
    async (collegeId?: string | null) => {
      try {
        const data = await placementMe(collegeId);
        setMe(data);
        setErrorMessage(null);
        // The server's answer wins over a stale stored id: if localStorage
        // still names a college this account lost, `/me` resolved elsewhere
        // (scoped grant) — adopt what it says.
        const resolved = data.active_college_id;
        if (resolved && resolved !== getStoredCollegeId()) setStoredCollegeId(resolved);
        setStatus('ready');
      } catch (err: any) {
        setMe(null);
        const code = err?.status;
        if (code === 401) {
          setStatus('signed-out');
        } else if (code === 403) {
          setStatus('denied');
          setErrorMessage(err.message);
        } else if (code === 404 && (collegeId ?? getStoredCollegeId())) {
          // Stored college no longer exists or no longer belongs to this
          // account (archived college, revoked cross-college grant). Drop the
          // choice and boot again without a header: a scoped grant resolves
          // itself, a super admin lands on the picker. One retry, not a loop —
          // a second failure is a real error.
          setStoredCollegeId(null);
          setActiveCollege(null);
          try {
            const data = await placementMe(null);
            setMe(data);
            setErrorMessage(null);
            setStatus('ready');
          } catch (retryErr: any) {
            setStatus('error');
            setErrorMessage(retryErr.message || 'Could not reach the placement service');
          }
        } else {
          setStatus('error');
          setErrorMessage(err.message || 'Could not reach the placement service');
        }
      }
    },
    []
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus('signed-out');
      return;
    }
    setStatus('loading');
    void load(activeCollegeId);
    // Re-boot whenever the signed-in identity changes (account switch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const setActiveCollegeId = useCallback(
    (collegeId: string) => {
      setStoredCollegeId(collegeId);
      setActiveCollege(collegeId);
      void load(collegeId);
    },
    [load]
  );

  const permissions = useMemo(() => {
    if (status !== 'ready' || !me) return [];
    // Server already resolved permissions for the active college (empty when
    // a super admin has not picked one — see placementAuth requirePlacementScope).
    return me.permissions || [];
  }, [status, me]);

  const hasPermission = useCallback(
    (permission: string) => permissions.includes(WILDCARD) || permissions.includes(permission),
    [permissions]
  );

  const value: PlacementContextValue = {
    status,
    me,
    errorMessage,
    activeCollegeId: activeCollegeId || me?.active_college_id || null,
    permissions,
    hasPermission,
    setActiveCollegeId,
    refresh: () => load(activeCollegeId),
  };

  return <PlacementContext.Provider value={value}>{children}</PlacementContext.Provider>;
};

export const usePlacement = (): PlacementContextValue => {
  const ctx = useContext(PlacementContext);
  if (!ctx) throw new Error('usePlacement must be used inside PlacementProvider');
  return ctx;
};
