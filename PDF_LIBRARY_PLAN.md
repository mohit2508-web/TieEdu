# PDF Upload (Admin) + Smooth View-Only PDF Viewer (Student) Plan — v2 (single PDF/module)

## Decisions (confirmed)
1. **Har module me EK single PDF** — `module.pdf` (null ho sakta hai). Re-upload = replace (purani file delete + nayi).
2. **Watermark = company + date** (`LICENSED TO: {Company} Vault • {dd-mmm-yyyy}`). No user id (auth nahi).
3. **25MB limit, sirf `application/pdf`**.

## Data model (backend/data/db.json)
Har module par optional single:
```json
"pdf": {
  "id": "pdf-1698...",
  "file_name": "DBMS_Cheatsheet.pdf",
  "stored_name": "pdf-1727...-a1b2.pdf",
  "size_bytes": 512000,
  "title": "DBMS Cheat Notes",
  "uploaded_at": "2026-09-22"
}
```
(absent/null = koi PDF nahi). Disk file `backend/uploads/pdfs/<stored_name>.pdf`.

## Realistic "view-only"
- pdfjs canvas render, raw file DOM me nahi, no blob URL in normal flow.
- No download button; `contextmenu`, `Ctrl/Cmd+P`, `Ctrl/Cmd+S` blocked while open.
- Per-page diagonal watermark company+date. Devtools-savvy prevention impossible — documented.
- Serve: `Content-Disposition: inline`, `Cache-Control: private, no-store`.

## Part A — Backend
- `npm i multer` + `npm i -D @types/multer`.
- `server.ts`: boot par `mkdirSync(uploads/pdfs)` + mount `pdfLibraryRouter` at `/api/pdf`.
- **`POST /api/pdf/admin/modules/:moduleId/upload`**: multer single('file') + `title` field; strict pdf/25MB; `stored_name = pdf-<ts>-<rand4>.pdf` (charset whitelist); agar `module.pdf` pehle se hai → purani file disk se delete; nayi file write + meta set + saveDb; 201 meta.
- **`DELETE /api/pdf/admin/modules/:moduleId/pdf`**: `module.pdf = null` + disk delete + saveDb.
- **`GET /api/pdf/file/:storedName`**: `^pdf-[0-9]+-[a-z0-9]{4}\.pdf$` guard; `sendFile` inline + nosniff + no-store. Premium module + un-unlocked/user check → 403.
- `db.ts`: `ModulePdf` interface + `pdf?: ModulePdf | null` module field.

## Part B — Student
- `npm i pdfjs-dist`; worker via `?url` import (fallback: copy to `public/pdfjs/`).
- `ModulePdf` + `pdf?: ModulePdf | null` on `ContentModule` (frontend types).
- api.ts: `uploadModulePdfApi(moduleId, file, title)` (FormData+XHR progress), `deleteModulePdfApi(moduleId)`, `fetchPdfBytesApi(storedName)` → ArrayBuffer, `pdfFileUrl(storedName)` (admin preview only).
- **`PdfViewerModal.tsx`**: full-screen dark; pdfjs canvas; lazy + neighbor pre-render; fit-width/± zoom; `X of N` slider + prev/next; swipe/ArrowKeys; watermark overlay; anti-download; loading/error/retry.
- **Reader**: naya nav section "PDF Library"; `module.pdf` hota hua card ("Open Viewer") ya empty note; premium locked → blur + Unlock CTA (no fetch). Preview module abhi bi premium/free me respected.

## Part C — Admin
- `ContentBuilder` module row me "PDF" button (icon, badge hain/to nahi) → **`ModulePdfManager`** modal: current file info + Replace/upload zone (drag-drop + picker, title, progress bar, 25MB msg) + Delete (confirm) + preview `<embed>`; onSaved refresh.

## Verification
1. backend `tsc`; 2. curl upload → db.json + disk file; replace → purani delete; delete → file gone; 3. GET inline / garbage 404 / locked 403; 4. frontend `tsc` + build (pdfjs worker); 5. manual QA (admin upload → reader viewer → swipe/zoom/wm/Print-block; free module bina unlock; premium locked unlock CTA).