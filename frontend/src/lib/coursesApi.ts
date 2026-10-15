// ============================================================================
// COURSES
//
// Every endpoint the course engine exposes. The response types come from
// @/types and are asserted end-to-end by backend/src/scripts/smokeCourses.ts.
//
// Two rules the UI depends on:
//   1. A locked lesson arrives WITHOUT blocks/video/quiz. Check `.state` and the
//      absence of those fields before rendering a player.
//   2. Progress heartbeats return credited_seconds AND rejected_seconds. Show
//      the rejected amount instead of pretending the claim was accepted.
// ============================================================================

import { API_BASE_URL, apiFetch } from './api';
import { certificateError } from './certificateErrors';
import type {
  CourseCatalogResponse,
  CourseDetail,
  CourseQuizOutcome,
  CourseFeedback,
  MyCoursesResponse,
  LessonProgressResponse,
  CertificateSummary,
  CertificateVerifyResponse,
  AdminCourseListResponse,
  AdminCourseDetail,
  AdminCourseForEditor,
  AdminCertificatesResponse,
  CertificateReadiness,
  AdminLessonQuiz,
  AdminXpResponse,
  VideoResolveResponse,
  CourseModule,
  CourseLessonView,
  CatalogFilters,
  CourseCard,
  CourseInstructor,
  ContentBlock,
} from '@/types';

const COURSES = `${API_BASE_URL}/courses`;
const COURSE_ADMIN = `${API_BASE_URL}/course-admin`;

/** Pull the server's error message out of a failed response. */
async function apiError(res: Response, fallback: string): Promise<Error> {
  const data = await res.json().catch(() => ({}));
  return new Error(data?.error || fallback);
}

/**
 * An error safe to show a learner, for the certificate endpoints.
 *
 * The policy — which failures are ours to hide and which are the learner's to read
 * — lives in `certificateErrors` so it can be unit tested without a DOM. This is
 * only the wiring: read the body once, hand over the status and the message.
 *
 * Scoped to the certificate calls on purpose. A blanket rewrite here would be
 * wrong: the admin course form shows the server's own wording because
 * "Instructor name is required" is written for the person typing into it.
 */
async function certificateApiError(res: Response, action: string): Promise<Error> {
  const data = await res.json().catch(() => ({}));
  const serverMessage = typeof data?.error === 'string' ? data.error : '';
  return certificateError(res.status, serverMessage, action, (detail) => {
    // eslint-disable-next-line no-console
    console.error(`[certificate] ${action.toLowerCase()} unavailable (${res.status}):`, detail);
  });
}

// --- Public: browsing -------------------------------------------------------

/** Serialise the filter state into the query string the catalogue endpoint reads. */
function catalogQueryString(params?: Partial<CatalogFilters> & { page?: number }): string {
  const qs = new URLSearchParams();
  if (params?.q?.trim()) qs.set('q', params.q.trim());
  // Repeated params, not comma-joined, so a value containing a comma cannot
  // split into two filters. The server accepts both forms.
  //
  // `branch` and `bucket` ride along with the rest: the catalogue page reads
  // its state from the URL, and a client refetch that dropped the branch
  // would answer a filtered URL with the whole catalogue.
  for (const key of ['branch', 'bucket', 'category', 'tag', 'type', 'level'] as const) {
    for (const value of params?.[key] || []) {
      if (value) qs.append(key, value);
    }
  }
  if (params?.sort && params.sort !== 'popular') qs.set('sort', params.sort);
  if (params?.page && params.page > 1) qs.set('page', String(params.page));
  const suffix = qs.toString();
  return suffix ? `?${suffix}` : '';
}

/**
 * Public catalogue. Filtering and sorting happen on the server so the facet
 * counts returned alongside the cards describe the real result set — filtering
 * in the browser would mean shipping every course to every visitor and then
 * guessing at counts from one page.
 */
export const fetchCourseCatalog = async (
  params?: Partial<CatalogFilters> & { page?: number }
): Promise<CourseCatalogResponse> => {
  const res = await apiFetch(`${COURSES}${catalogQueryString(params)}`);
  if (!res.ok) throw await apiError(res, 'Could not load the course catalogue');
  return res.json();
};

