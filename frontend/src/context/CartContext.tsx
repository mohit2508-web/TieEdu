'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CartItem, Company, CompanyModuleItem, ContentModule } from '@/types';

/**
 * THE CART LIVES HERE NOW.
 *
 * It used to be three independent `useState` arrays — one on `/`, one on
 * `/compare`, one on `/company/[slug]` — each feeding its own `<Header
 * cartCount={...}>`. The practical effect was that a student who added three
 * rounds to a company vault, clicked "Vaults" in the nav, and came back to a
 * badge reading 0 and an empty drawer. The purchase funnel leaked at the very
 * first navigation.
 *
 * Persisting to localStorage is a display concern only. The server is
 * authoritative: `createOrderApi` recomputes every line with its own
 * `packPrice()` and ignores whatever the browser sends (see the note at the top
 * of `lib/packPricing.ts`). Nothing is ever charged from local state, so a
 * stale figure here can mislabel a line but cannot change an amount.
 */

const STORAGE_KEY = 'tieedu_cart_v1';

/**
 * Page-registered context for the drawer.
 *
 * The cart is a single globally-mounted `CartModal`, so a page that wants
 * company-specific cross-sell ("finish your pack — 2 rounds left") registers
 * that context here instead of passing eight props into a modal that lives in
 * `_app.tsx`. Registering null on unmount matters: without it, leaving a
 * company page would leave its cross-sell attached to an unrelated cart.
 */
export interface CartScope {
  companyName?: string;
  missingModules?: ContentModule[];
  onAddModules?: (modules: ContentModule[]) => void;
  onAddCompletePack?: () => void;
  suggestedCompanies?: Company[];
  onAddCompany?: (company: Company) => void;
  /**
   * Set when a purchase on this page unlocks server-owned state (a course, a
   * vault) that only the page knows how to refetch. The global cart calls it
   * instead of guessing.
   */
  onCheckoutSuccess?: () => void;
}

const EMPTY_SCOPE: CartScope = {};

export interface CartContextValue {
  items: CartItem[];
  count: number;
  add: (item: CartItem) => void;
  addMany: (items: CartItem[]) => void;
  remove: (index: number) => void;
  clear: () => void;
  has: (predicate: (item: CartItem) => boolean) => boolean;
  scope: CartScope;
  setScope: (scope: CartScope) => void;
  /** False until the persisted cart has been read back, so the badge never flashes 0 -> N. */
  hydrated: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

/** The rules live in lib/cartLines so they can be unit tested without a React
 * renderer. They are re-exported here because the cart context is the public entry
 * point for cart behaviour. */
export { cartLineModuleIds, isCompanyCartLine, mergeCartItems } from '@/lib/cartLines';
import { isStorableItem, mergeCartItems } from '@/lib/cartLines';

/** Read persisted lines defensively — a hand-edited key must not break the app. */
const readStoredCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStorableItem);
  } catch {
    return [];
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [scope, setScope] = useState<CartScope>(EMPTY_SCOPE);
  // The first render must not write an empty array over a real cart. Hydration
  // runs before persistence is armed.
  const persistArmed = useRef(false);

  useEffect(() => {
    setItems(readStoredCart());
    setHydrated(true);
    persistArmed.current = true;
  }, []);

  useEffect(() => {
    if (!persistArmed.current) return;
    try {
      if (items.length === 0) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // A full or blocked localStorage is not worth breaking checkout over —
      // the cart simply stops surviving a reload.
    }
  }, [items]);

  const addMany = useCallback((incoming: CartItem[]) => {
    setItems((prev) => mergeCartItems(prev, incoming));
  }, []);

  const add = useCallback((item: CartItem) => addMany([item]), [addMany]);

  const remove = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const has = useCallback(
    (predicate: (item: CartItem) => boolean) => items.some(predicate),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.length,
      add,
      addMany,
      remove,
      clear,
      has,
      scope,
      setScope,
      hydrated,
    }),
    [items, add, addMany, remove, clear, has, scope, hydrated]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};

/**
 * Register drawer context for the lifetime of a page.
 *
 * `scope` is a dependency on purpose: a page that rebuilds its cross-sell
 * objects every render re-registers rather than leaving a stale one attached.
 */
export const useCartScope = (scope: CartScope): void => {
  const { setScope } = useCart();
  useEffect(() => {
    setScope(scope);
    return () => setScope(EMPTY_SCOPE);
  }, [setScope, scope]);
};
