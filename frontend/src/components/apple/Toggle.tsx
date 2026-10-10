import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * iOS-style switch — 51x31 track, 27px knob, 20px travel. The knob and track
 * both animate (transform + background), so it reads as one object flipping
 * rather than a color change with a jump.
 */
export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled, ariaLabel }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className="relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300 ease-out disabled:opacity-60"
    style={{ background: checked ? 'var(--apple-green, #34C759)' : '#E5E5EA' }}
  >
    <span
      className="absolute left-[2px] top-[2px] block h-[27px] w-[27px] rounded-full bg-white transition-transform duration-300 ease-out"
      style={{
        transform: checked ? 'translateX(20px)' : 'translateX(0)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.18), 0 0 1px rgba(0, 0, 0, 0.12)',
      }}
    />
  </button>
);

export default Toggle;
