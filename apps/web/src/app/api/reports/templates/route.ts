import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { enqueueExport } from "@adwyzors/queue";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

const createTemplateDto = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  entityType: z.string().min(1),
  columns: z.array(z.object({ key: z.string(), label: z.string() })).min(1),
  filters: z.record(z.unknown()).default({}),
  schedule: z.string().nullable().optional(), // cron expression or null
  format: z.enum(["csv", "xlsx", "pdf"]).default("csv"),
});

const generateReportDto = z.object({
  templateId: z.string().min(1),
  filters: z.record(z.unknown()).optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.REPORTS.TEMPLATE_LIST);

    const db = tenantPrisma(session.user.tenantId);
    const templates = await db.reportTemplate.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(successResponse(templates));
  } catch (error) {
    logger.error({ error }, "Failed to list report templates");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);

    const body: unknown = await request.json();

    // Check if this is a "generate" request or a "create template" request
    const maybeGenerate = generateReportDto.safeParse(body);
    if (maybeGenerate.success) {
      requirePermission(session.user, permissions, PERMISSIONS.REPORTS.GENERATE);
      const tenantId = session.user.tenantId;

      const template = await prisma.reportTemplate.findFirst({ where: { id: maybeGenerate.data.templateId, tenantId } });
      if (!template) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Template not found" } }, { status: 404 });

      // Enqueue export job
      const jobId = await enqueueExport({
        tenantId, userId: session.user.userId,
        entityType: template.entityType, filters: maybeGenerate.data.filters ?? (template.filters as Record<string, unknown>),
        format: template.format as "csv" | "xlsx",
      });

      logger.info({ tenantId, templateId: template.id, jobId }, "Report generation enqueued");
      return NextResponse.json(successResponse({ jobId, templateId: template.id, status: "queued" }), { status: 202 });
    }

    // Otherwise, create template
    requirePermission(session.user, permissions, PERMISSIONS.REPORTS.TEMPLATE_CREATE);
    const parsed = createTemplateDto.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });

    const tenantId = session.user.tenantId;
    const template = await prisma.reportTemplate.create({
      data: { tenantId, name: parsed.data.name, description: parsed.data.description ?? null, entityType: parsed.data.entityType, columns: parsed.data.columns as object[], filters: parsed.data.filters as object, schedule: parsed.data.schedule ?? null, format: parsed.data.format, createdBy: session.user.userId },
    });

    await writeAuditLog({ tenantId, userId: session.user.userId, action: "report_template.created", entityType: "ReportTemplate", entityId: template.id, after: { name: parsed.data.name, entityType: parsed.data.entityType } });
    return NextResponse.json(successResponse(template), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to process report request");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
