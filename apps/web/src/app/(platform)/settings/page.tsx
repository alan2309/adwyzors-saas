import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { prisma, tenantPrisma } from "@adwyzors/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@adwyzors/ui";
import Link from "next/link";
import { Users, Key, Hash, Zap, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireSession();
  const permissions = await getUserPermissions(session.user.userId, session.user.tenantId);
  requirePermission(session.user, permissions, PERMISSIONS.SETTINGS.TENANT_READ);

  const tenantId = session.user.tenantId;
  const db = tenantPrisma(tenantId);

  const [tenant, userCount, roleCount, sequenceCount, ruleCount] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, plan: true, subdomain: true, configJson: true } }),
    db.user.count({}),
    db.role.count({}),
    db.numberSequence.count({}),
    db.automationRule.count({}),
  ]);

  const sections = [
    { title: "Users", description: `${userCount} users in this tenant`, icon: Users, href: "/settings/users", count: userCount },
    { title: "Roles & Permissions", description: `${roleCount} roles configured`, icon: Key, href: "/settings/roles", count: roleCount },
    { title: "Number Sequences", description: `${sequenceCount} sequences configured`, icon: Hash, href: "/settings/sequences", count: sequenceCount },
    { title: "Automation Rules", description: `${ruleCount} rules configured`, icon: Zap, href: "/settings/automation", count: ruleCount },
    { title: "Report Templates", description: "Manage export templates", icon: FileText, href: "/settings/reports", count: null },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          {tenant?.name} &middot; <Badge variant="secondary">{tenant?.plan}</Badge> &middot; {tenant?.subdomain}.adwyzors.com
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.title} href={s.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{s.title}</CardTitle>
                    <CardDescription>{s.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              {s.count !== null && (
                <CardContent>
                  <span className="text-2xl font-bold">{s.count}</span>
                </CardContent>
              )}
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tenant Configuration</CardTitle>
          <CardDescription>Raw config JSON</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="rounded-md bg-muted p-4 text-xs overflow-auto max-h-48">
            {JSON.stringify(tenant?.configJson, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
