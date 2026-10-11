// ============================================================================
// MOCK DRIVE MODULE — shared types
//
// These mirror the shapes the Section 15 student endpoints return
// (backend/src/routes/drives.routes.ts). The server is the source of truth for
// `status_line`, eligibility and window state — the client only renders.
// ============================================================================

/** Everything the UI needs to render one drive in a list. */
export interface DriveListItem {
  drive_id: string;
  title: string;
  company_name: string;
  company_logo_url: string | null;
  description: string;
  description_md: string | null;
  drive_type: string;
  status: string;
  location: string | null;
  job_type: string | null;
  category: string | null;
  job_function: string | null;
  ctc_min: number | null;
  ctc_max: number | null;
  starts_at: string | null;
  ends_at: string | null;
  starts_at_ist: string | null;
  ends_at_ist: string | null;
  registration_mode: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  registration_opens_at_ist: string | null;
  registration_closes_at_ist: string | null;
  my_registration_status: string | null;
  registered: boolean;
  window_open: boolean;
  registration_open: boolean;
  /** Server-computed single line: "Registration open", "Closed", "Popular"… */
  status_line: string;
}

/** A round within a drive. The server resolves unlock + attempts state. */
export interface DriveRound {
  test_id: string;
  round_name: string | null;
  kind: string | null;
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
  /** Server-derived label for the workflow stepper ("locked", "unlocked"…). */
  status_label: string;
}

/** Full detail payload for the drive detail screen. */
export interface DriveDetail {
  server_now: string;
  drive: {
    drive_id: string;
    title: string;
    company_name: string;
    company_logo_url: string | null;
    description: string;
    description_md: string | null;
    additional_info_md: string | null;
    drive_type: string;
    status: string;
    location: string | null;
    job_type: string | null;
    category: string | null;
    job_function: string | null;
    ctc_min: number | null;
    ctc_max: number | null;
    starts_at: string | null;
    ends_at: string | null;
    starts_at_ist: string | null;
    ends_at_ist: string | null;
    registration_mode: string;
    registration_opens_at_ist: string | null;
    registration_closes_at_ist: string | null;
    results_visibility: string;
    fee_amount_paise: number;
    other_info: Record<string, any>;
    documents: { title: string; url: string }[];
    tpo_contact: { name?: string; email?: string; phone?: string };
    eligibility: Record<string, any>;
    window_open: boolean;
    registration_open: boolean;
    status_line: string;
  };
  registration: { registration_id: string; status: string; registered_at: string } | null;
  payment: DrivePaymentBrief | null;
  booking: DriveBookingBrief | null;
  can_register: boolean;
  eligibility_blockers: string[];
  rounds: DriveRound[];
  /**
   * Legacy accessor — earlier pages (e.g. `pages/drives/[driveId]`) read the
   * rounds off `detail.tests`. `rounds` is the canonical field; this is kept as
   * an alias so those pages keep compiling without a rename.
   */
  tests: DriveRound[];
}

/** One row on the Assessments tab — an attempt rolled up with its drive/test. */
export interface DriveAssessment {
  attempt_id: string;
  drive_id: string;
  test_id: string | null;
  drive_title: string;
  company_name: string;
  company_logo_url: string | null;
  drive_type: string;
  test_name: string | null;
  mode: string | null;
  duration_minutes: number | null;
  total_questions: number | null;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  percentage: number | null;
  score: number | null;
  max_score: number | null;
  passed: boolean | null;
}

/** A scheduled interview on the Interviews tab. */
export interface DriveInterview {
  interview_id: string;
  drive_id: string;
  drive_title: string;
  company_name: string;
  company_logo_url: string | null;
  round_name: string;
  scheduled_at: string | null;
  scheduled_at_ist: string | null;
  duration_minutes: number;
  mode: string;
  location: string | null;
  meeting_url: string | null;
  interviewer: string | null;
  status: string;
  notes: string | null;
}

/** Latest payment row attached to a drive detail payload. */
export interface DrivePaymentBrief {
  payment_id: string;
  amount_paise: number;
  status: 'submitted' | 'approved' | 'rejected';
  utr: string | null;
  proof_name: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

/** The student's booked slot + link activation state. */
export interface DriveBookingBrief {
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

/** One "what should I do now" card on Home. */
export interface DriveNeedsAction {
  drive_id: string;
  title: string;
  company_name: string;
  company_logo_url: string | null;
  registration_status: string;
  type: 'pay' | 'payment_review' | 'slot' | 'slot_confirmed' | 'link_waiting' | 'test_ready';
  message: string;
  starts_at?: string | null;
}

/** Nearest booked slot so Home can run the live countdown. */
export interface DriveNextTest {
  drive_id: string;
  title: string;
  company_name: string;
  company_logo_url: string | null;
  registration_status: string;
  starts_at: string;
  ends_at: string;
  link_active_at: string | null;
  booking_id: string;
}

/** Aggregated payload for the Home tab. */
export interface DriveHome {
  server_now: string;
  upcoming: {
    drive_id: string;
    title: string;
    company_name: string;
    company_logo_url: string | null;
    location: string | null;
    starts_at: string | null;
    starts_at_ist: string | null;
    registration_opens_at: string | null;
    status_line: string;
  }[];
  open_for_you: {
    drive_id: string;
    title: string;
    company_name: string;
    company_logo_url: string | null;
    location: string | null;
    ctc_min: number | null;
    ctc_max: number | null;
    registration_closes_at: string | null;
    registration_closes_at_ist: string | null;
    status_line: string;
  }[];
  in_progress: {
    attempt_id: string;
    drive_id: string;
    test_id: string | null;
    drive_title: string;
    company_name: string;
    test_name: string | null;
    started_at: string | null;
    started_at_ist: string | null;
  }[];
  needs_action: DriveNeedsAction[];
  next_test: DriveNextTest | null;
  stats: {
    applied: number;
    open: number;
    in_progress: number;
    completed: number;
  };
  recent_notifications: {
    kind: string;
    title: string;
    body: string;
    read: boolean;
    created_at: string;
    created_at_ist: string;
  }[];
  unread_notifications: number;
}

/** An uploaded resume in the student's vault. */
export interface StudentResume {
  resume_id: string;
  title: string;
  file_name: string;
  size_bytes: number;
  is_default: boolean;
  created_at: string;
}

/** A drive notification row. */
export interface DriveNotification {
  notification_id: string;
  drive_id: string | null;
  kind: string;
  channel: string;
  status: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  created_at_ist: string | null;
}

/** Notification / preference toggles on the Settings screen. */
export interface DriveSettings {
  email: string | null;
  name: string | null;
  college: string | null;
  email_notifications: boolean;
  push_notifications: boolean;
  drive_alerts: boolean;
}

/** A pending/approved profile correction. */
export interface ProfileCorrection {
  correction_id: string;
  field: string;
  from_value: string | null;
  to_value: string | null;
  status: string;
  created_at: string;
}

/** The student's academic profile (one row per college). */
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
