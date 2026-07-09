import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { tenantPrisma } from "@adwyzors/database";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button } from "@adwyzors/ui";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SalesOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await requireSession();
  const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
  requirePermission(session.user, permissions, PERMISSIONS.SALES.ORDER_LIST);

  const params = await searchParams;
  const db = tenantPrisma(session.user.tenantId);
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;

  const [orders, total] = await Promise.all([
    db.salesOrder.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { name: true } }, _count: { select: { items: true, invoices: true } } },
    }),
    db.salesOrder.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales Orders</h1>
          <p className="text-muted-foreground mt-1">{total} order{total !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild><Link href="/sales/new"><Plus className="h-4 w-4 mr-2" />New Order</Link></Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Invoices</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((so) => (
              <TableRow key={so.id}>
                <TableCell className="font-mono text-xs"><Link href={`/sales/${so.id}`} className="hover:underline">{so.orderNumber}</Link></TableCell>
                <TableCell>{so.customer.name}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(so.orderDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-muted-foreground">{so._count.items}</TableCell>
                <TableCell className="font-semibold">₹{Number(so.totalAmount).toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground">{so._count.invoices}</TableCell>
                <TableCell><Badge variant={so.status === "delivered" ? "success" : so.status === "cancelled" ? "destructive" : so.status === "confirmed" ? "default" : "secondary"}>{so.status}</Badge></TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No sales orders yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
