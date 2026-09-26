import React, { useEffect, useRef, useState } from 'react';
import { ContentModule, ModulePdf } from '@/types';
import { pdfFileObjectUrlApi, uploadModulePdfApi, deleteModulePdfByIdApi } from '@/lib/api';
import { X, Upload, FileText, Trash2, CheckCircle2, Loader2, Eye, ShieldCheck, Plus } from 'lucide-react';

interface ModulePdfManagerProps {
  module: ContentModule;
  companyName?: string;
  onClose: () => void;
  onSaved: () => void;
}

const fmtSize = (b?: number) => {
  if (!b) return '—';
  return b > 1024 * 1024 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
};

// Normalize: support both old single-pdf and new pdfs[] format
function getModulePdfs(module: ContentModule): ModulePdf[] {
  if (Array.isArray(module.pdfs) && module.pdfs.length > 0) return module.pdfs;
  if (module.pdf) return [module.pdf];
  return [];
}

export const ModulePdfManager: React.FC<ModulePdfManagerProps> = ({ module, companyName, onClose, onSaved }) => {
  const [pdfs, setPdfs] = useState<ModulePdf[]>(getModulePdfs(module));
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewPdfId, setPreviewPdfId] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Load preview blob URL for currently previewed PDF
  useEffect(() => {
    if (!previewPdfId) return;
    const pdf = pdfs.find(p => p.id === previewPdfId);
    if (!pdf) return;
    if (previewUrls[previewPdfId]) return; // already loaded
    let active = true;
    pdfFileObjectUrlApi(pdf.stored_name)
      .then(url => { if (active) setPreviewUrls(prev => ({ ...prev, [previewPdfId]: url })); })
      .catch(() => {});
    return () => { active = false; };
  }, [previewPdfId, pdfs]);

  // Revoke all blob URLs on unmount
  useEffect(() => {
    return () => { Object.values(previewUrls).forEach(url => URL.revokeObjectURL(url)); };
  }, []);

  const flash = (t: string, type: 'ok' | 'err') => { setMsg({ text: t, type }); setTimeout(() => setMsg(null), 4000); };

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf') return flash('Only PDF files are allowed (25MB max).', 'err');
    if (f.size > 25 * 1024 * 1024) return flash('PDF is larger than 25MB.', 'err');
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.pdf$/i, ''));
  };

  const handleUpload = async () => {
    if (!file) return flash('Select a PDF file first.', 'err');
    setBusy(true);
    try {
      const res = await uploadModulePdfApi(module.id, file, title, setProgress);
      // Backend returns both pdf (new one) and pdfs (full array)
      if (res.pdfs) {
        setPdfs(res.pdfs);
      } else if (res.pdf) {
        setPdfs(prev => [...prev, res.pdf]);
      }
      setTitle('');
      setFile(null);
      setProgress(null);
      flash('PDF uploaded successfully — students can now view it.', 'ok');
      onSaved();
    } catch (e: any) {
      flash(e?.message || 'Upload failed.', 'err');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (pdf: ModulePdf) => {
    if (!confirm(`Delete "${pdf.title}"? This file will be permanently removed.`)) return;
    setBusy(true);
    try {
      const res = await deleteModulePdfByIdApi(module.id, pdf.id);
      if (res.status === 'success') {
        setPdfs(res.pdfs ?? pdfs.filter(p => p.id !== pdf.id));
        if (previewPdfId === pdf.id) setPreviewPdfId(null);
        flash('PDF deleted.', 'ok');
        onSaved();
      } else {
        flash(res.error || 'Delete failed.', 'err');
      }
    } catch {
      flash('Delete failed.', 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#EDEDEB] my-8 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-[15px] text-[#1F3A5F] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0284C7]" /> PDF Library — {pdfs.length} PDF{pdfs.length !== 1 ? 's' : ''}
            </h3>
            <p className="text-[13px] text-[--text-muted] mt-0.5">
              {companyName || 'Company'} • {module.title} — Multiple PDFs allowed per module
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
        </div>

        {msg && (
          <div className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {msg.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            {msg.text}
          </div>
        )}

        {/* Uploaded PDFs list */}
        {pdfs.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[12px] font-bold text-[--text-muted] uppercase tracking-wider">Uploaded PDFs ({pdfs.length})</p>
            {pdfs.map((pdf) => (
              <div key={pdf.id} className="p-4 bg-[#FAFAF9] border border-gray-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#0284C7] text-white flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#1E293B] truncate">{pdf.title}</p>
                      <p className="text-[12px] text-[--text-muted] truncate">{pdf.file_name} • {fmtSize(pdf.size_bytes)} • {pdf.uploaded_at}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setPreviewPdfId(previewPdfId === pdf.id ? null : pdf.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-[#0284C7] rounded-xl text-[12px] font-bold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> {previewPdfId === pdf.id ? 'Hide' : 'Preview'}
                    </button>
                    <button
                      onClick={() => handleDelete(pdf)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-[12px] font-bold transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>

                {/* Inline preview toggle */}
                {previewPdfId === pdf.id && (
                  <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <Eye className="w-3.5 h-3.5 text-[#0284C7]" /> Admin Live Preview
                    </div>
                    {previewUrls[pdf.id] ? (
                      <iframe src={previewUrls[pdf.id]} title={pdf.title} className="w-full h-64" />
                    ) : (
                      <div className="w-full h-64 flex items-center justify-center text-[12px] text-[--text-muted]">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading preview…
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl text-center space-y-2">
            <FileText className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-[13px] text-[--text-muted]">No PDFs uploaded for this module yet — upload one below.</p>
          </div>
        )}

        {/* Upload zone */}
        <div className="space-y-3">
          <p className="text-[12px] font-bold text-[--text-muted] uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add New PDF
          </p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
            onClick={() => inputRef.current?.click()}
            className={`p-6 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${dragOver ? 'border-[#0284C7] bg-sky-50' : 'border-gray-300 bg-white hover:border-[#0284C7]/50'}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <Upload className="w-7 h-7 text-[#0284C7] mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1E293B]">Drag & drop, or click to choose a PDF</p>
            <p className="text-[12px] text-[--text-muted] mt-1">application/pdf • 25MB max • Multiple uploads supported</p>
            {file && (
              <p className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-sky-50 border border-sky-200 text-[#0284C7] rounded-xl text-[12px] font-bold">
                <FileText className="w-3.5 h-3.5" /> {file.name} ({fmtSize(file.size)})
              </p>
            )}
          </div>

          {file && (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[12px] font-bold text-[#1E293B] mb-1">Title (shown to students)</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  placeholder="e.g. DBMS Cheat Notes, System Design Guide"
                />
              </div>
              {progress !== null && (
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-[#0284C7] transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
              <button
                onClick={handleUpload}
                disabled={busy}
                className="w-full py-3 bg-[#0284C7] hover:bg-[#0369A1] text-white text-[13px] font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {progress !== null ? `Uploading… ${progress}%` : 'Upload PDF'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};