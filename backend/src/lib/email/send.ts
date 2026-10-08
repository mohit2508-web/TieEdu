/**
 * Sending: queue rows → rendered email → Resend → honest status bookkeeping.
 *
 * Design notes worth keeping:
 *
 * - A send is ALWAYS an EmailMessage row first, Resend call second. A crash
 *   between the two leaves a `queued` row that the queue picks up again, and
 *   there is no path where mail leaves the building with no record of it.
 * - dispatchMessage holds NO db snapshot across its awaits: guards run on one
 *   synchronous load, the render + provider call happen db-less, and every
 *   terminal write reloads (saveOutcome). Holding a snapshot across the
 *   provider await would let the outcome save resurrect rows that a webhook,
 *   an admin edit or an automation pass changed in the meantime — for a row
 *   that already left the building, that means a double send.
 * - Suppression is checked at dispatch time, not enqueue time: an unsubscribe
 *   that lands between "queued" and "sent" must win.
 */
import { loadDb, saveDb, EmailLead, EmailMessage, EmailTemplateId, EmailCampaign } from '../../data/db';
import { getEmailClient, EMAIL_FROM, EMAIL_REPLY_TO, emailConfigError } from './client';
import { renderTemplate } from './render';
import { wrapLink, unsubFor, safeTarget, siteUrl } from './links';
import type { TemplateProps } from './templates/base';

export interface TemplateVars {
  [key: string]: string;
}

