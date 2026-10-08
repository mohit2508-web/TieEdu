/**
 * Placement Intelligence Module — permission catalogue and role matrix.
 *
 * Kept separate from `lib/rbac.ts` on purpose. The existing staff RBAC answers
 * "what may this admin do inside the admin console", and every one of its
 * guards runs behind the coarse `user.role === 'admin'` gate. Campus TPO users
 * are NOT admins — a T&P officer must never reach the content/commerce console —
 * so their authority needs its own gate, its own catalogue, and its own role
 * names. Sharing the catalogue would mean every `requirePermission` in the
 * admin console could silently start matching a trainer's grant.
 *
 * Two rules inherited from the module plan (§3) and enforced here:
 *   - Role defaults are additive with per-grant extra permissions, exactly like
 *     `expandGrant` in rbac.ts. A grant is never a full replacement.
 *   - `management` gets aggregate reads only — no `students.pii`, no writes.
 *
 * The wildcard `*` exists only for the placement `super_admin` (the TieEdu
 * platform owner bootstrapped at boot). No college-scoped role ever holds it.
 */

export type PlacementRole =
  | 'super_admin'
  | 'management'
  | 'tpo_head'
  | 'tpo_officer'
  | 'data_officer'
  | 'master_trainer'
  | 'vendor_trainer'
  | 'faculty_mentor'
  | 'hod'
  | 'student';

export const PLACEMENT_ROLES: PlacementRole[] = [
  'super_admin',
  'management',
  'tpo_head',
  'tpo_officer',
  'data_officer',
  'master_trainer',
  'vendor_trainer',
  'faculty_mentor',
  'hod',
  'student',
];

/** Human labels for invites, the college switcher and the admin console. */
export const PLACEMENT_ROLE_LABELS: Record<PlacementRole, string> = {
  super_admin: 'Platform super admin',
  management: 'Management (VC / Dean)',
  tpo_head: 'Training & Placement Head',
  tpo_officer: 'T&P Officer',
  data_officer: 'Placement Data Officer',
  master_trainer: 'Master Trainer',
  vendor_trainer: 'Vendor Trainer',
  faculty_mentor: 'Faculty Mentor',
  hod: 'Department HoD',
  student: 'Student',
};

export const PLACEMENT_WILDCARD = '*';

export const PLACEMENT_PERMISSION_GROUPS = {
  read: [
    'placement.dashboard.read',
    'placement.analytics.read',
    'placement.impact.read',
    'placement.forecast.read',
    'placement.companies.read',
    'placement.drives.read',
    'placement.tiers.read',
    'placement.training.read',
    'placement.interviews.read',
    'placement.projects.read',
    'placement.alerts.read',
    'placement.audit.read',
  ],

  write: [
    'placement.companies.write',
    'placement.drives.write',
    'placement.offers.write',
    'placement.tiers.write',
    'placement.training.write',
    'placement.interviews.write',
    'placement.projects.write',
    'placement.alerts.write',
  ],

  /**
   * Season lifecycle and module settings. `season.lock` and `season.unlock`
   * are deliberately separate: the plan lets the data officer lock a season
   * but only the T&P Head may reopen one (§3), and one permission cannot
   * express that split.
   */
  data: [
    'placement.imports.write',
    'placement.season.lock',
    'placement.season.unlock',
    'placement.settings.write',
    'placement.targets.write',
  ],

  /** Contact details (phone / personal email / address) — see §Security. */
  pii: ['placement.students.pii'],
} as const;

export const ALL_PLACEMENT_PERMISSIONS: string[] = Object.values(
  PLACEMENT_PERMISSION_GROUPS
).flat() as string[];

const READ_ONLY_PLACEMENT = ALL_PLACEMENT_PERMISSIONS.filter((p) => p.endsWith('.read'));

const READ_WRITE = ALL_PLACEMENT_PERMISSIONS;

/**
 * Default grants per role — the matrix from the module plan §3, encoded once.
 *
 * Scopes (department, cohort, mentee list, vendor) are NOT permissions: they
 * live on the grant row and filter rows, while permissions decide which
 * endpoints are reachable at all. `vendor_trainer` holding `training.write` is
 * safe only because every query also filters on `scopes.vendor_id`.
 */
