import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { labelAllTables, type HastNode } from '@/lib/markdownTables';

const components: Partial<Components> = {
  a: ({ node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
  img: ({ node, alt, ...props }) => (
    /*
     * Markdown image sources are whatever URL the author wrote, on any host, and
     * `react-markdown` gives us no width or aspect ratio to declare. The optimizer
     * is scoped to the API origin, so routing these through `next/image` would
     * turn every externally hosted image in a paid vault's notes into a 400.
     * Lazy is the one thing worth keeping, and it is already here.
     */
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary author URL, see above
    <img {...props} alt={alt || ''} loading="lazy" decoding="async" />
  ),
  input: ({ node, ...props }) => (
    <input {...props} disabled={props.disabled ?? true} readOnly />
  ),
};

const rehypeLabelTables = () => (tree: HastNode) => labelAllTables(tree);

export interface MarkdownContentProps {
  children?: string;
  className?: string;
  compact?: boolean;
}

/**
 * The single markdown configuration for the whole app. Editor preview and student
 * reader both render through here, so what an admin previews is what students get.
 */
export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  children,
  className = '',
  compact = false,
}) => {
  return (
    <div className={`prose-article ${compact ? 'prose-compact' : ''} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeHighlight, { ignoreMissing: true, detect: false }],
          // Tags each cell with its column header so the mobile CSS can stack
          // the table into labelled rows (Phase 3, §3.2).
          rehypeLabelTables,
        ]}
        components={components}
      >
        {children || ''}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
