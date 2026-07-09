import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

const upsertSequenceDto = z.object({
  entityType: z.string().min(1),
  prefix: z.string().min(1).max(10),
  padding: z.number().int().min(1).max(10).default(4),
});

/**
 * GET /api/settings/sequences
 * Lists all number sequences for the tenant.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.SETTINGS.TENANT_READ);

    const db = tenantPrisma(session.user.tenantId);
    const sequences = await db.numberSequence.findMany({ orderBy: { entityType: "asc" } });
    return NextResponse.json(successResponse(sequences));
  } catch (error) {
    logger.error({ error }, "Failed to list number sequences");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

/**
 * POST /api/settings/sequences
 * Creates or updates a number sequence for an entity type.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.SETTINGS.TENANT_UPDATE);

    const body: unknown = await request.json();
    const parsed = upsertSequenceDto.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });

    const tenantId = session.user.tenantId;
    const sequence = await prisma.numberSequence.upsert({
      where: { tenantId_entityType: { tenantId, entityType: parsed.data.entityType } },
      update: { prefix: parsed.data.prefix, padding: parsed.data.padding },
      create: { tenantId, entityType: parsed.data.entityType, prefix: parsed.data.prefix, padding: parsed.data.padding },
    });

    await writeAuditLog({ tenantId, userId: session.user.userId, action: "sequence.updated", entityType: "NumberSequence", entityId: sequence.id, after: parsed.data });
    return NextResponse.json(successResponse(sequence));
  } catch (error) {
    logger.error({ error }, "Failed to update number sequence");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
