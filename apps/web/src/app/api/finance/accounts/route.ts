import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

const createAccountDto = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(2).max(200),
  type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  parentId: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.FINANCE.ACCOUNT_LIST);

    const db = tenantPrisma(session.user.tenantId);
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (type) where.type = type;

    const accounts = await db.account.findMany({ where, orderBy: { code: "asc" } });
    return NextResponse.json(successResponse(accounts));
  } catch (error) {
    logger.error({ error }, "Failed to list accounts");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.FINANCE.ACCOUNT_CREATE);

    const body: unknown = await request.json();
    const parsed = createAccountDto.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });

    const tenantId = session.user.tenantId;
    const existing = await prisma.account.findFirst({ where: { tenantId, code: parsed.data.code } });
    if (existing) return NextResponse.json({ success: false, error: { code: "CONFLICT", message: "Account code already exists" } }, { status: 409 });

    const account = await prisma.account.create({
      data: { tenantId, code: parsed.data.code, name: parsed.data.name, type: parsed.data.type, parentId: parsed.data.parentId ?? null, description: parsed.data.description ?? null, createdBy: session.user.userId },
    });

    await writeAuditLog({ tenantId, userId: session.user.userId, action: "account.created", entityType: "Account", entityId: account.id, after: { code: parsed.data.code, name: parsed.data.name, type: parsed.data.type } });
    return NextResponse.json(successResponse(account), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create account");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
