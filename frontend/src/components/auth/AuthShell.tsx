import React from 'react';
import Head from 'next/head';
import { TieEduLogo } from '@/components/common/TieEduLogo';

/** The centred card the sign-in pages share (matches /login and /signup). */
export const AuthShell: React.FC<{ title: string; eyebrow: string; heading: string; lede?: React.ReactNode; children: React.ReactNode; wide?: boolean }> = ({
  title,
  eyebrow,
  heading,
  lede,
  children,
  wide,
}) => (
  <>
    <Head>
      <title>{`${title} — TieEdu`}</title>
      <meta name="robots" content="noindex" />
    </Head>
    <div className="min-h-screen hero-mesh flex flex-col items-center justify-center px-4 py-12">
      <div className={`w-full ${wide ? 'max-w-[560px]' : 'max-w-[420px]'}`}>
        <div className="mb-8 flex justify-center">
          <TieEduLogo size="sm" />
        </div>
        <div className="vault-card p-6 shadow-raised sm:p-8">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="display-2 mt-1 mb-1.5">{heading}</h1>
          {lede && <div className="mb-6 text-base text-[--text-muted]">{lede}</div>}
          {children}
        </div>
      </div>
    </div>
  </>
);

export const authInputCls =
  'w-full px-4 py-3 bg-white/90 border border-line rounded-xl text-sm text-heading placeholder:text-text-light focus:outline-none focus:border-signal focus:ring-4 focus:ring-signal/10 transition-shadow';

export const AuthAlert: React.FC<{ tone: 'error' | 'ok'; children: React.ReactNode }> = ({ tone, children }) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={
      tone === 'error'
        ? 'mb-5 rounded-xl border border-signal/30 bg-signal-soft px-4 py-3 text-sm font-semibold text-danger'
        : 'mb-5 rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-4 py-3 text-sm font-semibold text-heading'
    }
  >
    {children}
  </div>
);
