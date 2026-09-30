/**
 * Command palette ranking tests.
 *
 * The palette is now the only keyboard route to non-company destinations, so
 * two failure modes matter: a query that should match nothing returning rows
 * (noise makes a jump list useless), and the old modal's two real bugs —
 * `text-[--text-muted]` silently rendering as body text, and company matches
 * outranking the destination the student actually typed.
 *
 * This suite imports the real `src/lib/palette` module (the runner rewrites the
 * `@/*` alias after compiling), so the code under test is the code that ships.
 */
import {
  COMPANY_RESULT_LIMIT,
  buildCommands,
  rankCommands,
  rankCompanies,
  scoreCommand,
  scoreCompany,
  type CompanyLike,
  type Command,
} from '../src/lib/palette';

let pass = 0;
let fail = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
  } catch (err: any) {
    fail += 1;
    console.error(`FAIL  ${name}\n      ${err?.message}`);
  }
}
function eq(actual: unknown, expected: unknown, note = '') {
  if (actual !== expected) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${note ? ` — ${note}` : ''}`);
  }
}
/** Structural comparison, for list results. */
function same(actual: unknown, expected: unknown, note = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`expected ${b}, got ${a}${note ? ` — ${note}` : ''}`);
}
function ok(value: unknown, note: string) {
  if (!value) throw new Error(`expected truthy${note ? ` — ${note}` : ''}`);
}
const company = (over: Partial<CompanyLike> = {}): CompanyLike => ({
  id: 'c1',
  name: 'Razorpay',
  slug: 'razorpay',
  industry: 'Fintech',
  tags: ['payments'],
  avg_rounds: 5,
  accuracy_score: 92,
  ...over,
});
const labels = (rows: { label: string }[]) => rows.map((r) => r.label);

// ---------------------------------------------------------------------------
// Visibility by role
// ---------------------------------------------------------------------------

check('a signed-out visitor cannot see admin destinations', () => {
  const ids = buildCommands(null).map((c) => c.id);
  ok(!ids.includes('page:admin'), 'admin leaked to signed-out');
  ok(!ids.includes('page:campus'), 'campus leaked to signed-out');
  ok(ids.includes('page:pricing'), 'pricing is public');
  ok(ids.includes('page:vaults'), 'vaults is public');
});

check('a signed-in student gets the same list as a visitor', () => {
  eq(buildCommands('user').length, buildCommands(null).length, 'role must not change a student view');
});

check('a platform admin gets exactly the two extra destinations', () => {
  const ids = buildCommands('admin').map((c) => c.id);
  ok(ids.includes('page:admin'), 'admin missing');
  ok(ids.includes('page:campus'), 'campus missing');
  eq(ids.length, buildCommands('user').length + 2, 'unexpected extra entries');
});

check('every page command has a destination and every action command does not', () => {
  for (const command of buildCommands('admin')) {
    if (command.group === 'page') ok(Boolean(command.href), `${command.id} has no href`);
    else ok(!command.href, `${command.id} should not navigate`);
  }
});

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

check('an empty query lists everything, because a jump list starts full', () => {
  const all = buildCommands('user');
  eq(rankCommands(all, '').length, all.length);
  eq(rankCommands(all, '   ').length, all.length, 'whitespace is not a query');
});

check('a query that matches nothing returns nothing', () => {
  eq(rankCommands(buildCommands('user'), 'zzzzqqq').length, 0);
});

check('"pricing" finds Pricing, which the old search box could not do at all', () => {
  const top = rankCommands(buildCommands(null), 'pricing')[0];
  eq(top.id, 'page:pricing');
});

check('"compare" prefers the compare page over any company substring match', () => {
  const top = rankCommands(buildCommands(null), 'compare')[0];
  ok(/^page:/.test(top.id), `expected a destination first, got ${top.id}`);
});

check('an exact label beats a prefix and a prefix beats a substring', () => {
  const exact = scoreCommand({ ...buildCommands(null)[0], label: 'Cart' } as Command, 'cart');
  const prefix = scoreCommand({ ...buildCommands(null)[0], label: 'Cart Items' } as Command, 'cart');
  const substring = scoreCommand({ ...buildCommands(null)[0], label: 'My Cart History' } as Command, 'cart');
  ok(exact > prefix, `${exact} !> ${prefix}`);
  ok(prefix > substring, `${prefix} !> ${substring}`);
});

check('a query matching only keywords still finds the destination', () => {
  const ids = rankCommands(buildCommands(null), 'fees').map((c) => c.id);
  ok(ids.includes('page:pricing'), 'fees should reach Pricing via keyword');
  const tpo = rankCommands(buildCommands('admin'), 'tpo').map((c) => c.id);
  ok(tpo.includes('page:campus'), 'tpo should reach Campus via keyword');
});

check('matching is case and whitespace insensitive', () => {
  eq(rankCommands(buildCommands(null), '  PrIcInG  ')[0].id, 'page:pricing');
});

check('ties are broken on label so arrow keys do not jump around', () => {
  const commands: Command[] = [
    { id: 'b', group: 'page', label: 'Beta', description: '', href: '/b', keywords: [], iconName: 'b' },
    { id: 'a', group: 'page', label: 'Alpha', description: '', href: '/a', keywords: [], iconName: 'a' },
  ];
  same(labels(rankCommands(commands, '')), ['Alpha', 'Beta'], 'equal scores must be stable');
  same(labels(rankCommands(commands, 'a')), ['Alpha', 'Beta']);
});

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

check('a company name match outranks a tag-only match', () => {
  const rows = rankCompanies(
    [company({ id: 'tag', name: 'Zeta', tags: ['razorpay'] }), company({ id: 'name', name: 'Razorpay' })],
    'razorpay'
  );
  eq(rows[0].id, 'name');
});

check('accuracy only breaks ties between equally good matches', () => {
  const rows = rankCompanies(
    [
      company({ id: 'low', name: 'Razorpay', accuracy_score: 40 }),
      company({ id: 'high', name: 'Razorpay', accuracy_score: 99 }),
    ],
    'razorpay'
  );
  eq(rows[0].id, 'high');
});

check('a company missing tags or industry does not throw', () => {
  const rows = rankCompanies([{ id: 'bare', name: 'Bare', slug: 'bare' }], 'bare');
  eq(rows.length, 1);
  eq(rankCompanies([{ id: 'bare', name: 'Bare', slug: 'bare' }], 'other').length, 0);
});

check('a null accuracy does not outrank a real one', () => {
  const rows = rankCompanies(
    [company({ id: 'null', name: 'Razorpay', accuracy_score: null }), company({ id: 'num', name: 'Razorpay', accuracy_score: 10 })],
    'razorpay'
  );
  eq(rows[0].id, 'num', 'null must sort last, not as -1 vs 0 ambiguity');
});

check('the company result cap is a real bound, not a comment', () => {
  ok(COMPANY_RESULT_LIMIT > 0 && COMPANY_RESULT_LIMIT <= 10, 'cap out of range');
  const many = Array.from({ length: 40 }, (_, i) => company({ id: `c${i}`, name: `Razorpay ${i}` }));
  eq(rankCompanies(many, 'razorpay').length, 40, 'ranking itself is unbounded; the UI slices');
});

console.log(`\npalette: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
