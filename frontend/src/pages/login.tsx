import React, { useState, useEffect, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { TieEduLogo } from '@/components/common/TieEduLogo';
import { Mail, Lock, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const next = typeof router.query.next === 'string' ? router.query.next : '/';

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace(next);
    } catch (err: any) {
      setError(err?.message || 'Sign-in failed — please try again');
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign in — TieEdu</title>
      </Head>

      <div className="min-h-screen hero-mesh flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          <div className="flex justify-center mb-8">
            <TieEduLogo size="sm" showTagline />
          </div>

          <div className="vault-card p-8 shadow-raised">
            <span className="eyebrow">Account Access</span>
            <h1 className="display-2 mt-1 mb-1.5">Sign in to TieEdu</h1>
            <p className="text-[15px] text-[--text-muted] mb-7">
              Your purchased vaults, unlocks and progress all live here.
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-[#FDEDE9] border border-[#F2C9BC] text-[#A63D28] text-[13px] font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[12px] font-bold text-[#3E4754] mb-1.5 tracking-wide uppercase">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[--text-muted] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    className="w-full pl-10 pr-4 py-3 bg-white/90 border border-[#E9E7E1] rounded-xl text-sm text-[#10151C] placeholder:text-[#AEB6BE] focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10 transition-shadow"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-[12px] font-bold text-[#3E4754] mb-1.5 tracking-wide uppercase">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[--text-muted] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-white/90 border border-[#E9E7E1] rounded-xl text-sm text-[#10151C] placeholder:text-[#AEB6BE] focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10 transition-shadow"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full py-3.5 text-sm focus-ring disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
                  Sign in <ArrowRight className="w-4 h-4" />
                </>}
              </button>
            </form>

            <p className="mt-6 text-center text-[14px] text-[#3E4754]">
              Naya ho?{' '}
              <Link href="/signup" className="font-bold text-[#0284C7] hover:text-[#0271B5]">
                Create account
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[--text-muted] hover:text-[#0284C7] transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Platform owner? Admin portal
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}