/**
 * Public, unauthenticated email endpoints: click redirects, the identity
 * exchange, page-view beacons, and unsubscribe.
 *
 * These are the things a recipient must be able to do WITHOUT an account:
 * follow a link, be recognised on a later visit, browse, and opt out. Each
 * carries its own HMAC token or signed cookie, so none of them needs (nor
 * accepts) a session, and none can be forged into acting on someone else's
 * address.
 *
 * Mounted at /api/email without requireAdmin — the click endpoint in
 * particular has to work for a cold lead on their very first visit, which is
 * exactly when there is no identity of any kind yet.
 */
import { Router, Request, Response } from 'express';
import { loadDb, saveDb, EmailMessage, EmailActivity, EmailLead } from '../data/db';
import {
  verifyClickToken,
  verifyIdentifyToken,
  verifyLeadCookie,
  verifyUnsubscribeToken,
  setLeadCookie,
  safeTarget,
  withIdentifyParam,
  LEAD_COOKIE_NAME,
} from '../lib/email/links';
import { classifyPath, sanitizeTrackPath } from '../lib/email/tracking';

export const emailPublicRouter = Router();

const newActivityId = (): string =>
  `ea-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function recordActivity(db: any, leadId: string, type: EmailActivity['type'], path?: string, category?: string): void {
  if (!leadId) return;
  const row: EmailActivity = {
    id: newActivityId(),
    lead_id: leadId,
    type,
    path,
    category,
    ts: new Date().toISOString(),
  };
  (db.email_activities ||= []).push(row);
  const lead = (db.email_leads || []).find((l: EmailLead) => l && l.id === leadId);
  if (lead) lead.last_activity_at = row.ts;
  // Cap the trail: a very old install with years of page views must not turn
  // db.json into an append-only log nobody can load.
  if (db.email_activities.length > 50000) db.email_activities = db.email_activities.slice(-40000);
}

/**
 * GET /api/email/click?m=<messageId>&u=<target>&s=<sig>
 *
 * Records the click, attaches the identity cookie, then 302s to the target.
 * The cookie lands on the redirect response, which is why the link wrapper
 * routes through this endpoint at all: it is the moment a cold lead becomes a
 * known visitor without asking them to log in or sign up.
 */
emailPublicRouter.get('/click', (req: Request, res: Response) => {
  const m = String(req.query.m || '');
  const u = safeTarget(req.query.u);
  const s = String(req.query.s || '');

  if (!m || !u || !verifyClickToken(m, u, s)) {
    return res.status(400).type('text/plain').send('Invalid or expired link.');
  }

  const db = loadDb();
  const message: EmailMessage | undefined = (db.email_messages || []).find(
    (msg: EmailMessage) => msg && msg.id === m
  );
  if (!message) return res.status(404).type('text/plain').send('This link is no longer active.');

  const now = new Date().toISOString();
  if (message.status === 'sent' || message.status === 'delivered' || message.status === 'opened') {
    message.status = 'clicked';
    message.clicked_at = now;
  } else if (message.status === 'queued') {
    // A click before our own send bookkeeping caught up (webhook lag). Record
    // the time but do not launder a queued row into 'clicked' — the send state
    // would then be unrepresentable.
    message.clicked_at = message.clicked_at || now;
  }

  if (message.lead_id) {
    recordActivity(db, message.lead_id, 'email_click', u);
    setLeadCookie(res, message.lead_id);
  }

  saveDb(db);
  // Belt to the cookie's braces: the cookie rides this response, but if it is
  // blocked or cleared before the page boots, the landing URL still carries a
  // short-lived `em` token the frontend exchanges for the same identity.
  res.redirect(302, message.lead_id ? withIdentifyParam(u, message.lead_id) : u);
});

/**
 * POST /api/email/identify { token, landing }
 *
 * The exchange half of the `?em=` token minted by the click redirect. Sets
 * the identity cookie and records the `identify` activity — the moment the
 * plan calls "lead L arrived from the buy-course mail", with the utm query
 * still attached to the landing path.
 *
 * Idempotent and refresh-by-design: re-exchanging an `em` re-sets the cookie
 * (90 days from now) and adds one activity row. Best-effort from the client's
 * point of view — a failure must never break the page it landed on, so the
 * frontend swallows errors; this endpoint only ever refuses forgeries.
 */
emailPublicRouter.post('/identify', (req: Request, res: Response) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  const landing = safeTarget(req.body?.landing);

  const leadId = token ? verifyIdentifyToken(token) : null;
  if (!leadId || !landing) {
    return res.status(400).json({ ok: false, error: 'Invalid or expired identity token.' });
  }

  const db = loadDb();
  const lead: EmailLead | undefined = (db.email_leads || []).find(
    (l: EmailLead) => l && l.id === leadId
  );
  if (!lead) {
    return res.status(404).json({ ok: false, error: 'Unknown lead.' });
  }

  // The stored path is sanitised with `em` stripped — the cookie, not the URL,
  // is the identity, and rows full of live tokens would be a token oracle.
  const stored = sanitizeTrackPath(landing) || landing;
  recordActivity(db, leadId, 'identify', stored, classifyPath(stored) || undefined);
  saveDb(db);
  setLeadCookie(res, leadId);
  res.json({ ok: true });
});

/**
 * POST /api/email/track { path, title? }  — sent as a sendBeacon.
 *
 * The observe half of Phase 3. Three gates, in order:
 *
 *   1. NO cookie → 204 and nothing is written. An unidentified visitor is
 *      never tracked: no fingerprinting, no third-party pixels, the plan's
 *      privacy floor.
 *   2. Non-relative or never-tracked path (auth, admin, api, assets) → 204.
 *      Classification returns null and we refuse rather than store junk.
 *   3. Otherwise → one `page_view` row with its category. This row is what
 *      Phase 4 automations consume ("viewed the course page, didn't buy").
 *
 * sendBeacon cannot handle a non-2xx meaningfully, so every refusal is 204 —
 * a beacon has no one to read an error body anyway. `title` is deliberately
 * NOT stored: paths carry the signal, titles are a free-text field waiting to
 * become someone's XSS in an admin table.
 */
emailPublicRouter.post('/track', (req: Request, res: Response) => {
  const leadId = verifyLeadCookie(req.cookies?.[LEAD_COOKIE_NAME]);
  if (!leadId) return res.status(204).end();

  const path = sanitizeTrackPath(req.body?.path);
  if (!path) return res.status(204).end();

  const category = classifyPath(path);
  if (!category) return res.status(204).end();

  const db = loadDb();
  const lead: EmailLead | undefined = (db.email_leads || []).find(
    (l: EmailLead) => l && l.id === leadId
  );
  // The cookie can outlive the row (pruned lead, merged list). Track nothing
  // rather than accumulate rows pointing at an identity that no longer exists.
  if (!lead) return res.status(204).end();

  recordActivity(db, leadId, 'page_view', path, category);
  saveDb(db);
  res.status(204).end();
});

/**
 * GET /api/email/unsubscribe?token=<signed>
 *
 * One click, no login, no confirmation interstitial — the flow regulators
 * accept is the one that works on the first press. Returns a small HTML page
 * so a recipient who opens the link directly (rather than through an email
 * client's link handler) sees an explicit outcome, not a blank 200.
 */
emailPublicRouter.get('/unsubscribe', (req: Request, res: Response) => {
  const token = String(req.query.token || '');
  const leadId = token ? verifyUnsubscribeToken(token) : null;

  const page = (title: string, body: string, ok: boolean): void => {
    res.status(ok ? 200 : 400).type('html').send(`<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#F3F4F6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#fff;border:1px solid #E5E7EB;border-radius:12px;max-width:440px;padding:32px;text-align:center}
