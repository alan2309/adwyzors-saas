import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { tenantPrisma } from "@adwyzors/database";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button } from "@adwyzors/ui";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await requireSession();
  const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
  requirePermission(session.user, permissions, PERMISSIONS.PURCHASE.PO_LIST);

  const params = await searchParams;
  const db = tenantPrisma(session.user.tenantId);
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;

  const [orders, total] = await Promise.all([
    db.purchaseOrder.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: "desc" },
      include: { vendor: { select: { name: true } }, _count: { select: { items: true } } },
    }),
    db.purchaseOrder.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">{total} order{total !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild><Link href="/purchase/new"><Plus className="h-4 w-4 mr-2" />New PO</Link></Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((po) => (
              <TableRow key={po.id}>
                <TableCell className="font-mono text-xs"><Link href={`/purchase/${po.id}`} className="hover:underline">{po.poNumber}</Link></TableCell>
                <TableCell>{po.vendor.name}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-muted-foreground">{po._count.items}</TableCell>
                <TableCell className="font-semibold">₹{Number(po.totalAmount).toLocaleString()}</TableCell>
                <TableCell><Badge variant={po.status === "received" ? "success" : po.status === "cancelled" ? "destructive" : "secondary"}>{po.status}</Badge></TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No purchase orders yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
