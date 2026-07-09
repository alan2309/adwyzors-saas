import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { tenantPrisma } from "@adwyzors/database";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button } from "@adwyzors/ui";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const session = await requireSession();
  const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
  requirePermission(session.user, permissions, PERMISSIONS.PURCHASE.VENDOR_LIST);

  const db = tenantPrisma(session.user.tenantId);
  const vendors = await db.vendor.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, code: true, name: true, email: true, phone: true, status: true, paymentTerms: true } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground mt-1">{vendors.length} vendor{vendors.length !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild><Link href="/purchase/vendors/new"><Plus className="h-4 w-4 mr-2" />Add Vendor</Link></Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{v.code}</TableCell>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="text-muted-foreground">{v.email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{v.phone ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{v.paymentTerms ? `${v.paymentTerms} days` : "—"}</TableCell>
                <TableCell><Badge variant={v.status === "active" ? "success" : "secondary"}>{v.status}</Badge></TableCell>
              </TableRow>
            ))}
            {vendors.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No vendors yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
