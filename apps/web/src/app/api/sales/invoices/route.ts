import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { parsePaginationParams, getPrismaSkip, paginatedResponse, successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

const createInvoiceDto = z.object({
  customerId: z.string().min(1),
  soId: z.string().optional(),
  invoiceDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  totalAmount: z.number().positive(),
  notes: z.string().optional(),
});

const recordPaymentDto = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(["cash", "bank_transfer", "cheque", "upi", "card"]),
  reference: z.string().optional(),
  paidAt: z.string().datetime(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.SALES.INVOICE_LIST);

    const db = tenantPrisma(session.user.tenantId);
    const { searchParams } = request.nextUrl;
    const params = parsePaginationParams(searchParams);
    const skip = getPrismaSkip(params);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (params.search) { where.OR = [{ invoiceNumber: { contains: params.search, mode: "insensitive" } }]; }
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({ where, skip, take: params.limit, orderBy: { createdAt: "desc" }, include: { customer: { select: { name: true, code: true } } } }),
      db.invoice.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(invoices, total, params));
  } catch (error) {
    logger.error({ error }, "Failed to list invoices");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);

    const body: unknown = await request.json();

    // Determine if this is a create-invoice or record-payment call
    const maybePayment = recordPaymentDto.safeParse(body);
    if (maybePayment.success) {
      requirePermission(session.user, permissions, PERMISSIONS.SALES.PAYMENT_RECORD);
      const tenantId = session.user.tenantId;
      const { invoiceId, amount, method, reference, paidAt, notes } = maybePayment.data;

      const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } });
      if (!invoice) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Invoice not found" } }, { status: 404 });

      const payment = await prisma.payment.create({
        data: { tenantId, invoiceId, amount, method, reference: reference ?? null, paidAt: new Date(paidAt), notes: notes ?? null, createdBy: session.user.userId },
      });

      // Update invoice paidAmount and status
      const newPaid = Number(invoice.paidAmount) + amount;
      const newStatus = newPaid >= Number(invoice.totalAmount) ? "paid" : invoice.status;
      await prisma.invoice.update({ where: { id: invoiceId }, data: { paidAmount: newPaid, status: newStatus } });

      await writeAuditLog({ tenantId, userId: session.user.userId, action: "payment.recorded", entityType: "Payment", entityId: payment.id, after: { invoiceId, amount, method } });
      return NextResponse.json(successResponse(payment), { status: 201 });
    }

    // Otherwise, create invoice
    requirePermission(session.user, permissions, PERMISSIONS.SALES.INVOICE_CREATE);
    const parsed = createInvoiceDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });
    }

    const tenantId = session.user.tenantId;
    const count = await prisma.invoice.count({ where: { tenantId } });
    const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        tenantId, invoiceNumber, customerId: parsed.data.customerId,
        soId: parsed.data.soId ?? null, status: "draft",
        invoiceDate: new Date(parsed.data.invoiceDate), dueDate: new Date(parsed.data.dueDate),
        totalAmount: parsed.data.totalAmount, notes: parsed.data.notes ?? null,
        createdBy: session.user.userId,
      },
    });

    await writeAuditLog({ tenantId, userId: session.user.userId, action: "invoice.created", entityType: "Invoice", entityId: invoice.id, after: { invoiceNumber, customerId: parsed.data.customerId, totalAmount: parsed.data.totalAmount } });
    return NextResponse.json(successResponse(invoice), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to process invoice request");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
