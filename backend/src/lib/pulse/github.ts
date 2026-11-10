import { PulseError, type RepoCommit, type FileCache } from './store';

/**
 * Project Pulse — reading a student's repo from GitHub (PROJECT_PULSE_PLAN.md §6),
 * plus the autograder the repo runs on every push.
 *
 * Read-only, through the REST API with PULSE_GITHUB_TOKEN (5,000 requests/hour;
 * without it GitHub allows 60, enough only for a demo). Private repos work when
 * the token's account is added as a read collaborator. Blobs and per-commit stats
 * are cached by sha, so a re-sync of an unchanged repo costs three requests.
 */

const API = 'https://api.github.com';
// C labs, plus Swift / iOS sources (Wipro iOS labs): code, storyboards, plists, build settings.
const SOURCE_RE = /(\.(c|h|md|txt|swift|m|mm|storyboard|xib|plist|xcconfig)$)|((^|\/)(Makefile|README)$)|(^\.github\/workflows\/pulse-autograde\.yml$)/i;
/** Build output and local Xcode state are never the student's code. */
const SKIP_RE = /(^|\/)(\.build|build|DerivedData|Pods|xcuserdata)\//;
const MAX_FILES = 300;
const MAX_FILE_BYTES = 200_000;
const MAX_NEW_STATS = 120;

export const parseRepo = (input: string): string | null => {
  const m = String(input || '').trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i)
    || String(input || '').trim().match(/^([\w.-]+)\/([\w.-]+)$/);
  return m ? `${m[1]}/${m[2]}` : null;
};

const gh = async (p: string) => {
  const token = process.env.PULSE_GITHUB_TOKEN;
  const res = await fetch(API + p, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'TiEEdu-Project-Pulse', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 404) throw new PulseError(404, 'Repo not found. Make it public, or add the TiEEdu bot account as a collaborator.');
  if (res.status === 409) return null; // empty repository
  if (res.status === 403 || res.status === 429) throw new PulseError(429, 'GitHub rate limit reached. It will retry automatically.');
  if (!res.ok) throw new PulseError(502, `GitHub answered ${res.status}.`);
  return res.json() as Promise<any>;
};

export interface RepoData {
  headSha: string;
  owner: string;
  isPrivate: boolean;
  commits: RepoCommit[];
  dirs: string[];
  files: FileCache['files'];
  statuses: Record<string, { state: string; description: string }>;
  stats: FileCache['stats'];
}

export async function fetchRepo(repo: string, sinceIso: string, cache: FileCache): Promise<RepoData> {
  const meta = await gh(`/repos/${repo}`);
  const branch = encodeURIComponent(meta.default_branch || 'main');
  const head = await gh(`/repos/${repo}/commits?sha=${branch}&per_page=1`);
  if (!head || !head.length) return { headSha: '', owner: String(meta.owner?.login || repo.split('/')[0]), isPrivate: !!meta.private, commits: [], dirs: [], files: [], statuses: {}, stats: cache.stats };
  const headSha: string = head[0].sha;

  const raw: any[] = [];
  for (let page = 1; page <= 3; page++) {
    const list = await gh(`/repos/${repo}/commits?sha=${branch}&since=${encodeURIComponent(sinceIso)}&per_page=100&page=${page}`);
    raw.push(...(list || []));
    if (!list || list.length < 100) break;
  }

  const stats = { ...cache.stats };
  let fetched = 0;
  for (const c of raw) {
    // Which files each commit touched decides which task (folder) it counts for. Cached by sha: a commit never changes.
    if (stats[c.sha]?.files || fetched >= MAX_NEW_STATS) continue;
    const one = await gh(`/repos/${repo}/commits/${c.sha}`);
    stats[c.sha] = { add: one?.stats?.additions ?? 0, del: one?.stats?.deletions ?? 0,
      files: (one?.files || []).slice(0, 300).map((f: any) => ({ p: String(f.filename), a: f.additions ?? 0, d: f.deletions ?? 0 })) };
    fetched++;
  }
  const commits: RepoCommit[] = raw.map((c) => ({
    sha: String(c.sha).slice(0, 7),
    at: c.commit?.author?.date || c.commit?.committer?.date,
    pushed: c.commit?.committer?.date || c.commit?.author?.date,
    message: String(c.commit?.message || '').split('\n')[0].slice(0, 140),
    add: stats[c.sha]?.add ?? 0,
    del: stats[c.sha]?.del ?? 0,
    files: stats[c.sha]?.files ?? [],
  }));

  const tree = await gh(`/repos/${repo}/git/trees/${headSha}?recursive=1`);
  const dirs = (tree?.tree || []).filter((b: any) => b.type === 'tree' && !String(b.path).includes('/')).map((b: any) => String(b.path));
  const blobs = (tree?.tree || []).filter((b: any) => b.type === 'blob' && SOURCE_RE.test(b.path) && !SKIP_RE.test(b.path) && (b.size ?? 0) <= MAX_FILE_BYTES).slice(0, MAX_FILES);
  const known = new Map(cache.files.map((f) => [f.sha, f.code]));
  const files: FileCache['files'] = [];
  for (const b of blobs) {
    let code = known.get(b.sha);
    if (code === undefined) {
      const blob = await gh(`/repos/${repo}/git/blobs/${b.sha}`);
      code = Buffer.from(String(blob?.content || ''), 'base64').toString('utf8');
    }
    files.push({ path: b.path, sha: b.sha, code });
  }

  const statusList = (await gh(`/repos/${repo}/commits/${headSha}/statuses?per_page=100`)) || [];
  const statuses: RepoData['statuses'] = {};
  for (const s of statusList) if (!statuses[s.context]) statuses[s.context] = { state: s.state, description: s.description || '' };

  return { headSha, owner: String(meta.owner?.login || repo.split('/')[0]), isPrivate: !!meta.private, commits, dirs, files, statuses, stats };
}

