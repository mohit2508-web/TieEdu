/**
 * Admin: campaigns, test sends, queue control, template previews.
 *
 * A campaign never sends directly from the request handler — `POST /:id/send`
 * only materialises queued rows and starts the paced queue (lib/email/queue).
 * The request returns in milliseconds regardless of list size, and the client
 * polls GET /:id for live counters, which is what a progress bar needs anyway.
 *
 * Test sends are real sends through the real dispatch path with a real message
 * row (lead_id '') — a mocked "test mode" would prove nothing about rendering,
 * suppression or the provider handshake.
 */
import { Router, Request, Response } from 'express';
import { loadDb, saveDb, EmailCampaign, EmailMessage, EmailTemplateId } from '../data/db';
import { requireAdmin, requirePermission } from '../middleware/auth';
import { can } from '../lib/rbac';
import { appendAudit } from '../store/audit';
import { materialiseCampaign, recomputeCampaignStats, sendTestEmail, templateHomePath } from '../lib/email/send';
import { renderTemplate, templatePreviewInfo } from '../lib/email/render';
import { TEMPLATE_LIST } from '../lib/email/templates/registry';
import { startEmailQueue, queueStatus, pauseQueue, resumeQueue } from '../lib/email/queue';
import { runEmailAutomations, startEmailAutomationScheduler } from '../lib/email/automations';
import { computeEmailAnalytics } from '../lib/email/analytics';
import { emailConfigError, isTestIdentity, EMAIL_FROM } from '../lib/email/client';
import { unsubFor } from '../lib/email/links';

export const emailCampaignsRouter = Router();

/*
 * Armed here rather than in server.ts because this router is the email
 * subsystem's admin entry point and is mounted unconditionally, mirroring how
 * notifications.routes.ts starts the reminder scheduler. Idempotent and
 * unref'd: importing this file in a test does not start a loop. Boot-time
 * arming matters because a batch interrupted by a restart leaves `queued`
 * rows that must resume without anyone pressing Send again.
 */
startEmailQueue();
startEmailAutomationScheduler();

emailCampaignsRouter.use(requireAdmin);

const TEMPLATE_IDS = TEMPLATE_LIST.map((t) => t.id);

const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const emptyStats = (): EmailCampaign['stats'] => ({
  queued: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0,
});

/** GET /api/email/admin/templates — picker data for the campaign builder. */
emailCampaignsRouter.get('/templates', requirePermission('email.read'), (_req: Request, res: Response) => {
  res.json({
    templates: TEMPLATE_LIST.map((t) => ({
      ...t,
      ...templatePreviewInfo(t.id),
      home_path: templateHomePath(t.id),
    })),
  });
});

/** GET /api/email/admin/templates/:id/preview — rendered HTML of one template. */
emailCampaignsRouter.get('/templates/:id/preview', requirePermission('email.read'), async (req: Request, res: Response) => {
  const id = req.params.id as EmailTemplateId;
  if (!TEMPLATE_IDS.includes(id)) return res.status(404).json({ error: 'Unknown template' });
  const vars = req.query.vars ? safeVars(req.query.vars) : {};
  try {
    const rendered = await renderTemplate(id, {
      name: String(req.query.name || 'Aarav'),
      href: (p: string) => p,
      unsubUrl: unsubFor('preview-lead'),
      vars,
    });
    res.json({ subject: rendered.subject, html: rendered.html, text: rendered.text });
  } catch (e: any) {
    res.status(500).json({ error: `Render failed: ${String(e?.message || e)}` });
  }
});

function safeVars(raw: unknown): Record<string, string> {
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { return {}; }
  }
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && k.length <= 64) out[k] = v.slice(0, 300);
  }
  return out;
}

/**
 * POST /api/email/admin/test — send one template to an address of the admin's
 * choosing. Guarded by email.send (writing the list is not the same as
 * mailing it), and refuses to fire when the from-identity is Resend's test
 * domain and the target is not the account owner — that combination is
 * silently rejected by the provider and would look like a bug here.
 */
emailCampaignsRouter.post('/test', requirePermission('email.send'), async (req: Request, res: Response) => {
  const to = String(req.body?.to || '').trim().toLowerCase();
  const templateId = String(req.body?.template_id || '') as EmailTemplateId;
  if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(to)) return res.status(400).json({ error: 'Valid "to" address required.' });
  if (!TEMPLATE_IDS.includes(templateId)) return res.status(400).json({ error: `template_id must be one of: ${TEMPLATE_IDS.join(', ')}` });

  const configErr = emailConfigError();
  if (configErr) return res.status(503).json({ error: configErr });

  const vars = req.body?.vars && typeof req.body.vars === 'object' ? safeVars(req.body.vars) : {};

  const { id, result } = await sendTestEmail({ to, template_id: templateId, vars });
  if (!result.ok) return res.status(502).json({ error: result.error || 'Send failed', message_id: id });

  const audit = appendAudit(loadDb(), {
    action: 'email.test_send',
    actor: req.user?.email || 'admin',
    detail: `Test ${templateId} → ${to}`,
    meta: { template_id: templateId, to, message_id: id },
  });
  void audit;

  res.json({ ok: true, message_id: id, status: result.status, from: EMAIL_FROM(), test_identity: isTestIdentity() });
});

