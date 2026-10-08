/**
 * Email subsystem: template rendering, link signing, CSV parsing, suppression.
 *
 * The rules tested here are the ones that decide whether mail goes to the
 * right person, is attributable, and stops when it must — a policy only
 * observable by sending real mail is a policy nobody will dare change. No
 * network: dispatch paths are exercised down to the provider boundary, where
 * a missing RESEND_API_KEY is itself the asserted behaviour.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const scratch = path.join(os.tmpdir(), `tieedu-email-${process.pid}.json`);
process.env.DB_FILE = scratch;
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_LINK_SECRET;

const { renderTemplate, templatePreviewInfo } = require('../src/lib/email/render');
const { TEMPLATES, TEMPLATE_LIST } = require('../src/lib/email/templates/registry');
const { parseCsv } = require('../src/routes/emailLeads.routes');
const {
  wrapLink,
  verifyClickToken,
  safeTarget,
  unsubscribeToken,
  verifyUnsubscribeToken,
  leadCookieValue,
  verifyLeadCookie,
  identifyToken,
  verifyIdentifyToken,
  withIdentifyParam,
} = require('../src/lib/email/links');
const { classifyPath, isTrackablePath, sanitizeTrackPath } = require('../src/lib/email/tracking');
const { loadDb, saveDb } = require('../src/data/db');
const { dispatchMessage, materialiseCampaign, queueMessage, resolveSubject } = require('../src/lib/email/send');
const { stopEmailQueue } = require('../src/lib/email/queue');
const {
  runEmailAutomations,
  startEmailAutomationScheduler,
  stopEmailAutomationScheduler,
  MAX_AUTOMATION_EMAILS,
} = require('../src/lib/email/automations');

test.after(() => {
  try { fs.unlinkSync(scratch); } catch { /* ignore */ }
});

const baseProps = (over: any = {}) => ({
  name: 'Aarav Sharma',
  href: (p: string) => p,
  unsubUrl: 'https://example.test/api/email/unsubscribe?token=x',
  vars: {},
  ...over,
});

test('every registered template renders html + text with a ≤50 char subject', async () => {
  const ids = Object.keys(TEMPLATES);
  assert.deepEqual(ids.sort(), [...TEMPLATE_LIST.map((t: any) => t.id)].sort());

  for (const id of ids) {
    const rendered = await renderTemplate(id, baseProps());
    assert.ok(rendered.html.length > 500, `${id}: html too short`);
    assert.ok(rendered.text.length > 100, `${id}: text part missing`);
    assert.ok(rendered.subject.length <= 50, `${id}: subject "${rendered.subject}" is ${rendered.subject.length} chars`);
    // The shell must carry the unsubscribe link in the HTML footer.
    assert.ok(rendered.html.includes('unsubscribe'), `${id}: no unsubscribe link`);
    // Greeting must never leak an undefined name.
    assert.ok(!rendered.html.includes('undefined'), `${id}: rendered "undefined" into the body`);
  }
});

test('template subject/preview info is available for the campaign builder', () => {
  const info = templatePreviewInfo('course-buy');
  assert.ok(info && info.subject.length > 0 && info.preheader.length > 0);
  assert.equal(templatePreviewInfo('nope' as any), null);
});

test('wrapLink is verifiable and tamper-evident', () => {
  const url = wrapLink('/courses/advanced-data-structures', 'em-123');
  assert.ok(url.includes('/api/email/click?'), 'must route through the click endpoint');
  const parsed = new URL(url);
  const m = parsed.searchParams.get('m')!;
  const u = parsed.searchParams.get('u')!;
  const s = parsed.searchParams.get('s')!;
  assert.equal(m, 'em-123');
  assert.equal(u, '/courses/advanced-data-structures');
  assert.ok(verifyClickToken(m, u, s), 'valid token must verify');
  assert.ok(!verifyClickToken(m, '/company/google', s), 'swapped target must fail');
  assert.ok(!verifyClickToken('em-999', u, s), 'swapped message id must fail');
  assert.ok(!verifyClickToken(m, u, 'deadbeefdeadbeef'), 'forged signature must fail');
});

