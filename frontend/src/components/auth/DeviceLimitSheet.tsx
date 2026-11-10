import React, { useEffect, useState } from 'react';
import { Laptop, Smartphone } from 'lucide-react';
import { Sheet } from '@/components/common/Sheet';
import {
  answerDeviceChoice,
  currentDeviceChoice,
  subscribeDeviceChoice,
  timeAgo,
  type SignedInDevice,
} from '@/lib/deviceLimit';
import { cn } from '@/lib/cn';

const isPhone = (name: string) => /iPhone|Android|iPad/i.test(name);

/**
 * "You're signed in on 2 devices — sign out of one to continue."
 * Opened by lib/deviceLimit when a sign-in hits the limit; mounted once in _app.
 */
export const DeviceLimitSheet: React.FC = () => {
  const [devices, setDevices] = useState<SignedInDevice[] | null>(null);
  const [pick, setPick] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const d = currentDeviceChoice();
      setDevices(d);
      setPick(d && d.length ? d[d.length - 1].id : null); // the least recently used
    };
    sync();
    return subscribeDeviceChoice(sync);
  }, []);

  const open = !!devices;
  return (
    <Sheet open={open} onClose={() => answerDeviceChoice(null)} title="Sign out of a device" zIndex={90}>
      <div className="p-5 sm:p-6">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-heading">You&rsquo;re signed in on {devices?.length ?? 2} devices</h2>
        <p className="mt-2 text-sm text-body">
          A TiEEdu account can be signed in on two devices at a time. Choose one to sign out of, and we&rsquo;ll sign you in here.
        </p>
        <fieldset className="mt-5">
          <legend className="sr-only">Device to sign out of</legend>
          <ul className="space-y-2">
            {(devices || []).map((d) => {
              const Icon = isPhone(d.name) ? Smartphone : Laptop;
              const on = pick === d.id;
              return (
                <li key={d.id}>
                  <label
                    className={cn(
                      'flex min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-colors',
                      on ? 'border-[var(--brand-ink)] bg-[var(--brand-ink)]/5' : 'border-line bg-card hover:border-[var(--brand-sky)]'
                    )}
                  >
                    <input type="radio" name="device" value={d.id} checked={on} onChange={() => setPick(d.id)} className="h-4 w-4 accent-[var(--brand-ink)]" />
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-ink)] text-white"><Icon size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-heading">{d.name}</span>
                      <span className="block text-sm text-muted">Active {timeAgo(d.last_active_at)}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => answerDeviceChoice(null)} className="btn btn-ghost min-h-[44px] px-5 text-sm">
            Cancel
          </button>
          <button type="button" disabled={!pick} onClick={() => answerDeviceChoice(pick)} className="btn btn-primary min-h-[44px] px-5 text-sm">
            Sign out of it and continue
          </button>
        </div>
      </div>
    </Sheet>
  );
};
