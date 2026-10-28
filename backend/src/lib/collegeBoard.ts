/**
 * College leaderboard (F2): this week's points among students of one college.
 *
 * The rules (set by the platform owner):
 *  - Opt-in. Nobody is listed until they turn it on (`user.college_board`),
 *    and they choose first name or initials.
 *  - Weekly points only, from the XP ledger, resetting Monday 00:00 India time,
 *    so a newcomer can top it in their first week.
 *  - Seen only by signed-in students of the same college (the route checks
 *    membership before calling this).
 * A student who has not opted in still sees their own points and where they
 * would place, without appearing to anyone else.
 */
import { displayName } from './offerWall';
import { addDays, istDate } from './streak';

export const BOARD_SIZE = 50;
export type BoardNameMode = 'first_name' | 'initials';

/** Monday of the India week containing `now`, as YYYY-MM-DD. */
export function weekStart(now = new Date()): string {
  const day = istDate(now);
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, -((dow + 6) % 7));
}

export function weeklyPoints(db: any, ids: Set<string>, now = new Date()): Map<string, number> {
  const from = weekStart(now);
  const pts = new Map<string, number>();
  for (const e of db.xp_ledger || []) {
    if (!ids.has(e.user_id) || !e.created_at) continue;
    if (istDate(new Date(e.created_at)) < from) continue;
    pts.set(e.user_id, (pts.get(e.user_id) || 0) + (Number(e.xp) || 0));
  }
  return pts;
}

export function setBoardChoice(db: any, userId: string, input: any) {
  const user = (db.users || []).find((u: any) => u.id === userId);
  if (!user) throw new Error('Account not found.');
  const mode: BoardNameMode = input?.name_mode === 'initials' ? 'initials' : 'first_name';
  user.college_board = { on: input?.on === true, name_mode: mode };
  return user.college_board;
}

export function collegeBoard(db: any, collegeName: string, rosterIds: string[], viewerId: string, now = new Date()) {
  const ids = new Set(rosterIds);
  const users = new Map<string, any>((db.users || []).filter((u: any) => ids.has(u.id)).map((u: any) => [u.id, u]));
  const pts = weeklyPoints(db, ids, now);
  const listed = [...users.values()]
    .filter((u) => u.college_board?.on === true && !u.disabled)
    .map((u) => ({ id: u.id, name: displayName(u.name || '', u.college_board.name_mode === 'initials' ? 'initials' : 'first_name'), points: pts.get(u.id) || 0 }))
    .filter((x) => x.points > 0)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  // Competition ranking: equal points share a rank.
  let rank = 0;
  let prev = -1;
  const ranked = listed.map((x, i) => {
    if (x.points !== prev) { rank = i + 1; prev = x.points; }
    return { rank, name: x.name, points: x.points, me: x.id === viewerId };
  });
  const viewer = users.get(viewerId);
  const myPoints = pts.get(viewerId) || 0;
  const myOn = viewer?.college_board?.on === true;
  const wouldBe = myPoints > 0 ? listed.filter((x) => x.id !== viewerId && x.points > myPoints).length + 1 : null;
  return {
    college: collegeName,
    week_start: weekStart(now),
    entries: ranked.slice(0, BOARD_SIZE),
    me: { on: myOn, name_mode: viewer?.college_board?.name_mode || 'first_name', points: myPoints, rank: wouldBe },
  };
}
