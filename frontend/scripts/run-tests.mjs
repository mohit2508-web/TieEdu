/**
 * Test runner for the frontend.
 *
 * There is no Jest/Vitest here, and adding one would drag a DOM environment in
 * for tests that only exercise pure functions. Instead each suite is compiled
 * with the project's own TypeScript and run on bare node.
 *
 * Constraints this works around:
 *  - `tsconfig.json` sets `noEmit`, so the runner compiles with overrides.
 *  - `module: esnext` emits `import`, which node cannot run from a `.js` file
 *    without `"type": "module"`. Emitting CommonJS sidesteps that entirely, and
 *    the suites are plain scripts with no runtime deps.
 *  - The suites must not import anything through the `@/` alias: tsc does not
 *    rewrite path aliases at emit, so the compiled output would not resolve.
 *    The check below enforces that rather than leaving it to a confusing failure.
 *
 * Suites report their own pass/fail counts and exit non-zero on failure, so the
 * runner only has to propagate exit codes.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const scriptsDir = join(root, 'scripts');
const outDir = join(root, '.test-build');

/** Imports that survive emit without alias rewriting. */
const ALIAS_IMPORT = /(?:from|import|require\()\s*['"]@\//;

/** Does this file, or anything it relatively imports, use the `@/` alias? */
const usesAlias = (file, seen = new Set()) => {
  if (seen.has(file) || !existsSync(file)) return false;
  seen.add(file);

  const text = readFileSync(file, 'utf8');
  if (ALIAS_IMPORT.test(text)) return true;

  for (const match of text.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)) {
    const target = resolve(dirname(file), match[1]);
    for (const candidate of [`${target}.ts`, `${target}.tsx`, join(target, 'index.ts')]) {
      if (usesAlias(candidate, seen)) return true;
    }
  }
  return false;
};

const main = () => {
  const suites = readdirSync(scriptsDir).filter((f) => f.endsWith('.test.ts')).sort();
  if (suites.length === 0) {
    console.log('no test suites found in scripts/');
    return 0;
  }

  for (const suite of suites) {
    if (usesAlias(join(scriptsDir, suite))) {
      console.error(`FAIL ${suite} imports through the "@/" alias, which does not survive emit`);
      console.error('     use a relative import so the suite can be compiled and run directly.');
      return 1;
    }
  }

  // A stale build directory would otherwise let a deleted suite keep "passing".
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const tsc = spawnSync(
    process.execPath,
    [
      join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      ...suites.map((s) => join(scriptsDir, s)),
      '--outDir', outDir,
      '--rootDir', root,
      '--module', 'commonjs',
      '--moduleResolution', 'node',
      '--target', 'ES2020',
      '--lib', 'ES2020',
      '--noEmit', 'false',
      '--incremental', 'false',
      '--skipLibCheck',
      '--esModuleInterop',
      '--strict',
    ],
    { cwd: root, stdio: 'inherit' }
  );

  if (tsc.status !== 0) {
    console.error('\nTypeScript failed to compile the suites.');
    return tsc.status ?? 1;
  }

  let failed = 0;
  for (const suite of suites) {
    const compiled = join(outDir, 'scripts', suite.replace(/\.ts$/, '.js'));
    if (!existsSync(compiled)) {
      console.error(`FAIL ${suite} produced no output at ${compiled}`);
      failed++;
      continue;
    }
    console.log(`\n--- ${suite}`);
    const run = spawnSync(process.execPath, [compiled], { cwd: root, stdio: 'inherit' });
    if (run.status !== 0) failed++;
  }

  rmSync(outDir, { recursive: true, force: true });

  if (failed > 0) {
    console.error(`\n${failed} of ${suites.length} suite(s) failed.`);
    return 1;
  }
  console.log(`\nall ${suites.length} suite(s) passed.`);
  return 0;
};

process.exit(main());
