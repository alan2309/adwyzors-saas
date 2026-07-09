import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { writeAuditLog } from "@adwyzors/audit";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { parsePaginationParams, getPrismaSkip, paginatedResponse, successResponse, errorResponse } from "@adwyzors/shared";
import { z } from "zod";

const createJournalDto = z.object({
  date: z.string().datetime(),
  description: z.string().min(2).max(500),
  reference: z.string().optional(),
  referenceId: z.string().optional(),
  lines: z.array(z.object({
    accountId: z.string().min(1),
    debit: z.number().min(0).default(0),
    credit: z.number().min(0).default(0),
    narration: z.string().optional(),
  })).min(2, "At least 2 lines required"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.FINANCE.JOURNAL_LIST);

    const db = tenantPrisma(session.user.tenantId);
    const { searchParams } = request.nextUrl;
    const params = parsePaginationParams(searchParams);
    const skip = getPrismaSkip(params);

    const where: Record<string, unknown> = {};
    if (params.search) { where.OR = [{ entryNumber: { contains: params.search, mode: "insensitive" } }, { description: { contains: params.search, mode: "insensitive" } }]; }

    const [entries, total] = await Promise.all([
      db.journalEntry.findMany({ where, skip, take: params.limit, orderBy: { date: "desc" }, include: { lines: { include: { account: { select: { code: true, name: true } } } } } }),
      db.journalEntry.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(entries, total, params));
  } catch (error) {
    logger.error({ error }, "Failed to list journal entries");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.FINANCE.JOURNAL_CREATE);

    const body: unknown = await request.json();
    const parsed = createJournalDto.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } }, { status: 400 });

    // Double-entry validation: total debits MUST equal total credits
    const totalDebit = parsed.data.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = parsed.data.lines.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: `Debits (${totalDebit}) must equal credits (${totalCredit})` } }, { status: 400 });
    }

    // Each line must have either debit or credit (not both, not neither)
    for (const line of parsed.data.lines) {
      if (line.debit === 0 && line.credit === 0) {
        return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Each line must have either a debit or credit amount" } }, { status: 400 });
      }
      if (line.debit > 0 && line.credit > 0) {
        return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "A line cannot have both debit and credit" } }, { status: 400 });
      }
    }

    const tenantId = session.user.tenantId;
    const count = await prisma.journalEntry.count({ where: { tenantId } });
    const entryNumber = `JE-${String(count + 1).padStart(5, "0")}`;

    const entry = await prisma.journalEntry.create({
      data: {
        tenantId, entryNumber, date: new Date(parsed.data.date), description: parsed.data.description,
        reference: parsed.data.reference ?? null, referenceId: parsed.data.referenceId ?? null,
        status: "posted", createdBy: session.user.userId,
        lines: { create: parsed.data.lines.map(l => ({ accountId: l.accountId, debit: l.debit, credit: l.credit, narration: l.narration ?? null })) },
      },
      include: { lines: true },
    });

    await writeAuditLog({ tenantId, userId: session.user.userId, action: "journal.created", entityType: "JournalEntry", entityId: entry.id, after: { entryNumber, totalDebit, linesCount: parsed.data.lines.length } });
    return NextResponse.json(successResponse(entry), { status: 201 });
  } catch (error) {
    logger.error({ error }, "Failed to create journal entry");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
