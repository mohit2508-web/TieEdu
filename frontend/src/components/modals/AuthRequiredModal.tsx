import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, Lock, LogIn, UserPlus, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  targetTitle?: string;
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetTitle,
}) => {
  const { login, signup } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative overflow-hidden my-8">
        
        {/* Top Decorative Banner */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#0284C7] via-[#0284C7] to-[#E8A33D]" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge & Lock Icon */}
        <div className="text-center space-y-3 mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-50 border border-sky-200 text-[#0284C7] flex items-center justify-center shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[#1E293B] tracking-tight">
              Sign In to Access Modules
            </h3>
            <p className="text-[13px] text-[--text-muted] mt-1 max-w-xs mx-auto">
              {targetTitle
                ? `Please sign in to view "${targetTitle}" and access official company vault guides.`
                : 'Sign in or create a free student account to read company guides, DSA banks, and official PDFs.'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-gray-100 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => { setTab('signup'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'signup' ? 'bg-white text-[#0284C7] shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Create Free Account
          </button>
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'login' ? 'bg-white text-[#0284C7] shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Mohit Jadon"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="name@college.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {tab === 'signup' ? 'Create Account & Continue' : 'Sign In & Continue'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-gray-100 text-center text-xs text-[--text-muted] space-y-1">
          <p className="flex items-center justify-center gap-1.5 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Free instant access to placement guides
          </p>
        </div>
      </div>
    </div>
  );
};
