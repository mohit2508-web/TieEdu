import React, { useState } from 'react';
import { Sheet } from '@/components/common/Sheet';
import type { DriveListItem } from '@/types/drives';
import { registerForDriveApi } from '@/lib/drivesApi';

/**
 * Confirmation bottom-sheet before a drive registration is submitted. The
 * server is still the authority — this only stages the user's intent and shows
 * the criteria they are about to be checked against, so a tap on "Register" is
 * an informed one rather than a blind confirm.
 */
export const RegisterSheet: React.FC<{
  driveId: string;
  drive: Pick<DriveListItem, 'title' | 'company_name' | 'registration_closes_at_ist'>;
  open: boolean;
  onClose: () => void;
  onRegistered: () => void;
}> = ({ driveId, drive, open, onClose, onRegistered }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  // Accepts "9876543210", "+91 98765 43210", "098765 43210" — normalised to
  // the 10-digit national number before validation and submit.
  const normPhone = (v: string) => {
    let d = v.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    return d;
  };
  const phoneValid = /^[6-9]\d{9}$/.test(normPhone(phone));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await registerForDriveApi(driveId, undefined, normPhone(phone));
      onRegistered();
      onClose();
    } catch (e) {
      setError((e as Error).message || 'Could not register. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Confirm registration">
      <div className="px-5 pb-5 pt-1">
        <p className="text-base font-semibold" style={{ color: 'var(--apple-label)' }}>
          {drive.title}
        </p>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--apple-label-2)' }}>
          {drive.company_name}
        </p>

        {drive.registration_closes_at_ist && (
          <p className="mt-3 text-sm" style={{ color: 'var(--apple-label-2)' }}>
            Registration closes {drive.registration_closes_at_ist}
          </p>
        )}

        <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--apple-label-2)' }}>
          Your student profile will be checked against this drive&apos;s eligibility criteria. Once registered you can track the drive from your Drives tab.
        </p>

        <label className="mt-4 block">
          <span className="text-sm font-semibold" style={{ color: 'var(--apple-label)' }}>
            Mobile number <span style={{ color: 'var(--apple-red)' }}>*</span>
          </span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={13}
            placeholder="10-digit mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 w-full rounded-[12px] px-3.5 py-2.5 text-base outline-none"
            style={{ background: 'var(--apple-fill)', color: 'var(--apple-label)' }}
          />
          <span className="mt-1 block text-xs" style={{ color: 'var(--apple-label-2)' }}>
            The drive team uses this to share your slot, payment receipt and test link.
          </span>
        </label>

        {error && (
          <p className="mt-4 rounded-[10px] px-3 py-2 text-sm" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-[12px] py-3 text-base font-semibold disabled:opacity-50"
            style={{ background: 'var(--apple-fill)', color: 'var(--apple-label)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !phoneValid}
            className="flex-1 rounded-[12px] py-3 text-base font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--apple-blue)' }}
          >
            {busy ? 'Registering…' : 'Register'}
          </button>
        </div>
      </div>
    </Sheet>
  );
};

export default RegisterSheet;
