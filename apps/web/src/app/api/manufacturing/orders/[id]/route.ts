import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

const updateStatusDto = z.object({ action: z.enum(["start", "complete", "cancel"]) });

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.MANUFACTURING.ORDER_LIST);

    const { id } = await params;
    const db = tenantPrisma(session.user.tenantId);
    const order = await db.productionOrder.findFirst({ where: { id }, include: { product: { select: { name: true, code: true, unit: true } }, bom: { include: { items: { include: { product: { select: { name: true, code: true } } } } } }, warehouse: { select: { name: true, code: true } } } });

    if (!order) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Production order not found" } }, { status: 404 });
    return NextResponse.json(successResponse(order));
  } catch (error) {
    logger.error({ error }, "Failed to get production order");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

/**
 * PATCH /api/manufacturing/orders/[id]
 * Transitions production order status.
 * - start: consumes raw materials (outward StockMovements per BOM)
 * - complete: produces finished goods (inward StockMovement)
 * - cancel: just updates status
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);

    const { id } = await params;
    const tenantId = session.user.tenantId;
    const db = tenantPrisma(tenantId);

    const body: unknown = await request.json();
    const parsed = updateStatusDto.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "action must be start, complete, or cancel" } }, { status: 400 });

    const order = await db.productionOrder.findFirst({ where: { id }, include: { bom: { include: { items: true } }, product: { select: { unit: true } } } });
    if (!order) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Order not found" } }, { status: 404 });

    const { action } = parsed.data;

    if (action === "start") {
      requirePermission(session.user, permissions, PERMISSIONS.MANUFACTURING.ORDER_START);
      if (order.status !== "planned") return NextResponse.json({ success: false, error: { code: "INVALID_STATE", message: "Can only start planned orders" } }, { status: 400 });

      // Consume raw materials: outward StockMovement per BOM item
      await prisma.$transaction(async (tx) => {
        for (const item of order.bom.items) {
          const requiredQty = Number(item.quantity) * Number(order.quantity) * (1 + Number(item.scrap) / 100);
          await tx.stockMovement.create({
            data: { tenantId, productId: item.productId, warehouseId: order.warehouseId, type: "outward", quantity: requiredQty, unit: item.unit, reference: order.orderNumber, referenceId: order.id, reason: "Production consumption", createdBy: session.user.userId },
          });
        }
        await tx.productionOrder.update({ where: { id }, data: { status: "in_progress", actualStart: new Date(), updatedBy: session.user.userId } });
      });

      await writeAuditLog({ tenantId, userId: session.user.userId, action: "production_order.started", entityType: "ProductionOrder", entityId: id, after: { status: "in_progress", materialsConsumed: order.bom.items.length } });

    } else if (action === "complete") {
      requirePermission(session.user, permissions, PERMISSIONS.MANUFACTURING.ORDER_COMPLETE);
      if (order.status !== "in_progress") return NextResponse.json({ success: false, error: { code: "INVALID_STATE", message: "Can only complete in-progress orders" } }, { status: 400 });

      // Produce finished goods: inward StockMovement
      await prisma.$transaction(async (tx) => {
        await tx.stockMovement.create({
          data: { tenantId, productId: order.productId, warehouseId: order.warehouseId, type: "inward", quantity: order.quantity, unit: order.product.unit, reference: order.orderNumber, referenceId: order.id, reason: "Production output", createdBy: session.user.userId },
        });
        await tx.productionOrder.update({ where: { id }, data: { status: "completed", actualEnd: new Date(), updatedBy: session.user.userId } });
      });

      await writeAuditLog({ tenantId, userId: session.user.userId, action: "production_order.completed", entityType: "ProductionOrder", entityId: id, after: { status: "completed", quantityProduced: Number(order.quantity) } });

    } else {
      // cancel
      requirePermission(session.user, permissions, PERMISSIONS.MANUFACTURING.ORDER_START);
      if (order.status === "completed") return NextResponse.json({ success: false, error: { code: "INVALID_STATE", message: "Cannot cancel completed orders" } }, { status: 400 });
      await prisma.productionOrder.update({ where: { id }, data: { status: "cancelled", updatedBy: session.user.userId } });
      await writeAuditLog({ tenantId, userId: session.user.userId, action: "production_order.cancelled", entityType: "ProductionOrder", entityId: id, after: { status: "cancelled" } });
    }

    const updated = await prisma.productionOrder.findUnique({ where: { id } });
    return NextResponse.json(successResponse(updated));
  } catch (error) {
    logger.error({ error }, "Failed to update production order");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