const newMessageId = (): string =>
  `em-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Site path a template should open for this id. Unknown/dead paths fall back
 * to the home page rather than minting a link to a route that 404s.
 */
export function templateHomePath(templateId: EmailTemplateId): string {
  switch (templateId) {
    case 'course-buy':
    case 'course-buy-later':
    case 'proof':
    case 'offer':
    case 'reengage':
      return '/courses/advanced-data-structures';
    case 'vault':
      return '/company/tcs';
    case 'skill-test':
      return '/skill-test';
    default:
      return '/';
  }
}

function buildProps(lead: EmailLead | null, messageId: string | undefined, vars: TemplateVars, templateId: EmailTemplateId): TemplateProps {
  return {
    name: lead?.name || '',
    href: (path: string) => wrapLink(safeTarget(path) || templateHomePath(templateId), messageId),
    unsubUrl: lead ? unsubFor(lead.id) : `${siteUrl()}/`,
    vars,
  };
}

export interface QueueMessageInput {
  email: string;
  lead_id: string;
  template_id: EmailTemplateId;
  campaign_id?: string;
  automation_id?: string;
  subject?: string;
  /** Render props frozen at queue time (automation nudges personalise here). */
  vars?: Record<string, string>;
}

/** Create a queued row. Subject is filled at render time; this is the pre-read. */
export function queueMessage(db: any, input: QueueMessageInput): EmailMessage {
  const message: EmailMessage = {
    id: newMessageId(),
    campaign_id: input.campaign_id,
    automation_id: input.automation_id,
    lead_id: input.lead_id,
    email: input.email,
    template_id: input.template_id,
    subject: input.subject || '',
    status: 'queued',
    created_at: new Date().toISOString(),
  };
  if (input.vars && Object.keys(input.vars).length) message.vars = { ...input.vars };
  if (!Array.isArray(db.email_messages)) db.email_messages = [];
  db.email_messages.push(message);
  return message;
}

export interface DispatchResult {
  ok: boolean;
  status: EmailMessage['status'];
  error?: string;
}

/**
 * A queued row may carry an override subject (A4 non-opener re-subject —
 * frozen at queue time). The rendered default wins only when no override
 * was set.
 */
export function resolveSubject(stored: string | undefined, rendered: string): string {
  return (stored || '').trim() || rendered;
}

/**
 * Write a dispatch outcome on a FRESH snapshot taken immediately before the
 * save. dispatchMessage holds no db across its awaits; every terminal write
 * goes through here so the claim→outcome window cannot resurrect rows that
 * another writer (webhook, admin edit, automation pass) changed while the
 * provider call was in flight. loadDb → apply → saveDb is synchronous, hence
 * atomic against the event loop.
 */
function saveOutcome(
  messageId: string,
  apply: (m: EmailMessage, db: any) => DispatchResult
): DispatchResult {
  const db = loadDb();
  const m: EmailMessage | undefined = (db.email_messages || []).find(
    (x: EmailMessage) => x && x.id === messageId
  );
  if (!m) return { ok: false, status: 'failed', error: 'message_not_found' };
  const result = apply(m, db);
  saveDb(db);
  return result;
}

/**
 * Render + send one queued message. No db snapshot is held across an await:
 * guards run synchronously, then render + provider, then the outcome is
 * written through saveOutcome. Returns the resulting status so tests and the
 * queue can assert without re-reading the store.
 */
export async function dispatchMessage(messageId: string, callVars: TemplateVars = {}): Promise<DispatchResult> {
  // Phase 1 — synchronous claim + guards. Everything below the guard block
  // runs without a db in hand.
  const db = loadDb();
  const message: EmailMessage | undefined = (db.email_messages || []).find(
    (m: EmailMessage) => m.id === messageId
  );
  if (!message) return { ok: false, status: 'failed', error: 'message_not_found' };
  if (message.status !== 'queued') return { ok: true, status: message.status };

  const lead: EmailLead | null = message.lead_id
    ? (db.email_leads || []).find((l: EmailLead) => l.id === message.lead_id) || null
    : null;

  // Suppression at the moment of sending, not of enqueueing.
  if (lead && lead.status !== 'active') {
    const reason = lead.status;
    return saveOutcome(messageId, (m) => {
      m.status = 'skipped';
      m.skip_reason = reason;
      return { ok: true, status: 'skipped', error: reason };
    });
  }

  const configErr = emailConfigError();
  if (configErr) {
    return saveOutcome(messageId, (m) => {
      m.status = 'failed';
      m.error = configErr;
      return { ok: false, status: 'failed', error: configErr };
    });
  }

  // Render inputs captured as plain values — the phase-1 snapshot is dropped.
  const templateId = message.template_id;
  const storedSubject = message.subject;
  const mergedVars: TemplateVars = { ...(message.vars || {}), ...callVars };
  const props = buildProps(lead, message.id, mergedVars, templateId);

  let rendered;
  try {
    rendered = await renderTemplate(templateId, props);
  } catch (err: any) {
    const error = `render_failed: ${String(err?.message || err)}`;
    return saveOutcome(messageId, (m) => {
      m.status = 'failed';
      m.error = error;
      return { ok: false, status: 'failed', error };
    });
  }

  const client = getEmailClient();
  if (!client) {
    const error = 'email client unavailable';
    return saveOutcome(messageId, (m) => {
      m.status = 'failed';
      m.error = error;
      return { ok: false, status: 'failed', error };
    });
  }

  const subject = resolveSubject(storedSubject, rendered.subject);
  const { data, error } = await client.emails.send({
    from: EMAIL_FROM(),
    to: [message.email],
    replyTo: EMAIL_REPLY_TO(),
    subject,
    html: rendered.html,
    text: rendered.text,
  });

  if (error || !data?.id) {
    const failMsg = error?.message || 'provider_rejected';
    return saveOutcome(messageId, (m) => {
      m.status = 'failed';
      m.error = failMsg;
      return { ok: false, status: 'failed', error: failMsg };
    });
  }

  const providerId = data.id;
  const sentAt = new Date().toISOString();
  return saveOutcome(messageId, (m, fresh) => {
    m.provider_id = providerId;
    m.subject = subject;
    m.status = 'sent';
    m.sent_at = sentAt;
    m.error = undefined;
    if (m.lead_id) {
      const row = (fresh.email_leads || []).find((l: EmailLead) => l && l.id === m.lead_id);
      if (row) row.last_activity_at = sentAt;
    }
    return { ok: true, status: 'sent' };
  });
}

/**
 * Admin self-test: sends a template to a address of the admin's choosing.
 * Creates a real message row (lead_id '') so the render + provider path is the
 * production path — a separate "test mode" that skips steps tests nothing.
 */
export async function sendTestEmail(opts: {
  to: string;
  template_id: EmailTemplateId;
  vars?: TemplateVars;
}): Promise<{ id: string; result: DispatchResult }> {
  const db = loadDb();
  const message = queueMessage(db, {
    email: opts.to,
    lead_id: '',
    template_id: opts.template_id,
  });
  saveDb(db);
  const result = await dispatchMessage(message.id, opts.vars || {});
  return { id: message.id, result };
}

/**
 * Resolve a campaign segment into queued message rows.
 *
 * Segment semantics: statuses default to ['active'] (never mail unsubscribed
 * or bounced rows by accident); tags/year are AND'ed when present. Dedupe by
 * email within the run — a CSV imported twice must not double-send.
 */
export function materialiseCampaign(db: any, campaign: EmailCampaign): { queued: number; skipped: number } {
  const statuses = campaign.segment?.statuses?.length ? campaign.segment.statuses : (['active'] as const);
  const tags = campaign.segment?.tags || [];
  const year = campaign.segment?.year;

  const seen = new Set(
    (db.email_messages || [])
      .filter((m: EmailMessage) => m.campaign_id === campaign.id)
      .map((m: EmailMessage) => m.email.toLowerCase())
  );

  let queued = 0;
  let skipped = 0;
  for (const lead of db.email_leads || []) {
    if (!lead || typeof lead.email !== 'string') continue;
    if (!(statuses as readonly string[]).includes(lead.status)) { skipped++; continue; }
    if (year && String(lead.year || '') !== String(year)) { skipped++; continue; }
    if (tags.length && !tags.every((t: string) => (lead.tags || []).includes(t))) { skipped++; continue; }
    const key = lead.email.toLowerCase();
    if (seen.has(key)) { skipped++; continue; }
    seen.add(key);
    queueMessage(db, {
      email: lead.email,
      lead_id: lead.id,
      template_id: campaign.template_id,
      campaign_id: campaign.id,
    });
    queued++;
  }
  campaign.stats = campaign.stats || { queued: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 };
  campaign.stats.queued += queued;
  return { queued, skipped };
}

/** Live counters from the message rows — the stored stats are a cache, not truth. */
export function recomputeCampaignStats(db: any, campaignId: string): EmailCampaign['stats'] {
  const stats = { queued: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 };
  const reachedLeads = new Set<string>();
  for (const m of db.email_messages || []) {
    if (!m || m.campaign_id !== campaignId) continue;
    switch (m.status) {
      case 'queued': stats.queued++; break;
      case 'sent': stats.sent++; break;
      case 'delivered': stats.delivered++; break;
      case 'opened': stats.opened++; break;
      case 'clicked': stats.clicked++; break;
      case 'bounced': stats.bounced++; break;
      case 'failed': stats.bounced++; break;
      case 'skipped': break;
    }
    if (m.lead_id && m.status !== 'queued' && m.status !== 'failed' && m.status !== 'skipped') {
      reachedLeads.add(m.lead_id);
    }
  }
  // Unsubscribed = leads this campaign actually reached who later opted out.
  // Counting them per campaign is honest only for leads with a message row here;
  // a global opt-out is visible on the lead itself.
  stats.unsubscribed = (db.email_leads || []).filter(
    (l: EmailLead) => l && l.status === 'unsubscribed' && reachedLeads.has(l.id)
  ).length;
  return stats;
}
