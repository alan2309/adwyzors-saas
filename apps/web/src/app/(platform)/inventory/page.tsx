import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { tenantPrisma } from "@adwyzors/database";
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@adwyzors/ui";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const session = await requireSession();
  const permissions = await getUserPermissions(
    session.user.userId,
    session.user.tenantId
  );
  requirePermission(session.user, permissions, PERMISSIONS.INVENTORY.PRODUCT_LIST);

  const params = await searchParams;
  const db = tenantPrisma(session.user.tenantId);
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { code: { contains: params.search, mode: "insensitive" } },
      { hsn: { contains: params.search } },
    ];
  }
  if (params.status) where.status = params.status;

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
        hsn: true,
        costPrice: true,
        sellPrice: true,
        minStock: true,
        status: true,
      },
    }),
    db.product.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Product Catalog
          </h1>
          <p className="text-muted-foreground mt-1">
            {total} product{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button asChild>
          <Link href="/inventory/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>HSN</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Sell</TableHead>
              <TableHead>Min Stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {product.code}
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/inventory/${product.id}`}
                    className="hover:underline"
                  >
                    {product.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {product.unit}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {product.hsn ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {product.costPrice
                    ? `₹${Number(product.costPrice).toLocaleString()}`
                    : "—"}
                </TableCell>
                <TableCell>
                  {product.sellPrice
                    ? `₹${Number(product.sellPrice).toLocaleString()}`
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {product.minStock ? Number(product.minStock) : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      product.status === "active" ? "success" : "secondary"
                    }
                  >
                    {product.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-8"
                >
                  No products found. Add your first product to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/inventory?page=${page - 1}${params.search ? `&search=${params.search}` : ""}`}
                className="px-3 py-1 rounded border border-border hover:bg-accent transition-colors"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/inventory?page=${page + 1}${params.search ? `&search=${params.search}` : ""}`}
                className="px-3 py-1 rounded border border-border hover:bg-accent transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
