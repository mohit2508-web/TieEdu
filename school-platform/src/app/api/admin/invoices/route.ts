import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createInvoice, listSchoolsForBilling } from '@/server/billing-service';
import { requirePermission } from '@/server/auth';
import { fail, handleError, ok } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requirePermission('pricing.manage');
    return ok({ schools: await listSchoolsForBilling() });
  } catch (err) {
    return handleError(err, 'admin/invoices GET');
  }
}

const input = z.object({
  schoolId: z.string().min(1),
  amountPaise: z.number().int().nonnegative().optional(),
  seats: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission('pricing.manage');
    const parsed = input.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(400, 'Invalid invoice input');

    const { schoolId, ...rest } = parsed.data;
    const invoice = await createInvoice(schoolId, rest, session.userId);
    return ok({ invoice }, 201);
  } catch (err) {
    return handleError(err, 'admin/invoices POST');
  }
}
