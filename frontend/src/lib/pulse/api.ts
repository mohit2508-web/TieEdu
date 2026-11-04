import { API_BASE_URL, apiFetch } from '@/lib/api';
import type { PulseBundle, PulseClass, PulseStudent, PulseTask, RepoInfo } from './demo';

/** Project Pulse API client — mirrors backend routes/pulse.routes.ts. */

const call = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const res = await apiFetch(`${API_BASE_URL}/pulse${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.error || `Request failed (${res.status})`), { status: res.status });
  return data as T;
};
const post = <T>(path: string, body: unknown = {}, method = 'POST') => call<T>(path, { method, body: JSON.stringify(body) });

export interface PulseMe {
  is_admin: boolean;
  is_teacher: boolean;
  classes: (PulseClass & { role: 'owner' | 'co' | 'admin'; students: number; pending: number; tasks: number })[];
  tasks: { task_id: string; title: string; folder: string; class: PulseClass; deadline_at: string; assigned_at: string; status: PulseStudent['status']; score: number; repo: string | null }[];
  student_classes: ({ class: PulseClass } & RepoInfo)[];
  pending_joins: string[];
}
export interface RosterRow { id: string; name: string; email: string; roll_no: string; status: 'invited' | 'pending' | 'active'; invited_at: string; joined_at: string | null; repo: string | null; verified: boolean }
export interface ClassDetail extends PulseClass {
  join_code: string;
  archived: boolean;
  is_owner: boolean;
  co_teachers: { id: string; name: string }[];
  co_requests: CoRequest[];
  roster: RosterRow[];
  repos_linked: number;
  tasks: { id: string; title: string; folder: string; auto_tests: boolean; assigned_at: string; deadline_at: string; published: boolean; started: number; reviewed: number; done: number }[];
}
export interface TeacherRow { user_id: string; name: string; email: string; granted_at: string; classes: number; co_teaching: number; has_password: boolean }
export interface CoRequest { id: string; name: string; email: string; at: string; class_id: string; class_name: string; requested_by: string }
type Welcome = { created: boolean; emailed: boolean; link: string | null };
export interface TaskInput {
  title: string; summary: string; assigned_at: string; deadline_at: string; published: boolean;
  folder?: string;
  auto_tests: boolean;
  requirements: { title: string; detail: string }[];
  tests: { name: string; input: string; expected: string; req_id: string | null }[];
  starter: { path: string; code: string }[];
  weights: { tests: number; reqs: number; activity: number };
}

type Raw = { cls: PulseClass; task: PulseTask; now: string; students?: PulseStudent[]; student?: PulseStudent; last_sync?: string | null; prev?: string; next?: string; repo?: RepoInfo; position?: number; total?: number };
const bundle = (r: Raw): PulseBundle & { prev?: string; next?: string } => ({
  cls: r.cls, task: r.task, now: new Date(r.now), students: r.students ?? (r.student ? [r.student] : []), lastSync: r.last_sync ?? null, prev: r.prev, next: r.next,
  repo: r.repo, position: r.position, total: r.total,
});

export const pulseApi = {
  me: () => call<PulseMe>('/me'),
  join: (body: { token?: string; code?: string; roll_no?: string }) => post<{ status: 'active' | 'pending'; class_id: string }>('/join', body),

  teachers: () => call<{ teachers: TeacherRow[]; co_requests: CoRequest[]; github_token: boolean }>('/admin/teachers'),
  appoint: (body: { email: string; name?: string; college?: string; password?: string }) => post<{ teachers: TeacherRow[]; password_set: boolean } & Welcome>('/admin/teachers', body),
  setPassword: (userId: string, password: string) => post<{ teachers: TeacherRow[] }>(`/admin/teachers/${userId}/password`, { password }),
  loginLink: (userId: string) => post<{ emailed: boolean; link: string }>(`/admin/teachers/${userId}/login-link`),
  decideCo: (id: string, approve: boolean) => post<{ requests: CoRequest[]; teachers: TeacherRow[] } & Welcome>(`/admin/co-requests/${id}`, { approve }),
  revoke: (userId: string) => call<{ teachers: TeacherRow[] }>(`/admin/teachers/${userId}`, { method: 'DELETE' }),

  createClass: (body: { name: string; subject: string; pack?: string }) => post<ClassDetail>('/classes', body),
  cls: (id: string) => call<ClassDetail>(`/classes/${id}`),
  updateClass: (id: string, body: Record<string, unknown>) => post<ClassDetail>(`/classes/${id}`, body, 'PATCH'),
  addCoTeacher: (id: string, body: { email: string; name: string }) => post<ClassDetail & { result: 'added' | 'requested' }>(`/classes/${id}/co-teachers`, body),
  invite: (id: string, entries: { email: string; name?: string; roll_no?: string }[]) =>
    post<ClassDetail & { invited: number; emailed: number; skipped: string[]; links: { email: string; link: string }[] }>(`/classes/${id}/roster`, { entries }),
  resend: (rowId: string) => post<{ emailed: boolean; link: string }>(`/roster/${rowId}/resend`),
  approve: (rowId: string) => post(`/roster/${rowId}/approve`),
  removeStudent: (rowId: string) => call(`/roster/${rowId}`, { method: 'DELETE' }),

  packs: () => call<{ packs: { id: string; title: string; subject: string; count: number }[] }>('/packs'),
  addPack: (classId: string, pack: string) => post<{ added: number; class: ClassDetail }>(`/classes/${classId}/packs/${pack}`),
  templates: () => call<{ templates: { id: string; title: string; level: string; summary: string; input: TaskInput }[] }>('/templates'),
  teacherTasks: () => call<{ tasks: { id: string; title: string; class_id: string; class_name: string }[] }>('/teacher/tasks'),
  duplicate: (taskId: string, classId?: string) => post<PulseTask>(`/tasks/${taskId}/duplicate`, { class_id: classId }),
  review: (taskId: string, rid: string, body: { verdicts?: Record<string, string | null>; score?: number | null; reason?: string; feedback?: string }) =>
    post<{ student: PulseStudent }>(`/tasks/${taskId}/students/${rid}/review`, body),
  comments: () => call<{ comments: string[] }>('/me/comments'),
  saveComments: (comments: string[]) => post<{ comments: string[] }>('/me/comments', { comments }, 'PUT'),
  createTask: (classId: string, body: TaskInput) => post<PulseTask>(`/classes/${classId}/tasks`, body),
  task: (id: string) => call<PulseTask>(`/tasks/${id}`),
  updateTask: (id: string, body: Partial<TaskInput>) => post<PulseTask>(`/tasks/${id}`, body, 'PUT'),
  deleteTask: (id: string) => call(`/tasks/${id}`, { method: 'DELETE' }),
  dashboard: async (id: string) => bundle(await call<Raw>(`/tasks/${id}/dashboard`)),
  syncTask: (id: string, force = false) => post<{ synced: number }>(`/tasks/${id}/sync`, { force }),
  exportCsv: async (id: string) => {
    const res = await apiFetch(`${API_BASE_URL}/pulse/tasks/${id}/export.csv`);
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  },
  student: async (taskId: string, rid: string) => bundle(await call<Raw>(`/tasks/${taskId}/students/${rid}`)),
  syncStudent: (taskId: string, rid: string, force = false) => post(`/tasks/${taskId}/students/${rid}/sync`, { force }),
  verify: (taskId: string, rid: string, verified: boolean) => post(`/tasks/${taskId}/students/${rid}/verify`, { verified }),
  feedback: (taskId: string, rid: string, body: string) => post(`/tasks/${taskId}/students/${rid}/feedback`, { body }),
  note: (taskId: string, rid: string, body: string) => post(`/tasks/${taskId}/students/${rid}/note`, { body }),
  override: (taskId: string, rid: string, body: { score?: number | null; reason?: string; req_id?: string; verdict?: string | null }) =>
    post(`/tasks/${taskId}/students/${rid}/override`, body),

  myTask: async (taskId: string) => bundle(await call<Raw>(`/student/tasks/${taskId}`)),
  linkRepo: (classId: string, url: string) => post<{ repo: RepoInfo }>(`/student/classes/${classId}/repo`, { url }),
  recheck: (classId: string) => post<{ repo: RepoInfo }>(`/student/classes/${classId}/recheck`),
  workflowUrl: `${API_BASE_URL}/pulse/autograde/workflow.yml`,
};
