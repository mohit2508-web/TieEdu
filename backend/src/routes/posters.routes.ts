import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { loadDb, saveDb, HeroPoster } from '../data/db';
import { requireAdmin } from '../middleware/auth';

export const postersRouter = Router();

/*
 * Landing-hero posters.
 *
 * Everything below /admin requires an admin session; the read routes are public
 * because the student homepage has to show them to logged-out visitors. The
 * public read is deliberately narrow — it returns only creatives that are
 * active and inside their run window, never drafts and never their raw record.
 */

const UPLOAD_DIR = path.join(__dirname, '../../uploads/posters');
export const ensurePosterUploadDir = () => fs.mkdirSync(UPLOAD_DIR, { recursive: true });
ensurePosterUploadDir();

// Only these extensions are written to disk. The regex is re-anchored on the
// serve route, so a crafted name cannot walk out of UPLOAD_DIR.
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const STORED_NAME_RE = /^poster-[0-9]+-[a-z0-9]{4,10}\.(jpg|jpeg|png|webp|avif)$/;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ALLOWED_EXT.has(ext) ? ext : '.jpg';
    const suffix = Math.random().toString(36).slice(2, 10);
    cb(null, `poster-${Date.now()}-${suffix}${safeExt}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (file.mimetype.startsWith('image/') && ALLOWED_EXT.has(ext)) cb(null, true);
  else cb(new Error('ONLY_IMAGE_ALLOWED'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 6 * 1024 * 1024 },
}).single('file');

const MAX_POSTERS = 24;

function allPosters(db: any): HeroPoster[] {
  return Array.isArray(db.posters) ? db.posters : [];
}

function byOrder(a: HeroPoster, b: HeroPoster): number {
  const diff = (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
  if (diff !== 0) return diff;
  return String(a.created_at || '').localeCompare(String(b.created_at || ''));
}

/** ISO in, ISO out — an unparseable date is dropped rather than trusted. */
function normaliseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const t = Date.parse(String(value));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/**
 * A poster is live when it is switched on and today falls inside its window.
 * A window is only enforced when the bound actually parses, so a typo in the
 * admin form can never silently retire every creative on the homepage.
 */
function isLive(p: HeroPoster, now = Date.now()): boolean {
  if (p.is_active === false) return false;
  const start = p.start_at ? Date.parse(p.start_at) : NaN;
  const end = p.end_at ? Date.parse(p.end_at) : NaN;
  if (!Number.isNaN(start) && now < start) return false;
  if (!Number.isNaN(end) && now > end) return false;
  return true;
}

/** Public shape — hides internal bookkeeping and exposes a ready-to-use url. */
function toPublic(p: HeroPoster) {
  return {
    id: p.id,
    title: p.title || '',
    subtitle: p.subtitle || '',
    badge: p.badge || '',
    cta_label: p.cta_label || '',
    href: p.href || '',
    alt_text: p.alt_text || p.title || 'TieEdu offer',
    image_url: `/api/posters/file/${encodeURIComponent(p.image_stored_name || '')}`,
    is_featured: p.is_featured === true,
  };
}

function unlinkStored(storedName: string | null | undefined) {
  if (!storedName || !STORED_NAME_RE.test(storedName)) return;
  fs.rm(path.join(UPLOAD_DIR, storedName), { force: true }, () => {});
}

// ============================================================================
// PUBLIC
// ============================================================================

/**
 * GET /api/posters — live hero creatives for the landing page.
 * When an admin marks a poster "featured", that single creative takes the whole
 * rotation: a homepage that shows one deliberate ad beats one that shows five.
 */
postersRouter.get('/', (_req: Request, res: Response) => {
  const db = loadDb();
  const live = allPosters(db).filter((p) => isLive(p) && p.image_stored_name).sort(byOrder);
  const featured = live.filter((p) => p.is_featured);
  res.json((featured.length > 0 ? featured : live).map(toPublic));
});

/** GET /api/posters/file/:storedName — serve the creative. */
postersRouter.get('/file/:storedName', (req: Request, res: Response) => {
  const { storedName } = req.params;
  if (!STORED_NAME_RE.test(storedName)) return res.status(404).json({ error: 'Invalid file' });

  const filePath = path.join(UPLOAD_DIR, storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on disk' });

  const ext = path.extname(storedName).toLowerCase();
  const mime: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
  };
  res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
  // Filenames embed a timestamp, so the bytes never change for a given name and
  // a long cache is safe — a re-upload produces a new name.
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(filePath);
});

// ============================================================================
// ADMIN
// ============================================================================

postersRouter.use('/admin', requireAdmin);

/** GET /api/posters/admin — every poster, live or not, for the control plane. */
postersRouter.get('/admin', (_req: Request, res: Response) => {
  const db = loadDb();
  const list = allPosters(db)
    .slice()
    .sort(byOrder)
    .map((p) => ({ ...p, is_live: isLive(p), image_url: `/api/posters/file/${encodeURIComponent(p.image_stored_name || '')}` }));
  res.json(list);
});

/** POST /api/posters/admin/upload — store the creative, return the handle. */
postersRouter.post('/admin/upload', (req: Request, res: Response) => {
  upload(req, res, (err: any) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Image 6MB se bada hai' });
    }
    if (err) {
      const msg = String(err.message || err);
      if (msg.includes('ONLY_IMAGE_ALLOWED')) {
        return res.status(400).json({ error: 'Sirf JPG, PNG, WEBP ya AVIF image allowed hai' });
      }
      return res.status(400).json({ error: 'Upload failed: ' + msg });
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'No file field named "file"' });

    return res.status(201).json({
      status: 'success',
      stored_name: file.filename,
      file_name: file.originalname || 'poster',
      size_bytes: file.size,
    });
  });
});

/** POST /api/posters/admin — create a poster. */
postersRouter.post('/admin', (req: Request, res: Response) => {
  const db = loadDb();
  const list = allPosters(db);
  if (list.length >= MAX_POSTERS) {
    return res.status(409).json({ error: `Ek landing par sirf ${MAX_POSTERS} posters rakh sakte ho` });
  }

  const body = req.body || {};
  const storedName = String(body.image_stored_name || '');
  if (!STORED_NAME_RE.test(storedName)) {
    return res.status(400).json({ error: 'Pehle ek poster image upload karo' });
  }
  if (!fs.existsSync(path.join(UPLOAD_DIR, storedName))) {
    return res.status(400).json({ error: 'Uploaded image disk par nahi mili — dobara upload karo' });
  }

  const now = new Date().toISOString();
  const nextOrder = list.reduce((max, p) => Math.max(max, Number(p.sort_order) || 0), 0) + 1;
  const poster: HeroPoster = {
    id: `poster-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: String(body.title || '').slice(0, 80),
    subtitle: String(body.subtitle || '').slice(0, 160),
    badge: String(body.badge || '').slice(0, 24),
    cta_label: String(body.cta_label || '').slice(0, 32),
    href: String(body.href || '').slice(0, 300),
    alt_text: String(body.alt_text || '').slice(0, 160),
    image_stored_name: storedName,
    image_file_name: String(body.image_file_name || 'poster').slice(0, 200),
    is_active: body.is_active !== false,
    sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : nextOrder,
    start_at: normaliseDate(body.start_at),
    end_at: normaliseDate(body.end_at),
    is_featured: body.is_featured === true,
    created_at: now,
    updated_at: now,
  };

  db.posters = [...list, poster];
  saveDb(db);
  return res.status(201).json({ status: 'success', poster: { ...poster, is_live: isLive(poster), image_url: `/api/posters/file/${encodeURIComponent(storedName)}` } });
});

