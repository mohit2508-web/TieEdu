import { loadDb, saveDb } from '../../data/db';
import { fetchRepo, workflowIntact, WORKFLOW_PATH } from './github';
import { similarPairs } from './similarity';
import {
  pulseOf, readFiles, writeFiles, dropFiles, folderFiles, MAX_COMMITS_KEPT, type RepoSnapshot,
} from './store';

// Kept here too so callers and tests that used them from sync keep working.
export { buildFlags, testsFor } from './store';

/**
 * Project Pulse — one sync of one student's class repo (PROJECT_PULSE_PLAN.md §6, §12):
 * GitHub → commits (with the files each touched), files, autograder statuses →
 * snapshot. Every task of the class then reads its own folder from that one
 * snapshot, so a repo is fetched once however many tasks the class has. The store
 * is re-read after every await, so a slow GitHub call never overwrites what
 * happened meanwhile.
 */

const running = new Set<string>();
const DAY = 86400000;

export async function syncRepo(repoId: string): Promise<void> {
  if (running.has(repoId)) return;
  running.add(repoId);
  try {
    let db = loadDb();
    let p = pulseOf(db);
    const rec = p.repos.find((r) => r.id === repoId);
    const cls = rec && p.classes.find((c) => c.id === rec.class_id);
    if (!rec || !cls) return;
    const starts = p.tasks.filter((t) => t.class_id === cls.id).map((t) => t.assigned_at).sort();
    const since = starts[0] || cls.created_at;
    const cache = readFiles(repoId);
    try {
      const data = await fetchRepo(rec.repo, since, cache);
      const snap: RepoSnapshot = {
        head_sha: data.headSha, synced_at: new Date().toISOString(), commits: data.commits.slice(0, MAX_COMMITS_KEPT),
        statuses: data.statuses, workflow_ok: workflowIntact(data.files.find((f) => f.path === WORKFLOW_PATH)?.code), dirs: data.dirs,
      };
      writeFiles(repoId, { files: data.files.filter((f) => f.path !== WORKFLOW_PATH), stats: data.stats });
      db = loadDb(); p = pulseOf(db);
      const fresh = p.repos.find((r) => r.id === repoId);
      if (!fresh || fresh.repo !== rec.repo) return;
      fresh.snap = snap;
      fresh.verified = !!fresh.verify_code && data.files.some((f) => /(^|\/)PULSE\.txt$/i.test(f.path) && f.code.includes(fresh.verify_code));
      if (fresh.verified) {
        fresh.verified_owner = data.owner;
        releaseOthers(p, fresh);
      }
      fresh.sync_error = null;
      fresh.last_sync_at = snap.synced_at;
      for (const t of p.tasks.filter((x) => x.class_id === cls.id)) refreshSimilarity(db, t.id);
      saveDb(db);
    } catch (e: any) {
      db = loadDb(); p = pulseOf(db);
      const fresh = p.repos.find((r) => r.id === repoId);
      if (fresh) { fresh.sync_error = String(e?.message || e).slice(0, 200); fresh.last_sync_at = new Date().toISOString(); saveDb(db); }
    }
  } finally {
    running.delete(repoId);
  }
}

/**
 * The repo is proven to be this student's: anyone else in the class who linked it
 * is unlinked, and their teacher is told who tried.
 */
export function releaseOthers(p: any, owner: any) {
  const others = p.repos.filter((r: any) => r.class_id === owner.class_id && r.id !== owner.id && r.repo.toLowerCase() === owner.repo.toLowerCase());
  if (!others.length) return;
  const ownerRow = p.roster.find((r: any) => r.id === owner.roster_id);
  for (const r of others) {
    p.alerts.push({ class_id: r.class_id, roster_id: r.roster_id, at: new Date().toISOString(),
      text: `Linked ${r.repo}, which belongs to ${ownerRow?.name || 'another student'} (they verified it). Unlinked automatically.` });
    dropFiles(r.id);
  }
  p.repos = p.repos.filter((r: any) => !others.includes(r));
}

/** Copy detection for one task: every student's task folder against every other's. */
export function refreshSimilarity(db: any, taskId: string) {
  const p = pulseOf(db);
  const task = p.tasks.find((t) => t.id === taskId);
  if (!task) return;
  const codeOf = (files: { path: string; code: string }[]) => files.filter((f) => /\.(c|h|swift)$/i.test(f.path)).map((f) => f.code).join('\n');
  const subs = p.repos.filter((r) => r.class_id === task.class_id && r.snap)
    .map((r) => ({ id: r.roster_id, code: codeOf(folderFiles(task, readFiles(r.id))) }))
    .filter((s) => s.code.trim());
  p.similarity[taskId] = similarPairs(subs, codeOf(task.starter || []));
}

/** Sync every linked repo of a class, four at a time. */
export async function syncClass(classId: string) {
  const ids = pulseOf(loadDb()).repos.filter((r) => r.class_id === classId).map((r) => r.id);
  const queue = [...ids];
  await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await syncRepo(queue.shift()!); }));
  return ids.length;
}

export async function syncTask(taskId: string) {
  const task = pulseOf(loadDb()).tasks.find((t) => t.id === taskId);
  return task ? syncClass(task.class_id) : 0;
}

/** Every 20 minutes: repos of classes with an open task, not synced in 30 minutes (PULSE_SYNC=0 turns it off). */
export function startPulseScheduler() {
  if (process.env.PULSE_SYNC === '0' || process.env.NODE_ENV === 'test') return;
  const tick = async () => {
    try {
      const p = pulseOf(loadDb());
      const now = Date.now();
      const open = new Set(p.tasks.filter((t) => t.published && now < new Date(t.deadline_at).getTime() + 3 * DAY).map((t) => t.class_id));
      const due = p.repos.filter((r) => open.has(r.class_id) && (!r.last_sync_at || now - new Date(r.last_sync_at).getTime() > 30 * 60000)).slice(0, 60);
      for (const r of due) await syncRepo(r.id);
    } catch (e: any) { console.warn('[Pulse] scheduled sync failed:', e?.message); }
  };
  setInterval(tick, 20 * 60000).unref();
}
