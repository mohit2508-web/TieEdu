import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState(props: { title: string; body?: string; icon?: React.ReactNode }) {
  return (
    <div className="apple-card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: 'var(--apple-fill)', color: 'var(--apple-label-3)' }}
      >
        {props.icon ?? <Inbox size={24} strokeWidth={1.6} />}
      </div>
      <div>
        <p className="text-[15px] font-semibold" style={{ color: 'var(--apple-label)' }}>{props.title}</p>
        {props.body ? (
          <p className="mt-1 max-w-sm text-[13px] leading-relaxed" style={{ color: 'var(--apple-label-2)' }}>{props.body}</p>
        ) : null}
      </div>
    </div>
  );
}