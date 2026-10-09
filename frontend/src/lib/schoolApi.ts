import { API_BASE_URL, apiFetch, tryRefreshSession } from './api';
import type { AuthUser } from './auth';

export interface School {
  id: string;
  code: string;
  name: string;
  short_name: string;
  city: string;
  board: string;
  motto: string;
  theme_color: string;
  session?: string;
}

export interface SchoolMember {
  role: 'admin' | 'coordinator' | 'teacher' | 'student';
  class_level: string;
  section: string;
  roll_no: string | null;
}

export interface SchoolLessonRef {
  ref: string;
  title: string;
}

export interface SchoolProgram {
  program_id: string;
  school_id: string;
  slug: string;
  title: string;
  category: string;
  track: string;
  class_min: number;
  class_max: number;
  description: string;
  curriculum: SchoolLessonRef[];
  status: string;
}

export interface SchoolNotice {
  notice_id: string;
  school_id: string;
  title: string;
  body: string;
  kind: string;
  pinned: boolean;
  published_at: string;
}

export interface SchoolHomeResponse {
  status: 'ok';
  school: School;
  member: SchoolMember;
  student: {
    id: string;
    name: string;
    xp: number;
    streak: number;
    avatar: string | null;
  };
  progress: {
    completed_count: number;
    by_program: Record<string, string[]>;
  };
  programs: SchoolProgram[];
  notices: SchoolNotice[];
}

export interface SchoolLoginResponse {
  status: 'ok';
  accessToken: string;
  user: AuthUser;
  school: { id: string; code: string; name: string };
  member: SchoolMember;
}

export async function lookupSchool(code: string): Promise<{ school: School }> {
  const res = await fetch(`${API_BASE_URL}/school/auth/school/${encodeURIComponent(code.toUpperCase())}`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'School lookup failed');
  return data;
}

export async function schoolLogin(payload: {
  schoolCode: string;
  rollNo: string;
  password: string;
}): Promise<SchoolLoginResponse> {
  const res = await fetch(`${API_BASE_URL}/school/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function schoolLogout(): Promise<void> {
  await fetch(`${API_BASE_URL}/school/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function schoolMe(): Promise<{
  user: AuthUser;
  school: { id: string; code: string; name: string };
  member: SchoolMember;
}> {
  const res = await apiFetch('/school/me');
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      const ok = await tryRefreshSession();
      if (!ok) throw new Error(data.error || 'Not authenticated');
      const r2 = await apiFetch('/school/me');
      const d2 = await r2.json();
      if (!r2.ok) throw new Error(d2.error || 'Not authenticated');
      return d2;
    }
    throw new Error(data.error || 'Failed to load school profile');
  }
  return data;
}

export async function schoolHome(): Promise<SchoolHomeResponse> {
  const res = await apiFetch('/school/home');
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      const ok = await tryRefreshSession();
      if (!ok) throw new Error(data.error || 'Not authenticated');
      const r2 = await apiFetch('/school/home');
      const d2 = await r2.json();
      if (!r2.ok) throw new Error(d2.error || 'Failed to load home');
      return d2;
    }
    throw new Error(data.error || 'Failed to load home');
  }
  return data;
}

export async function schoolCompleteLesson(payload: {
  programId: string;
  lessonRef: string;
}): Promise<{ status: 'ok' }> {
  const res = await apiFetch('/school/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      const ok = await tryRefreshSession();
      if (!ok) throw new Error(data.error || 'Not authenticated');
      const r2 = await apiFetch('/school/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d2 = await r2.json();
      if (!r2.ok) throw new Error(d2.error || 'Failed to save');
      return d2;
    }
    throw new Error(data.error || 'Failed to save');
  }
  return data;
}