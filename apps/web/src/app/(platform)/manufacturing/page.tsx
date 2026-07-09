import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { tenantPrisma } from "@adwyzors/database";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button } from "@adwyzors/ui";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProductionOrdersPage() {
  const session = await requireSession();
  const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
  requirePermission(session.user, permissions, PERMISSIONS.MANUFACTURING.ORDER_LIST);

  const db = tenantPrisma(session.user.tenantId);
  const orders = await db.productionOrder.findMany({
    take: 50, orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true, code: true } }, warehouse: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Production Orders</h1>
          <p className="text-muted-foreground mt-1">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild><Link href="/manufacturing/new"><Plus className="h-4 w-4 mr-2" />New Order</Link></Button>
      </div>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Planned Start</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs"><Link href={`/manufacturing/${o.id}`} className="hover:underline">{o.orderNumber}</Link></TableCell>
                <TableCell>{o.product.name}</TableCell>
                <TableCell>{Number(o.quantity)}</TableCell>
                <TableCell className="text-muted-foreground">{o.warehouse.name}</TableCell>
                <TableCell className="text-muted-foreground">{o.plannedStart ? new Date(o.plannedStart).toLocaleDateString() : "—"}</TableCell>
                <TableCell><Badge variant={o.status === "completed" ? "success" : o.status === "in_progress" ? "default" : o.status === "cancelled" ? "destructive" : "secondary"}>{o.status}</Badge></TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No production orders yet.</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
