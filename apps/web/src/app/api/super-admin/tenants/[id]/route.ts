import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { updateTenantDto } from "../dto";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/super-admin/tenants/[id]
 * Returns a single tenant's details.
 * Requires: platform.tenant.read
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.PLATFORM.TENANT_READ);

    const { id } = await params;

    const tenant = await prisma.tenant.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { users: true, roles: true } },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Tenant not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json(successResponse(tenant));
  } catch (error) {
    logger.error({ error }, "Failed to get tenant");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}

/**
 * PATCH /api/super-admin/tenants/[id]
 * Updates a tenant's details.
 * Requires: platform.tenant.update
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.PLATFORM.TENANT_UPDATE);

    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = updateTenantDto.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
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

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.plan !== undefined) updateData.plan = parsed.data.plan;
    if (parsed.data.customDomain !== undefined) updateData.customDomain = parsed.data.customDomain;
    if (parsed.data.configJson !== undefined) updateData.configJson = parsed.data.configJson;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        subdomain: true,
        customDomain: true,
        plan: true,
        status: true,
        configJson: true,
        updatedAt: true,
      },
    });

    await writeAuditLog({
      tenantId: id,
      userId: session.user.userId,
      action: "tenant.updated",
      entityType: "Tenant",
      entityId: id,
      before: { name: existing.name, plan: existing.plan },
      after: parsed.data,
    });

    logger.info({ tenantId: id, updatedBy: session.user.userId }, "Tenant updated");

    return NextResponse.json(successResponse(tenant));
  } catch (error) {
    logger.error({ error }, "Failed to update tenant");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}
