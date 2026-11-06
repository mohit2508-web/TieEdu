import { API_BASE_URL, apiFetch } from './api';

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
  | 'tieedu'
  | 'quiz';

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
  quiz: { label: 'Quiz', chip: 'var(--drop-quiz)' },
};

export interface DropQuiz {
  question: string;
  options: string[];
  answer: number;
  explain?: string;
}

export interface DropFact {
  label: string;
  value: string;
}

export const DROP_TYPES = Object.keys(DROP_TYPE_META) as DropType[];

// ─── Look & feel presets (mirror backend/src/lib/drops.ts + lib/dropArt.ts) ──

export const DROP_ARTS = {
  auto: 'Auto (by type)',
  diwali: 'Diwali night — diyas & lanterns',
  'diwali-sale': 'Diwali sale — rays, diyas, fireworks',
  fireworks: 'Fireworks',
  gift: 'Gift box & confetti',
  hiring: 'Hiring — briefcase',
  company: 'Company — name in orbit',
  countdown: 'Countdown clock',
  trophy: 'Trophy',
  code: 'Code terminal',
  ai: 'AI network',
  book: 'Open book',
  mic: 'Microphone',
  shield: 'Shield & check',
  chart: 'Growth chart',
  rocket: 'Rocket',
  calendar: 'Calendar',
  certificate: 'Certificate',
  stars: 'Stars',
} as const;
export type DropArt = keyof typeof DROP_ARTS;

export const DROP_MOTIONS = {
  kenburns: 'Ken Burns (slow zoom + drift)',
  zoom: 'Zoom in',
  pan: 'Pan sideways',
  float: 'Float',
  pulse: 'Pulse',
  none: 'Still',
} as const;
export type DropMotion = keyof typeof DROP_MOTIONS;

export const DROP_EFFECTS = {
  none: 'None',
  confetti: 'Confetti',
  fireworks: 'Fireworks',
  sparkles: 'Sparkles',
  diyas: 'Diya lights (rising)',
  stars: 'Twinkling stars',
  snow: 'Snow',
  hearts: 'Hearts',
  bubbles: 'Bubbles',
} as const;
export type DropEffect = keyof typeof DROP_EFFECTS;

export const DROP_TEXT_ANIMS = {
  rise: 'Rise up',
  pop: 'Pop',
  slide: 'Slide in',
  typewriter: 'Typewriter',
  none: 'None',
} as const;
export type DropTextAnim = keyof typeof DROP_TEXT_ANIMS;

export const DROP_SOUNDS = {
  none: 'No sound',
  chime: 'Chime',
  diwali: 'Diwali bells',
  fireworks: 'Fireworks',
  drumroll: 'Drum roll',
  whoosh: 'Whoosh',
  pop: 'Pop',
  success: 'Success',
  alert: 'Alert',
  tick: 'Clock tick',
  custom: 'Custom (upload audio)',
} as const;
export type DropSound = keyof typeof DROP_SOUNDS;

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
  video_url?: string | null;
  target_slug: string | null;
  deadline_at: string | null;
  sponsored: boolean;
  sponsor_name: string | null;
  has_body: boolean;
  /** Uploaded clip — plays muted and looped in place of the image. */
  video_file_url?: string | null;
  /** Uploaded sound for `sound: 'custom'`. */
  audio_url?: string | null;
  /** True when image_url is the generated animated creative. */
  is_generated_art?: boolean;
  motion?: DropMotion;
  effect?: DropEffect;
  text_anim?: DropTextAnim;
  sound?: DropSound;
  quiz?: DropQuiz | null;
  likes?: number;
  views?: number;
  /** This viewer has liked it (always false signed-out). */
  liked?: boolean;
}

export interface DropDetail extends DropFeedItem {
  body_md: string;
  facts?: DropFact[];
  source_name?: string | null;
  source_url?: string | null;
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
  likes?: number;
  skips?: number;
  reads?: number;
  outbound?: number;
  quiz_answers?: number;
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
  /* The stored file name behind `image_url`. Carried so the console can show
     the creative a card already has instead of an empty well. */
  image_stored_name: string | null;
  image_file_name?: string;
  video_stored_name?: string | null;
  audio_stored_name?: string | null;
  art?: DropArt;
  art_text?: string;
  art_sub?: string;
  /** Always the generated creative, even when an upload is set. */
  art_url: string;
  facts?: DropFact[];
  source_name?: string;
  source_url?: string;
}

export interface DropAudience {
  batches?: (string | number)[];
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
  video_url?: string;
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
  video_stored_name?: string;
  audio_stored_name?: string;
  art?: DropArt;
  art_text?: string;
  art_sub?: string;
  motion?: DropMotion;
  effect?: DropEffect;
  text_anim?: DropTextAnim;
  sound?: DropSound;
  facts?: DropFact[];
  source_name?: string;
  source_url?: string;
  quiz?: DropQuiz;
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
  fetchDropStoryApi(id).then((r) => r.drop);

/** The story page: the drop plus up to four related drops. Sends auth for like state. */
export const fetchDropStoryApi = async (id: string): Promise<{ drop: DropDetail; related: DropFeedItem[] }> => {
  const r = await json<{ drop: DropDetail; related?: DropFeedItem[] }>(await apiFetch(`${base}/${encodeURIComponent(id)}`));
  return { drop: r.drop, related: r.related || [] };
};

export const likeDropApi = async (id: string, on: boolean): Promise<{ liked: boolean; likes: number }> =>
  json(await apiFetch(`${base}/${encodeURIComponent(id)}/like`, { method: on ? 'POST' : 'DELETE' }));

/** Live drops published since `since` (the nav badge). */
export const fetchDropNewCountApi = async (since: string): Promise<{ new: number; total: number }> =>
  json(await apiFetch(`${base}/count?since=${encodeURIComponent(since)}`));

/** Batched analytics beacon. `keepalive` lets it finish while the page unloads. */
export const postDropEventsApi = async (events: { id: string; event: string; dwell_ms?: number }[]) =>
  json(await apiFetch(`${base}/events`, { method: 'POST', body: JSON.stringify({ events }), keepalive: true }));

export type DropEventKind = 'view' | 'cta_click' | 'share' | 'read_more' | 'quiz_answer' | 'outbound';

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

export interface DropUploadResult {
  status: string;
  kind: 'image' | 'video' | 'audio';
  stored_name: string;
  file_name: string;
  size_bytes: number;
}

/**
 * Multipart upload of an image, clip or sound. Goes through apiFetch so an
 * expired access token is refreshed and retried — the old hand-rolled fetch
 * failed every upload once the admin had sat on the page past the token's
 * lifetime. apiFetch leaves Content-Type unset for FormData, so the multipart
 * boundary survives.
 */
export const uploadDropMediaApi = async (file: File | Blob, fileName?: string): Promise<DropUploadResult> => {
  const form = new FormData();
  form.append('file', file, fileName || (file instanceof File ? file.name : 'drop'));
  const res = await apiFetch(`${adminBase}/upload`, { method: 'POST', body: form });
  if (res.status === 401) throw new Error('Session expired — sign in again to upload');
  if (res.status === 413) {
    let msg = 'File is too large for the server';
    try { const b = await res.json(); if (b?.error) msg = b.error; } catch { /* proxy page, not JSON */ }
    throw new Error(msg);
  }
  return json(res);
};

/** Back-compat name. */
export const uploadDropImageApi = (file: File | Blob, fileName?: string) => uploadDropMediaApi(file, fileName);
