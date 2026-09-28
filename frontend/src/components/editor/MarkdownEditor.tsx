import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { EditorToolbar, applyCommand, type EditorCommand } from './EditorToolbar';
import { SlashMenu, filterSlashCommands, type SlashMatch } from './SlashMenu';
import { wordCount, readingMinutes, type TextSelection, type TextEdit } from './markdownActions';
import { looksLikeHtml, normalizePastedText } from '@/lib/richText';

interface Snapshot {
  value: string;
  start: number;
  end: number;
}

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  draftKey?: string;
  ariaLabel?: string;
  /** Hide the toolbar until the editor is focused. Use where many editors stack. */
  compact?: boolean;
  /**
   * Soft cap for this field. The count turns amber past 85% and red past 100%.
   * The backend truncates at its own cap, so an over-limit field that saves
   * silently is worse than a loud one: the admin would only find out on the
   * student page, which shows the truncated text.
   */
  maxChars?: number;
}

export const clearEditorDraft = (key?: string) => {
  if (typeof window === 'undefined' || !key) return;
  try {
    window.localStorage.removeItem(`tieedu:md-draft:${key}`);
  } catch {
    /* storage unavailable */
  }
};

const DRAFT_PREFIX = 'tieedu:md-draft:';

/**
 * Clear every saved draft whose key starts with `prefix`.
 *
 * The pack editor has ~13 nested fields, so it cannot enumerate their keys to
 * clear them on save. That matters because of how restore works: a draft is
 * re-applied whenever a field is *empty* on mount. Without this, saving a pack
 * and later clearing a field to empty would resurrect the pre-save text the next
 * time that section was opened.
 */
export const clearEditorDraftsWithPrefix = (prefix?: string) => {
  if (typeof window === 'undefined' || !prefix) return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(`${DRAFT_PREFIX}${prefix}`)) doomed.push(key);
    }
    doomed.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* storage unavailable */
  }
};

