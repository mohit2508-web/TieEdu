import { API_BASE_URL, apiFetch } from './api';
import { getAccessToken } from './auth';

// ============================================================================
// DROPS API CLIENT
//
// Types mirror backend/src/lib/drops.ts + backend/src/routes/drops.routes.ts
// (the server is the source of truth). The feed is per-viewer and never
// cacheable — see `Cache-Control: no-store` on the route — so nothing here
// goes through the service worker's CACHEABLE_API list either.
// ============================================================================

export type DropType =
  | 'company'
  | 'job'
  | 'deadline'
  | 'vault'
  | 'skilltest'
  | 'course'
  | 'contest'
  | 'selected'
  | 'scholarship'
  | 'college'
  | 'tip'
  | 'tieedu';

/** Chip labels, in the order the filter bar shows them. Server mirrors this. */
export const DROP_TYPE_META: Record<DropType, { label: string; chip: string }> = {
  company: { label: 'Companies', chip: 'var(--drop-company)' },
  job: { label: 'Jobs', chip: 'var(--drop-job)' },
  deadline: { label: 'Deadlines', chip: 'var(--drop-deadline)' },
  vault: { label: 'Vaults', chip: 'var(--drop-vault)' },
  skilltest: { label: 'Skill Test', chip: 'var(--drop-skilltest)' },
  course: { label: 'Courses', chip: 'var(--drop-course)' },
  contest: { label: 'Contests', chip: 'var(--drop-contest)' },
  selected: { label: 'Selected', chip: 'var(--drop-selected)' },
  scholarship: { label: 'Scholarships', chip: 'var(--drop-scholarship)' },
  college: { label: 'College', chip: 'var(--drop-college)' },
  tip: { label: 'Tips', chip: 'var(--drop-tip)' },
  tieedu: { label: 'TieEdu', chip: 'var(--drop-tieedu)' },
};

export const DROP_TYPES = Object.keys(DROP_TYPE_META) as DropType[];

export type DropStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface DropFeedItem {
  id: string;
  type: DropType;
  headline: string;
  bullets: string[];
  image_url: string | null;
  image_alt: string;
  cta_label: string;
  cta_route: string | null;
  cta_url: string | null;
  target_slug: string | null;
  deadline_at: string | null;
  sponsored: boolean;
  sponsor_name: string | null;
  has_body: boolean;
}

export interface DropDetail extends DropFeedItem {
  body_md: string;
  tags: string[];
  created_at: string;
  publish_at: string | null;
  expires_at: string | null;
}

export interface DropFeedPage {
  items: DropFeedItem[];
  next_cursor: string | null;
  total: number;
  seen_count: number;
}

export interface DropSavedItem extends DropFeedItem {
  is_live: boolean;
  saved_at?: string;
}

export interface DropMute {
  id: string;
  kind: 'drop' | 'type' | 'company';
  value: string;
  created_at: string;
}

export interface DropStats {
  views: number;
  unique_viewers: number;
  cta_clicks: number;
  shares: number;
  saves: number;
  dwell_ms_total: number;
}

export interface AdminDrop extends DropFeedItem {
  status: DropStatus;
  priority: number;
  pinned: boolean;
  publish_at: string | null;
  expires_at: string | null;
  created_at: string;
  audience: DropAudience;
  tags: string[];
  body_md: string;
  stats: DropStats;
  source: { kind: string; event?: string; entity_id?: string };
  author_id: string;
  is_live: boolean;
  list_status: string;
}

export interface DropAudience {
  grad_years?: (string | number)[];
  branches?: string[];
  colleges?: string[];
  skills?: string[];
  user_id?: string;
}

export interface AdminDropListResponse {
  items: AdminDrop[];
  caps: { max_live: number; max_per_day: number };
}

export interface DropAnalytics {
  totals: DropStats;
  live: number;
  total: number;
  by_type: { type: DropType; label: string; drops: number; views: number; cta_clicks: number }[];
  top_drops: {
    id: string;
    type: DropType;
    headline: string;
    views: number;
    cta_clicks: number;
    shares: number;
    saves: number;
    ctr: number;
  }[];
}