h1{font-size:20px;color:#10151C;margin:0 0 8px}p{font-size:14px;line-height:1.6;color:#374151;margin:0}
a{color:#0284C7}</style></head>
<body><div class="card"><h1>${title}</h1><p>${body}</p></div></body></html>`);
  };

  if (!leadId) {
    return page('Link not valid', 'This unsubscribe link is malformed or was truncated. Use the Unsubscribe link at the bottom of the original email.', false);
  }

  const db = loadDb();
  const lead: EmailLead | undefined = (db.email_leads || []).find((l: EmailLead) => l && l.id === leadId);
  if (!lead) {
    return page('Address not found', 'This address is not on the list any more — there is nothing left to unsubscribe.', true);
  }

  const now = new Date().toISOString();
  if (lead.status === 'active') {
    lead.status = 'unsubscribed';
    lead.updated_at = now;
  }
  lead.last_activity_at = now;
  recordActivity(db, leadId, 'email_click', '/unsubscribe');
  saveDb(db);

  // Clear the identity cookie: an unsubscribed browser should not keep being
  // tracked as an interested lead.
  res.clearCookie(LEAD_COOKIE_NAME, { path: '/' });
  page('You are unsubscribed', `${lead.email} will not receive further emails from TieEdu. This took effect immediately.`, true);
});
