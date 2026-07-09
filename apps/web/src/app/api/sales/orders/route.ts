import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { parsePaginationParams, getPrismaSkip, paginatedResponse, successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

const createSODto = z.object({
  customerId: z.string().min(1),
  orderDate: z.string().datetime(),
  deliveryDate: z.string().datetime().optional(),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).default(0),
    taxRate: z.number().min(0).max(100).default(0),
  })).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.SALES.ORDER_LIST);

    const db = tenantPrisma(session.user.tenantId);
    const { searchParams } = request.nextUrl;
    const params = parsePaginationParams(searchParams);
    const skip = getPrismaSkip(params);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (params.search) { where.OR = [{ orderNumber: { contains: params.search, mode: "insensitive" } }]; }
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      db.salesOrder.findMany({ where, skip, take: params.limit, orderBy: { createdAt: "desc" }, include: { customer: { select: { name: true, code: true } }, _count: { select: { items: true } } } }),
      db.salesOrder.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(orders, total, params));
  } catch (error) {
    logger.error({ error }, "Failed to list sales orders");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.SALES.ORDER_CREATE);

    const body: unknown = await request.json();
    const parsed = createSODto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });
    }

    const tenantId = session.user.tenantId;
    const count = await prisma.salesOrder.count({ where: { tenantId } });
    const orderNumber = `SO-${String(count + 1).padStart(4, "0")}`;

    const items = parsed.data.items.map(item => {
      const subtotal = item.quantity * item.unitPrice - item.discount;
      const tax = subtotal * (item.taxRate / 100);
      return { ...item, total: subtotal + tax };
    });
    const taxAmount = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice - i.discount) * (i.taxRate / 100), 0);
    const totalAmount = items.reduce((sum, i) => sum + i.total, 0) - parsed.data.discount;

    const so = await prisma.salesOrder.create({
      data: {
        tenantId, orderNumber, customerId: parsed.data.customerId, status: "draft",
        orderDate: new Date(parsed.data.orderDate),
        deliveryDate: parsed.data.deliveryDate ? new Date(parsed.data.deliveryDate) : null,
        totalAmount, discount: parsed.data.discount, taxAmount,
        notes: parsed.data.notes ?? null, createdBy: session.user.userId,
        items: { create: items.map(i => ({ productId: i.productId, quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice, discount: i.discount, taxRate: i.taxRate, total: i.total })) },
      },
      include: { items: true },
    });

    await writeAuditLog({ tenantId, userId: session.user.userId, action: "so.created", entityType: "SalesOrder", entityId: so.id, after: { orderNumber, customerId: parsed.data.customerId, totalAmount } });
    return NextResponse.json(successResponse(so), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create sales order");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
