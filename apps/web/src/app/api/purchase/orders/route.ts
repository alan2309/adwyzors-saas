import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { parsePaginationParams, getPrismaSkip, paginatedResponse, successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

const createPODto = z.object({
  vendorId: z.string().min(1),
  orderDate: z.string().datetime(),
  expectedDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    unitPrice: z.number().min(0),
    taxRate: z.number().min(0).max(100).default(0),
  })).min(1, "At least one item required"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.PURCHASE.PO_LIST);

    const db = tenantPrisma(session.user.tenantId);
    const { searchParams } = request.nextUrl;
    const params = parsePaginationParams(searchParams);
    const skip = getPrismaSkip(params);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (params.search) { where.OR = [{ poNumber: { contains: params.search, mode: "insensitive" } }]; }
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      db.purchaseOrder.findMany({ where, skip, take: params.limit, orderBy: { createdAt: "desc" }, include: { vendor: { select: { name: true, code: true } }, _count: { select: { items: true } } } }),
      db.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(orders, total, params));
  } catch (error) {
    logger.error({ error }, "Failed to list purchase orders");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.PURCHASE.PO_CREATE);

    const body: unknown = await request.json();
    const parsed = createPODto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });
    }

    const tenantId = session.user.tenantId;
    const count = await prisma.purchaseOrder.count({ where: { tenantId } });
    const poNumber = `PO-${String(count + 1).padStart(4, "0")}`;

    // Calculate line totals
    const items = parsed.data.items.map(item => {
      const subtotal = item.quantity * item.unitPrice;
      const tax = subtotal * (item.taxRate / 100);
      return { ...item, total: subtotal + tax };
    });
    const totalAmount = items.reduce((sum, i) => sum + i.total, 0);

    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId, poNumber, vendorId: parsed.data.vendorId, status: "draft",
        orderDate: new Date(parsed.data.orderDate),
        expectedDate: parsed.data.expectedDate ? new Date(parsed.data.expectedDate) : null,
        totalAmount, notes: parsed.data.notes ?? null, createdBy: session.user.userId,
        items: { create: items.map(i => ({ productId: i.productId, quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice, taxRate: i.taxRate, total: i.total })) },
      },
      include: { items: true },
    });

    await writeAuditLog({ tenantId, userId: session.user.userId, action: "po.created", entityType: "PurchaseOrder", entityId: po.id, after: { poNumber, vendorId: parsed.data.vendorId, totalAmount, itemCount: items.length } });
    return NextResponse.json(successResponse(po), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create purchase order");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
