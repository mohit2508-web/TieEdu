/**
 * M1 regression tests: RBAC resolution + install registry.
 *
 * Source-level (no server, no ledger) so it runs inside the normal `npm test`
 * chain and cannot touch `data/db.json`. The HTTP half of M1 is covered by
 * verify-m1-guards.live.ts, which runs against a scratch ledger.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveAuthority,
  can,
  isPermission,
  isStaffRole,
  permissionsForRole,
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
} from '../src/lib/rbac';
import { compareVersions } from '../src/lib/devices';
import type { Staff } from '../src/data/db';

// ---------------------------------------------------------------------------
// Catalogue integrity
// ---------------------------------------------------------------------------

test('every catalogue entry is a well-formed permission string', () => {
  // One or more dotted segments: `danger.broadcast.all` is deliberately three.
  for (const p of ALL_PERMISSIONS) {
    assert.match(p, /^[a-z_]+(\.[a-z_]+)+$/, `malformed permission: ${p}`);
  }
});

test('catalogue has no duplicate entries', () => {
  assert.equal(new Set(ALL_PERMISSIONS).size, ALL_PERMISSIONS.length);
});

test('every role is a recognised role and maps to a real permission list', () => {
  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
    assert.ok(isStaffRole(role), `${role} should be a valid StaffRole`);
    for (const p of perms) {
      assert.ok(
        p === '*' || ALL_PERMISSIONS.includes(p),
        `${role} references unknown permission ${p}`
      );
    }
  }
});

test('unknown permission strings are rejected rather than passing through', () => {
  assert.equal(isPermission('devices.read'), true);
  assert.equal(isPermission('devices.pii'), false);
  assert.equal(isPermission('totally.made.up'), false);
  assert.equal(isPermission(''), false);
  assert.equal(isPermission(null), false);
});

test('isStaffRole rejects prototype keys like constructor', () => {
  // hasOwnProperty-guarded, so a role of "constructor" cannot resolve.
  assert.equal(isStaffRole('constructor'), false);
  assert.equal(isStaffRole('__proto__'), false);
  assert.equal(isStaffRole('toString'), false);
});

// ---------------------------------------------------------------------------
// viewer is genuinely read-only
// ---------------------------------------------------------------------------

test('viewer role holds no write permission', () => {
  const perms = permissionsForRole('viewer');
  assert.ok(perms.length > 0, 'viewer should still have read access');

  const writes = perms.filter((p) => !p.endsWith('.read'));
  assert.deepEqual(writes, [], `viewer must not hold write permissions: ${writes.join(', ')}`);

  assert.ok(!perms.some((p) => p.startsWith('danger.')));
});

test('danger permissions are only held by super_admin', () => {
  const dangers = ALL_PERMISSIONS.filter((p) => p.startsWith('danger.'));
  assert.ok(dangers.length > 0, 'danger group should not be empty');

  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
    if (role === 'super_admin') continue;
    assert.ok(
      !perms.some((p) => p.startsWith('danger.')),
      `${role} must not hold a danger permission`
    );
  }
});

test('admin role has everything except danger', () => {
  const perms = permissionsForRole('admin');
  const expected = ALL_PERMISSIONS.filter((p) => !p.startsWith('danger.'));
  assert.deepEqual([...perms].sort(), [...expected].sort());
});

// ---------------------------------------------------------------------------
// resolveAuthority
// ---------------------------------------------------------------------------

const staff = (partial: Partial<Staff>): Staff => ({
  id: 'staff-1',
  user_id: 'u1',
  role: 'analyst',
  permissions: [],
  status: 'active',
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  ...partial,
});

test('a non-admin resolves to no permissions', () => {
  const auth = resolveAuthority({ id: 'u1', role: 'user' }, [staff({})]);
  assert.equal(auth.role, null);
  assert.equal(can(auth, 'devices.read'), false);
  assert.equal(can(auth, 'orders.verify'), false);
});

test('a null user resolves to no permissions', () => {
  assert.equal(can(resolveAuthority(null, []), 'analytics.read'), false);
  assert.equal(can(resolveAuthority(undefined, []), 'analytics.read'), false);
});

test('an admin with no staff row is inert — this is the deliberate change', () => {
  // Previously role === 'admin' meant full access. Now it means "entry to the
  // console", and the actual authority is the explicit, revocable grant.
  const auth = resolveAuthority({ id: 'u1', role: 'admin' }, []);
  assert.equal(auth.role, null);
  assert.equal(can(auth, 'analytics.read'), false);
  assert.equal(can(auth, 'companies.read'), false);
  assert.equal(can(auth, 'danger.maintenance'), false);
});

test('an admin with a super_admin grant holds every permission', () => {
  const auth = resolveAuthority({ id: 'u1', role: 'admin' }, [staff({ role: 'super_admin' })]);
  assert.equal(auth.role, 'super_admin');
  for (const p of ALL_PERMISSIONS) {
    assert.equal(can(auth, p), true, `super_admin should hold ${p}`);
  }
});

test('an admin honours their staff role, not the user role', () => {
  const auth = resolveAuthority({ id: 'u1', role: 'admin' }, [staff({ role: 'support' })]);
  assert.equal(auth.role, 'support');
  assert.equal(can(auth, 'users.read'), true); // support default
  assert.equal(can(auth, 'users.status'), true);
  assert.equal(can(auth, 'companies.write'), false);
  assert.equal(can(auth, 'courses.delete'), false);
});

test('a suspended grant grants nothing', () => {
  const auth = resolveAuthority({ id: 'u1', role: 'admin' }, [staff({ status: 'suspended' })]);
  assert.equal(auth.role, null);
  assert.equal(can(auth, 'users.read'), false);
});

test('explicit permissions are additive to the role defaults', () => {
  // The documented behaviour: `permissions` adds to the role, never replaces it.
  // An admin granted one extra capability must not silently lose the rest of it.
  const auth = resolveAuthority(
    { id: 'u1', role: 'admin' },
    [staff({ role: 'support', permissions: ['courses.delete'] })]
  );
  assert.equal(can(auth, 'users.read'), true, 'role default should survive');
  assert.equal(can(auth, 'courses.delete'), true, 'explicit grant should apply');
});

test('an unknown permission in a grant is dropped, not honoured', () => {
  const auth = resolveAuthority(
    { id: 'u1', role: 'admin' },
    [staff({ role: 'support', permissions: ['devices.read', 'devices.pii'] })]
  );
  assert.equal(can(auth, 'devices.read'), true);
  assert.equal(can(auth, 'devices.pii'), false);
});

test('a grant for a different user is not applied', () => {
  const auth = resolveAuthority({ id: 'u1', role: 'admin' }, [staff({ user_id: 'someone-else' })]);
  assert.equal(auth.role, null);
  assert.equal(can(auth, 'users.read'), false);
});

test('devices.read does not imply devices.block', () => {
  // Namespaces are matched exactly on purpose: a prefix wildcard would mean a
  // future devices.pii grant leaks to anyone holding devices.read.
  const auth = resolveAuthority(
    { id: 'u1', role: 'admin' },
    [staff({ role: 'support', permissions: ['devices.read'] })]
  );
  assert.equal(can(auth, 'devices.read'), true);
  assert.equal(can(auth, 'devices.block'), false);
});

test('malformed staff rows do not throw', () => {
  const junk = [null, undefined, {}, { user_id: 'u1' }, { user_id: 'u1', role: 'admin' }] as any;
  const auth = resolveAuthority({ id: 'u1', role: 'admin' }, junk);
  assert.equal(auth.role, null);
});

// ---------------------------------------------------------------------------
// Version comparison (drives the update_required check)
// ---------------------------------------------------------------------------

test('compareVersions orders releases numerically, not lexically', () => {
  // '1.10.0' > '1.9.0' as strings ('1' > '9' is false... '1.1' < '1.9' lexically),
  // which would invert the comparison and block the wrong clients.
  assert.equal(compareVersions('1.10.0', '1.9.0'), 1);
  assert.equal(compareVersions('1.9.0', '1.10.0'), -1);
  assert.equal(compareVersions('2.0.0', '2.0.0'), 0);
});

test('compareVersions tolerates a leading v and missing segments', () => {
  assert.equal(compareVersions('v1.2.3', '1.2.3'), 0);
  assert.equal(compareVersions('1.2', '1.2.0'), 0);
  assert.equal(compareVersions('1.2.1', '1.2'), 1);
});

test('compareVersions treats junk segments as zero instead of NaN', () => {
  // The requirement is only that the result is a real number and never NaN: NaN
  // makes every comparison operator false, so `update_required` would go quiet
  // rather than obviously wrong. Junk reads as 0, so '1.x.3' == '1.0.3'.
  assert.equal(Number.isNaN(compareVersions('1.x.3', '1.0.3')), false);
  assert.equal(compareVersions('1.x.3', '1.0.3'), 0);

  // A fully unparseable version falls below any real one rather than comparing
  // as equal, so a malformed min-version cannot silently read as "up to date".
  assert.equal(compareVersions('total-garbage', '0.0.1'), -1);
  assert.equal(compareVersions('0.0.1', 'total-garbage'), 1);
});