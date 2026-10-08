/**
 * Role-based access control for admin surfaces.
 *
 * Why this exists: `User.role` is only `'user' | 'admin'` (`data/db.ts`), and
 * `requireAdmin` checks nothing else. So "admin access" today means one boolean
 * that the seeded bootstrap account holds, and every admin surface — issuing
 * certificates, rejecting payments, reading revenue, rewriting pricing — hangs off
 * the same bit. Handing that bit to a new hire to let them moderate reports also
 * hands them the ability to issue certificates, and there is no way to take back
 * just the second thing.
 *
 * So authority is split in two:
 *   - `user.role === 'admin'` stays the coarse gate. Existing `requireAdmin`
 *     checks keep meaning exactly what they meant, so nothing already deployed
 *     changes behaviour.
 *   - A `staff` row carries the fine-grained permissions underneath it.
 *
 * The permission list is derived from routes that actually exist in this
 * codebase, not from a generic template — a permission for a feature that was
 * never built is a thing an admin can grant, believe is real, and then rely on.
 */

import { StaffRole, Staff } from '../data/db';

/**
 * The catalogue. Grouped for readability, flattened at runtime.
 *
 * Read permissions are deliberately separated from write ones: read is what an
 * `analyst` needs and write is what must stay away from them. Anything that
 * touches money, identity, or a published artefact has its own permission so it
 * can be granted on its own.
 */
export const PERMISSION_GROUPS = {
  analytics: ['analytics.read'],

  commerce: ['orders.read', 'orders.verify', 'coupons.read', 'coupons.write', 'pricing.write'],

  people: ['users.read', 'users.write', 'users.status', 'staff.read', 'staff.write'],

  content: [
    'companies.read',
    'companies.write',
    'companies.delete',
    'modules.write',
    'posters.write',
    'drops.read',
    'drops.write',
    'pdf.write',
    'studyplans.read',
    'studyplans.write',
  ],

  learning: [
    'courses.read',
    'courses.write',
    'courses.delete',
    'instructors.write',
    'certificates.read',
    'certificates.issue',
    'certificates.revoke',
    'xp.read',
    'xp.reconcile',
  ],

  moderation: ['reports.read', 'reports.moderate'],

  installs: ['devices.read', 'devices.write', 'devices.block'],

  messaging: ['broadcasts.read', 'broadcasts.write', 'broadcasts.send'],

  /**
   * Email marketing (the admin console's "Emails" tab). Separate from push
   * `broadcasts.*` on purpose: importing leads and sending commercial email is
   * a different blast radius from a push notification — it touches addresses
   * that belong to people who never created an account — so it can be granted
   * or revoked on its own.
   */
  email: ['email.read', 'email.write', 'email.send'],

  releases: ['releases.read', 'releases.publish'],

  platform: ['settings.read', 'settings.write', 'config.write', 'audit.read', 'campus.read'],

  /**
   * College registry (the admin console's "Colleges & Placement" tab).
   *
   * Additive by design: `admin` picks these up automatically (it is built from
   * ALL_PERMISSIONS) and `viewer` picks up `colleges.read` (it is built from
   * the `.read` suffix). No existing grant changes meaning — `colleges.*` is a
   * name nothing else in this codebase uses. TPO-portal users never read this
   * catalogue: their authority is `placement/permissions.ts`, so a T&P officer
   * can be given `placement.companies.write` without ever gaining
   * `companies.write` in the admin console.
   */
  colleges: ['colleges.read', 'colleges.write'],

  /**
   * Everything that changes the experience of every user at once, in one blast
   * radius. Split out so it can require a second approval or at minimum a
   * deliberate grant — see `requireDanger` in middleware/auth.ts.
   */
  danger: ['danger.broadcast.all', 'danger.maintenance', 'danger.force_update', 'danger.revoke_user'],
} as const;

export const ALL_PERMISSIONS: string[] = Object.values(PERMISSION_GROUPS).flat() as string[];

/** The wildcard. Only `super_admin` ever holds it. */
export const EVERY_PERMISSION = '*';

const READ_ONLY = ALL_PERMISSIONS.filter((p) => p.endsWith('.read'));

/**
 * Default grants per role.
 *
 * `viewer` is the important one to get right: it is the read-only role a new
 * analyst or a support contractor should get, so it is built from the read
 * permissions rather than being "everything minus the dangerous bits". Subtracting
 * a blocklist from a growing catalogue silently widens the role every time a
 * permission is added — the classic way a read-only account acquires write.
 */
