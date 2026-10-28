import React from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={promptInstall}
      className={`flex items-center gap-1.5 rounded-cell border border-line bg-card px-3 py-1.5 text-xs font-bold text-heading shadow-edge-neutral transition-colors hover:bg-surface-hover ${className}`}
    >
      <Download size={14} strokeWidth={2.4} />
      Get App
    </button>
  );
};
