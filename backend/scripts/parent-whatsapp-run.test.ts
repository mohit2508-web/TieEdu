// ============================================================================
// The weekly parent WhatsApp run (lib/parentWhatsappScheduler) against a
// scratch store: every off switch holds, messages are marked before sending
// (no double send on a rerun), and results are logged. Sending is stubbed.
// ============================================================================

import fs from 'fs';
import os from 'os';
import path from 'path';

const SCRATCH = path.join(os.tmpdir(), `tieedu-pwa-${process.pid}.json`);
process.env.DB_FILE = SCRATCH;
const TOKEN = 'tok_abcdefghijklmnopqrstuvwxyz';
fs.writeFileSync(SCRATCH, JSON.stringify({
  users: [{ id: 'u1', name: 'Rahul Sharma', email: 'r@x.test', parent_link: { token: TOKEN, created_at: '2026-10-01T00:00:00Z' }, parent_whatsapp_allowed: true,
    parent_whatsapp: { phone: '919876543210', lang: 'hi', subscribed_at: '2026-10-20T00:00:00Z', last_week: null, last_readiness: {} } }],
  settings: {},
}));

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

(async () => {
  // Imported after DB_FILE is set: db.ts reads it at load time.
  const { runParentWhatsapp } = await import('../src/lib/parentWhatsappScheduler');
  const { loadDb, saveDb } = await import('../src/data/db');
  const SUNDAY = new Date('2026-11-01T05:00:00Z');
  const env = { WHATSAPP_TOKEN: 't', WHATSAPP_PHONE_NUMBER_ID: '1', WHATSAPP_TEMPLATE: 'weekly', NEXT_PUBLIC_SITE_URL: 'https://site.test' } as any;
  const sent: any[] = [];
  const send = async (to: string, lang: 'hi' | 'en', params: string[]) => { sent.push({ to, lang, params }); return { ok: true, id: 'w1', error: null }; };

  check('off until an admin enables it', (await runParentWhatsapp(SUNDAY, send, env)).skipped, 'disabled');
  const db = loadDb(); db.settings = { ...(db.settings || {}), parent_whatsapp_enabled: true }; saveDb(db);
  check('needs a provider', (await runParentWhatsapp(SUNDAY, send, { NEXT_PUBLIC_SITE_URL: 'https://site.test' } as any)).skipped, 'not configured');
  check('needs the site URL', (await runParentWhatsapp(SUNDAY, send, { ...env, NEXT_PUBLIC_SITE_URL: '' })).skipped, 'NEXT_PUBLIC_SITE_URL not set');
  check('only in the Sunday window', (await runParentWhatsapp(new Date('2026-10-30T05:00:00Z'), send, env)).skipped, 'outside window');
  check('nothing sent by any of those', sent.length, 0);

  const r = await runParentWhatsapp(SUNDAY, send, env);
  check('one sent', [r.due, r.sent, r.failed], [1, 1, 0]);
  check('Hindi to the parent', [sent[0].to, sent[0].lang], ['919876543210', 'hi']);
  check('second pass the same week sends nothing', (await runParentWhatsapp(new Date(SUNDAY.getTime() + 3_600_000), send, env)).due, 0);
  check('logged', loadDb().parent_whatsapp_log.map((x: any) => [x.status, x.week]), [['sent', '2026-W44']]);

  // A provider failure is logged and not retried that week (no message storms).
  const failing = async () => ({ ok: false, id: null, error: 'Template not approved' });
  const next = new Date(SUNDAY.getTime() + 7 * 86_400_000);
  const f = await runParentWhatsapp(next, failing, env);
  check('failure counted', [f.sent, f.failed], [0, 1]);
  check('failure logged with the reason', loadDb().parent_whatsapp_log.slice(-1)[0].error, 'Template not approved');
  check('not retried the same week', (await runParentWhatsapp(new Date(next.getTime() + 3_600_000), send, env)).due, 0);

  fs.rmSync(SCRATCH, { force: true });
  console.log(`parent-whatsapp-run: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
})();
