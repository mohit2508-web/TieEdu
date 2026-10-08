/**
 * In-process send queue.
 *
 * Deliberately not Redis/Redis-like: the whole list is under 1,000 addresses
 * and paced at ~1/second for deliverability, so a batch is minutes of work in
 * one process. Durability comes from the EmailMessage rows themselves — the
 * loop only ever claims `queued` rows, so a restart mid-batch resumes rather
 * than loses sends, and no in-memory state is load-bearing.
 *
 * Pacing exists for the recipient, not the machine: a cold sending domain that
 * dumps 1,000 messages in a burst trains spam filters to distrust it. The delay
 * is env-tunable (EMAIL_SEND_DELAY_MS) — tests set it to 0.
 */
import { loadDb, EmailMessage, EmailCampaign } from '../../data/db';
import { dispatchMessage } from './send';

const DEFAULT_DELAY_MS = 1000;
const TICK_MS = 2000;
const MAX_ERRORS_BEFORE_PAUSE = 10;

let running = false;
let paused = false;
let timer: NodeJS.Timeout | null = null;
let consecutiveErrors = 0;
let sentThisRun = 0;
let lastError: string | null = null;

const delayMs = (): number => {
  const raw = (process.env.EMAIL_SEND_DELAY_MS || '').trim();
  if (!raw) return DEFAULT_DELAY_MS; // unset (or an empty env line) means paced
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_DELAY_MS;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface QueueStatus {
  active: boolean;
  paused: boolean;
  queued: number;
  sent_this_run: number;
  consecutive_errors: number;
  last_error: string | null;
  delay_ms: number;
}

export function queueStatus(): QueueStatus {
  const db = loadDb();
  const queued = (db.email_messages || []).filter((m: EmailMessage) => m.status === 'queued').length;
  return {
    active: running,
    paused,
    queued,
    sent_this_run: sentThisRun,
    consecutive_errors: consecutiveErrors,
    last_error: lastError,
    delay_ms: delayMs(),
  };
}

export function pauseQueue(): void {
  paused = true;
}

export function resumeQueue(): void {
  paused = false;
  consecutiveErrors = 0;
  lastError = null;
}

/**
 * One pass: claim the oldest queued message and dispatch it.
 *
 * Campaign pause is checked at claim time, not enqueue time — pausing a
 * campaign must stop messages that were queued before the pause was pressed.
 * A paused campaign's rows simply stay `queued` and are picked up on resume.
 */
async function processOne(): Promise<boolean> {
  if (paused) return false;

  const db = loadDb();
  const queued: EmailMessage | undefined = (db.email_messages || []).find(
    (m: EmailMessage) => m.status === 'queued'
  );
  if (!queued) return false;

  if (queued.campaign_id) {
    const campaign: EmailCampaign | undefined = (db.email_campaigns || []).find(
      (c: EmailCampaign) => c.id === queued.campaign_id
    );
    if (campaign && (campaign.status === 'paused' || campaign.status === 'draft')) return false;
  }

  try {
    const result = await dispatchMessage(queued.id, queued.vars || {});
    if (result.ok) {
      consecutiveErrors = 0;
      sentThisRun++;
    } else {
      consecutiveErrors++;
      lastError = result.error || 'dispatch failed';
    }
  } catch (err: any) {
    // dispatchMessage handles its own failures; reaching here means the guard
    // itself broke. Count it — a permanently throwing loop must stop, not spin.
    consecutiveErrors++;
    lastError = String(err?.message || err);
  }

  if (consecutiveErrors >= MAX_ERRORS_BEFORE_PAUSE) {
    paused = true;
    lastError = `${consecutiveErrors} consecutive failures — queue paused. Fix and resume. (${lastError})`;
  }

  const d = delayMs();
  if (d > 0) await sleep(d);
  return true;
}

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    // Drain in bursts; the outer timer keeps the loop cheap when idle.
    let worked = true;
    while (worked && !paused) {
      worked = await processOne();
    }
  } finally {
    running = false;
  }
}

/**
 * Idempotent start, mirroring startReminderScheduler: safe to call from route
 * module load and from server boot; unrefs its timer so importing this module
 * in a test does not hold the process open.
 */
export function startEmailQueue(): void {
  if (timer) return;
  timer = setInterval(() => {
    void tick();
  }, TICK_MS);
  timer.unref?.();
}

export function stopEmailQueue(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Test hook: run one full drain synchronously. */
export async function __drainQueueForTests(): Promise<void> {
  let worked = true;
  while (worked && !paused) {
    worked = await processOne();
  }
}

export function __resetQueueForTests(): void {
  stopEmailQueue();
  running = false;
  paused = false;
  consecutiveErrors = 0;
  sentThisRun = 0;
  lastError = null;
}
