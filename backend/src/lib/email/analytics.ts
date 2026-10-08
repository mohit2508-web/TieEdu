/**
 * Phase 5 analytics — pure functions over a db snapshot: campaign funnels,
 * per-template rates, per-rule automation counts, one-lead timeline and CSV
 * export. Kept out of the routers so tests can assert the maths without HTTP
 * and each route stays a one-liner.
 *
 * A message row holds exactly ONE terminal status (the ladder queued → sent →
 * delivered → opened → clicked overwrites as webhooks land), so a "funnel"
 * counts rows per ending state — it is not cumulative stages. Rates therefore
 * treat a click as an implied open: accepted = sent+delivered+opened+clicked,
 * and open_rate counts opened+clicked over that.
 */
import type { EmailCampaign, EmailTemplateId } from '../../data/db';
import { recomputeCampaignStats } from './send';

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
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  /** Deliverability guardrail (plan §5): >3% bounce past 50 attempts ⇒ pause. */
  bounce_alert: boolean;
}

export const AUTOMATION_RULE_LABELS: Record<string, string> = {
  a1: 'Course page nudge',
  a2: 'Vault nudge',
  a3: 'Skill test nudge',
  a4: 'Re-subject (non-opener)',
  a5: 'Drip step',
};

const emptyFunnel = (): EmailFunnel => ({
  queued: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, failed: 0, skipped: 0,
});

/** Count rows per terminal status. `failed` stays its own bucket (unlike recomputeCampaignStats, which folds it into bounced for the legacy campaign cache). */
export function funnelOf(messages: any[]): EmailFunnel {
  const f = emptyFunnel();
  for (const m of messages) {
    if (!m) continue;
    switch (m.status) {
      case 'queued': f.queued++; break;
      case 'sent': f.sent++; break;
      case 'delivered': f.delivered++; break;
      case 'opened': f.opened++; break;
      case 'clicked': f.clicked++; break;
      case 'bounced': f.bounced++; break;
      case 'failed': f.failed++; break;
      case 'skipped': f.skipped++; break;
    }
  }
  return f;
}

const rate = (n: number, d: number): number => (d > 0 ? Math.round((n / d) * 1000) / 1000 : 0);

export function ratesOf(f: EmailFunnel): EmailRates {
  const accepted = f.sent + f.delivered + f.opened + f.clicked;
  const attempted = accepted + f.bounced + f.failed;
  const bounce_rate = rate(f.bounced, attempted);
  return {
    open_rate: rate(f.opened + f.clicked, accepted),
    click_rate: rate(f.clicked, accepted),
    bounce_rate,
    bounce_alert: attempted >= 50 && bounce_rate > 0.03,
  };
}

export interface TemplateStat extends EmailFunnel, EmailRates { template_id: string }
export interface AutomationStat extends EmailFunnel { rule: string; label: string; fires: number }
export interface CampaignStat {
  id: string;
  name: string;
  kind: 'blast' | 'drip';
  status: string;
  template_id: EmailTemplateId;
  created_at: string;
  /** Legacy cache shape: `failed` is folded into `bounced` here (see recomputeCampaignStats). */
  stats: EmailCampaign['stats'];
}

export interface EmailAnalytics {
  list: { total: number; by_status: Record<string, number>; added_7d: number; added_30d: number };
  totals: EmailFunnel & EmailRates;
  templates: TemplateStat[];
  automations: AutomationStat[];
  campaigns: CampaignStat[];
  daily: { day: string; sends: number; opens: number; clicks: number }[];
}

