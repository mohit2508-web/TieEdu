import 'server-only';
import { prisma } from '@/lib/db';
import { forSchool } from '@/lib/tenant';
import { recordAudit } from '@/lib/audit';
import { computeInvoiceAmount, getPlan, seatUsage } from '@/lib/billing';
import { DomainError } from './errors';

/**
 * Commerce & billing (Phase 5, spec §8). Invoices are tenant-scoped; platform
 * staff create and settle them per school.
 */

export async function listInvoices(schoolId: string) {
  const db = forSchool(schoolId);
  return db.invoice.findMany({ orderBy: { issuedAt: 'desc' } });
}

export async function getSchoolBilling(schoolId: string) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new DomainError('NOT_FOUND', 'School not found');

  const db = forSchool(schoolId);
  const [activeMembers, invoices] = await Promise.all([
    db.membership.count({ where: { status: 'ACTIVE' } }),
    db.invoice.findMany({ orderBy: { issuedAt: 'desc' } }),
  ]);

  const plan = getPlan(school.plan);
  const outstanding = invoices
    .filter((i) => i.status === 'OPEN')
    .reduce((sum, i) => sum + i.amountPaise, 0);

  return {
    school: { id: school.id, name: school.name, plan: school.plan },
    plan,
    seats: seatUsage(school.plan, activeMembers),
    outstanding,
    invoices,
  };
}

export interface CreateInvoiceInput {
  amountPaise?: number;
  seats?: number;
  notes?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
}

export async function createInvoice(
  schoolId: string,
  input: CreateInvoiceInput,
  actorUserId: string
) {
  const db = forSchool(schoolId);
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new DomainError('NOT_FOUND', 'School not found');

  const plan = getPlan(school.plan);
  const seats =
    input.seats ?? (await db.membership.count({ where: { status: 'ACTIVE' } }));
  const amountPaise = input.amountPaise ?? computeInvoiceAmount(seats, plan.pricePerSeatPaise);
  if (amountPaise < 0) throw new DomainError('INVALID', 'Amount cannot be negative');

  const count = await db.invoice.count();
  const number = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  const invoice = await db.invoice.create({
    data: {
      schoolId,
      number,
      amountPaise,
      notes: input.notes ?? null,
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
    },
  });
  await recordAudit({
    actorUserId,
    schoolId,
    action: 'billing.invoice.create',
    targetType: 'Invoice',
    targetId: invoice.id,
  });
  return invoice;
}

export async function markInvoicePaid(schoolId: string, invoiceId: string, actorUserId: string) {
  const db = forSchool(schoolId);
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId } });
  if (!invoice) throw new DomainError('NOT_FOUND', 'Invoice not found');
  if (invoice.status === 'PAID') return invoice;

  const updated = await db.invoice.update({
    where: { id: invoiceId },
    data: { status: 'PAID', paidAt: new Date() },
  });
  await recordAudit({
    actorUserId,
    schoolId,
    action: 'billing.invoice.pay',
    targetType: 'Invoice',
    targetId: invoiceId,
  });
  return updated;
}

/** Platform-wide view for the invoices console. */
export async function listSchoolsForBilling() {
  const [schools, invoices] = await Promise.all([
    prisma.school.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, plan: true } }),
    prisma.invoice.findMany({ select: { schoolId: true, amountPaise: true, status: true } }),
  ]);

  return schools.map((s) => {
    const mine = invoices.filter((i) => i.schoolId === s.id);
    return {
      id: s.id,
      name: s.name,
      plan: s.plan,
      invoiceCount: mine.length,
      outstanding: mine.filter((i) => i.status === 'OPEN').reduce((sum, i) => sum + i.amountPaise, 0),
      paid: mine.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + i.amountPaise, 0),
    };
  });
}
