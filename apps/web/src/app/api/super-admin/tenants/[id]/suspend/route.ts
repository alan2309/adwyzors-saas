import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/super-admin/tenants/[id]/suspend
 * Suspends or reactivates a tenant.
 * Body: { action: "suspend" | "reactivate" }
 * Requires: platform.tenant.suspend
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.PLATFORM.TENANT_SUSPEND);

    const { id } = await params;
    const body: unknown = await request.json();
    const action = (body as { action?: string }).action;

    if (action !== "suspend" && action !== "reactivate") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "action must be 'suspend' or 'reactivate'" } },
        { status: 400 }
      );
    }

    const existing = await prisma.tenant.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Tenant not found" } },
        { status: 404 }
      );
    }

    const newStatus = action === "suspend" ? "suspended" : "active";

    if (existing.status === newStatus) {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: `Tenant is already ${newStatus}` } },
        { status: 409 }
      );
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { status: newStatus },
      select: {
        id: true,
        name: true,
        subdomain: true,
        status: true,
        updatedAt: true,
      },
    });

    await writeAuditLog({
      tenantId: id,
      userId: session.user.userId,
      action: `tenant.${action}d`,
      entityType: "Tenant",
      entityId: id,
      before: { status: existing.status },
      after: { status: newStatus },
    });

    logger.info(
      { tenantId: id, action, performedBy: session.user.userId },
      `Tenant ${action}d`
    );

    return NextResponse.json(successResponse(tenant));
  } catch (error) {
    logger.error({ error }, "Failed to suspend/reactivate tenant");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}
