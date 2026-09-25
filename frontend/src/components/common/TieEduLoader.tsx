import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Sparkles } from 'lucide-react';

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
    <>
      {/* Top Gold Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-[#EDEDEB]">
        <div
          className="h-full bg-gradient-to-r from-[#E8A33D] via-amber-400 to-[#1F3A5F] transition-all duration-150 ease-out shadow-[0_0_10px_#E8A33D]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Instant Micro-Loader Spinner Overlay */}
      {loading && (
        <div className="fixed bottom-6 right-6 z-[100] bg-[#1F3A5F] text-white px-4 py-2.5 rounded-2xl shadow-xl border border-white/20 flex items-center gap-3 animate-in slide-in-from-bottom-3 duration-150">
          <div className="relative w-5 h-5 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"></div>
            <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute" />
          </div>
          <div className="text-xs">
            <p className="font-bold leading-none text-white">Loading Vault...</p>
            <p className="text-[10px] text-amber-300/90 font-mono mt-0.5">TieEdu Intelligence</p>
          </div>
        </div>
      )}
    </>
  );
};
