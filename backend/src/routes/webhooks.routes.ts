import { Router, Request, Response } from 'express';
import { loadDb, saveDb, EmailMessage, EmailLead, EmailCampaign } from '../data/db';
import { verifyWebhookSignature } from '../payments/gateway';
import { completePaidOrder } from '../payments/orders';
import { appendAudit } from '../store/audit';
import { getEmailClient } from '../lib/email/client';
import { startEmailQueue } from '../lib/email/queue';

export const webhooksRouter = Router();

// POST /api/webhooks/razorpay
// Raw body is captured into req.rawBody by the global json `verify` hook (server.ts)
// so signature verification stays byte-exact. Idempotent by order status.
webhooksRouter.post('/razorpay', async (req: Request, res: Response) => {
  const db = loadDb();
  const signature = (req.headers['x-razorpay-signature'] as string) || '';
  const rawBody = (req as any).rawBody || '';

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid HMAC signature' });
  }

  const event = req.body?.event;
  const payload = req.body?.payload || {};
  const rzpOrderId = payload?.payment?.entity?.order_id || payload?.order?.entity?.id || '';

  // Map razorpay order id -> our TieEdu order
  const order = (db.orders || []).find(
    (o: any) => o.gateway_order_id === rzpOrderId || o.id === rzpOrderId
  );

  if (event === 'payment.captured') {
    if (!order || !order.user_id) {
      return res.json({ status: 'received', handled: false, reason: 'order_not_found' });
    }
    if (order.status === 'paid') {
      return res.json({ status: 'received', handled: true, message: 'order_already_paid' });
    }
    const createdBy = order.user_id;
    try {
      await completePaidOrder(db, order, createdBy);
      await appendAudit(db, {
        actor: 'razorpay-webhook',
        action: 'order.paid.webhook',
        detail: `payment.captured webhook (${rzpOrderId})`,
        order_id: order.id,
        gateway: 'razorpay',
      });
      saveDb(db);
    } catch (e) {
      return res.status(500).json({ error: 'Completion failed' });
    }
    return res.json({ status: 'received', handled: true, message: 'order_marked_paid' });
  }

  if (event === 'payment.failed') {
    if (order && order.status === 'created') {
      order.status = 'failed';
      order.failure_at = new Date().toISOString();
      await appendAudit(db, {
        actor: 'razorpay-webhook',
        action: 'order.failed',
        detail: `payment.failed webhook (${rzpOrderId})`,
        order_id: order.id,
        gateway: 'razorpay',
      });
      saveDb(db);
      return res.json({ status: 'received', handled: true, message: 'order_marked_failed' });
    }
    return res.json({ status: 'received', handled: false });
  }

  return res.json({ status: 'received', handled: false });
});

// ---------------------------------------------------------------------------
// Resend delivery events: delivered / opened / clicked / bounced / complained.
//
// This is bookkeeping only — it never triggers a send (behaviour automations
// read their inputs from EmailActivity rows written by the click endpoint, so
// a webhook outage degrades stats, never correctness of what gets mailed).
//
// Signature: Resend signs with svix over the RAW body. server.ts's json `verify`
// hook already stashes req.rawBody, so verification stays byte-exact. Without
// RESEND_WEBHOOK_SECRET the endpoint rejects rather than accepting forged
// events — a delivery-stats lie is worse than no delivery stats.
//
// Status transitions are rank-ordered (queued < sent < delivered < opened <
// clicked) so a late 'delivered' arriving after 'opened' cannot rewind state.
// ---------------------------------------------------------------------------

const STATUS_RANK: Record<string, number> = { queued: 0, sent: 1, delivered: 2, opened: 3, clicked: 4 };
const TERMINAL = new Set(['bounced', 'failed', 'skipped']);

function advance(message: EmailMessage, next: 'delivered' | 'opened' | 'clicked'): void {
  const cur = STATUS_RANK[message.status] ?? 0;
  if (TERMINAL.has(message.status)) return;
  if ((STATUS_RANK[next] ?? 0) < cur) return;
  message.status = next;
  const now = new Date().toISOString();
  if (next === 'opened' && !message.opened_at) message.opened_at = now;
  if (next === 'clicked' && !message.clicked_at) message.clicked_at = now;
}

webhooksRouter.post('/resend', (req: Request, res: Response) => {
  const secret = (process.env.RESEND_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    return res.status(503).json({
      error: 'RESEND_WEBHOOK_SECRET is not set — refusing unsigned delivery events.',
    });
  }

  const client = getEmailClient();
  if (!client) return res.status(503).json({ error: 'Email client not configured.' });

  const rawBody = (req as any).rawBody || '';
  const headers = {
    id: String(req.headers['svix-id'] || ''),
    timestamp: String(req.headers['svix-timestamp'] || ''),
    signature: String(req.headers['svix-signature'] || ''),
  };

  let event: { type?: string; data?: Record<string, any> };
  try {
    event = client.webhooks.verify({ payload: rawBody, headers, webhookSecret: secret }) as any;
  } catch {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const type = event.type || '';
  const data = event.data || {};
  const providerId = String(data.email_id || data.id || '');
  if (!providerId) return res.json({ status: 'received', handled: false, reason: 'no_email_id' });

  const db = loadDb();
  const message: EmailMessage | undefined = (db.email_messages || []).find(
    (m: EmailMessage) => m && m.provider_id === providerId
  );
  if (!message) return res.json({ status: 'received', handled: false, reason: 'unknown_message' });

  const lead: EmailLead | null = message.lead_id
    ? (db.email_leads || []).find((l: EmailLead) => l && l.id === message.lead_id) || null
    : null;

  switch (type) {
    case 'email.sent':
    case 'email.delivered':
      advance(message, 'delivered');
      break;

    case 'email.opened':
      advance(message, 'opened');
      break;

    case 'email.clicked':
      advance(message, 'clicked');
      break;

    case 'email.bounced':
      message.status = 'bounced';
      message.error = String(data.bounce || data.reason || 'bounced').slice(0, 300);
      // A hard bounce poisons the domain's reputation if mailed again; the
      // lead status is the suppression, and dispatchMessage re-checks it.
      if (lead && lead.status === 'active') {
        lead.status = String(data.bounce?.type || '') === 'permanent' || !data.bounce ? 'bounced' : lead.status;
        lead.updated_at = new Date().toISOString();
      }
      break;

    case 'email.complained':
      message.status = 'bounced';
      message.error = 'complained (spam report)';
      if (lead) {
        lead.status = 'complained';
        lead.updated_at = new Date().toISOString();
      }
      break;

    case 'email.failed':
      if (message.status === 'queued' || message.status === 'sent') {
        message.status = 'failed';
        message.error = String(data.last_attempt_error || 'failed').slice(0, 300);
      }
      break;

    default:
      saveDb(db);
      return res.json({ status: 'received', handled: false, reason: `unhandled_event:${type}` });
  }

  // A finished campaign whose queue is empty is 'sent', not stuck on 'sending'.
  if (message.campaign_id) {
    const campaign: EmailCampaign | undefined = (db.email_campaigns || []).find(
      (c: EmailCampaign) => c && c.id === message.campaign_id
    );
    if (campaign && campaign.status === 'sending') {
      const stillQueued = (db.email_messages || []).some(
        (m: EmailMessage) => m && m.campaign_id === campaign.id && m.status === 'queued'
      );
      if (!stillQueued) campaign.status = 'sent';
    }
  }

  saveDb(db);
  // Nudge the queue: a bounce clearing a row can unblock the next claim.
  startEmailQueue();
  return res.json({ status: 'received', handled: true, message_status: message.status });
});