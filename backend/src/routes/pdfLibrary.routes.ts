import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { loadDb, saveDb, ModulePdf } from '../data/db';
import { requireAdmin, optionalAuth } from '../middleware/auth';
import { buildPersonalizedPdf } from '../lib/pdfWatermark';

export const pdfLibraryRouter = Router();

// All /admin/* actions inside this router require an admin session
pdfLibraryRouter.use('/admin', requireAdmin);

const UPLOAD_DIR = path.join(__dirname, '../../uploads/pdfs');
export const ensureUploadDir = () => fs.mkdirSync(UPLOAD_DIR, { recursive: true });
ensureUploadDir();

const STORED_NAME_RE = /^pdf-[0-9]+-[a-z0-9]{4,8}\.pdf$/;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const suffix = Math.random().toString(36).slice(2, 8);
    cb(null, `pdf-${Date.now()}-${suffix}.pdf`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('ONLY_PDF_ALLOWED'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
}).single('file');

function findModuleAndCompany(db: any, moduleId: string) {
  for (const c of db.companies || []) {
    if (c.modules) {
      const m = c.modules.find((mod: any) => mod.id === moduleId);
      if (m) return { company: c, module: m };
    }
  }
  return null;
}

// Helper: get pdfs array — supports old single-pdf format AND new array format
function getModulePdfs(module: any): ModulePdf[] {
  if (Array.isArray(module.pdfs)) return module.pdfs;
  if (module.pdf) return [module.pdf]; // backward compat with old single-pdf
  return [];
}

// POST /api/pdf/admin/modules/:moduleId/upload — Add a new PDF to the module's list
pdfLibraryRouter.post('/admin/modules/:moduleId/upload', (req: Request, res: Response) => {
  upload(req, res, (err: any) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'PDF 25MB se bada hai' });
    }
    if (err) {
      const msg = String(err.message || err);
      if (msg.includes('ONLY_PDF_ALLOWED')) return res.status(400).json({ error: 'Sirf application/pdf files allowed hain' });
      return res.status(400).json({ error: 'Upload failed: ' + msg });
    }

    const db = loadDb();
    const found = findModuleAndCompany(db, req.params.moduleId);
    if (!found) return res.status(404).json({ error: 'Module not found' });

    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'No file field named "file"' });

    const pdf: ModulePdf = {
      id: `pdf-${Date.now()}`,
      file_name: file.originalname || 'document.pdf',
      stored_name: file.filename,
      size_bytes: file.size,
      title: (req.body && req.body.title) || file.originalname?.replace(/\.pdf$/i, '') || 'PDF',
      uploaded_at: new Date().toISOString().split('T')[0],
    };

    // Migrate old single-pdf to array, then append new pdf
    const existingPdfs = getModulePdfs(found.module);
    found.module.pdfs = [...existingPdfs, pdf];
    delete found.module.pdf; // remove legacy single-pdf field

    found.company.last_updated_days_ago = 0;
    saveDb(db);
    return res.status(201).json({ status: 'success', pdf, pdfs: found.module.pdfs });
  });
});

// DELETE /api/pdf/admin/modules/:moduleId/pdfs/:pdfId — Remove one specific PDF by id
pdfLibraryRouter.delete('/admin/modules/:moduleId/pdfs/:pdfId', (req: Request, res: Response) => {
  const db = loadDb();
  const found = findModuleAndCompany(db, req.params.moduleId);
  if (!found) return res.status(404).json({ error: 'Module not found' });

  const pdfs: ModulePdf[] = getModulePdfs(found.module);
  const idx = pdfs.findIndex((p: ModulePdf) => p.id === req.params.pdfId);
  if (idx === -1) return res.status(404).json({ error: 'PDF not found' });

  const [removed] = pdfs.splice(idx, 1);
  if (STORED_NAME_RE.test(removed.stored_name)) {
    fs.rm(path.join(UPLOAD_DIR, removed.stored_name), { force: true }, () => {});
  }

  found.module.pdfs = pdfs;
  delete found.module.pdf; // remove legacy field if present
  found.company.last_updated_days_ago = 0;
  saveDb(db);
  res.json({ status: 'success', message: 'PDF removed', pdfs });
});

// DELETE /api/pdf/admin/modules/:moduleId/pdf — Legacy: clear all pdfs (backward compat)
pdfLibraryRouter.delete('/admin/modules/:moduleId/pdf', (req: Request, res: Response) => {
  const db = loadDb();
  const found = findModuleAndCompany(db, req.params.moduleId);
  if (!found) return res.status(404).json({ error: 'Module not found' });

  const pdfs = getModulePdfs(found.module);
  for (const p of pdfs) {
    if (STORED_NAME_RE.test(p.stored_name)) {
      fs.rm(path.join(UPLOAD_DIR, p.stored_name), { force: true }, () => {});
    }
  }
  found.module.pdfs = [];
  delete found.module.pdf;
  found.company.last_updated_days_ago = 0;
  saveDb(db);
  res.json({ status: 'success', message: 'All PDFs removed' });
});

// GET /api/pdf/file/:storedName — Serve with student watermark
pdfLibraryRouter.get('/file/:storedName', optionalAuth, async (req: Request, res: Response) => {
  const { storedName } = req.params;
  if (!STORED_NAME_RE.test(storedName)) return res.status(404).json({ error: 'Invalid file' });

  const db = loadDb();
  const userId = req.userId;
  const isAdmin = req.user?.role === 'admin';

  let owner: { company: any; module: any } | null = null;
  for (const c of db.companies || []) {
    for (const m of c.modules || []) {
      const pdfs = getModulePdfs(m);
      if (pdfs.some((p: ModulePdf) => p.stored_name === storedName)) {
        owner = { company: c, module: m };
      }
    }
  }
  if (!owner) return res.status(404).json({ error: 'File not found' });

  // Premium module PDFs require an unlock (admin always allowed)
  if (owner.module.is_premium === true && !isAdmin) {
    const unlocked = !!userId && (db.unlocks || []).some(
      (u: any) => u.user_id === userId && u.company_id === owner!.company.id && (u.status === 'active' || !u.status)
    );
    if (!unlocked) return res.status(403).json({ error: 'Unlock this pack to view the PDF' });
  }

  const filePath = path.join(UPLOAD_DIR, storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on disk' });

  const allPdfs = getModulePdfs(owner.module);
  const pdfMeta = allPdfs.find((p: ModulePdf) => p.stored_name === storedName) || allPdfs[0];

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(pdfMeta?.file_name || 'document.pdf')}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    const user = req.user;
    const studentName = user?.name || 'Authorized Student';
    const studentEmail = user?.email || 'student@tieedu.com';
    const rawId = user?.id || 'GUEST';
    const licenseId = user?.license_id || `LIC-${rawId.slice(-6).toUpperCase()}`;
    const rollNo = user?.roll_no || `ROLL-${rawId.slice(-6).toUpperCase()}`;

    const pdfBytes = fs.readFileSync(filePath);
    const outputBuffer = await buildPersonalizedPdf(pdfBytes, {
      studentName,
      studentEmail,
      rollNo,
      licenseId,
      companyName: owner.company?.name || 'TieEdu Placement Vault',
      moduleTitle: owner.module?.title || pdfMeta?.title || 'Study Material',
    });

    return res.send(outputBuffer);
  } catch {
    return res.sendFile(filePath);
  }
});