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

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; type?: string; page?: string }>;
}) {
  const session = await requireSession();
  const permissions = await getUserPermissions(
    session.user.userId,
    session.user.tenantId
  );
  requirePermission(session.user, permissions, PERMISSIONS.CRM.CUSTOMER_LIST);

  const params = await searchParams;
  const db = tenantPrisma(session.user.tenantId);
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { code: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params.status) where.status = params.status;
  if (params.type) where.type = params.type;

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        email: true,
        phone: true,
        status: true,
        creditLimit: true,
        createdAt: true,
        _count: { select: { contacts: true } },
      },
    }),
    db.customer.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">
            {total} customer{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button asChild>
          <Link href="/customers/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {customer.code}
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="hover:underline"
                  >
                    {customer.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {customer.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {customer.email ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {customer.phone ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {customer._count.contacts}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      customer.status === "active" ? "success" : "secondary"
                    }
                  >
                    {customer.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  No customers found. Add your first customer to get started.
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
                href={`/customers?page=${page - 1}${params.search ? `&search=${params.search}` : ""}`}
                className="px-3 py-1 rounded border border-border hover:bg-accent transition-colors"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/customers?page=${page + 1}${params.search ? `&search=${params.search}` : ""}`}
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
