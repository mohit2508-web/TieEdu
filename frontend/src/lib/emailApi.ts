import { API_BASE_URL, apiFetch } from './api';
import { getAccessToken } from './auth';

// ============================================================================
// EMAIL API CLIENT
//
// Types mirror backend/src/data/db.ts (EmailLead/EmailCampaign/EmailMessage)
// and routes/email{Leads,Campaigns}.routes.ts — the server is the source of
// truth. Multipart import bypasses apiFetch deliberately, same as the drops
// image upload: its JSON content-type would eat the FormData boundary.
// ============================================================================

export type EmailLeadStatus = 'active' | 'unsubscribed' | 'bounced' | 'complained' | 'converted';

export type EmailTemplateId =
  | 'welcome'
  | 'course-buy'
  | 'course-buy-later'
  | 'vault'
  | 'skill-test'
  | 'proof'
  | 'offer'
  | 'reengage';

export interface EmailLead {
  id: string;
  email: string;
  name?: string;
  college?: string;
  year?: string;
  status: EmailLeadStatus;
  source: string;
  tags: string[];
  consent_at: string;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaignStats {
  queued: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

export interface EmailCampaign {
  id: string;
  name: string;
  kind: 'blast' | 'drip';
  template_id: EmailTemplateId;
  segment: { tags?: string[]; year?: string; statuses?: EmailLeadStatus[] };
  status: 'draft' | 'scheduled' | 'sending' | 'paused' | 'sent';
  scheduled_at?: string;
  drip_steps?: { day: number; template_id: EmailTemplateId }[];
  stats: EmailCampaignStats;
  created_at: string;
}

export interface EmailMessage {
  id: string;
  campaign_id?: string;
  /** Set for behaviour-triggered sends: `a1:<slug>` | `a4:<campaign>` | `a5:<campaign>:<day>`. */
  automation_id?: string;
  lead_id: string;
  email: string;
  template_id: EmailTemplateId;
  subject: string;
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'skipped';
  skip_reason?: string;
  created_at?: string;
  opened_at?: string;
  clicked_at?: string;
  sent_at?: string;
  error?: string;
}

export interface EmailTemplateInfo {
  id: EmailTemplateId;
  label: string;
  subject: string;
  preheader: string;
  home_path: string;
}

export interface EmailQueueStatus {
  active: boolean;
  paused: boolean;
  queued: number;
  sent_this_run: number;
  consecutive_errors: number;
  last_error: string | null;
  delay_ms: number;
  configured: boolean;
  config_error: string | null;
}

const base = `${API_BASE_URL}/email`;
const adminBase = `${base}/admin`;

const json = async <T>(res: Response): Promise<T> => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `Request failed (${res.status})`);
  return data as T;
};

const adminJson = async <T>(path: string, options?: RequestInit): Promise<T> =>
  json<T>(await apiFetch(`${adminBase}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }));

// ─── Leads ──────────────────────────────────────────────────────────────────

export interface LeadListResponse {
  total: number;
  all_total: number;
  by_status: Record<string, number>;
  offset: number;
  leads: EmailLead[];
}

export const fetchLeadsApi = (params: {
  q?: string; status?: string; tag?: string; year?: string; limit?: number; offset?: number;
} = {}): Promise<LeadListResponse> => {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.status) qs.set('status', params.status);
  if (params.year) qs.set('year', params.year);
  if (params.tag) qs.set('tag', params.tag);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  const s = qs.toString();
  return adminJson<LeadListResponse>(`/leads${s ? `?${s}` : ''}`);
};

export const createLeadApi = (input: { email: string; name?: string; college?: string; year?: string; tags?: string[] }) =>
  adminJson<{ lead: EmailLead }>('/leads', { method: 'POST', body: JSON.stringify(input) });

export const updateLeadApi = (id: string, patch: Partial<Pick<EmailLead, 'name' | 'college' | 'year' | 'tags' | 'status'>>) =>
  adminJson<{ lead: EmailLead }>(`/leads/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });

export const deleteLeadApi = (id: string) =>
  adminJson<{ ok: boolean; removed: number }>(`/leads/${encodeURIComponent(id)}`, { method: 'DELETE' });

export interface ImportResult {
  ok: boolean;
  imported: number;
  rejected_count: number;
  rejected: { row: number; email: string; reason: string }[];
  columns_mapped: Record<string, number>;
}

/**
 * CSV import. Plain fetch with FormData + hand-carried Authorization header —
 * apiFetch always sets application/json, which would swallow the boundary.
 * Retries once through the shared refresh on 401 like the PDF uploader does.
 */
