// Typed runtime config — env-driven.
// Payment modes: 'upi' (UPI QR + manual admin verification — default) or 'razorpay' (auto, keys required).

export type PaymentMode = 'upi' | 'razorpay';

export interface AppConfig {
  paymentMode: PaymentMode;
  razorpay: {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
  };
  currency: string;
}

export const config: AppConfig = {
  paymentMode: (process.env.PAYMENT_MODE || 'upi') === 'razorpay' ? 'razorpay' : 'upi',
  razorpay: {
    keyId: process.env.RZP_KEY_ID || '',
    keySecret: process.env.RZP_KEY_SECRET || '',
    webhookSecret: process.env.RZP_WEBHOOK_SECRET || '',
  },
  currency: 'INR',
};

// Effective mode: razorpay only if explicitly configured AND keys present.
// Otherwise every order runs through the UPI QR + admin-verification flow (always real).
export function effectivePaymentMode(db: any): PaymentMode {
  if (config.paymentMode === 'razorpay' && config.razorpay.keyId && config.razorpay.keySecret) {
    return 'razorpay';
  }
  return 'upi';
}