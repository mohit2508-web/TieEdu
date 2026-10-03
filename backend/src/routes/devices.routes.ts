import { Router, Request, Response } from 'express';
import { loadDb, saveDb, Device, Release } from '../data/db';
import { requireAuth, requireAdmin, requirePermission, requireDanger, rateLimit } from '../middleware/auth';
import { readDevice, saveDevice, listDevices, deleteDevice } from '../store/devices';
import { trackDevice, claimDevices, compareVersions } from '../lib/devices';
import { appendAudit } from '../store/audit';
import { setDeviceSubscriptionsBlocked } from '../store/push';

export const devicesRouter = Router();

// ============================================================
// INSTALL BEACON — public by necessity
// ============================================================

/**
 * Rate-limited because it is the one write endpoint on the server that an
 * anonymous caller can hit on a loop. The limit is deliberately generous: a
 * normal client beats once per session start and then throttles client-side, so
 * this only needs to stop a script, not a phone.
 *
 * Limit is per-IP rather than global, because a global cap would let one abusive
 * client suppress install counting for every real user behind the same egress.
 */
const beaconLimiter = rateLimit(30);

/**
 * POST /api/devices/track — Register or refresh one install.
 *
 * Public on purpose. The moment a user decides to install is, by definition, a
 * moment they are not logged in; requiring auth would make the pre-login install
 * unmeasurable, which is most of the installs there are.
 *
 * Echoes back the id the server stored so the client can detect that its own
 * localStorage value was rejected (malformed or from an older app) and re-mint.
 */
devicesRouter.post('/track', beaconLimiter, async (req: Request, res: Response) => {
  const result = await trackDevice(req.body || {}, req.ip || null, req.get('user-agent') || null);
  if (!result.ok) {
    // 400 for a bad id (the caller can fix it), 403 for a blocked install. The
    // blocked case must not be a 404: a client that silently stops reporting
    // looks exactly like a user who churned.
    return res.status(result.reason === 'blocked' ? 403 : 400).json({
      error: result.reason === 'blocked' ? 'This install has been blocked' : 'Invalid install_id',
      reason: result.reason,
      id: result.id,
    });
  }
  res.json({ ok: true, id: result.id });
});

/**
 * POST /api/devices/claim — Attach this browser's installs to the signed-in user.
 *
 * Called once after login. Bounded to 5 ids because a real browser has one or two;
 * a larger number means a forged list, and unbounded input to a mutating endpoint
 * is a free amplification primitive even when every entry is a no-op.
 */
devicesRouter.post('/claim', requireAuth, async (req: Request, res: Response) => {
  const raw = (req.body || {}).install_ids;
  const ids = Array.isArray(raw) ? raw.slice(0, 5) : [];
  const { claimed } = await claimDevices(req.userId as string, ids);
  res.json({ ok: true, claimed });
});

/**
 * GET /api/devices/me — The caller's own installs.
 *
 * Returns only `req.userId`'s rows. This is the one endpoint here a user may read
 * without any permission, and it is scoped to their own account rather than gated
 * on a permission at all — a student asking "which of my devices are registered"
 * is not an admin capability, so making it one would mean granting admins rights
 * over students' own data to show students their own data.
 */
devicesRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const { devices } = await listDevices();
  const mine = devices.filter((d: Device) => d.user_id === req.userId);
  res.json({ devices: mine.map((d: Device) => ({ id: d.id, platform: d.platform, install_surface: d.install_surface, app_version: d.app_version, last_seen_at: d.last_seen_at })) });
});

/**
 * GET /api/devices/bootstrap — Is this install current, and must it update?
 *
 * Public, because the whole job of this endpoint is to be answered by a client
 * that has not logged in. Returns a boolean-ish shape rather than the release
 * record: notes and min-version are admin-facing, and a version check has no need
 * for either.
 */
devicesRouter.post('/bootstrap', beaconLimiter, (req: Request, res: Response) => {
  const db = loadDb();
  const clientVersion = typeof req.body?.app_version === 'string' ? req.body.app_version : '0';
  const live = (db.releases || []).filter((r: Release) => r.status === 'live' || r.status === 'rolling');
  const current = live.length ? live.reduce((a: Release, b: Release) => (compareVersions(b.version, a.version) > 0 ? b : a)) : null;
  const min = live.map((r: Release) => r.min_supported_version).filter(Boolean) as string[];
  const minVersion = min.length ? min.reduce((a, b) => (compareVersions(b, a) > 0 ? b : a)) : null;

  res.json({
    ok: true,
    current_version: current?.version || null,
    update_required: Boolean(minVersion && compareVersions(clientVersion, minVersion) < 0),
    min_supported_version: minVersion,
  });
});

