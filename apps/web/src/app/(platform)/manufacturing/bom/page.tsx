import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { tenantPrisma } from "@adwyzors/database";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button } from "@adwyzors/ui";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BOMListPage() {
  const session = await requireSession();
  const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
  requirePermission(session.user, permissions, PERMISSIONS.MANUFACTURING.BOM_LIST);

  const db = tenantPrisma(session.user.tenantId);
  const boms = await db.billOfMaterials.findMany({
    take: 50, orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true, code: true } }, _count: { select: { items: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bill of Materials</h1>
          <p className="text-muted-foreground mt-1">{boms.length} BOM{boms.length !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild><Link href="/manufacturing/bom/new"><Plus className="h-4 w-4 mr-2" />New BOM</Link></Button>
      </div>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Components</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {boms.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.product.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{b.product.code}</TableCell>
                <TableCell>v{b.version}</TableCell>
                <TableCell className="text-muted-foreground">{b._count.items}</TableCell>
                <TableCell><Badge variant={b.status === "active" ? "success" : b.status === "draft" ? "secondary" : "destructive"}>{b.status}</Badge></TableCell>
              </TableRow>
            ))}
            {boms.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No BOMs yet.</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