test('wrapLink without a message id returns a plain site URL (preview mode)', () => {
  const url = wrapLink('/skill-test', undefined);
  assert.ok(!url.includes('/api/email/click'), 'preview must not mint tracking links');
  assert.ok(url.endsWith('/skill-test'));
});

test('safeTarget rejects off-site and protocol-relative targets', () => {
  assert.equal(safeTarget('/company/tcs'), '/company/tcs');
  assert.equal(safeTarget('//evil.com'), null);
  assert.equal(safeTarget('https://evil.com'), null);
  assert.equal(safeTarget('javascript:alert(1)'), null);
  assert.equal(safeTarget('/x'.repeat(2000)), null);
  assert.equal(safeTarget(42), null);
});

test('unsubscribe tokens round-trip and reject forgeries', () => {
  const token = unsubscribeToken('el-abc');
  assert.equal(verifyUnsubscribeToken(token), 'el-abc');
  assert.equal(verifyUnsubscribeToken('garbage'), null);
  const other = unsubscribeToken('el-victim');
  assert.notEqual(verifyUnsubscribeToken(other), 'el-abc');
});

test('lead cookie value verifies and rejects tampering', () => {
  const cookie = leadCookieValue('el-1');
  assert.equal(verifyLeadCookie(cookie), 'el-1');
  assert.equal(verifyLeadCookie('el-1.forgedsig00000'), null);
  assert.equal(verifyLeadCookie('el-1.'), null);
  assert.equal(verifyLeadCookie(undefined), null);
});

test('CSV parser handles quotes, embedded commas, CRLF and escaped quotes', () => {
  const rows = parseCsv('email,name,college\r\n"a@b.com","Sharma, Aarav","Govt. Engg"\r\n"x@y.com","""Quoted""","IIT"\n');
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[1], ['a@b.com', 'Sharma, Aarav', 'Govt. Engg']);
  assert.deepEqual(rows[2], ['x@y.com', '"Quoted"', 'IIT']);
});

/** Seed a throwaway store with the collections dispatch depends on. */
const seedStore = () => {
  const now = new Date().toISOString();
  const db = {
    email_leads: [
      { id: 'el-active', email: 'active@x.com', status: 'active', source: 'csv:t.csv', tags: ['2nd'], year: '2', consent_at: now, created_at: now, updated_at: now },
      { id: 'el-unsub', email: 'gone@x.com', status: 'unsubscribed', source: 'csv:t.csv', tags: [], year: '2', consent_at: now, created_at: now, updated_at: now },
    ],
    email_campaigns: [],
    email_messages: [],
    email_activities: [],
    companies: [],
  };
  saveDb(db);
  return db;
};

test('dispatch skips suppressed leads before touching the provider', async () => {
  seedStore();
  const db = loadDb();
  const msg = queueMessage(db, { email: 'gone@x.com', lead_id: 'el-unsub', template_id: 'welcome' });
  saveDb(db);

  const result = await dispatchMessage(msg.id);
  assert.equal(result.status, 'skipped');
  assert.equal(result.error, 'unsubscribed');

  const after = loadDb();
  const row = after.email_messages.find((m: any) => m.id === msg.id);
  assert.equal(row.status, 'skipped');
  assert.equal(row.skip_reason, 'unsubscribed');
});

test('dispatch without RESEND_API_KEY fails loudly, never pretends to send', async () => {
  seedStore();
  const db = loadDb();
  const msg = queueMessage(db, { email: 'active@x.com', lead_id: 'el-active', template_id: 'welcome' });
  saveDb(db);

  const result = await dispatchMessage(msg.id);
  assert.equal(result.ok, false);
  assert.equal(result.status, 'failed');
  assert.match(String(result.error), /RESEND_API_KEY/);

  const after = loadDb();
  const row = after.email_messages.find((m: any) => m.id === msg.id);
  assert.equal(row.status, 'failed');
  assert.equal(row.provider_id, undefined);
});