export const importLeadsApi = async (file: File, opts: { source?: string; tags?: string[] } = {}): Promise<ImportResult> => {
  const send = async (token: string | null): Promise<ImportResult | null> => {
    const form = new FormData();
    form.append('file', file);
    if (opts.source) form.append('source', opts.source);
    if (opts.tags?.length) form.append('tags', JSON.stringify(opts.tags));
    const res = await fetch(`${adminBase}/leads/import`, {
      method: 'POST',
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.status === 401) return null;
    return json<ImportResult>(res);
  };
  let result = await send(getAccessToken());
  if (result === null) {
    const { tryRefreshSession } = await import('./api');
    const refreshed = await tryRefreshSession();
    if (!refreshed) throw new Error('Session expired — sign in again as admin.');
    result = await send(getAccessToken());
  }
  if (result === null) throw new Error('Import failed with 401 — sign in again.');
  return result;
};

// ─── Campaigns ──────────────────────────────────────────────────────────────

export const fetchTemplatesApi = (): Promise<{ templates: EmailTemplateInfo[] }> =>
  adminJson('/templates');

export const previewTemplateApi = (id: EmailTemplateId, params: { name?: string; vars?: Record<string, string> } = {}) =>
  adminJson<{ subject: string; html: string; text: string }>(
    `/templates/${encodeURIComponent(id)}/preview?name=${encodeURIComponent(params.name || 'Aarav')}${params.vars ? `&vars=${encodeURIComponent(JSON.stringify(params.vars))}` : ''}`
  );

export const fetchCampaignsApi = (): Promise<{ campaigns: EmailCampaign[] }> =>
  adminJson('/campaigns');

export const createCampaignApi = (input: {
  name: string;
  template_id: EmailTemplateId;
  kind?: 'blast' | 'drip';
  segment?: { year?: string; tags?: string[] };
  drip_steps?: { day: number; template_id: EmailTemplateId }[];
}) => adminJson<{ campaign: EmailCampaign }>('/campaigns', { method: 'POST', body: JSON.stringify(input) });

export const fetchCampaignApi = (id: string): Promise<{ campaign: EmailCampaign; recent_messages: EmailMessage[] }> =>
  adminJson(`/campaigns/${encodeURIComponent(id)}`);

export const sendCampaignApi = (id: string) =>
  adminJson<{ ok: boolean; queued: number; skipped: number; campaign: EmailCampaign }>(
    `/campaigns/${encodeURIComponent(id)}/send`,
    { method: 'POST', body: JSON.stringify({ confirm: true }) }
  );

export const pauseCampaignApi = (id: string) =>
  adminJson<{ ok: boolean; campaign: EmailCampaign }>(`/campaigns/${encodeURIComponent(id)}/pause`, { method: 'POST' });

export const resumeCampaignApi = (id: string) =>
  adminJson<{ ok: boolean; campaign: EmailCampaign }>(`/campaigns/${encodeURIComponent(id)}/resume`, { method: 'POST' });

export const deleteCampaignApi = (id: string) =>
  adminJson<{ ok: boolean }>(`/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' });

// ─── Test send + queue ──────────────────────────────────────────────────────

export const sendTestEmailApi = (input: { to: string; template_id: EmailTemplateId; vars?: Record<string, string> }) =>
  adminJson<{ ok: boolean; message_id: string; status: string; from: string; test_identity: boolean }>(
    '/test',
    { method: 'POST', body: JSON.stringify(input) }
  );

export const fetchQueueApi = (): Promise<EmailQueueStatus> => adminJson('/queue');

// ─── Automation ─────────────────────────────────────────────────────────────

export interface AutomationPassResult {
  /** Behaviour-rule emails queued (A1–A4). */
  queued: number;
  /** Drip step emails queued (A5). */
  drip_queued: number;
  /** Leads retired because a paid order was found. */
  converted: number;
  skipped: number;
  reasons: Record<string, number>;
  drip_completed: string[];
}

/**
 * One synchronous automation pass — behaviour rules plus every elapsed drip
 * step — without waiting for the hourly scheduler. Queued mail then drains
 * through the paced queue like any other batch.
 */
export const runAutomationsApi = (): Promise<{ ok: boolean; result: AutomationPassResult; queue: EmailQueueStatus }> =>
  adminJson('/automations/run-now', { method: 'POST' });

// ─── Analytics ─────────────────────────────────────────────────────────────

export interface EmailFunnel {
  queued: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  skipped: number;
}

export interface EmailRates {
  /** (opened + clicked) / accepted — a click implies an open. */
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  bounce_alert: boolean;
}

export interface EmailTemplateStat extends EmailFunnel, EmailRates { template_id: EmailTemplateId }
export interface EmailAutomationStat extends EmailFunnel { rule: string; label: string; fires: number }

export interface EmailAnalytics {
  list: { total: number; by_status: Record<string, number>; added_7d: number; added_30d: number };
  totals: EmailFunnel & EmailRates;
  templates: EmailTemplateStat[];
  automations: EmailAutomationStat[];
  campaigns: {
    id: string; name: string; kind: 'blast' | 'drip'; status: string;
    template_id: EmailTemplateId; created_at: string; stats: EmailCampaignStats;
  }[];
  daily: { day: string; sends: number; opens: number; clicks: number }[];
}

export const fetchAnalyticsApi = (): Promise<EmailAnalytics> => adminJson('/analytics');

export interface LeadTimelineEvent {
  ts: string;
  kind: 'queued' | 'sent' | 'opened' | 'clicked' | 'identify' | 'email_click' | 'page_view';
  detail: string;
  message_id?: string;
}

export interface LeadTimelineResponse {
  ok: boolean;
  lead: EmailLead;
  events: LeadTimelineEvent[];
  pending: EmailMessage[];
}

export const fetchLeadTimelineApi = (id: string): Promise<LeadTimelineResponse> =>
  adminJson(`/leads/${encodeURIComponent(id)}/timeline`);

/**
 * Authenticated CSV download: apiFetch carries the bearer token (a plain
 * <a href> would 401), so fetch → blob → object URL → programmatic click.
 */
export const downloadCsvApi = async (kind: 'leads' | 'messages'): Promise<void> => {
  const res = await apiFetch(`${adminBase}/export.csv?kind=${kind}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any)?.error || `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `tieedu-${kind}.csv`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
