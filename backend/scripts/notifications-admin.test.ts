/**
 * Admin panel → Notifications tab: source-level guards.
 *
 * Source-level (no server, no ledger) so it runs inside the normal `npm test`
 * chain and cannot touch `data/db.json`.
 *
 * The thing being guarded is a specific past failure: the endpoint and the hook's
 * `test()` both existed, but nothing rendered the button, so an admin had no way
 * to verify push at all. A test that only checks the route exists cannot catch
 * that — the route existed. These assert the whole path end to end: endpoint
 * mounted, handler scoped to the caller, tab in the nav, tab actually rendered.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf-8');
const routes = read('src/routes/notifications.routes.ts');
const lib = read('src/lib/push.ts');
const view = read('../frontend/src/components/admin/AdminCmsView.tsx');
const tab = read('../frontend/src/components/admin/NotificationsTab.tsx');
const hook = read('../frontend/src/hooks/useWebPush.ts');
const api = read('../frontend/src/lib/api.ts');

// ---------------------------------------------------------------------------
// Backend
// ---------------------------------------------------------------------------

test('GET /notifications/mine is mounted and authenticated', () => {
  assert.match(routes, /notificationsRouter\.get\(\s*'\/mine',\s*requireAuth/);
});

test('the send-test route keeps its permission guard', () => {
  // This sends a real message through a paid provider. Losing the permission
  // check would let any signed-in student spam their own devices for free.
  assert.match(routes, /requirePermission\('broadcasts\.send'\)/);
  assert.match(routes, /requireAdmin,\s*requirePermission\('broadcasts\.send'\),\s*testPush/);
});

test('mySubscriptions cannot be pointed at another user', () => {
  const handler = lib.slice(lib.indexOf('export const mySubscriptions'));
  const body = handler.slice(0, handler.indexOf('export const testPush'));
  // No id from the query or body may reach the lookup: the route is scoped to the
  // session, so it cannot become an endpoint-directory for other accounts.
  assert.doesNotMatch(body, /req\.(query|params|body)/);
  assert.match(body, /listSubscriptionsForUser\(req\.user\.id\)/);
});

test('mySubscriptions never returns the delivery keys', () => {
  const handler = lib.slice(lib.indexOf('export const mySubscriptions'));
  const body = handler.slice(0, handler.indexOf('export const testPush'));
  // p256dh/auth are the credentials that authorise a delivery to that endpoint.
  assert.doesNotMatch(body, /keys_json/);
  // The endpoint is truncated because its path encodes a per-browser secret.
  assert.match(body, /endpoint_hint/);
});

// ---------------------------------------------------------------------------
// The gap that started this: a reachable endpoint nobody can press
// ---------------------------------------------------------------------------

test('the Notifications tab is in the admin nav', () => {
  assert.match(view, /id:\s*'notifications'/);
  assert.match(view, /label:\s*'Notifications'/);
});

test('the tab is actually rendered when selected', () => {
  // A nav entry with no render branch is exactly the failure this test exists
  // for: the button looks present and does nothing when pressed.
  assert.match(view, /activeTab === 'notifications' &&\s*<NotificationsTab\s*\/>/);
});

test('the nav entry is a member of the TabId union', () => {
  const union = view.match(/type TabId =([^;]+);/)?.[1] || '';
  assert.match(union, /'notifications'/);
});

test('the tab uses the JSON-parsing api helper, not the raw client', () => {
  // `api.post` returns the raw Response, so `.sent` reads as undefined and a
  // send that delivered nothing renders as a success.
  assert.match(tab, /sendTestPushApi|fetchMySubscriptionsApi/);
  assert.doesNotMatch(tab, /import\s+api\s+from\s+'@\/lib\/api'/);
});

test('the api layer parses the send-test body and defaults missing counts', () => {
  assert.match(api, /export const sendTestPushApi/);
  assert.match(api, /export const fetchMySubscriptionsApi/);
  assert.match(api, /sent:\s*Number\(r\?\.sent \?\? 0\)/);
});

test('the hook reports the send outcome instead of swallowing it', () => {
  // Swallowing the error made a failed send look identical to a successful one.
  assert.match(hook, /const test = async \(\)/);
  assert.match(hook, /sendTestPushApi\(\)/);
  assert.doesNotMatch(hook, /const test = async \(\) => \{\s*try \{\s*await api\.post/);
});

test('the tab tells an admin to install the PWA before blaming the feature', () => {
  // Browser tabs cannot receive push at all. Without this the first thing an
  // admin sees is a button that silently refuses.
  assert.match(tab, /Home Screen/i);
  assert.match(tab, /16\.4/);
});