/**
 * Milestones shown in the IDE's Accepted moment (PRACTICE_POLISH_PLAN.md §7): small and
 * occasional, never confetti on every submit. Based on problems solved after this one.
 */
export function milestoneFor(solved: number, total: number): string | null {
  if (solved <= 0) return null;
  if (total > 0 && solved === total) return `Every problem in the bank solved: all ${total}. Outstanding.`;
  if (solved === 1) return 'Your first problem solved. The hardest one is always the first.';
  if (solved % 10 === 0) return `That makes ${solved} problems solved.`;
  return null;
}
