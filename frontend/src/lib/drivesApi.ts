import { API_BASE_URL, apiFetch, tryRefreshSession } from './api';
import { getAccessToken } from './auth';
import type {
  DriveListItem, DriveDetail, DriveAssessment, DriveInterview, DriveHome,
  StudentResume, DriveNotification, DriveSettings, ProfileCorrection, StudentProfile,
} from '@/types/drives';

// Re-exported so existing call sites (`StudentProfileCard`, `drives/[driveId]`)
// that import these from '@/lib/drivesApi' keep resolving. Canonical definitions
// live in '@/types/drives'.
export type { DriveDetail, StudentProfile } from '@/types/drives';

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

const base = `${API_BASE_URL}/drives`;

// Server errors come back as snake_case keys; show students a sentence instead.
const ERROR_MESSAGES: Record<string, string> = {
  drive_not_found: 'This drive is no longer available.',
  drive_not_available: 'This drive is not available for your college.',
  drive_not_open: 'This round is not open right now.',
  registration_window_closed: 'Registration for this drive is closed.',
  not_eligible: 'You are not eligible for this drive.',
  not_on_roster: 'You are not on this college roster.',
  not_registered: 'Register for this drive first.',
  not_shortlisted: 'You have not been shortlisted for this round.',
  profile_missing: 'Complete your student profile first.',
  invite_required: 'You need an invitation for this drive.',
  disqualified: 'Your attempt was disqualified.',
  no_attempts_remaining: 'No attempts remaining.',
  test_not_found: 'This test is no longer available.',
  test_locked: 'This test is locked.',
  test_not_open: 'This test is not open right now.',
  test_window_closed: 'The test window has closed.',
  attempt_not_found: 'This attempt could not be found.',
  resume_not_found: 'That resume is no longer available.',
  provider_unavailable: 'The test platform is unavailable right now. Try again shortly.',
  internal_mode_not_enabled: 'Direct test launch is not enabled on this server.',
  drive_has_attempts: 'This drive has student attempts — close it instead of deleting it.',
  round_not_found: 'That round is no longer attached to this drive.',
  no_audience: 'No registered students to notify yet.',
  attach_at_least_one_test: 'Attach at least one test (round) before publishing.',
  title_required: 'A title is required.',
  payment_not_required: 'No payment is needed for this drive.',
  utr_required: 'Enter your UTR / transaction reference.',
  payment_under_review: 'Your payment proof is already under review.',
  payment_not_approved: 'Payment approval is required before booking a slot.',
  payment_rejected: 'Your payment was rejected — upload it again.',
  payment_already_reviewed: 'This payment was already reviewed.',
  payment_not_found: 'Payment not found.',
  slot_full: 'That slot is full — pick another one.',
  already_booked: 'You already have a slot booked.',
  slot_not_found: 'That slot is no longer available.',
  slot_not_booked: 'Book your test slot first.',
  link_not_active: 'The test link is not active yet — the admin will activate it.',
  link_not_assigned: 'No test link has been assigned to this booking yet.',
  slot_not_started: 'Your slot has not started yet.',
  slot_window_closed: 'Your slot window has closed — contact support.',
  slot_has_bookings: 'This slot has bookings — cancel them first.',
  booking_cancelled: 'This booking was cancelled.',
  already_cancelled: 'This booking is already cancelled.',
  invalid_slot_window: 'Invalid slot timings.',
  start_date_required: 'Pick a start date (YYYY-MM-DD).',
  times_required: 'Add at least one start time.',
  round_or_url_required: 'Enter a round name or test URL.',
  invalid_capacity: 'Invalid seat capacity.',
  invalid_status: 'Invalid status.',
  proof_not_found: 'The payment screenshot could not be loaded.',
  booking_not_found: 'Booking not found.',
  slot_exists: 'A slot at that time already exists.',
  phone_required: 'Enter your 10-digit mobile number to register.',
  invalid_phone: 'That does not look like a valid 10-digit mobile number.',
  subject_and_body_required: 'Subject and message are required.',
  registration_not_found: 'That registration was not found.',
  no_proof_file: 'Upload a PNG, JPG, WebP or PDF payment screenshot.',
};

const humanError = (raw: any): string =>
  (typeof raw === 'string' && ERROR_MESSAGES[raw]) || raw || null;

