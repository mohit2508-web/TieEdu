// ============================================================================
// COMMAND PALETTE RANKING
//
// Pure functions, no React and no `next/router`, so the ranking is unit
// testable on bare node (see `scripts/palette.test.ts`).
//
// The palette replaced a search box that only matched company names, tags and
// industry — which made it useless for the one thing people press ⌘K to do:
// go somewhere. Typing "pricing" returned nothing, because "Pricing" is an
// anchor on the homepage, not a company. Destinations are now first-class
// search results, and company vault matches are ranked below them for the same
// query, because a student typing "compare" wants the compare page rather than
// a company whose name happens to contain those letters.
// ============================================================================

import {
  ALL_NAV_ITEMS,
  NAV_ACTIONS,
  isAdminRole,
  type NavActionItem,
  type NavItem,
  type NavRole,
} from './navConfig';

export type CommandGroupId = 'action' | 'page';

export interface Command {
  id: string;
  group: CommandGroupId;
  label: string;
  description: string;
  href?: string;
  keywords: string[];
  iconName: string;
}

/** Words the product is full of that no label contains. */
const GLOBAL_KEYWORDS: Record<string, string[]> = {
  vaults: ['companies', 'browse', 'home', 'start'],
  compare: ['vs', 'versus', 'difference', 'side by side'],
  freeCourse: ['free', 'xp', 'practice', 'interview'],
  courses: ['catalog', 'python', 'c programming', 'paid'],
  studyPlan: ['plan', 'schedule', 'phases', 'timeline', 'progress'],
  myCourses: ['enrolled', 'certificates', 'certificate'],
  account: ['profile', 'orders', 'unlocks', 'password', 'settings'],
  campus: ['tpo', 'cohort', 'college'],
  admin: ['cms', 'moderation', 'manage', 'backend'],
  pricing: ['price', 'cost', 'rates', 'fees', 'plans'],
  search: ['find', 'jump', 'go to'],
  cart: ['checkout', 'buy', 'payment', 'bag'],
  leaderboard: ['rank', 'ranking', 'streak', 'xp', 'top'],
};

/**
 * Everything reachable by keyboard, for a given role.
 *
 * `adminOnly` destinations are filtered here rather than at render time so the
 * count in the palette footer matches what is actually listed.
 */
export const buildCommands = (role: NavRole): Command[] => {
  const commands: Command[] = Object.values(NAV_ACTIONS).map((action: NavActionItem) => ({
    id: `action:${action.id}`,
    group: 'action' as const,
    label: action.label,
    description: action.description,
    keywords: [...(GLOBAL_KEYWORDS[action.id] || []), action.shortLabel.toLowerCase()],
    iconName: action.id,
  }));

  for (const item of ALL_NAV_ITEMS) {
    if (item.adminOnly && !isAdminRole(role)) continue;
    commands.push({
      id: `page:${item.id}`,
      group: 'page',
      label: item.label,
      description: item.description,
      href: item.href,
      keywords: [...(item.keywords || []), ...(GLOBAL_KEYWORDS[item.id] || [])],
      iconName: item.id,
    });
  }

  return commands;
};

const normalize = (value: string): string => value.toLowerCase().trim();

/**
 * Score one command against a query. Higher is better, 0 means no match.
 *
 * Prefix matches beat word-start matches beat substring matches, so typing
 * "pl" puts "Pricing" above "My courses" (which merely contains "pl" in
 * "plans"). An empty query scores everything equally — the palette shows a
 * full list rather than an empty panel.
 */
export const scoreCommand = (command: Command, rawQuery: string): number => {
  const query = normalize(rawQuery);
  if (!query) return 1;

  const label = normalize(command.label);
  const words = normalize(command.description).split(/\s+/);
  const haystack = [label, normalize(command.description), ...command.keywords.map(normalize)];

  if (label === query) return 100;
  if (label.startsWith(query)) return 80;
  if (words.some((word) => word.startsWith(query))) return 60;
  if (label.includes(query)) return 40;
  if (command.keywords.some((keyword) => normalize(keyword).startsWith(query))) return 30;
  if (haystack.some((value) => value.includes(query))) return 10;
  return 0;
};

export interface RankedCommand extends Command {
  score: number;
}

/**
 * Ranked, filtered commands. Ties break on label so the order is stable
 * between keystrokes — an unstable order makes the arrow-key selection appear
 * to jump around as you type.
 */
export const rankCommands = (commands: Command[], rawQuery: string): RankedCommand[] =>
  commands
    .map((command) => ({ ...command, score: scoreCommand(command, rawQuery) }))
    .filter((command) => command.score > 0)
    .sort((a, b) => (b.score === a.score ? a.label.localeCompare(b.label) : b.score - a.score));

/**
 * Company vault matches.
 *
 * A query that starts with the company name outranks one that only appears in
 * its tags, so "raz" finds Razorpay above a company merely tagged "razoray".
 * `accuracy_score` is a tiebreaker only — it was a ranking signal in the old
 * modal, which put a low-quality match above an exact name match.
 */
export interface CompanyLike {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
  tags?: string[] | null;
  avg_rounds?: number | null;
  accuracy_score?: number | null;
  logo_url?: string | null;
}

export interface RankedCompany extends CompanyLike {
  score: number;
}

export const scoreCompany = (company: CompanyLike, rawQuery: string): number => {
  const query = normalize(rawQuery);
  if (!query) return 1;

  const name = normalize(company.name || '');
  const industry = normalize(company.industry || '');
  const tags = (company.tags || []).map(normalize);

  if (name === query) return 100;
  if (name.startsWith(query)) return 80;
  if (tags.some((tag) => tag === query)) return 50;
  if (tags.some((tag) => tag.startsWith(query))) return 40;
  if (name.includes(query)) return 30;
  if (industry.startsWith(query)) return 20;
  if (industry.includes(query) || tags.some((tag) => tag.includes(query))) return 10;
  return 0;
};

export const rankCompanies = (companies: CompanyLike[], rawQuery: string): RankedCompany[] =>
  companies
    .map((company) => ({ ...company, score: scoreCompany(company, rawQuery) }))
    .filter((company) => company.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Only when the match is equally good does accuracy decide.
      return (b.accuracy_score ?? -1) - (a.accuracy_score ?? -1);
    });

/** How many company rows to show. The palette is a jump list, not a report. */
export const COMPANY_RESULT_LIMIT = 5;
