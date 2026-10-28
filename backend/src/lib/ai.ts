/**
 * Shared gate for AI features (mock interview, English coach). Every AI
 * feature is off until an admin enables it in Settings (`ai_<feature>_enabled`)
 * AND the server has ANTHROPIC_API_KEY, and each student gets a daily number of
 * AI-graded answers (`ai_<feature>_daily_limit`). Each feature also has a
 * free, offline grader that takes over whenever AI is off, over the limit, or
 * fails — so a student is never left without feedback.
 */
export const AI_MODEL = 'claude-opus-5-5';
export const AI_DAILY_LIMIT_DEFAULT = 10;

export type AiFeature = 'mock_interview' | 'english_coach';
export interface AiStatus { enabled: boolean; daily_limit: number }

export function aiStatusFor(db: any, feature: AiFeature, env: NodeJS.ProcessEnv = process.env): AiStatus {
  const s = db.settings || {};
  const limit = Number(s[`ai_${feature}_daily_limit`]);
  return {
    enabled: s[`ai_${feature}_enabled`] === true && !!env.ANTHROPIC_API_KEY,
    daily_limit: Number.isInteger(limit) && limit >= 0 ? limit : AI_DAILY_LIMIT_DEFAULT,
  };
}

/** Apply an admin's AI settings for one feature onto `next` (PUT /api/admin/settings). */
export function applyAiSettings(next: any, body: any, feature: AiFeature): void {
  const on = body?.[`ai_${feature}_enabled`];
  if (typeof on === 'boolean') next[`ai_${feature}_enabled`] = on;
  const raw = body?.[`ai_${feature}_daily_limit`];
  if (raw !== undefined) {
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 0 && n <= 100) next[`ai_${feature}_daily_limit`] = n;
  }
}
