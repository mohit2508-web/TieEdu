import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { ContentBlock } from '@/types';
import {
  Lock, Copy, Check, Info, AlertTriangle, Lightbulb,
  Maximize2, X, ChevronRight, Play, Cpu, Layers, ZoomIn, Table2, Video, Music
} from 'lucide-react';

interface ContentBlockRendererProps {
  block: ContentBlock;
  isLocked?: boolean;
  companyName?: string;
  onUnlockClick?: () => void;
}

export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  isLocked = false,
  companyName = 'Target Company',
  onUnlockClick
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'cpp' | 'java' | 'python' | 'ts'>('cpp');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [mermaidSvg, setMermaidSvg] = useState<string | null>(null);
  const [mermaidError, setMermaidError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);

  const { block_type, payload } = block;

  /* ------ Mermaid diagram rendering ------ */
  useEffect(() => {
    if (block_type !== 'diagram' || !payload.source || isLocked) return;
    let mounted = true;
    import('mermaid').then(m => {
      const mermaid = m.default;
      mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose', fontFamily: 'Calibre, Calibri, Inter, sans-serif' });
      const id = `mmd-${Math.random().toString(36).slice(2, 9)}`;
      mermaid.render(id, payload.source!)
        .then(({ svg }) => { if (mounted) setMermaidSvg(svg); })
        .catch(() => { if (mounted) setMermaidError(true); });
    }).catch(() => { if (mounted) setMermaidError(true); });
    return () => { mounted = false; };
  }, [block_type, payload.source, isLocked]);

  /* ------ Helpers ------ */
  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runCode = async () => {
    setIsRunning(true);
    setRunOutput(null);
    try {
      const url = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000') + '/api/sandbox/execute';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: payload.code || '', language: selectedLang })
      });
      const data = await res.json();
      setRunOutput(data.output || 'Done.');
    } catch {
      setRunOutput('Code preview unavailable right now — check the backend and try again.');
    } finally { setIsRunning(false); }
  };

  const openLightbox = (src: string) => { setLightboxSrc(src); setLightboxOpen(true); };

  /* ------ LOCKED STATE ------ */
  if (isLocked) {
    return (
      <div className="relative my-6 rounded-xl border border-amber-200 overflow-hidden bg-gradient-to-b from-amber-50/30 to-white">
        <div className="blur-sm select-none pointer-events-none opacity-25 p-6 space-y-3">
          <div className="h-4 bg-gray-300 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-5/6" />
          <div className="h-24 bg-gray-100 rounded w-full mt-3" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white/75 backdrop-blur-sm">
          <div className="w-11 h-11 rounded-full bg-[#1F3A5F]/10 flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-[#1F3A5F]" />
          </div>
          <h4 className="font-bold text-[#1F3A5F] mb-1">Unlock {companyName} Solution</h4>
          <p className="text-sm text-gray-500 max-w-xs mb-4 leading-relaxed">
            Full code solutions, diagrams, and guided walkthroughs.
          </p>
          <button
            onClick={onUnlockClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E8A33D] hover:bg-[#d6922e] text-[#241A06] text-sm font-bold rounded-xl transition-colors"
          >
            Unlock Access — ₹249
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ================================================================
     BLOCK RENDERERS
     ================================================================ */
  switch (block_type) {

    /* ---- MARKDOWN ---- */
    case 'markdown': {
      return (
        <div className="my-4">
          <div className="prose-article">
            <ReactMarkdown>{payload.text || ''}</ReactMarkdown>
          </div>
        </div>
      );
    }

    /* ---- CODE ---- */
    case 'code': {
      const getCode = (lang: string) => payload.code || `// ${companyName} — ${lang.toUpperCase()} solution`;
      return (
        <div className="my-5 rounded-xl overflow-hidden border border-[--border-subtle] shadow-sm">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2 bg-[#F4F4F2] px-4 py-2.5 border-b border-[--border-subtle]">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-[--brand-accent]" />
              <span className="text-[12px] font-semibold text-[--text-heading] font-mono">
                {payload.filename || 'Solution'}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">
                O(N) · O(1)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Lang switcher */}
              <div className="flex bg-white border border-[--border-subtle] rounded-lg overflow-hidden text-[11px] font-mono">
                {(['cpp', 'java', 'python', 'ts'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`px-2.5 py-1 uppercase font-bold transition-colors ${
                      selectedLang === lang
                        ? 'bg-[--brand-primary] text-white'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              {/* Run */}
              <button
                onClick={runCode}
                disabled={isRunning}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[--brand-accent] hover:bg-[--brand-accent-hover] text-[#241A06] text-[11px] font-bold rounded-lg transition-colors disabled:opacity-60 font-mono"
              >
                {isRunning ? <Cpu className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                {isRunning ? 'Running…' : 'Run'}
              </button>

              {/* Copy */}
              <button
                onClick={() => copyCode(getCode(selectedLang))}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[--border-subtle] text-[11px] text-gray-500 hover:text-gray-800 rounded-lg transition-colors font-mono"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Code body */}
          <div className="overflow-x-auto bg-white text-[13px]">
            <SyntaxHighlighter
              language={selectedLang === 'ts' ? 'typescript' : selectedLang}
              style={oneLight}
              showLineNumbers
              customStyle={{ margin: 0, padding: '1rem 1.25rem', background: 'transparent', fontSize: '0.82rem' }}
            >
              {getCode(selectedLang)}
            </SyntaxHighlighter>
          </div>

          {/* Terminal output */}
          {runOutput && (
            <div className="bg-[#111] text-emerald-300 px-4 pt-3 pb-4 font-mono text-[12px]">
              <div className="flex justify-between text-gray-500 mb-2 text-[11px]">
                <span className="flex items-center gap-1.5"><Cpu className="w-3 h-3 text-emerald-400" /> Output</span>
                <button onClick={() => setRunOutput(null)}><X className="w-3.5 h-3.5 hover:text-white" /></button>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed">{runOutput}</pre>
            </div>
          )}
        </div>
      );
    }

    /* ---- DIAGRAM (Mermaid) ---- */
    case 'diagram': {
      return (
        <div className="my-5 border border-[--border-subtle] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 bg-[#F4F4F2] px-4 py-2.5 border-b border-[--border-subtle]">
            <Layers className="w-3.5 h-3.5 text-[--brand-accent]" />
            <span className="text-[12px] font-semibold text-[--text-heading]">
              {payload.title || 'Architecture Diagram'}
            </span>
          </div>
          <div className="bg-white p-4 overflow-x-auto flex justify-center min-h-[120px] items-center">
            {mermaidSvg ? (
              <div dangerouslySetInnerHTML={{ __html: mermaidSvg }} className="w-full flex justify-center" />
            ) : mermaidError ? (
              <pre className="text-[12px] font-mono text-gray-600 p-4 bg-gray-50 rounded-lg w-full whitespace-pre-wrap">
                {payload.source}
              </pre>
            ) : (
              <div className="text-[12px] text-gray-400 flex items-center gap-2">
                <Cpu className="w-4 h-4 animate-spin" /> Rendering diagram…
              </div>
            )}
          </div>
        </div>
      );
    }

    /* ---- IMAGE ---- */
    case 'image': {
      const src = payload.url || '';
      if (!src) {
        return (
          <div className="my-5 p-6 rounded-xl border border-dashed border-[--border-subtle] bg-gray-50 text-center text-[13px] text-[--text-muted]">
            {payload.caption || payload.alt || 'No image uploaded for this block yet.'}
          </div>
        );
      }
      return (
        <figure className="my-5">
          <div
            className="relative group cursor-zoom-in overflow-hidden rounded-xl border border-[--border-subtle] bg-gray-50"
            onClick={() => openLightbox(src)}
          >
            <img
              src={src}
              alt={payload.alt || 'Figure'}
              loading="lazy"
              className="w-full h-auto max-h-[480px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
            />
            <div className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="w-4 h-4" />
            </div>
          </div>
          {payload.caption && (
            <figcaption className="text-center text-[12px] text-[--text-muted] mt-2">{payload.caption}</figcaption>
          )}

          {/* Lightbox */}
          {lightboxOpen && (
            <div
              className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4"
              onClick={() => setLightboxOpen(false)}
            >
              <div className="relative max-w-5xl w-full" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setLightboxOpen(false)}
                  className="absolute -top-10 right-0 text-white/70 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
                <img
                  src={lightboxSrc}
                  alt="Full size"
                  className="w-full h-auto max-h-[88vh] object-contain rounded-xl"
                />
                {payload.caption && (
                  <p className="text-center text-white/60 text-sm mt-3">{payload.caption}</p>
                )}
              </div>
            </div>
          )}
        </figure>
      );
    }

    /* ---- ANIMATION (Step trace) ---- */
    case 'animation': {
      const steps = payload.steps || [
        { title: 'Step 1', desc: 'Initial state setup.' },
        { title: 'Step 2', desc: 'Processing & comparison.' },
        { title: 'Step 3', desc: 'Result propagation.' },
      ];
      return (
        <div className="my-5 border border-[--border-subtle] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between bg-[#F4F4F2] px-4 py-2.5 border-b border-[--border-subtle]">
            <div className="flex items-center gap-2">
              <Play className="w-3.5 h-3.5 text-[--brand-accent] fill-current" />
              <span className="text-[12px] font-semibold text-[--text-heading]">Step-by-Step Trace</span>
            </div>
            <span className="text-[11px] text-[--text-muted]">{activeStepIdx + 1} / {steps.length}</span>
          </div>

          {/* Step nav */}
          <div className="flex gap-1.5 px-4 py-3 border-b border-[--border-subtle] overflow-x-auto">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveStepIdx(i)}
                className={`shrink-0 px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-colors border ${
                  activeStepIdx === i
                    ? 'bg-[--brand-primary] text-white border-[--brand-primary]'
                    : 'bg-white text-gray-600 border-[--border-subtle] hover:border-gray-300'
                }`}
              >
                {s.title.split(':')[0]}
              </button>
            ))}
          </div>

          {/* Active step content */}
          <div className="bg-white px-5 py-4 space-y-2">
            <h5 className="font-semibold text-[14px] text-[--text-heading]">{steps[activeStepIdx]?.title}</h5>
            <p className="text-sm text-[--text-body] leading-relaxed">{steps[activeStepIdx]?.desc}</p>
            {steps[activeStepIdx]?.code_snippet && (
              <pre className="mt-2 p-3 bg-[#F4F4F2] rounded-lg text-[12px] font-mono text-[--brand-primary] overflow-x-auto">
                {steps[activeStepIdx].code_snippet}
              </pre>
            )}
          </div>
        </div>
      );
    }

    /* ---- CALLOUT ---- */
    case 'callout': {
      const style = payload.style || 'tip';
      const config = {
        warning: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800', Icon: AlertTriangle, iconColor: 'text-red-500' },
        info:    { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800', Icon: Info, iconColor: 'text-blue-500' },
        tip:     { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', Icon: Lightbulb, iconColor: 'text-amber-500' },
      }[style] || { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', Icon: Lightbulb, iconColor: 'text-amber-500' };

      return (
        <div className={`my-4 ${config.bg} border-l-4 ${config.border} rounded-r-xl px-4 py-3.5 flex items-start gap-3`}>
          <config.Icon className={`w-5 h-5 ${config.iconColor} shrink-0 mt-0.5`} />
          <div className={`${config.text} text-sm leading-relaxed`}>
            {payload.title && <strong className="block font-bold mb-0.5">{payload.title}</strong>}
            <p>{payload.text}</p>
          </div>
        </div>
      );
    }

    /* ---- TABLE ---- */
    case 'table': {
      const headers: string[] = payload.headers || [];
      const rows: string[][] = payload.rows || [];
      return (
        <div className="my-5 border border-[--border-subtle] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 bg-[#F4F4F2] px-4 py-2.5 border-b border-[--border-subtle]">
            <Table2 className="w-3.5 h-3.5 text-[--brand-accent]" />
            <span className="text-[12px] font-semibold text-[--text-heading]">{payload.title || 'Reference Table'}</span>
          </div>
          <div className="overflow-x-auto bg-white">
            <table className="w-full text-sm">
              {headers.length > 0 && (
                <thead>
                  <tr className="border-b border-[--border-subtle] bg-[#FAFAF9]">
                    {headers.map((h, i) => (
                      <th key={i} className="px-4 py-2.5 text-left text-[12px] font-bold text-[--text-heading] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-[--border-subtle]/60 last:border-b-0 hover:bg-[#FAFAF9]">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2.5 text-[13px] text-[--text-body] whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    /* ---- VIDEO (YouTube embed / MP4) ---- */
    case 'video': {
      const url: string = payload.video_url || '';
      const type: string = payload.video_type || 'youtube';
      let embedUrl = url;
      if (url.includes('youtube.com/watch')) {
        const v = url.split('v=')[1]?.split('&')[0];
        if (v) embedUrl = `https://www.youtube.com/embed/${v}`;
      } else if (url.includes('youtu.be/')) {
        const v = url.split('youtu.be/')[1]?.split('?')[0];
        if (v) embedUrl = `https://www.youtube.com/embed/${v}`;
      }
      return (
        <div className="my-5 border border-[--border-subtle] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 bg-[#F4F4F2] px-4 py-2.5 border-b border-[--border-subtle]">
            <Video className="w-3.5 h-3.5 text-[--brand-accent]" />
            <span className="text-[12px] font-semibold text-[--text-heading]">{payload.title || 'Video Walkthrough'}</span>
          </div>
          <div className="aspect-video bg-black">
            {type === 'youtube' ? (
              <iframe
                className="w-full h-full"
                src={embedUrl}
                title={payload.title || 'Video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video className="w-full h-full" controls src={url}>
                Your browser does not support video playback.
              </video>
            )}
          </div>
        </div>
      );
    }

    /* ---- AUDIO ---- */
    case 'audio': {
      return (
        <div className="my-5 border border-[--border-subtle] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 bg-[#F4F4F2] px-4 py-2.5 border-b border-[--border-subtle]">
            <Music className="w-3.5 h-3.5 text-[--brand-accent]" />
            <span className="text-[12px] font-semibold text-[--text-heading]">{payload.title || 'Audio Guide'}</span>
            {payload.duration_seconds && (
              <span className="text-[10px] font-mono text-[--text-muted]">{Math.round(payload.duration_seconds / 60)} min</span>
            )}
          </div>
          <div className="p-4 bg-white">
            <audio controls src={payload.url || ''} className="w-full">
              Your browser does not support audio playback.
            </audio>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
};