export const PLACEMENT_ROLE_PERMISSIONS: Record<PlacementRole, string[]> = {
  super_admin: [PLACEMENT_WILDCARD],

  /** Read-only aggregates. Explicit list, never "everything minus writes". */
  management: [
    'placement.dashboard.read',
    'placement.analytics.read',
    'placement.impact.read',
    'placement.forecast.read',
  ],

  tpo_head: READ_WRITE,

  tpo_officer: [
    'placement.dashboard.read',
    'placement.analytics.read',
    'placement.companies.read',
    'placement.companies.write',
    'placement.drives.read',
    'placement.drives.write',
    'placement.offers.write',
    'placement.alerts.read',
    'placement.alerts.write',
    'placement.students.pii',
  ],

  data_officer: [
    'placement.dashboard.read',
    'placement.analytics.read',
    'placement.companies.read',
    'placement.imports.write',
    'placement.season.lock',
    'placement.audit.read',
    'placement.students.pii',
  ],

  master_trainer: [
    'placement.dashboard.read',
    'placement.analytics.read',
    'placement.tiers.read',
    'placement.tiers.write',
    'placement.training.read',
    'placement.training.write',
    'placement.interviews.read',
    'placement.interviews.write',
    'placement.projects.read',
    'placement.alerts.read',
    'placement.alerts.write',
  ],

  vendor_trainer: [
    'placement.training.read',
    'placement.training.write',
    'placement.tiers.read',
    'placement.alerts.read',
  ],

  faculty_mentor: [
    'placement.projects.read',
    'placement.projects.write',
    'placement.interviews.read',
    'placement.interviews.write',
    'placement.alerts.read',
    'placement.alerts.write',
  ],

  hod: ['placement.dashboard.read', 'placement.analytics.read'],

  /**
   * Students never hold placement permissions — their access is the
   * identity-scoped `/api/placement/student/*` routes, which resolve the row by
   * `roll_no`/user match and can only ever return their own record.
   */
  student: [],
};

/** Throws on a malformed role, so a typo in a grant fails at write time. */
export const isPlacementRole = (value: unknown): value is PlacementRole =>
  typeof value === 'string' &&
  Object.prototype.hasOwnProperty.call(PLACEMENT_ROLE_PERMISSIONS, value);

/** True for a real permission or the wildcard. Unknown strings never pass. */
export const isPlacementPermission = (value: unknown): boolean =>
  value === PLACEMENT_WILDCARD ||
  (typeof value === 'string' && ALL_PLACEMENT_PERMISSIONS.includes(value));

export const placementPermissionsForRole = (role: PlacementRole): string[] => [
  ...(PLACEMENT_ROLE_PERMISSIONS[role] || []),
];

export interface PlacementGrantLike {
  role: PlacementRole;
  permissions?: string[] | null;
}

/**
 * Expands one grant row into its effective permission set: role defaults plus
 * the grant's own additions. Additions that are not real permissions are
 * dropped rather than honoured — a revoked-by-typo permission must deny, not
 * pass, exactly like `isPermission` in rbac.ts.
 */
export function expandPlacementGrant(grant: PlacementGrantLike): Set<string> {
  const out = new Set<string>();
  for (const p of PLACEMENT_ROLE_PERMISSIONS[grant.role] || []) out.add(p);
  for (const p of grant.permissions || []) {
    if (isPlacementPermission(p)) out.add(p);
  }
  return out;
}

export interface PlacementAuthorityLike {
  permissions: Set<string>;
}

/** Exact-match check; a prefix wildcard would widen grants we never intended. */
export function placementCan(
  authority: PlacementAuthorityLike | null | undefined,
  permission: string
): boolean {
  if (!authority) return false;
  if (authority.permissions.has(PLACEMENT_WILDCARD)) return true;
  return authority.permissions.has(permission);
}

/**
 * Fails at module load, mirroring `assertKnownPermission`: a typo in a route
 * guard would otherwise deny every request forever while looking like a
 * permissions problem.
 */
export function assertKnownPlacementPermission(permission: string): void {
  if (isPlacementPermission(permission)) return;
  throw new Error(
    `Unknown placement permission "${permission}" used in a route guard. It would ` +
      `deny every request forever. Known permissions: ${ALL_PLACEMENT_PERMISSIONS.join(', ')}`
  );
}

/** For tests and the invite UI — the roles that make sense on a grant row. */
export const assignablePlacementRoles = (): PlacementRole[] =>
  PLACEMENT_ROLES.filter((r) => r !== 'super_admin' && r !== 'student');