test('dispatch is idempotent — a non-queued row is never re-sent', async () => {
  seedStore();
  const db = loadDb();
  const msg = queueMessage(db, { email: 'active@x.com', lead_id: 'el-active', template_id: 'welcome' });
  msg.status = 'sent';
  msg.sent_at = new Date().toISOString();
  saveDb(db);

  const result = await dispatchMessage(msg.id);
  assert.equal(result.status, 'sent');
});

test('campaign materialisation segments by year/status and dedupes by email', () => {
  seedStore();
  const db = loadDb();
  const now = new Date().toISOString();
  db.email_leads.push(
    { id: 'el-y3', email: 'third@x.com', status: 'active', year: '3', tags: [], source: 'x', consent_at: now, created_at: now, updated_at: now },
    { id: 'el-dupe', email: 'active@x.com', status: 'active', year: '2', tags: ['2nd'], source: 'x', consent_at: now, created_at: now, updated_at: now }
  );
  const campaign: any = {
    id: 'ec-1', name: 'Second years', kind: 'blast', template_id: 'course-buy',
    segment: { year: '2' }, status: 'draft',
    stats: { queued: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 },
    created_at: now,
  };
  db.email_campaigns.push(campaign);

  const { queued, skipped } = materialiseCampaign(db, campaign);
  // el-active (year 2), el-dupe (same email as el-active → deduped), el-unsub excluded,
  // el-y3 (year 3) excluded.
  assert.equal(queued, 1);
  assert.equal(skipped, 3);
  assert.equal(campaign.stats.queued, 1);

  // Second run must not double-queue the same address.
  const again = materialiseCampaign(db, campaign);
  assert.equal(again.queued, 0);
});

// ── Phase 3: identity exchange + page-view classification ──────────────────

test('identify tokens round-trip, expire, and reject tampering', () => {
  const token = identifyToken('el-abc');
  assert.equal(verifyIdentifyToken(token), 'el-abc');

  // Expired tokens are dead — a `?em=` pasted around months later must not
  // re-identify anyone.
  const expired = identifyToken('el-abc', -1000);
  assert.equal(verifyIdentifyToken(expired), null);

  assert.equal(verifyIdentifyToken('garbage'), null);
  assert.equal(verifyIdentifyToken(''), null);
  assert.notEqual(verifyIdentifyToken(identifyToken('el-victim')), 'el-abc');

  // Signed content: flipping the lead id invalidates the signature.
  const swapped = Buffer.from(`el-other.${Date.now() + 60000}.${'x'.repeat(16)}`).toString('base64url');
  assert.equal(verifyIdentifyToken(swapped), null);
});

test('withIdentifyParam appends em, preserves query, replaces stale tokens', () => {
  const withToken = withIdentifyParam('/courses/advanced-data-structures', 'el-abc');
  const parsed = new URL(withToken, 'http://x');
  assert.equal(parsed.pathname, '/courses/advanced-data-structures');
  const em = parsed.searchParams.get('em')!;
  assert.ok(em, 'landing URL must carry the exchange token');
  assert.equal(verifyIdentifyToken(em), 'el-abc');

  // Existing query survives.
  const withQuery = new URL(withIdentifyParam('/courses?tab=outline', 'el-abc'), 'http://x');
  assert.equal(withQuery.searchParams.get('tab'), 'outline');
  assert.equal(verifyIdentifyToken(withQuery.searchParams.get('em')!), 'el-abc');

  // A stale em inside a signed target is replaced, not shadowed.
  const replaced = new URL(withIdentifyParam('/courses?em=stale', 'el-abc'), 'http://x');
  assert.equal(verifyIdentifyToken(replaced.searchParams.get('em')!), 'el-abc');

  // Off-site targets never make it this far; the wrapper neutralises them to
  // the site root rather than passing `//evil.com` through.
  const neutralised = withIdentifyParam('//evil.com', 'el-abc');
  assert.ok(neutralised.startsWith('/') && !neutralised.startsWith('//'), 'off-site target must be neutralised');
  assert.ok(!neutralised.includes('evil'));
  const offsite = withIdentifyParam('https://evil.com/x', 'el-abc');
  assert.ok(!offsite.includes('evil.com'), 'absolute off-site target must be neutralised');
});

