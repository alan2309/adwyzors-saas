import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { inviteUserDto } from "../../dto";

/**
 * POST /api/settings/users/invite
 * Creates a new pending user in the tenant.
 * In development, no email is sent — the user is created with status "pending".
 * Requires: settings.user.invite
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.SETTINGS.USER_INVITE);

    const body: unknown = await request.json();
    const parsed = inviteUserDto.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { email, name, roleId } = parsed.data;
    const tenantId = session.user.tenantId;
    const db = tenantPrisma(tenantId);

    // Check if user already exists in this tenant
    const existingUser = await db.user.findFirst({
      where: { email },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: "A user with this email already exists in this tenant" } },
        { status: 409 }
      );
    }

    // Verify the role exists and belongs to this tenant
    const role = await db.role.findFirst({
      where: { id: roleId },
    });
    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Role not found" } },
        { status: 404 }
      );
    }

    // Create user with pending status (no password — they'll set one via invite link)
    const user = await prisma.user.create({
      data: {
        tenantId,
        email,
        name,
        status: "pending",
        createdBy: session.user.userId,
        userRoles: {
          create: {
            roleId,
            tenantId,
            assignedBy: session.user.userId,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
      },
    });

    await writeAuditLog({
      tenantId,
      userId: session.user.userId,
      action: "user.invited",
      entityType: "User",
      entityId: user.id,
      after: { email, name, roleId },
    });

    logger.info(
      { tenantId, invitedEmail: email, invitedBy: session.user.userId },
      "User invited"
    );

    return NextResponse.json(successResponse(user), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to invite user");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}
