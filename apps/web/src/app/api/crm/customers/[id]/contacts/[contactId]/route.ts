import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { updateContactDto } from "../dto";

type RouteParams = { params: Promise<{ id: string; contactId: string }> };

/**
 * PATCH /api/crm/customers/[id]/contacts/[contactId]
 * Updates a contact.
 * Requires: crm.contact.edit
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.CRM.CONTACT_EDIT);

    const { id: customerId, contactId } = await params;
    const tenantId = session.user.tenantId;

    const body: unknown = await request.json();
    const parsed = updateContactDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    // Verify contact exists and belongs to this tenant/customer
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, customerId, tenantId },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Contact not found" } },
        { status: 404 }
      );
    }

    // If setting as primary, unset others
    if (parsed.data.isPrimary === true) {
      await prisma.contact.updateMany({
        where: { customerId, tenantId, isPrimary: true, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }

    const updateData: Record<string, unknown> = {};
    const d = parsed.data;
    if (d.name !== undefined) updateData.name = d.name;
    if (d.email !== undefined) updateData.email = d.email;
    if (d.phone !== undefined) updateData.phone = d.phone;
    if (d.role !== undefined) updateData.role = d.role;
    if (d.isPrimary !== undefined) updateData.isPrimary = d.isPrimary;

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: updateData,
    });

    await writeAuditLog({
      tenantId,
      userId: session.user.userId,
      action: "contact.updated",
      entityType: "Contact",
      entityId: contactId,
      before: { name: existing.name, isPrimary: existing.isPrimary },
      after: parsed.data,
    });

    return NextResponse.json(successResponse(contact));
  } catch (error) {
    logger.error({ error }, "Failed to update contact");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}
