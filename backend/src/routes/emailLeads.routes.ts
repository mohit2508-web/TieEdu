/**
 * Admin: lead list, manual CRUD, and CSV import.
 *
 * Leads are cold addresses, NOT User rows — importing one never creates an
 * account and never grants anything. The only thing an import records is
 * consent (`consent_at`), because that is the record DPDP/CAN-SPAM asks for
 * when someone later asks "where did you get my address".
 *
 * The parser is a small RFC-4180 subset (quoted fields, escaped quotes, CRLF)
 * rather than a dependency: a lead CSV is `email,name,college,year` and the
 * failure mode of a wrong parser is silently mangled addresses, which this
 * validates for anyway.
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { loadDb, saveDb, EmailLead, EmailLeadStatus } from '../data/db';
import { requireAdmin, requirePermission } from '../middleware/auth';
import { appendAudit } from '../store/audit';
import { leadTimeline, leadsCsv, messagesCsv } from '../lib/email/analytics';

export const emailLeadsRouter = Router();

emailLeadsRouter.use(requireAdmin);

const EMAIL_RE = /^[^\s@,;:"'<>()[\]\\]+@[^\s@.,;:"'<>()[\]\\]+\.[A-Za-z]{2,}$/;
const MAX_IMPORT_ROWS = 20000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    const ok = name.endsWith('.csv') || file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel';
    if (ok) cb(null, true);
    else cb(new Error('ONLY_CSV_ALLOWED'));
  },
}).single('file');

/** RFC-4180 subset: quoted fields, "" escapes, \r\n or \n line endings. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const push = () => { row.push(field); field = ''; };
  const pushRow = () => { push(); if (row.some((f) => f.trim() !== '')) rows.push(row); row = []; };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === '') { inQuotes = true; i++; continue; }
    if (ch === ',') { push(); i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { pushRow(); i++; continue; }
    field += ch; i++;
  }
  pushRow();
  return rows;
}

/** Header aliases → canonical field. Unknown columns are ignored, not guessed. */
const HEADER_ALIASES: Record<string, keyof EmailLead | 'email'> = {
  email: 'email', e_mail: 'email', mail: 'email', 'email address': 'email',
  name: 'name', full_name: 'name', 'full name': 'name', student: 'name', student_name: 'name',
  college: 'college', college_name: 'college', institution: 'college', college_name_: 'college',
  year: 'year', 'year of study': 'year', semester: 'year', sem: 'year', batch: 'year',
};

