import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { tenantPrisma, prisma } from "@adwyzors/database";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@adwyzors/ui";
import { ArrowLeft, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProductDetailPage({ params }: Props) {
  const session = await requireSession();
  const permissions = await getUserPermissions(
    session.user.userId,
    session.user.tenantId
  );
  requirePermission(session.user, permissions, PERMISSIONS.INVENTORY.PRODUCT_LIST);

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const db = tenantPrisma(tenantId);

  const product = await db.product.findFirst({ where: { id } });
  if (!product) notFound();

  // Get stock levels per warehouse
  const movements = await prisma.stockMovement.groupBy({
    by: ["warehouseId", "type"],
    where: { tenantId, productId: id },
    _sum: { quantity: true },
  });

  // Calculate net stock per warehouse
  const stockByWarehouse = new Map<string, number>();
  for (const m of movements) {
    const current = stockByWarehouse.get(m.warehouseId) ?? 0;
    const qty = Number(m._sum.quantity ?? 0);
    if (m.type === "inward" || m.type === "adjustment") {
      stockByWarehouse.set(m.warehouseId, current + qty);
    } else if (m.type === "outward") {
      stockByWarehouse.set(m.warehouseId, current - qty);
    }
  }

  // Fetch warehouse names
  const warehouses = await db.warehouse.findMany({
    where: { id: { in: Array.from(stockByWarehouse.keys()) } },
    select: { id: true, name: true, code: true },
  });

  // Recent movements
  const recentMovements = await prisma.stockMovement.findMany({
    where: { tenantId, productId: id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { warehouse: { select: { name: true, code: true } } },
  });

  const totalStock = Array.from(stockByWarehouse.values()).reduce(
    (sum, q) => sum + q,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/inventory"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
          aria-label="Back to inventory"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {product.name}
            </h1>
            <Badge
              variant={product.status === "active" ? "success" : "secondary"}
            >
              {product.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {product.code} · {product.unit}
            {product.hsn ? ` · HSN: ${product.hsn}` : ""}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Stock</CardDescription>
            <CardTitle className="text-2xl">
              {totalStock} {product.unit}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Cost Price</CardDescription>
            <CardTitle className="text-2xl">
              {product.costPrice
                ? `₹${Number(product.costPrice).toLocaleString()}`
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Sell Price</CardDescription>
            <CardTitle className="text-2xl">
              {product.sellPrice
                ? `₹${Number(product.sellPrice).toLocaleString()}`
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Min Stock Alert</CardDescription>
            <CardTitle className="text-2xl">
              {product.minStock ? `${Number(product.minStock)} ${product.unit}` : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Stock per Warehouse */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock by Warehouse</CardTitle>
        </CardHeader>
        <CardContent>
          {warehouses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {warehouses.map((wh) => (
                <div
                  key={wh.id}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{wh.name}</p>
                    <p className="text-xs text-muted-foreground">{wh.code}</p>
                  </div>
                  <span className="font-semibold">
                    {stockByWarehouse.get(wh.id) ?? 0} {product.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Stock Movements</CardTitle>
          <CardDescription>Last 10 movements</CardDescription>
        </CardHeader>
        <CardContent>
          {recentMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No movements yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMovements.map((mv) => (
                  <TableRow key={mv.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {mv.type === "inward" && (
                          <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                        )}
                        {mv.type === "outward" && (
                          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                        )}
                        {(mv.type === "transfer" ||
                          mv.type === "adjustment") && (
                          <ArrowRightLeft className="h-3.5 w-3.5 text-yellow-500" />
                        )}
                        <Badge
                          variant={
                            mv.type === "inward"
                              ? "success"
                              : mv.type === "outward"
                                ? "destructive"
                                : "warning"
                          }
                          className="text-xs"
                        >
                          {mv.type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {mv.type === "outward" ? "-" : "+"}
                      {Number(mv.quantity)} {mv.unit}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {mv.warehouse.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {mv.reference ?? mv.reason ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(mv.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