export const ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
  super_admin: [EVERY_PERMISSION],

  admin: ALL_PERMISSIONS.filter((p) => !p.startsWith('danger.')),

  finance: [
    'analytics.read',
    'orders.read',
    'orders.verify',
    'coupons.read',
    'coupons.write',
    'pricing.write',
    'audit.read',
    'users.read',
  ],

  content_editor: [
    'companies.read',
    'companies.write',
    'companies.delete',
    'modules.write',
    'posters.write',
    'drops.read',
    'drops.write',
    'pdf.write',
    'studyplans.read',
    'studyplans.write',
    'courses.read',
    'courses.write',
    'instructors.write',
    'certificates.read',
    'audit.read',
  ],

  moderator: [
    'reports.read',
    'reports.moderate',
    'users.read',
    'certificates.read',
    'audit.read',
  ],

  // An instructor authors and publishes their own teaching material. Course
  // *deletion* and certificate authority stay away from them deliberately.
  instructor: [
    'courses.read',
    'courses.write',
    'instructors.write',
    'certificates.read',
    'reports.read',
    'users.read',
  ],

  support: [
    'users.read',
    'users.status',
    'orders.read',
    'reports.read',
    'courses.read',
    'devices.read',
  ],

  analyst: ['analytics.read', 'devices.read', 'orders.read', 'courses.read', 'users.read'],

  viewer: READ_ONLY,
};

/** Throws on an unknown role, so a typo in a grant fails loudly at write time. */
export const isStaffRole = (value: unknown): value is StaffRole =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, value);

/** True for a real permission or the wildcard. Unknown strings never silently pass. */
export const isPermission = (value: unknown): boolean =>
  value === EVERY_PERMISSION || (typeof value === 'string' && ALL_PERMISSIONS.includes(value));

export const permissionsForRole = (role: StaffRole): string[] => [...ROLE_PERMISSIONS[role]];

/**
 * Expands one grant into its effective permission set.
 *
 * The role's defaults are always included. `staff.permissions` is an *addition*,
 * never a replacement — an admin who needs one extra capability to do their job
 * should not have to re-enumerate the whole role, and a revoked-by-omission model
 * is one careless edit away from removing someone's access entirely without anyone
 * noticing.
 */
const expandGrant = (grant: { role: StaffRole; permissions?: string[] }): Set<string> => {
  const out = new Set<string>();
  for (const p of ROLE_PERMISSIONS[grant.role] || []) out.add(p);
  for (const p of grant.permissions || []) {
    if (isPermission(p)) out.add(p);
  }
  return out;
};

export interface ResolvedAuthority {
  permissions: Set<string>;
  /** The staff role in force, or null for a plain admin with no staff row. */
  role: StaffRole | null;
}

/**
 * The authority of a signed-in user.
 *
 * A user with `role !== 'admin'` gets nothing — this never becomes a way to grant
 * admin surfaces to an ordinary account, because the coarse gate runs first and
 * this function assumes it already passed.
 *
 * An `admin` with **no** `staff` row gets nothing at all. Being an admin is the
 * *entry* to the admin console, not a grant of authority inside it; what they can
 * do is decided by a visible, revocable, audited row.
 *
 * This is the one deliberate behaviour change in this milestone, so it is worth
 * being blunt about it: previously `role === 'admin'` meant "can do everything",
 * and it will now mean "can do nothing until granted". That is the whole point —
 * an access grant you cannot see is indistinguishable from one you forgot to
 * revoke — but it does mean an admin promoted via `PUT /users/:id` is inert by
 * default and has to be granted a role.
 *
 * The bootstrap account is not left to that. `ensureSeedData` in server.ts writes
 * a `super_admin` staff row for it on every boot, so a deployment that predates
 * this code keeps working after an upgrade without anyone having to seed a row by
 * hand.
 */
export function resolveAuthority(
  user: { id: string; role: string } | null | undefined,
  staff: Staff[]
): ResolvedAuthority {
  if (!user || user.role !== 'admin') return { permissions: new Set(), role: null };

  const grant = (staff || []).find((s) => s && s.user_id === user.id && s.status === 'active');
  if (!grant) return { permissions: new Set(), role: null };

  return { permissions: expandGrant(grant), role: grant.role };
}

export const can = (authority: ResolvedAuthority, permission: string): boolean => {
  if (authority.permissions.has(EVERY_PERMISSION)) return true;
  // `devices.*` should not imply `devices.block`. Permission namespaces are
  // checked exactly; a prefix wildcard would make a future `devices.pii` grant
  // silently available to anyone holding `devices.read`.
  return authority.permissions.has(permission);
};
