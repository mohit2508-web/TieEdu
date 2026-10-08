import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { requireAdmin, requirePermission, rateLimit } from '../middleware/auth';
import { getPool } from '../db/client';
import { invalidatePlacementCache, writePlacementAudit, loadPlacementGrants } from '../placement/access';
import {
  assignablePlacementRoles,
  isPlacementRole,
  isPlacementPermission,
  PLACEMENT_ROLE_LABELS,
  PlacementRole,
} from '../placement/permissions';

/**
 * Admin console — "Colleges & Placement" tab (plan §3, additive admin surface).
 *
 * Mounted as `/api/admin/placement` behind the same `requireAdmin` gate as the
 * rest of the admin API, then narrowed to the additive `colleges.*` permissions
 * so an existing staff grant that says nothing about colleges cannot manage
 * them by accident. TPO-portal users never touch these endpoints: they manage
 * their own day-to-day through `/api/placement/*`, which is gated by
 * `placement/permissions.ts`. This router is the platform owner's registry —
 * create a college, invite its T&P Head, disable someone after a dispute.
 *
 * No email is sent on invite creation: the platform has no transactional
 * mailer, and pretending otherwise would leave invites silently undelivered.
 * The admin gets the link back and sends it themselves (plan §5 — same
 * contract as every other invite in this codebase).
 */
export const placementAdminRouter = Router();

placementAdminRouter.use(requireAdmin);

const INVITE_TTL_DAYS = 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

const pgUnavailable = (res: Response) =>
  res.status(503).json({ error: 'Placement data store unavailable (PostgreSQL)' });

const isConnectionFailure = (err: any): boolean => {
  const code = err?.code || '';
  const message = String(err?.message || '');
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    message.includes('Connection') ||
    message.includes('timeout') ||
    message.includes('DATABASE_URL')
  );
};

/** Wraps handlers so a PG outage reads as 503, never as a stack trace. */
const pgRoute =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      await fn(req, res);
    } catch (err: any) {
      if (isConnectionFailure(err)) {
        pgUnavailable(res);
        return;
      }
      console.error('❌ [PlacementAdmin]', req.method, req.path, err?.stack || err?.message);
      if (!res.headersSent) res.status(500).json({ error: 'Placement admin request failed' });
    }
  };

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'college';

// ============================================================
// Colleges
// ============================================================

placementAdminRouter.get(
  '/colleges',
  requirePermission('colleges.read'),
  pgRoute(async (req, res) => {
    const includeArchived = req.query.include_archived === '1';
    const where = includeArchived ? '' : `WHERE status = 'active'`;
    const r = await getPool().query(
      `SELECT college_id, slug, name, short_name, theme_color, logo_url, status, created_at
         FROM placement_college ${where}
        ORDER BY name ASC`
    );
    res.json({ status: 'ok', colleges: r.rows || [] });
  })
);

placementAdminRouter.post(
  '/colleges',
  requirePermission('colleges.write'),
  pgRoute(async (req, res) => {
    const name = (req.body.name || '').toString().trim();
    if (name.length < 3) {
      res.status(400).json({ error: 'College name must be at least 3 characters' });
      return;
    }
    const shortName = (req.body.short_name || name).toString().trim().slice(0, 40);
    const themeColor = (req.body.theme_color || '#1F3A5F').toString();
    if (!HEX_COLOR_RE.test(themeColor)) {
      res.status(400).json({ error: 'theme_color must be a hex colour like #1F3A5F' });
      return;
    }

    // Slug: caller may pin one (useful for subdomains later), otherwise derive
    // and de-duplicate with -2, -3… so two "St. Mary's" colleges do not collide.
    let slug = slugify((req.body.slug || name).toString());
    const dupe = await getPool().query(`SELECT 1 FROM placement_college WHERE slug = $1`, [slug]);
    if (dupe.rows?.length) {
      for (let i = 2; i < 50; i++) {
        const candidate = `${slug}-${i}`;
        const taken = await getPool().query(`SELECT 1 FROM placement_college WHERE slug = $1`, [candidate]);
        if (!taken.rows?.length) {
          slug = candidate;
          break;
        }
      }
    }

    const r = await getPool().query(
      `INSERT INTO placement_college (slug, name, short_name, theme_color, logo_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING college_id, slug, name, short_name, theme_color, logo_url, status, created_at`,
      [slug, name, shortName, themeColor, req.body.logo_url || null, req.userId || null]
    );
    const college = r.rows?.[0];
    await writePlacementAudit({
      college_id: college.college_id,
      table_name: 'placement_college',
      record_id: college.college_id,
      field: 'created',
      old_value: null,
      new_value: name,
      changed_by: req.userId || 'admin',
      reason: 'college created',
    });
    res.status(201).json({ status: 'created', college });
  })
);

