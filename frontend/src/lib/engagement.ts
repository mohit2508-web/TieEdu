/*
 * When the app may interrupt a visitor.
 *
 * A first visit used to stack up to three interruptions — the install toast,
 * the "Join our channels" sheet and the course wizard — over a page that was
 * still loading. The rule now, for every promotional popup:
 *
 *   1. never on a visitor's first visit (they came for the page, not for us);
 *   2. at most ONE interruption per browser session, whichever asks first.
 *
 * Visits are counted once per browser session (sessionStorage marks the
 * session, localStorage keeps the count). Storage can be unavailable (private
 * mode, blocked cookies); then nothing interrupts, which is the safe default.
 */

const VISITS_KEY = 'tieedu_visit_count';
const SESSION_KEY = 'tieedu_session_counted';
const INTERRUPTED_KEY = 'tieedu_interrupted_this_session';

/** Call once on app start. Counts this session as one visit. */
export function recordVisit(): void {
  try {
    if (window.sessionStorage.getItem(SESSION_KEY)) return;
    window.sessionStorage.setItem(SESSION_KEY, '1');
    const n = Number(window.localStorage.getItem(VISITS_KEY)) || 0;
    window.localStorage.setItem(VISITS_KEY, String(n + 1));
  } catch {
    /* storage unavailable — visits stay uncounted */
  }
}

/** Visits so far, including this one. 0 if storage is unavailable. */
export function visitCount(): number {
  try {
    return Number(window.localStorage.getItem(VISITS_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * True from the second visit on. Records the visit first: child components'
 * effects run before `_app`'s, so a popup checking early must not read a count
 * that this session has not been added to yet. `recordVisit` is idempotent.
 */
export function isReturningVisitor(): boolean {
  recordVisit();
  return visitCount() >= 2;
}

/**
 * Asks for this session's single interruption. Returns true (and claims it)
 * only if nothing else has interrupted in this session; the caller shows its
 * popup only on true.
 */
export function claimInterruption(name: string): boolean {
  try {
    const taken = window.sessionStorage.getItem(INTERRUPTED_KEY);
    if (taken && taken !== name) return false;
    window.sessionStorage.setItem(INTERRUPTED_KEY, name);
    return true;
  } catch {
    return false;
  }
}

/** Whether this session's interruption is already used by someone else. */
export function interruptionTaken(name: string): boolean {
  try {
    const taken = window.sessionStorage.getItem(INTERRUPTED_KEY);
    return !!taken && taken !== name;
  } catch {
    return true;
  }
}