/** Full stats payload for the Analytics screen. */
export function computeEmailAnalytics(db: any): EmailAnalytics {
  const messages: any[] = (db.email_messages || []).filter((m: any) => !!m && typeof m.email === 'string');
  const leads: any[] = (db.email_leads || []).filter((l: any) => !!l && typeof l.email === 'string');

  const baseFunnel = funnelOf(messages);
  const totals: EmailAnalytics['totals'] = { ...baseFunnel, ...ratesOf(baseFunnel) };

  // Per-template: test sends included on purpose — they are real sends through
  // the real path, and excluding them would flatter templates nobody mailed.
  const byTemplate = new Map<string, any[]>();
  for (const m of messages) {
    const key = m.template_id || 'unknown';
    if (!byTemplate.has(key)) byTemplate.set(key, []);
    byTemplate.get(key)!.push(m);
  }
  const templates = [...byTemplate.entries()]
    .map(([template_id, rows]) => {
      const f = funnelOf(rows);
      return { template_id, ...f, ...ratesOf(f) };
    })
    .sort((a, b) => b.sent + b.delivered + b.opened + b.clicked - (a.sent + a.delivered + a.opened + a.clicked));

  // Per-rule automation counts. A family appears from either side: a fire
  // without a dispatched message still happened, a message without a fire row
  // (legacy) still counts.
  const families = new Map<string, { fires: number; rows: any[] }>();
  const family = (rule: string) => {
    let e = families.get(rule);
    if (!e) { e = { fires: 0, rows: [] }; families.set(rule, e); }
    return e;
  };
  for (const fire of db.email_automation_fires || []) {
    const rule = String(fire?.rule_id || '').split(':')[0];
    if (rule) family(rule).fires++;
  }
  for (const m of messages) {
    if (!m.automation_id) continue;
    family(String(m.automation_id).split(':')[0]).rows.push(m);
  }
  const automations = [...families.entries()]
    .map(([rule, e]) => {
      const f = funnelOf(e.rows);
      return { rule, label: AUTOMATION_RULE_LABELS[rule] || rule, fires: e.fires, ...f };
    })
    .sort((a, b) => a.rule.localeCompare(b.rule));

  // Campaign funnels: same live recompute GET /campaigns serves, so the two
  // screens can never disagree.
  const campaigns: CampaignStat[] = (db.email_campaigns || [])
    .filter((c: any) => !!c)
    .slice()
    .reverse()
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      status: c.status,
      template_id: c.template_id,
      created_at: c.created_at,
      stats: recomputeCampaignStats(db, c.id),
    }));

  // List health.
  const by_status: Record<string, number> = {};
  for (const l of leads) by_status[l.status || 'unknown'] = (by_status[l.status || 'unknown'] || 0) + 1;
  const since = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
  const list = {
    total: leads.length,
    by_status,
    added_7d: leads.filter((l) => typeof l.created_at === 'string' && l.created_at >= since(7)).length,
    added_30d: leads.filter((l) => typeof l.created_at === 'string' && l.created_at >= since(30)).length,
  };

  // Last 14 UTC days, one bar per day — timestamps bucket by their own date so
  // a send and its open can sit on different bars (which is the truth).
  const daily: EmailAnalytics['daily'] = [];
  const dayIndex = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    dayIndex.set(day, daily.length);
    daily.push({ day, sends: 0, opens: 0, clicks: 0 });
  }
  const bump = (ts: any, field: 'sends' | 'opens' | 'clicks') => {
    if (typeof ts !== 'string') return;
    const i = dayIndex.get(ts.slice(0, 10));
    if (i !== undefined) daily[i][field]++;
  };
  for (const m of messages) {
    bump(m.sent_at, 'sends');
    bump(m.opened_at, 'opens');
    bump(m.clicked_at, 'clicks');
  }

  return { list, totals, templates, automations, campaigns, daily };
}

// ── One-lead timeline ───────────────────────────────────────────────────────

export interface LeadTimelineEvent {
  ts: string;
  kind: 'queued' | 'sent' | 'opened' | 'clicked' | 'identify' | 'email_click' | 'page_view';
  detail: string;
  message_id?: string;
}

