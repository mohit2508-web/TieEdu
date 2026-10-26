import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Ticket — anything bought or earned (a pack, a certificate, a drive slot) has
 * a perforated stub (§3, signature #3). The stub holds the one fact you would
 * tear off and keep: a price, a date, a certificate number.
 *
 * The notches are two circles in the page colour, so the ticket must sit on
 * `paper` (or pass `notchClass` for another background).
 */

export interface TicketProps {
  children: React.ReactNode;
  stub: React.ReactNode;
  /** The stub's background tone. */
  tone?: 'money' | 'signal' | 'ink';
  notchClass?: string;
  className?: string;
}

const STUB = {
  money: 'bg-money/15 text-amber-deep',
  signal: 'bg-signal-soft text-signal-ink',
  ink: 'bg-brand-ink text-white',
};

export const Ticket: React.FC<TicketProps> = ({ children, stub, tone = 'money', notchClass = 'bg-paper', className }) => (
  <div className={cn('relative flex overflow-hidden rounded-[14px] border border-line bg-card', className)}>
    <div className="min-w-0 flex-1 p-4 sm:p-5">{children}</div>
    <div className={cn('relative flex w-28 shrink-0 flex-col items-center justify-center border-l-2 border-dashed border-line-strong p-3 text-center sm:w-32 [&_*]:text-current', STUB[tone])}>
      {stub}
    </div>
    {/* Notches where the perforation meets the edges. */}
    <span aria-hidden className={cn('absolute -top-2.5 right-[calc(7rem-10px)] h-5 w-5 rounded-full border border-line sm:right-[calc(8rem-10px)]', notchClass)} />
    <span aria-hidden className={cn('absolute -bottom-2.5 right-[calc(7rem-10px)] h-5 w-5 rounded-full border border-line sm:right-[calc(8rem-10px)]', notchClass)} />
  </div>
);

export default Ticket;
