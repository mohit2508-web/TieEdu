'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { haptic } from '@/components/common/Pressable';
import { BriefingStack } from './BriefingStack';
import { useBriefingData } from './useBriefingData';
import { buildBriefingItems, type BriefingItem } from '@/lib/briefing/briefingLogic';
import {
  markBriefingShown,
  markDropsSeen,
  markVaultSeen,
  readBriefingStore,
  readDropsSeen,
  readVaultSeen,
} from '@/lib/briefingStore';

const FIRST_POP_DELAY_MS = 700;

export const DailyBriefing: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [items, setItems] = useState<BriefingItem[]>([]);
  const mountedAt = useRef(Date.now());
  const consumed = useRef(false);

  const { sources, ready } = useBriefingData(enabled);

  useEffect(() => {
    if (loading || enabled || consumed.current) return;
    if (!user || !router.isReady || router.pathname !== '/') return;
    if (readBriefingStore(user.id).shown) return;
    setEnabled(true);
  }, [loading, enabled, user, router.isReady, router.pathname]);

  useEffect(() => {
    if (!enabled || !ready || consumed.current || !user) return;

    const built = buildBriefingItems(sources, {
      userName: user.name,
      streak: user.streak ?? 0,
      now: new Date(),
      dropsSeen: readDropsSeen(user.id),
      vaultSeen: readVaultSeen(user.id),
    });

    if (built.length <= 1) {
      consumed.current = true;
      markBriefingShown(user.id);
      return;
    }

    const wait = Math.max(0, FIRST_POP_DELAY_MS - (Date.now() - mountedAt.current));
    const timer = window.setTimeout(() => {
      consumed.current = true;
      markBriefingShown(user.id);
      markDropsSeen(
        built.flatMap((item) => item.dropIds ?? []),
        user.id
      );
      haptic('light');
      setItems(built);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [enabled, ready, user, sources]);

  useEffect(() => {
    if (items.length === 0) return;
    if (!user || router.pathname !== '/') setItems([]);
  }, [items.length, user, router.pathname]);

  const handleCta = useCallback(
    (item: BriefingItem) => {
      if (user) {
        markBriefingShown(user.id);
        if (item.vaultId) markVaultSeen(item.vaultId, user.id);
      }
      setItems([]);
      if (item.href) router.push(item.href);
    },
    [router, user]
  );

  const handleDismissItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleDismissAll = useCallback(() => {
    if (user) markBriefingShown(user.id);
    setItems([]);
  }, [user]);

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <BriefingStack
          items={items}
          onCta={handleCta}
          onDismissItem={handleDismissItem}
          onDismissAll={handleDismissAll}
        />
      )}
    </AnimatePresence>
  );
};
