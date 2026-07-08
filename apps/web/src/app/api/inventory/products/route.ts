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
import { createProductDto } from "./dto";

/**
 * GET /api/inventory/products
 * Lists products for the current tenant (paginated, searchable, filterable).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.INVENTORY.PRODUCT_LIST);

    const db = tenantPrisma(session.user.tenantId);
    const { searchParams } = request.nextUrl;
    const params = parsePaginationParams(searchParams);
    const skip = getPrismaSkip(params);
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { code: { contains: params.search, mode: "insensitive" } },
        { hsn: { contains: params.search } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: params.sortBy ? { [params.sortBy]: params.sortOrder ?? "desc" } : { createdAt: "desc" },
        select: {
          id: true, code: true, name: true, unit: true, hsn: true,
          costPrice: true, sellPrice: true, taxRate: true,
          minStock: true, status: true, createdAt: true, categoryId: true,
        },
      }),
      db.product.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(products, total, params));
  } catch (error) {
    logger.error({ error }, "Failed to list products");
    const resp = errorResponse(error);
    return NextResponse.json(resp, { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

/**
 * POST /api/inventory/products
 * Creates a new product with auto-generated code.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.INVENTORY.PRODUCT_CREATE);

    const body: unknown = await request.json();
    const parsed = createProductDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const tenantId = session.user.tenantId;
    const count = await prisma.product.count({ where: { tenantId } });
    const code = `P-${String(count + 1).padStart(4, "0")}`;

    const product = await prisma.product.create({
      data: {
        tenantId,
        code,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        categoryId: parsed.data.categoryId ?? null,
        unit: parsed.data.unit,
        hsn: parsed.data.hsn ?? null,
        costPrice: parsed.data.costPrice ?? null,
        sellPrice: parsed.data.sellPrice ?? null,
        taxRate: parsed.data.taxRate ?? null,
        minStock: parsed.data.minStock ?? null,
        maxStock: parsed.data.maxStock ?? null,
        createdBy: session.user.userId,
      },
    });

    await writeAuditLog({
      tenantId, userId: session.user.userId,
      action: "product.created", entityType: "Product", entityId: product.id,
      after: { code, name: parsed.data.name, unit: parsed.data.unit },
    });

    return NextResponse.json(successResponse(product), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create product");
    const resp = errorResponse(error);
    return NextResponse.json(resp, { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
