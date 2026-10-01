import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export const TieEduLoader: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleStart = () => {
      setLoading(true);
      setProgress(20);
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(timer);
            return 90;
          }
          return prev + 15;
        });
      }, 50);
    };

    const handleComplete = () => {
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
        if (timer) clearInterval(timer);
      }, 150);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
      if (timer) clearInterval(timer);
    };
  }, [router]);

  if (!loading && progress === 0) return null;

  return (
    /*
     * A thin indeterminate bar, and nothing else.
     *
     * This used to render a corner card as well: a spinner next to the text
     * "Loading Vault...". It was removed for three reasons, all of which the
     * probe in Phase 6/8 caught rather than a reviewer.
     *
     * The copy was simply wrong. This loader is mounted once in `_app` and so
     * fires on *every* client-side navigation, but it announced "Vault" while
     * opening a course. A student who tapped a course and saw "Loading Vault..."
     * had no way to know the app was tracking the right request.
     *
     * It was a spinner, which is the specific thing Phase 6 sets out to delete:
     * it tells you that something is happening but nothing about what is about to
     * be there. The heavy pages now carry a skeleton shaped like their final
     * layout (`CourseDetailSkeleton`, `VaultSkeleton`), and this bar only has to
     * answer the rest.
     *
     * And it sat in the bottom-right corner, which on a phone is both the
     * thumb's resting place and directly over page content, so the least
     * useful pixel on the screen was the one being repainted during a
     * navigation.
     */
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-[#EDEDEB]" aria-hidden="true">
      <div
        className="h-full bg-gradient-to-r from-[#E8A33D] via-amber-400 to-[#1F3A5F] transition-all duration-150 ease-out shadow-[0_0_10px_#E8A33D]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