// ============================================================
// ADMIN SURFACE
// ============================================================

const adminDevicesRouter = Router();
adminDevicesRouter.use(requireAdmin);

/**
 * GET /api/admin/devices
 *
 * Defaults to installs only. A browser tab is not an install, and returning both
 * under one default is how a dashboard ends up reporting 40,000 installs when 400
 * people tapped the button — the row exists, the number is fiction.
 */
adminDevicesRouter.get('/', requirePermission('devices.read'), async (req: Request, res: Response) => {
  const { devices: all } = await listDevices();
  const surface = req.query.surface === 'browser_tab' ? 'browser_tab' : 'pwa';
  const rows = all.filter((d: Device) => d.install_surface === surface);

  const activeSince = Date.now() - 30 * 24 * 60 * 60 * 1000;
  res.json({
    installs: rows.length,
    active_30d: rows.filter((d: Device) => (Date.parse(d.last_active_at || '') || 0) >= activeSince).length,
    blocked: rows.filter((d: Device) => d.is_blocked).length,
    // Only auto_prompt installs have a real funnel, because only Chromium fires
    // beforeinstallprompt. Reporting a rate for iOS/manual would be inventing a
    // denominator.
    prompt_funnel: {
      shown: rows.reduce((n: number, d: Device) => n + (d.pwa_prompt_shown || 0), 0),
      accepted: rows.reduce((n: number, d: Device) => n + (d.pwa_prompt_accepted || 0), 0),
      dismissed: rows.reduce((n: number, d: Device) => n + (d.pwa_prompt_dismissed || 0), 0),
    },
    devices: rows,
  });
});

/** POST /api/admin/devices/:id/block — cut an install off from pushes and sessions. */
adminDevicesRouter.post('/:id/block', requirePermission('devices.block'), async (req: Request, res: Response) => {
  const found = await readDevice(req.params.id);
  const device = found?.device;
  if (!device) return res.status(404).json({ error: 'Not found' });

  const blocked = req.body?.blocked !== false;
  device.is_blocked = blocked;
  await saveDevice(device);

  const db = loadDb();
  // Through the shared writer: this route used to push rows by hand, which meant
  // a third id format, no actor fallback, no target on other platforms' events,
  // and — because the retention cap lived inside the payments helper — no
  // retention at all on a deployment whose only audit traffic was device actions.
  await appendAudit(db, {
    action: blocked ? 'device.block' : 'device.unblock',
    actor: req.user?.email || 'system',
    target: device.id,
    detail: `${blocked ? 'Blocked' : 'Unblocked'} install ${device.id}`,
  });
  saveDb(db);

  // Blocking an install is meaningless while its push endpoints stay live: the
  // device keeps receiving broadcasts an admin has just decided it must not get.
  //
  // This used to edit only the JSON ledger while delivery read only from
  // PostgreSQL, so with the cluster up it disabled nothing at all. It now goes
  // through the store, which writes both.
  const affected = await setDeviceSubscriptionsBlocked(device.id, blocked);

  res.json({ ok: true, id: device.id, is_blocked: device.is_blocked });
});

/**
 * DELETE /api/admin/devices/:id — remove a bogus row from the count.
 *
 * Gated behind `requireDanger` with a cooldown: this is the one admin action that
 * can make the headline install number smaller, and someone fixing a bad batch of
 * rows should have to do it deliberately, not twice in a row by reflex.
 */
adminDevicesRouter.delete('/:id', requireDanger('danger.maintenance', 'device.delete'), async (req: Request, res: Response) => {
  const removed = await deleteDevice(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Not found' });

  const db = loadDb();
  db.push_subscriptions = (db.push_subscriptions || []).filter((s: any) => s.device_id !== req.params.id);
  await appendAudit(db, {
    action: 'device.delete',
    actor: req.user?.email || 'system',
    target: req.params.id,
    detail: `Deleted install ${req.params.id}`,
  });
  saveDb(db);
  res.json({ ok: true, deleted: 1 });
});

export { adminDevicesRouter };