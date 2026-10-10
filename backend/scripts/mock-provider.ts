/**
 * Mock assessment provider — a tiny stand-in for the external test platform.
 *
 * It implements just enough of the provider contract to exercise the whole
 * handoff locally, with no real exam engine:
 *
 *   GET  /launch?lt=...   student arrives with the one-time launch token; we
 *                         call TieEdu's /api/bridge/introspect, then show a
 *                         two-button "exam".
 *   POST /api/exam/start  we push `attempt.started` to TieEdu.
 *   POST /api/exam/finish we push `attempt.completed` with a fake score.
 *   GET  /health          liveness.
 *
 * Everything it sends to TieEdu is HMAC-signed exactly as the real provider
 * must: `X-Bridge-Signature = HMAC-SHA256(secret, `${timestamp}.${rawBody}`)`.
 *
 * Run:
 *   $env:SKILLVERIFY_BRIDGE_INTROSPECT_SECRET="..."
 *   $env:SKILLVERIFY_BRIDGE_WEBHOOK_SECRET="..."
 *   npx ts-node --transpile-only scripts/mock-provider.ts
 */
import express from 'express';
import crypto from 'crypto';

const TIEEDU_BASE = process.env.TIEEDU_BASE || 'http://localhost:5000';
const PROVIDER_CODE = process.env.BRIDGE_PROVIDER_CODE || 'skillverify';
const SECRET_PREFIX = (process.env.BRIDGE_PROVIDER_SECRET_PREFIX || 'SKILLVERIFY_BRIDGE').toUpperCase();
const PORT = Number(process.env.BRIDGE_PROVIDER_PORT || 6100);

const INTROSPECT_SECRET = (process.env[`${SECRET_PREFIX}_INTROSPECT_SECRET`] || '').trim();
const WEBHOOK_SECRET = (process.env[`${SECRET_PREFIX}_WEBHOOK_SECRET`] || '').trim();

function signedHeaders(secret: string, rawBody: string): Record<string, string> {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = crypto.createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
  return {
    'Content-Type': 'application/json',
    'X-Bridge-Provider': PROVIDER_CODE,
    'X-Bridge-Timestamp': ts,
    'X-Bridge-Signature': sig,
  };
}

async function introspect(token: string): Promise<any> {
  const raw = JSON.stringify({ token });
  const res = await fetch(`${TIEEDU_BASE}/api/bridge/introspect`, { method: 'POST', headers: signedHeaders(INTROSPECT_SECRET, raw), body: raw });
  if (!res.ok) throw new Error(`introspect ${res.status}: ${await res.text()}`);
  return res.json();
}

async function publish(event: Record<string, any>): Promise<any> {
  const raw = JSON.stringify(event);
  const res = await fetch(`${TIEEDU_BASE}/api/bridge/events`, { method: 'POST', headers: signedHeaders(WEBHOOK_SECRET, raw), body: raw });
  const text = await res.text();
  if (!res.ok) throw new Error(`events ${res.status}: ${text}`);
  return JSON.parse(text);
}

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, provider: PROVIDER_CODE, tieedu: TIEEDU_BASE }));

app.get('/launch', async (req, res) => {
  const token = String(req.query.lt || '');
  if (!token) return res.status(400).send('missing lt');
  try {
    const claims = await introspect(token);
    const examTitle = claims.drive?.title || 'Mock Exam';
    const attemptNo = claims.attempt?.number || 1;
    res.setHeader('Content-Type', 'text/html');
    return res.send(`<!doctype html><html><body style="font-family:system-ui;padding:2rem;max-width:640px;margin:auto">
      <h1>${examTitle}</h1>
      <p>Candidate <b>${claims.name || claims.sub}</b> (roll ${claims.roll_no || '—'})</p>
      <p>Attempt ${attemptNo} of ${claims.attempt?.max_attempts}. ${claims.resume ? '<b>Resuming.</b>' : ''}</p>
      <label>Your answer: <input id="ans" value="42" /></label>
      <p><button onclick="start()">Start</button> <button onclick="finish()">Submit</button></p>
      <pre id="log"></pre>
      <script>
        const state = { started:false, attemptId: 'mock-'+Date.now() };
        async function start(){ await fetch('/api/exam/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:${JSON.stringify(token)},attempt_id:state.attemptId})}); state.started=true; document.getElementById('log').textContent='started'; }
        async function finish(){ const ans=document.getElementById('ans').value; const r=await fetch('/api/exam/finish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:${JSON.stringify(token)},attempt_id:state.attemptId,answer:ans})}); document.getElementById('log').textContent=await r.text(); }
      </script>
    </body></html>`);
  } catch (e: any) {
    return res.status(502).send(`introspect failed: ${e.message}`);
  }
});

// The mock holds the claims from introspect keyed by token so the finish handler
// can echo the identifiers TieEdu needs to map the attempt back.
const claimCache = new Map<string, any>();

app.post('/api/exam/start', async (req, res) => {
  try {
    const { token, attempt_id } = req.body || {};
    const c = claimCache.get(String(token)) || (await introspect(String(token)));
    claimCache.set(String(token), c);
    await publish({
      event_id: `start-${attempt_id}`,
      event_type: 'attempt.started',
      drive_id: c.drive_id,
      test_id: c.test_id,
      tieedu_user_id: c.sub,
      provider_attempt_id: attempt_id,
      started_at: new Date().toISOString(),
    });
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

app.post('/api/exam/finish', async (req, res) => {
  try {
    const { token, attempt_id, answer } = req.body || {};
    const c = claimCache.get(String(token)) || (await introspect(String(token)));
    const score = String(answer).trim() === '42' ? 100 : 40;
    const result = await publish({
      event_id: `finish-${attempt_id}`,
      event_type: 'attempt.completed',
      drive_id: c.drive_id,
      test_id: c.test_id,
      tieedu_user_id: c.sub,
      provider_attempt_id: attempt_id,
      score,
      max_score: 100,
      percentage: score,
      passed: score >= 50,
      disqualified: false,
      submitted_at: new Date().toISOString(),
    });
    return res.json(result);
  } catch (e: any) {
    return res.status(502).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔬 [MockProvider] listening on http://localhost:${PORT} -> TieEdu ${TIEEDU_BASE} (provider=${PROVIDER_CODE})`);
  if (!INTROSPECT_SECRET || !WEBHOOK_SECRET) {
    console.log('⚠️  [MockProvider] secrets are not set; set ' + SECRET_PREFIX + '_INTROSPECT_SECRET and ' + SECRET_PREFIX + '_WEBHOOK_SECRET.');
  }
});