const json = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    let body: any = null;
    try {
      body = await res.json();
      if (body?.error) msg = humanError(body.error);
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

export const fetchMyDriveResultsApi = async (driveId: string) =>
  json<{ drive_id: string; visible: boolean; results_visibility: string; tests: DriveResult[] }>(
    await apiFetch(`${base}/${encodeURIComponent(driveId)}/my-results`)
  );

// ─── Student profile ────────────────────────────────────────────────────────

const meBase = `${API_BASE_URL}/me`;

export const fetchMyProfilesApi = async (): Promise<StudentProfile[]> =>
  json<{ profiles: StudentProfile[] }>(await apiFetch(`${meBase}`)).then((r) => r.profiles);

export const saveMyProfileApi = async (data: Partial<StudentProfile>) =>
  json<{ profile: StudentProfile }>(
    await apiFetch(`${meBase}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  );

// ─── Section 15 — richer student surfaces ───────────────────────────────────

export interface DriveConfig {
  support_phone: string;
  support_email: string;
  platform_name: string;
  upi_id: string;
  upi_qr: string;
  merchant_name: string;
  upi_instructions: string;
}

export const fetchDriveConfigApi = async (): Promise<DriveConfig> =>
  json<DriveConfig>(await apiFetch(`${base}/config`));

export const fetchDriveHomeApi = async (): Promise<DriveHome> =>
  json<DriveHome>(await apiFetch(`${base}/home`));

export const fetchDriveListApi = async (): Promise<DriveListItem[]> =>
  json<{ server_now: string; drives: DriveListItem[] }>(await apiFetch(`${base}/list`)).then((r) => r.drives);

export const fetchDriveDetailApi = async (driveId: string): Promise<DriveDetail> =>
  json<DriveDetail>(await apiFetch(`${base}/${encodeURIComponent(driveId)}`));

export const fetchDriveAssessmentsApi = async (tab: 'all' | 'active' | 'completed' = 'all'): Promise<DriveAssessment[]> =>
  json<{ attempts: DriveAssessment[] }>(await apiFetch(`${base}/assessments?tab=${tab}`)).then((r) => r.attempts);

export const fetchDriveAttemptApi = async (attemptId: string): Promise<DriveAssessment> =>
  json<{ attempt: DriveAssessment }>(await apiFetch(`${base}/attempts/${encodeURIComponent(attemptId)}`)).then((r) => r.attempt);

export const fetchDriveInterviewsApi = async (): Promise<DriveInterview[]> =>
  json<{ interviews: DriveInterview[] }>(await apiFetch(`${base}/interviews`)).then((r) => r.interviews);

export const registerForDriveApi = async (driveId: string, inviteToken?: string, phone?: string) =>
  json<{ registration: { registration_id: string; status: string } }>(
    await apiFetch(`${base}/${encodeURIComponent(driveId)}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_token: inviteToken || undefined, phone: phone || undefined }),
    })
  );

export const launchDriveTestApi = async (driveId: string, testId: string) =>
  json<{ launch_url: string; expires_at: string; provider: string }>(
    await apiFetch(`${base}/${encodeURIComponent(driveId)}/tests/${encodeURIComponent(testId)}/launch`, { method: 'POST' })
  );

// ─── Payment & slots (student) ──────────────────────────────────────────────

