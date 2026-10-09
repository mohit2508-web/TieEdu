import { NextRequest } from 'next/server';
import { z } from 'zod';
import { markInvoicePaid } from '@/server/billing-service';
import { requirePermission } from '@/server/auth';
import { fail, handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requirePermission('pricing.manage');
    const parsed = z.object({ schoolId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(400, 'A schoolId is required');

    const invoice = await markInvoicePaid(parsed.data.schoolId, params.id, session.userId);
    return ok({ invoice });
  } catch (err) {
    return handleError(err, 'admin/invoices/[id]/pay POST');
  }
}