test('path classification maps pages to automation categories and refuses private paths', () => {
  assert.equal(classifyPath('/courses/advanced-data-structures'), 'course');
  assert.equal(classifyPath('/courses'), 'course');
  assert.equal(classifyPath('/course/x'), 'course');
  assert.equal(classifyPath('/company/tcs?tab=questions'), 'vault');
  assert.equal(classifyPath('/skill-test/web-technologies'), 'skill_test');
  assert.equal(classifyPath('/pricing'), 'other');

  // Auth/admin/machinery paths are never tracked, even with a valid cookie.
  for (const p of ['/login', '/signup', '/admin', '/admin/users', '/api/email/track', '/_next/static/x.js', '/sw.js']) {
    assert.equal(classifyPath(p), null, `${p} must never be tracked`);
    assert.equal(isTrackablePath(p), false, `${p} must never be tracked`);
  }
  // A prefix that merely starts with the letters must not be caught.
  assert.equal(isTrackablePath('/logins-page'), true);
});

test('sanitizeTrackPath normalises and strips identity tokens', () => {
  assert.equal(sanitizeTrackPath('/company/tcs?tab=q'), '/company/tcs?tab=q');
  assert.equal(sanitizeTrackPath('/courses?em=secrettoken&tab=x'), '/courses?tab=x');
  assert.equal(sanitizeTrackPath('https://evil.com/x'), null);
  assert.equal(sanitizeTrackPath('//evil.com'), null);
  assert.equal(sanitizeTrackPath('javascript:alert(1)'), null);
  assert.equal(sanitizeTrackPath(12345), null);
  assert.equal(sanitizeTrackPath('/x'.repeat(2000)), null);
});

// ── Phase 4: behaviour automation (A1–A4) + drip (A5) ─────────────────────

const hoursAgo = (h: number): string => new Date(Date.now() - h * 3600 * 1000).toISOString();
const daysAgo = (d: number): string => new Date(Date.now() - d * 86400000).toISOString();
const emptyStats = () => ({ queued: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 });

/** Store shaped for the automation guards: accounts, orders, unlocks, intents. */
const seedAutomationStore = () => {
  const now = new Date().toISOString();
  const db: any = {
    settings: { platform_name: 'TieEdu', support_email: 'support@tieedu.in', demo_mode: false },
    email_leads: [
      { id: 'el-a', email: 'a@x.com', name: 'Aarav', status: 'active', source: 'csv:t.csv', tags: ['2nd'], year: '2', consent_at: now, created_at: now, updated_at: now },
      { id: 'el-b', email: 'b@x.com', name: 'Bela', status: 'active', source: 'csv:t.csv', tags: ['2nd'], year: '2', consent_at: now, created_at: now, updated_at: now },
    ],
    email_campaigns: [],
    email_messages: [],
    email_activities: [],
    email_automation_fires: [],
    companies: [{ id: 'comp-tcs', slug: 'tcs', name: 'TCS' }],
    courses: [{ id: 'c-ads', slug: 'advanced-data-structures', title: 'Advanced Data Structures', is_free: false, price_inr: 1299 }],
    // Capital-A email: the account↔lead match must be case-insensitive.
    users: [{ id: 'u-a', email: 'A@x.com' }],
    orders: [],
    unlocks: [],
    attempts: [],
  };
  saveDb(db);
  return db;
};

