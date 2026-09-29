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
 *  - tsc does not rewrite path aliases at emit, so `@/types` would reach node as
 *    a literal `require("@/types")` and fail to resolve. Rather than forbid
 *    suites from touching any module that imports types from `@/types` — which
 *    is nearly every module in `src/` — the emitted JS is rewritten to relative
 *    paths after compilation. See `rewriteAliases`.
 *
 * Suites report their own pass/fail counts and exit non-zero on failure, so the
 * runner only has to propagate exit codes.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const scriptsDir = join(root, 'scripts');
const outDir = join(root, '.test-build');

/**
 * Rewrite `@/...` specifiers in the emitted JS to paths that node can resolve.
 *
 * The alias is a bundler concern, and tsc deliberately leaves it alone, so the
 * substitution has to happen once after emit. Doing it here (rather than
 * banning the alias in suites) is what lets a suite import a real `src/` module
 * and test the code that actually ships, instead of a copy.
 *
 * The target is the *emitted* copy under outDir, not the real `src/` — the
 * compiled file has to require the compiled sibling, and the emitted JS is the
 * only thing node is ever going to load.
 */
const rewriteAliases = (dir, emitSrc) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteAliases(full, emitSrc);
      continue;
    }
    if (!entry.name.endsWith('.js')) continue;
    const text = readFileSync(full, 'utf8');
    const rewritten = text.replace(/require\((["'])@\/([^"']+)\1\)/g, (_match, quote, target) => {
      let rel = relative(dirname(full), join(emitSrc, target)).split('\\').join('/');
      if (!rel.startsWith('.')) rel = `./${rel}`;
      return `require(${quote}${rel}${quote})`;
    });
    if (rewritten !== text) writeFileSync(full, rewritten);
  }
};

const main = () => {
  const suites = readdirSync(scriptsDir).filter((f) => f.endsWith('.test.ts')).sort();
  if (suites.length === 0) {
    console.log('no test suites found in scripts/');
    return 0;
  }

  // A stale build directory would otherwise let a deleted suite keep "passing".
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  // `paths` is a config-file-only option, so it cannot be passed on the tsc
  // command line. Writing a throwaway tsconfig that EXTENDS the real one is how
  // the suites get the project's own `@/*` path mapping — which they need for
  // type checking, since a `import type { X } from '@/types'` is erased at emit
  // and so is safe to compile, but tsc still has to resolve it to check it.
  // The overrides are exactly the ones the command-line flags used to carry.
  const tsconfigPath = join(outDir, 'tsconfig.test.json');
  writeFileSync(
    tsconfigPath,
    JSON.stringify(
      {
        extends: '../tsconfig.json',
        compilerOptions: {
          noEmit: false,
          outDir: './emit',
          rootDir: '..',
          module: 'commonjs',
          moduleResolution: 'node',
          target: 'ES2020',
          lib: ['ES2020'],
          incremental: false,
          skipLibCheck: true,
          esModuleInterop: true,
          strict: true,
          // The suites are plain node scripts; React/JSX and the Next plugin are
          // irrelevant here and only slow the compile down.
          jsx: 'preserve',
          plugins: [],
        },
        // Only the suites, so a broken page anywhere in src/ cannot fail the
        // unit suites — that is what `npm run typecheck` is for.
        // Paths are relative to THIS file, which lives in .test-build/.
        include: suites.map((s) => `../scripts/${s}`),
      },
      null,
      2
    )
  );

  const tsc = spawnSync(
    process.execPath,
    [
      join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      '--project', tsconfigPath,
    ],
    { cwd: root, stdio: 'inherit' }
  );

  if (tsc.status !== 0) {
    console.error('\nTypeScript failed to compile the suites.');
    return tsc.status ?? 1;
  }

  // tsc resolves `@/` for type checking but leaves it in the emitted require
  // calls, so the substitution happens here, once, before anything is run.
  rewriteAliases(join(outDir, 'emit'), join(outDir, 'emit', 'src'));

  // The emit lands under outDir/emit/scripts, because rootDir is the repo root.
  const emitScripts = join(outDir, 'emit', 'scripts');
  let failed = 0;
  for (const suite of suites) {
    const compiled = join(emitScripts, suite.replace(/\.ts$/, '.js'));
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
