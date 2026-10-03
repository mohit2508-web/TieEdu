import React, { useState, useEffect, useRef } from 'react';
import { CODE_LANGS, prismName, resolveLang, type CodeLang } from '@/lib/codeLang';
import { API_BASE_URL } from '@/lib/api';
import { MarkdownContent } from '@/components/blocks/MarkdownContent';
import { CourseAnimation } from '@/components/blocks/CourseAnimations';
import { Sheet } from '@/components/common/Sheet';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/cjs/prism-light';
import c from 'react-syntax-highlighter/dist/cjs/languages/prism/c';
import cpp from 'react-syntax-highlighter/dist/cjs/languages/prism/cpp';
import typescript from 'react-syntax-highlighter/dist/cjs/languages/prism/typescript';
import java from 'react-syntax-highlighter/dist/cjs/languages/prism/java';
import python from 'react-syntax-highlighter/dist/cjs/languages/prism/python';
import bash from 'react-syntax-highlighter/dist/cjs/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/cjs/languages/prism/json';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { ContentBlock } from '@/types';
import {
  Lock, Copy, Check, Info, AlertTriangle, Lightbulb,
  Maximize2, X, ChevronRight, Play, Cpu, Layers, ZoomIn, Table2, Video, Music,
  ListChecks, Link2, PlayCircle
} from 'lucide-react';

SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('json', json);

interface ContentBlockRendererProps {
  block: ContentBlock;
  isLocked?: boolean;
  companyName?: string;
  onUnlockClick?: () => void;
  /**
   * Real amount the pack ladder will charge for this company right now (already reduced
   * to the modules the viewer still lacks). Required whenever isLocked — showing a fixed
   * price here is how a portal advertises Rs 249 and then charges Rs 99.
   */
  unlockPrice?: number;
}

