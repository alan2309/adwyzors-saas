import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

const updateStatusDto = z.object({ status: z.enum(["sent", "confirmed", "received", "cancelled"]) });

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.PURCHASE.PO_LIST);

    const { id } = await params;
    const db = tenantPrisma(session.user.tenantId);
    const po = await db.purchaseOrder.findFirst({ where: { id }, include: { vendor: true, items: { include: { product: { select: { name: true, code: true } } } }, receipts: true } });
    if (!po) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "PO not found" } }, { status: 404 });

    return NextResponse.json(successResponse(po));
  } catch (error) {
    logger.error({ error }, "Failed to get PO");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.PURCHASE.PO_APPROVE);

    const { id } = await params;
    const db = tenantPrisma(session.user.tenantId);
    const body: unknown = await request.json();
    const parsed = updateStatusDto.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid status" } }, { status: 400 });

    const existing = await db.purchaseOrder.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "PO not found" } }, { status: 404 });

    const po = await prisma.purchaseOrder.update({ where: { id }, data: { status: parsed.data.status, updatedBy: session.user.userId } });
    await writeAuditLog({ tenantId: session.user.tenantId, userId: session.user.userId, action: `po.${parsed.data.status}`, entityType: "PurchaseOrder", entityId: id, before: { status: existing.status }, after: { status: parsed.data.status } });

    return NextResponse.json(successResponse(po));
  } catch (error) {
    logger.error({ error }, "Failed to update PO status");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
