import React, { useEffect, useRef, useState } from 'react';
import { ContentModule, ModulePdf } from '@/types';
import { pdfFileObjectUrlApi, uploadModulePdfApi, deleteModulePdfApi } from '@/lib/api';
import { X, Upload, FileText, Trash2, CheckCircle2, Loader2, Eye, ShieldCheck } from 'lucide-react';

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

export const ModulePdfManager: React.FC<ModulePdfManagerProps> = ({ module, companyName, onClose, onSaved }) => {
  const [pdf, setPdf] = useState<ModulePdf | null>(module.pdf || null);
  const [title, setTitle] = useState(module.pdf?.title || '');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Admin live preview — authenticated blob URL (premium module PDFs work for admins now)
  useEffect(() => {
    let active = true;
    if (!pdf) { setPreviewUrl(null); return; }
    pdfFileObjectUrlApi(pdf.stored_name)
      .then((url) => { if (active) setPreviewUrl(url); })
      .catch(() => { if (active) setPreviewUrl(null); });
    return () => { active = false; };
  }, [pdf?.stored_name]);

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
      setPdf(res.pdf || null);
      setTitle(res.pdf?.title || title);
      setFile(null);
      setProgress(null);
      flash('PDF uploaded — students can now view and download it from this module.', 'ok');
      onSaved();
    } catch (e: any) {
      flash(e?.message || 'Upload failed.', 'err');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!pdf) return;
    if (!confirm(`Delete "${pdf.title}" PDF? Ye file server se hata di jayegi.`)) return;
    setBusy(true);
    try {
      const res = await deleteModulePdfApi(module.id);
      if (res.status === 'success') {
        setPdf(null);
        setTitle('');
        setFile(null);
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
              <FileText className="w-5 h-5 text-[#0284C7]" /> PDF Library — Module
            </h3>
            <p className="text-[13px] text-[--text-muted] mt-0.5">
              {companyName || 'Company'} • {module.round_type || ''} • {module.title} — 1 PDF per module (replace karne par purani delete)
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

        {/* Current upload */}
        {pdf ? (
          <div className="p-4 bg-[#FAFAF9] border border-gray-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#0284C7] text-white flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <p className="font-bold text-[#1E293B] truncate">{pdf.title}</p>
                  <p className="text-[12px] text-[--text-muted] truncate">{pdf.file_name} • {fmtSize(pdf.size_bytes)} • {pdf.uploaded_at}</p>
                </div>
              </div>
              <button onClick={handleDelete} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-[12px] font-bold transition-colors shrink-0">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <Eye className="w-3.5 h-3.5 text-[#0284C7]" /> Admin Live Preview
              </div>
              {previewUrl ? (
                <iframe src={previewUrl} title={pdf.title} className="w-full h-64" />
              ) : (
                <div className="w-full h-64 flex items-center justify-center text-[12px] text-[--text-muted]">Preview loading…</div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl text-center space-y-2">
            <FileText className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-[13px] text-[--text-muted]">No PDF uploaded for this module yet — upload one below.</p>
          </div>
        )}

        {/* Upload/replace zone */}
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
          <p className="text-sm font-bold text-[#1E293B]">{pdf ? 'Replace PDF (old one auto-deletes)' : 'Drag & drop, or click to choose a PDF'}</p>
          <p className="text-[12px] text-[--text-muted] mt-1">application/pdf • 25MB max</p>
          {file && (
            <p className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-sky-50 border border-sky-200 text-[#0284C7] rounded-xl text-[12px] font-bold">
              <FileText className="w-3.5 h-3.5" /> {file.name} ({fmtSize(file.size)})
            </p>
          )}
        </div>

        {file && (
          <div className="space-y-2.5">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-bold text-[#1E293B] mb-1">Title (shown to students)</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]" placeholder="e.g. DBMS Cheat Notes" />
              </div>
            </div>
            {progress !== null && (
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-[#0284C7] transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
            <button onClick={handleUpload} disabled={busy} className="w-full py-3 bg-[#0284C7] hover:bg-[#0369A1] text-white text-[13px] font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {progress !== null ? `Uploading… ${progress}%` : (pdf ? 'Replace PDF' : 'Upload PDF')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};