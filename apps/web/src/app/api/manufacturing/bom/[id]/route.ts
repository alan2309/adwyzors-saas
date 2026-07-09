import { NextRequest, NextResponse } from "next/server";
import { tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.MANUFACTURING.BOM_LIST);

    const { id } = await params;
    const db = tenantPrisma(session.user.tenantId);
    const bom = await db.billOfMaterials.findFirst({
      where: { id },
      include: { product: { select: { name: true, code: true, unit: true } }, items: { include: { product: { select: { name: true, code: true, unit: true } } } } },
    });

    if (!bom) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "BOM not found" } }, { status: 404 });
    return NextResponse.json(successResponse(bom));
  } catch (error) {
    logger.error({ error }, "Failed to get BOM");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
