import { getPool } from '../db/client';
import {
  PlacementRole,
  expandPlacementGrant,
  PlacementAuthorityLike,
  placementCan,
} from './permissions';

/**
 * Placement authority resolution.
 *
 * Mirrors `lib/rbac.ts`'s split — coarse gate first (a real session), then a
 * visible, revocable grant row — but reads PostgreSQL instead of the JSON
 * ledger cache, because placement_access is relational from day one and a TPO
 * request must not parse a 3MB document to reach one grant.
 *
 * A grant change must take effect quickly (an officer removed after a dispute
 * cannot wait 15 minutes for token expiry), so permissions are resolved per
 * request from the table, never carried in the JWT. The 10-second cache below
 * exists only to absorb a burst of dashboard calls, and every writer
 * invalidates it explicitly.
 */

export interface PlacementGrant {
  access_id: string;
  user_id: string;
  /** NULL only for placement super_admin — meaning "all colleges". */
  college_id: string | null;
  email: string;
  name: string;
  role: PlacementRole;
  scopes: Record<string, unknown>;
  permissions: string[];
  status: string;
}

export interface PlacementCollege {
  college_id: string;
  slug: string;
  name: string;
  short_name: string;
  theme_color: string;
  logo_url: string | null;
  status: string;
}

export interface PlacementAuthority extends PlacementAuthorityLike {
  userId: string;
  grants: PlacementGrant[];
  /** Resolved from `x-college-id` or from the single grant; null when ambiguous. */
  collegeId: string | null;
  grant: PlacementGrant | null;
  permissions: Set<string>;
  colleges: PlacementCollege[];
}

const CACHE_TTL_MS = 10_000;
const grantsCache = new Map<string, { at: number; grants: PlacementGrant[] }>();

/** Called by every writer (invite accept, grant change, revoke). */
export function invalidatePlacementCache(userId?: string): void {
  if (userId) grantsCache.delete(userId);
  else grantsCache.clear();
}

/** Exported for tests so cache assertions are not order-dependent. */
export function __resetPlacementCache(): void {
  grantsCache.clear();
}

const isSuperAdminGrant = (g: PlacementGrant): boolean => g.role === 'super_admin';

export async function loadPlacementGrants(userId: string): Promise<PlacementGrant[]> {
  const hit = grantsCache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.grants;

  const res = await getPool().query(
    `SELECT access_id, user_id, college_id, email, name, placement_role, scopes, permissions, status
       FROM placement_access
      WHERE user_id = $1 AND status = 'active'
      ORDER BY created_at ASC`,
    [userId]
  );

  const grants: PlacementGrant[] = (res.rows || []).map((r: any) => ({
    access_id: r.access_id,
    user_id: r.user_id,
    college_id: r.college_id ?? null,
    email: r.email,
    name: r.name || '',
    role: r.placement_role as PlacementRole,
    scopes: typeof r.scopes === 'string' ? safeJson(r.scopes, {}) : r.scopes || {},
    permissions: typeof r.permissions === 'string' ? safeJson(r.permissions, []) : r.permissions || [],
    status: r.status,
  }));

  grantsCache.set(userId, { at: Date.now(), grants });
  return grants;
}

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function listPlacementColleges(filter: {
  /** null = every college (super admin only — caller enforces). */
  collegeIds: string[] | null;
  includeArchived?: boolean;
}): Promise<PlacementCollege[]> {
  const clauses: string[] = [];
  const params: any[] = [];
  if (filter.collegeIds) {
    if (filter.collegeIds.length === 0) return [];
    params.push(filter.collegeIds);
    clauses.push(`college_id = ANY($${params.length}::text[])`);
  }
  if (!filter.includeArchived) clauses.push(`status = 'active'`);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const res = await getPool().query(
    `SELECT college_id, slug, name, short_name, theme_color, logo_url, status
       FROM placement_college ${where}
      ORDER BY name ASC`,
    params
  );
  return (res.rows || []).map((r: any) => ({
    college_id: r.college_id,
    slug: r.slug,
    name: r.name,
    short_name: r.short_name || '',
    theme_color: r.theme_color || '#1F3A5F',
    logo_url: r.logo_url ?? null,
    status: r.status,
  }));
}

/**
 * Marker error for "super admin has not chosen a college". It is a distinct
 * value (not just another string) because `buildPlacementAuthority` must
 * recognise it: `/me` answers 200 with `active_college_id: null` so the UI can
 * render a picker, while `requirePlacementScope` turns the same situation into
 * a 400 that names the header once a data route actually needs a college.
 */
export const SELECT_COLLEGE_ERROR = 'Select a college (x-college-id header)';

