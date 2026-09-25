import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ModulePdf } from '@/types';
import { authHeaders, fetchPdfBytesApi, pdfFileUrl } from '@/lib/api';
import {
  X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize,
  Loader2, FileWarning, RefreshCw, Eye, ShieldCheck
} from 'lucide-react';

interface PdfViewerModalProps {
  pdf: ModulePdf | null;
  moduleTitle: string;
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
}

type PdfJsPage = any;
type PdfJsDoc = any;

const PDF_STREAM_TIMEOUT_MS = 5000;

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('PDF stream timeout')), ms)),
  ]);

// Shared, cached pdfjs loader: starts in the background (CompanyModuleReader
// mount) so by the time the user opens the viewer the library + worker are
// already compiled and cached instead of paying that cost on the open click.
let pdfjsImportPromise: Promise<any> | null = null;
export const preloadPdfjs = (): Promise<any> => {
  if (!pdfjsImportPromise) {
    pdfjsImportPromise = import('pdfjs-dist').then((mod) => {
      try {
        mod.default.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
        fetch('/pdfjs/pdf.worker.min.mjs');
      } catch {
        // Worker warms via pdf.js on first open; nothing else to do here.
      }
      return mod;
    });
  }
  return pdfjsImportPromise;
};

const WATERMARK_YEARS = ['2026'];