test('A1: a course page view ≥48h old queues course-buy-later once, then dedupes', () => {
  seedAutomationStore();
  let db: any = loadDb();
  db.email_activities.push(
    { id: 'act-1', lead_id: 'el-a', type: 'page_view', path: '/courses/advanced-data-structures', category: 'course', ts: hoursAgo(49) },
    // Too fresh: the 48h wait is the whole point of the rule.
    { id: 'act-2', lead_id: 'el-b', type: 'page_view', path: '/courses/advanced-data-structures', category: 'course', ts: hoursAgo(1) },
  );
  saveDb(db);

  const r1 = runEmailAutomations();
  stopEmailQueue();
  assert.equal(r1.queued, 1);
  assert.equal(r1.converted, 0);

  db = loadDb();
  const msg = db.email_messages.find((m: any) => m.automation_id === 'a1:advanced-data-structures');
  assert.ok(msg, 'nudge must be queued');
  assert.equal(msg.template_id, 'course-buy-later');
  assert.equal(msg.lead_id, 'el-a');
  assert.equal(msg.status, 'queued');
  assert.equal(msg.vars.course_path, '/courses/advanced-data-structures');
  assert.equal(msg.vars.course_title, 'Advanced Data Structures');
  assert.equal(db.email_automation_fires.length, 1);
  assert.equal(db.email_automation_fires[0].rule_id, 'a1:advanced-data-structures');
  assert.equal(db.email_automation_fires[0].message_id, msg.id);

  const r2 = runEmailAutomations();
  stopEmailQueue();
  assert.equal(r2.queued, 0, 'the fire ledger must make the rule one-shot');
  assert.equal(r2.reasons.already_fired, 1);
});

test('cooldown: a second rule for the same lead waits while the first is queued', () => {
  seedAutomationStore();
  const db: any = loadDb();
  db.email_activities.push(
    { id: 'act-vault', lead_id: 'el-a', type: 'page_view', path: '/company/tcs', category: 'vault', ts: hoursAgo(50) },
    { id: 'act-course', lead_id: 'el-a', type: 'page_view', path: '/courses/advanced-data-structures', category: 'course', ts: hoursAgo(49) },
  );
  saveDb(db);

  // Oldest intent first: the vault fires, the course view hits the cooldown.
  const r = runEmailAutomations();
  stopEmailQueue();
  assert.equal(r.queued, 1);
  assert.equal(r.reasons.cooldown_queued, 1);

  const queued = loadDb().email_messages.filter((m: any) => m.status === 'queued');
  assert.equal(queued.length, 1);
  assert.equal(queued[0].automation_id, 'a2');
  assert.equal(queued[0].vars.vault_company, 'TCS');
});

test('buy ends the sequence: a paid order converts the lead and blocks every rule', () => {
  seedAutomationStore();
  const db: any = loadDb();
  db.email_activities.push({ id: 'act-1', lead_id: 'el-a', type: 'page_view', path: '/company/tcs', category: 'vault', ts: hoursAgo(60) });
  db.orders.push({ id: 'order_1', status: 'paid', user_id: 'u-a', items: [] });
  saveDb(db);

  const r = runEmailAutomations();
  stopEmailQueue();
  assert.equal(r.converted, 1, 'account match (case-insensitive) must retire the lead');
  assert.equal(r.queued, 0);

  const after: any = loadDb();
  assert.equal(after.email_leads.find((l: any) => l.id === 'el-a').status, 'converted');
  assert.equal(after.email_messages.length, 0);
});

test('lifetime cap: six automation emails, then the rules go quiet', () => {
  seedAutomationStore();
  const db: any = loadDb();
  for (let i = 0; i < MAX_AUTOMATION_EMAILS; i++) {
    db.email_automation_fires.push({ id: `af-${i}`, rule_id: `a1:old-${i}`, lead_id: 'el-a', message_id: `m-${i}`, ts: daysAgo(20) });
  }
  db.email_activities.push({ id: 'act-1', lead_id: 'el-a', type: 'page_view', path: '/company/tcs', category: 'vault', ts: hoursAgo(60) });
  saveDb(db);

  const r = runEmailAutomations();
  stopEmailQueue();
  assert.equal(r.queued, 0);
  assert.equal(r.reasons.cap_reached, 1);
});

