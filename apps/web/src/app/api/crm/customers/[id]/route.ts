import { NextRequest, NextResponse } from "next/server";
import { tenantPrisma, prisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { updateCustomerDto } from "../dto";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/crm/customers/[id]
 * Returns customer detail with contacts.
 * Requires: crm.customer.view
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.CRM.CUSTOMER_VIEW);

    const { id } = await params;
    const db = tenantPrisma(session.user.tenantId);

    const customer = await db.customer.findFirst({
      where: { id },
      include: {
        contacts: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json(successResponse(customer));
  } catch (error) {
    logger.error({ error }, "Failed to get customer");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}

/**
 * PATCH /api/crm/customers/[id]
 * Updates a customer.
 * Requires: crm.customer.edit
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.CRM.CUSTOMER_EDIT);

    const { id } = await params;
    const db = tenantPrisma(session.user.tenantId);

    const body: unknown = await request.json();
    const parsed = updateCustomerDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const existing = await db.customer.findFirst({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      updatedBy: session.user.userId,
      version: { increment: 1 },
    };
    const d = parsed.data;
    if (d.name !== undefined) updateData.name = d.name;
    if (d.type !== undefined) updateData.type = d.type;
    if (d.email !== undefined) updateData.email = d.email;
    if (d.phone !== undefined) updateData.phone = d.phone;
    if (d.address !== undefined) updateData.address = d.address;
    if (d.gstin !== undefined) updateData.gstin = d.gstin;
    if (d.pan !== undefined) updateData.pan = d.pan;
    if (d.creditLimit !== undefined) updateData.creditLimit = d.creditLimit;
    if (d.paymentTerms !== undefined) updateData.paymentTerms = d.paymentTerms;
    if (d.status !== undefined) updateData.status = d.status;

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        email: true,
        phone: true,
        status: true,
        updatedAt: true,
      },
    });

    await writeAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.userId,
      action: "customer.updated",
      entityType: "Customer",
      entityId: id,
      before: { name: existing.name, status: existing.status },
      after: parsed.data,
    });

    return NextResponse.json(successResponse(customer));
  } catch (error) {
    logger.error({ error }, "Failed to update customer");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}

/**
 * DELETE /api/crm/customers/[id]
 * Soft-deletes a customer.
 * Requires: crm.customer.delete
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.CRM.CUSTOMER_DELETE);

    const { id } = await params;
    const db = tenantPrisma(session.user.tenantId);

    const existing = await db.customer.findFirst({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: session.user.userId },
    });

    await writeAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.userId,
      action: "customer.deleted",
      entityType: "Customer",
      entityId: id,
      before: { name: existing.name, code: existing.code },
    });

    logger.info(
      { tenantId: session.user.tenantId, customerId: id },
      "Customer soft-deleted"
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Failed to delete customer");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}
