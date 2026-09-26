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

// POST /api/pdf/admin/modules/:moduleId/upload — Upload/replace the module's single PDF
pdfLibraryRouter.post('/admin/modules/:moduleId/upload', (req: Request, res: Response) => {
  const db = loadDb();
  const found = findModuleAndCompany(db, req.params.moduleId);
  if (!found) return res.status(404).json({ error: 'Module not found' });

  upload(req, res, (err: any) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'PDF 25MB se bada hai' });
    }
    if (err) {
      const msg = String(err.message || err);
      if (msg.includes('ONLY_PDF_ALLOWED')) return res.status(400).json({ error: 'Sirf application/pdf files allowed hain' });
      return res.status(400).json({ error: 'Upload failed: ' + msg });
    }
    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'No file field named "file"' });

    // Replace existing module.pdf (purani disk file hatao)
    const old = found.module.pdf as ModulePdf | null | undefined;
    if (old && old.stored_name && STORED_NAME_RE.test(old.stored_name)) {
      const oldPath = path.join(UPLOAD_DIR, old.stored_name);
      fs.rm(oldPath, { force: true }, () => {});
    }

    const pdf: ModulePdf = {
      id: `pdf-${Date.now()}`,
      file_name: file.originalname || 'document.pdf',
      stored_name: file.filename,
      size_bytes: file.size,
      title: (req.body && req.body.title) || file.originalname?.replace(/\.pdf$/i, '') || 'PDF',
      uploaded_at: new Date().toISOString().split('T')[0],
    };

    found.module.pdf = pdf;
    found.company.last_updated_days_ago = 0;
    saveDb(db);
    res.status(201).json({ status: 'success', pdf });
  });
});

// DELETE /api/pdf/admin/modules/:moduleId/pdf — Remove module PDF (meta + disk)
pdfLibraryRouter.delete('/admin/modules/:moduleId/pdf', (req: Request, res: Response) => {
  const db = loadDb();
  const found = findModuleAndCompany(db, req.params.moduleId);
  if (!found) return res.status(404).json({ error: 'Module not found' });

  const pdf = found.module.pdf as ModulePdf | null | undefined;
  if (!pdf) return res.status(404).json({ error: 'No PDF is uploaded for this module' });

  if (STORED_NAME_RE.test(pdf.stored_name)) {
    fs.rm(path.join(UPLOAD_DIR, pdf.stored_name), { force: true }, () => {});
  }
  delete found.module.pdf;
  found.company.last_updated_days_ago = 0;
  saveDb(db);
  res.json({ status: 'success', message: 'PDF removed' });
});

// GET /api/pdf/file/:storedName — View-only inline serve (dynamically watermarked with cover page & student details)
pdfLibraryRouter.get('/file/:storedName', optionalAuth, async (req: Request, res: Response) => {
  const { storedName } = req.params;
  if (!STORED_NAME_RE.test(storedName)) return res.status(404).json({ error: 'Invalid file' });

  const db = loadDb();
  const userId = req.userId;
  const isAdmin = req.user?.role === 'admin';

  let owner: { company: any; module: any } | null = null;
  for (const c of db.companies || []) {
    for (const m of c.modules || []) {
      if (m.pdf && m.pdf.stored_name === storedName) owner = { company: c, module: m };
    }
  }
  if (!owner) return res.status(404).json({ error: 'File not found' });

  // Premium module PDFs require an unlock for that company (admin preview always allowed).
  if (owner.module.is_premium === true && !isAdmin) {
    const unlocked = !!userId && (db.unlocks || []).some(
      (u: any) => u.user_id === userId && u.company_id === owner.company.id && (u.status === 'active' || !u.status)
    );
    if (!unlocked) return res.status(403).json({ error: 'Unlock this pack to view the PDF' });
  }

  const filePath = path.join(UPLOAD_DIR, storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on disk' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(owner.module.pdf.file_name)}"`);
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
      moduleTitle: owner.module?.title || owner.module?.pdf?.title || 'Study Material',
    });

    return res.send(outputBuffer);
  } catch (err) {
    // Fallback to serving raw file if pdf-lib parsing fails
    return res.sendFile(filePath);
  }
});