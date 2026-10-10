import { API_BASE_URL, apiFetch } from './api';

// ============================================================================
// MOCK DRIVE & ASSESSMENT BRIDGE API CLIENT
//
// Types mirror backend/src/routes/drives.routes.ts and driveAdmin.routes.ts.
// The student endpoints go through `apiFetch` so a 15-minute access-token
// expiry transparently refreshes rather than bouncing the student mid-drive.
// ============================================================================

export interface DriveSummary {
  drive_id: string;
  title: string;
  company_name: string;
  description: string;
  drive_type: 'mock' | 'assessment' | 'quiz';
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  registration_mode: 'open' | 'roster' | 'invite';
  my_registration_status: string | null;
  registered: boolean;
  window_open: boolean;
}

export interface DriveTest {
  test_id: string;
  mode: 'external' | 'internal';
  name: string;
  slug: string;
  duration_minutes: number | null;
  total_questions: number | null;
  mandatory: boolean;
  sort_order: number;
  max_attempts: number;
  opens_at: string | null;
  closes_at: string | null;
  my_status: string | null;
  attempts_used: number;
  best_percentage: number | null;
}

export interface DriveDetail {
  drive: {
    drive_id: string;
    title: string;
    company_name: string;
    description: string;
    drive_type: string;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    registration_mode: string;
    results_visibility: string;
    eligibility: Record<string, any>;
    window_open: boolean;
  };
  registration: { registration_id: string; status: string; registered_at: string } | null;
  can_register: boolean;
  eligibility_blockers: string[];
  tests: DriveTest[];
}

export interface DriveResult {
  test_id: string;
  name: string;
  status: string | null;
  attempts_used: number;
  percentage: number | null;
  score: number | null;
  max_score: number | null;
  passed: boolean | null;
  submitted_at: string | null;
  sections: any[];
}

export interface StudentProfile {
  user_id: string;
  college_id: string;
  roll_no: string;
  branch: string | null;
  batch: string | null;
  degree: string | null;
  cgpa: number | string | null;
  class10_pct: number | string | null;
  class12_pct: number | string | null;
  backlogs: number;
  status: string;
  source: string;
}

const base = `${API_BASE_URL}/drives`;

const json = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    let body: any = null;
    try {
      body = await res.json();
      if (body?.error) msg = body.error;
    } catch { /* keep default */ }
    const err: any = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json();
};

// ─── Student ────────────────────────────────────────────────────────────────

export const fetchDrivesApi = async (): Promise<DriveSummary[]> =>
  json<{ drives: DriveSummary[] }>(await apiFetch(base)).then((r) => r.drives);

export const fetchDriveDetailApi = async (driveId: string): Promise<DriveDetail> =>
  json<DriveDetail>(await apiFetch(`${base}/${encodeURIComponent(driveId)}`));

