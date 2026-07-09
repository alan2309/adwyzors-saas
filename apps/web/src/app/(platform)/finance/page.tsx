import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { tenantPrisma } from "@adwyzors/database";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button } from "@adwyzors/ui";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await requireSession();
  const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
  requirePermission(session.user, permissions, PERMISSIONS.FINANCE.ACCOUNT_LIST);

  const db = tenantPrisma(session.user.tenantId);
  const accounts = await db.account.findMany({ orderBy: { code: "asc" } });

  const grouped = {
    asset: accounts.filter(a => a.type === "asset"),
    liability: accounts.filter(a => a.type === "liability"),
    equity: accounts.filter(a => a.type === "equity"),
    revenue: accounts.filter(a => a.type === "revenue"),
    expense: accounts.filter(a => a.type === "expense"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild><Link href="/finance/accounts/new"><Plus className="h-4 w-4 mr-2" />Add Account</Link></Button>
      </div>

      {Object.entries(grouped).map(([type, accs]) => (
        accs.length > 0 && (
          <div key={type} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground capitalize">{type}</h2>
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accs.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-mono text-xs">{acc.code}</TableCell>
                      <TableCell className="font-medium">{acc.name}</TableCell>
                      <TableCell><Badge variant={acc.isActive ? "success" : "secondary"}>{acc.isActive ? "active" : "inactive"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )
      ))}

      {accounts.length === 0 && <p className="text-center text-muted-foreground py-8">No accounts configured. Create your chart of accounts to get started.</p>}
    </div>
  );
}
