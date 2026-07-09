import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { tenantPrisma } from "@adwyzors/database";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@adwyzors/ui";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSession();
  const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
  requirePermission(session.user, permissions, PERMISSIONS.SALES.INVOICE_LIST);

  const params = await searchParams;
  const db = tenantPrisma(session.user.tenantId);

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;

  const invoices = await db.invoice.findMany({
    where, take: 50, orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground mt-1">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                <TableCell>{inv.customer.name}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(inv.invoiceDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                <TableCell className="font-semibold">₹{Number(inv.totalAmount).toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground">₹{Number(inv.paidAmount).toLocaleString()}</TableCell>
                <TableCell><Badge variant={inv.status === "paid" ? "success" : inv.status === "overdue" ? "destructive" : inv.status === "sent" ? "default" : "secondary"}>{inv.status}</Badge></TableCell>
              </TableRow>
            ))}
            {invoices.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No invoices yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
