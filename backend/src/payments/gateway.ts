import crypto from 'crypto';
import { config, PaymentMode } from '../config';

export interface CreateOrderInput {
  order_id: string;
  amount_paisa: number;
  currency: string;
}

export interface CreatedOrder {
  gateway: 'upi' | 'razorpay';
  gateway_order_id: string;
  key_id?: string;
}

export interface PaymentGateway {
  readonly name: PaymentMode;
  createOrder(input: CreateOrderInput): Promise<CreatedOrder>;
}

// UPI QR flow: no provider round-trip at creation. The user scans the merchant QR
// (Paytm/GPay/PhonePe), pays, then confirms — and an admin verifies the txn before unlock.
class UpiGateway implements PaymentGateway {
  readonly name: 'upi' = 'upi';
  async createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
    return { gateway: 'upi', gateway_order_id: input.order_id };
  }
}

class RazorpayGateway implements PaymentGateway {
  readonly name: 'razorpay' = 'razorpay';

  private get auth(): string {
    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
      throw new Error('RZP_KEY_ID / RZP_KEY_SECRET env missing — razorpay mode cannot run');
    }
    return `Basic ${Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64')}`;
  }

  async createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
    const auth = this.auth;
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: input.amount_paisa,
        currency: input.currency,
        receipt: `tieedu_${input.order_id.replace(/[^a-zA-Z0-9_-]/g, '').slice(-28)}`,
        payment_capture: 1,
        notes: { tieedu_order_id: input.order_id },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) {
      const desc = data?.error?.description || `Razorpay HTTP ${res.status}`;
      throw new Error(`Razorpay create-order failed: ${desc}`);
    }
    return { gateway: 'razorpay', gateway_order_id: data.id, key_id: config.razorpay.keyId };
  }
}

export function getGateway(mode: PaymentMode): PaymentGateway {
  return mode === 'razorpay' ? new RazorpayGateway() : new UpiGateway();
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

// Server-side verification of the client checkout signature:
//   signature = HMAC_SHA256( razorpay_order_id + "|" + razorpay_payment_id, key_secret )
export function verifyRazorpaySignature(p: { order_id: string; payment_id: string; signature: string }): boolean {
  if (!p.signature || !config.razorpay.keySecret) return false;
  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${p.order_id}|${p.payment_id}`)
    .digest('hex');
  return safeEqual(expected, p.signature);
}

// Webhook authenticity: Razorpay signs the exact raw body with the webhook secret.
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!signature || !config.razorpay.webhookSecret) return false;
  const expected = crypto
    .createHmac('sha256', config.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');
  return safeEqual(expected, signature);
}