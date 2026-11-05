import React from 'react';
import { formatPrice } from '@/lib/courseFormat';
import { courseSalePrice, useFestival } from '@/lib/festival';

/**
 * A course price as it will be charged today: during the Diwali sale the real
 * price struck through, then the sale price (the same rule checkout applies).
 * Outside the sale it renders exactly what `formatPrice` always did.
 */
export const SalePrice: React.FC<{
  list: number | null | undefined;
  /** The buyer's own price when it differs from list (personalised path). */
  own?: number | null;
  badge?: boolean;
  className?: string;
}> = ({ list, own, badge = false, className }) => {
  const f = useFestival();
  const before = Math.max(0, Number(own ?? list) || 0);
  const now = courseSalePrice(Number(list) || 0, own, f);
  if (now >= before) return <span className={className}>{formatPrice(before)}</span>;
  return (
    <span className={`sale-price ${className || ''}`}>
      <s className="sale-price__was" aria-label={`was ${formatPrice(before)}`}>{formatPrice(before)}</s>{' '}
      <span className="sale-price__now">{formatPrice(now)}</span>
      {badge && <span className="sale-badge">{f.discount_percent}% OFF</span>}
    </span>
  );
};

/** Plain-text version for string props (mobile action bars, notes). */
export function useSalePriceText(list: number | null | undefined, own?: number | null): string {
  const f = useFestival();
  const before = Math.max(0, Number(own ?? list) || 0);
  const now = courseSalePrice(Number(list) || 0, own, f);
  return now < before ? `${formatPrice(now)} (was ${formatPrice(before)})` : formatPrice(before);
}

/** Pack price with the regular ladder price struck through during the sale. */
export const PackSalePrice: React.FC<{ regular: number; now: number; className?: string }> = ({ regular, now, className }) =>
  now < regular ? (
    <span className={`sale-price ${className || ''}`}>
      <s className="sale-price__was">₹{regular}</s> <span className="sale-price__now">₹{now}</span>
    </span>
  ) : (
    <span className={className}>₹{now}</span>
  );
