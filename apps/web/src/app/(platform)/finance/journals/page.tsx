import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { tenantPrisma } from "@adwyzors/database";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button } from "@adwyzors/ui";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function JournalEntriesPage() {
  const session = await requireSession();
  const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
  requirePermission(session.user, permissions, PERMISSIONS.FINANCE.JOURNAL_LIST);

  const db = tenantPrisma(session.user.tenantId);
  const entries = await db.journalEntry.findMany({
    take: 50, orderBy: { date: "desc" },
    include: { lines: { include: { account: { select: { code: true, name: true } } } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Journal Entries</h1>
          <p className="text-muted-foreground mt-1">{entries.length} entr{entries.length !== 1 ? "ies" : "y"}</p>
        </div>
        <Button asChild><Link href="/finance/journals/new"><Plus className="h-4 w-4 mr-2" />New Entry</Link></Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entry #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Lines</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => {
              const totalDebit = e.lines.reduce((s, l) => s + Number(l.debit), 0);
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.entryNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(e.date).toLocaleDateString()}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{e.description}</TableCell>
                  <TableCell className="text-muted-foreground">{e.lines.length}</TableCell>
                  <TableCell className="font-semibold">₹{totalDebit.toLocaleString()}</TableCell>
                  <TableCell><Badge variant={e.status === "posted" ? "success" : e.status === "draft" ? "secondary" : "destructive"}>{e.status}</Badge></TableCell>
                </TableRow>
              );
            })}
            {entries.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No journal entries yet.</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
