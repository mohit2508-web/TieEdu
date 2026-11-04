import React, { createContext, useContext } from 'react';
import { useRouter } from 'next/router';

/**
 * Pulse inside a company's Lab tab. The same Pulse pages render under
 * /prep/<slug>/lab/…: links and redirects are rewritten from /project-pulse to
 * that base, route params come from the catch-all path, and `pack` limits the
 * classes and tasks shown to that program's lab pack.
 */
type Query = Record<string, string | string[] | undefined>;
export interface PulseScopeValue { base: string; pack: string; query: Query }

const Ctx = createContext<PulseScopeValue | null>(null);
export const PulseScope: React.FC<{ value: PulseScopeValue; children: React.ReactNode }> = ({ value, children }) => <Ctx.Provider value={value}>{children}</Ctx.Provider>;

export const usePulseNav = () => {
  const scope = useContext(Ctx);
  const router = useRouter();
  const href = (p: string) => (scope ? p.replace(/^\/project-pulse(?=\/|\?|$)/, scope.base) : p);
  return {
    scope,
    href,
    query: scope ? scope.query : router.query,
    push: (p: string) => router.push(href(p)),
    replace: (p: string, shallow = false) => router.replace(href(p), undefined, shallow ? { shallow: true } : undefined),
  };
};
