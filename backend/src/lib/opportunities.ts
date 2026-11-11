// ============================================================================
// Opportunities: earned by a streak, never bought (TIE_COINS_STORE_PLAN.md §5).
// Each unlocks once per student, the moment their best streak reaches it, and
// is something TiEEdu actually delivers (wording says "eligible", never
// "guaranteed"). Admins can switch any off or move its threshold
// (db.opportunity_rules[key] = { on, days }).
// ============================================================================
import crypto from 'crypto';

export type OppKind = 'coins' | 'flag' | 'talent' | 'membership' | 'claim';
export interface Opportunity { key: string; days: number; title: string; blurb: string; kind: OppKind; coins?: number; item?: string; member_days?: number }

export const OPPORTUNITIES: Opportunity[] = [
  { key: 'opp-30-repair', days: 30, kind: 'coins', coins: 60, title: 'A free Streak Repair', blurb: '60 coins to fill a missed day, on us.' },
  { key: 'opp-30-drive', days: 30, kind: 'flag', title: 'Priority seat in mock drives', blurb: 'Drive organisers see you as a Streak Star when seats are tight.' },
  { key: 'opp-60-recruiters', days: 60, kind: 'talent', title: 'Streak Star for recruiters', blurb: 'If you are in the talent pool, verified recruiters see your streak. You stay anonymous until you accept.' },
  { key: 'opp-100-membership', days: 100, kind: 'membership', member_days: 30, title: '30 days of membership, free', blurb: 'Member lessons, extra mocks and internship applications.' },
  { key: 'opp-200-kit', days: 200, kind: 'claim', item: 'kit', title: 'The TiEEdu welcome kit, free', blurb: 'Bottle, notebook, stickers and keychain, shipped to you.' },
  { key: 'opp-365-hoodie', days: 365, kind: 'claim', item: 'hoodie', title: 'The TiEEdu hoodie, free', blurb: 'For a full year of code.' },
];

export function opportunitiesOf(db: any): Array<Opportunity & { on: boolean }> {
  const over = (db.opportunity_rules && typeof db.opportunity_rules === 'object') ? db.opportunity_rules : {};
  return OPPORTUNITIES.map((o) => {
    const x = over[o.key] || {};
    const days = Number.isFinite(Number(x.days)) && Number(x.days) > 0 ? Math.round(Number(x.days)) : o.days;
    return { ...o, days, on: typeof x.on === 'boolean' ? x.on : true };
  });
}

export interface OppUnlock { user_id: string; key: string; at: string; claimed_order?: string | null }
export function unlocksOf(db: any): OppUnlock[] {
  if (!Array.isArray(db.opportunity_unlocks)) db.opportunity_unlocks = [];
  return db.opportunity_unlocks;
}
export const hasUnlock = (db: any, userId: string, key: string) => unlocksOf(db).some((u) => u.user_id === userId && u.key === key);

/**
 * Unlock everything the student's best streak now reaches; apply what applies at once
 * (coins, flags, membership). `grantCoins` is injected to avoid a module cycle with lib/coins.
 * Returns the titles unlocked now.
 */
export function unlockOpportunities(db: any, userId: string, best: number, grantCoins: (key: string, coins: number, note: string) => void, now = new Date()): string[] {
  const out: string[] = [];
  const user = (db.users || []).find((u: any) => u.id === userId);
  if (!user) return out;
  for (const o of opportunitiesOf(db)) {
    if (!o.on || best < o.days || hasUnlock(db, userId, o.key)) continue;
    unlocksOf(db).push({ user_id: userId, key: o.key, at: now.toISOString(), claimed_order: null });
    if (o.kind === 'coins' && o.coins) grantCoins(`opp:${userId}:${o.key}`, o.coins, `Unlocked: ${o.title}`);
    if (o.kind === 'flag') user.mock_drive_priority = true;
    if (o.kind === 'talent') user.streak_star = true;
    if (o.kind === 'membership') {
      const cur = user.membership?.tier === 'member' && Date.parse(user.membership.expires_at) > now.getTime() ? Date.parse(user.membership.expires_at) : now.getTime();
      user.membership = { tier: 'member', source: 'streak-100', granted_at: user.membership?.granted_at || now.toISOString(), expires_at: new Date(cur + (o.member_days || 30) * 86_400_000).toISOString() };
    }
    out.push(o.title);
  }
  return out;
}

/** What the student sees: every opportunity with its state (locked / unlocked / claimable / claimed). */
export function opportunityView(db: any, userId: string, best: number) {
  const mine = new Map(unlocksOf(db).filter((u) => u.user_id === userId).map((u) => [u.key, u]));
  const user = (db.users || []).find((u: any) => u.id === userId);
  return opportunitiesOf(db).filter((o) => o.on).map((o) => {
    const u = mine.get(o.key);
    const state = !u ? 'locked' : o.kind === 'claim' ? (u.claimed_order ? 'claimed' : 'claimable') : 'unlocked';
    return {
      key: o.key, days: o.days, title: o.title, blurb: o.blurb, kind: o.kind, item: o.item || null, state,
      progress: Math.min(best, o.days), unlocked_at: u?.at || null,
      note: o.kind === 'talent' && u && !user?.talent?.visible ? 'Join the talent pool to be seen by recruiters.' : null,
    };
  });
}

/** Mark a claim as used by an order (store redeem with { claim }). Throws a message when not claimable. */
export function useClaim(db: any, userId: string, key: string, itemId: string, orderId: string) {
  const o = opportunitiesOf(db).find((x) => x.key === key);
  const u = unlocksOf(db).find((x) => x.user_id === userId && x.key === key);
  if (!o || o.kind !== 'claim' || o.item !== itemId) throw new Error('This reward cannot be claimed here');
  if (!u) throw new Error(`Unlocks at a ${o.days}-day streak`);
  if (u.claimed_order) throw new Error('Already claimed');
  u.claimed_order = orderId;
}

export const newOrderId = (now = new Date()) => `ord-${now.getTime()}-${crypto.randomBytes(3).toString('hex')}`;
