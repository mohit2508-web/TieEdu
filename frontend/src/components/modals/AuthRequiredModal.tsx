import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, LogIn, UserPlus, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { Sheet } from '@/components/common/Sheet';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  targetTitle?: string;
}

const FORM_ID = 'auth-required-form';

/**
 * Phase 2: a bottom sheet with the email field focused, the primary action
 * pinned, and 44px touch targets. This modal is prop-driven and lives outside
 * the `ShellContext` stack, so it previously had no Escape handler, no scroll
 * lock, and no focus management at all — the page behind it scrolled freely and
 * the close button sat in the top-right corner.
 */
export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetTitle,
}) => {
  const { user, login, signup } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === 'signup' && !acceptedTerms) {
      return setError('You must agree to the Terms & Conditions to register.');
    }

    setLoading(true);

    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await signup({ name, email, password });
      }
      setLoading(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Authentication failed. Please try again.');
    }
  };

  // Signup is the default tab, so hide the sheet entirely once a user exists.
  // Passing it to `open` rather than early-returning keeps the exit animation.
  return (
    <Sheet
      open={isOpen && !user}
      onClose={onClose}
      title="Sign in to continue"
      zIndex={50}
      data-testid="auth-required"
      footer={
        <button
          type="submit"
          form={FORM_ID}
          disabled={loading}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#0284C7] py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#0369A1] disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {tab === 'signup' ? 'Create Account & Continue' : 'Sign In & Continue'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      }
    >
      <div className="px-5 pb-5">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-50 border border-sky-200 text-[#0284C7] flex items-center justify-center shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <p className="text-[13px] text-[color:var(--text-muted)] max-w-xs mx-auto">
            {targetTitle
              ? `Please sign in to view "${targetTitle}" and access official company vault guides.`
              : 'Sign in or create a free student account to read company guides, DSA banks, and official PDFs.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-gray-100 rounded-xl mt-5" role="tablist" aria-label="Sign in or sign up">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'signup'}
            onClick={() => { setTab('signup'); setError(null); }}
            className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors ${
              tab === 'signup' ? 'bg-white text-[#0284C7] shadow-xs' : 'text-gray-500'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Create Free Account
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors ${
              tab === 'login' ? 'bg-white text-[#0284C7] shadow-xs' : 'text-gray-500'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
        </div>

        {/*
          Under the field, never above it. An error at the top of a scrolled form
          is invisible when the form is a tall sheet (plan §11).
        */}
        {error && (
          <p role="alert" className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
            {error}
          </p>
        )}

        <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-3.5 mt-4">
          {tab === 'signup' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-bold text-[#1E293B] mb-1">Full Name</label>
              <input
                id="auth-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                enterKeyHint="next"
                placeholder="e.g. Mohit Jadon"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition-all"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-bold text-[#1E293B] mb-1">Email Address</label>
            <input
              id="auth-email"
              name="email"
              // The whole point of this sheet is the next thing you do is type,
              // so the caret starts here rather than on the panel.
              data-sheet-autofocus
              type="email"
              inputMode="email"
              required
              autoComplete="email"
              enterKeyHint="next"
              placeholder="name@college.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition-all"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-bold text-[#1E293B] mb-1">Password</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              enterKeyHint="go"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition-all"
            />
          </div>

          {tab === 'signup' && (
            <div className="flex items-start gap-2 pt-1">
              <input
                id="modal-tc-checkbox"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#0284C7] focus:ring-[#0284C7] shrink-0"
              />
              <label htmlFor="modal-tc-checkbox" className="text-xs text-gray-600 leading-tight cursor-pointer select-none py-2">
                I agree to the <span className="font-semibold text-[#0284C7] underline underline-offset-2">Terms &amp; Conditions</span> and <span className="font-semibold text-[#0284C7] underline underline-offset-2">Privacy Policy</span>.
              </label>
            </div>
          )}
        </form>

        <div className="mt-5 pt-4 border-t border-gray-100 text-center text-xs text-[color:var(--text-muted)]">
          <p className="flex items-center justify-center gap-1.5 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Free instant access to placement guides
          </p>
        </div>
      </div>
    </Sheet>
  );
};
