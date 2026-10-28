import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Button — four kinds, and the kind carries the meaning.
 *
 *   primary    the one next step on the screen. Amber (`signal`), dark ink.
 *   buy        spends money. The same amber since the Warm Paper palette
 *              (plan D1); the price on or next to it makes it read as a purchase.
 *   secondary  an alternative to the primary. Card surface, hairline, neutral edge.
 *   text       a link that happens to be a button.
 *
 * One primary per screen is the rule, not something this component can enforce.
 * Height floors at 44px from `md` up so every button clears the touch target.
 * Passing `href` renders a Next link with the same styling.
 */

export type ButtonKind = 'primary' | 'buy' | 'secondary' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';

/*
 * Warm Paper (UI_REDESIGN_PLAN_V3 §10): amber with dark ink and a solid
 * under-edge; pressing moves the button down 2px as the edge shrinks, in 80ms.
 * `buy` is the same amber (plan D1) — a purchase reads as one by its price.
 */
const EDGED = 'transition-[transform,box-shadow,background-color] duration-press ease-out active:translate-y-0.5';
const KIND: Record<ButtonKind, string> = {
  primary: `bg-signal text-on-primary shadow-edge-primary active:shadow-edge-selected ${EDGED}`,
  buy: `bg-signal text-on-primary shadow-edge-primary active:shadow-edge-selected ${EDGED}`,
  secondary: `bg-card text-heading border border-line shadow-edge-neutral hover:bg-surface-hover active:shadow-none ${EDGED}`,
  text: 'text-link hover:text-link underline-offset-4 hover:underline px-0 transition-colors',
};

// Display face, label size (15/20, 600, -0.01em); radius 14px.
const SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3 text-chip font-display gap-1.5 rounded-cell',
  md: 'min-h-[44px] px-4 text-label font-display gap-2 rounded-cell',
  lg: 'min-h-[52px] px-6 text-label font-display gap-2 rounded-cell',
};

interface Common {
  kind?: ButtonKind;
  size?: ButtonSize;
  icon?: React.ComponentType<{ className?: string }>;
  /** Icon after the label instead of before it (arrows). */
  iconEnd?: boolean;
  block?: boolean;
  className?: string;
  children: React.ReactNode;
}

type AsButton = Common & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof Common> & { href?: undefined };
type AsLink = Common & { href: string; target?: string; rel?: string; onClick?: React.MouseEventHandler<HTMLAnchorElement> };

export type ButtonProps = AsButton | AsLink;

export const buttonClass = (kind: ButtonKind = 'primary', size: ButtonSize = 'md', block = false, className?: string) =>
  cn(
    'pressable focus-ring inline-flex items-center justify-center font-semibold disabled:opacity-50 disabled:pointer-events-none',
    SIZE[size],
    KIND[kind],
    block && 'w-full',
    className
  );

export const Button: React.FC<ButtonProps> = (props) => {
  const { kind = 'primary', size = 'md', icon: Icon, iconEnd, block, className, children } = props;
  const iconEl = Icon ? <Icon className={size === 'lg' ? 'h-5 w-5 shrink-0' : 'h-4 w-4 shrink-0'} /> : null;
  const body = (
    <>
      {!iconEnd && iconEl}
      <span>{children}</span>
      {iconEnd && iconEl}
    </>
  );
  const cls = buttonClass(kind, size, block, className);

  if (props.href !== undefined) {
    const { href, target, rel, onClick } = props as AsLink;
    return (
      <Link href={href} target={target} rel={rel} onClick={onClick} className={cls}>
        {body}
      </Link>
    );
  }
  const { kind: _k, size: _s, icon: _i, iconEnd: _e, block: _b, className: _c, children: _ch, type = 'button', ...rest } = props as AsButton;
  return (
    <button type={type} className={cls} {...rest}>
      {body}
    </button>
  );
};

export default Button;
