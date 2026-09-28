import React from 'react';
import {
  Bold, Italic, Strikethrough, Code, Link2, Quote,
  List, ListOrdered, ListChecks, Heading1, Heading2, Heading3,
  Minus, Table2, Lightbulb, Layers, Image as ImageIcon,
  IndentIncrease, IndentDecrease, Undo2, Redo2, Eye,
} from 'lucide-react';
import type { TextEdit, TextSelection } from './markdownActions';
import {
  wrapInline, toggleHeading, toggleBullet, toggleOrdered, toggleTask, toggleQuote,
  indentLines, outdentLines, insertBlock, insertHr, insertLink, insertCodeFence,
  insertMermaid, insertCallout, insertTable,
} from './markdownActions';

export type EditorCommand =
  | 'bold' | 'italic' | 'strike' | 'code' | 'link'
  | 'h1' | 'h2' | 'h3'
  | 'bullet' | 'ordered' | 'task' | 'quote'
  | 'indent' | 'outdent'
  | 'hr' | 'table' | 'callout' | 'mermaid' | 'codefence' | 'image';

interface Group {
  label: string;
  items: { cmd: EditorCommand; icon: any; title: string }[];
}

const GROUPS: Group[] = [
  {
    label: 'Headings',
    items: [
      { cmd: 'h1', icon: Heading1, title: 'Heading 1' },
      { cmd: 'h2', icon: Heading2, title: 'Heading 2' },
      { cmd: 'h3', icon: Heading3, title: 'Heading 3' },
    ],
  },
  {
    label: 'Inline',
    items: [
      { cmd: 'bold', icon: Bold, title: 'Bold' },
      { cmd: 'italic', icon: Italic, title: 'Italic' },
      { cmd: 'strike', icon: Strikethrough, title: 'Strikethrough' },
      { cmd: 'code', icon: Code, title: 'Inline code' },
      { cmd: 'link', icon: Link2, title: 'Insert link' },
    ],
  },
  {
    label: 'Lists',
    items: [
      { cmd: 'bullet', icon: List, title: 'Bullet list' },
      { cmd: 'ordered', icon: ListOrdered, title: 'Numbered list' },
      { cmd: 'task', icon: ListChecks, title: 'Checklist' },
      { cmd: 'quote', icon: Quote, title: 'Quote' },
    ],
  },
  {
    label: 'Structure',
    items: [
      { cmd: 'table', icon: Table2, title: 'Insert table' },
      { cmd: 'hr', icon: Minus, title: 'Divider' },
      { cmd: 'outdent', icon: IndentDecrease, title: 'Outdent' },
      { cmd: 'indent', icon: IndentIncrease, title: 'Indent' },
    ],
  },
  {
    label: 'Blocks',
    items: [
      { cmd: 'codefence', icon: Code, title: 'Code block' },
      { cmd: 'mermaid', icon: Layers, title: 'Mermaid diagram' },
      { cmd: 'callout', icon: Lightbulb, title: 'Callout' },
      { cmd: 'image', icon: ImageIcon, title: 'Image' },
    ],
  },
];

export function applyCommand(
  cmd: EditorCommand,
  s: TextSelection
): TextEdit | null {
  switch (cmd) {
    case 'bold': return wrapInline(s, '**', 'bold text');
    case 'italic': return wrapInline(s, '*', 'italic text');
    case 'strike': return wrapInline(s, '~~', 'struck text');
    case 'code': return wrapInline(s, '`', 'code');
    case 'link': return insertLink(s);
    case 'h1': return toggleHeading(s, 1);
    case 'h2': return toggleHeading(s, 2);
    case 'h3': return toggleHeading(s, 3);
    case 'bullet': return toggleBullet(s);
    case 'ordered': return toggleOrdered(s);
    case 'task': return toggleTask(s);
    case 'quote': return toggleQuote(s);
    case 'indent': return indentLines(s);
    case 'outdent': return outdentLines(s);
    case 'hr': return insertHr(s);
    case 'table': return insertTable(s);
    case 'codefence': return insertCodeFence(s);
    case 'mermaid': return insertMermaid(s);
    case 'callout': return insertCallout(s);
    case 'image': return insertBlock(s, '![alt text](https://example.com/image.png)');
    default: return null;
  }
}

export const SLASH_COMMANDS: { cmd: EditorCommand; label: string; hint: string }[] = [
  { cmd: 'h1', label: 'Heading 1', hint: 'Large section title' },
  { cmd: 'h2', label: 'Heading 2', hint: 'Medium section title' },
  { cmd: 'h3', label: 'Heading 3', hint: 'Small section title' },
  { cmd: 'bullet', label: 'Bullet list', hint: 'Unordered list' },
  { cmd: 'ordered', label: 'Numbered list', hint: 'Ordered steps' },
  { cmd: 'task', label: 'Checklist', hint: 'Trackable checkboxes' },
  { cmd: 'quote', label: 'Quote', hint: 'Blockquote' },
  { cmd: 'table', label: 'Table', hint: '3x3 grid' },
  { cmd: 'callout', label: 'Callout', hint: 'Highlighted tip' },
  { cmd: 'codefence', label: 'Code block', hint: 'Syntax-highlighted' },
  { cmd: 'mermaid', label: 'Diagram', hint: 'Mermaid flowchart' },
  { cmd: 'hr', label: 'Divider', hint: 'Horizontal rule' },
];

interface EditorToolbarProps {
  onCommand: (cmd: EditorCommand) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// 44px tap targets on touch (the row scrolls horizontally, so the extra width
// costs a swipe rather than a layout break), compact 36px from `sm` up where
// there is a real pointer.
const btn =
  'shrink-0 inline-flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-lg text-[#475569] hover:bg-[#0284C7]/10 hover:text-[#0284C7] transition-colors focus-ring disabled:opacity-30 disabled:pointer-events-none';

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onCommand,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1.5 -mb-1.5 [scrollbar-width:thin]">
      {(
        <>
          <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label="History">
            <button type="button" className={btn} onClick={onUndo} disabled={!canUndo} title="Undo" aria-label="Undo">
              <Undo2 className="w-4 h-4" />
            </button>
            <button type="button" className={btn} onClick={onRedo} disabled={!canRedo} title="Redo" aria-label="Redo">
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
          <span className="shrink-0 w-px h-5 bg-[#E2E8F0] mx-1" />
        </>
      )}
      {GROUPS.map((group, gi) => (
        <React.Fragment key={group.label}>
          {gi > 0 && <span className="shrink-0 w-px h-5 bg-[#E2E8F0] mx-1" />}
          <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label={group.label}>
            {group.items.map((item) => (
              <button
                key={item.cmd}
                type="button"
                className={btn}
                onClick={() => onCommand(item.cmd)}
                title={item.title}
                aria-label={item.title}
              >
                <item.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </React.Fragment>
      ))}
      <span className="shrink-0 ml-auto inline-flex items-center gap-1 text-[10px] font-mono uppercase text-gray-400 pl-2">
        <Eye className="w-3 h-3" /> Live preview
      </span>
    </div>
  );
};

export default EditorToolbar;
