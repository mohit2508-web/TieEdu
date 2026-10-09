import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { School, SchoolHomeResponse, SchoolMember, SchoolNotice, SchoolProgram } from '@/lib/schoolApi';
import { schoolHome, schoolLogout, schoolMe } from '@/lib/schoolApi';
import { setAuthSession } from '@/lib/auth';

export interface SchoolUser {
  id: string;
  name: string;
  xp: number;
  streak: number;
  avatar: string | null;
}

export interface SchoolProgressMap {
  [programId: string]: string[];
}

interface SchoolState {
  loading: boolean;
  ready: boolean;
  error: string | null;
  school: School | null;
  member: SchoolMember | null;
  user: SchoolUser | null;
  programs: SchoolProgram[];
  notices: SchoolNotice[];
  progress: SchoolProgressMap;
  completedCount: number;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SchoolContext = createContext<SchoolState | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [member, setMember] = useState<SchoolMember | null>(null);
  const [user, setUser] = useState<SchoolUser | null>(null);
  const [programs, setPrograms] = useState<SchoolProgram[]>([]);
  const [notices, setNotices] = useState<SchoolNotice[]>([]);
  const [progress, setProgress] = useState<SchoolProgressMap>({});
  const [completedCount, setCompletedCount] = useState(0);

  const load = async () => {
    try {
      setError(null);
      const home: SchoolHomeResponse = await schoolHome();
      setSchool(home.school);
      setMember(home.member);
      setUser(home.student);
      setPrograms(home.programs);
      setNotices(home.notices);
      setProgress(home.progress.by_program || {});
      setCompletedCount(home.progress.completed_count || 0);
    } catch (e: any) {
      setError(e?.message || 'Could not load school');
    }
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
    setLoading(false);
  }, []);

  const signOut = async () => {
    try {
      await schoolLogout();
    } catch {}
    setAuthSession(null, null);
    window.location.href = '/school/login';
  };

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, [refresh]);

  const value = useMemo(
    () => ({
      loading,
      ready: !loading && !!school,
      error,
      school,
      member,
      user,
      programs,
      notices,
      progress,
      completedCount,
      refresh,
      signOut,
    }),
    [loading, error, school, member, user, programs, notices, progress, completedCount, refresh]
  );

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
};

export const useSchool = () => {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchool must be used within SchoolProvider');
  return ctx;
};