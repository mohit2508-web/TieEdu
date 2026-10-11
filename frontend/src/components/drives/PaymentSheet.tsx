import React, { useEffect, useRef, useState } from 'react';
import { Sheet } from '@/components/common/Sheet';
import { Copy, CheckCircle2, Clock3, UploadCloud, ShieldCheck, ArrowRight } from 'lucide-react';
import {
  fetchDriveConfigApi, fetchDrivePaymentApi, submitPaymentProofApi,
  type DriveConfig, type DrivePaymentState,
} from '@/lib/drivesApi';

const inr = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);

/**
 * ₹99 payment bottom-sheet: UPI details + screenshot/UTR upload, then the
 * waiting screen until the admin approves. The registration status on the
 * server is the source of truth — every state here is read back from
 * `/payment`, never assumed locally.
 */
export const PaymentSheet: React.FC<{
  driveId: string;
  open: boolean;
  onClose: () => void;
  /** Fired once the status flips to payment_approved (go book a slot). */
  onApproved?: () => void;
  onChanged?: () => void;
}> = ({ driveId, open, onClose, onApproved, onChanged }) => {
  const [config, setConfig] = useState<DriveConfig | null>(null);
  const [state, setState] = useState<DrivePaymentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [utr, setUtr] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const wasApproved = useRef(false);

  const refresh = async () => {
    try {
      const s = await fetchDrivePaymentApi(driveId);
      setState(s);
      if (s.registration_status === 'payment_approved' && !wasApproved.current) {
        wasApproved.current = true;
        onChanged?.();
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchDriveConfigApi(), fetchDrivePaymentApi(driveId)])
      .then(([c, s]) => {
        if (!alive) return;
        setConfig(c);
        setState(s);
        if (s.registration_status === 'payment_approved') wasApproved.current = true;
      })
      .catch((e) => alive && setError((e as Error).message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [open, driveId]);

  // Poll while the proof sits with the admin so approval appears without a pull.
  useEffect(() => {
    if (!open || state?.registration_status !== 'payment_submitted') return;
    const id = setInterval(() => refresh().catch(() => {}), 8000);
    return () => clearInterval(id);
  }, [open, state?.registration_status, driveId]);

  const copyUpi = async () => {
    if (!config?.upi_id) return;
    try {
      await navigator.clipboard.writeText(config.upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked — the id is visible anyway */ }
  };

  const submit = async () => {
    if (!file) { setError('Attach your payment screenshot.'); return; }
    if (utr.trim().length < 6) { setError('Enter the UTR / transaction reference (min 6 chars).'); return; }
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      await submitPaymentProofApi(driveId, file, utr.trim(), setProgress);
      setFile(null);
      setUtr('');
      await refresh();
      onChanged?.();
    } catch (e) {
      setError((e as Error).message || 'Could not submit the proof.');
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const fee = state?.fee_amount_paise ?? 0;
  const status = state?.registration_status;
  const latest = state?.latest;
  const needsPay = status === 'payment_pending' || status === 'payment_rejected' || (!status && fee > 0);
  const underReview = status === 'payment_submitted' || latest?.status === 'submitted';
  const approved = status === 'payment_approved' || latest?.status === 'approved';

  return (
    <Sheet open={open} onClose={onClose} title="Drive payment">
      <div className="px-5 pb-5 pt-1">
        {loading ? (
          <p className="py-6 text-center text-[14px]" style={{ color: 'var(--apple-label-2)' }}>Loading…</p>
        ) : approved ? (
          <div>
            <div className="flex items-center gap-2.5 rounded-[12px] px-4 py-3" style={{ background: 'var(--apple-green-soft)' }}>
              <ShieldCheck size={18} style={{ color: 'var(--apple-green)' }} />
              <div>
                <p className="text-[14px] font-semibold" style={{ color: 'var(--apple-green)' }}>Payment approved</p>
                <p className="text-[12.5px]" style={{ color: 'var(--apple-label-2)' }}>Next step — pick your test slot.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { onClose(); onApproved?.(); }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] py-3 text-[15px] font-semibold text-white"
              style={{ background: 'var(--apple-blue)' }}
            >
              Book your slot <ArrowRight size={16} />
            </button>
          </div>
        ) : underReview ? (
          <div>
            <div className="flex items-center gap-2.5 rounded-[12px] px-4 py-3" style={{ background: 'var(--apple-orange-soft, rgba(255,149,0,.12))' }}>
              <Clock3 size={18} style={{ color: 'var(--apple-orange, #FF9500)' }} />
              <div>
                <p className="text-[14px] font-semibold" style={{ color: 'var(--apple-label)' }}>Proof under review</p>
                <p className="text-[12.5px]" style={{ color: 'var(--apple-label-2)' }}>
                  Submitted {latest?.utr ? `· UTR ${latest.utr} ` : ''}— the admin usually approves within a few hours. This screen updates by itself.
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="mt-4 w-full rounded-[12px] py-3 text-[15px] font-semibold" style={{ background: 'var(--apple-fill)', color: 'var(--apple-label)' }}>
              Done
            </button>
          </div>
        ) : needsPay ? (
          <div>
            {status === 'payment_rejected' && latest?.reviewer_note && (
              <p className="mb-3 rounded-[10px] px-3 py-2 text-[13px]" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>
                Rejected: {latest.reviewer_note}
              </p>
            )}

            {/* UPI block */}
            <div className="rounded-[12px] border p-3.5" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-fill)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[12.5px]" style={{ color: 'var(--apple-label-2)' }}>Amount</span>
                <span className="text-[17px] font-bold" style={{ color: 'var(--apple-label)' }}>{inr(fee || 9900)}</span>
              </div>
              {config?.upi_id && (
                <div className="mt-2.5 flex items-center justify-between rounded-[10px] px-3 py-2" style={{ background: 'var(--apple-surface)' }}>
                  <span className="font-mono text-[13.5px] font-semibold" style={{ color: 'var(--apple-label)' }}>{config.upi_id}</span>
                  <button type="button" onClick={copyUpi} className="inline-flex items-center gap-1 text-[12.5px] font-semibold" style={{ color: 'var(--apple-blue)' }}>
                    {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
              {config?.upi_qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.upi_qr} alt="UPI QR code" className="mx-auto mt-3 h-36 w-36 rounded-[10px] object-contain" />
              )}
              <p className="mt-2.5 text-[12.5px] leading-relaxed" style={{ color: 'var(--apple-label-2)' }}>
                {config?.upi_instructions ||
                  `Pay ${inr(fee || 9900)} via any UPI app, then upload the screenshot below.`}
                {config?.merchant_name ? ` Pay to ${config.merchant_name}.` : ''}
              </p>
            </div>

            {/* Upload */}
            <div className="mt-3.5 space-y-2.5">
              <label className="block">
                <span className="text-[12.5px] font-medium" style={{ color: 'var(--apple-label-2)' }}>UTR / transaction reference</span>
                <input
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  placeholder="e.g. 4159XXXXXXXX"
                  maxLength={64}
                  className="mt-1 w-full rounded-[10px] border px-3 py-2.5 text-[14px] outline-none"
                  style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)', color: 'var(--apple-label)' }}
                />
              </label>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed px-3 py-3 text-[13.5px] font-medium"
                style={{ borderColor: file ? 'var(--apple-blue)' : 'var(--apple-separator)', color: file ? 'var(--apple-blue)' : 'var(--apple-label-2)', background: 'var(--apple-surface)' }}
              >
                <UploadCloud size={16} />
                {file ? file.name : 'Attach payment screenshot (image or PDF, ≤5MB)'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            {error && (
              <p className="mt-3 rounded-[10px] px-3 py-2 text-[13px]" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="mt-4 w-full rounded-[12px] py-3 text-[15px] font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--apple-blue)' }}
            >
              {busy ? (progress ? `Uploading… ${progress}%` : 'Submitting…') : status === 'payment_rejected' ? 'Re-submit proof' : 'I’ve paid — submit proof'}
            </button>
            <p className="mt-2 text-center text-[11.5px]" style={{ color: 'var(--apple-label-2)' }}>
              Your rounds unlock only after the admin approves this payment.
            </p>
          </div>
        ) : (
          <p className="py-4 text-center text-[14px]" style={{ color: 'var(--apple-label-2)' }}>
            No payment is required for this drive.
          </p>
        )}
      </div>
    </Sheet>
  );
};

export default PaymentSheet;
