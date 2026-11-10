/**
 * Who can solve what (PRACTICE_MODE_PLAN.md §5) and each student's progress.
 * One rule for every practice screen and API:
 *   open  — free core, a company's free problems, the pack of any company that
 *           asks the problem, TieEdu membership, admins;
 *   locked — otherwise, with the company whose pack unlocks it.
 * The statement is always readable; running, approach and solutions follow this.
 */
import { isMember } from '../festival';
import { ownsCompanyPack } from '../../routes/prep.routes';
import { BANK_BY_ID, COMPANY_SETS, FREE_CORE, type BankProblem } from './bank';

export type AccessReason = 'free' | 'pack' | 'member' | 'locked';
export interface Access { open: boolean; reason: AccessReason; company: { slug: string; name: string } | null }

/** Per-request cache of pack ownership (several problems are checked at once). */
export function accessChecker(db: any, userId: string | undefined) {
  const owns = new Map<string, boolean>();
  const member = !!userId && isMember(db, userId);
  const ownsPack = (slug: string) => {
    if (!userId) return false;
    if (!owns.has(slug)) owns.set(slug, ownsCompanyPack(db, userId, slug));
    return owns.get(slug)!;
  };
  return (p: BankProblem | undefined): Access => {
    if (!p) return { open: false, reason: 'locked', company: null };
    const set = COMPANY_SETS.find((s) => p.companies.some((c) => c.slug === s.slug));
    const company = set ? { slug: set.slug, name: set.name } : null;
    if (FREE_CORE.has(p.id) || COMPANY_SETS.some((s) => s.free_ids.includes(p.id))) return { open: true, reason: 'free', company };
    for (const c of p.companies) if (ownsPack(c.slug)) return { open: true, reason: 'pack', company: { slug: c.slug, name: COMPANY_SETS.find((s) => s.slug === c.slug)?.name || c.slug } };
    if (member) return { open: true, reason: 'member', company };
    return { open: false, reason: 'locked', company };
  };
}

export const accessFor = (db: any, userId: string | undefined, id: string) => accessChecker(db, userId)(BANK_BY_ID.get(id));

export interface ProblemProgress { solved: boolean; attempted: boolean; best_passed: number; total: number; last_at: string; submissions: number }

/** The student's progress per problem, from their practice submissions (test submissions count too). */
export function progressFor(db: any, userId: string | undefined): Map<string, ProblemProgress> {
  const out = new Map<string, ProblemProgress>();
  if (!userId) return out;
  for (const s of db.code_submissions || []) {
    if (s.user_id !== userId) continue;
    const cur = out.get(s.problem_id) || { solved: false, attempted: true, best_passed: 0, total: s.total, last_at: s.at, submissions: 0 };
    cur.submissions++;
    if (s.verdict === 'accepted') cur.solved = true;
    if (s.passed > cur.best_passed) { cur.best_passed = s.passed; cur.total = s.total; }
    if (s.at > cur.last_at) cur.last_at = s.at;
    out.set(s.problem_id, cur);
  }
  return out;
}

export const statusOf = (pr: ProblemProgress | undefined): 'solved' | 'attempted' | 'todo' => (pr?.solved ? 'solved' : pr ? 'attempted' : 'todo');
