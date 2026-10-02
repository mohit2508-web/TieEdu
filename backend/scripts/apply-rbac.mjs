/**
 * One-shot codemod: insert `requirePermission(...)` into admin route mounts.
 *
 *   node scripts/apply-rbac.mjs
 *
 * The admin router is mounted behind `requireAdmin` (server.ts), so every route in
 * it already requires an admin session. What is missing is *which* admin — today
 * the answer is "any", because `requireAdmin` checks a single role bit. This adds
 * the second half of that answer.
 *
 * Done as a codemod rather than 32 hand edits so the mapping is one auditable table
 * instead of 32 independent decisions. It only rewrites lines that match
 * `adminRouter.<method>('<path>', (req: Request, res: Response) => {` exactly, and
 * refuses to touch anything it does not recognise — so re-running it is a no-op
 * rather than a double-wrap.
 */
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'src', 'routes', 'admin.routes.ts');

/** method + path -> the permission that should gate it. */
const MAP = {
  'GET /companies': 'companies.read',
  'GET /companies/:id': 'companies.read',
  'POST /companies': 'companies.write',
  'PUT /companies/:id': 'companies.write',
  'DELETE /companies/:id': 'companies.delete',
  'POST /companies/:id/modules': 'modules.write',
  'POST /companies/:id/modules/reorder': 'modules.write',
  'PUT /modules/:id': 'modules.write',
  'DELETE /modules/:id': 'modules.write',
  'PUT /modules/:id/section': 'modules.write',
  'POST /modules/:id/items': 'modules.write',
  'PUT /modules/:id/items/:itemId': 'modules.write',
  'DELETE /modules/:id/items/:itemId': 'modules.write',
  'POST /items/:itemId/blocks': 'modules.write',
  'PUT /items/:itemId/blocks/:blockId': 'modules.write',
  'DELETE /items/:itemId/blocks/:blockId': 'modules.write',
  'POST /items/:itemId/blocks/reorder': 'modules.write',
  'GET /coupons': 'coupons.read',
  'POST /coupons': 'coupons.write',
  'PUT /coupons/:id': 'coupons.write',
  'DELETE /coupons/:id': 'coupons.write',
  'GET /orders': 'orders.read',
  'GET /payments/pending': 'orders.verify',
  'POST /payments/:id/verify': 'orders.verify',
  'POST /payments/:id/reject': 'orders.verify',
  'GET /users': 'users.read',
  'PUT /users/:id/status': 'users.status',
  'GET /settings': 'settings.read',
  'PUT /settings': 'settings.write',
  'GET /audit': 'audit.read',
  'POST /blocks': 'modules.write',
};

const source = fs.readFileSync(FILE, 'utf8');
const lines = source.split('\n');
const seen = new Set();
let changed = 0;

const ROUTE_RE = /^(\s*)adminRouter\.(get|post|put|delete|patch)\(\s*'([^']+)'\s*,\s*\(req: Request/;

const out = lines.map((line) => {
  const m = ROUTE_RE.exec(line);
  if (!m) return line;

  const [, indent, method, routePath] = m;
  const key = `${method.toUpperCase()} ${routePath}`;

  // Already wrapped by a previous run — leave it alone.
  if (line.includes('requirePermission(') || line.includes('requireAnyPermission(')) return line;

  const permission = MAP[key];
  if (!permission) {
    console.error(`UNMAPPED  ${key}`);
    return line;
  }

  seen.add(key);
  changed += 1;

  // Split the line at the handler signature so nothing after `(req: Request` is
  // lost. Slicing by an arithmetic offset on `indexOf` is what broke the first
  // attempt: it clipped the separating comma and then dropped `, res: Response)
  // => {` entirely, which is not a recoverable error by hand across 31 routes.
  const sigStart = line.indexOf(`'${routePath}'`);
  const handlerStart = line.indexOf('(req: Request', sigStart);

  const head = line.slice(0, sigStart + routePath.length + 2); // through the closing quote
  const tail = line.slice(handlerStart); // `(req: Request, res: Response) => {`

  if (!line.slice(sigStart + routePath.length + 1, handlerStart).includes(',')) {
    console.error(`UNEXPECTED  ${key} — no comma between path and handler`);
    return line;
  }

  return `${head}, requirePermission('${permission}'), ${tail}`;
});

if (changed === 0) {
  console.log('No changes needed — every mapped route already carries a permission guard.');
  process.exit(0);
}

const unmappedInFile = Object.keys(MAP).filter((k) => !seen.has(k));
if (unmappedInFile.length) {
  console.error(`\nRefusing to write. These mapped routes were not found in the file:`);
  for (const k of unmappedInFile) console.error(`  ${k}`);
  process.exit(1);
}

fs.writeFileSync(FILE, out.join('\n'));
console.log(`Inserted ${changed} permission guards into admin.routes.ts`);
