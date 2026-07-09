import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

const createGRDto = z.object({
  warehouseId: z.string().min(1),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().positive(), unit: z.string().min(1) })).min(1),
  notes: z.string().optional(),
});

/**
 * POST /api/purchase/orders/[id]/receive
 * Creates a GoodsReceipt and triggers inward StockMovements for each item.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.PURCHASE.GR_CREATE);

    const { id: poId } = await params;
    const tenantId = session.user.tenantId;
    const db = tenantPrisma(tenantId);

    const body: unknown = await request.json();
    const parsed = createGRDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });
    }

    // Verify PO exists
    const po = await db.purchaseOrder.findFirst({ where: { id: poId } });
    if (!po) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "PO not found" } }, { status: 404 });

    // Create GoodsReceipt + items + StockMovements in a transaction
    const receipt = await prisma.$transaction(async (tx) => {
      const gr = await tx.goodsReceipt.create({
        data: {
          tenantId, poId, warehouseId: parsed.data.warehouseId,
          notes: parsed.data.notes ?? null, createdBy: session.user.userId,
          items: { create: parsed.data.items.map(i => ({ productId: i.productId, quantity: i.quantity, unit: i.unit })) },
        },
        include: { items: true },
      });

      // Create inward stock movements for each received item
      for (const item of parsed.data.items) {
        await tx.stockMovement.create({
          data: {
            tenantId, productId: item.productId, warehouseId: parsed.data.warehouseId,
            type: "inward", quantity: item.quantity, unit: item.unit,
            reference: po.poNumber, referenceId: gr.id, reason: "Goods received",
            createdBy: session.user.userId,
          },
        });
      }

      // Update PO status to received
      await tx.purchaseOrder.update({ where: { id: poId }, data: { status: "received" } });

      return gr;
    });

    await writeAuditLog({ tenantId, userId: session.user.userId, action: "gr.created", entityType: "GoodsReceipt", entityId: receipt.id, after: { poId, warehouseId: parsed.data.warehouseId, itemCount: parsed.data.items.length } });
    logger.info({ tenantId, grId: receipt.id, poId }, "Goods receipt created with stock movements");

    return NextResponse.json(successResponse(receipt), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create goods receipt");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
