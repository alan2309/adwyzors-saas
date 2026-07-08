import { NextRequest, NextResponse } from "next/server";
import { tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import {
  parsePaginationParams,
  getPrismaSkip,
  paginatedResponse,
  errorResponse,
} from "@adwyzors/shared";

/**
 * GET /api/settings/users
 * Lists users within the current tenant (paginated, searchable).
 * Requires: settings.user.read
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.SETTINGS.USER_READ);

    const db = tenantPrisma(session.user.tenantId);
    const { searchParams } = request.nextUrl;
    const params = parsePaginationParams(searchParams);
    const skip = getPrismaSkip(params);

    const where = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" as const } },
            { email: { contains: params.search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: {
            select: {
              role: { select: { id: true, name: true } },
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    logger.info(
      { tenantId: session.user.tenantId, total, page: params.page },
      "User list fetched"
    );

    return NextResponse.json(paginatedResponse(users, total, params));
  } catch (error) {
    logger.error({ error }, "Failed to list users");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}