export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
  isLocked = false,
  companyName = 'Target Company',
  onUnlockClick,
  unlockPrice
}) => {
  const { block_type, payload } = block;

  const [copied, setCopied] = useState(false);
  // The authored language wins on first render. This used to be hardcoded to
  // 'cpp', so a Python solution an admin had written was syntax-highlighted as
  // C++ until the reader noticed and clicked the switcher themselves.
  const [selectedLang, setSelectedLang] = useState<CodeLang>(() => resolveLang(payload?.language));  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [mermaidSvg, setMermaidSvg] = useState<string | null>(null);
  const [mermaidError, setMermaidError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);

  // A block is authored once but can switch language per block instance, so the
  // selection is local state seeded from the payload. Re-seed when the block
  // itself changes (e.g. server-driven preview swapping blocks in place).
  const authoredLang = payload?.language;
  useEffect(() => {
    setSelectedLang(resolveLang(authoredLang));
  }, [block.id, authoredLang]);

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
      // Same-origin via the `/api` rewrite in `next.config.mjs`. This used to be
      // `NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'`, which pointed every
      // client that was not on the server's own machine — a phone, any deployed
      // host — at *its own* loopback, so "Run" could never work there.
      const res = await fetch(`${API_BASE_URL}/sandbox/execute`, {
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
            Unlock Access{typeof unlockPrice === 'number' ? ` — ₹${unlockPrice}` : ''}
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
          <MarkdownContent>{payload.text || ''}</MarkdownContent>
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
              {/*
                Only shown when the author stated a complexity. This was a
                hardcoded "O(N) · O(1)" badge rendered on every code block
                regardless of the code — a fabricated claim about the reader's
                algorithm, on a page whose whole point is not making claims
                nobody checked.
              */}
              {payload.complexity ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">
                  {payload.complexity}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {/* Lang switcher */}
              <div
                role="group"
                aria-label="Code language"
                className="flex bg-white border border-[--border-subtle] rounded-lg overflow-hidden text-[11px] font-mono"
              >
                {CODE_LANGS.map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedLang(lang)}
                    aria-pressed={selectedLang === lang}
                    className={`px-2.5 py-1 uppercase font-bold transition-colors focus-ring ${
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
              language={prismName(selectedLang)}
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
            {/*
             * Both of these stay plain `<img>`.
             *
             * Figure sources come from authored vault and course content, so they
             * point at whatever host the author used. `next/image` would 400 on
             * every one of those that is not our API origin, and a broken figure in
             * a paid vault is a much worse outcome than an unoptimised one.
             *
             * The lightbox is a second, independent reason: it needs the original
             * URL to show the full-resolution image, and it opens precisely when
             * someone has asked to see more detail — routing that through an
             * optimizer that may re-encode or refuse the source is the wrong
             * trade.
             *
             * `w-full h-auto` also means the width is genuinely unknown at render
             * time, so there is no width/height to declare here without inventing
             * an aspect ratio the content does not have.
             */}
            {/* eslint-disable-next-line @next/next/no-img-element -- authored content, arbitrary host, see above */}
            <img
              src={src}
              alt={payload.alt || 'Figure'}
              loading="lazy"
              decoding="async"
              className="w-full h-auto max-h-[480px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
            />
            <div className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-lg transition-opacity">
              <ZoomIn className="w-4 h-4" />
            </div>
          </div>
          {payload.caption && (
            <figcaption className="text-center text-[12px] text-[--text-muted] mt-2">{payload.caption}</figcaption>
          )}

          {/* Lightbox.

              Built on `Sheet` rather than a hand-rolled `fixed inset-0` overlay.
              The hand-rolled version had no `role="dialog"`, so a screen reader
              never announced it; no focus trap or focus restore, so Tab walked off
              into the page behind; no Escape handler; and no scroll lock, so the
              article underneath moved while the "zoomed" figure was open. Its close
              button also sat at `-top-10`, which is above the top of a phone
              viewport once the figure is tall - the one control that has to be
              reachable was the one that was not.

              `side="bottom"` with a fixed height and no handle: the content is a
              single figure, so a drag-to-dismiss grabber would be a gesture that
              competes with pinch-zoom. */}
          <Sheet
            open={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            title={payload.alt || 'Figure'}
            side="bottom"
            zIndex={100}
            showHandle={false}
            className="max-h-[92vh] bg-transparent"
            contentClassName="flex flex-col items-center justify-center gap-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- lightbox needs the original URL, see above */}
            <img
              src={lightboxSrc}
              alt="Full size"
              decoding="async"
              className="w-full h-auto max-h-[70vh] object-contain rounded-xl"
            />
            {payload.caption && (
              <p className="text-center text-white/60 text-sm">{payload.caption}</p>
            )}
          </Sheet>
        </figure>
      );
    }

    /* ---- ANIMATION ----
       Delegates to CourseAnimations, which dispatches on payload.kind. `step`
       (the original step-trace widget) and every other kind render there, so
       there is exactly one implementation of the chrome, the transport and the
       reduced-motion behaviour. */
    case 'animation': {
      return <CourseAnimation payload={payload} />;
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
      // A row is only rendered when it is genuinely an array of cells. Anything
      // else is skipped rather than mapped over: one malformed row used to throw
      // `row.map is not a function`, and an uncaught throw inside a phase body
      // takes down the whole study-plan page, not just the table.
      const rows: string[][] = (Array.isArray(payload.rows) ? payload.rows : [])
        .filter((r): r is unknown[] => Array.isArray(r))
        .map((r) => r.map((cell) => (cell == null ? '' : String(cell))));
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
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-[13px] text-[--text-muted]">No rows in this table yet.</td>
                  </tr>
                ) : (
                  rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-[--border-subtle]/60 last:border-b-0 hover:bg-[#FAFAF9]">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-4 py-2.5 text-[13px] text-[--text-body] whitespace-nowrap">{cell}</td>
                      ))}
                    </tr>
                  ))
                )}
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
      /* `playsinline=1` stops iOS Safari from taking over the screen the moment
         play is tapped — see the note on the <video> below. It is a URL param for
         an iframe and an attribute for a <video>, so both have to be set. */
      const INLINE_PARAMS = '?rel=0&playsinline=1';
      if (url.includes('youtube.com/watch')) {
        const v = url.split('v=')[1]?.split('&')[0];
        if (v) embedUrl = `https://www.youtube.com/embed/${v}${INLINE_PARAMS}`;
      } else if (url.includes('youtu.be/')) {
        const v = url.split('youtu.be/')[1]?.split('?')[0];
        if (v) embedUrl = `https://www.youtube.com/embed/${v}${INLINE_PARAMS}`;
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
              <video
                className="w-full h-full"
                controls
                // Without `playsInline`, iOS Safari takes the tap on play as a
                // request to go fullscreen: it tears the player out of the page
                // and covers the lesson title and the rest of the app. It has to
                // be an attribute, not just a URL param, on a bare <video>.
                playsInline
                // `metadata` is enough to show a duration and a scrub bar without
                // pulling the whole file down on a phone connection. The default,
                // `auto`, downloads the entire video before the learner can play.
                preload="metadata"
                src={url}
              >
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

    /* ---- STEPS ---- */
    // The course seed and the admin editor both emit `steps` blocks with
    // { title, steps: [{ title, desc, code_snippet }] }. Without this case they
    // fell through to `default` and rendered as nothing at all.
    case 'steps': {
      const items: { title?: string; desc?: string; code_snippet?: string }[] = Array.isArray(payload.steps)
        ? payload.steps
        : [];
      if (items.length === 0) {
        return (
          <div className="my-5 rounded-xl border border-dashed border-[--border-subtle] p-4 text-[13px] text-[--text-muted]">
            Steps block with no steps.
          </div>
        );
      }
      return (
        <div className="my-5">
          {payload.title && (
            <p className="text-[13px] font-bold text-[--text-heading] mb-3">{payload.title}</p>
          )}
          <ol className="space-y-3">
            {items.map((s, i) => (
              <li
                key={i}
                className="flex gap-3.5 rounded-xl border border-[--border-subtle] bg-white p-3.5"
              >
                <span className="shrink-0 w-6 h-6 rounded-full bg-[#E8F4FB] text-[#0271B5] text-[12px] font-extrabold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {s.title && (
                    <p className="text-[14px] font-semibold text-[--text-heading] mb-0.5">{s.title}</p>
                  )}
                  {s.desc && (
                    <p className="text-[14px] text-[--text-body] leading-relaxed whitespace-pre-line">
                      {s.desc}
                    </p>
                  )}
                  {s.code_snippet && (
                    <pre className="mt-2.5 rounded-lg bg-[#1E1E1E] text-[#E6EDF3] p-3 text-[12px] leading-relaxed overflow-x-auto font-mono">
                      <code>{s.code_snippet}</code>
                    </pre>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    }

    /* ---- CHECKLIST ---- */
    case 'checklist': {
      const items: string[] = Array.isArray(payload.items) ? payload.items : [];
      return (
        <div className="my-5 border border-[--border-subtle] rounded-xl overflow-hidden bg-white">
          <div className="flex items-center gap-2 bg-[#F4F4F2] px-4 py-2.5 border-b border-[--border-subtle]">
            <ListChecks className="w-3.5 h-3.5 text-[--brand-accent]" />
            <span className="text-[12px] font-semibold text-[--text-heading]">
              {payload.title || 'Checklist'}
            </span>
            <span className="ml-auto text-[10px] font-mono text-[--text-muted]">{items.length} items</span>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-4 text-[13px] text-[--text-muted]">No items in this checklist yet.</p>
          ) : (
            <ul className="divide-y divide-[--border-subtle]">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                  <span className="mt-0.5 w-4 h-4 rounded border-2 border-[--border-subtle] bg-white shrink-0" />
                  <span className="text-[14px] text-[--text-body] leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    /* ---- RESOURCES ---- */
    case 'resources': {
      const items: { label: string; url: string }[] = Array.isArray(payload.links) ? payload.links : [];
      return (
        <div className="my-5 border border-[--border-subtle] rounded-xl overflow-hidden bg-white">
          <div className="flex items-center gap-2 bg-[#F4F4F2] px-4 py-2.5 border-b border-[--border-subtle]">
            <Link2 className="w-3.5 h-3.5 text-[--brand-accent]" />
            <span className="text-[12px] font-semibold text-[--text-heading]">
              {payload.title || 'Resources'}
            </span>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-4 text-[13px] text-[--text-muted]">No resources linked yet.</p>
          ) : (
            <ul className="divide-y divide-[--border-subtle]">
              {items.map((item, i) => (
                <li key={i}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF9] transition-colors group"
                  >
                    <Link2 className="w-3.5 h-3.5 text-[--text-muted] shrink-0" />
                    <span className="text-[14px] font-medium text-[--text-heading] group-hover:text-[--brand-primary] break-words">
                      {item.label || item.url}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[--text-muted] ml-auto shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    /* ---- VIDEO LINK ---- */
    // Accepted by the admin API's BLOCK_TYPES but previously had no case here,
    // so an author could add one and it would render as an empty gap. It is a
    // plain outbound link to a video, not an embedded player: the tracked
    // completion gate is driven by lesson.video, and an embed would let a
    // learner watch without the server counting any of it.
    case 'video_link': {
      const url: string = payload.url || payload.video_url || '';
      if (!url) {
        return (
          <div className="my-5 rounded-xl border border-dashed border-[--border-subtle] p-4 text-[13px] text-[--text-muted]">
            Video link block with no URL.
          </div>
        );
      }
      return (
        <div className="my-5 rounded-xl border border-[--border-subtle] bg-white overflow-hidden">
          <div className="flex items-center gap-2 bg-[#F4F4F2] px-4 py-2.5 border-b border-[--border-subtle]">
            <PlayCircle className="w-3.5 h-3.5 text-[--brand-accent]" />
            <span className="text-[12px] font-semibold text-[--text-heading]">
              {payload.title || 'Related video'}
            </span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF9] transition-colors group"
          >
            <Link2 className="w-3.5 h-3.5 text-[--text-muted] shrink-0" />
            <span className="text-[14px] font-medium text-[--text-heading] group-hover:text-[--brand-primary] break-words">
              {payload.title ? `Watch: ${url}` : url}
            </span>
            <ChevronRight className="w-4 h-4 text-[--text-muted] ml-auto shrink-0" />
          </a>
        </div>
      );
    }

    default:
      return null;
  }
};
