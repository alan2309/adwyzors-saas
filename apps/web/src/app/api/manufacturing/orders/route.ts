import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { parsePaginationParams, getPrismaSkip, paginatedResponse, successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

const createProdOrderDto = z.object({
  productId: z.string().min(1),
  bomId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().positive(),
  plannedStart: z.string().datetime().optional(),
  plannedEnd: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.MANUFACTURING.ORDER_LIST);

    const db = tenantPrisma(session.user.tenantId);
    const { searchParams } = request.nextUrl;
    const params = parsePaginationParams(searchParams);
    const skip = getPrismaSkip(params);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (params.search) { where.OR = [{ orderNumber: { contains: params.search, mode: "insensitive" } }]; }
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      db.productionOrder.findMany({ where, skip, take: params.limit, orderBy: { createdAt: "desc" }, include: { product: { select: { name: true, code: true } }, warehouse: { select: { name: true } } } }),
      db.productionOrder.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(orders, total, params));
  } catch (error) {
    logger.error({ error }, "Failed to list production orders");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.MANUFACTURING.ORDER_CREATE);

    const body: unknown = await request.json();
    const parsed = createProdOrderDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });
    }

    const tenantId = session.user.tenantId;
    const count = await prisma.productionOrder.count({ where: { tenantId } });
    const orderNumber = `MO-${String(count + 1).padStart(4, "0")}`;

    const order = await prisma.productionOrder.create({
      data: {
        tenantId, orderNumber, productId: parsed.data.productId, bomId: parsed.data.bomId,
        warehouseId: parsed.data.warehouseId, quantity: parsed.data.quantity, status: "planned",
        plannedStart: parsed.data.plannedStart ? new Date(parsed.data.plannedStart) : null,
        plannedEnd: parsed.data.plannedEnd ? new Date(parsed.data.plannedEnd) : null,
        notes: parsed.data.notes ?? null, createdBy: session.user.userId,
      },
    });

    await writeAuditLog({ tenantId, userId: session.user.userId, action: "production_order.created", entityType: "ProductionOrder", entityId: order.id, after: { orderNumber, productId: parsed.data.productId, quantity: parsed.data.quantity } });
    return NextResponse.json(successResponse(order), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create production order");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
