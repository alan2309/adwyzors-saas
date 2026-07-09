import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@adwyzors/database";
import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { logger } from "@adwyzors/logger";
import { successResponse, errorResponse } from "@adwyzors/shared";

/**
 * GET /api/finance/reports
 * Query: ?type=trial_balance | profit_loss | balance_sheet
 * Aggregates journal lines by account type.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
    requirePermission(session.user, permissions, PERMISSIONS.FINANCE.REPORT_VIEW);

    const tenantId = session.user.tenantId;
    const { searchParams } = request.nextUrl;
    const reportType = searchParams.get("type") ?? "trial_balance";

    // Aggregate all journal lines grouped by account
    const accounts = await prisma.account.findMany({ where: { tenantId, isActive: true }, orderBy: { code: "asc" } });

    const balances = await prisma.journalLine.groupBy({
      by: ["accountId"],
      where: { entry: { tenantId, status: "posted" } },
      _sum: { debit: true, credit: true },
    });

    const balanceMap = new Map(balances.map(b => [b.accountId, { debit: Number(b._sum.debit ?? 0), credit: Number(b._sum.credit ?? 0) }]));

    if (reportType === "trial_balance") {
      const rows = accounts.map(acc => {
        const bal = balanceMap.get(acc.id) ?? { debit: 0, credit: 0 };
        return { accountCode: acc.code, accountName: acc.name, type: acc.type, debit: bal.debit, credit: bal.credit, balance: bal.debit - bal.credit };
      }).filter(r => r.debit !== 0 || r.credit !== 0);

      const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
      const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

      return NextResponse.json(successResponse({ type: "trial_balance", rows, totals: { debit: totalDebit, credit: totalCredit } }));
    }

    if (reportType === "profit_loss") {
      const revenue = accounts.filter(a => a.type === "revenue").map(acc => {
        const bal = balanceMap.get(acc.id) ?? { debit: 0, credit: 0 };
        return { code: acc.code, name: acc.name, amount: bal.credit - bal.debit };
      }).filter(r => r.amount !== 0);

      const expenses = accounts.filter(a => a.type === "expense").map(acc => {
        const bal = balanceMap.get(acc.id) ?? { debit: 0, credit: 0 };
        return { code: acc.code, name: acc.name, amount: bal.debit - bal.credit };
      }).filter(r => r.amount !== 0);

      const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
      const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);

      return NextResponse.json(successResponse({ type: "profit_loss", revenue, expenses, totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses }));
    }

    if (reportType === "balance_sheet") {
      const assets = accounts.filter(a => a.type === "asset").map(acc => {
        const bal = balanceMap.get(acc.id) ?? { debit: 0, credit: 0 };
        return { code: acc.code, name: acc.name, amount: bal.debit - bal.credit };
      }).filter(r => r.amount !== 0);

      const liabilities = accounts.filter(a => a.type === "liability").map(acc => {
        const bal = balanceMap.get(acc.id) ?? { debit: 0, credit: 0 };
        return { code: acc.code, name: acc.name, amount: bal.credit - bal.debit };
      }).filter(r => r.amount !== 0);

      const equity = accounts.filter(a => a.type === "equity").map(acc => {
        const bal = balanceMap.get(acc.id) ?? { debit: 0, credit: 0 };
        return { code: acc.code, name: acc.name, amount: bal.credit - bal.debit };
      }).filter(r => r.amount !== 0);

      const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
      const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
      const totalEquity = equity.reduce((s, r) => s + r.amount, 0);

      return NextResponse.json(successResponse({ type: "balance_sheet", assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity }));
    }

    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "type must be trial_balance, profit_loss, or balance_sheet" } }, { status: 400 });
  } catch (error) {
    logger.error({ error }, "Failed to generate financial report");
    return NextResponse.json(errorResponse(error), { status: (error as { statusCode?: number }).statusCode ?? 500 });
  }
}
