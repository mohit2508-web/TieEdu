import React, { useEffect, useRef, useState } from 'react';
import { FileText, Star, Trash2, Upload, AlertCircle } from 'lucide-react';
import { DriveShell } from '@/components/drives/DriveShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchResumesApi, uploadResumeApi, deleteResumeApi } from '@/lib/drivesApi';
import type { StudentResume } from '@/types/drives';

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ResumeScreen() {
  const [rows, setRows] = useState<StudentResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try { setRows(await fetchResumesApi()); } catch (e) { setError((e as Error).message || 'Could not load resumes.'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadResumeApi(file, file.name.replace(/\.[^.]+$/, ''), setProgress);
      }
      await load();
    } catch (e) {
      setError((e as Error).message || 'Upload failed.');
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteResumeApi(id);
      setRows((prev) => prev.filter((r) => r.resume_id !== id));
    } catch (e) {
      setError((e as Error).message || 'Could not delete.');
    }
  };

  return (
    <DriveShell title="My resumes">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-8 pt-4">
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-[10px] px-3 py-2 text-[13px]" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>
            <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {/* Upload target */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files); }}
          className="rounded-[14px] border-2 border-dashed px-4 py-8 text-center transition-colors"
          style={{ borderColor: dragOver ? 'var(--apple-blue)' : 'var(--apple-separator)', background: dragOver ? 'var(--apple-blue-soft)' : 'var(--apple-surface)' }}
        >
          <Upload size={24} className="mx-auto" style={{ color: dragOver ? 'var(--apple-blue)' : 'var(--apple-label-3)' }} />
          <p className="mt-2 text-[14px] font-medium" style={{ color: 'var(--apple-label)' }}>
            {uploading ? (progress === null ? 'Uploading…' : `Uploading… ${progress}%`) : 'Drop a PDF here'}
          </p>
          <p className="mt-0.5 text-[12px]" style={{ color: 'var(--apple-label-2)' }}>or</p>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="mt-2 rounded-[10px] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--apple-blue)' }}
          >
            Choose file
          </button>
          <input ref={inputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        </div>

        {/* List */}
        <div className="mt-4">
          {loading ? (
            <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <div className="rounded-[12px] border px-4 py-10 text-center" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
              <FileText size={22} className="mx-auto" style={{ color: 'var(--apple-label-3)' }} />
              <p className="mt-2 text-[14px] font-medium" style={{ color: 'var(--apple-label)' }}>No resumes yet</p>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--apple-label-2)' }}>Upload one to attach it when you register for a drive.</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {rows.map((r) => (
                <li key={r.resume_id} className="flex items-center gap-3 rounded-[12px] border p-3.5" style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]" style={{ background: 'var(--apple-blue-soft)', color: 'var(--apple-blue)' }}>
                    <FileText size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium" style={{ color: 'var(--apple-label)' }}>
                      {r.title}
                      {r.is_default && <Star size={12} className="ml-1.5 inline" fill="currentColor" style={{ color: 'var(--apple-yellow)' }} />}
                    </p>
                    <p className="truncate text-[12px]" style={{ color: 'var(--apple-label-2)' }}>
                      {r.file_name} · {fmtSize(r.size_bytes)}
                    </p>
                  </div>
                  <button type="button" onClick={() => remove(r.resume_id)} aria-label={`Delete ${r.title}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]" style={{ color: 'var(--apple-red)' }}>
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DriveShell>
  );
}
