import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Button — four kinds, and the kind carries the meaning (UI_REDESIGN_PLAN_V2 §4.8).
 *
 *   primary    the one next step on the screen. Logo orange (`signal`).
 *   buy        spends money. Amber (`money`), and only ever for that — a student
 *              should be able to tell a purchase from a navigation at a glance.
 *   secondary  an alternative to the primary. Hairline, card surface.
 *   text       a link that happens to be a button.
 *
 * One primary per screen is the rule, not something this component can enforce.
 * Height floors at 44px from `md` up so every button clears the touch target.
 * Passing `href` renders a Next link with the same styling.
 */

export type ButtonKind = 'primary' | 'buy' | 'secondary' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';

const KIND: Record<ButtonKind, string> = {
  primary: 'bg-signal text-white hover:bg-signal-hover',
  buy: 'bg-money text-money-ink hover:bg-money-hover',
  secondary: 'bg-card text-heading border border-line hover:border-line-strong hover:bg-surface-hover',
  text: 'text-signal hover:text-signal-hover underline-offset-4 hover:underline px-0',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3 text-sm gap-1.5 rounded-lg',
  md: 'min-h-[44px] px-4 text-sm gap-2 rounded-xl',
  lg: 'min-h-[52px] px-6 text-base gap-2 rounded-xl',
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
    'pressable focus-ring inline-flex items-center justify-center font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none',
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
