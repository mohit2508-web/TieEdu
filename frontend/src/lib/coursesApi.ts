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
  AdminLessonQuiz,
  AdminXpResponse,
  VideoResolveResponse,
  CourseModule,
  CourseLessonView,
  CatalogFilters,
  CourseCard,
} from '@/types';

const COURSES = `${API_BASE_URL}/courses`;
const COURSE_ADMIN = `${API_BASE_URL}/course-admin`;

/** Pull the server's error message out of a failed response. */
async function apiError(res: Response, fallback: string): Promise<Error> {
  const data = await res.json().catch(() => ({}));
  return new Error(data?.error || fallback);
}

// --- Public: browsing -------------------------------------------------------

/** Serialise the filter state into the query string the catalogue endpoint reads. */
function catalogQueryString(params?: Partial<CatalogFilters> & { page?: number }): string {
  const qs = new URLSearchParams();
  if (params?.q?.trim()) qs.set('q', params.q.trim());
  // Repeated params, not comma-joined, so a value containing a comma cannot
  // split into two filters. The server accepts both forms.
  for (const key of ['category', 'tag', 'type', 'level'] as const) {
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

// --- Certificates -----------------------------------------------------------

export const issueCertificate = async (slug: string): Promise<{ certificate: CertificateSummary }> => {
  const res = await apiFetch(`${COURSES}/${encodeURIComponent(slug)}/certificate`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await apiError(res, 'Could not issue a certificate');
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
  if (!res.ok) throw await apiError(res, 'Could not download the certificate');
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
>;

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
  payload: { title?: string; summary?: string; sort_order?: number }
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

export type { CourseModule, CourseLessonView };
