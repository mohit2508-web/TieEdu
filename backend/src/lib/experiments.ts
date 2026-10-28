/**
 * A/B experiments (F5). Small on purpose: experiments are defined in code
 * (below), an admin starts and stops them, visitors are split on the client by
 * a stable anonymous id, and the server counts unique visitors per variant.
 *
 * - Assignment: hash(visitor id + experiment id) → variant. The same visitor
 *   always sees the same variant, signed in or not; nothing is stored about
 *   who saw what beyond a one-way hash of the visitor id.
 * - Counting: an "exposure" when the variant is shown, a "conversion" when the
 *   success action happens. Each is counted once per visitor, so refreshing
 *   or clicking twice changes nothing, and a conversion only counts for a
 *   visitor who was exposed.
 * - Reading: conversion rate per variant and a two-proportion z-test. No
 *   winner is named below MIN_EXPOSURES per variant or above p = 0.05.
 * - Off until an admin starts it (settings.experiments[id].status).
 */
import crypto from 'crypto';

export interface ExperimentDef { id: string; title: string; success: string; variants: Array<{ id: string; label: string }> }

export const EXPERIMENTS: ExperimentDef[] = [
  {
    id: 'cp_main_cta',
    title: 'Company page main button wording',
    success: 'Starts the free readiness check',
    variants: [
      { id: 'a', label: 'Current wording (“Start free readiness check”, or the page’s own button text)' },
      { id: 'b', label: '“See where you stand in 2 minutes”' },
    ],
  },
];

export const MIN_EXPOSURES = 200;
export const MAX_SEEN = 400_000;
export type ExpStatus = 'off' | 'running' | 'stopped';
export type ExpEvent = 'exposure' | 'conversion';

const defOf = (id: string) => EXPERIMENTS.find((e) => e.id === id);
const settingsOf = (db: any): Record<string, { status: ExpStatus; started_at?: string; stopped_at?: string }> => ((db.settings ??= {}).experiments ??= {});
export const statusOf = (db: any, id: string): ExpStatus => settingsOf(db)[id]?.status || 'off';
const store = (db: any): { counts: Record<string, Record<string, { exposure: number; conversion: number }>>; seen: Record<string, 1> } =>
  (db.experiment_data ??= { counts: {}, seen: {} });
const visitorHash = (vid: string) => crypto.createHash('sha256').update(`exp:${vid}`).digest('base64url').slice(0, 16);

/** What the site needs: running experiments and their variant ids. */
export function publicExperiments(db: any) {
  return EXPERIMENTS.filter((e) => statusOf(db, e.id) === 'running').map((e) => ({ id: e.id, variants: e.variants.map((v) => v.id) }));
}

/** Count one event. Returns false (and counts nothing) for anything invalid or repeated. */
export function recordEvent(db: any, input: any): boolean {
  const def = defOf(String(input?.experiment || ''));
  if (!def || statusOf(db, def.id) !== 'running') return false;
  const variant = String(input?.variant || '');
  if (!def.variants.some((v) => v.id === variant)) return false;
  const event = String(input?.event || '') as ExpEvent;
  if (event !== 'exposure' && event !== 'conversion') return false;
  const vid = String(input?.vid || '');
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(vid)) return false;
  const s = store(db);
  const h = visitorHash(vid);
  const key = (e: ExpEvent) => `${def.id}:${e}:${h}`;
  if (s.seen[key(event)]) return false;
  // A conversion counts only for a visitor this experiment actually showed something to.
  if (event === 'conversion' && !s.seen[key('exposure')]) return false;
  if (Object.keys(s.seen).length >= MAX_SEEN) return false;
  s.seen[key(event)] = 1;
  const c = ((s.counts[def.id] ??= {})[variant] ??= { exposure: 0, conversion: 0 });
  c[event]++;
  return true;
}

/** Standard normal CDF (Abramowitz–Stegun 26.2.17). */
function phi(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/** Two-sided p-value for the difference between two conversion rates. */
export function twoProportionP(c1: number, n1: number, c2: number, n2: number): number | null {
  if (!n1 || !n2) return null;
  const p = (c1 + c2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  if (!se) return null;
  const z = (c1 / n1 - c2 / n2) / se;
  return 2 * (1 - phi(Math.abs(z)));
}

export function results(db: any) {
  return EXPERIMENTS.map((def) => {
    const counts = store(db).counts[def.id] || {};
    const variants = def.variants.map((v) => {
      const c = counts[v.id] || { exposure: 0, conversion: 0 };
      return { id: v.id, label: v.label, exposures: c.exposure, conversions: c.conversion, rate: c.exposure ? Math.round((c.conversion / c.exposure) * 1000) / 10 : null };
    });
    const [a, b] = variants;
    const p = a && b ? twoProportionP(a.conversions, a.exposures, b.conversions, b.exposures) : null;
    const enough = variants.every((v) => v.exposures >= MIN_EXPOSURES);
    const significant = enough && p !== null && p < 0.05;
    const leader = a && b && a.rate !== null && b.rate !== null && a.rate !== b.rate ? (b.rate > a.rate ? b.id : a.id) : null;
    const st = settingsOf(db)[def.id] || { status: 'off' as ExpStatus };
    return {
      id: def.id, title: def.title, success: def.success, status: st.status, started_at: st.started_at || null, stopped_at: st.stopped_at || null,
      variants, p_value: p === null ? null : Math.round(p * 10000) / 10000, significant,
      verdict: !enough
        ? `Not enough data yet: each version needs at least ${MIN_EXPOSURES} visitors.`
        : significant
          ? `Version ${leader!.toUpperCase()} converts better, and the difference is unlikely to be chance (p = ${(Math.round(p! * 1000) / 1000).toFixed(3)}).`
          : 'No clear difference yet. Keep it running, or stop it and keep the current wording.',
    };
  });
}

export function setStatus(db: any, id: string, status: unknown, now = new Date()) {
  if (!defOf(id)) throw new Error('Unknown experiment.');
  if (status !== 'running' && status !== 'stopped' && status !== 'off') throw new Error('Choose running, stopped or off.');
  const cur = settingsOf(db)[id] || { status: 'off' };
  settingsOf(db)[id] = { ...cur, status, ...(status === 'running' && !cur.started_at ? { started_at: now.toISOString() } : {}), ...(status === 'stopped' ? { stopped_at: now.toISOString() } : {}) };
  return results(db).find((r) => r.id === id);
}
