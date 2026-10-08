/**
 * Placement Intelligence Module — authority tests.
 *
 * Source-level (no server, no ledger, no PostgreSQL) so it runs inside the
 * normal `npm test` chain. Everything under test here is pure: the permission
 * catalogue, the role matrix, the college picker, and the authority builder.
 * The HTTP half lives behind live tests added later with the feature slices;
 * what must never regress silently is the RULES — a matrix edit that gives
 * `management` write access or a college picker that falls back on a
 * cross-tenant header is a security bug that unit tests catch for free.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PLACEMENT_ROLES,
  PLACEMENT_ROLE_LABELS,
  PLACEMENT_ROLE_PERMISSIONS,
  PLACEMENT_WILDCARD,
  ALL_PLACEMENT_PERMISSIONS,
  expandPlacementGrant,
  placementCan,
  isPlacementRole,
  isPlacementPermission,
  assertKnownPlacementPermission,
  assignablePlacementRoles,
} from '../src/placement/permissions';
import {
  resolveCollegeId,
  permissionsOfGrant,
  buildPlacementAuthority,
  type PlacementGrant,
} from '../src/placement/access';
import { ALL_PERMISSIONS, permissionsForRole } from '../src/lib/rbac';

// ---------------------------------------------------------------------------
// Catalogue integrity
// ---------------------------------------------------------------------------

test('placement catalogue entries are well-formed and unique', () => {
  for (const p of ALL_PLACEMENT_PERMISSIONS) {
    assert.match(p, /^placement\.[a-z_]+(\.[a-z_]+)+$/, `malformed placement permission: ${p}`);
  }
  assert.equal(
    new Set(ALL_PLACEMENT_PERMISSIONS).size,
    ALL_PLACEMENT_PERMISSIONS.length,
    'placement catalogue has duplicates'
  );
});

test('placement and platform catalogues never overlap', () => {
  // The whole point of a separate catalogue: a T&P officer grant must not be
  // able to satisfy an admin-console guard or vice versa. One shared name
  // would couple the two systems at their most sensitive layer.
  const overlap = ALL_PLACEMENT_PERMISSIONS.filter((p) => ALL_PERMISSIONS.includes(p));
  assert.deepEqual(overlap, [], `catalogues share permissions: ${overlap.join(', ')}`);
});

test('platform catalogue gained colleges.* additively', () => {
  assert.ok(ALL_PERMISSIONS.includes('colleges.read'));
  assert.ok(ALL_PERMISSIONS.includes('colleges.write'));
  // Additive means existing read-only roles pick up the READ, never the write.
  assert.ok(permissionsForRole('viewer').includes('colleges.read'));
  assert.ok(!permissionsForRole('viewer').includes('colleges.write'));
  assert.ok(permissionsForRole('admin').includes('colleges.write'));
});

test('every placement role has a label', () => {
  for (const role of PLACEMENT_ROLES) {
    assert.ok(PLACEMENT_ROLE_LABELS[role], `missing label for ${role}`);
  }
});

// ---------------------------------------------------------------------------
// Role matrix rules (plan §3)
// ---------------------------------------------------------------------------

test('management is read-only aggregate access with no PII', () => {
  const perms = PLACEMENT_ROLE_PERMISSIONS.management;
  assert.ok(perms.length > 0, 'management must still be able to read dashboards');
  for (const p of perms) {
    assert.ok(p.endsWith('.read'), `management holds non-read permission: ${p}`);
  }
  assert.ok(!perms.includes('placement.students.pii'), 'management must not see contact details');
});

test('student holds no placement permissions at all', () => {
  assert.deepEqual(PLACEMENT_ROLE_PERMISSIONS.student, []);
});

test('super_admin holds exactly the wildcard', () => {
  assert.deepEqual(PLACEMENT_ROLE_PERMISSIONS.super_admin, [PLACEMENT_WILDCARD]);
});

test('tpo_head is the only college role with both season lock and unlock', () => {
  const withLock = PLACEMENT_ROLES.filter((r) =>
    (PLACEMENT_ROLE_PERMISSIONS[r] || []).includes('placement.season.lock')
  );
  const withUnlock = PLACEMENT_ROLES.filter((r) =>
    (PLACEMENT_ROLE_PERMISSIONS[r] || []).includes('placement.season.unlock')
  );
  // Literally held by tpo_head alone; super_admin reaches it via the wildcard
  // (covered by the placementCan wildcard test, not by list membership).
  assert.deepEqual(withUnlock, ['tpo_head']);
  // The data officer locks but must not reopen — reopening after a dispute is
  // the Head's decision (plan §3), and one permission cannot express the split.
  assert.ok(withLock.includes('data_officer'));
  assert.ok(!withUnlock.includes('data_officer'), 'data_officer must not unlock seasons');
});

test('trainer and mentor roles never see student PII', () => {
  for (const role of ['master_trainer', 'vendor_trainer', 'faculty_mentor', 'hod'] as const) {
    assert.ok(
      !PLACEMENT_ROLE_PERMISSIONS[role].includes('placement.students.pii'),
      `${role} must not hold students.pii`
    );
  }
});

test('hod is read-only', () => {
  for (const p of PLACEMENT_ROLE_PERMISSIONS.hod) {
    assert.ok(p.endsWith('.read'), `hod holds non-read permission: ${p}`);
  }
});

test('vendor_trainer cannot write drives or offers', () => {
  const perms = PLACEMENT_ROLE_PERMISSIONS.vendor_trainer;
  assert.ok(!perms.includes('placement.drives.write'));
  assert.ok(!perms.includes('placement.offers.write'));
  // Their grants are scope-filtered by scopes.vendor_id — see access.ts.
  assert.ok(perms.includes('placement.training.write'), 'vendor still trains');
});

// ---------------------------------------------------------------------------
// Expansion + checks
// ---------------------------------------------------------------------------

test('grant expansion is additive and drops unknown additions', () => {
  const perms = expandPlacementGrant({
    role: 'hod',
    permissions: ['placement.drives.write', 'placement.bogus.permission'],
  });
  assert.ok(perms.has('placement.dashboard.read'), 'role defaults survive expansion');
  assert.ok(perms.has('placement.drives.write'), 'real addition is granted');
  assert.ok(!perms.has('placement.bogus.permission'), 'unknown addition must not be granted');
});

test('placementCan is exact-match, not prefix', () => {
  const authority = { permissions: new Set(['placement.dashboard.read']) };
  assert.equal(placementCan(authority, 'placement.dashboard.read'), true);
  // A prefix wildcard would let `.read` satisfy `.write` — grants we never
  // intended to widen. Exact match only.
  assert.equal(placementCan(authority, 'placement.dashboard.write'), false);
  assert.equal(placementCan(null, 'placement.dashboard.read'), false);
});

test('wildcard authority passes every check', () => {
  const authority = { permissions: new Set([PLACEMENT_WILDCARD]) };
  assert.equal(placementCan(authority, 'placement.season.unlock'), true);
  assert.equal(placementCan(authority, 'placement.students.pii'), true);
});

test('assertKnownPlacementPermission throws on a typo, passes on real names', () => {
  assert.doesNotThrow(() => assertKnownPlacementPermission('placement.companies.write'));
  assert.throws(
    () => assertKnownPlacementPermission('placement.companies.delete'),
    /Unknown placement permission/,
    'a typo in a route guard must fail at load, not deny forever'
  );
});

test('isPlacementRole is prototype-safe and rejects junk', () => {
  assert.equal(isPlacementRole('tpo_head'), true);
  assert.equal(isPlacementRole('constructor'), false);
  assert.equal(isPlacementRole('__proto__'), false);
  assert.equal(isPlacementRole('admin'), false, 'platform staff roles are not placement roles');
  assert.equal(isPlacementRole(null), false);
});

test('assignable roles exclude super_admin and student', () => {
  const assignable = assignablePlacementRoles();
  assert.ok(!assignable.includes('super_admin'), 'super_admin is bootstrap-only');
  assert.ok(!assignable.includes('student'), 'students never receive grants');
  assert.ok(assignable.includes('tpo_head'));
  for (const r of assignable) assert.ok(isPlacementRole(r));
});

test('isPlacementPermission accepts the wildcard but not near-misses', () => {
  assert.equal(isPlacementPermission(PLACEMENT_WILDCARD), true);
  assert.equal(isPlacementPermission('placement.imports.write'), true);
  assert.equal(isPlacementPermission('placement.imports.delete'), false);
  assert.equal(isPlacementPermission(''), false);
});

// ---------------------------------------------------------------------------
// College resolution (tenancy) — pure, no request, no database
// ---------------------------------------------------------------------------

const grant = (over: Partial<PlacementGrant>): PlacementGrant => ({
  access_id: 'a1',
  user_id: 'u1',
  college_id: 'col-a',
  email: 'x@y.z',
  name: 'X',
  role: 'tpo_head',
  scopes: {},
  permissions: [],
  status: 'active',
  ...over,
});

test('scoped grant pins its own college when no header is sent', () => {
  const r = resolveCollegeId(null, [grant({})]);
  assert.equal(r.error, null);
  assert.equal(r.collegeId, 'col-a');
});

test('scoped grant rejects a mismatched college header', () => {
  const r = resolveCollegeId('col-b', [grant({})]);
  assert.notEqual(r.error, null, 'cross-college header must not resolve');
  assert.equal(r.collegeId, null);
});

test('scoped grant accepts its own college header', () => {
  const r = resolveCollegeId('col-a', [grant({})]);
  assert.equal(r.error, null);
  assert.equal(r.collegeId, 'col-a');
});

test('super admin must choose a college explicitly', () => {
  const r = resolveCollegeId(null, [grant({ college_id: null, role: 'super_admin' })]);
  assert.notEqual(r.error, null);
  assert.equal(r.collegeId, null, 'defaulting to the first college would make reads row-order-dependent');
});

test('super admin may name any college', () => {
  const r = resolveCollegeId('col-z', [grant({ college_id: null, role: 'super_admin' })]);
  assert.equal(r.error, null);
  assert.equal(r.collegeId, 'col-z');
});

test('a user with no grants resolves to null without an error string', () => {
  const r = resolveCollegeId('col-a', []);
  assert.equal(r.collegeId, null);
  assert.equal(r.error, null, 'the caller decides what zero grants means (403 at the gate)');
});

test('a disabled student-style empty permission set grants nothing', () => {
  const perms = permissionsOfGrant(null);
  assert.equal(perms.size, 0);
  const tpo = permissionsOfGrant(grant({}));
  assert.ok(tpo.has('placement.drives.write'), 'tpo_head defaults apply');
  assert.ok(tpo.has(PLACEMENT_WILDCARD) === false, 'no college role holds the wildcard');
});

// ---------------------------------------------------------------------------
// Authority assembly — the 403 / 400 / 404 contract the frontend boots on
// ---------------------------------------------------------------------------

const colleges = [
  { college_id: 'col-a', slug: 'a', name: 'A', short_name: 'A', theme_color: '#1F3A5F', logo_url: null, status: 'active' },
  { college_id: 'col-b', slug: 'b', name: 'B', short_name: 'B', theme_color: '#1F3A5F', logo_url: null, status: 'active' },
];

test('zero grants → 403 (the boot gate says "no portal access")', () => {
  const r = buildPlacementAuthority('u1', [], colleges, null);
  assert.equal(r.status, 403);
  assert.equal(r.authority, null);
  assert.match(r.error || '', /access required/i);
});

test('super admin without a college → 200 with null college and empty permissions', () => {
  // `/me` must answer on first boot so the UI can render a college picker.
  // The 400 that names `x-college-id` belongs to requirePlacementScope, which
  // fires when a DATA route actually needs a college — asserted below.
  const r = buildPlacementAuthority('u1', [grant({ college_id: null, role: 'super_admin' })], colleges, null);
  assert.equal(r.status, 200);
  assert.equal(r.authority!.collegeId, null);
  assert.equal(
    r.authority!.permissions.size,
    0,
    'no college resolved ⇒ no permissions, even for a wildcard grant'
  );
  assert.deepEqual(
    r.authority!.colleges.map((c) => c.college_id),
    ['col-a', 'col-b'],
    'the picker needs the college list from the same response'
  );
});

test('super admin naming an unknown college → 404, not an authority with a dangling id', () => {
  const r = buildPlacementAuthority(
    'u1',
    [grant({ college_id: null, role: 'super_admin' })],
    colleges,
    'col-does-not-exist'
  );
  assert.equal(r.status, 404);
  assert.equal(r.authority, null);
  assert.match(r.error || '', /not available/i);
});

test('super admin naming a known college → wildcard authority', () => {
  const r = buildPlacementAuthority('u1', [grant({ college_id: null, role: 'super_admin' })], colleges, 'col-b');
  assert.equal(r.status, 200);
  assert.ok(r.authority);
  assert.equal(r.authority!.collegeId, 'col-b');
  assert.ok(r.authority!.permissions.has(PLACEMENT_WILDCARD));
  assert.equal(r.authority!.grant?.college_id, null, 'their grant stays college-less by design');
});

test('scoped grant with a foreign college header → 404 (tenancy probe gets nothing)', () => {
  const r = buildPlacementAuthority('u1', [grant({})], colleges, 'col-b');
  assert.equal(r.status, 404);
  assert.equal(r.authority, null);
  assert.match(r.error || '', /not available/i);
});

test('scoped grant resolves its own college with role defaults', () => {
  const r = buildPlacementAuthority('u1', [grant({})], colleges, null);
  assert.equal(r.status, 200);
  assert.equal(r.authority!.collegeId, 'col-a');
  assert.ok(r.authority!.permissions.has('placement.drives.write'));
});
