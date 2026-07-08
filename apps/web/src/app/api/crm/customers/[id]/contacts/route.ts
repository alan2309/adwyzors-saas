import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { createContactDto } from "./dto";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/crm/customers/[id]/contacts
 * Lists contacts for a specific customer.
 * Requires: crm.contact.list
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.CRM.CONTACT_LIST);

    const { id: customerId } = await params;
    const db = tenantPrisma(session.user.tenantId);

    // Verify customer exists and belongs to tenant
    const customer = await db.customer.findFirst({
      where: { id: customerId },
    });
    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } },
        { status: 404 }
      );
    }

    const contacts = await prisma.contact.findMany({
      where: { customerId, tenantId: session.user.tenantId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(successResponse(contacts));
  } catch (error) {
    logger.error({ error }, "Failed to list contacts");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}

/**
 * POST /api/crm/customers/[id]/contacts
 * Creates a new contact for a customer.
 * Requires: crm.contact.create
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(
      session.user.userId,
      session.user.tenantId
    );
    requirePermission(session.user, permissions, PERMISSIONS.CRM.CONTACT_CREATE);

    const { id: customerId } = await params;
    const tenantId = session.user.tenantId;
    const db = tenantPrisma(tenantId);

    // Verify customer exists
    const customer = await db.customer.findFirst({
      where: { id: customerId },
    });
    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } },
        { status: 404 }
      );
    }

    const body: unknown = await request.json();
    const parsed = createContactDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    // If setting as primary, unset existing primary
    if (parsed.data.isPrimary) {
      await prisma.contact.updateMany({
        where: { customerId, tenantId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.contact.create({
      data: {
        tenantId,
        customerId,
        name: parsed.data.name,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        role: parsed.data.role ?? null,
        isPrimary: parsed.data.isPrimary,
        createdBy: session.user.userId,
      },
    });

    await writeAuditLog({
      tenantId,
      userId: session.user.userId,
      action: "contact.created",
      entityType: "Contact",
      entityId: contact.id,
      after: { name: parsed.data.name, customerId, isPrimary: parsed.data.isPrimary },
    });

    logger.info(
      { tenantId, contactId: contact.id, customerId },
      "Contact created"
    );

    return NextResponse.json(successResponse(contact), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create contact");
    const resp = errorResponse(error);
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(resp, { status });
  }
}
