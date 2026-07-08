import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@adwyzors/database";
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
import { createTenantDto } from "./dto";

/**
 * GET /api/super-admin/tenants
 * Lists all tenants with pagination and search.
 * Requires: platform.tenant.read
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.PLATFORM.TENANT_READ);

    const { searchParams } = request.nextUrl;
    const params = parsePaginationParams(searchParams);
    const skip = getPrismaSkip(params);

    const where = {
      deletedAt: null,
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" as const } },
              { subdomain: { contains: params.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          subdomain: true,
          customDomain: true,
          plan: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    logger.info(
      { userId: session.user.userId, total, page: params.page },
      "Tenant list fetched"
    );

    return NextResponse.json(paginatedResponse(tenants, total, params));
  } catch (error) {
    logger.error({ error }, "Failed to list tenants");
    const resp = errorResponse(error);
    const status =
      (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}

/**
 * POST /api/super-admin/tenants
 * Creates a new tenant with default admin role.
 * Requires: platform.tenant.create
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.PLATFORM.TENANT_CREATE);

    const body: unknown = await request.json();
    const parsed = createTenantDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { name, subdomain, plan, customDomain } = parsed.data;

    // Check subdomain uniqueness
    const existing = await prisma.tenant.findUnique({ where: { subdomain } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: "Subdomain already in use" } },
        { status: 409 }
      );
    }

    // Create tenant with default TENANT_ADMIN role
    const tenant = await prisma.tenant.create({
      data: {
        name,
        subdomain,
        plan,
        customDomain: customDomain ?? null,
        roles: {
          create: [
            {
              name: "TENANT_ADMIN",
              description: "Default administrator role for this tenant",
              isSystem: true,
            },
            {
              name: "TENANT_USER",
              description: "Default user role for this tenant",
              isSystem: true,
            },
          ],
        },
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        customDomain: true,
        plan: true,
        status: true,
        createdAt: true,
      },
    });

    await writeAuditLog({
      tenantId: tenant.id,
      userId: session.user.userId,
      action: "tenant.created",
      entityType: "Tenant",
      entityId: tenant.id,
      after: { name, subdomain, plan },
    });

    logger.info(
      { tenantId: tenant.id, subdomain, createdBy: session.user.userId },
      "Tenant created"
    );

    return NextResponse.json(successResponse(tenant), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create tenant");
    const resp = errorResponse(error);
    const status =
      (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}
