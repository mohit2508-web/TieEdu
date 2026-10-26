import React, { useEffect, useRef } from 'react';
import { IndianRupee, Clock3, Link2, Zap, CalendarCheck, ShieldCheck } from 'lucide-react';
import { Countdown } from './Countdown';
import type { DriveDetail } from '@/types/drives';

const inr = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);

const istLine = (iso: string | null | undefined) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    hour12: true, timeZone: 'Asia/Kolkata',
  });
};

/**
 * The payment → slot → link pipeline card on the drive detail screen. Reads the
 * server's registration/payment/booking state verbatim; while the student is
 * waiting on the admin (proof under review / link not yet active) it asks the
 * parent for silent refreshes so an approval flips the card without a pull.
 */
export const DrivePipelineCard: React.FC<{
  detail: DriveDetail;
  onRefresh: () => void;
  onPay: () => void;
  onBookSlot: () => void;
}> = ({ detail, onRefresh, onPay, onBookSlot }) => {
  const { drive, registration, payment, booking } = detail;
  const fee = Number(drive.fee_amount_paise || 0);
  const status = registration?.status || null;

  const waiting =
    status === 'payment_submitted' ||
    (booking && !booking.link_active_at) ||
    (status === 'payment_approved' && !booking);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!waiting || !registration) return;
    timer.current = setInterval(onRefresh, 12000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [waiting, registration?.registration_id]);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  if (!registration) return null;

  // Free drive, nothing booked yet — just offer the slot sheet.
  if (fee === 0 && !booking) {
    return (
      <StepCard
        icon={<CalendarCheck size={15} />}
        tone="blue"
        title="Book your test slot"
        body="Pick a slot — the countdown starts the moment you book."
        action={{ label: 'Choose a slot', onClick: onBookSlot }}
      />
    );
  }

  if (status === 'payment_pending' || status === 'payment_rejected') {
    return (
      <StepCard
        icon={<IndianRupee size={15} />}
        tone={status === 'payment_rejected' ? 'red' : 'amber'}
        title={status === 'payment_rejected' ? 'Payment rejected — try again' : `Complete your ${inr(fee)} payment`}
        body={
          status === 'payment_rejected'
            ? payment?.reviewer_note
              ? `Reason: ${payment.reviewer_note}`
              : 'Upload a clearer screenshot and the same UTR again.'
            : 'Pay via UPI, upload the screenshot — rounds unlock after admin approval.'
        }
        note={payment?.status === 'rejected' && payment.reviewer_note ? null : undefined}
        action={{ label: status === 'payment_rejected' ? 'Re-upload proof' : `Pay ${inr(fee)}`, onClick: onPay }}
      />
    );
  }

  if (status === 'payment_submitted') {
    return (
      <StepCard
        icon={<Clock3 size={15} />}
        tone="amber"
        title="Payment under review"
        body={`UTR ${payment?.utr ? `· ${payment.utr} ` : ''}submitted ${istLine(payment?.created_at)} — this card updates by itself once approved.`}
        pulse
      />
    );
  }

  if (status === 'payment_approved' && !booking) {
    return (
      <StepCard
        icon={<ShieldCheck size={15} />}
        tone="green"
        title="Payment approved"
        body="Next step — choose your test slot. Seats per slot are limited."
        action={{ label: 'Book your slot', onClick: onBookSlot }}
      />
    );
  }

  // Booked (fee or free) — the countdown the student waits on.
  if (booking) {
    const linkState = booking.link_active_at ? 'active' : booking.link_assigned_at ? 'assigned' : 'pending';
    return (
      <div className="rounded-[14px] border p-4" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--apple-label-2)' }}>
          <Clock3 size={14} style={{ color: 'var(--apple-blue)' }} />
          YOUR TEST STARTS IN
        </div>
        <div className="mt-1 text-2xl font-bold leading-none" style={{ color: 'var(--apple-label)' }}>
          <Countdown targetIso={booking.starts_at} serverNowIso={detail.server_now} />
        </div>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--apple-label-2)' }}>
          {istLine(booking.starts_at)} · slot ends {istLine(booking.ends_at)}
        </p>

        <div
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold"
          style={
            linkState === 'active'
              ? { background: 'var(--apple-green-soft)', color: 'var(--apple-green)' }
              : linkState === 'assigned'
              ? { background: 'var(--apple-orange-soft, rgba(255,149,0,.12))', color: 'var(--apple-orange, #FF9500)' }
              : { background: 'var(--apple-fill)', color: 'var(--apple-label-2)' }
          }
        >
          {linkState === 'active' ? <Zap size={12} fill="currentColor" /> : <Link2 size={12} />}
          {linkState === 'active'
            ? 'Link ACTIVE — start from the Workflow tab'
            : linkState === 'assigned'
            ? 'Link assigned — opens when the admin activates it'
            : 'Waiting for the admin to assign your link'}
        </div>

        {booking.round_name && (
          <p className="mt-2 text-xs" style={{ color: 'var(--apple-label-2)' }}>
            Round: <span className="font-medium" style={{ color: 'var(--apple-label)' }}>{booking.round_name}</span>
          </p>
        )}
        {booking.access_code && (
          <p className="mt-1 text-xs" style={{ color: 'var(--apple-label-2)' }}>
            Access code:{' '}
            <span className="rounded-md px-1.5 py-0.5 text-sm font-bold" style={{ background: 'var(--apple-fill)', color: 'var(--apple-label)' }}>
              {booking.access_code}
            </span>
          </p>
        )}
      </div>
    );
  }

  return null;
};

const StepCard: React.FC<{
  icon: React.ReactNode;
  tone: 'blue' | 'green' | 'amber' | 'red';
  title: string;
  body: string;
  pulse?: boolean;
  note?: string | null;
  action?: { label: string; onClick: () => void };
}> = ({ icon, tone, title, body, pulse, note, action }) => {
  const tones = {
    blue: { bg: 'var(--apple-blue-soft)', fg: 'var(--apple-blue)' },
    green: { bg: 'var(--apple-green-soft)', fg: 'var(--apple-green)' },
    amber: { bg: 'var(--apple-orange-soft, rgba(255,149,0,.12))', fg: 'var(--apple-orange, #FF9500)' },
    red: { bg: 'var(--apple-red-soft)', fg: 'var(--apple-red)' },
  }[tone];

  return (
    <div className="rounded-[14px] border p-4" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ background: tones.bg, color: tones.fg }}>
          {icon}
        </span>
        <p className="text-sm font-semibold" style={{ color: 'var(--apple-label)' }}>
          {title}
          {pulse && <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full align-middle" style={{ background: tones.fg }} />}
        </p>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--apple-label-2)' }}>{body}</p>
      {note && <p className="mt-1 text-xs" style={{ color: tones.fg }}>{note}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 w-full rounded-[11px] py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          style={{ background: 'var(--apple-blue)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default DrivePipelineCard;