/**
 * Pure college picker, extracted so the tenancy rule is unit-testable without
 * a request or a database.
 *
 * Rules:
 *  - A college-scoped grant pins its own college. A mismatched header is a
 *    cross-tenant attempt and is rejected — silently falling back to the
 *    grant's college would mask a client bug that later shows up as data from
 *    the wrong college.
 *  - A super-admin grant (college_id NULL) must be explicit: without a header
 *    there is no honest default, and guessing the first college would make
 *    super-admin reads depend on row order.
 *  - No grant at all resolves to null (the caller decides what that means).
 */
export function resolveCollegeId(
  headerCollegeId: string | null | undefined,
  grants: PlacementGrant[]
): { collegeId: string | null; error: string | null } {
  const header = (headerCollegeId || '').trim();
  const scoped = grants.find((g) => g.college_id);
  const superAdmin = grants.some(isSuperAdminGrant);

  if (scoped) {
    if (!header) return { collegeId: scoped.college_id, error: null };
    if (header !== scoped.college_id) {
      return {
        collegeId: null,
        error: 'This account does not have access to the requested college',
      };
    }
    return { collegeId: header, error: null };
  }

  if (superAdmin) {
    if (!header) {
      return { collegeId: null, error: SELECT_COLLEGE_ERROR };
    }
    return { collegeId: header, error: null };
  }

  return { collegeId: null, error: null };
}

/** Effective permissions for one grant, expanded role defaults + additions. */
export function permissionsOfGrant(grant: PlacementGrant | null): Set<string> {
  if (!grant) return new Set<string>();
  return expandPlacementGrant({ role: grant.role, permissions: grant.permissions });
}

/**
 * Builds the request authority: grants + resolved college + effective
 * permissions. The caller has already established a valid session; this only
 * answers "what may they do, in which college".
 */
export function buildPlacementAuthority(
  userId: string,
  grants: PlacementGrant[],
  colleges: PlacementCollege[],
  headerCollegeId: string | null | undefined
): { authority: PlacementAuthority | null; error: string | null; status: number } {
  if (grants.length === 0) {
    return { authority: null, error: 'Campus TPO portal access required', status: 403 };
  }

  const picked = resolveCollegeId(headerCollegeId, grants);
  if (picked.error && picked.error !== SELECT_COLLEGE_ERROR) {
    // A wrong-college header on a scoped grant is a tenancy probe, not a
    // validation nitpick — 404-shaped wording, no listing of what exists.
    return { authority: null, error: 'College not available for this account', status: 404 };
  }

  // A super admin may name ANY college — but only one that exists. Validating
  // against the allowed list (not just the header's shape) is what turns a
  // mistyped id into an honest 404 instead of an authority with a dangling
  // college id that every downstream query returns zero rows for.
  if (picked.collegeId && !grants.some((g) => g.college_id === picked.collegeId)) {
    const allowed = new Set(colleges.map((c) => c.college_id));
    if (!allowed.has(picked.collegeId)) {
      return { authority: null, error: 'College not available for this account', status: 404 };
    }
  }

  // "No college chosen yet" is NOT an error here: `/api/placement/me` must
  // answer for a super admin on first boot, listing their colleges so the UI
  // can render a picker. The 400 that names `x-college-id` belongs to
  // requirePlacementScope, which runs when a DATA route actually needs one.
  const missingCollege = picked.error === SELECT_COLLEGE_ERROR;

  const grant =
    (picked.collegeId && grants.find((g) => g.college_id === picked.collegeId)) ||
    grants.find(isSuperAdminGrant) ||
    null;

  return {
    authority: {
      userId,
      grants,
      collegeId: picked.collegeId,
      grant,
      // With no college resolved, permissions are EMPTY even for a wildcard
      // grant: "what may I do" has no meaning without "where", and an empty
      // set makes that unrepresentable by accident rather than by discipline.
      permissions: missingCollege ? new Set<string>() : permissionsOfGrant(grant),
      colleges,
    },
    error: null,
    status: 200,
  };
}

export { placementCan };

/**
 * Field-level audit write. Never throws into the request path: an audit insert
 * failing must not roll back a legitimate edit the operator just made — it is
 * logged loudly instead. (The import layer is the exception: there the audit
 * row is written inside the commit transaction, on purpose.)
 */
export async function writePlacementAudit(entry: {
  college_id: string | null;
  table_name: string;
  record_id: string;
  field?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  changed_by: string;
  reason?: string | null;
}): Promise<void> {
  try {
    await getPool().query(
      `INSERT INTO placement_audit (college_id, table_name, record_id, field, old_value, new_value, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.college_id,
        entry.table_name,
        entry.record_id,
        entry.field ?? null,
        entry.old_value ?? null,
        entry.new_value ?? null,
        entry.changed_by,
        entry.reason ?? null,
      ]
    );
  } catch (err: any) {
    console.error(
      `❌ [PlacementAudit] FAILED ${entry.table_name}.${entry.record_id} (${entry.field || '-'}) by ${entry.changed_by}: ${err?.message}`
    );
  }
}
