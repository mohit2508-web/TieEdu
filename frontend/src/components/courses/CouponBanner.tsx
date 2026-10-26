import React, { useEffect, useState } from 'react';
import { BadgePercent, CheckCircle2 } from 'lucide-react';
import { validateCouponApi } from '@/lib/api';

/**
 * The `?coupon=` banner on a course page.
 *
 * Offer cards deep-link here with a staged code. This strip answers the only
 * question that staging raises — "does this code actually do anything for
 * THIS course?" — by running the same server validation the cart will run,
 * against this course's own price and id. A code that validates shows its
 * real discount; a dead or inapplicable code says so plainly instead of
 * letting the buyer discover it at payment time.
 *
 * Renders nothing without a `?coupon=` param, for free courses (there is no
 * checkout to discount), or while the answer is still loading.
 */
export const CouponBanner: React.FC<{
  couponCode: string | null;
  courseId: string;
  coursePriceInr: number;
  isFree: boolean;
}> = ({ couponCode, courseId, coursePriceInr, isFree }) => {
  const [state, setState] = useState<{ valid: boolean; discount: number; message: string } | null>(null);

  useEffect(() => {
    if (!couponCode || isFree) {
      setState(null);
      return;
    }
    let active = true;
    setState(null);
    validateCouponApi(couponCode, Math.max(0, Number(coursePriceInr) || 0), [courseId])
      .then((res) => {
        if (active) setState({ valid: !!res.valid, discount: Number(res.discount) || 0, message: String(res.message || '') });
      })
      .catch(() => {
        if (active) setState(null);
      });
    return () => {
      active = false;
    };
  }, [couponCode, courseId, coursePriceInr, isFree]);

  if (!couponCode || isFree || !state) return null;

  return (
    <div
      className={[
        'mb-8 flex items-start gap-3 rounded-[var(--radius-md)] border p-4',
        state.valid
          ? 'border-success/30 bg-surface-hover'
          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]',
      ].join(' ')}
      role="status"
    >
      {state.valid ? (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-hidden />
      ) : (
        <BadgePercent size={18} className="mt-0.5 shrink-0 text-[var(--text-muted)]" aria-hidden />
      )}
      <p className="text-sm leading-relaxed text-[var(--text-body)]">
        {state.valid ? (
          <>
            Code <span className="font-extrabold text-heading">{couponCode}</span> is staged
            {state.discount > 0 ? (
              <>
                {' '}— <span className="font-extrabold text-success">₹{state.discount} off</span> this
                course at checkout.
              </>
            ) : (
              <> for this course. It validates, but gives no discount on this cart.</>
            )}
          </>
        ) : (
          <>
            Code <span className="font-extrabold text-heading">{couponCode}</span> does not
            apply here{state.message ? `: ${state.message}.` : '.'} The course is still fully buyable
            without it.
          </>
        )}
      </p>
    </div>
  );
};

export default CouponBanner;