export interface LeadTimeline {
  lead: any;
  events: LeadTimelineEvent[];
  /** Rows with no timestamp at all (skipped, failed, pre-`created_at` queue rows). */
  pending: any[];
}

/**
 * Every send + every tracked activity for one person, newest first. Message
 * rows expand into one event per timestamp they actually have; rows without
 * any timestamp (an unsubscribe skip, a provider failure) cannot be placed on
 * a timeline honestly, so they ride along as `pending` current states.
 */
export function leadTimeline(db: any, leadId: string): LeadTimeline | null {
  const lead = (db.email_leads || []).find((l: any) => l && l.id === leadId);
  if (!lead) return null;

  const events: LeadTimelineEvent[] = [];
  const pending: any[] = [];

  for (const m of db.email_messages || []) {
    if (!m || m.lead_id !== leadId) continue;
    const source = m.automation_id ? `automation ${m.automation_id}` : m.campaign_id ? 'campaign' : 'test';
    const what = `${m.template_id}${m.subject ? ` — "${m.subject}"` : ''}`;
    let timed = false;
    if (typeof m.created_at === 'string') {
      events.push({ ts: m.created_at, kind: 'queued', detail: `Queued (${source}): ${what}`, message_id: m.id });
      timed = true;
    }
    if (typeof m.sent_at === 'string') {
      events.push({ ts: m.sent_at, kind: 'sent', detail: `Sent (${source}): ${what}`, message_id: m.id });
      timed = true;
    }
    if (typeof m.opened_at === 'string') {
      events.push({ ts: m.opened_at, kind: 'opened', detail: `Opened: ${what}`, message_id: m.id });
      timed = true;
    }
    if (typeof m.clicked_at === 'string') {
      events.push({ ts: m.clicked_at, kind: 'clicked', detail: `Clicked a CTA: ${what}`, message_id: m.id });
      timed = true;
    }
    if (!timed) pending.push(m);
  }

  for (const a of db.email_activities || []) {
    if (!a || a.lead_id !== leadId || typeof a.ts !== 'string') continue;
    events.push({
      ts: a.ts,
      kind: a.type,
      detail:
        a.type === 'identify'
          ? 'Identified from an email link (cookie set)'
          : a.type === 'email_click'
            ? `Clicked a tracked link → ${a.path || '/'}`
            : `Viewed ${a.category || 'page'}: ${a.path || '/'}`,
    });
  }

  events.sort((x, y) => (x.ts === y.ts ? 0 : x.ts < y.ts ? 1 : -1));
  return { lead, events, pending };
}

// ── CSV export ──────────────────────────────────────────────────────────────

/** RFC-4180 escaping: quotes fields containing a comma, quote or line break. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}

export function leadsCsv(db: any): string {
  const headers = ['id', 'email', 'name', 'college', 'year', 'status', 'source', 'tags', 'consent_at', 'last_activity_at', 'created_at', 'updated_at'];
  const rows = (db.email_leads || [])
    .filter((l: any) => !!l && typeof l.email === 'string')
    .map((l: any) => [
      l.id, l.email, l.name, l.college, l.year, l.status, l.source,
      (l.tags || []).join('|'), l.consent_at, l.last_activity_at, l.created_at, l.updated_at,
    ]);
  return toCsv(headers, rows);
}

export function messagesCsv(db: any): string {
  const headers = ['id', 'email', 'lead_id', 'campaign_id', 'automation_id', 'template_id', 'subject', 'status', 'skip_reason', 'queued_at', 'sent_at', 'opened_at', 'clicked_at', 'error'];
  const rows = (db.email_messages || [])
    .filter((m: any) => !!m && typeof m.email === 'string')
    .map((m: any) => [
      m.id, m.email, m.lead_id, m.campaign_id, m.automation_id, m.template_id, m.subject,
      m.status, m.skip_reason, m.created_at, m.sent_at, m.opened_at, m.clicked_at, m.error,
    ]);
  return toCsv(headers, rows);
}