export const registerForDriveApi = async (driveId: string, inviteToken?: string) =>
  json<{ registration: { registration_id: string; status: string } }>(
    await apiFetch(`${base}/${encodeURIComponent(driveId)}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_token: inviteToken || undefined }),
    })
  );

export const launchDriveTestApi = async (driveId: string, testId: string) =>
  json<{ launch_url: string; expires_at: string; provider: string }>(
    await apiFetch(`${base}/${encodeURIComponent(driveId)}/tests/${encodeURIComponent(testId)}/launch`, { method: 'POST' })
  );

export const fetchMyDriveResultsApi = async (driveId: string) =>
  json<{ drive_id: string; visible: boolean; results_visibility: string; tests: DriveResult[] }>(
    await apiFetch(`${base}/${encodeURIComponent(driveId)}/my-results`)
  );

// ─── Student profile ────────────────────────────────────────────────────────

const meBase = `${API_BASE_URL}/me`;

export const fetchMyProfilesApi = async (): Promise<StudentProfile[]> =>
  json<{ profiles: StudentProfile[] }>(await apiFetch(`${meBase}/student-profile`)).then((r) => r.profiles);

export const saveMyProfileApi = async (data: Partial<StudentProfile>) =>
  json<{ profile: StudentProfile }>(
    await apiFetch(`${meBase}/student-profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  );

// ─── Admin ──────────────────────────────────────────────────────────────────

const adminBase = `${API_BASE_URL}/admin/drives`;

const adminJson = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const res = await apiFetch(`${adminBase}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch { /* keep default */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
};

export interface AdminProvider {
  provider_id: string;
  code: string;
  name: string;
  base_url: string;
  launch_url: string;
  introspect_url: string;
  secret_env_prefix: string;
  status: string;
}

export interface AdminDriveTest {
  test_id: string;
  provider_id: string | null;
  mode: 'external' | 'internal';
  name: string;
  slug: string;
  provider_exam_id: string | null;
  skill_slug: string | null;
  duration_minutes: number | null;
  total_questions: number | null;
  provider_meta: Record<string, any>;
  status: string;
  provider_code?: string;
  provider_name?: string;
}

export interface AdminDrive {
  drive_id: string;
  college_id: string | null;
  title: string;
  company_name: string;
  description: string;
  drive_type: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  registration_mode: string;
  results_visibility: string;
  results_published: boolean;
  eligibility: Record<string, any>;
  test_count?: number;
  registration_count?: number;
}

export const adminFetchProvidersApi = (): Promise<AdminProvider[]> =>
  adminJson<{ providers: AdminProvider[] }>('/providers').then((r) => r.providers);

export const adminCreateProviderApi = (data: Partial<AdminProvider>) =>
  adminJson<{ provider: AdminProvider }>('/providers', { method: 'POST', body: JSON.stringify(data) }).then((r) => r.provider);

export const adminFetchTestsApi = (): Promise<AdminDriveTest[]> =>
  adminJson<{ tests: AdminDriveTest[] }>('/tests').then((r) => r.tests);

export const adminCreateTestApi = (data: Partial<AdminDriveTest>) =>
  adminJson<{ test: AdminDriveTest }>('/tests', { method: 'POST', body: JSON.stringify(data) }).then((r) => r.test);

export const adminFetchDrivesApi = (): Promise<AdminDrive[]> =>
  adminJson<{ drives: AdminDrive[] }>('').then((r) => r.drives);

export const adminCreateDriveApi = (data: Partial<AdminDrive>) =>
  adminJson<{ drive: AdminDrive }>('', { method: 'POST', body: JSON.stringify(data) }).then((r) => r.drive);

export const adminGetDriveApi = (driveId: string) =>
  adminJson<{ drive: AdminDrive; tests: any[] }>(`/${encodeURIComponent(driveId)}`);

export const adminUpdateDriveApi = (driveId: string, data: Partial<AdminDrive>) =>
  adminJson<{ drive: AdminDrive }>(`/${encodeURIComponent(driveId)}`, { method: 'PATCH', body: JSON.stringify(data) }).then((r) => r.drive);

export const adminPublishDriveApi = (driveId: string) =>
  adminJson<{ drive: AdminDrive }>(`/${encodeURIComponent(driveId)}/publish`, { method: 'POST' }).then((r) => r.drive);

export const adminAttachTestApi = (driveId: string, data: Record<string, any>) =>
  adminJson<{ ok: boolean }>(`/${encodeURIComponent(driveId)}/tests`, { method: 'POST', body: JSON.stringify(data) });

export const adminDetachTestApi = (driveId: string, testId: string) =>
  adminJson<{ ok: boolean }>(`/${encodeURIComponent(driveId)}/tests/${encodeURIComponent(testId)}`, { method: 'DELETE' });

export const adminFetchRegistrationsApi = (driveId: string) =>
  adminJson<{ registrations: any[] }>(`/${encodeURIComponent(driveId)}/registrations`).then((r) => r.registrations);

export interface DriveFunnel {
  registered: number;
  started: number;
  completed: number;
  absent: number;
  disqualified: number;
  attendance_pct: number;
  completion_pct: number;
}
export interface DriveScore {
  attempts: number;
  attempts_completed: number;
  avg_score: number | null;
  best_score: number | null;
  passed: number;
  pass_pct: number;
}
export interface DriveRoundStat {
  test_id: string;
  name: string;
  sort_order: number;
  assigned: number;
  unlocked: number;
  launched: number;
  in_progress: number;
  completed: number;
  not_shortlisted: number;
  attempts: number;
  avg_pct: number | null;
}
export interface DriveStats {
  drive_id: string;
  funnel: DriveFunnel;
  score: DriveScore;
  rounds: DriveRoundStat[];
  daily: { day: string; count: number }[];
  score_histogram: { bucket: number; count: number }[];
}

export const adminFetchDriveStatsApi = (driveId: string): Promise<DriveStats> =>
  adminJson<DriveStats>(`/${encodeURIComponent(driveId)}/stats`);

export interface RegQuery {
  search?: string;
  branch?: string;
  batch?: string;
  status?: string;
  page?: number;
  limit?: number;
}
export const adminFetchRegistrationsPageApi = (driveId: string, q: RegQuery = {}) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') qs.set(k, String(v));
  const suffix = qs.toString() ? `?${qs}` : '';
  return adminJson<{ registrations: any[]; total: number; page: number; limit: number }>(
    `/${encodeURIComponent(driveId)}/registrations${suffix}`
  );
};

export const adminFetchAttemptsApi = (driveId: string, q: { test_id?: string; result?: string; page?: number; limit?: number } = {}) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') qs.set(k, String(v));
  const suffix = qs.toString() ? `?${qs}` : '';
  return adminJson<{ attempts: any[]; total: number; page: number; limit: number }>(
    `/${encodeURIComponent(driveId)}/attempts${suffix}`
  );
};

export const adminImportRegistrationsApi = (driveId: string, rows: { roll_no: string; college_id?: string }[]) =>
  adminJson<{ imported: number; results: any[] }>(`/${encodeURIComponent(driveId)}/registrations/import`, {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });

export const adminShortlistApi = (driveId: string, payload: { test_id: string; user_ids: string[]; shortlisted: boolean }) =>
  adminJson<{ updated: number }>(`/${encodeURIComponent(driveId)}/shortlist`, { method: 'POST', body: JSON.stringify(payload) });

export const adminFetchResultsApi = (driveId: string) =>
  adminJson<{ drive_id: string; results: any[] }>(`/${encodeURIComponent(driveId)}/results`);

export const adminPublishResultsApi = (driveId: string) =>
  adminJson<{ drive: AdminDrive }>(`/${encodeURIComponent(driveId)}/publish-results`, { method: 'POST' }).then((r) => r.drive);

/**
 * Downloads the results CSV through `apiFetch` (which carries the bearer token),
 * because the endpoint is admin-gated — a plain `<a href>` would arrive without
 * credentials and 401. The blob is saved via an object URL the caller revokes.
 */
export const adminDownloadResultsCsv = async (driveId: string, filename?: string): Promise<void> => {
  const res = await apiFetch(`${adminBase}/${encodeURIComponent(driveId)}/results.csv`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `drive-${driveId}-results.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
