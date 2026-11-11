import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { loadDb, safeSaveDb } from '../data/db';
import { appendAudit } from '../store/audit';
import { balanceOf, CoinError, DEFAULT_RULES, grant, ledgerOf, rulesOf, spend, type CoinRuleId } from '../lib/coins';
import { istDate } from '../lib/streak';
import { BANK, FREE_CORE } from '../lib/practice/bank';
import { accessOverrides, type AccessOverride } from '../lib/practice/access';
import { dailyProblem } from '../lib/practice/daily';
import { ordersOf } from '../lib/store';

/**
 * Admin → TiE Coins and practice access (TIE_COINS_STORE_PLAN.md §7). Mounted behind requireAdmin.
 *   GET  /rules · PUT /rules/:id             the earning table (changes apply to new events only)
 *   GET  /students?q=                        balances, searchable
 *   GET  /students/:id                       one student's ledger
 *   POST /adjust { user_id, coins, note }    grant (+) or deduct (−) with a reason; audited
 *   GET  /stats?days=30                      issued / spent / outstanding, ₹ liability, by rule, top earners, flags
 *   GET  /practice · PUT /practice/:id { access }   per-problem free / pack / hidden / default
 *   GET  /daily · PUT /daily { date, problem_id|null }   the daily problem and overrides
 */
export const adminCoinsRouter = Router();

const actor = (req: Request) => String((req as any).userId || 'admin');
const fail = (res: Response, e: unknown) => (e instanceof CoinError ? res.status(e.status).json({ error: e.message }) : res.status(500).json({ error: 'Something went wrong' }));

adminCoinsRouter.get('/rules', (_req: Request, res: Response) => {
  const db = loadDb();
  res.json({ rules: rulesOf(db), defaults: DEFAULT_RULES });
});

adminCoinsRouter.put('/rules/:id', (req: Request, res: Response) => {
  const id = req.params.id as CoinRuleId;
  if (!DEFAULT_RULES.some((r) => r.id === id)) return res.status(404).json({ error: 'Unknown rule' });
  const db: any = loadDb();
  const b = req.body || {};
  const cur = (db.coin_rules && typeof db.coin_rules === 'object') ? db.coin_rules : {};
  const next: any = { ...(cur[id] || {}) };
  const n = (v: unknown) => Math.max(0, Math.min(100000, Math.round(Number(v))));
  if (typeof b.on === 'boolean') next.on = b.on;
  if (b.coins != null && Number.isFinite(Number(b.coins))) next.coins = n(b.coins);
  if (b.cap_day === null) delete next.cap_day; else if (b.cap_day != null && Number.isFinite(Number(b.cap_day))) next.cap_day = n(b.cap_day);
  if (b.by_difficulty && typeof b.by_difficulty === 'object') next.by_difficulty = { easy: n(b.by_difficulty.easy), medium: n(b.by_difficulty.medium), hard: n(b.by_difficulty.hard) };
  if (b.milestones && typeof b.milestones === 'object') next.milestones = Object.fromEntries(Object.entries(b.milestones).filter(([k]) => Number(k) > 0).map(([k, v]) => [String(Math.round(Number(k))), n(v)]));
  if (b.reset === true) delete cur[id]; else cur[id] = next;
  db.coin_rules = cur;
  void appendAudit(db, { actor: actor(req), action: 'coins.rule', detail: `${id}: ${JSON.stringify(b).slice(0, 300)}` }).catch(() => undefined);
  safeSaveDb(db);
  res.json({ rule: rulesOf(db).find((r) => r.id === id) });
});

adminCoinsRouter.get('/students', (req: Request, res: Response) => {
  const db: any = loadDb();
  const q = String(req.query.q || '').trim().toLowerCase();
  const bal = new Map<string, number>();
  for (const e of ledgerOf(db)) bal.set(e.user_id, (bal.get(e.user_id) || 0) + e.coins);
  const rows = (db.users || [])
    .filter((u: any) => !q || `${u.name || ''} ${u.email || ''}`.toLowerCase().includes(q))
    .map((u: any) => ({ id: u.id, name: u.name || '', email: u.email || '', coins: bal.get(u.id) || 0, streak: u.streak || 0 }))
    .filter((r: any) => q || r.coins !== 0)
    .sort((a: any, b: any) => b.coins - a.coins)
    .slice(0, 100);
  res.json({ students: rows });
});

adminCoinsRouter.get('/students/:id', (req: Request, res: Response) => {
  const db: any = loadDb();
  const u = (db.users || []).find((x: any) => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Student not found' });
  res.json({
    student: { id: u.id, name: u.name || '', email: u.email || '', coins: balanceOf(db, u.id), streak: u.streak || 0, goal: u.coin_goal || null },
    ledger: ledgerOf(db).filter((e) => e.user_id === u.id).slice(-300).reverse(),
    orders: ordersOf(db).filter((o) => o.user_id === u.id).slice().reverse(),
  });
});

adminCoinsRouter.post('/adjust', (req: Request, res: Response) => {
  const db: any = loadDb();
  const userId = String(req.body?.user_id || '');
  const coins = Math.round(Number(req.body?.coins));
  const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 200) : '';
  if (!(db.users || []).some((u: any) => u.id === userId)) return res.status(404).json({ error: 'Student not found' });
  if (!coins || !Number.isFinite(coins) || Math.abs(coins) > 100000) return res.status(400).json({ error: 'Enter a non-zero amount up to 100,000' });
  if (note.length < 3) return res.status(400).json({ error: 'Say why (it goes in the ledger and the audit log)' });
  const key = `admin:${crypto.randomBytes(6).toString('hex')}`;
  try {
    if (coins > 0) grant(db, userId, 'admin', key, coins, `Admin: ${note}`);
    else spend(db, userId, key, -coins, `Admin deduction: ${note}`);
  } catch (e) { return fail(res, e); }
  void appendAudit(db, { actor: actor(req), action: 'coins.adjust', detail: `${userId} ${coins > 0 ? '+' : ''}${coins}: ${note}` }).catch(() => undefined);
  safeSaveDb(db);
  res.json({ coins: balanceOf(db, userId) });
});