test('template truce: behaviour mail waits while a blast with the same template is sending', () => {
  seedAutomationStore();
  const db: any = loadDb();
  db.email_campaigns.push({
    id: 'ec-vault-blast', name: 'Vault blast', kind: 'blast', template_id: 'vault',
    segment: {}, status: 'sending', stats: emptyStats(), created_at: daysAgo(1),
  });
  db.email_activities.push({ id: 'act-1', lead_id: 'el-a', type: 'page_view', path: '/company/tcs', category: 'vault', ts: hoursAgo(60) });
  saveDb(db);

  const r = runEmailAutomations();
  stopEmailQueue();
  assert.equal(r.queued, 0);
  assert.equal(r.reasons.template_busy, 1);

  // Blast finishes → the nudge is allowed next pass.
  const db2: any = loadDb();
  db2.email_campaigns[0].status = 'sent';
  saveDb(db2);
  const r2 = runEmailAutomations();
  stopEmailQueue();
  assert.equal(r2.queued, 1);
});

test('a non-active lead never re-enters automation', () => {
  seedAutomationStore();
  const db: any = loadDb();
  const now = new Date().toISOString();
  db.email_leads.push({ id: 'el-u', email: 'u@x.com', status: 'unsubscribed', source: 'csv:t.csv', tags: [], year: '2', consent_at: now, created_at: now, updated_at: now });
  db.email_activities.push({ id: 'act-u', lead_id: 'el-u', type: 'page_view', path: '/company/tcs', category: 'vault', ts: hoursAgo(60) });
  saveDb(db);

  const r = runEmailAutomations();
  stopEmailQueue();
  assert.equal(r.queued, 0);
  assert.equal(r.reasons.unsubscribed, 1);
});

test('A4: a non-lander gets the same template re-subjected after 5 days', () => {
  seedAutomationStore();
  const db: any = loadDb();
  db.email_campaigns.push({
    id: 'ec-promo', name: 'Promo', kind: 'blast', template_id: 'welcome',
    segment: {}, status: 'sent', stats: emptyStats(), created_at: daysAgo(9),
  });
  db.email_messages.push(
    { id: 'em-noland', campaign_id: 'ec-promo', lead_id: 'el-a', email: 'a@x.com', template_id: 'welcome', subject: 'Your 2nd-year toolkit', status: 'clicked', clicked_at: daysAgo(6), sent_at: daysAgo(9) },
    { id: 'em-landed', campaign_id: 'ec-promo', lead_id: 'el-b', email: 'b@x.com', template_id: 'welcome', subject: 'Your 2nd-year toolkit', status: 'clicked', clicked_at: daysAgo(6), sent_at: daysAgo(9) },
  );
  // el-b clicked AND landed → the nudge would be spam to them.
  db.email_activities.push({ id: 'act-land-b', lead_id: 'el-b', type: 'page_view', path: '/pricing', category: 'other', ts: daysAgo(5) });
  saveDb(db);

  const r = runEmailAutomations();
  stopEmailQueue();
  assert.equal(r.queued, 1);
  assert.equal(r.reasons.visited_after_click, 1);

  const after: any = loadDb();
  const msg = after.email_messages.find((m: any) => m.automation_id === 'a4:ec-promo');
  assert.ok(msg, 're-subject message must be queued');
  assert.equal(msg.lead_id, 'el-a');
  assert.equal(msg.template_id, 'welcome', 'A4 re-sends the SAME template');
  assert.equal(msg.subject, 'The toolkit link you saved', 'subject override differs from the original');
});

