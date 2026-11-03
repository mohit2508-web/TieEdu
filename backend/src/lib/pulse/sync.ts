import { loadDb, saveDb } from '../../data/db';
import { fetchRepo, workflowIntact, WORKFLOW_PATH } from './github';
import { review } from './review';
import { similarPairs } from './similarity';
import { pulseOf, readFiles, writeFiles, dropFiles, MAX_COMMITS_KEPT, type Flag, type Snapshot, type TestResult } from './store';

/**
 * Project Pulse — one sync of one submission (PROJECT_PULSE_PLAN.md §6):
 * GitHub → files, commits, autograder statuses → requirement review → flags →
 * snapshot. The store is re-read after every await, so a slow GitHub call never
 * overwrites what happened meanwhile. The review is cached by head sha.
 */

const running = new Set<string>();
const DAY = 86400000;

export function buildFlags(task: any, commits: Snapshot['commits'], compiles: boolean | null, workflowOk: boolean, now = Date.now()): Flag[] {
  const flags: Flag[] = [];
  const last = commits[0] ? new Date(commits[0].at).getTime() : null;
  if (last && now - last > 5 * DAY && now < new Date(task.deadline_at).getTime()) flags.push({ kind: 'inactive', text: `No commits for ${Math.floor((now - last) / DAY)} days` });
  if (commits.length && compiles === false) flags.push({ kind: 'failing', text: 'Build fails: gcc reports an error' });
  const total = commits.reduce((n, c) => n + c.add, 0);
  const big = commits.reduce((m, c) => (c.add > m.add ? c : m), commits[0] || { add: 0, sha: '' } as any);
  if (total >= 60 && big.add / total > 0.8 && commits.length > 0) flags.push({ kind: 'bulk', text: `${Math.round((big.add / total) * 100)}% of the code arrived in one commit (${big.sha})` });
  const back = commits.find((c) => Math.abs(new Date(c.pushed).getTime() - new Date(c.at).getTime()) > DAY);
  if (back) flags.push({ kind: 'backdated', text: `Commit ${back.sha}: author date and commit date differ by ${Math.round(Math.abs(new Date(back.pushed).getTime() - new Date(back.at).getTime()) / DAY)} days` });
  const late = commits.filter((c) => c.pushed > task.deadline_at);
  if (late.length) flags.push({ kind: 'late', text: `${late.length} commit${late.length > 1 ? 's' : ''} after the deadline` });
  if (task.tests.length && commits.length && !workflowOk) flags.push({ kind: 'workflow', text: 'Autograder workflow missing or edited, so test results are not trusted' });
  return flags;
}

export function testsFrom(task: any, statuses: Record<string, { state: string; description: string }>, workflowOk: boolean) {
  const build = statuses['pulse/build'];
  const compiles = build ? build.state === 'success' : null;
  const tests: Record<string, TestResult> = {};
  for (const t of task.tests) {
    const s = statuses[`pulse/${t.id}`];
    tests[t.id] = !workflowOk ? { pass: false, got: 'not trusted: autograder workflow missing or edited' }
      : !s ? { pass: false, got: build ? 'not run' : 'waiting for the autograder (GitHub Actions)' }
      : { pass: s.state === 'success', got: s.description || s.state };
  }
  return { tests, compiles };
}