const SLASH_RE = /^(\s*)\/([a-zA-Z0-9]*)$/;

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write your content here…',
  minHeight = 220,
  draftKey,
  ariaLabel = 'Markdown content editor',
  compact = false,
  maxChars,
}) => {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pendingSel = useRef<{ start: number; end: number } | null>(null);
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const [, bumpHistory] = useState(0);
  const [slash, setSlash] = useState<SlashMatch | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [lineHeight, setLineHeight] = useState(24);
  const [showHint, setShowHint] = useState(true);

  const snapshot = useCallback((): Snapshot => {
    const ta = taRef.current;
    return {
      value,
      start: ta ? ta.selectionStart : value.length,
      end: ta ? ta.selectionEnd : value.length,
    };
  }, [value]);

  const pushHistory = useCallback(() => {
    past.current = [...past.current, snapshot()].slice(-120);
    future.current = [];
    bumpHistory((n) => n + 1);
  }, [snapshot]);

  const commit = useCallback(
    (next: string, start: number, end: number) => {
      if (next === value) return;
      pushHistory();
      pendingSel.current = { start, end };
      onChange(next);
    },
    [value, onChange, pushHistory]
  );

  useLayoutEffect(() => {
    const p = pendingSel.current;
    if (!p) return;
    const ta = taRef.current;
    if (ta) {
      ta.focus();
      ta.setSelectionRange(p.start, p.end);
    }
    pendingSel.current = null;
  }, [value]);

  useEffect(() => {
    if (!draftKey) return;
    try {
      const draft = window.localStorage.getItem(`tieedu:md-draft:${draftKey}`);
      if (draft && value === '') onChange(draft);
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || !value) return;
    try {
      window.localStorage.setItem(`tieedu:md-draft:${draftKey}`, value);
    } catch {
      /* storage unavailable */
    }
  }, [value, draftKey]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    const lh = parseFloat(window.getComputedStyle(ta).lineHeight);
    if (!Number.isNaN(lh) && lh > 0) setLineHeight(lh);
  }, []);

  const syncSlash = useCallback(
    (caret: number) => {
      const lineStart = value.lastIndexOf('\n', caret - 1) + 1;
      const lineToCaret = value.slice(lineStart, caret);
      const m = SLASH_RE.exec(lineToCaret);
      if (m) {
        const lineIndex = value.slice(0, lineStart).split('\n').length - 1;
        setSlash({ query: m[2], lineStart, lineIndex });
        setSlashIndex(0);
      } else {
        setSlash(null);
      }
    },
    [value]
  );

  const currentSelection = (): TextSelection => {
    const ta = taRef.current;
    return {
      value,
      selectionStart: ta ? ta.selectionStart : value.length,
      selectionEnd: ta ? ta.selectionEnd : value.length,
    };
  };

  const runCommand = useCallback(
    (cmd: EditorCommand) => {
      const edit: TextEdit | null = applyCommand(cmd, currentSelection());
      if (edit) commit(edit.value, edit.selectionStart, edit.selectionEnd);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, commit]
  );

  const applySlashCommand = useCallback(
    (cmd: EditorCommand) => {
      if (!slash) return;
      const ta = taRef.current;
      const caret = ta ? ta.selectionStart : value.length;
      const stripped = value.slice(0, slash.lineStart) + value.slice(caret);
      const base: TextSelection = {
        value: stripped,
        selectionStart: slash.lineStart,
        selectionEnd: slash.lineStart,
      };
      const edit = applyCommand(cmd, base);
      if (edit) commit(edit.value, edit.selectionStart, edit.selectionEnd);
      setSlash(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slash, value, commit]
  );

  const undo = useCallback(() => {
    const prev = past.current[past.current.length - 1];
    if (!prev) return;
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, snapshot()].slice(-120);
    pendingSel.current = { start: prev.start, end: prev.end };
    onChange(prev.value);
    bumpHistory((n) => n + 1);
  }, [onChange, snapshot]);

  const redo = useCallback(() => {
    const next = future.current[future.current.length - 1];
    if (!next) return;
    future.current = future.current.slice(0, -1);
    past.current = [...past.current, snapshot()].slice(-120);
    pendingSel.current = { start: next.start, end: next.end };
    onChange(next.value);
    bumpHistory((n) => n + 1);
  }, [onChange, snapshot]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    pushHistory();
    onChange(e.target.value);
    syncSlash(e.target.selectionStart);
    setShowHint(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = taRef.current;
    if (!ta) return;

    const mod = e.metaKey || e.ctrlKey;

    if (slash) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((i) => i + 1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const target = filterSlashCommands(slash.query)[slashIndex];
        if (target) applySlashCommand(target.cmd);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlash(null);
        return;
      }
    }

    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const s = currentSelection();
      if (s.selectionStart !== s.selectionEnd || !s.value.slice(s.selectionStart, s.selectionEnd).includes('\n')) {
        if (s.selectionStart === s.selectionEnd) {
          commit(
            s.value.slice(0, s.selectionStart) + '  ' + s.value.slice(s.selectionEnd),
            s.selectionStart + 2,
            s.selectionStart + 2
          );
          return;
        }
      }
      runCommand(e.shiftKey ? 'outdent' : 'indent');
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && ta.selectionStart === ta.selectionEnd) {
      const caret = ta.selectionStart;
      const lineStart = value.lastIndexOf('\n', caret - 1) + 1;
      const line = value.slice(lineStart, caret);
      const m = /^(\s*)([-*+]\s+\[[ xX]\]\s*|[-*+]\s+|\d+\.\s+|>\s?)(.*)$/.exec(line);
      if (m) {
        e.preventDefault();
        const [, indent, marker, rest] = m;
        if (rest.trim() === '') {
          const caretPos = lineStart + indent.length;
          commit(value.slice(0, lineStart) + indent + value.slice(caret), caretPos, caretPos);
        } else {
          const nextMarker = /^\d+\.\s*$/.test(marker)
            ? `${parseInt(marker, 10) + 1}. `
            : marker;
          const insertion = '\n' + indent + nextMarker;
          commit(
            value.slice(0, caret) + insertion + value.slice(caret),
            caret + insertion.length,
            caret + insertion.length
          );
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData('text/html');
    if (!html) return; // plain-text paste: let the browser insert it untouched
    e.preventDefault();
    // Prefer a markdown conversion of the HTML. Falling back to text/plain is what
    // used to happen unconditionally, which silently dropped every bold, list and
    // table an admin pasted from Google Docs or Word.
    const plain = looksLikeHtml(html)
      ? normalizePastedText(html)
      : e.clipboardData.getData('text/plain') || html.replace(/<[^>]+>/g, '');
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    commit(
      value.slice(0, start) + plain + value.slice(end),
      start + plain.length,
      start + plain.length
    );
  };

  const words = wordCount(value);

  return (
    <div className={`rounded-xl border border-[#E2E8F0] bg-white focus-within:ring-2 focus-within:ring-[#0284C7]/40 focus-within:border-[#0284C7] transition-shadow overflow-hidden ${compact ? 'group' : ''}`}>
      {/* In compact mode the toolbar only appears while the editor has focus. The pack
          form stacks a dozen editors, and a permanently visible toolbar on each one
          buries the fields themselves. */}
      <div className={`px-2 py-1.5 border-b border-[#E2E8F0] bg-[#FAFAF9] ${compact ? 'hidden group-focus-within:block' : ''}`}>
        <EditorToolbar
          onCommand={runCommand}
          onUndo={undo}
          onRedo={redo}
          canUndo={past.current.length > 0}
          canRedo={future.current.length > 0}
        />
      </div>

      <div ref={wrapRef} className="relative">
        <textarea
          ref={taRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onClick={(e) => syncSlash((e.target as HTMLTextAreaElement).selectionStart)}
          onBlur={() => window.setTimeout(() => setSlash(null), 150)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          spellCheck
          className="w-full px-4 py-3 font-mono text-[13.5px] leading-6 text-[#1E293B] bg-transparent focus:outline-none resize-y"
          style={{ minHeight }}
        />

        {slash && (
          <SlashMenu
            match={slash}
            lineHeight={lineHeight}
            activeIndex={slashIndex}
            onHover={setSlashIndex}
            onSelect={applySlashCommand}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 border-t border-[#E2E8F0] bg-[#FAFAF9] text-[10.5px] font-mono text-[--text-muted]">
        <span>{words} words</span>
        <span aria-hidden="true">·</span>
        <span>{readingMinutes(value)} min read</span>
        <span aria-hidden="true">·</span>
        <span
          className={
            !maxChars ? undefined
              : value.length > maxChars ? 'text-red-600 font-bold'
                : value.length > maxChars * 0.85 ? 'text-amber-600 font-bold'
                  : undefined
          }
        >
          {value.length}{maxChars ? ` / ${maxChars}` : ''} chars
        </span>
        {maxChars != null && value.length > maxChars && (
          <span className="text-red-600 font-bold">
            Over the limit — saving will cut the end off
          </span>
        )}
        <span className="ml-auto hidden sm:inline text-[--text-muted]">
          Pasting from a web page? Formatting is cleaned automatically
        </span>
        {showHint && value === '' && (
          <span className="text-[--brand-primary]">
            Type <kbd className="px-1 rounded bg-white border border-[#E2E8F0]">/</kbd> for blocks
          </span>
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;
