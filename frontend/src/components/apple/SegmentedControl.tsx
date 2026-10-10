import React from 'react';

/** iOS segmented control — animated sliding thumb via transforms. */
export function SegmentedControl<T extends string>(props: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const { options, value, onChange } = props;
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      className={`apple-seg-fill relative grid rounded-[10px] p-[2px] ${props.className ?? ''}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      <span
        className="absolute top-[2px] bottom-[2px] rounded-[8px] bg-[var(--apple-surface)] shadow-[0_2px_6px_rgba(0,0,0,0.12)] transition-transform duration-250"
        style={{
          width: `calc((100% - ${4}px) / ${options.length})`,
          left: 2,
          transform: `translateX(${activeIndex * 100}%)`,
          transitionTimingFunction: 'var(--ease-out)',
        }}
      />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`relative z-10 whitespace-nowrap rounded-[8px] px-3 py-[6px] text-[13px] font-medium transition-colors duration-200 ${
              active ? 'text-[var(--apple-label)]' : 'text-[var(--apple-label-2)]'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}