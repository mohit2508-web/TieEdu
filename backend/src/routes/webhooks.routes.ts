import { Router, Request, Response } from 'express';
import { loadDb, saveDb } from '../data/db';
import { verifyWebhookSignature } from '../payments/gateway';
import { completePaidOrder, pushAudit } from '../payments/orders';

export const webhooksRouter = Router();

// POST /api/webhooks/razorpay
// Raw body is captured into req.rawBody by the global json `verify` hook (server.ts)
// so signature verification stays byte-exact. Idempotent by order status.
webhooksRouter.post('/razorpay', (req: Request, res: Response) => {
  const db = loadDb();
  const signature = (req.headers['x-razorpay-signature'] as string) || '';
  const rawBody = (req as any).rawBody || '';

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid HMAC signature' });
  }

  const event = req.body?.event;
  const payload = req.body?.payload || {};
  const rzpOrderId = payload?.payment?.entity?.order_id || payload?.order?.entity?.id || '';

  // Map razorpay order id -> our TieEdu order
  const order = (db.orders || []).find(
    (o: any) => o.gateway_order_id === rzpOrderId || o.id === rzpOrderId
  );

  if (event === 'payment.captured') {
    if (!order || !order.user_id) {
      return res.json({ status: 'received', handled: false, reason: 'order_not_found' });
    }
    if (order.status === 'paid') {
      return res.json({ status: 'received', handled: true, message: 'order_already_paid' });
    }
    const createdBy = order.user_id;
    try {
      completePaidOrder(db, order, createdBy);
      pushAudit(db, {
        actor: 'razorpay-webhook',
        action: 'order.paid.webhook',
        detail: `payment.captured webhook (${rzpOrderId})`,
        order_id: order.id,
        gateway: 'razorpay',
      });
      saveDb(db);
    } catch (e) {
      return res.status(500).json({ error: 'Completion failed' });
    }
    return res.json({ status: 'received', handled: true, message: 'order_marked_paid' });
  }

  if (event === 'payment.failed') {
    if (order && order.status === 'created') {
      order.status = 'failed';
      order.failure_at = new Date().toISOString();
      pushAudit(db, {
        actor: 'razorpay-webhook',
        action: 'order.failed',
        detail: `payment.failed webhook (${rzpOrderId})`,
        order_id: order.id,
        gateway: 'razorpay',
      });
      saveDb(db);
      return res.json({ status: 'received', handled: true, message: 'order_marked_failed' });
    }
    return res.json({ status: 'received', handled: false });
  }

  return res.json({ status: 'received', handled: false });
});