import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Card — hairline border by default (§4.3: "one raised shadow for the primary
 * card per screen; no glows").
 *
 *   plain     the default; most cards
 *   raised    the one card the screen is about
 *   feature   larger radius, for a hero-sized card
 *   ink       the page's one heavy band, as a card
 *
 * `as` lets a card be an <article>, <li> or <section> without a wrapper div.
 */

export type CardVariant = 'plain' | 'raised' | 'feature' | 'ink';

const VARIANT: Record<CardVariant, string> = {
  plain: 'bg-card border border-line rounded-[14px]',
  raised: 'bg-card border border-line rounded-[14px] shadow-raised',
  feature: 'bg-card border border-line rounded-[20px]',
  ink: 'bg-brand-ink text-white rounded-[20px] ring-1 ring-inset ring-white/10', // the ring keeps its edge in dark mode
};

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  as?: 'div' | 'article' | 'section' | 'li' | 'aside';
  /** Inner padding; `none` for cards whose content runs edge to edge. */
  pad?: 'none' | 'sm' | 'md' | 'lg';
}

const PAD = { none: '', sm: 'p-4', md: 'p-5 sm:p-6', lg: 'p-6 sm:p-8' };

export const Card: React.FC<CardProps> = ({ variant = 'plain', as: Tag = 'div', pad = 'md', className, children, ...rest }) => (
  <Tag className={cn(VARIANT[variant], PAD[pad], className)} {...rest}>
    {children}
  </Tag>
);

export default Card;
