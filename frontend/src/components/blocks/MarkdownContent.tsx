import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

const components: Partial<Components> = {
  a: ({ node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
  img: ({ node, alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={alt || ''} loading="lazy" />
  ),
  input: ({ node, ...props }) => (
    <input {...props} disabled={props.disabled ?? true} readOnly />
  ),
};

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
        rehypePlugins={[[rehypeHighlight, { ignoreMissing: true, detect: false }]]}
        components={components}
      >
        {children || ''}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