placementAdminRouter.patch(
  '/colleges/:id',
  requirePermission('colleges.write'),
  pgRoute(async (req, res) => {
    const current = await getPool().query(`SELECT * FROM placement_college WHERE college_id = $1`, [req.params.id]);
    const row = current.rows?.[0];
    if (!row) {
      res.status(404).json({ error: 'College not found' });
      return;
    }

    const nextName = req.body.name !== undefined ? String(req.body.name).trim() : row.name;
    if (nextName.length < 3) {
      res.status(400).json({ error: 'College name must be at least 3 characters' });
      return;
    }
    const nextShort =
      req.body.short_name !== undefined ? String(req.body.short_name).trim().slice(0, 40) : row.short_name;
    const nextTheme = req.body.theme_color !== undefined ? String(req.body.theme_color) : row.theme_color;
    if (!HEX_COLOR_RE.test(nextTheme)) {
      res.status(400).json({ error: 'theme_color must be a hex colour like #1F3A5F' });
      return;
    }
    const nextLogo = req.body.logo_url !== undefined ? req.body.logo_url || null : row.logo_url;
    const nextStatus =
      req.body.status !== undefined ? String(req.body.status) : row.status;
    if (!['active', 'archived'].includes(nextStatus)) {
      res.status(400).json({ error: 'status must be active or archived' });
      return;
    }

    const r = await getPool().query(
      `UPDATE placement_college
          SET name = $1, short_name = $2, theme_color = $3, logo_url = $4, status = $5, updated_at = NOW()
        WHERE college_id = $6
        RETURNING college_id, slug, name, short_name, theme_color, logo_url, status, created_at`,
      [nextName, nextShort, nextTheme, nextLogo, nextStatus, req.params.id]
    );

    // Field-level audit: only the fields that actually moved, so the log says
    // "theme_color #1F3A5F → #8B1E3F" and not "college updated".
    for (const [field, before, after] of [
      ['name', row.name, nextName],
      ['short_name', row.short_name, nextShort],
      ['theme_color', row.theme_color, nextTheme],
      ['logo_url', row.logo_url, nextLogo],
      ['status', row.status, nextStatus],
    ] as const) {
      if (before !== after) {
        await writePlacementAudit({
          college_id: row.college_id,
          table_name: 'placement_college',
          record_id: row.college_id,
          field,
          old_value: before == null ? null : String(before),
          new_value: after == null ? null : String(after),
          changed_by: req.userId || 'admin',
          reason: req.body.reason ? String(req.body.reason) : null,
        });
      }
    }

    res.json({ status: 'ok', college: r.rows?.[0] });
  })
);

// ============================================================
// Access grants — who may open the Campus TPO portal
// ============================================================