export interface DrivePayment {
  payment_id: string;
  amount_paise: number;
  status: 'submitted' | 'approved' | 'rejected';
  utr: string | null;
  proof_name: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface DrivePaymentState {
  server_now: string;
  fee_amount_paise: number;
  registration_status: string | null;
  payments: DrivePayment[];
  latest: DrivePayment | null;
}

export interface DriveSlot {
  slot_id: string;
  slot_date: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: string;
  remaining?: number;
}

export interface DriveBooking {
  booking_id: string;
  status: 'booked' | 'link_assigned' | 'active' | 'completed' | 'cancelled';
  round_name: string | null;
  test_url: string | null;
  link_assigned_at: string | null;
  link_active_at: string | null;
  starts_at: string;
  ends_at: string;
  slot_date: string | null;
}

export const fetchDrivePaymentApi = async (driveId: string): Promise<DrivePaymentState> =>
  json<DrivePaymentState>(await apiFetch(`${base}/${encodeURIComponent(driveId)}/payment`));

export const fetchDriveSlotsApi = async (driveId: string) =>
  json<{
    server_now: string;
    fee_amount_paise: number;
    registration_status: string;
    can_book: boolean;
    slots: DriveSlot[];
    booking: Omit<DriveBooking, 'round_name' | 'test_url'> | null;
  }>(await apiFetch(`${base}/${encodeURIComponent(driveId)}/slots`));

export const bookDriveSlotApi = async (driveId: string, slotId: string) =>
  json<{ booking: DriveBooking; registration_status: string }>(
    await apiFetch(`${base}/${encodeURIComponent(driveId)}/slots/${encodeURIComponent(slotId)}/book`, { method: 'POST' })
  );

export const fetchDriveBookingApi = async (driveId: string) =>
  json<{ server_now: string; registration_status: string; booking: DriveBooking | null }>(
    await apiFetch(`${base}/${encodeURIComponent(driveId)}/booking`)
  );

// Multipart upload with the same transparent refresh behaviour as resume
// uploads: XHR so FormData keeps its boundary and 401 can be retried once.
export const submitPaymentProofApi = async (
  driveId: string,
  file: File,
  utr: string,
  onProgress?: (percent: number) => void
): Promise<{ payment: DrivePayment; registration_status: string; message: string }> => {
  const sendUpload = (token?: string | null): Promise<any> =>
    new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('proof', file);
      form.append('utr', utr);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${base}/${encodeURIComponent(driveId)}/payment/proof`);
      xhr.timeout = 120000;
      const authToken = token !== undefined ? token : getAccessToken();
      if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status === 401) return resolve({ __is401: true });
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(humanError(data.error) || `Upload failed (status ${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed with server status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload — check your connection.'));
      xhr.ontimeout = () => reject(new Error('Upload timed out after 120 seconds.'));
      xhr.send(form);
    });

  let res = await sendUpload();
  if (res && res.__is401) {
    const refreshed = await tryRefreshSession();
    if (!refreshed) throw new Error('Session expired — please sign in again.');
    res = await sendUpload(getAccessToken());
  }
  if (res && res.__is401) throw new Error('Session expired — please sign in again.');
  return res;
};

// ─── Resumes ────────────────────────────────────────────────────────────────

export const fetchResumesApi = async (): Promise<StudentResume[]> =>
  json<{ resumes: StudentResume[] }>(await apiFetch(`${meBase}/resumes`)).then((r) => r.resumes);

// Real multipart upload. Mirrors `uploadModulePdfApi`: XHR so we get upload
// progress, plus a transparent access-token refresh on the 401 race that can
// happen right after the 15-minute token expires mid-drive.
export const uploadResumeApi = async (
  file: File,
  title?: string,
  onProgress?: (percent: number) => void
): Promise<{ resume: StudentResume }> => {
  const sendUpload = (token?: string | null): Promise<any> =>
    new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', file);
      if (title) form.append('title', title);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${meBase}/resumes/upload`);
      xhr.timeout = 120000;
      const authToken = token !== undefined ? token : getAccessToken();
      if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status === 401) return resolve({ __is401: true });
        if (xhr.status === 413) return reject(new Error('Resume exceeds the 8MB limit.'));
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data.error || `Upload failed (status ${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed with server status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload — check your connection.'));
      xhr.ontimeout = () => reject(new Error('Upload timed out after 120 seconds.'));
      xhr.send(form);
    });

  let res = await sendUpload();
  if (res && res.__is401) {
    const refreshed = await tryRefreshSession();
    if (!refreshed) throw new Error('Session expired — please sign in again.');
    res = await sendUpload(getAccessToken());
  }
  if (res && res.__is401) throw new Error('Session expired — please sign in again.');
  return res;
};

// URL for a stored resume PDF (used by the register flow / preview).
export const resumeFileUrl = (resumeId: string) =>
  `${meBase}/resumes/${encodeURIComponent(resumeId)}/file`;

export const deleteResumeApi = async (resumeId: string) =>
  json<{ ok: boolean }>(await apiFetch(`${meBase}/resumes/${encodeURIComponent(resumeId)}`, { method: 'DELETE' }));

// ─── Notifications ──────────────────────────────────────────────────────────

export const fetchNotificationsApi = async (): Promise<DriveNotification[]> =>
  json<{ notifications: DriveNotification[] }>(await apiFetch(`${meBase}/notifications`)).then((r) => r.notifications);

export const markNotificationsReadApi = async (): Promise<{ ok: boolean }> =>
  json(await apiFetch(`${meBase}/notifications/read-all`, { method: 'POST' }));

export const fetchUnreadCountApi = async (): Promise<number> =>
  json<{ unread: number }>(await apiFetch(`${meBase}/notifications/unread`)).then((r) => r.unread);

// ─── Settings ───────────────────────────────────────────────────────────────

export const fetchDriveSettingsApi = async (): Promise<DriveSettings> =>
  json<DriveSettings>(await apiFetch(`${meBase}/settings`));

export const saveDriveSettingsApi = async (data: { email_notifications?: boolean; push_notifications?: boolean; drive_alerts?: boolean }) =>
  json<{ ok: boolean }>(
    await apiFetch(`${meBase}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  );

// ─── Profile corrections ────────────────────────────────────────────────────

export const submitProfileCorrectionApi = async (data: { field: string; to_value: string; reason?: string }) =>
  json<{ correction: ProfileCorrection }>(
    await apiFetch(`${meBase}/corrections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  );

export const fetchProfileCorrectionsApi = async (): Promise<ProfileCorrection[]> =>
  json<{ corrections: ProfileCorrection[] }>(await apiFetch(`${meBase}/corrections`)).then((r) => r.corrections);

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
      if (body?.error) msg = humanError(body.error);
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
  /** Section 15 enrichment — mirrors the mock_drive ext columns. */
  company_logo_url: string | null;
  location: string | null;
  job_type: string | null;
  category: string | null;
  job_function: string | null;
  ctc_min: number | null;
  ctc_max: number | null;
  description_md: string | null;
  additional_info_md: string | null;
  other_info: Record<string, any>;
  documents: { title: string; url: string }[];
  tpo_contact: { name?: string; email?: string; phone?: string };
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  fee_amount_paise: number;
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

export const adminUpdateRoundApi = (driveId: string, testId: string, data: Record<string, any>) =>
  adminJson<{ round: any }>(
    `/${encodeURIComponent(driveId)}/tests/${encodeURIComponent(testId)}`,
    { method: 'PATCH', body: JSON.stringify(data) }
  ).then((r) => r.round);

export const adminUnpublishDriveApi = (driveId: string) =>
  adminJson<{ drive: AdminDrive }>(`/${encodeURIComponent(driveId)}/unpublish`, { method: 'POST' }).then((r) => r.drive);

export const adminDeleteDriveApi = (driveId: string) =>
  adminJson<{ ok: boolean }>(`/${encodeURIComponent(driveId)}`, { method: 'DELETE' });

export const adminNotifyDriveApi = (driveId: string, data: { title: string; body?: string }) =>
  adminJson<{ ok: boolean; notified: number }>(`/${encodeURIComponent(driveId)}/notify`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

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

// ─── Payments & slots (admin) ───────────────────────────────────────────────

export interface AdminPaymentRow {
  payment_id: string;
  user_id: string;
  user_email: string;
  roll_no: string | null;
  amount_paise: number;
  status: 'submitted' | 'approved' | 'rejected';
  utr: string | null;
  proof_name: string | null;
  reviewer_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  registration_status: string | null;
}

export interface AdminSlotRow {
  slot_id: string;
  slot_date: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: 'open' | 'closed';
  booked: number;
}

export interface AdminBookingRow {
  booking_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  roll_no: string | null;
  contact_phone: string | null;
  payment_status: string | null;
  status: 'booked' | 'link_assigned' | 'active' | 'completed' | 'cancelled';
  round_name: string | null;
  test_url: string | null;
  link_assigned_at: string | null;
  link_active_at: string | null;
  created_at: string;
  registration_status: string | null;
  slot_id: string;
  slot_date: string;
  starts_at: string;
  ends_at: string;
}

export const adminListPaymentsApi = (driveId: string, status = 'all') =>
  adminJson<{ fee_amount_paise: number; counts: { submitted: number; approved: number; rejected: number }; payments: AdminPaymentRow[] }>(
    `/${encodeURIComponent(driveId)}/payments?status=${encodeURIComponent(status)}`
  );

export const adminApprovePaymentApi = (driveId: string, paymentId: string, note?: string) =>
  adminJson<{ ok: boolean }>(`/${encodeURIComponent(driveId)}/payments/${encodeURIComponent(paymentId)}/approve`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });

export const adminRejectPaymentApi = (driveId: string, paymentId: string, note?: string) =>
  adminJson<{ ok: boolean }>(`/${encodeURIComponent(driveId)}/payments/${encodeURIComponent(paymentId)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });

/** Streams the authenticated proof image/PDF and opens it in a new tab. */
export const adminOpenPaymentProofApi = async (driveId: string, paymentId: string): Promise<void> => {
  const res = await apiFetch(`${adminBase}/${encodeURIComponent(driveId)}/payments/${encodeURIComponent(paymentId)}/proof`);
  if (!res.ok) throw new Error(humanError('proof_not_found'));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

export const adminListSlotsApi = (driveId: string) =>
  adminJson<{ slots: AdminSlotRow[] }>(`/${encodeURIComponent(driveId)}/slots`);

export const adminGenerateSlotsApi = (
  driveId: string,
  data: { start_date: string; days: number; times: string[]; capacity: number; duration_minutes?: number }
) =>
  adminJson<{ ok: boolean; created: number }>(`/${encodeURIComponent(driveId)}/slots/generate`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const adminCreateSlotApi = (driveId: string, data: { starts_at: string; ends_at: string; capacity: number }) =>
  adminJson<{ slot: AdminSlotRow }>(`/${encodeURIComponent(driveId)}/slots`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const adminUpdateSlotApi = (driveId: string, slotId: string, data: { capacity?: number; status?: string }) =>
  adminJson<{ slot: AdminSlotRow }>(`/${encodeURIComponent(driveId)}/slots/${encodeURIComponent(slotId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const adminDeleteSlotApi = (driveId: string, slotId: string) =>
  adminJson<{ ok: boolean }>(`/${encodeURIComponent(driveId)}/slots/${encodeURIComponent(slotId)}`, { method: 'DELETE' });

export const adminListBookingsApi = (driveId: string) =>
  adminJson<{ server_now: string; bookings: AdminBookingRow[] }>(`/${encodeURIComponent(driveId)}/bookings`);

export const adminAssignBookingApi = (driveId: string, bookingId: string, data: { round_name?: string; test_url?: string }) =>
  adminJson<{ booking: AdminBookingRow }>(`/${encodeURIComponent(driveId)}/bookings/${encodeURIComponent(bookingId)}/assign`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const adminActivateBookingApi = (driveId: string, bookingId: string) =>
  adminJson<{ booking: AdminBookingRow }>(`/${encodeURIComponent(driveId)}/bookings/${encodeURIComponent(bookingId)}/activate`, {
    method: 'POST',
  });

export const adminDeactivateBookingApi = (driveId: string, bookingId: string) =>
  adminJson<{ booking: AdminBookingRow }>(`/${encodeURIComponent(driveId)}/bookings/${encodeURIComponent(bookingId)}/deactivate`, {
    method: 'POST',
  });

export const adminCancelBookingApi = (driveId: string, bookingId: string) =>
  adminJson<{ ok: boolean; registration_status: string }>(
    `/${encodeURIComponent(driveId)}/bookings/${encodeURIComponent(bookingId)}/cancel`,
    { method: 'POST' }
  );

// ─── Slot-level bulk release + email (admin) ────────────────────────────────

/** Assign round + URL to every live booking in the slot in one call. */
export const adminAssignSlotBulkApi = (driveId: string, slotId: string, data: { round_name?: string; test_url?: string }) =>
  adminJson<{ updated: number }>(`/${encodeURIComponent(driveId)}/slots/${encodeURIComponent(slotId)}/assign`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

/** Release (activate) every assigned-but-dormant link in the slot. */
export const adminActivateSlotBulkApi = (driveId: string, slotId: string) =>
  adminJson<{ updated: number }>(`/${encodeURIComponent(driveId)}/slots/${encodeURIComponent(slotId)}/activate`, {
    method: 'POST',
  });

/** Pull every active link in the slot back. */
export const adminDeactivateSlotBulkApi = (driveId: string, slotId: string) =>
  adminJson<{ updated: number }>(`/${encodeURIComponent(driveId)}/slots/${encodeURIComponent(slotId)}/deactivate`, {
    method: 'POST',
  });

/**
 * Compose an email to a scope: all registrants, one slot's bookings, or a
 * single student. Queued server-side — `queued` is the recipient count.
 */
export const adminSendDriveEmailApi = (
  driveId: string,
  data: { scope: 'all' | 'slot' | 'student'; slot_id?: string; registration_id?: string; subject: string; body: string }
) =>
  adminJson<{ queued: number }>(`/${encodeURIComponent(driveId)}/email`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
