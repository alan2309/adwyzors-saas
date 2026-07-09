import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { parsePaginationParams, getPrismaSkip, paginatedResponse, successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

const createBOMDto = z.object({
  productId: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    scrap: z.number().min(0).max(100).default(0),
  })).min(1, "At least one component required"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.MANUFACTURING.BOM_LIST);

    const db = tenantPrisma(session.user.tenantId);
    const { searchParams } = request.nextUrl;
    const params = parsePaginationParams(searchParams);
    const skip = getPrismaSkip(params);

    const where: Record<string, unknown> = {};
    if (params.search) { where.product = { name: { contains: params.search, mode: "insensitive" } }; }

    const [boms, total] = await Promise.all([
      db.billOfMaterials.findMany({ where, skip, take: params.limit, orderBy: { createdAt: "desc" }, include: { product: { select: { name: true, code: true } }, _count: { select: { items: true } } } }),
      db.billOfMaterials.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(boms, total, params));
  } catch (error) {
    logger.error({ error }, "Failed to list BOMs");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.MANUFACTURING.BOM_CREATE);

    const body: unknown = await request.json();
    const parsed = createBOMDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });
    }

    const tenantId = session.user.tenantId;

    // Get next version for this product
    const existingCount = await prisma.billOfMaterials.count({ where: { tenantId, productId: parsed.data.productId } });
    const version = existingCount + 1;

    const bom = await prisma.billOfMaterials.create({
      data: {
        tenantId, productId: parsed.data.productId, version,
        notes: parsed.data.notes ?? null, createdBy: session.user.userId,
        items: { create: parsed.data.items.map(i => ({ productId: i.productId, quantity: i.quantity, unit: i.unit, scrap: i.scrap })) },
      },
      include: { items: true, product: { select: { name: true, code: true } } },
    });

    await writeAuditLog({ tenantId, userId: session.user.userId, action: "bom.created", entityType: "BillOfMaterials", entityId: bom.id, after: { productId: parsed.data.productId, version, itemCount: parsed.data.items.length } });
    return NextResponse.json(successResponse(bom), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create BOM");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