const fmtSize = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  pdf,
  moduleTitle,
  companyName,
  isOpen,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageWrapRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PdfJsDoc | null>(null);
  const cacheRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const queueRef = useRef<number[]>([]);

  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<'width' | 'page'>('width');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ w: 720, h: 900 });

  const watermark = `LICENSED TO: ${companyName.toUpperCase()} VAULT • TieEdu • ${new Date().toISOString().split('T')[0]}`;

  // Anti-print / anti-copy while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S')) e.preventDefault();
    };
    const onPrint = (e: Event) => e.preventDefault();
    const onCtx = (e: Event) => e.preventDefault();
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeprint', onPrint);
    document.addEventListener('contextmenu', onCtx);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeprint', onPrint);
      document.removeEventListener('contextmenu', onCtx);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const cleanup = useCallback(() => {
    cacheRef.current.forEach((c) => c.remove());
    cacheRef.current.clear();
    queueRef.current = [];
    if (docRef.current) {
      docRef.current.destroy().catch(() => {});
      docRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !pdf) return;
    let cancelled = false;
    setStatus('loading');
    setProgress(null);
    setPage(1);

    const load = async () => {
      try {
        const pdfjsLib = await preloadPdfjs();
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

        // Dev: full-bytes download — fast on localhost and immune to
        // cross-origin range quirks. Prod: HTTP Range streaming so big PDFs
        // show page 1 immediately; falls back to a full download if it stalls.
        const canStream = process.env.NODE_ENV === 'production';

        const loadFromBytes = async (): Promise<PdfJsDoc> => {
          const bytes = await fetchPdfBytesApi(pdf.stored_name, (f) => setProgress(f));
          return pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
        };

        let doc: PdfJsDoc;
        if (canStream) {
          const streaming = pdfjsLib.getDocument({
            url: pdfFileUrl(pdf.stored_name),
            httpHeaders: authHeaders(),
            withCredentials: true,
          });
          streaming.onProgress = (p: any) =>
            setProgress(p.loaded && p.total ? p.loaded / p.total : null);
          try {
            doc = await withTimeout(streaming.promise, PDF_STREAM_TIMEOUT_MS);
          } catch {
            try { streaming.destroy(); } catch {}
            doc = await loadFromBytes();
          }
        } else {
          doc = await loadFromBytes();
        }

        if (cancelled) { doc.destroy(); return; }
        docRef.current = doc;
        setNumPages(doc.numPages);
        setProgress(null);
        setStatus('ready');
        if (doc.numPages > 0) setPage(1);
      } catch (e: any) {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(e && e.message === 'LOCKED'
          ? 'This module is locked — unlock the Complete Pack to open this PDF.'
          : 'The PDF could not be loaded. Please try again later.');
      }
    };

    load();
    return () => { cancelled = true; cleanup(); };
  }, [isOpen, pdf?.id, cleanup]);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setDimensions({ w: el.clientWidth || 720, h: el.clientHeight || 900 });
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [isOpen, status]);

  // Fit → zoom scale
  const effectiveScale = useCallback((): number => {
    const base = Math.min(2.5, Math.max(0.6, zoom));
    if (fitMode === 'width') {
      const pw = dimensions.w - 96;
      return Math.max(0.35, base * (pw / (Math.max(1, dimensions.w) - 96)) * 0.8 + 0.25);
    }
    return base;
  }, [zoom, fitMode, dimensions]);

  const renderPageInto = useCallback(async (pageNum: number) => {
    const doc = docRef.current;
    if (!doc) return null;
    if (cacheRef.current.has(pageNum)) return cacheRef.current.get(pageNum)!;
    const pdfPage = await doc.getPage(pageNum);
    const scale = effectiveScale() * (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const viewport = pdfPage.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    cacheRef.current.set(pageNum, canvas);
    return canvas;
  }, [effectiveScale]);

  // Render + show a page (with neighbor pre-cache)
  const showPage = useCallback(async (n: number, keepNeighbors = true) => {
    if (!docRef.current) return;
    setPage(n);
    const box = pageWrapRef.current;
    if (!box) return;
    box.innerHTML = '';
    const canvas = await renderPageInto(n);
    if (!canvas) return;
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    box.appendChild(canvas);
    if (keepNeighbors) {
      [n - 1, n + 1].forEach((m) => {
        if (m >= 1 && m <= numPages && !cacheRef.current.has(m) && queueRef.current.indexOf(m) === -1) {
          queueRef.current.push(m);
          setTimeout(() => { renderPageInto(m); queueRef.current = queueRef.current.filter((x) => x !== m); }, 60);
        }
      });
    }
  }, [renderPageInto, numPages]);

  useEffect(() => {
    if (status !== 'ready' || !cacheRef.current.has(page)) { showPage(page, true).catch(() => {}); }
  }, [status, page, effectiveScale, fitMode]);

  const goTo = useCallback((targetPage: number) => {
    const target = Math.min(Math.max(1, targetPage), numPages);
    if (target === page) return;
    // page transition: fade out, swap, fade in
    const box = pageWrapRef.current;
    if (box) box.classList.add('opacity-0', 'scale-[0.985]');
    setTimeout(() => { showPage(target, true).catch(() => {}); if (box) { box.classList.remove('opacity-0', 'scale-[0.985]'); } }, 160);
  }, [numPages, page, showPage]);

  if (!isOpen || !pdf) return null;

  const handleZoom = (delta: number) => {
    setZoom((z) => Math.min(3, Math.max(0.6, +(z + delta).toFixed(2))));
    cacheRef.current.clear();
    showPage(page, true).catch(() => {});
  };

  const handleFit = () => {
    setFitMode((m) => (m === 'width' ? 'page' : 'width'));
    cacheRef.current.clear();
    showPage(page, true).catch(() => {});
  };

  const dateLabel = pdf.uploaded_at ? ` • ${pdf.uploaded_at}` : '';

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-[#111827] text-gray-100 animate-in fade-in duration-200"
      role="dialog"
      aria-label={`PDF viewer: ${pdf.title}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Toolbar */}
      <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-300 transition-colors" title="Close">
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-white truncate">{pdf.title}</h2>
            <p className="text-[12px] text-gray-400 truncate">{moduleTitle} • {pdf.file_name} • {fmtSize(pdf.size_bytes)}{dateLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => handleZoom(-0.25)} className="p-2 rounded-lg hover:bg-white/10 text-gray-300 transition-colors" title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[12px] text-gray-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => handleZoom(0.25)} className="p-2 rounded-lg hover:bg-white/10 text-gray-300 transition-colors" title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={handleFit} className="p-2 rounded-lg hover:bg-white/10 text-gray-300 transition-colors ml-1" title="Fit page / Fit width">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* PDF Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative flex items-center justify-center p-6"
        onTouchStart={(e) => {
          const t = e.touches[0]; (e.target as any).__sx = t.clientX; (e.target as any).__ts = Date.now();
        }}
        onTouchEnd={(e) => {
          const startX = (e.target as any).__sx;
          const t0 = (e.target as any).__ts || 0;
          const dx = (e.changedTouches[0] || { clientX: startX }).clientX - (startX ?? 0);
          const dt = Date.now() - t0;
          if (Math.abs(dx) > 48 && dt < 500) {
            goTo(page + (dx < 0 ? 1 : -1));
          }
        }}
      >
        {/* loading */}
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 text-center w-full max-w-xs">
            <Loader2 className="w-8 h-8 text-[#E8A33D] animate-spin" />
            <p className="text-[13px] text-gray-400">Rendering PDF — this can take a moment…</p>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-200 ${progress === null ? 'bg-[#E8A33D]/80 animate-pulse' : 'bg-[#E8A33D]'}`}
                style={{ width: progress !== null ? `${Math.min(100, Math.max(4, Math.round(progress * 100)))}%` : '35%' }}
              />
            </div>
            {progress !== null && (
              <p className="text-[11px] text-gray-500">{Math.min(100, Math.round(progress * 100))}%</p>
            )}
            <p className="text-[11px] text-gray-500">Secure view-only · watermark licensed</p>
          </div>
        )}

        {/* error */}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-3 text-center max-w-sm">
            <FileWarning className="w-9 h-9 text-red-400" />
            <p className="text-[14px] text-gray-300 font-semibold">{errorMsg}</p>
            <button
              onClick={() => { setStatus('loading'); setErrorMsg(''); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-[13px] font-bold rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        )}

        {/* viewer */}
        {status === 'ready' && (
          <>
            <div
              ref={pageWrapRef}
              className="relative max-h-full overflow-auto transition-all duration-150 ease-out shadow-2xl rounded-md"
              style={{ transform: 'translateZ(0)' }}
            />
            {/* Watermark overlay on top of canvas */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute text-[11px] tracking-widest text-gray-100/10 font-semibold whitespace-nowrap"
                  style={{
                    transform: `rotate(-28deg)`,
                    top: `${(i % 3) * 34 + 8}%`,
                    left: `${Math.floor(i / 3) * 34 - 6}%`,
                  }}
                >
                  {watermark}
                </div>
              ))}
            </div>
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-gray-500 flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full">
              <Eye className="w-3.5 h-3.5" /> View only — plain download disabled
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 ml-1" />
            </p>
          </>
        )}
      </div>

      {/* Bottom bar */}
      {status === 'ready' && numPages > 0 && (
        <footer className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-white/10 shrink-0">
          <button onClick={() => goTo(page - 1)} disabled={page <= 1} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 text-gray-300 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <span className="text-[13px] text-gray-300">
              Page <strong>{page}</strong> / {numPages}
            </span>
            <input
              type="range"
              min={1}
              max={numPages}
              value={page}
              onChange={(e) => goTo(Number(e.target.value))}
              className="w-40 sm:w-64 accent-[#E8A33D]"
              aria-label="Page slider"
            />
          </div>

          <button onClick={() => goTo(page + 1)} disabled={page >= numPages} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 text-gray-300 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </footer>
      )}
    </div>
  );
};