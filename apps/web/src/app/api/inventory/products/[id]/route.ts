import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { updateProductDto } from "../dto";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/inventory/products/[id]
 * Returns product detail.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.INVENTORY.PRODUCT_LIST);

    const { id } = await params;
    const db = tenantPrisma(session.user.tenantId);
    const product = await db.product.findFirst({ where: { id } });

    if (!product) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
    }

    return NextResponse.json(successResponse(product));
  } catch (error) {
    logger.error({ error }, "Failed to get product");
    const resp = errorResponse(error);
    return NextResponse.json(resp, { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

/**
 * PATCH /api/inventory/products/[id]
 * Updates a product.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.INVENTORY.PRODUCT_EDIT);

    const { id } = await params;
    const db = tenantPrisma(session.user.tenantId);

    const body: unknown = await request.json();
    const parsed = updateProductDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });
    }

    const existing = await db.product.findFirst({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedBy: session.user.userId, version: { increment: 1 } };
    const d = parsed.data;
    if (d.name !== undefined) updateData.name = d.name;
    if (d.description !== undefined) updateData.description = d.description;
    if (d.categoryId !== undefined) updateData.categoryId = d.categoryId;
    if (d.unit !== undefined) updateData.unit = d.unit;
    if (d.hsn !== undefined) updateData.hsn = d.hsn;
    if (d.costPrice !== undefined) updateData.costPrice = d.costPrice;
    if (d.sellPrice !== undefined) updateData.sellPrice = d.sellPrice;
    if (d.taxRate !== undefined) updateData.taxRate = d.taxRate;
    if (d.minStock !== undefined) updateData.minStock = d.minStock;
    if (d.maxStock !== undefined) updateData.maxStock = d.maxStock;
    if (d.status !== undefined) updateData.status = d.status;

    const product = await prisma.product.update({ where: { id }, data: updateData });

    await writeAuditLog({
      tenantId: session.user.tenantId, userId: session.user.userId,
      action: "product.updated", entityType: "Product", entityId: id,
      before: { name: existing.name }, after: parsed.data,
    });

    return NextResponse.json(successResponse(product));
  } catch (error) {
    logger.error({ error }, "Failed to update product");
    const resp = errorResponse(error);
    return NextResponse.json(resp, { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