placementAdminRouter.get(
  '/colleges/:id/access',
  requirePermission('colleges.read'),
  pgRoute(async (req, res) => {
    const r = await getPool().query(
      `SELECT access_id, user_id, email, name, placement_role, scopes, permissions, status,
              invited_at, accepted_at, created_at
         FROM placement_access
        WHERE college_id = $1
        ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json({
      status: 'ok',
      grants: (r.rows || []).map((g: any) => ({
        ...g,
        role_label: PLACEMENT_ROLE_LABELS[g.placement_role as PlacementRole] || g.placement_role,
      })),
    });
  })
);

/**
 * POST /colleges/:id/access — direct grant for an account that already exists
 * (the college's T&P Head who already has a TieEdu login). The invite flow
 * exists for people who do not; both write the same row shape.
 */
placementAdminRouter.post(
  '/colleges/:id/access',
  requirePermission('colleges.write'),
  pgRoute(async (req, res) => {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'A valid email is required' });
      return;
    }
    const role = req.body.role;
    if (!isPlacementRole(role) || !assignablePlacementRoles().includes(role)) {
      res.status(400).json({ error: 'Unknown or non-assignable placement role' });
      return;
    }
    const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    for (const p of permissions) {
      if (!isPlacementPermission(p)) {
        res.status(400).json({ error: `Unknown permission "${p}"` });
        return;
      }
    }

    // The account must exist: a grant row pointing at a user id that the JSON
    // ledger does not have resolves nowhere and looks like a silent revoke.
    const { loadDb } = await import('../data/db');
    const db = loadDb();
    const user = (db.users || []).find((u: any) => u.email === email && !u.disabled);
    if (!user) {
      res.status(404).json({
        error: `No TieEdu account exists for ${email} — send an invite instead`,
        invite_required: true,
      });
      return;
    }

    const existing = await getPool().query(
      `SELECT access_id, placement_role FROM placement_access WHERE user_id = $1 AND college_id = $2`,
      [user.id, req.params.id]
    );
    if (existing.rows?.length) {
      res.status(409).json({ error: `${email} already has placement access to this college` });
      return;
    }

    const r = await getPool().query(
      `INSERT INTO placement_access (user_id, college_id, email, name, placement_role, scopes, permissions, status, invited_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8)
       RETURNING access_id, user_id, email, name, placement_role, permissions, status`,
      [
        user.id,
        req.params.id,
        email,
        user.name || '',
        role,
        JSON.stringify(req.body.scopes || {}),
        JSON.stringify(permissions),
        req.userId || null,
      ]
    );
    await writePlacementAudit({
      college_id: req.params.id,
      table_name: 'placement_access',
      record_id: r.rows?.[0]?.access_id || user.id,
      field: 'status',
      old_value: null,
      new_value: 'active',
      changed_by: req.userId || 'admin',
      reason: `direct grant (${role})`,
    });
    invalidatePlacementCache(user.id);
    res.status(201).json({ status: 'created', grant: r.rows?.[0] });
  })
);

/**
 * PATCH /access/:id — change a grant's role / additive permissions / status.
 *
 * Role change and disable both invalidate the target's grant cache immediately,
 * so the next request they make reflects it — a revoked officer does not keep
 * a working portal for up to 10 seconds of cache plus up to 15 minutes of
 * token life. (The JWT itself carries no placement claims, which is what makes
 * this actually revocable — see middleware/placementAuth.ts.)
 */
placementAdminRouter.patch(
  '/access/:id',
  requirePermission('colleges.write'),
  pgRoute(async (req, res) => {
    const current = await getPool().query(`SELECT * FROM placement_access WHERE access_id = $1`, [req.params.id]);
    const row = current.rows?.[0];
    if (!row) {
      res.status(404).json({ error: 'Grant not found' });
      return;
    }

    let nextRole = row.placement_role;
    if (req.body.role !== undefined) {
      if (!isPlacementRole(req.body.role) || !assignablePlacementRoles().includes(req.body.role)) {
        res.status(400).json({ error: 'Unknown or non-assignable placement role' });
        return;
      }
      nextRole = req.body.role;
    }

    let nextPermissions = row.permissions;
    if (req.body.permissions !== undefined) {
      const perms = Array.isArray(req.body.permissions) ? req.body.permissions : [];
      for (const p of perms) {
        if (!isPlacementPermission(p)) {
          res.status(400).json({ error: `Unknown permission "${p}"` });
          return;
        }
      }
      nextPermissions = perms;
    }

    let nextStatus = row.status;
    if (req.body.status !== undefined) {
      if (!['active', 'disabled'].includes(req.body.status)) {
        res.status(400).json({ error: 'status must be active or disabled' });
        return;
      }
      nextStatus = req.body.status;
    }

    const r = await getPool().query(
      `UPDATE placement_access
          SET placement_role = $1, permissions = $2, status = $3, updated_at = NOW()
        WHERE access_id = $4
        RETURNING access_id, user_id, email, name, placement_role, permissions, status`,
      [nextRole, JSON.stringify(nextPermissions), nextStatus, req.params.id]
    );

    for (const [field, before, after] of [
      ['placement_role', row.placement_role, nextRole],
      ['permissions', JSON.stringify(row.permissions || []), JSON.stringify(nextPermissions || [])],
      ['status', row.status, nextStatus],
    ] as const) {
      if (before !== after) {
        await writePlacementAudit({
          college_id: row.college_id,
          table_name: 'placement_access',
          record_id: row.access_id,
          field,
          old_value: String(before),
          new_value: String(after),
          changed_by: req.userId || 'admin',
          reason: req.body.reason ? String(req.body.reason) : null,
        });
      }
    }
    invalidatePlacementCache(row.user_id);
    res.json({ status: 'ok', grant: r.rows?.[0] });
  })
);

/**
 * DELETE /access/:id — revoke. The row is disabled, not deleted: the audit
 * trail must survive the revocation (plan §3 — "every edit ... written to an
 * audit log"), and a deleted grant means an incident review cannot see what
 * access existed last month.
 */
placementAdminRouter.delete(
  '/access/:id',
  requirePermission('colleges.write'),
  pgRoute(async (req, res) => {
    const current = await getPool().query(
      `UPDATE placement_access SET status = 'disabled', updated_at = NOW()
        WHERE access_id = $1
        RETURNING access_id, user_id, college_id, placement_role, status`,
      [req.params.id]
    );
    const row = current.rows?.[0];
    if (!row) {
      res.status(404).json({ error: 'Grant not found' });
      return;
    }
    await writePlacementAudit({
      college_id: row.college_id,
      table_name: 'placement_access',
      record_id: row.access_id,
      field: 'status',
      old_value: 'active',
      new_value: 'disabled',
      changed_by: req.userId || 'admin',
      reason: req.body?.reason ? String(req.body.reason) : 'revoked',
    });
    invalidatePlacementCache(row.user_id);
    res.json({ status: 'ok', revoked: row.access_id });
  })
);

// ============================================================
// Invites
// ============================================================

placementAdminRouter.get(
  '/colleges/:id/invites',
  requirePermission('colleges.read'),
  pgRoute(async (req, res) => {
    const r = await getPool().query(
      `SELECT token, email, placement_role, invited_by, created_at, expires_at, used_at
         FROM placement_invite
        WHERE college_id = $1
        ORDER BY created_at DESC
        LIMIT 100`,
      [req.params.id]
    );
    res.json({
      status: 'ok',
      invites: (r.rows || []).map((i: any) => ({
        token: i.token,
        email: i.email,
        role: i.placement_role,
        role_label: PLACEMENT_ROLE_LABELS[i.placement_role as PlacementRole] || i.placement_role,
        created_at: i.created_at,
        expires_at: i.expires_at,
        used_at: i.used_at,
        // Only a still-valid link is returned as usable; a spent or expired one
        // keeps its token for the audit trail but the UI must not offer it.
        usable: !i.used_at && new Date(i.expires_at).getTime() > Date.now(),
      })),
    });
  })
);

placementAdminRouter.post(
  '/colleges/:id/invites',
  requirePermission('colleges.write'),
  rateLimit(30),
  pgRoute(async (req, res) => {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'A valid email is required' });
      return;
    }
    const role = req.body.role;
    if (!isPlacementRole(role) || !assignablePlacementRoles().includes(role)) {
      res.status(400).json({ error: 'Unknown or non-assignable placement role' });
      return;
    }

    const college = await getPool().query(`SELECT name FROM placement_college WHERE college_id = $1`, [
      req.params.id,
    ]);
    if (!college.rows?.length) {
      res.status(404).json({ error: 'College not found' });
      return;
    }

    // Supersede: only the newest link for (email, college) works. Two live
    // tokens for the same person would make revocation ambiguous — which one
    // is the "real" grant, and which one should be blacklisted after an
    // incident?
    await getPool().query(`DELETE FROM placement_invite WHERE college_id = $1 AND email = $2 AND used_at IS NULL`, [
      req.params.id,
      email,
    ]);

    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await getPool().query(
      `INSERT INTO placement_invite (token, college_id, email, placement_role, scopes, invited_by, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [token, req.params.id, email, role, JSON.stringify(req.body.scopes || {}), req.userId || null, expiresAt]
    );
    await writePlacementAudit({
      college_id: req.params.id,
      table_name: 'placement_invite',
      record_id: token,
      field: 'invited',
      old_value: null,
      new_value: `${email} (${role})`,
      changed_by: req.userId || 'admin',
      reason: 'invite created',
    });

    // Absolute URL so the admin can copy-paste. The frontend page that
    // consumes the token lives at /tpo/invite/<token>.
    const base = (process.env.NEXT_PUBLIC_SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    res.status(201).json({
      status: 'created',
      invite: {
        token,
        email,
        role,
        role_label: PLACEMENT_ROLE_LABELS[role as PlacementRole] || role,
        expires_at: expiresAt,
        invite_url: `${base}/tpo/invite/${token}`,
      },
    });
  })
);

placementAdminRouter.delete(
  '/invites/:token',
  requirePermission('colleges.write'),
  pgRoute(async (req, res) => {
    // Delete rather than disable: an unused invite has no authority yet, so
    // there is nothing to revoke — the row simply stops existing and its token
    // stops resolving. (Used invites are never deleted, so history survives.)
    const r = await getPool().query(
      `DELETE FROM placement_invite WHERE token = $1 AND used_at IS NULL RETURNING token, college_id, email`,
      [req.params.token]
    );
    if (!r.rows?.length) {
      res.status(404).json({ error: 'Invite not found or already used' });
      return;
    }
    await writePlacementAudit({
      college_id: r.rows[0].college_id,
      table_name: 'placement_invite',
      record_id: r.rows[0].token,
      field: 'revoked',
      old_value: r.rows[0].email,
      new_value: null,
      changed_by: req.userId || 'admin',
      reason: 'invite revoked',
    });
    res.json({ status: 'ok' });
  })
);

/**
 * GET /overview — counts for the admin tab's header. Deliberately cheap: three
 * COUNT queries, no joins, so the tab opens instantly even on a large cluster.
 */
placementAdminRouter.get(
  '/overview',
  requirePermission('colleges.read'),
  pgRoute(async (req, res) => {
    const [colleges, grants, invites] = await Promise.all([
      getPool().query(`SELECT COUNT(*)::INT AS n FROM placement_college WHERE status = 'active'`),
      getPool().query(`SELECT COUNT(*)::INT AS n FROM placement_access WHERE status = 'active'`),
      getPool().query(
        `SELECT COUNT(*)::INT AS n FROM placement_invite
          WHERE used_at IS NULL AND expires_at > NOW()`
      ),
    ]);
    res.json({
      status: 'ok',
      overview: {
        colleges: colleges.rows?.[0]?.n || 0,
        active_grants: grants.rows?.[0]?.n || 0,
        pending_invites: invites.rows?.[0]?.n || 0,
      },
    });
  })
);

// Re-exported for tests that assert grant resolution without a live PG.
export { loadPlacementGrants };
