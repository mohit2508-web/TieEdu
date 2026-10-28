import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Card — white, hairline border, 20px radius (UI_REDESIGN_PLAN_V3 §10).
 *
 *   plain     the default; most cards
 *   raised    the one card the screen is about; lifts with the pop shadow
 *   feature   28px radius, for a hero-sized card
 *   ink       the teal band as a card, with the faint graph-paper grid
 *   tint-*    a soft wash of one meaning colour, for notes and callouts
 *
 * `as` lets a card be an <article>, <li> or <section> without a wrapper div.
 */

export type CardVariant =
  | 'plain'
  | 'raised'
  | 'feature'
  | 'ink'
  | 'tint-primary'
  | 'tint-secondary'
  | 'tint-info'
  | 'tint-rose'
  | 'tint-success';

const VARIANT: Record<CardVariant, string> = {
  plain: 'bg-card border border-line rounded-card',
  raised: 'bg-card border border-line rounded-card shadow-pop',
  feature: 'bg-card border border-line rounded-band',
  // The ring keeps the band's edge visible in dark mode, where teal is close to the page.
  ink: 'tk-inherit-p bg-hero text-hero-on rounded-band grid-paper-on-hero ring-1 ring-inset ring-hero-edge',
  'tint-primary': 'tk-inherit-p bg-signal-soft text-signal-ink rounded-card',
  'tint-secondary': 'tk-inherit-p bg-secondary-soft text-secondary rounded-card',
  'tint-info': 'tk-inherit-p bg-info-soft text-info rounded-card',
  'tint-rose': 'tk-inherit-p bg-rose-soft text-rose rounded-card',
  'tint-success': 'tk-inherit-p bg-success-soft text-success rounded-card',
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
