import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { parsePaginationParams, getPrismaSkip, paginatedResponse, successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

const createVendorDto = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  gstin: z.string().optional(),
  address: z.object({ line1: z.string().optional(), city: z.string().optional(), state: z.string().optional(), postalCode: z.string().optional(), country: z.string().optional() }).optional(),
  paymentTerms: z.number().int().min(0).max(365).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.PURCHASE.VENDOR_LIST);

    const db = tenantPrisma(session.user.tenantId);
    const { searchParams } = request.nextUrl;
    const params = parsePaginationParams(searchParams);
    const skip = getPrismaSkip(params);

    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { code: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [vendors, total] = await Promise.all([
      db.vendor.findMany({ where, skip, take: params.limit, orderBy: { createdAt: "desc" }, select: { id: true, code: true, name: true, email: true, phone: true, status: true, paymentTerms: true, createdAt: true } }),
      db.vendor.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(vendors, total, params));
  } catch (error) {
    logger.error({ error }, "Failed to list vendors");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.PURCHASE.VENDOR_CREATE);

    const body: unknown = await request.json();
    const parsed = createVendorDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });
    }

    const tenantId = session.user.tenantId;
    const count = await prisma.vendor.count({ where: { tenantId } });
    const code = `V-${String(count + 1).padStart(4, "0")}`;

    const vendor = await prisma.vendor.create({
      data: { tenantId, code, name: parsed.data.name, email: parsed.data.email ?? null, phone: parsed.data.phone ?? null, gstin: parsed.data.gstin ?? null, address: parsed.data.address ?? undefined, paymentTerms: parsed.data.paymentTerms ?? null, createdBy: session.user.userId },
    });

    await writeAuditLog({ tenantId, userId: session.user.userId, action: "vendor.created", entityType: "Vendor", entityId: vendor.id, after: { code, name: parsed.data.name } });
    return NextResponse.json(successResponse(vendor), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create vendor");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
