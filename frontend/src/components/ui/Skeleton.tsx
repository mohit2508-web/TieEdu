import React from 'react';

/**
 * A shimmering placeholder block. Deliberately tiny and dependency-free — a
 * loading skeleton should never pull in a component library. The sweep comes
 * from the shared `.apple-skeleton` class in globals.css, so every skeleton in
 * the app shimmers identically and tracks the theme.
 */
export const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <span className={`apple-skeleton block rounded-[8px] ${className}`} style={style} />
);

export default Skeleton;
