import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import {
  parsePaginationParams,
  getPrismaSkip,
  paginatedResponse,
  successResponse,
  errorResponse,
} from "@adwyzors/shared";
import { createRoleDto } from "../dto";

/**
 * GET /api/settings/roles
 * Lists roles for the current tenant (paginated).
 * Requires: settings.role.read
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.SETTINGS.ROLE_READ);

    const db = tenantPrisma(session.user.tenantId);
    const { searchParams } = request.nextUrl;
    const params = parsePaginationParams(searchParams);
    const skip = getPrismaSkip(params);

    const where = params.search
      ? { name: { contains: params.search, mode: "insensitive" as const } }
      : {};

    const [roles, total] = await Promise.all([
      db.role.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          isSystem: true,
          status: true,
          createdAt: true,
          _count: { select: { userRoles: true, rolePermissions: true } },
        },
      }),
      db.role.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(roles, total, params));
  } catch (error) {
    logger.error({ error }, "Failed to list roles");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}

/**
 * POST /api/settings/roles
 * Creates a custom role in the current tenant.
 * Requires: settings.role.create
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.SETTINGS.ROLE_CREATE);

    const body: unknown = await request.json();
    const parsed = createRoleDto.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { name, description, permissionIds } = parsed.data;
    const tenantId = session.user.tenantId;

    // Check name uniqueness within tenant
    const db = tenantPrisma(tenantId);
    const existingRole = await db.role.findFirst({ where: { name } });
    if (existingRole) {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: "A role with this name already exists" } },
        { status: 409 }
      );
    }

    // Create role with permission assignments
    const role = await prisma.role.create({
      data: {
        tenantId,
        name,
        description: description ?? null,
        isSystem: false,
        createdBy: session.user.userId,
        rolePermissions: {
          create: permissionIds.map((permissionId) => ({
            permissionId,
            assignedBy: session.user.userId,
          })),
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        createdAt: true,
        _count: { select: { rolePermissions: true } },
      },
    });

    await writeAuditLog({
      tenantId,
      userId: session.user.userId,
      action: "role.created",
      entityType: "Role",
      entityId: role.id,
      after: { name, permissionCount: permissionIds.length },
    });

    logger.info(
      { tenantId, roleId: role.id, roleName: name },
      "Role created"
    );

    return NextResponse.json(successResponse(role), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create role");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}