export async function syncSubmission(subId: string, opts: { force?: boolean } = {}): Promise<void> {
  if (running.has(subId)) return;
  running.add(subId);
  try {
    let db = loadDb();
    let p = pulseOf(db);
    const sub = p.subs.find((s) => s.id === subId);
    const task = sub && p.tasks.find((t) => t.id === sub.task_id);
    if (!sub || !task) return;
    const cache = readFiles(subId);
    try {
      const data = await fetchRepo(sub.repo, task.assigned_at, cache);
      const sourceFiles = data.files.filter((f) => f.path !== WORKFLOW_PATH);
      const workflowOk = workflowIntact(data.files.find((f) => f.path === WORKFLOW_PATH)?.code);
      const reuse = !opts.force && sub.snap?.review_sha === data.headSha && sub.snap?.reqs;
      const rev = reuse ? { reqs: sub.snap.reqs, source: sub.snap.review_source } : data.commits.length
        ? await review(db, task, sourceFiles.map(({ path, code }) => ({ path, code })))
        : { reqs: {}, source: 'hints' as const };
      const { tests, compiles } = testsFrom(task, data.statuses, workflowOk);
      const commits = data.commits.slice(0, MAX_COMMITS_KEPT);
      const snap: Snapshot = {
        head_sha: data.headSha, synced_at: new Date().toISOString(), compiles, workflow_ok: workflowOk,
        reqs: rev.reqs, review_sha: data.headSha, review_source: rev.source, tests, commits,
        flags: buildFlags(task, commits, compiles, workflowOk), file_count: sourceFiles.length,
      };
      writeFiles(subId, { files: data.files.filter((f) => f.path !== WORKFLOW_PATH), stats: data.stats });
      db = loadDb(); p = pulseOf(db);
      const fresh = p.subs.find((s) => s.id === subId);
      if (!fresh || fresh.repo !== sub.repo) return;
      fresh.snap = snap;
      fresh.verified = !!fresh.verify_code && data.files.some((f) => /(^|\/)PULSE\.txt$/i.test(f.path) && f.code.includes(fresh.verify_code));
      if (fresh.verified) {
        fresh.verified_owner = data.owner;
        releaseOthers(p, fresh);
      }
      fresh.sync_error = null;
      fresh.last_sync_at = snap.synced_at;
      refreshSimilarity(db, task.id);
      saveDb(db);
    } catch (e: any) {
      db = loadDb(); p = pulseOf(db);
      const fresh = p.subs.find((s) => s.id === subId);
      if (fresh) { fresh.sync_error = String(e?.message || e).slice(0, 200); fresh.last_sync_at = new Date().toISOString(); saveDb(db); }
    }
  } finally {
    running.delete(subId);
  }
}

/**
 * The repo is proven to be this student's: anyone else in the task who linked it
 * is unlinked, and their teacher is told who tried.
 */
export function releaseOthers(p: any, owner: any) {
  const others = p.subs.filter((s: any) => s.task_id === owner.task_id && s.id !== owner.id && s.repo.toLowerCase() === owner.repo.toLowerCase());
  if (!others.length) return;
  const ownerRow = p.roster.find((r: any) => r.id === owner.roster_id);
  for (const s of others) {
    p.alerts.push({ task_id: s.task_id, roster_id: s.roster_id, at: new Date().toISOString(),
      text: `Linked ${s.repo}, which belongs to ${ownerRow?.name || 'another student'} (they verified it). Unlinked automatically.` });
    dropFiles(s.id);
  }
  p.subs = p.subs.filter((s: any) => !others.includes(s));
}

export function refreshSimilarity(db: any, taskId: string) {
  const p = pulseOf(db);
  const task = p.tasks.find((t) => t.id === taskId);
  if (!task) return;
  const codeOf = (files: { path: string; code: string }[]) => files.filter((f) => /\.(c|h)$/i.test(f.path)).map((f) => f.code).join('\n');
  const subs = p.subs.filter((s) => s.task_id === taskId && s.snap?.commits?.length).map((s) => ({ id: s.id, code: codeOf(readFiles(s.id).files) }));
  p.similarity[taskId] = similarPairs(subs, codeOf(task.starter || []));
}

/** Sync every linked repo of a task, a few at a time. Resolves when all are done. */
export async function syncTask(taskId: string, force = false) {
  const ids = pulseOf(loadDb()).subs.filter((s) => s.task_id === taskId).map((s) => s.id);
  const queue = [...ids];
  await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await syncSubmission(queue.shift()!, { force }); }));
  return ids.length;
}

/** Every 20 minutes: repos of open tasks not synced in the last 30 minutes (PULSE_SYNC=0 turns it off). */
export function startPulseScheduler() {
  if (process.env.PULSE_SYNC === '0' || process.env.NODE_ENV === 'test') return;
  const tick = async () => {
    try {
      const p = pulseOf(loadDb());
      const now = Date.now();
      const due = p.subs.filter((s) => {
        const t = p.tasks.find((x) => x.id === s.task_id);
        return t && t.published && now < new Date(t.deadline_at).getTime() + 3 * DAY
          && (!s.last_sync_at || now - new Date(s.last_sync_at).getTime() > 30 * 60000);
      }).slice(0, 60);
      for (const s of due) await syncSubmission(s.id);
    } catch (e: any) { console.warn('[Pulse] scheduled sync failed:', e?.message); }
  };
  setInterval(tick, 20 * 60000).unref();
}
