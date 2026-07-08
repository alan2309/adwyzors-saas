import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

const createWarehouseDto = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20).regex(/^[A-Z0-9-]+$/, "Code must be uppercase alphanumeric"),
  address: z.object({
    line1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
});

const updateWarehouseDto = z.object({
  name: z.string().min(2).max(100).optional(),
  address: z.object({
    line1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
  }).nullable().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/inventory/warehouses
 * Lists warehouses for the current tenant.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.INVENTORY.WAREHOUSE_MANAGE);

    const db = tenantPrisma(session.user.tenantId);
    const warehouses = await db.warehouse.findMany({ orderBy: { createdAt: "asc" } });

    return NextResponse.json(successResponse(warehouses));
  } catch (error) {
    logger.error({ error }, "Failed to list warehouses");
    const resp = errorResponse(error);
    return NextResponse.json(resp, { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

/**
 * POST /api/inventory/warehouses
 * Creates a new warehouse.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.INVENTORY.WAREHOUSE_MANAGE);

    const body: unknown = await request.json();
    const parsed = createWarehouseDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });
    }

    const tenantId = session.user.tenantId;

    // Check code uniqueness
    const existing = await prisma.warehouse.findFirst({ where: { tenantId, code: parsed.data.code } });
    if (existing) {
      return NextResponse.json({ success: false, error: { code: "CONFLICT", message: "Warehouse code already exists" } }, { status: 409 });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        tenantId,
        name: parsed.data.name,
        code: parsed.data.code,
        address: parsed.data.address ?? undefined,
        createdBy: session.user.userId,
      },
    });

    await writeAuditLog({
      tenantId, userId: session.user.userId,
      action: "warehouse.created", entityType: "Warehouse", entityId: warehouse.id,
      after: { name: parsed.data.name, code: parsed.data.code },
    });

    return NextResponse.json(successResponse(warehouse), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create warehouse");
    const resp = errorResponse(error);
    return NextResponse.json(resp, { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

/**
 * PATCH /api/inventory/warehouses (with id in body)
 * Updates a warehouse. Using body.id since we don't have a [id] route yet.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.INVENTORY.WAREHOUSE_MANAGE);

    const rawBody: unknown = await request.json();
    const bodyWithId = rawBody as { id?: string };
    const id = bodyWithId.id;
    if (!id) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } }, { status: 400 });
    }

    const parsed = updateWarehouseDto.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });
    }

    const db = tenantPrisma(session.user.tenantId);
    const existing = await db.warehouse.findFirst({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Warehouse not found" } }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.address !== undefined) updateData.address = parsed.data.address;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

    const warehouse = await prisma.warehouse.update({ where: { id }, data: updateData });

    await writeAuditLog({
      tenantId: session.user.tenantId, userId: session.user.userId,
      action: "warehouse.updated", entityType: "Warehouse", entityId: id,
      before: { name: existing.name }, after: parsed.data,
    });

    return NextResponse.json(successResponse(warehouse));
  } catch (error) {
    logger.error({ error }, "Failed to update warehouse");
    const resp = errorResponse(error);
    return NextResponse.json(resp, { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