/** PUT /api/posters/admin/:id — partial update; the image can be swapped or kept. */
postersRouter.put('/admin/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const list = allPosters(db);
  const idx = list.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Poster not found' });

  const current = list[idx];
  const body = req.body || {};
  const patch: Partial<HeroPoster> = { updated_at: new Date().toISOString() };

  if (body.title !== undefined) patch.title = String(body.title).slice(0, 80);
  if (body.subtitle !== undefined) patch.subtitle = String(body.subtitle).slice(0, 160);
  if (body.badge !== undefined) patch.badge = String(body.badge).slice(0, 24);
  if (body.cta_label !== undefined) patch.cta_label = String(body.cta_label).slice(0, 32);
  if (body.href !== undefined) patch.href = String(body.href).slice(0, 300);
  if (body.alt_text !== undefined) patch.alt_text = String(body.alt_text).slice(0, 160);
  if (body.is_active !== undefined) patch.is_active = body.is_active !== false;
  if (body.is_featured !== undefined) patch.is_featured = body.is_featured === true;
  if (body.sort_order !== undefined && Number.isFinite(Number(body.sort_order))) {
    patch.sort_order = Number(body.sort_order);
  }
  if (body.start_at !== undefined) patch.start_at = normaliseDate(body.start_at);
  if (body.end_at !== undefined) patch.end_at = normaliseDate(body.end_at);

  if (body.image_stored_name !== undefined) {
    const next = String(body.image_stored_name || '');
    if (next && next !== current.image_stored_name) {
      if (!STORED_NAME_RE.test(next) || !fs.existsSync(path.join(UPLOAD_DIR, next))) {
        return res.status(400).json({ error: 'Nayi image valid nahi hai — dobara upload karo' });
      }
      // The old creative is only unreferenced once this poster stops pointing
      // at it, otherwise editing a second poster would blank the first one's art.
      const stillUsed = list.some((p) => p.id !== current.id && p.image_stored_name === current.image_stored_name);
      if (!stillUsed) unlinkStored(current.image_stored_name);
      patch.image_stored_name = next;
      patch.image_file_name = String(body.image_file_name || current.image_file_name).slice(0, 200);
    }
  }

  if (patch.is_featured === true) {
    // One hero ad at a time. Flipping this switch is the owner's decision to
    // stop the rotation, so clear the flag everywhere else in the same write.
    for (const p of list) if (p.id !== current.id && p.is_featured) p.is_featured = false;
  }

  list[idx] = { ...current, ...patch };
  db.posters = list;
  saveDb(db);

  const saved = list[idx];
  return res.json({ status: 'success', poster: { ...saved, is_live: isLive(saved), image_url: `/api/posters/file/${encodeURIComponent(saved.image_stored_name)}` } });
});

/** DELETE /api/posters/admin/:id — remove the poster and its image file. */
postersRouter.delete('/admin/:id', (req: Request, res: Response) => {
  const db = loadDb();
  const list = allPosters(db);
  const idx = list.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Poster not found' });

  const [removed] = list.splice(idx, 1);
  const stillUsed = list.some((p) => p.image_stored_name === removed.image_stored_name);
  if (!stillUsed) unlinkStored(removed.image_stored_name);

  db.posters = list;
  saveDb(db);
  return res.json({ status: 'success', message: 'Poster deleted', posters: list.length });
});
