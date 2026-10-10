import React from 'react';

/** iOS grouped section: large-title heading + list card (hairline rows). */
export function GroupedCard(props: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={props.className}>
      {(props.title || props.action) ? (
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: 'var(--apple-label)' }}>{props.title}</h2>
          {props.action}
        </div>
      ) : null}
      <div className="apple-card overflow-hidden">{props.children}</div>
    </section>
  );
}

/** Rows inside a GroupedCard: the Apple settings entry. */
export function AppleRow(props: {
  icon?: React.ReactNode;
  title: string;
  sub?: string;
  value?: React.ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  accent?: string;
}) {
  return (
    <button type="button" className="apple-cell px-4 py-3" onClick={props.onClick}>
      {props.icon ? (
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
          style={{ background: props.accent ?? 'var(--apple-blue-soft)', color: props.accent ?? 'var(--apple-blue)' }}
        >
          {props.icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px]" style={{ color: 'var(--apple-label)' }}>{props.title}</span>
        {props.sub ? (
          <span className="block truncate text-[12px] leading-snug" style={{ color: 'var(--apple-label-2)' }}>{props.sub}</span>
        ) : null}
      </span>
      {props.value ? (
        <span className="shrink-0 text-[15px]" style={{ color: 'var(--apple-label-3)' }}>{props.value}</span>
      ) : null}
      {props.chevron !== false ? <ChevronChevron /> : null}
    </button>
  );
}

function ChevronChevron() {
  return (
    <svg className="apple-chevron shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}