export interface DropWriteInput {
  type: DropType;
  headline: string;
  bullets: string[];
  image_stored_name?: string;
  image_file_name?: string;
  image_alt?: string;
  cta_label?: string;
  cta_route?: string;
  cta_url?: string;
  target_slug?: string;
  body_md?: string;
  deadline_at?: string;
  sponsored?: boolean;
  sponsor_name?: string;
  pinned?: boolean;
  priority?: number;
  status?: DropStatus;
  publish_at?: string;
  expires_at?: string;
  audience?: DropAudience;
  tags?: string[];
}

const base = `${API_BASE_URL}/drops`;

const json = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }
  return res.json();
};

// ─── Public feed ───────────────────────────────────────────────────────────

export const fetchDropFeedApi = async (params: {
  type?: DropType | '';
  cursor?: string | null;
  limit?: number;
} = {}): Promise<DropFeedPage> => {
  const qs = new URLSearchParams();
  if (params.type) qs.set('type', params.type);
  if (params.cursor) qs.set('cursor', params.cursor);
  if (params.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  // Plain fetch: the feed is public (optionalAuth on the server) and must never
  // be served from the SW cache — it is ordered per viewer.
  return json(await fetch(`${base}${suffix}`));
};

export const fetchDropDetailApi = async (id: string): Promise<DropDetail> =>
  json<{ drop: DropDetail }>(await fetch(`${base}/${encodeURIComponent(id)}`)).then((r) => r.drop);

export type DropEventKind = 'view' | 'cta_click' | 'share' | 'read_more';

export const postDropEventApi = async (id: string, event: DropEventKind, dwellMs?: number) =>
  json(await apiFetch(`${base}/${encodeURIComponent(id)}/event`, {
    method: 'POST',
    body: JSON.stringify({ event, ...(dwellMs !== undefined ? { dwell_ms: dwellMs } : {}) }),
  }));

export const saveDropApi = async (id: string) =>
  json(await apiFetch(`${base}/${encodeURIComponent(id)}/bookmark`, { method: 'POST' }));

export const unsaveDropApi = async (id: string) =>
  json(await apiFetch(`${base}/${encodeURIComponent(id)}/bookmark`, { method: 'DELETE' }));

export const fetchSavedDropsApi = async (): Promise<{ items: DropSavedItem[] }> =>
  json(await apiFetch(`${base}/saved`));

export type DropMuteKind = 'drop' | 'type' | 'company';

export const muteDropApi = async (id: string, kind: DropMuteKind = 'drop', value?: string) =>
  json(await apiFetch(`${base}/${encodeURIComponent(id)}/mute`, {
    method: 'POST',
    body: JSON.stringify({ kind, ...(value ? { value } : {}) }),
  }));

export const fetchDropMutesApi = async (): Promise<{ items: DropMute[] }> =>
  json(await apiFetch(`${base}/mutes`));

export const unmuteDropApi = async (muteId: string) =>
  json(await apiFetch(`${base}/mutes/${encodeURIComponent(muteId)}`, { method: 'DELETE' }));

// ─── Admin ─────────────────────────────────────────────────────────────────

const adminBase = `${base}/admin`;

const adminJson = async <T>(path: string, options?: RequestInit): Promise<T> =>
  json<T>(await apiFetch(`${adminBase}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }));

export const adminFetchDropsApi = (): Promise<AdminDropListResponse> => adminJson('');

export const adminDropAnalyticsApi = (): Promise<DropAnalytics> => adminJson('/analytics');

export const adminCreateDropApi = (data: DropWriteInput) =>
  adminJson<{ status: string; drop: AdminDrop }>('', { method: 'POST', body: JSON.stringify(data) });

export const adminUpdateDropApi = (id: string, data: Partial<DropWriteInput>) =>
  adminJson<{ status: string; drop: AdminDrop }>(`/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const adminDeleteDropApi = (id: string) =>
  adminJson<{ status: string; message: string; remaining: number }>(`/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

/** Multipart upload — deliberately NOT apiFetch, which always sets JSON content-type. */
export const uploadDropImageApi = async (
  file: File
): Promise<{ status: string; stored_name: string; file_name: string; size_bytes: number }> => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${adminBase}/upload`, {
    method: 'POST',
    body: form,
    // apiFetch's Authorization header has to be reproduced by hand here: its
    // JSON content-type would make the boundary vanish and the server would
    // see an empty body.
    headers: { Authorization: `Bearer ${getAccessToken() || ''}` },
  });
  if (res.status === 401) throw new Error('Session expired — sign in again to upload');
  return json(res);
};
