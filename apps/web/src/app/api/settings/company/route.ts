import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

const updateCompanyDto = z.object({
  name: z.string().min(2).max(200).optional(),
  configJson: z.record(z.unknown()).optional(),
});

/**
 * GET /api/settings/company
 * Returns the current tenant's company settings.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.SETTINGS.TENANT_READ);

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { id: true, name: true, subdomain: true, customDomain: true, plan: true, configJson: true, status: true },
    });

    return NextResponse.json(successResponse(tenant));
  } catch (error) {
    logger.error({ error }, "Failed to get company settings");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

/**
 * PATCH /api/settings/company
 * Updates the current tenant's company settings.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.SETTINGS.TENANT_UPDATE);

    const body: unknown = await request.json();
    const parsed = updateCompanyDto.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });

    const tenantId = session.user.tenantId;
    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.configJson !== undefined) updateData.configJson = parsed.data.configJson;

    const tenant = await prisma.tenant.update({ where: { id: tenantId }, data: updateData });
    await writeAuditLog({ tenantId, userId: session.user.userId, action: "company.updated", entityType: "Tenant", entityId: tenantId, after: parsed.data });

    return NextResponse.json(successResponse(tenant));
  } catch (error) {
    logger.error({ error }, "Failed to update company settings");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
