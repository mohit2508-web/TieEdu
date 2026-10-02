/**
 * Makes `dotenv.config()` a no-op inside a test process.
 *
 * `src/lib/certificate.ts` loads .env itself, and it has to: it reads its signing
 * key and the public site URL at import time, while `server.ts` calls
 * `dotenv.config()` in its own body - which ES import hoisting guarantees runs
 * strictly after every imported module has evaluated. A test suite that deletes
 * those variables to assert the "unconfigured" behaviour would otherwise have
 * them refilled from the developer's real `backend/.env`, and would silently
 * assert nothing on any machine that has a working install.
 *
 * dotenv only fills variables that are *absent*, so `delete process.env.X` is
 * exactly the door this closes. Put it in `require.cache` before the module under
 * test is first required, and restore nothing: a test process wants dotenv off
 * for its whole life.
 */
export function stubDotenv(): void {
  const id = require.resolve('dotenv');
  if (require.cache[id]) return;
  require.cache[id] = {
    id,
    filename: id,
    loaded: true,
    exports: { config: () => ({ error: new Error('dotenv disabled for this test') }) },
  } as unknown as NodeModule;
}