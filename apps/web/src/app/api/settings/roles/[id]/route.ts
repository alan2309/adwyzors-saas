import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { updateRoleDto } from "../../dto";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/settings/roles/[id]
 * Updates a custom role. System roles cannot be modified.
 * Requires: settings.role.update
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.SETTINGS.ROLE_UPDATE);

    const { id } = await params;
    const tenantId = session.user.tenantId;
    const db = tenantPrisma(tenantId);

    const body: unknown = await request.json();
    const parsed = updateRoleDto.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    // Find existing role
    const existingRole = await db.role.findFirst({ where: { id } });
    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Role not found" } },
        { status: 404 }
      );
    }

    // Block modification of system roles
    if (existingRole.isSystem) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "System roles cannot be modified" } },
        { status: 403 }
      );
    }

    const { name, description, permissionIds } = parsed.data;

    // Check name uniqueness if changing name
    if (name && name !== existingRole.name) {
      const duplicate = await db.role.findFirst({ where: { name } });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: { code: "CONFLICT", message: "A role with this name already exists" } },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedBy: session.user.userId,
    };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    // Update role
    const role = await prisma.role.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        updatedAt: true,
      },
    });

    // If permissions are being updated, replace them
    if (permissionIds !== undefined) {
      // Delete existing permissions
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      // Create new ones
      if (permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
            assignedBy: session.user.userId,
          })),
        });
      }
    }

    await writeAuditLog({
      tenantId,
      userId: session.user.userId,
      action: "role.updated",
      entityType: "Role",
      entityId: id,
      before: { name: existingRole.name },
      after: parsed.data,
    });

    logger.info({ tenantId, roleId: id }, "Role updated");

    return NextResponse.json(successResponse(role));
  } catch (error) {
    logger.error({ error }, "Failed to update role");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}
