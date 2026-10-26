import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Shared primitives for the course authoring UI.
 *
 * Kept deliberately small: the admin CMS uses these classes everywhere else, so
 * reusing them keeps the new tabs visually identical to the existing back office
 * instead of introducing a second design language.
 */

export const Panel: React.FC<{ title?: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  subtitle,
  actions,
  children,
}) => (
  <section className="rounded-xl border border-line bg-white">
    {(title || actions) && (
      <header className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-line">
        <div>
          {title && <h2 className="text-base font-extrabold text-heading tracking-tight">{title}</h2>}
          {subtitle && <p className="text-xs text-text-light mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>
    )}
    <div className="p-5">{children}</div>
  </section>
);

type BtnVariant = 'primary' | 'ghost' | 'danger';

const BTN: Record<BtnVariant, string> = {
  primary:
    'bg-brand-ink text-white hover:bg-brand-ink border-brand-ink disabled:opacity-40 disabled:hover:bg-brand-ink',
  ghost:
    'bg-white text-body hover:bg-surface-hover border-gray-300 disabled:opacity-40',
  danger:
    'bg-white text-red-700 hover:bg-red-50 border-red-200 disabled:opacity-40',
};

export const Btn: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  busy?: boolean;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit';
  className?: string;
}> = ({ children, onClick, variant = 'ghost', busy, disabled, title, type = 'button', className = '' }) => (
  <button
    type={type}
    title={title}
    onClick={onClick}
    disabled={disabled || busy}
    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed ${BTN[variant]} ${className}`}
  >
    {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
    {children}
  </button>
);

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  hint,
  children,
  className = '',
}) => (
  <label className={`block ${className}`}>
    <span className="block text-xs font-bold uppercase tracking-wider text-text-light mb-1.5">{label}</span>
    {children}
    {hint && <span className="block text-xs text-text-light mt-1 leading-snug">{hint}</span>}
  </label>
);

const INPUT =
  'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-heading outline-none focus:border-signal focus:ring-2 focus:ring-signal/15';

export const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className={`${INPUT} ${props.className || ''}`} />
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea {...props} className={`${INPUT} font-mono text-xs leading-relaxed ${props.className || ''}`} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select {...props} className={`${INPUT} ${props.className || ''}`} />
);

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}> = ({ checked, onChange, label, hint }) => (
  <label className="flex items-start gap-3 cursor-pointer select-none">
    <span
      onClick={() => onChange(!checked)}
      className={`mt-0.5 w-10 h-5.5 shrink-0 rounded-full transition-colors relative ${
        checked ? 'bg-signal' : 'bg-gray-300'
      }`}
      style={{ height: 22 }}
    >
      <span
        className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all`}
        style={{
          height: 18,
          width: 18,
          left: checked ? 22 : 2,
        }}
      />
    </span>
    <span>
      <span className="block text-sm font-bold text-heading">{label}</span>
      {hint && <span className="block text-xs text-text-light leading-snug mt-0.5">{hint}</span>}
    </span>
  </label>
);

/** Errors are shown verbatim: the API messages are written for an admin. */
export const ErrorNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
);

export const OkNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
    {children}
  </div>
);

export const Loading: React.FC<{ label?: string }> = ({ label = 'Loading' }) => (
  <div className="flex items-center gap-2.5 py-10 justify-center text-sm text-text-light">
    <Loader2 className="w-4 h-4 animate-spin text-signal" />
    {label}...
  </div>
);

export const Empty: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <div className="py-12 text-center">
    <p className="text-sm text-text-light mb-3">{children}</p>
    {action}
  </div>
);

export const Pill: React.FC<{ tone?: 'green' | 'red' | 'gray' | 'amber'; children: React.ReactNode }> = ({
  tone = 'gray',
  children,
}) => {
  const tones = {
    green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    red: 'bg-red-50 text-red-800 border-red-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    gray: 'bg-surface-hover text-body border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-bold uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
};
