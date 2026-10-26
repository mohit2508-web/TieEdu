import React, { useEffect, useState } from 'react';

/**
 * Server-synced countdown. The server sends `server_now` with every payload;
 * we compute the clock skew once so a wrong device clock can't show a negative
 * or inflated timer, then tick locally every second.
 */
export const useCountdown = (targetIso: string | null | undefined, serverNowIso?: string | null) => {
  const [now, setNow] = useState(() => Date.now());
  const skew = serverNowIso ? Date.parse(serverNowIso) - Date.now() : 0;

  useEffect(() => {
    if (!targetIso) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (!targetIso) return null;
  const target = Date.parse(targetIso);
  if (Number.isNaN(target)) return null;
  const remaining = Math.max(0, target - (now + skew));

  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    remaining,
    live: remaining === 0 && Date.now() + skew >= target,
    label: days > 0 ? `${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}` : `${pad(hours)}:${pad(mins)}:${pad(secs)}`,
    short: days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${secs}s`,
  };
};

export const Countdown: React.FC<{
  targetIso: string | null | undefined;
  serverNowIso?: string | null;
  className?: string;
  style?: React.CSSProperties;
}> = ({ targetIso, serverNowIso, className, style }) => {
  const t = useCountdown(targetIso, serverNowIso);
  if (!t) return null;
  return (
    <span className={`tabular-nums ${className || ''}`} style={style}>
      {t.label}
    </span>
  );
};

export default Countdown;
