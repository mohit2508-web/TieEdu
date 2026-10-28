import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Globe, Monitor, Moon, Sun } from 'lucide-react';
import { useLang } from '@/lib/lang';
import { readTheme, ThemeChoice } from '@/lib/theme';
import { LangSwitch } from '@/components/common/LangSwitch';
import { ThemeSwitch } from '@/components/common/ThemeSwitch';
import { cn } from '@/lib/cn';

const THEME_ICON: Record<ThemeChoice, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/**
 * Language and theme in one header control (UI_REDESIGN_PLAN_V3 §9 E2): a
 * bordered button showing the current language and theme, opening a small
 * panel with the two existing radio groups. The radio groups do the work, so
 * keyboard behaviour and storage are the same as everywhere else they appear.
 *
 * Closes on Escape (focus back to the button), on a click outside, and when
 * focus leaves the panel.
 */
export const PrefsControl: React.FC<{ className?: string }> = ({ className }) => {
  const [lang] = useLang();
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState<ThemeChoice | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // The stored theme lives in the browser; read it on mount and whenever the
  // panel closes (the radio group inside may have changed it).
  useEffect(() => {
    if (!open) setThemeState(readTheme());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const ThemeIcon = THEME_ICON[theme ?? 'system'];

  return (
    <div
      ref={rootRef}
      className={cn('relative', className)}
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Language and theme: ${lang === 'hi' ? 'Hinglish' : 'English'}, ${theme ?? 'system'}`}
        onClick={() => setOpen((v) => !v)}
        className="focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-cell border border-line bg-card px-3 font-mono text-chip font-medium uppercase text-heading shadow-edge-neutral transition-colors hover:bg-surface-hover"
      >
        <span className="inline-flex items-center gap-1.5">
          {lang === 'hi' ? 'HI' : 'EN'}
          <Globe className="h-4 w-4 text-muted" aria-hidden />
        </span>
        <span className="h-4 w-px bg-line" aria-hidden />
        <ThemeIcon className="h-4 w-4 text-muted" aria-hidden />
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted transition-transform duration-flip', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 top-full z-50 mt-2 w-max rounded-card border border-line bg-card p-3 shadow-pop"
        >
          <p className="eyebrow mb-1.5">Language</p>
          <LangSwitch />
          <p className="eyebrow mb-1.5 mt-3">Theme</p>
          <ThemeSwitch />
        </div>
      )}
    </div>
  );
};

export default PrefsControl;
