import React, { useEffect, useMemo, useRef } from 'react';
import {
  Heading1, Heading2, Heading3, List, ListOrdered, ListChecks,
  Quote, Table2, Lightbulb, Code, Layers, Minus,
} from 'lucide-react';
import { SLASH_COMMANDS, type EditorCommand } from './EditorToolbar';

const ICONS: Partial<Record<EditorCommand, any>> = {
  h1: Heading1, h2: Heading2, h3: Heading3,
  bullet: List, ordered: ListOrdered, task: ListChecks,
  quote: Quote, table: Table2, callout: Lightbulb,
  codefence: Code, mermaid: Layers, hr: Minus,
};

export interface SlashMatch {
  query: string;
  lineStart: number;
  lineIndex: number;
}

export const filterSlashCommands = (query: string) => {
  const q = query.toLowerCase();
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(
    (c) => c.label.toLowerCase().includes(q) || c.cmd.toLowerCase().includes(q)
  );
};

interface SlashMenuProps {
  match: SlashMatch;
  lineHeight: number;
  activeIndex: number;
  onHover: (i: number) => void;
  onSelect: (cmd: EditorCommand) => void;
}

export const SlashMenu: React.FC<SlashMenuProps> = ({
  match,
  lineHeight,
  activeIndex,
  onHover,
  onSelect,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => filterSlashCommands(match.query), [match.query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (items.length === 0) return null;

  const top = match.lineIndex * lineHeight + lineHeight + 4;

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Insert block"
      className="absolute z-30 w-[min(19rem,calc(100vw-3rem))] max-h-64 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xl p-1"
      style={{ top, left: 8 }}
    >
      {items.map((item, i) => {
        const Icon = ICONS[item.cmd] || Minus;
        const active = i === activeIndex;
        return (
          <button
            key={item.cmd}
            data-idx={i}
            type="button"
            role="option"
            aria-selected={active}
            onMouseEnter={() => onHover(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item.cmd);
            }}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors ${
              active ? 'bg-[#0284C7]/10 text-[#0284C7]' : 'text-[#334155] hover:bg-[#F1F5F9]'
            }`}
          >
            <span className="w-7 h-7 rounded-md bg-[#F1F5F9] flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold leading-tight">{item.label}</span>
              <span className="block text-[11px] text-[--text-muted] leading-tight">{item.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SlashMenu;