adminCoinsRouter.get('/stats', (req: Request, res: Response) => {
  const db: any = loadDb();
  const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = ledgerOf(db);
  let issued = 0, spent = 0, refunded = 0;
  const byRule: Record<string, number> = {};
  const earners = new Map<string, number>();
  const perDay = new Map<string, number>();
  for (const e of rows) {
    if (e.coins > 0 && e.rule !== 'refund') issued += e.coins;
    if (e.rule === 'spend') spent += -e.coins;
    if (e.rule === 'refund') refunded += e.coins;
    if (e.at >= since) {
      byRule[e.rule] = (byRule[e.rule] || 0) + e.coins;
      if (e.coins > 0 && e.rule !== 'refund' && e.rule !== 'admin') {
        earners.set(e.user_id, (earners.get(e.user_id) || 0) + e.coins);
        const k = `${e.user_id}|${istDate(new Date(e.at))}`;
        perDay.set(k, (perDay.get(k) || 0) + e.coins);
      }
    }
  }
  const outstanding = issued - spent + refunded - 0;
  const users = new Map<string, any>((db.users || []).map((u: any) => [u.id, u]));
  const name = (id: string) => users.get(id)?.name || users.get(id)?.email || id;
  // Flag: more than 150 earned coins in one day (normal heavy practice is ~60).
  const flagged = [...perDay.entries()].filter(([, c]) => c > 150).map(([k, c]) => { const [id, day] = k.split('|'); return { user_id: id, name: name(id), day, coins: c }; }).slice(0, 50);
  res.json({
    days,
    totals: { issued, spent, refunded, outstanding, liability_inr: Math.round(outstanding / 10), holders: new Set(rows.map((e) => e.user_id)).size },
    by_rule: byRule,
    top_earners: [...earners.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, c]) => ({ user_id: id, name: name(id), coins: c })),
    flagged,
    orders: ordersOf(db).reduce((m: Record<string, number>, o) => { m[o.status] = (m[o.status] || 0) + 1; return m; }, {}),
  });
});

adminCoinsRouter.get('/practice', (_req: Request, res: Response) => {
  const db: any = loadDb();
  const over = accessOverrides(db);
  res.json({
    problems: BANK.map((p) => ({ id: p.id, title: p.title, difficulty: p.difficulty, topic: p.topic_key, companies: p.companies.map((c) => c.slug), free_core: FREE_CORE.has(p.id), override: over[p.id] || 'default' })),
  });
});

adminCoinsRouter.put('/practice/:id', (req: Request, res: Response) => {
  const db: any = loadDb();
  if (!BANK.some((p) => p.id === req.params.id)) return res.status(404).json({ error: 'Problem not found' });
  const access = String(req.body?.access || '');
  if (!['default', 'free', 'pack', 'hidden'].includes(access)) return res.status(400).json({ error: 'Choose default, free, pack or hidden' });
  const over = { ...accessOverrides(db) };
  if (access === 'default') delete over[req.params.id]; else over[req.params.id] = access as AccessOverride;
  db.practice_access = over;
  void appendAudit(db, { actor: actor(req), action: 'practice.access', detail: `${req.params.id} → ${access}` }).catch(() => undefined);
  safeSaveDb(db);
  res.json({ id: req.params.id, override: over[req.params.id] || 'default' });
});

adminCoinsRouter.get('/daily', (_req: Request, res: Response) => {
  const db: any = loadDb();
  const today = istDate();
  const next = Array.from({ length: 14 }, (_, i) => new Date(Date.now() + i * 86_400_000)).map((d) => istDate(d));
  res.json({
    today,
    schedule: next.map((date) => { const p = dailyProblem(date, db); return { date, id: p?.id || null, title: p?.title || '', overridden: !!db.daily_overrides?.[date] }; }),
  });
});

adminCoinsRouter.put('/daily', (req: Request, res: Response) => {
  const db: any = loadDb();
  const date = String(req.body?.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Pick a date' });
  const id = req.body?.problem_id == null ? null : String(req.body.problem_id);
  if (id && !BANK.some((p) => p.id === id)) return res.status(404).json({ error: 'Problem not found' });
  db.daily_overrides = { ...(db.daily_overrides || {}) };
  if (id) db.daily_overrides[date] = id; else delete db.daily_overrides[date];
  void appendAudit(db, { actor: actor(req), action: 'practice.daily', detail: `${date} → ${id || 'auto'}` }).catch(() => undefined);
  safeSaveDb(db);
  const p = dailyProblem(date, db);
  res.json({ date, id: p?.id || null, title: p?.title || '', overridden: !!id });
});
