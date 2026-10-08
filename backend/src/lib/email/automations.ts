/**
 * Behaviour-triggered automation — plan Phase 4, rules A1–A5.
 *
 *   A1  viewed a course page >=48h ago, never bought  -> `course-buy-later`
 *   A2  viewed a company vault >=48h ago, no unlock    -> `vault`
 *   A3  viewed the skill test >=48h ago, no attempt    -> `skill-test`
 *   A4  clicked a campaign >=5d ago but never landed   -> same template,
 *       (no page view after the click)                re-subject
 *   A5  the 10-day sales drip: welcome -> course-buy -> proof -> vault ->
 *       skill-test -> offer (day 0/2/4/6/8/10)
 *
 * Dedupe ledger: `email_automation_fires`, unique on (rule_id, lead_id). A
 * fire row and the message it produced are written in the SAME save — losing
 * either would mean a re-send, and the pair is the only thing standing
 * between a restart and a duplicate email.
 *
 * Hard guards live in ONE place, `eligible()`, applied to every rule:
 *
 *   - lead must be `active` (unsubscribed/bounced/complained never re-enter);
 *   - any paid order by the lead's account flips the lead to `converted`
 *     and retires it from every sequence — plan: "buy -> sequence ends";
 *   - cooldown: no send while another message is queued for the lead, or
 *     within 4 days of the last one;
 *   - lifetime cap: 6 automation emails (A1–A4; the drip has its own cadence
 *     and is excluded, as are its day steps from the cap);
 *   - template truce: while a campaign using the same template is still
 *     sending/scheduled/paused, behaviour mail waits — a nudge that lands on
 *     top of the blast it came from reads as spam.
 *
 * The pass is deliberately SYNCHRONOUS (load -> mutate -> save in one turn of
 * the event loop): the queue's dispatch saves fresh snapshots between its
 * awaits, and a fully synchronous pass cannot interleave with them, so neither
 * writer can drop the other's rows.
 */
import {
  loadDb, saveDb,
  EmailLead, EmailMessage, EmailCampaign, EmailActivity,
  EmailAutomationFire, EmailTemplateId,
} from '../../data/db';
import { queueMessage } from './send';
import { queueStatus, startEmailQueue } from './queue';

/** A1–A3: the page view must be at least this old ("left, then nudged"). */
export const TRIGGER_DELAY_MS = 48 * 60 * 60 * 1000;
/** A4: clicked at least 5 days ago with no landing after the click. */
export const A4_DELAY_MS = 5 * 24 * 60 * 60 * 1000;
/** ...but not older than this: a months-old view is a reengage, not a nudge. */
export const ACTIVITY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
/** Minimum gap between any two automation emails to one lead. */
export const COOLDOWN_MS = 4 * 24 * 60 * 60 * 1000;
/** Lifetime automation cap per lead (A1–A4 only). */
export const MAX_AUTOMATION_EMAILS = 6;
/** Rule emails queued per pass — bounded work, oldest intent first. */
export const MAX_PER_PASS = 10;
/** One drip day in ms. */
export const DRIP_DAY_MS = 24 * 60 * 60 * 1000;
/** Drip warm-up: at most this many step-emails materialise per calendar day. */
export const DRIP_DAILY_LIMIT = 100;

const TICK_MS = 60 * 60 * 1000; // hourly

/**
 * A4 re-subject map — same body, different subject (plan section 4). Each is
 * the "you saved this link" angle, per template, all <= 50 chars.
 */
const A4_ALT_SUBJECT: Record<EmailTemplateId, string> = {
  welcome: 'The toolkit link you saved',
  'course-buy': 'The course link you saved',
  'course-buy-later': 'The DSA link you saved',
  vault: 'The vault link you saved',
  'skill-test': 'The skill test link you saved',
  proof: 'The course breakdown you saved',
  offer: 'Your coupon code, one more time',
  reengage: 'The course link you saved',
};

