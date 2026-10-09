'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export function EnrollButton({ courseId }: { courseId: string }) {
  const t = useTranslations('learn');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/learning/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Request failed');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        disabled={busy}
        onClick={enroll}
        className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {busy ? t('enrolling') : t('enroll')}
      </button>
    </div>
  );
}
