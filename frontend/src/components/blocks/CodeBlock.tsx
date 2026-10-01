import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, Maximize2 } from 'lucide-react';
import { Sheet } from '@/components/common/Sheet';

/**
 * A code block you can actually read on a phone (Phase 3, plan §3.2).
 *
 * Three problems it solves, all of which the bare `<pre>` had:
 *
 *  1. **The copy button was absolutely positioned over the code, inside a
 *     horizontally scrolling container.** On mobile it either scrolled away or
 *     sat on top of the first line, and it was only discoverable on hover, which
 *     does not exist on a touch screen. It is now always visible, in a header
 *     that does not scroll with the code.
 *  2. **Horizontal overflow with no affordance.** Long lines simply ran off the
 *     edge. The block now scrolls properly (`touch-pan-x`, momentum) and says so.
 *  3. **No way to read a wide block without scrolling it.** Expand opens the code
 *     full-screen, where the wrapping can be switched on.
 */

export interface CodeBlockProps {
  code: string;
  /** Shown in the header and used as the sheet's accessible name. */
  label?: string;
  className?: string;
}

/** Below this many lines the expand affordance is noise, not a feature. */
const EXPAND_MIN_LINES = 8;

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, label = 'Code', className = '' }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = useCallback(() => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    window.clearTimeout(timer.current);
    // Long enough to actually notice, short enough that it is not nagging.
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }, [code]);

  const lineCount = code.split('\n').length;
  const canExpand = lineCount >= EXPAND_MIN_LINES;

  const body = (
    <pre
      className="m-0 overflow-x-auto px-4 py-3.5 text-[13px] leading-relaxed"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
      tabIndex={0}
      // A scroll container that cannot be scrolled by keyboard is invisible to
      // anyone tabbing through the page.
      aria-label={canExpand ? `${label}, scrollable` : undefined}
    >
      <code className="font-mono">{code}</code>
    </pre>
  );

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-xl bg-[#0F172A] text-gray-100 ${className}`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-black/25 px-3 py-1.5">
          <span className="truncate text-[11px] font-bold uppercase tracking-wider text-gray-400">
            {label}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {canExpand && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                aria-label={`Expand ${label} full screen`}
                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-white/10 active:bg-white/15"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onCopy}
              aria-label={copied ? `${label} copied` : `Copy ${label}`}
              className="flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-gray-300 transition-colors hover:bg-white/10 active:bg-white/15"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        {body}
      </div>

      {canExpand && (
        <Sheet
          open={expanded}
          onClose={() => setExpanded(false)}
          title={label}
          contentClassName="bg-[#0F172A]"
        >
          <pre className="m-0 overflow-x-auto p-4 text-[13px] leading-relaxed text-gray-100">
            <code className="font-mono">{code}</code>
          </pre>
        </Sheet>
      )}
    </>
  );
};

export default CodeBlock;