export interface AutomationPassResult {
  /** Rule emails queued (A1–A4). */
  queued: number;
  /** Drip step emails queued (A5). */
  drip_queued: number;
  /** Leads retired this pass because a paid order was found. */
  converted: number;
  skipped: number;
  reasons: Record<string, number>;
  /** Drip campaigns whose last step elapsed and drained -> status 'sent'. */
  drip_completed: string[];
}

const emptyResult = (): AutomationPassResult => ({
  queued: 0, drip_queued: 0, converted: 0, skipped: 0, reasons: {}, drip_completed: [],
});

const newFireId = (): string =>
  `af-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const pathSegments = (raw?: string): string[] =>
  (raw || '').split('?')[0].split('#')[0].split('/').filter(Boolean);

const cleanPath = (raw?: string): string => {
  const clean = (raw || '').split('?')[0].split('#')[0];
  return clean.startsWith('/') ? clean : `/${clean}`;
};

/** Derive a readable title from the path the lead actually visited. */
const titleFromSlug = (slug: string): string =>
  slug.split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

interface Candidate {
  rule_id: string;
  lead: EmailLead;
  template_id: EmailTemplateId;
  /** A4 override; empty for A1–A3 (template default wins at render). */
  subject?: string;
  vars?: Record<string, string>;
  campaign_id?: string;
  /** Age of the triggering event — older intent goes first. */
  age: number;
}

/**
 * Shared hard guards. The options let the drip skip the rules' cooldown and
 * lifetime checks: its cadence IS the plan's schedule, and its template is
 * its own campaign (a truce against itself would deadlock the drip forever).
 */
function eligible(
  ctx: {
    lead: EmailLead;
    rule_id: string;
    fired: Set<string>;
    queuedLeadIds: Set<string>;
    lifetimeCount: number;
    lastSentAt: number | null;
    now: number;
  },
  opts: { cooldown: boolean; lifetime: boolean }
): string | null {
  if (ctx.lead.status !== 'active') return ctx.lead.status; // unsub/bounced/converted
  const key = `${ctx.rule_id} ${ctx.lead.id}`;
  if (ctx.fired.has(key)) return 'already_fired';
  if (opts.cooldown) {
    if (ctx.queuedLeadIds.has(ctx.lead.id)) return 'cooldown_queued';
    if (ctx.lastSentAt !== null && ctx.now - ctx.lastSentAt < COOLDOWN_MS) return 'cooldown_recent';
  }
  if (opts.lifetime && ctx.lifetimeCount >= MAX_AUTOMATION_EMAILS) return 'cap_reached';
  return null;
}

function templateBusy(campaigns: EmailCampaign[], templateId: EmailTemplateId): boolean {
  return campaigns.some((c) => c && (
    c.template_id === templateId ||
    (c.kind === 'drip' && (c.drip_steps || []).some((s) => s.template_id === templateId))
  ) && (c.status === 'sending' || c.status === 'scheduled' || c.status === 'paused'));
}

function segmentLeads(db: any, campaign: EmailCampaign): EmailLead[] {
  const statuses: readonly string[] = campaign.segment?.statuses?.length
    ? campaign.segment.statuses
    : ['active'];
  const tags = campaign.segment?.tags || [];
  const year = campaign.segment?.year;
  return (db.email_leads || []).filter((l: EmailLead) =>
    l && typeof l.email === 'string' &&
    statuses.includes(l.status) &&
    (!year || String(l.year || '') === String(year)) &&
    (!tags.length || tags.every((t: string) => (l.tags || []).includes(t)))
  );
}

/**
 * One automation pass. Synchronous by contract (see the header) — no await
 * anywhere between loadDb and saveDb, so the pass and the send queue's
 * dispatch saves can never interleave and drop each other's writes.
 */
export function runEmailAutomations(now: number = Date.now()): AutomationPassResult {
  const db = loadDb();
  const result = emptyResult();
  const bump = (reason: string): void => {
    result.skipped++;
    result.reasons[reason] = (result.reasons[reason] || 0) + 1;
  };

  const leads = new Map<string, EmailLead>(
    ((db.email_leads || []) as EmailLead[]).filter((l) => l && l.id).map((l) => [l.id, l])
  );
  const messages: EmailMessage[] = (db.email_messages || []) as EmailMessage[];
  const campaigns: EmailCampaign[] = (db.email_campaigns || []) as EmailCampaign[];
  const fires: EmailAutomationFire[] =
    (db.email_automation_fires as EmailAutomationFire[]) || (db.email_automation_fires = []);
  const fired = new Set(fires.map((f) => `${f.rule_id} ${f.lead_id}`));

  // Leads with anything in flight, and each lead's last actual send — the
  // cooldown inputs. Grows as this pass queues, so two rules cannot both slip
  // through the cooldown in one pass.
  const queuedLeadIds = new Set<string>(
    messages.filter((m) => m.status === 'queued' && m.lead_id).map((m) => m.lead_id)
  );
  const lastSentByLead = new Map<string, number>();
  for (const m of messages) {
    if (!m.lead_id || !m.sent_at) continue;
    const t = Date.parse(m.sent_at);
    if (Number.isFinite(t) && (lastSentByLead.get(m.lead_id) ?? 0) < t) lastSentByLead.set(m.lead_id, t);
  }
  const lifetime = new Map<string, number>();
  for (const f of fires) {
    if (f.rule_id.startsWith('a5:')) continue;
    lifetime.set(f.lead_id, (lifetime.get(f.lead_id) || 0) + 1);
  }

  // ── Conversion pre-pass ────────────────────────────────────────────────
  // "buy -> sequence ends": any paid order by the account behind this address
  // retires the lead from every rule AND the drip, here, before anything else
  // is evaluated.
  const usersByEmail = new Map<string, any>(
    ((db.users || []) as any[]).filter((u) => u && u.email).map((u) => [String(u.email).toLowerCase(), u])
  );
  const paidUserIds = new Set<string>(
    ((db.orders || []) as any[]).filter((o) => o && o.status === 'paid' && o.user_id).map((o) => String(o.user_id))
  );
  for (const lead of leads.values()) {
    if (lead.status !== 'active') continue;
    const user = usersByEmail.get(String(lead.email).toLowerCase());
    if (user && paidUserIds.has(String(user.id))) {
      lead.status = 'converted';
      result.converted++;
    }
  }

  const guardCtx = (lead: EmailLead, ruleId: string) => ({
    lead,
    rule_id: ruleId,
    fired,
    queuedLeadIds,
    lifetimeCount: lifetime.get(lead.id) || 0,
    lastSentAt: lastSentByLead.get(lead.id) ?? null,
    now,
  });

  // ── A1–A3: page views older than 48h ──────────────────────────────────
  const candidates: Candidate[] = [];
  const activities: EmailActivity[] = ((db.email_activities || []) as EmailActivity[])
    .filter((a) => a && a.type === 'page_view');

  const companyBySlug = new Map<string, any>(
    ((db.companies || []) as any[]).filter((c) => c && c.slug).map((c) => [String(c.slug).toLowerCase(), c])
  );
  const courseBySlug = new Map<string, any>(
    ((db.courses || []) as any[]).filter((c) => c && c.slug).map((c) => [String(c.slug).toLowerCase(), c])
  );
  const hasUnlock = (lead: EmailLead, companyId: string): boolean => {
    const user = usersByEmail.get(String(lead.email).toLowerCase());
    if (!user) return false;
    return ((db.unlocks || []) as any[]).some(
      (u) => u && u.user_id === user.id && u.company_id === companyId && u.status === 'active'
    );
  };
  const hasAttempt = (lead: EmailLead): boolean => {
    const user = usersByEmail.get(String(lead.email).toLowerCase());
    if (!user) return false;
    return ((db.attempts || []) as any[]).some((a) => a && a.userId === user.id);
  };

  for (const act of activities) {
    const lead = leads.get(act.lead_id);
    if (!lead) continue;
    const ts = Date.parse(act.ts);
    if (!Number.isFinite(ts)) continue;
    const age = now - ts;
    if (age < TRIGGER_DELAY_MS || age > ACTIVITY_WINDOW_MS) continue;

    const segs = pathSegments(act.path);
    if (act.category === 'course') {
      const slug = segs[0] === 'courses' || segs[0] === 'course' ? segs[1] : undefined;
      if (!slug) continue;
      const course = courseBySlug.get(slug.toLowerCase());
      if (course && course.is_free) continue; // nothing to nudge — it costs nothing
      candidates.push({
        rule_id: `a1:${slug}`,
        lead,
        template_id: 'course-buy-later',
        vars: {
          course_path: cleanPath(act.path),
          course_title: course?.title || titleFromSlug(slug),
        },
        age,
      });
    } else if (act.category === 'vault') {
      const slug = segs[0] === 'company' ? segs[1] : undefined;
      if (!slug) continue;
      const company = companyBySlug.get(slug.toLowerCase());
      if (!company) continue; // company row gone — never mail an invented name
      if (hasUnlock(lead, company.id)) { bump('has_unlock'); continue; }
      candidates.push({
        rule_id: 'a2',
        lead,
        template_id: 'vault',
        vars: { vault_company: String(company.name), vault_path: cleanPath(act.path) },
        age,
      });
    } else if (act.category === 'skill_test') {
      if (hasAttempt(lead)) { bump('has_attempt'); continue; }
      candidates.push({
        rule_id: 'a3',
        lead,
        template_id: 'skill-test',
        vars: { skill_path: cleanPath(act.path) },
        age,
      });
    }
  }

  // ── A4: clicked >=5d ago, never landed after the click ────────────────
  for (const m of messages) {
    if (m.status !== 'clicked' || !m.clicked_at || !m.lead_id || !m.campaign_id) continue;
    const lead = leads.get(m.lead_id);
    if (!lead) continue;
    const clickedAt = Date.parse(m.clicked_at);
    const age = now - clickedAt;
    if (!Number.isFinite(age) || age < A4_DELAY_MS || age > ACTIVITY_WINDOW_MS) continue;
    const landedAfter = activities.some((a) =>
      a.lead_id === m.lead_id && a.type === 'page_view' &&
      Number.isFinite(Date.parse(a.ts)) && Date.parse(a.ts) > clickedAt
    );
    if (landedAfter) { bump('visited_after_click'); continue; }
    const alt = A4_ALT_SUBJECT[m.template_id];
    if (!alt) continue;
    candidates.push({
      rule_id: `a4:${m.campaign_id}`,
      lead,
      template_id: m.template_id,
      subject: alt,
      campaign_id: m.campaign_id,
      age,
    });
  }

  // Oldest intent first; the pass cap bounds the work.
  candidates.sort((a, b) => b.age - a.age);
  const busySeen = new Set<EmailTemplateId>();
  for (const c of candidates) {
    if (result.queued >= MAX_PER_PASS) { bump('pass_cap'); continue; }
    const reason = eligible(guardCtx(c.lead, c.rule_id), { cooldown: true, lifetime: true });
    if (reason) { bump(reason); continue; }
    if (!busySeen.has(c.template_id) && templateBusy(campaigns, c.template_id)) {
      busySeen.add(c.template_id);
    }
    if (busySeen.has(c.template_id)) { bump('template_busy'); continue; }

    const message = queueMessage(db, {
      email: c.lead.email,
      lead_id: c.lead.id,
      template_id: c.template_id,
      campaign_id: c.campaign_id,
      automation_id: c.rule_id,
      subject: c.subject,
      vars: c.vars,
    });
    fires.push({
      id: newFireId(), rule_id: c.rule_id, lead_id: c.lead.id,
      message_id: message.id, ts: new Date(now).toISOString(),
    });
    fired.add(`${c.rule_id} ${c.lead.id}`);
    queuedLeadIds.add(c.lead.id);
    lastSentByLead.set(c.lead.id, now); // this pass's own queue counts as in-flight
    lifetime.set(c.lead.id, (lifetime.get(c.lead.id) || 0) + 1);
    result.queued++;
  }

  // ── A5: drip steps ────────────────────────────────────────────────────
  const today = new Date(now).toDateString();
  let dripBudget = DRIP_DAILY_LIMIT - fires.filter(
    (f) => f.rule_id.startsWith('a5:') &&
      new Date(Date.parse(f.ts)).toDateString() === today
  ).length;

  for (const campaign of campaigns) {
    if (!campaign || campaign.kind !== 'drip' || campaign.status !== 'sending') continue;
    const steps = (campaign.drip_steps || []).slice().sort((a, b) => a.day - b.day);
    if (!steps.length) continue;
    const startedAt = Date.parse(campaign.created_at);
    if (!Number.isFinite(startedAt)) continue;

    const stepLeadKeys = new Set<string>(
      messages
        .filter((m) => m.campaign_id === campaign.id && m.lead_id && m.template_id)
        .map((m) => `${m.lead_id} ${m.template_id}`)
    );

    for (const step of steps) {
      if (now < startedAt + step.day * DRIP_DAY_MS) continue; // not due yet
      const ruleId = `a5:${campaign.id}:${step.day}`;
      for (const lead of segmentLeads(db, campaign)) {
        if (dripBudget <= 0) { bump('drip_daily_cap'); break; }
        const reason = eligible(guardCtx(lead, ruleId), { cooldown: false, lifetime: false });
        if (reason) { bump(reason); continue; }
        if (stepLeadKeys.has(`${lead.id} ${step.template_id}`)) { bump('step_already_queued'); continue; }

        const message = queueMessage(db, {
          email: lead.email,
          lead_id: lead.id,
          template_id: step.template_id,
          campaign_id: campaign.id,
          automation_id: ruleId,
        });
        fires.push({
          id: newFireId(), rule_id: ruleId, lead_id: lead.id,
          message_id: message.id, ts: new Date(now).toISOString(),
        });
        fired.add(`${ruleId} ${lead.id}`);
        queuedLeadIds.add(lead.id);
        stepLeadKeys.add(`${lead.id} ${step.template_id}`);
        dripBudget--;
        result.drip_queued++;
      }
    }

    // Every step has elapsed and the last message has drained -> the campaign
    // is done. (Paused campaigns re-enter this loop on resume instead.)
    const allElapsed = steps.every((s) => now >= startedAt + s.day * DRIP_DAY_MS);
    const pending = messages.some((m) => m.campaign_id === campaign.id && m.status === 'queued');
    if (allElapsed && !pending && campaign.status === 'sending') {
      campaign.status = 'sent';
      result.drip_completed.push(campaign.id);
    }
  }

  const dirty = result.queued > 0 || result.drip_queued > 0 ||
    result.converted > 0 || result.drip_completed.length > 0;
  if (dirty) {
    saveDb(db);
    if (result.queued + result.drip_queued > 0) startEmailQueue();
  }
  return result;
}

/* ── Scheduler ─────────────────────────────────────────────────────────── */

let schedulerTimer: NodeJS.Timeout | null = null;
let passRunning = false;

/**
 * Hourly pass, armed from emailCampaigns.routes.ts module load (the same
 * place the send queue arms — see the note there for why not server.ts).
 * Skips while the queue has a backlog: automation mail and blast mail share
 * one pacing budget, and a backlog was pressed by a human.
 * Idempotent and unref'd — importing this module in a test starts nothing.
 */
export function startEmailAutomationScheduler(): void {
  if (schedulerTimer) return;
  const tick = (): void => {
    if (passRunning) return;
    try {
      const qs = queueStatus();
      if (qs.active || qs.queued > 0) return;
      passRunning = true;
      const r = runEmailAutomations();
      if (r.queued || r.drip_queued || r.converted || r.drip_completed.length) {
        console.log(
          `[email/automations] rules=${r.queued} drip=${r.drip_queued} ` +
          `converted=${r.converted} skipped=${r.skipped} done=${r.drip_completed.join(',') || '-'}`
        );
      }
    } catch (err: any) {
      console.error('[email/automations] pass failed:', String(err?.message || err));
    } finally {
      passRunning = false;
    }
  };
  schedulerTimer = setInterval(tick, TICK_MS);
  schedulerTimer.unref?.();
  const warmup = setTimeout(tick, 90_000);
  warmup.unref?.();
}

export function stopEmailAutomationScheduler(): void {
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = null;
}

