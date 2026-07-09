import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

const createRuleDto = z.object({
  name: z.string().min(2).max(200),
  trigger: z.string().min(1), // e.g. "sales_order.created"
  condition: z.record(z.unknown()).default({}),
  action: z.enum(["notify.email", "notify.inapp", "update.status", "webhook"]),
  config: z.record(z.unknown()).default({}),
});

const updateRuleDto = z.object({
  name: z.string().min(2).max(200).optional(),
  trigger: z.string().min(1).optional(),
  condition: z.record(z.unknown()).optional(),
  action: z.enum(["notify.email", "notify.inapp", "update.status", "webhook"]).optional(),
  config: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.AUTOMATION.RULE_LIST);

    const db = tenantPrisma(session.user.tenantId);
    const rules = await db.automationRule.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(successResponse(rules));
  } catch (error) {
    logger.error({ error }, "Failed to list automation rules");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.AUTOMATION.RULE_CREATE);

    const body: unknown = await request.json();
    const parsed = createRuleDto.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });

    const tenantId = session.user.tenantId;
    const rule = await prisma.automationRule.create({
      data: { tenantId, name: parsed.data.name, trigger: parsed.data.trigger, condition: parsed.data.condition as object, action: parsed.data.action, config: parsed.data.config as object, createdBy: session.user.userId },
    });

    await writeAuditLog({ tenantId, userId: session.user.userId, action: "automation_rule.created", entityType: "AutomationRule", entityId: rule.id, after: { name: parsed.data.name, trigger: parsed.data.trigger, action: parsed.data.action } });
    return NextResponse.json(successResponse(rule), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create automation rule");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.AUTOMATION.RULE_EDIT);

    const body: unknown = await request.json();
    const bodyWithId = body as { id?: string };
    if (!bodyWithId.id) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "id is required" } }, { status: 400 });

    const parsed = updateRuleDto.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });

    const db = tenantPrisma(session.user.tenantId);
    const existing = await db.automationRule.findFirst({ where: { id: bodyWithId.id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Rule not found" } }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    const d = parsed.data;
    if (d.name !== undefined) updateData.name = d.name;
    if (d.trigger !== undefined) updateData.trigger = d.trigger;
    if (d.condition !== undefined) updateData.condition = d.condition;
    if (d.action !== undefined) updateData.action = d.action;
    if (d.config !== undefined) updateData.config = d.config;
    if (d.isActive !== undefined) updateData.isActive = d.isActive;

    const rule = await prisma.automationRule.update({ where: { id: bodyWithId.id }, data: updateData });
    await writeAuditLog({ tenantId: session.user.tenantId, userId: session.user.userId, action: "automation_rule.updated", entityType: "AutomationRule", entityId: rule.id, after: parsed.data });

    return NextResponse.json(successResponse(rule));
  } catch (error) {
    logger.error({ error }, "Failed to update automation rule");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
