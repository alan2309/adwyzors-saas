import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

const createMovementDto = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  type: z.enum(["inward", "outward", "transfer", "adjustment"]),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().min(1),
  reference: z.string().optional(),
  referenceId: z.string().optional(),
  reason: z.string().optional(),
});

/**
 * GET /api/inventory/stock
 * Returns current stock levels per product per warehouse.
 * Query: ?productId=xxx or ?warehouseId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.INVENTORY.MOVEMENT_VIEW);

    const { searchParams } = request.nextUrl;
    const productId = searchParams.get("productId");
    const warehouseId = searchParams.get("warehouseId");
    const tenantId = session.user.tenantId;

    // Calculate stock levels using aggregation on the ledger
    const where: Record<string, unknown> = { tenantId };
    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;

    const movements = await prisma.stockMovement.groupBy({
      by: ["productId", "warehouseId", "type"],
      where,
      _sum: { quantity: true },
    });

    // Calculate net stock: inward + adjustment(positive) - outward
    const stockMap = new Map<string, { productId: string; warehouseId: string; quantity: number }>();

    for (const m of movements) {
      const key = `${m.productId}:${m.warehouseId}`;
      if (!stockMap.has(key)) {
        stockMap.set(key, { productId: m.productId, warehouseId: m.warehouseId, quantity: 0 });
      }
      const entry = stockMap.get(key)!;
      const qty = Number(m._sum.quantity ?? 0);

      if (m.type === "inward" || m.type === "adjustment") {
        entry.quantity += qty;
      } else if (m.type === "outward") {
        entry.quantity -= qty;
      }
      // "transfer" is handled as outward from source (separate movement entries)
    }

    const stockLevels = Array.from(stockMap.values());

    return NextResponse.json(successResponse(stockLevels));
  } catch (error) {
    logger.error({ error }, "Failed to get stock levels");
    const resp = errorResponse(error);
    return NextResponse.json(resp, { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

/**
 * POST /api/inventory/stock
 * Creates a new stock movement (ledger entry).
 * This is an IMMUTABLE entry — never updated or deleted.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.INVENTORY.MOVEMENT_CREATE);

    const body: unknown = await request.json();
    const parsed = createMovementDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const tenantId = session.user.tenantId;

    // Verify product and warehouse belong to this tenant
    const [product, warehouse] = await Promise.all([
      prisma.product.findFirst({ where: { id: parsed.data.productId, tenantId, deletedAt: null } }),
      prisma.warehouse.findFirst({ where: { id: parsed.data.warehouseId, tenantId, isActive: true } }),
    ]);

    if (!product) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
    }
    if (!warehouse) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Warehouse not found or inactive" } }, { status: 404 });
    }

    // For outward movements, check sufficient stock
    if (parsed.data.type === "outward") {
      const inwardSum = await prisma.stockMovement.aggregate({
        where: { tenantId, productId: parsed.data.productId, warehouseId: parsed.data.warehouseId, type: { in: ["inward", "adjustment"] } },
        _sum: { quantity: true },
      });
      const outwardSum = await prisma.stockMovement.aggregate({
        where: { tenantId, productId: parsed.data.productId, warehouseId: parsed.data.warehouseId, type: "outward" },
        _sum: { quantity: true },
      });
      const currentStock = Number(inwardSum._sum.quantity ?? 0) - Number(outwardSum._sum.quantity ?? 0);

      if (currentStock < parsed.data.quantity) {
        return NextResponse.json(
          { success: false, error: { code: "INSUFFICIENT_STOCK", message: `Insufficient stock. Available: ${currentStock} ${parsed.data.unit}` } },
          { status: 400 }
        );
      }
    }

    const movement = await prisma.stockMovement.create({
      data: {
        tenantId,
        productId: parsed.data.productId,
        warehouseId: parsed.data.warehouseId,
        type: parsed.data.type,
        quantity: parsed.data.quantity,
        unit: parsed.data.unit,
        reference: parsed.data.reference ?? null,
        referenceId: parsed.data.referenceId ?? null,
        reason: parsed.data.reason ?? null,
        createdBy: session.user.userId,
      },
    });

    await writeAuditLog({
      tenantId, userId: session.user.userId,
      action: `stock.${parsed.data.type}`,
      entityType: "StockMovement", entityId: movement.id,
      after: { productId: parsed.data.productId, warehouseId: parsed.data.warehouseId, type: parsed.data.type, quantity: parsed.data.quantity },
    });

    logger.info(
      { tenantId, movementId: movement.id, type: parsed.data.type, productId: parsed.data.productId, quantity: parsed.data.quantity },
      "Stock movement created"
    );

    return NextResponse.json(successResponse(movement), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create stock movement");
    const resp = errorResponse(error);
    return NextResponse.json(resp, { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