// ---------------------------------------------------------------------------
// The autograder (only for tasks with "Auto-run tests" on). The workflow file is
// fixed and added once per class repo; Pulse checks it is unchanged. It runs the
// grader served by this API, which fetches each task's tests, compiles that task's
// folder with gcc and posts statuses pulse/<folder>/build, pulse/<folder>/T1 …
// ---------------------------------------------------------------------------
export const WORKFLOW_PATH = '.github/workflows/pulse-autograde.yml';

export const workflowYaml = (apiBase: string) => `name: pulse-autograde
on: [push, workflow_dispatch]
permissions:
  contents: read
  statuses: write
jobs:
  grade:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - name: TiEEdu Project Pulse autograder
        env:
          PULSE_API: ${apiBase}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: curl -fsSL "$PULSE_API/api/pulse/autograde/grader.js" -o /tmp/pulse-grader.js && node /tmp/pulse-grader.js
`;

/** True when the repo's workflow is ours, whatever API host it points at. */
export const workflowIntact = (code: string | undefined) => {
  if (!code) return false;
  const norm = (s: string) => s.replace(/\r\n/g, '\n').replace(/PULSE_API: .*/, 'PULSE_API: x').trim();
  return norm(code) === norm(workflowYaml('x'));
};

export const GRADER_JS = `// TiEEdu Project Pulse autograder. Runs inside GitHub Actions; read-only on your code.
const { spawnSync } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const API = process.env.PULSE_API, repo = process.env.GITHUB_REPOSITORY, sha = process.env.GITHUB_SHA, token = process.env.GITHUB_TOKEN;
const status = (ctx, state, desc) => fetch('https://api.github.com/repos/' + repo + '/statuses/' + sha, {
  method: 'POST', headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
  body: JSON.stringify({ context: 'pulse/' + ctx, state, description: String(desc).replace(/\\s+/g, ' ').slice(0, 138) }),
}).catch(() => {});
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name.startsWith('.') ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const norm = (s) => s.split('\\n').map((l) => l.trim().replace(/\\s+/g, ' ')).filter(Boolean);
(async () => {
  const r = await fetch(API + '/api/pulse/autograde/tests?repo=' + encodeURIComponent(repo));
  if (!r.ok) { console.log('This repo is not linked to a Project Pulse class.'); return; }
  const { tasks } = await r.json();
  for (const task of tasks) {
    if (!fs.existsSync(task.folder)) { console.log(task.folder + '/: not in the repo yet'); continue; }
    const srcs = walk(task.folder).filter((f) => f.endsWith('.c'));
    const bin = path.resolve('pulse_bin_' + task.folder.replace(/[^\w-]/g, '_'));
    const b = spawnSync('gcc', ['-Wall', '-Wextra', '-Werror', '-o', bin, ...srcs, '-lm'], { encoding: 'utf8' });
    const built = b.status === 0 && srcs.length > 0;
    const err = (b.stderr || 'no .c files found').split('\n').find((l) => /error/.test(l)) || 'build failed';
    const ctx = (id) => task.folder + '/' + id;
    await status(ctx('build'), built ? 'success' : 'failure', built ? 'compiled with gcc -Wall -Wextra -Werror' : err);
    for (const t of task.tests) {
      if (!built) { await status(ctx(t.id), 'failure', 'not run: build failed'); continue; }
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-'));
      let out = '';
      for (const run of t.input.split(/\n?---run---\n?/)) {
        const p = spawnSync(bin, [], { input: run.replace(/\n?$/, '\n'), cwd: dir, encoding: 'utf8', timeout: 5000, maxBuffer: 1 << 20 });
        out = p.error && p.error.code === 'ETIMEDOUT' ? '__TIMEOUT__' : (p.stdout || '') + (p.stderr || '');
      }
      const got = norm(out), want = norm(t.expected);
      let i = 0; for (const line of got) if (i < want.length && line.includes(want[i])) i++;
      const pass = out !== '__TIMEOUT__' && i === want.length;
      await status(ctx(t.id), pass ? 'success' : 'failure', pass ? 'as expected' : out === '__TIMEOUT__' ? 'timed out after 5 s' : 'missing: ' + want[i] + ' | got: ' + (got.slice(-2).join(' / ') || '(no output)'));
      console.log(task.folder, t.id, pass ? 'PASS' : 'FAIL');
    }
  }
  await fetch(API + '/api/pulse/autograde/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo }) }).catch(() => {});
})();
`;