/** GET /api/email/admin/campaigns */
emailCampaignsRouter.get('/campaigns', requirePermission('email.read'), (_req: Request, res: Response) => {
  const db = loadDb();
  const campaigns: EmailCampaign[] = (db.email_campaigns || []).slice().reverse();
  res.json({
    campaigns: campaigns.map((c) => ({ ...c, stats: recomputeCampaignStats(db, c.id) })),
  });
});

/** POST /api/email/admin/campaigns — create draft. */
emailCampaignsRouter.post('/campaigns', requirePermission('email.write'), (req: Request, res: Response) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const templateId = String(body.template_id || '') as EmailTemplateId;
  if (!name) return res.status(400).json({ error: 'Campaign name required.' });
  if (!TEMPLATE_IDS.includes(templateId)) return res.status(400).json({ error: 'Unknown template_id.' });
  const kind = body.kind === 'drip' ? 'drip' : 'blast';
  if (kind === 'drip' && (!Array.isArray(body.drip_steps) || !body.drip_steps.length)) {
    return res.status(400).json({ error: 'A drip campaign needs at least one step.' });
  }

  const segment: EmailCampaign['segment'] = {};
  if (body.segment?.year) segment.year = String(body.segment.year);
  if (Array.isArray(body.segment?.tags)) segment.tags = body.segment.tags.map(String).filter(Boolean).slice(0, 10);
  if (Array.isArray(body.segment?.statuses)) segment.statuses = body.segment.statuses;

  let drip_steps: EmailCampaign['drip_steps'];
  if (kind === 'drip') {
    drip_steps = [];
    for (const step of body.drip_steps) {
      const day = Number(step?.day);
      const tid = String(step?.template_id || '') as EmailTemplateId;
      if (!Number.isInteger(day) || day < 0 || day > 90) return res.status(400).json({ error: 'Drip days must be 0–90.' });
      if (!TEMPLATE_IDS.includes(tid)) return res.status(400).json({ error: `Unknown drip template: ${tid}` });
      drip_steps.push({ day, template_id: tid });
    }
    drip_steps.sort((a, b) => a.day - b.day);
  }

  const campaign: EmailCampaign = {
    id: newId('ec'),
    name,
    kind,
    template_id: templateId,
    segment,
    status: 'draft',
    drip_steps,
    stats: emptyStats(),
    created_at: new Date().toISOString(),
  };
  const db = loadDb();
  (db.email_campaigns ||= []).push(campaign);
  saveDb(db);
  res.status(201).json({ campaign });
});