test('A5: drip materialises elapsed steps once per lead, never twice', () => {
  seedAutomationStore();
  const db: any = loadDb();
  db.email_campaigns.push({
    id: 'ec-drip', name: '10-day', kind: 'drip', template_id: 'welcome',
    segment: { year: '2' }, status: 'sending',
    drip_steps: [
      { day: 0, template_id: 'welcome' },
      { day: 2, template_id: 'course-buy' },
      { day: 4, template_id: 'proof' },
      { day: 6, template_id: 'vault' },
      { day: 8, template_id: 'skill-test' },
      { day: 10, template_id: 'offer' },
    ],
    stats: emptyStats(),
    created_at: daysAgo(3), // day 0 and day 2 elapsed; day 4 not yet
  });
  saveDb(db);

  const r1 = runEmailAutomations();
  stopEmailQueue();
  assert.equal(r1.drip_queued, 4, '2 elapsed steps × 2 segment leads');

  const db2: any = loadDb();
  const msgs = db2.email_messages.filter((m: any) => m.campaign_id === 'ec-drip');
  assert.equal(msgs.length, 4);
  assert.deepEqual(
    msgs.map((m: any) => m.automation_id).sort(),
    ['a5:ec-drip:0', 'a5:ec-drip:0', 'a5:ec-drip:2', 'a5:ec-drip:2']
  );
  assert.equal(db2.email_automation_fires.length, 4, 'every drip email is guarded by a fire row');
  assert.equal(db2.email_campaigns[0].status, 'sending', 'day 10 has not come due');

  const r2 = runEmailAutomations();
  stopEmailQueue();
  assert.equal(r2.drip_queued, 0, 'second pass must not re-materialise anything');
});

test('A5: drip flips to sent once every step elapsed and the queue drained', () => {
  seedAutomationStore();
  const db: any = loadDb();
  db.email_campaigns.push({
    id: 'ec-drip2', name: 'Finished drip', kind: 'drip', template_id: 'welcome',
    segment: {}, status: 'sending',
    drip_steps: [{ day: 0, template_id: 'welcome' }, { day: 2, template_id: 'course-buy' }],
    stats: emptyStats(),
    created_at: daysAgo(11),
  });
  saveDb(db);

  const r1 = runEmailAutomations();
  stopEmailQueue();
  assert.equal(r1.drip_queued, 4, '2 leads × 2 fully elapsed steps');

  // Simulate the paced queue draining every row.
  const drained: any = loadDb();
  for (const m of drained.email_messages) m.status = 'sent';
  saveDb(drained);

  const r2 = runEmailAutomations();
  stopEmailQueue();
  assert.deepEqual(r2.drip_completed, ['ec-drip2']);
  assert.equal((loadDb().email_campaigns as any[])[0].status, 'sent');
});

test('resolveSubject: a queued override wins, an empty one falls back to the render', () => {
  assert.equal(resolveSubject('The toolkit link you saved', 'Your 2nd-year toolkit'), 'The toolkit link you saved');
  assert.equal(resolveSubject('', 'Your 2nd-year toolkit'), 'Your 2nd-year toolkit');
  assert.equal(resolveSubject(undefined, 'Your 2nd-year toolkit'), 'Your 2nd-year toolkit');
  assert.equal(resolveSubject('   ', 'Your 2nd-year toolkit'), 'Your 2nd-year toolkit');
});

test('queueMessage persists the subject override, frozen vars and automation id', () => {
  seedStore();
  const db: any = loadDb();
  const m = queueMessage(db, {
    email: 'active@x.com', lead_id: 'el-active', template_id: 'welcome',
    subject: 'Alt subject', automation_id: 'a1:ads', vars: { course_path: '/courses/advanced-data-structures' },
  });
  saveDb(db);

  const row = loadDb().email_messages.find((x: any) => x.id === m.id);
  assert.equal(row.subject, 'Alt subject');
  assert.equal(row.automation_id, 'a1:ads');
  assert.deepEqual(row.vars, { course_path: '/courses/advanced-data-structures' });
});

test('automation scheduler arms idempotently and stops cleanly', () => {
  startEmailAutomationScheduler();
  startEmailAutomationScheduler(); // second arm is a no-op
  stopEmailAutomationScheduler();
  stopEmailAutomationScheduler(); // stop twice is safe
});
