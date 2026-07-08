import { prisma } from "@adwyzors/database";
import { notFound } from "next/navigation";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@adwyzors/ui";
import Link from "next/link";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({ params }: Props) {
  const { id } = await params;

  const tenant = await prisma.tenant.findFirst({
    where: { id, deletedAt: null },
    include: {
      _count: { select: { users: true, roles: true } },
      users: {
        where: { deletedAt: null },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          lastLoginAt: true,
        },
      },
    },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {tenant.name}
            </h1>
            <Badge
              variant={tenant.status === "active" ? "success" : "destructive"}
            >
              {tenant.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {tenant.subdomain}.adwyzors.com
            {tenant.customDomain && ` / ${tenant.customDomain}`}
          </p>
        </div>
        <Link
          href="/tenants"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to Tenants
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Plan</CardDescription>
            <CardTitle className="capitalize">{tenant.plan}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Users</CardDescription>
            <CardTitle>{tenant._count.users}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Roles</CardDescription>
            <CardTitle>{tenant._count.roles}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Users</CardTitle>
          <CardDescription>
            Last 5 users in this tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenant.users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <div className="space-y-3">
              {tenant.users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <Badge
                    variant={user.status === "active" ? "success" : "secondary"}
                  >
                    {user.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>Raw tenant config JSON</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="rounded-md bg-muted p-4 text-xs overflow-auto max-h-64">
            {JSON.stringify(tenant.configJson, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