/** GET /api/email/admin/campaigns/:id — live stats + recent messages. */
emailCampaignsRouter.get('/campaigns/:id', requirePermission('email.read'), (req: Request, res: Response) => {
  const db = loadDb();
  const campaign: EmailCampaign | undefined = (db.email_campaigns || []).find((c: EmailCampaign) => c && c.id === req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const messages: EmailMessage[] = (db.email_messages || [])
    .filter((m: EmailMessage) => m && m.campaign_id === campaign.id)
    .slice(-50)
    .reverse();
  res.json({ campaign: { ...campaign, stats: recomputeCampaignStats(db, campaign.id) }, recent_messages: messages });
});

/** POST /api/email/admin/campaigns/:id/send — materialise + start queue. */
emailCampaignsRouter.post('/campaigns/:id/send', requirePermission('email.send'), async (req: Request, res: Response) => {
  if (req.body?.confirm !== true) {
    return res.status(400).json({ error: 'Send not started: confirmation is required.', code: 'confirmation_required' });
  }
  const configErr = emailConfigError();
  if (configErr) return res.status(503).json({ error: configErr });

  const db = loadDb();
  const campaign: EmailCampaign | undefined = (db.email_campaigns || []).find((c: EmailCampaign) => c && c.id === req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (campaign.status === 'sending') return res.status(409).json({ error: 'Campaign is already sending.' });

  // A drip is activated, not materialised: steps queue themselves from the
  // automation pass as their days come due (day 0 is elapsed, so it queues
  // in the pass below — immediately, from the admin's point of view).
  if (campaign.kind === 'drip') {
    if (!campaign.drip_steps?.length) {
      return res.status(400).json({ error: 'A drip campaign needs at least one step.' });
    }
    campaign.status = 'sending';
    saveDb(db);
    await appendAudit(db, {
      action: 'email.campaign.send',
      actor: req.user?.email || 'admin',
      detail: `Drip campaign "${campaign.name}" activated (${campaign.drip_steps.length} steps)`,
      target: campaign.id,
      meta: { drip_steps: campaign.drip_steps, segment: campaign.segment },
    });
    saveDb(db);

    const pass = runEmailAutomations();
    res.json({ ok: true, drip: true, queued: pass.drip_queued, skipped: pass.skipped, campaign });
    return;
  }

  const { queued, skipped } = materialiseCampaign(db, campaign);
  if (queued === 0) {
    campaign.status = 'sent';
    saveDb(db);
    return res.status(400).json({ error: 'No new recipients matched that segment.', skipped, queued: 0 });
  }
  campaign.status = 'sending';
  saveDb(db);

  await appendAudit(db, {
    action: 'email.campaign.send',
    actor: req.user?.email || 'admin',
    detail: `Campaign "${campaign.name}" (${campaign.template_id}) queued to ${queued} recipient(s)`,
    target: campaign.id,
    meta: { queued, skipped, segment: campaign.segment },
  });
  saveDb(db);

  startEmailQueue();
  res.json({ ok: true, queued, skipped, campaign });
});

/** POST /api/email/admin/campaigns/:id/pause | /resume */
emailCampaignsRouter.post('/campaigns/:id/pause', requirePermission('email.send'), (req: Request, res: Response) => {
  const db = loadDb();
  const campaign: EmailCampaign | undefined = (db.email_campaigns || []).find((c: EmailCampaign) => c && c.id === req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  campaign.status = 'paused';
  saveDb(db);
  pauseQueue();
  res.json({ ok: true, campaign });
});

emailCampaignsRouter.post('/campaigns/:id/resume', requirePermission('email.send'), (req: Request, res: Response) => {
  const db = loadDb();
  const campaign: EmailCampaign | undefined = (db.email_campaigns || []).find((c: EmailCampaign) => c && c.id === req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const remaining = (db.email_messages || []).some((m: EmailMessage) => m && m.campaign_id === campaign.id && m.status === 'queued');
  campaign.status = remaining ? 'sending' : 'sent';
  saveDb(db);
  resumeQueue();
  startEmailQueue();
  res.json({ ok: true, campaign });
});

/** DELETE /api/email/admin/campaigns/:id — drafts and finished campaigns only. */
emailCampaignsRouter.delete('/campaigns/:id', requirePermission('email.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const campaign: EmailCampaign | undefined = (db.email_campaigns || []).find((c: EmailCampaign) => c && c.id === req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (campaign.status === 'sending') return res.status(409).json({ error: 'Pause the campaign before deleting it.' });
  db.email_campaigns = (db.email_campaigns || []).filter((c: EmailCampaign) => c && c.id !== campaign.id);
  saveDb(db);
  res.json({ ok: true });
});

/** GET /api/email/admin/queue — pacing + backlog for the progress UI. */
emailCampaignsRouter.get('/queue', requirePermission('email.read'), (_req: Request, res: Response) => {
  res.json({ ...queueStatus(), configured: !emailConfigError(), config_error: emailConfigError() });
});

/**
 * GET /api/email/admin/analytics — the whole stats screen in one payload:
 * list health, delivery totals with rates, per-template open/CTR, per-rule
 * automation counts, campaign funnels (same recompute GET /campaigns serves)
 * and a 14-day sends/opens/clicks series.
 */
emailCampaignsRouter.get('/analytics', requirePermission('email.read'), (_req: Request, res: Response) => {
  res.json(computeEmailAnalytics(loadDb()));
});

/**
 * POST /api/email/admin/automations/run-now — one synchronous automation
 * pass (A1–A4 rules + elapsed drip steps) without waiting for the hourly
 * scheduler. The pass is sync by contract, so the response carries its real
 * counts; queued mail then drains through the paced queue as usual.
 */
emailCampaignsRouter.post('/automations/run-now', requirePermission('email.send'), async (req: Request, res: Response) => {
  const result = runEmailAutomations();

  const db = loadDb();
  await appendAudit(db, {
    action: 'email.automations.run',
    actor: req.user?.email || 'admin',
    detail:
      `Manual pass: ${result.queued} rule + ${result.drip_queued} drip queued, ` +
      `${result.converted} converted, ${result.skipped} skipped`,
    meta: { ...result },
  });
  saveDb(db);

  res.json({ ok: true, result, queue: queueStatus() });
});