export const fetchCourse = async (slug: string): Promise<CourseDetail> => {
  const res = await apiFetch(`${COURSES}/${encodeURIComponent(slug)}`);
  if (!res.ok) throw await apiError(res, 'Course not found');
  const data = await res.json();
  return data.course;
};

/** Sibling courses for the detail page. Fetched separately so it can be optional. */
export const fetchRelatedCourses = async (slug: string): Promise<CourseCard[]> => {
  const res = await apiFetch(`${COURSES}/${encodeURIComponent(slug)}/related`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.courses || [];
};

export interface CourseReview {
  user_name: string;
  rating: number;
  what_learned: string;
  would_recommend: boolean;
  created_at: string;
}

/**
 * Read-only reviews for a course page. Every row here is post-completion
 * feedback the server accepted (see POST /:slug/feedback), so this list can
 * only ever contain people who finished. Never throws: an empty or failed
 * load renders as "no reviews yet", which is an honest state on the page.
 */
export const fetchCourseReviews = async (
  slug: string
): Promise<{ reviews: CourseReview[]; total: number }> => {
  const res = await apiFetch(`${COURSES}/${encodeURIComponent(slug)}/reviews`);
  if (!res.ok) return { reviews: [], total: 0 };
  const data = await res.json();
  return { reviews: data.reviews || [], total: data.total || 0 };
};

/**
 * The public first-lesson sample. Paid courses 403 on their main detail
 * endpoint for anonymous visitors, so this is the only way a shopper ever
 * reads a lesson body — one lesson, no quiz. Null when the course has no
 * lessons yet; never throws.
 */
export const fetchCourseSample = async (
  slug: string
): Promise<{
  id: string;
  title: string;
  summary?: string;
  blocks?: ContentBlock[];
  module_title?: string;
  duration_minutes?: number;
} | null> => {
  const res = await apiFetch(`${COURSES}/${encodeURIComponent(slug)}/sample`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.lesson || null;
};

export const fetchLesson = async (
  lessonId: string
): Promise<{
  course: { id: string; slug: string; title: string; certificate_eligible: boolean };
  module: { id: string; title: string; sort_order: number };
  lesson: CourseLessonView & { state: NonNullable<CourseLessonView['state']> };
  locked: boolean;
  lock_reason: string | null;
  progress: unknown;
}> => {
  const res = await apiFetch(`${COURSES}/lessons/${encodeURIComponent(lessonId)}`);
  if (!res.ok) throw await apiError(res, 'Lesson not found');
  return res.json();
};

// --- Admin: course cover ----------------------------------------------------

/**
 * Upload a course thumbnail, or clear it with `file` omitted.
 *
 * Uses `fetch` with a `FormData` body rather than the JSON helper: a multipart
 * body must not carry a `Content-Type` header, and setting one (even to the
 * boundary-less default) makes Express ignore the file entirely. The server
 * returns the stored `thumbnail_url` rather than this function guessing a path.
 */
export const uploadCourseThumbnail = async (
  courseId: string,
  file?: File | null,
): Promise<{ thumbnail_url: string }> => {
  const form = new FormData();
  if (file) form.append('file', file);

  // The admin surface is mounted at its own prefix, not under `/courses`.
  const url =
    `${API_BASE_URL}/course-admin/courses/${encodeURIComponent(courseId)}/thumbnail` +
    (file ? '' : '?remove=1');

  const res = await apiFetch(url, { method: 'POST', body: form });
  if (!res.ok) throw await apiError(res, 'Could not update the course cover');
  const data = await res.json();
  return { thumbnail_url: data?.course?.thumbnail_url ?? '' };
};

// --- Learner: enrolment and progress ---------------------------------------

export const enrollInCourse = async (slug: string): Promise<{ progress: unknown; next_lesson_id: string | null }> => {
  const res = await apiFetch(`${COURSES}/${encodeURIComponent(slug)}/enroll`, { method: 'POST' });
  if (!res.ok) throw await apiError(res, 'Could not enrol');
  return res.json();
};

/**
 * Report watch/read time for a lesson. Call this on an interval while the
 * lesson is on screen — roughly every 5 seconds — not on every frame.
 *
 * `deltaSeconds` is what the player observed. The server credits at most 20
 * seconds per call and never faster than real time, so an inflated delta is
 * discarded rather than rewarded.
 */
export const reportLessonProgress = async (
  lessonId: string,
  payload: { delta_seconds: number; duration_seconds: number; position_seconds: number }
): Promise<LessonProgressResponse> => {
  const res = await apiFetch(`${COURSES}/lessons/${encodeURIComponent(lessonId)}/progress`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await apiError(res, 'Could not save progress');
  return res.json();
};

/**
 * Submit an answer sheet. Keys are question ids, values are option indexes.
 * Grading happens on the server; the key never reaches the client beforehand.
 */
export const submitLessonQuiz = async (
  lessonId: string,
  answers: Record<string, number>
): Promise<{ result: CourseQuizOutcome }> => {
  const res = await apiFetch(`${COURSES}/lessons/${encodeURIComponent(lessonId)}/quiz`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw await apiError(res, 'Could not submit the quiz');
  return res.json();
};

export const fetchMyCourses = async (): Promise<MyCoursesResponse> => {
  const res = await apiFetch(`${COURSES}/my`);
  if (!res.ok) throw await apiError(res, 'Could not load your courses');
  return res.json();
};

// --- Final exam --------------------------------------------------------------

/**
 * One question as the learner receives it: prompt and options only. The answer
 * key stays server-side until the attempt is graded.
 */
export interface ExamQuestionView {
  id: string;
  prompt: string;
  options: string[];
  difficulty: string;
  topic: string | null;
}

export interface ExamStartResponse {
  status: 'success';
  attempt_id: string;
  started_at: string;
  duration_minutes: number;
  questions: ExamQuestionView[];
}

export interface ExamQuestionResult {
  id: string;
  prompt: string;
  difficulty: string;
  chosen_index: number;
  correct_index: number;
  correct: boolean;
  explanation: string;
}

export interface ExamSubmitResponse {
  status: 'success';
  result: {
    score_percent: number;
    passed: boolean;
    passing_percent: number;
    results: ExamQuestionResult[];
  };
  on_time: boolean;
  state: import('@/types').ExamState;
  xp: { reason: string; xp: number; awarded: boolean }[];
  xp_total: number;
  certificate_readiness: import('@/types').CertificateReadiness | null;
}

/** Draws a fresh paper and starts (or resumes) a timed attempt. */
export const startExam = async (slug: string): Promise<ExamStartResponse> => {
  const res = await apiFetch(`${COURSES}/${encodeURIComponent(slug)}/exam/start`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await apiError(res, 'Could not start the exam');
  return res.json();
};

/** Submits answers for grading. The server, never the client, decides the score. */
export const submitExam = async (
  slug: string,
  attemptId: string,
  answers: Record<string, number>
): Promise<ExamSubmitResponse> => {
  const res = await apiFetch(`${COURSES}/${encodeURIComponent(slug)}/exam/submit`, {
    method: 'POST',
    body: JSON.stringify({ attempt_id: attemptId, answers }),
  });
  if (!res.ok) throw await apiError(res, 'Could not submit the exam');
  return res.json();
};

/** Submits the capstone project URL for a course that requires one. */
export const submitProject = async (
  slug: string,
  projectUrl: string
): Promise<{
  status: string;
  project_url: string;
  xp: { reason: string; xp: number; awarded: boolean }[];
  xp_total: number;
  certificate_readiness: import('@/types').CertificateReadiness | null;
}> => {
  const res = await apiFetch(`${COURSES}/${encodeURIComponent(slug)}/project/submit`, {
    method: 'POST',
    body: JSON.stringify({ project_url: projectUrl }),
  });
  if (!res.ok) throw await apiError(res, 'Could not submit the project');
  return res.json();
};

// --- Module tests ------------------------------------------------------------

/** One question from a module-test paper — same shape as the exam, no key. */
export interface ModuleTestQuestionView {
  id: string;
  prompt: string;
  options: string[];
  difficulty: string;
  topic: string | null;
}

export interface ModuleTestStartResponse {
  status: 'success';
  attempt_id: string;
  started_at: string;
  questions: ModuleTestQuestionView[];
  passing_percent: number;
  /** Present only when the server rehydrated an open attempt. */
  state?: import('@/types').ModuleTestState | null;
}

export interface ModuleTestSubmitResponse {
  status: 'success';
  result: {
    score_percent: number;
    passed: boolean;
    passing_percent: number;
    results: ExamQuestionResult[];
  };
  state: import('@/types').ModuleTestState | null;
}

/**
 * Starts (or rehydrates) a module-test attempt. The server refuses with 409
 * when the module's lessons are incomplete or a pass already stands.
 */
export const startModuleTest = async (
  slug: string,
  moduleId: string
): Promise<ModuleTestStartResponse> => {
  const res = await apiFetch(
    `${COURSES}/${encodeURIComponent(slug)}/module/${encodeURIComponent(moduleId)}/test`,
    { method: 'POST', body: JSON.stringify({ action: 'start' }) }
  );
  if (!res.ok) throw await apiError(res, 'Could not start the module test');
  return res.json();
};

/** Submits a module-test attempt for server-side grading. */
export const submitModuleTest = async (
  slug: string,
  moduleId: string,
  attemptId: string,
  answers: Record<string, number>
): Promise<ModuleTestSubmitResponse> => {
  const res = await apiFetch(
    `${COURSES}/${encodeURIComponent(slug)}/module/${encodeURIComponent(moduleId)}/test`,
    { method: 'POST', body: JSON.stringify({ action: 'submit', attempt_id: attemptId, answers }) }
  );
  if (!res.ok) throw await apiError(res, 'Could not submit the module test');
  return res.json();
};

// --- Certificates -----------------------------------------------------------

export const issueCertificate = async (slug: string): Promise<{ certificate: CertificateSummary }> => {
  const res = await apiFetch(`${COURSES}/${encodeURIComponent(slug)}/certificate`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await certificateApiError(res, 'Issue');
  return res.json();
};

/**
 * Public. No token needed — this is what an employer runs.
 *
 * A serial we have never issued comes back HTTP 404, and that is a *valid
 * answer*, not a failure — so the status is ignored and the body is returned
 * as-is. Throwing here would make "no such certificate" look like an outage.
 */
export const verifyCertificate = async (serial: string): Promise<CertificateVerifyResponse> => {
  const res = await fetch(`${COURSES}/verify/${encodeURIComponent(serial)}`);
  return res.json();
};

export const fetchMyCertificates = async (): Promise<{ certificates: CertificateSummary[] }> => {
  const res = await apiFetch(`${COURSES}/certificates/mine`);
  if (!res.ok) throw await apiError(res, 'Could not load your certificates');
  return res.json();
};

/**
 * Download a certificate PDF.
 *
 * This is a fetch, not a link: the endpoint requires a Bearer token, so an
 * <a href> would come back as a 401 JSON blob. The returned object URL is
 * revoked by the caller once the download has been triggered.
 */
/**
 * The download endpoint needs a Bearer token, so an <a href> would come back as
 * a 401 JSON blob. The path is stable, so build it from the serial for the
 * /my-courses rows, which are raw records and carry no `download_path`.
 */
export const certificateDownloadPath = (serial: string): string =>
  `/courses/certificates/${encodeURIComponent(serial)}/download`;

export const downloadCertificatePdf = async (downloadPath: string): Promise<{ blobUrl: string; filename: string }> => {
  const res = await apiFetch(`${API_BASE_URL}${downloadPath}`);
  if (!res.ok) throw await certificateApiError(res, 'Download');
  const blob = await res.blob();
  const serial = downloadPath.split('/').slice(-2, -1)[0] || 'certificate';
  return {
    blobUrl: URL.createObjectURL(blob),
    filename: `TieEdu-Certificate-${decodeURIComponent(serial)}.pdf`,
  };
};

// --- Feedback ---------------------------------------------------------------

export const submitCourseFeedback = async (
  slug: string,
  payload: { rating: number; would_recommend: boolean; what_learned: string }
): Promise<{ feedback: CourseFeedback; xp_awarded: number }> => {
  const res = await apiFetch(`${COURSES}/${encodeURIComponent(slug)}/feedback`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await apiError(res, 'Could not submit feedback');
  return res.json();
};

// --- Admin: authoring -------------------------------------------------------

export const fetchAdminCourses = async (q?: string): Promise<AdminCourseListResponse> => {
  const suffix = q ? `?q=${encodeURIComponent(q)}` : '';
  const res = await apiFetch(`${COURSE_ADMIN}/courses${suffix}`);
  if (!res.ok) throw await apiError(res, 'Could not load courses');
  return res.json();
};

export const fetchAdminCourse = async (courseId: string): Promise<AdminCourseDetail> => {
  const res = await apiFetch(`${COURSE_ADMIN}/courses/${encodeURIComponent(courseId)}`);
  if (!res.ok) throw await apiError(res, 'Could not load the course');
  return res.json();
};

/** The course fields an author supplies. IDs, XP values and counts are server-owned. */
export type CourseDraft = Partial<
  Pick<
    AdminCourseForEditor,
    | 'title'
    | 'slug'
    | 'subtitle'
    | 'description'
    | 'category'
    | 'level'
    | 'is_free'
    | 'price_inr'
    | 'thumbnail_url'
    | 'tags'
    | 'outcomes'
    | 'prerequisite_course_id'
      | 'certificate_eligible'
      | 'published'
    >
  > &
    /**
     * The long-form page fields.
     *
     * Optional so that every existing caller keeps compiling: a caller that only
     * wants to retitle a course does not have to think about prose it is not
     * editing. Each one is sent only when the admin form actually manages it, so
     * a partial save cannot blank a section it never displayed.
     */
    Partial<
      Pick<
        AdminCourseForEditor,
        'about_course' | 'prerequisites' | 'audience' | 'audio_language' | 'caption_language' | 'instructor_id'
      >
    > &
    /**
     * Semester Exam Mode. Optional for the same reason as the prose fields: a
     * partial save must not blank a section it never displayed, so the key is
     * sent only when the exam-prep editor actually manages it (including as
     * `null` when the admin is removing the section).
     */
    Partial<Pick<AdminCourseForEditor, 'exam_prep'>> &
    /**
     * Cover accessibility text and the per-course opt-out of the live offer
     * badge. Optional like the prose fields: a partial save that never
     * displays them must not blank values the admin set elsewhere, so the keys
     * travel only from the meta form, and an empty `thumbnail_alt` is sent as
     * `''` on purpose to clear the text.
     */
    Partial<Pick<AdminCourseForEditor, 'thumbnail_alt' | 'offer_badge_enabled'>>;


export const createAdminCourse = async (payload: CourseDraft) => {
  const res = await apiFetch(`${COURSE_ADMIN}/courses`, { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) throw await apiError(res, 'Could not create the course');
  return res.json();
};

export const updateAdminCourse = async (courseId: string, payload: CourseDraft) => {
  const res = await apiFetch(`${COURSE_ADMIN}/courses/${encodeURIComponent(courseId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await apiError(res, 'Could not save the course');
  return res.json();
};

export const deleteAdminCourse = async (courseId: string) => {
  const res = await apiFetch(`${COURSE_ADMIN}/courses/${encodeURIComponent(courseId)}`, { method: 'DELETE' });
  if (!res.ok) throw await apiError(res, 'Could not delete the course');
  return res.json();
};

export const duplicateAdminCourse = async (courseId: string) => {
  const res = await apiFetch(`${COURSE_ADMIN}/courses/${encodeURIComponent(courseId)}/duplicate`, { method: 'POST' });
  if (!res.ok) throw await apiError(res, 'Could not duplicate the course');
  return res.json();
};

export const addModule = async (courseId: string, payload: { title: string; summary?: string }) => {
  const res = await apiFetch(`${COURSE_ADMIN}/courses/${encodeURIComponent(courseId)}/modules`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await apiError(res, 'Could not add the module');
  return res.json();
};

export const updateModule = async (
  moduleId: string,
  payload: {
    title?: string;
    summary?: string;
    sort_order?: number;
    /** Full test config with bank; `null` clears the test. Absent leaves it. */
    test?: import('@/types').AdminModuleTest | null;
  }
) => {
  const res = await apiFetch(`${COURSE_ADMIN}/modules/${encodeURIComponent(moduleId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await apiError(res, 'Could not save the module');
  return res.json();
};

export const deleteModule = async (moduleId: string) => {
  const res = await apiFetch(`${COURSE_ADMIN}/modules/${encodeURIComponent(moduleId)}`, { method: 'DELETE' });
  if (!res.ok) throw await apiError(res, 'Could not delete the module');
  return res.json();
};

export const reorderModules = async (courseId: string, moduleIds: string[]) => {
  const res = await apiFetch(`${COURSE_ADMIN}/courses/${encodeURIComponent(courseId)}/modules/reorder`, {
    method: 'POST',
    body: JSON.stringify({ module_ids: moduleIds }),
  });
  if (!res.ok) throw await apiError(res, 'Could not reorder the modules');
  return res.json();
};

export const addLesson = async (
  moduleId: string,
  payload: { title: string; summary?: string; duration_minutes?: number; sort_order?: number }
) => {
  const res = await apiFetch(`${COURSE_ADMIN}/modules/${encodeURIComponent(moduleId)}/lessons`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await apiError(res, 'Could not add the lesson');
  return res.json();
};

export const updateLesson = async (lessonId: string, payload: Record<string, unknown>) => {
  const res = await apiFetch(`${COURSE_ADMIN}/lessons/${encodeURIComponent(lessonId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await apiError(res, 'Could not save the lesson');
  return res.json();
};

export const deleteLesson = async (lessonId: string) => {
  const res = await apiFetch(`${COURSE_ADMIN}/lessons/${encodeURIComponent(lessonId)}`, { method: 'DELETE' });
  if (!res.ok) throw await apiError(res, 'Could not delete the lesson');
  return res.json();
};

export const reorderLessons = async (moduleId: string, lessonIds: string[]) => {
  const res = await apiFetch(`${COURSE_ADMIN}/modules/${encodeURIComponent(moduleId)}/lessons/reorder`, {
    method: 'POST',
    body: JSON.stringify({ lesson_ids: lessonIds }),
  });
  if (!res.ok) throw await apiError(res, 'Could not reorder the lessons');
  return res.json();
};

/**
 * Check a pasted video URL before it is saved. Resolves the provider and
 * confirms the video is publicly reachable, so a dead link never reaches a
 * student's player. Throws with a message worth showing verbatim.
 */
export const resolveVideoUrl = async (url: string): Promise<VideoResolveResponse> => {
  const res = await apiFetch(`${COURSE_ADMIN}/videos/resolve`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw await apiError(res, 'That link could not be resolved');
  return res.json();
};

export const setLessonVideo = async (lessonId: string, payload: { url?: string | null; remove?: true }) => {
  const res = await apiFetch(`${COURSE_ADMIN}/lessons/${encodeURIComponent(lessonId)}/video`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await apiError(res, 'Could not attach the video');
  return res.json();
};

/** Save the quiz, or drop it entirely with `{ remove: true }`. */
export const setLessonQuiz = async (
  lessonId: string,
  payload: { quiz: AdminLessonQuiz } | { remove: true }
) => {
  const res = await apiFetch(`${COURSE_ADMIN}/lessons/${encodeURIComponent(lessonId)}/quiz`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await apiError(res, 'Could not save the quiz');
  return res.json();
};

// --- Admin: certificates, XP, feedback --------------------------------------

export const fetchAdminCertificates = async (
  params?: { q?: string; status?: 'active' | 'revoked' }
): Promise<AdminCertificatesResponse> => {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await apiFetch(`${COURSE_ADMIN}/certificates${suffix}`);
  if (!res.ok) throw await apiError(res, 'Could not load certificates');
  return res.json();
};

/**
 * Whether this server can sign a certificate yet.
 *
 * Not fatal when it fails: an unconfigured server answering 503 on every issue
 * is exactly the situation this call exists to explain, so refusing to load the
 * rest of the tab would hide the diagnosis behind a second failure. The issue
 * button stays live either way — the server is the authority on what it can sign.
 */
export const fetchCertificateReadiness = async (): Promise<CertificateReadiness | null> => {
  const res = await apiFetch(`${COURSE_ADMIN}/certificates/readiness`);
  if (!res.ok) return null;
  return res.json();
};

/**
 * Issue a certificate on a learner's behalf. The server still enforces that the
 * learner completed every lesson, so this is for re-issuing after a course edit
 * — it is not a way to shortcut completion.
 */
export const issueCertificateAsAdmin = async (payload: { user_id: string; course_id: string }) => {
  const res = await apiFetch(`${COURSE_ADMIN}/certificates/issue`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await apiError(res, 'Could not issue the certificate');
  return res.json();
};

export const revokeCertificateAsAdmin = async (serial: string, reason: string) => {
  const res = await apiFetch(`${COURSE_ADMIN}/certificates/${encodeURIComponent(serial)}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw await apiError(res, 'Could not revoke the certificate');
  return res.json();
};

export const restoreCertificateAsAdmin = async (serial: string) => {
  const res = await apiFetch(`${COURSE_ADMIN}/certificates/${encodeURIComponent(serial)}/restore`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await apiError(res, 'Could not restore the certificate');
  return res.json();
};

/**
 * Read the XP ledger. Supports the same filters the admin API accepts: a free
 * text search over student name/email, key and note, and a single reason.
 */
export const fetchXpLedger = async (
  params?: { q?: string; reason?: string }
): Promise<AdminXpResponse> => {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.reason) qs.set('reason', params.reason);
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await apiFetch(`${COURSE_ADMIN}/xp${suffix}`);
  if (!res.ok) throw await apiError(res, 'Could not load the XP ledger');
  return res.json();
};

/** Recompute cached user.xp from the ledger. Use after a manual data edit. */
export const reconcileXp = async () => {
  const res = await apiFetch(`${COURSE_ADMIN}/xp/reconcile`, { method: 'POST', body: JSON.stringify({}) });
  if (!res.ok) throw await apiError(res, 'Reconciliation failed');
  return res.json();
};

export const fetchCourseFeedbackFeed = async (params?: { course_id?: string }) => {
  const qs = new URLSearchParams();
  if (params?.course_id) qs.set('course_id', params.course_id);
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await apiFetch(`${COURSE_ADMIN}/feedback${suffix}`);
  if (!res.ok) throw await apiError(res, 'Could not load feedback');
  return res.json();
};

// ---------------------------------------------------------------------------
// Instructors
//
// These are admin-only on the server: the whole course-admin router sits behind
// requireAdmin, so every call here is refused without an admin token. That is
// deliberate. An instructor is a real person, and the record carries claims made
// about them, so the list is not public even though the rendered instructor block
// on a course page is.
// ---------------------------------------------------------------------------

/** The write shape for an instructor. Every optional claim stays absent if unset. */
export type InstructorDraft = {
  name: string;
  title?: string;
  bio?: string;
  photo_url?: string;
  /** Claims about the person. `null`/'' clears one; omitting it leaves it alone. */
  students_taught?: number | null;
  hours_lectured?: number | null;
  rating?: number | null;
};

export const fetchInstructors = async (): Promise<CourseInstructor[]> => {
  const res = await apiFetch(`${COURSE_ADMIN}/instructors`);
  if (!res.ok) throw await apiError(res, 'Could not load instructors');
  const body = await res.json();
  return Array.isArray(body?.instructors) ? body.instructors : [];
};

export const createInstructor = async (payload: InstructorDraft) => {
  const res = await apiFetch(`${COURSE_ADMIN}/instructors`, { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) throw await apiError(res, 'Could not create the instructor');
  return res.json();
};

export const updateInstructor = async (instructorId: string, payload: Partial<InstructorDraft>) => {
  const res = await apiFetch(`${COURSE_ADMIN}/instructors/${encodeURIComponent(instructorId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await apiError(res, 'Could not update the instructor');
  return res.json();
};

export const deleteInstructor = async (instructorId: string) => {
  const res = await apiFetch(`${COURSE_ADMIN}/instructors/${encodeURIComponent(instructorId)}`, { method: 'DELETE' });
  if (!res.ok) throw await apiError(res, 'Could not delete the instructor');
  return res.json();
};

export type { CourseModule, CourseLessonView };
