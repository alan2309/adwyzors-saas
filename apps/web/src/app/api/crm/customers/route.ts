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
import { createCustomerDto } from "./dto";

/**
 * GET /api/crm/customers
 * Lists customers for the current tenant (paginated, searchable).
 * Requires: crm.customer.list
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.CRM.CUSTOMER_LIST);

    const db = tenantPrisma(session.user.tenantId);
    const { searchParams } = request.nextUrl;
    const params = parsePaginationParams(searchParams);
    const skip = getPrismaSkip(params);

    // Filters
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { code: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
        { phone: { contains: params.search } },
      ];
    }
    if (status) where.status = status;
    if (type) where.type = type;

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder ?? "desc" }
          : { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          email: true,
          phone: true,
          status: true,
          creditLimit: true,
          createdAt: true,
          _count: { select: { contacts: true } },
        },
      }),
      db.customer.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(customers, total, params));
  } catch (error) {
    logger.error({ error }, "Failed to list customers");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}

/**
 * POST /api/crm/customers
 * Creates a new customer with auto-generated code.
 * Requires: crm.customer.create
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.CRM.CUSTOMER_CREATE);

    const body: unknown = await request.json();
    const parsed = createCustomerDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const tenantId = session.user.tenantId;

    // Auto-generate customer code: count existing + 1
    const count = await prisma.customer.count({ where: { tenantId } });
    const code = `C-${String(count + 1).padStart(4, "0")}`;

    const customer = await prisma.customer.create({
      data: {
        tenantId,
        code,
        name: parsed.data.name,
        type: parsed.data.type,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        address: parsed.data.address ?? undefined,
        gstin: parsed.data.gstin ?? null,
        pan: parsed.data.pan ?? null,
        creditLimit: parsed.data.creditLimit ?? null,
        paymentTerms: parsed.data.paymentTerms ?? null,
        createdBy: session.user.userId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    await writeAuditLog({
      tenantId,
      userId: session.user.userId,
      action: "customer.created",
      entityType: "Customer",
      entityId: customer.id,
      after: { code, name: parsed.data.name, type: parsed.data.type },
    });

    logger.info(
      { tenantId, customerId: customer.id, code },
      "Customer created"
    );

    return NextResponse.json(successResponse(customer), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create customer");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}