function normalizeHeader(h: string): string {
  return h.replace(/^﻿/, '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

/**
 * GET /api/email/admin/leads?q=&status=&tag=&year=&limit=&offset=
 */
emailLeadsRouter.get('/leads', requirePermission('email.read'), (req: Request, res: Response) => {
  const db = loadDb();
  const q = String(req.query.q || '').trim().toLowerCase();
  const status = String(req.query.status || '').trim();
  const tag = String(req.query.tag || '').trim();
  const year = String(req.query.year || '').trim();
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const all: EmailLead[] = (db.email_leads || []).filter((l: EmailLead) => !!l && typeof l.email === 'string');
  const filtered = all.filter((l) => {
    if (status && l.status !== status) return false;
    if (year && String(l.year || '') !== year) return false;
    if (tag && !(l.tags || []).includes(tag)) return false;
    if (q && !(`${l.email} ${l.name || ''} ${l.college || ''}`.toLowerCase().includes(q))) return false;
    return true;
  });

  const byStatus: Record<string, number> = {};
  for (const l of all) byStatus[l.status] = (byStatus[l.status] || 0) + 1;

  res.json({
    total: filtered.length,
    all_total: all.length,
    by_status: byStatus,
    offset,
    leads: filtered.slice(offset, offset + limit),
  });
});

/** POST /api/email/admin/leads — manual add. */
emailLeadsRouter.post('/leads', requirePermission('email.write'), (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });

  const db = loadDb();
  const exists = (db.email_leads || []).find((l: EmailLead) => l && l.email === email);
  if (exists) {
    if (exists.status === 'active') return res.status(409).json({ error: 'That address is already on the list.' });
    // Re-adding an unsubscribed/bounced address would forge fresh consent.
    return res.status(409).json({ error: `That address is marked ${exists.status} and cannot be re-added.` });
  }

  const now = new Date().toISOString();
  const lead: EmailLead = {
    id: `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    email,
    name: String(req.body?.name || '').trim() || undefined,
    college: String(req.body?.college || '').trim() || undefined,
    year: String(req.body?.year || '').trim() || undefined,
    status: 'active',
    source: 'manual',
    tags: Array.isArray(req.body?.tags) ? req.body.tags.map(String).map((t: string) => t.trim()).filter(Boolean).slice(0, 20) : [],
    consent_at: now,
    created_at: now,
    updated_at: now,
  };
  (db.email_leads ||= []).push(lead);
  saveDb(db);
  res.status(201).json({ lead });
});

/** PATCH /api/email/admin/leads/:id — edit name/college/year/tags/status. */
emailLeadsRouter.patch('/leads/:id', requirePermission('email.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const lead: EmailLead | undefined = (db.email_leads || []).find((l: EmailLead) => l && l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const body = req.body || {};
  if (typeof body.name === 'string') lead.name = body.name.trim() || undefined;
  if (typeof body.college === 'string') lead.college = body.college.trim() || undefined;
  if (typeof body.year === 'string') lead.year = body.year.trim() || undefined;
  if (Array.isArray(body.tags)) lead.tags = body.tags.map(String).map((t: string) => t.trim()).filter(Boolean).slice(0, 20);
  if (typeof body.status === 'string') {
    const allowed: EmailLeadStatus[] = ['active', 'unsubscribed', 'bounced', 'complained', 'converted'];
    if (!allowed.includes(body.status)) return res.status(400).json({ error: `status must be one of ${allowed.join(', ')}` });
    lead.status = body.status;
  }
  lead.updated_at = new Date().toISOString();
  saveDb(db);
  res.json({ lead });
});

/** DELETE /api/email/admin/leads/:id */
emailLeadsRouter.delete('/leads/:id', requirePermission('email.write'), (req: Request, res: Response) => {
  const db = loadDb();
  const before = (db.email_leads || []).length;
  db.email_leads = (db.email_leads || []).filter((l: EmailLead) => l && l.id !== req.params.id);
  if (db.email_leads.length === before) return res.status(404).json({ error: 'Lead not found' });
  saveDb(db);
  res.json({ ok: true, removed: before - db.email_leads.length });
});

/**
 * GET /api/email/admin/leads/:id/timeline — every send and tracked activity
 * for one person, newest first. Rows without any timestamp (an unsubscribe
 * skip, a provider failure) come back separately as `pending` rather than
 * being given a fake position on the timeline.
 */
emailLeadsRouter.get('/leads/:id/timeline', requirePermission('email.read'), (req: Request, res: Response) => {
  const timeline = leadTimeline(loadDb(), String(req.params.id));
  if (!timeline) return res.status(404).json({ error: 'Lead not found' });
  res.json({ ok: true, ...timeline });
});

/**
 * GET /api/email/admin/export.csv?kind=leads|messages — spreadsheet export.
 * The message log is the honest record (webhook-backed statuses, skip
 * reasons); the leads sheet carries consent timestamps for DPDP questions.
 */
emailLeadsRouter.get('/export.csv', requirePermission('email.read'), (req: Request, res: Response) => {
  const kind = String(req.query.kind || 'leads');
  if (kind !== 'leads' && kind !== 'messages') {
    return res.status(400).json({ error: 'kind must be "leads" or "messages".' });
  }
  const db = loadDb();
  const day = new Date().toISOString().slice(0, 10);
  const filename = kind === 'leads' ? `tieedu-leads-${day}.csv` : `tieedu-message-log-${day}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(kind === 'leads' ? leadsCsv(db) : messagesCsv(db));
});

/**
 * POST /api/email/admin/leads/import — multipart CSV.
 *
 * Returns every rejected row with a reason. Silently dropping half a list and
 * reporting "imported 500" is how an operator ends up believing 1,000 people
 * were mailed when 500 were.
 */
emailLeadsRouter.post('/leads/import', requirePermission('email.write'), async (req: Request, res: Response) => {
  upload(req, res, async (err: any) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'CSV must be under 2MB.' });
    }
    if (err) return res.status(400).json({ error: 'CSV file required in the "file" field.' });

    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'No file field named "file"' });

    const source = String(req.body?.source || '').trim() || `csv:${file.originalname || 'upload.csv'}`;
    const defaultTags = Array.isArray(req.body?.tags)
      ? req.body.tags.map(String).map((t: string) => t.trim()).filter(Boolean).slice(0, 20)
      : [];

    const text = file.buffer.toString('utf-8');
    const rows = parseCsv(text);
    if (rows.length < 2) return res.status(400).json({ error: 'CSV needs a header row plus at least one data row.' });
    if (rows.length - 1 > MAX_IMPORT_ROWS) {
      return res.status(413).json({ error: `Too many rows (${rows.length - 1}). Limit is ${MAX_IMPORT_ROWS} per import.` });
    }

    const header = rows[0].map(normalizeHeader);
    const col: Record<string, number> = {};
    header.forEach((h, idx) => {
      const key = HEADER_ALIASES[h];
      if (key && col[key] === undefined) col[key] = idx;
    });
    if (col.email === undefined) {
      return res.status(400).json({
        error: 'No email column found. Expected a header like: email,name,college,year',
        header_seen: rows[0],
      });
    }

    const db = loadDb();
    const existing = new Map<string, EmailLead>(
      (db.email_leads || [])
        .filter((l: EmailLead) => !!l && typeof l.email === 'string')
        .map((l: EmailLead) => [l.email.toLowerCase(), l])
    );

    let imported = 0;
    const rejected: { row: number; email: string; reason: string }[] = [];
    const inFileSeen = new Set<string>();
    const now = new Date().toISOString();

    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      const email = (cells[col.email] || '').trim().toLowerCase();
      const rowNo = r + 1;
      if (!email) { rejected.push({ row: rowNo, email: '', reason: 'empty' }); continue; }
      if (!EMAIL_RE.test(email)) { rejected.push({ row: rowNo, email, reason: 'invalid' }); continue; }
      if (inFileSeen.has(email)) { rejected.push({ row: rowNo, email, reason: 'duplicate_in_file' }); continue; }

      const already = existing.get(email);
      if (already) {
        inFileSeen.add(email);
        // Existing address: refresh profile fields, never touch status — an
        // import must not resurrect an unsubscribe or clear a bounce.
        if (already.name === undefined && col.name !== undefined) already.name = (cells[col.name] || '').trim() || undefined;
        if (already.college === undefined && col.college !== undefined) already.college = (cells[col.college] || '').trim() || undefined;
        if (already.year === undefined && col.year !== undefined) already.year = (cells[col.year] || '').trim() || undefined;
        already.updated_at = now;
        rejected.push({ row: rowNo, email, reason: already.status === 'active' ? 'already_listed' : `status_${already.status}` });
        continue;
      }

      const lead: EmailLead = {
        id: `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        email,
        name: col.name !== undefined ? (cells[col.name] || '').trim() || undefined : undefined,
        college: col.college !== undefined ? (cells[col.college] || '').trim() || undefined : undefined,
        year: col.year !== undefined ? (cells[col.year] || '').trim() || undefined : undefined,
        status: 'active',
        source,
        tags: [...defaultTags],
        consent_at: now,
        created_at: now,
        updated_at: now,
      };
      (db.email_leads ||= []).push(lead);
      existing.set(email, lead);
      inFileSeen.add(email);
      imported++;
    }

    saveDb(db);
    await appendAudit(db, {
      action: 'email.leads.import',
      actor: req.user?.email || 'admin',
      detail: `Imported ${imported} lead(s) from ${file.originalname}`,
      meta: { source, imported, rejected: rejected.length, file: file.originalname },
    });
    saveDb(db);

    res.json({
      ok: true,
      imported,
      rejected_count: rejected.length,
      // Cap the echo — a 20k-row file of rejects is not useful in a response body.
      rejected: rejected.slice(0, 100),
      columns_mapped: col,
    });
  });
});
