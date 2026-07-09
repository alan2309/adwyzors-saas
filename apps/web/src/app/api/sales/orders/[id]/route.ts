import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

const updateStatusDto = z.object({ status: z.enum(["confirmed", "shipped", "delivered", "cancelled"]) });

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.SALES.ORDER_LIST);

    const { id } = await params;
    const db = tenantPrisma(session.user.tenantId);
    const so = await db.salesOrder.findFirst({ where: { id }, include: { customer: true, items: { include: { product: { select: { name: true, code: true } } } }, invoices: true } });
    if (!so) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Sales order not found" } }, { status: 404 });

    return NextResponse.json(successResponse(so));
  } catch (error) {
    logger.error({ error }, "Failed to get SO");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);

    const { id } = await params;
    const db = tenantPrisma(session.user.tenantId);
    const body: unknown = await request.json();
    const parsed = updateStatusDto.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid status" } }, { status: 400 });

    // Check appropriate permission
    if (parsed.data.status === "confirmed") requirePermission(session.user, permissions, PERMISSIONS.SALES.ORDER_CONFIRM);
    else if (parsed.data.status === "cancelled") requirePermission(session.user, permissions, PERMISSIONS.SALES.ORDER_CANCEL);
    else requirePermission(session.user, permissions, PERMISSIONS.SALES.ORDER_CONFIRM);

    const existing = await db.salesOrder.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "SO not found" } }, { status: 404 });

    const so = await prisma.salesOrder.update({ where: { id }, data: { status: parsed.data.status, updatedBy: session.user.userId } });
    await writeAuditLog({ tenantId: session.user.tenantId, userId: session.user.userId, action: `so.${parsed.data.status}`, entityType: "SalesOrder", entityId: id, before: { status: existing.status }, after: { status: parsed.data.status } });

    return NextResponse.json(successResponse(so));
  } catch (error) {
    logger.error({ error }, "Failed to update SO status");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
